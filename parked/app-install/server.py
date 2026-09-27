#!/usr/bin/env python3
"""Pack Rat party server.

Serves the app on your local network and keeps every player's character on
this computer so players can trade with each other.

    python server.py [port]        (default port 8765)

Players on the same Wi-Fi/LAN open the address printed at startup. Only the
standard library is used, so there is nothing to install.

The desktop app (desktop.py / PackRat.exe) imports this module instead: it
serves the app privately on 127.0.0.1 and only opens the network-facing
server while the player chooses to host a party.
"""
import copy
import json
import os
import random
import socket
import ssl
import string
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

try:  # HTTPS needs the `cryptography` package; without it the party is plain HTTP only.
    import certs
except ImportError:
    certs = None

# App files live next to this script, or in PyInstaller's unpack dir inside the exe.
ROOT = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "party-data")
DATA_FILE = os.path.join(DATA_DIR, "party.json")
DEFAULT_LAN_PORT = 8765
# Only the app itself is served; party-data (which holds player tokens) and tools are not.
STATIC_PREFIXES = ("/index.html", "/manifest.webmanifest", "/sw.js", "/css/", "/js/", "/icons/")
NON_STACKING = {"weapon", "armor", "container", "magic", "pack"}
COINS = ["pp", "gp", "ep", "sp", "cp"]
MAX_BODY = 5 * 1024 * 1024
KEEP_RESOLVED_TRADES = 50

cond = threading.Condition()  # guards everything below
state = {"characters": {}, "trades": []}
version = 0                   # bumped on every change; event streams wait on it
online = {}                   # player token -> number of open event streams

# Desktop mode (see desktop.py)
DESKTOP = False
app_server = None             # the app window's private server on 127.0.0.1
lan_server = None             # the server other players join; None when not hosting
lan_port = None
secure_server = None          # HTTPS twin of lan_server (port + 1) so phones can install the app
secure_port = None
secure_error = None           # why HTTPS isn't available, if it isn't
presence = {"count": 0, "seen": False, "changed": time.time()}  # open app windows


def configure(data_dir, desktop):
    global DATA_DIR, DATA_FILE, DESKTOP
    DATA_DIR = data_dir
    DATA_FILE = os.path.join(data_dir, "party.json")
    DESKTOP = desktop
    load()


def party_enabled():
    return not DESKTOP or lan_server is not None


# ------------------------------------------------------------------ persistence

def load():
    global state
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, encoding="utf8") as f:
            state = json.load(f)
        state.setdefault("characters", {})
        state.setdefault("trades", [])


def save():
    os.makedirs(DATA_DIR, exist_ok=True)
    tmp = DATA_FILE + ".tmp"
    with open(tmp, "w", encoding="utf8") as f:
        json.dump(state, f, ensure_ascii=False)
    os.replace(tmp, DATA_FILE)


def changed(persist=True):
    """Call with `cond` held after mutating state."""
    global version
    version += 1
    if persist:
        save()
    cond.notify_all()


def new_id(prefix=""):
    rnd = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return prefix + format(int(time.time() * 1000), "x") + rnd


# ------------------------------------------------------------------ views

def public_char(c, token):
    out = {k: v for k, v in c.items() if k != "owner"}
    out["mine"] = c["owner"] == token
    out["online"] = online.get(c["owner"], 0) > 0
    return out


def snapshot(token):
    chars = state["characters"]
    mine = {cid for cid, c in chars.items() if c["owner"] == token}
    trades = [dict(t, fromMine=t["from"] in mine, toMine=t["to"] in mine)
              for t in state["trades"] if t["from"] in mine or t["to"] in mine]
    return {"characters": [public_char(c, token) for c in chars.values()], "trades": trades}


def lan_addresses():
    addrs = set()
    try:  # the address the OS would use to reach the internet; UDP connect sends nothing
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))
        addrs.add(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            addrs.add(info[4][0])
    except OSError:
        pass
    return sorted(a for a in addrs if not a.startswith("127."))


# ------------------------------------------------------------------ trades

class TradeError(Exception):
    pass


def find_entry(char, uid):
    return next((e for e in char["items"] if e["uid"] == uid), None)


def descendants(char, uid):
    out, frontier = [], [uid]
    while frontier:
        kids = [e for e in char["items"] if e.get("parent") in frontier]
        out += kids
        frontier = [e["uid"] for e in kids]
    return out


def clean_side(char, side):
    """Normalise one side of an offer and attach item names for display."""
    side = side or {}
    items = []
    for it in side.get("items") or []:
        qty = int(it.get("qty") or 0)
        e = find_entry(char, it.get("uid"))
        if qty <= 0 or not e:
            raise TradeError("An item in the offer no longer exists.")
        items.append({"uid": e["uid"], "qty": qty, "name": e["item"]["name"]})
    uids = {i["uid"] for i in items}
    for i in items:  # giving a container already gives everything in it
        if any(d["uid"] in uids for d in descendants(char, i["uid"])):
            raise TradeError(f"Don't list items that are inside {i['name']} - they go with it.")
    coins = {k: int((side.get("coins") or {}).get(k) or 0) for k in COINS}
    if any(v < 0 for v in coins.values()):
        raise TradeError("Coin amounts can't be negative.")
    return {"items": items, "coins": {k: v for k, v in coins.items() if v}}


def check_side(char, side):
    for it in side["items"]:
        e = find_entry(char, it["uid"])
        if not e or e["qty"] < it["qty"]:
            raise TradeError(f"{char['name']} no longer has {it['qty']} x {it['name']}.")
    for k, v in side["coins"].items():
        if (char.get("coins") or {}).get(k, 0) < v:
            raise TradeError(f"{char['name']} doesn't have {v} {k}.")


def merge_into(dst, entry):
    it = entry["item"]
    if it.get("type") not in NON_STACKING:
        for x in dst["items"]:
            if (x.get("parent") is None and not x.get("strapped") and x.get("srcId") == entry.get("srcId")
                    and x["item"] == it):
                x["qty"] += entry["qty"]
                return
    dst["items"].append(entry)


def transfer(src, dst, uid, qty):
    e = find_entry(src, uid)
    loose = {"parent": None, "strapped": False, "equipped": False, "attuned": False}
    if qty >= e["qty"]:
        kids = descendants(src, uid)
        moving = {uid} | {k["uid"] for k in kids}
        src["items"] = [x for x in src["items"] if x["uid"] not in moving]
        e.update(loose)
        for k in kids:
            k["equipped"] = k["attuned"] = False
        if kids:
            dst["items"].append(e)
        else:
            merge_into(dst, e)
        dst["items"] += kids
    else:
        e["qty"] -= qty
        part = copy.deepcopy(e)
        part.update(loose, uid=new_id(), qty=qty)
        merge_into(dst, part)


def move_coins(src, dst, coins):
    src.setdefault("coins", {})
    dst.setdefault("coins", {})
    for k, v in coins.items():
        src["coins"][k] = src["coins"].get(k, 0) - v
        dst["coins"][k] = dst["coins"].get(k, 0) + v


def execute(trade):
    chars = state["characters"]
    a, b = chars.get(trade["from"]), chars.get(trade["to"])
    if not a or not b:
        raise TradeError("One of the characters has left the party.")
    check_side(a, trade["give"])
    check_side(b, trade["ask"])
    for it in trade["give"]["items"]:
        transfer(a, b, it["uid"], it["qty"])
    for it in trade["ask"]["items"]:
        transfer(b, a, it["uid"], it["qty"])
    move_coins(a, b, trade["give"]["coins"])
    move_coins(b, a, trade["ask"]["coins"])
    a["rev"] += 1
    b["rev"] += 1


def resolve(trade, status, reason=None):
    trade["status"] = status
    trade["resolved"] = time.time()
    if reason:
        trade["reason"] = reason
    pending = [t for t in state["trades"] if t["status"] == "pending"]
    done = [t for t in state["trades"] if t["status"] != "pending"]
    state["trades"] = pending + done[-KEEP_RESOLVED_TRADES:]


# ------------------------------------------------------------------ listeners

class QuietServer(ThreadingHTTPServer):
    daemon_threads = True

    def handle_error(self, request, client_address):
        pass  # e.g. a phone that doesn't trust the certificate yet aborts the TLS handshake


def serve_in_background(srv):
    threading.Thread(target=srv.serve_forever, daemon=True).start()


def cert_store():
    return certs.CertStore(os.path.join(DATA_DIR, "certs")) if certs else None


def make_secure_server(port):
    """HTTPS listener using the host's own certificate authority (see certs.py)."""
    if not certs:
        raise RuntimeError("the 'cryptography' package isn't installed")
    ctx = cert_store().server_context(lan_addresses())
    srv = QuietServer(("0.0.0.0", port), Handler)
    # Handshake in the request thread, so a slow or failing client can't block accept().
    srv.socket = ctx.wrap_socket(srv.socket, server_side=True, do_handshake_on_connect=False)
    return srv


def start_secure(port):
    """Start HTTPS next to the plain listener; hosting still works if it can't."""
    global secure_server, secure_port, secure_error
    try:
        srv = make_secure_server(port)
    except Exception as e:
        secure_error = str(e)
        return None
    serve_in_background(srv)
    secure_server, secure_port, secure_error = srv, port, None
    return srv


# ------------------------------------------------------------------ hosting (desktop mode)

def start_lan(port):
    global lan_server, lan_port
    if lan_server:
        return
    srv = QuietServer(("0.0.0.0", port), Handler)  # OSError if the port is taken
    serve_in_background(srv)
    start_secure(port + 1)
    with cond:
        lan_server, lan_port = srv, port
        changed(persist=False)


def stop_lan():
    global lan_server, secure_server, secure_port
    with cond:
        servers = [lan_server, secure_server]
        lan_server = secure_server = secure_port = None
        changed(persist=False)  # wakes event streams so they notice and close
    for srv in servers:
        if srv:
            srv.shutdown()
            srv.server_close()


def make_app_server(port):
    global app_server
    srv = QuietServer(("127.0.0.1", port), Handler)
    app_server = srv
    return srv


# ------------------------------------------------------------------ HTTP

class ApiError(Exception):
    def __init__(self, status, message, **extra):
        super().__init__(message)
        self.status, self.message, self.extra = status, message, extra


class Handler(SimpleHTTPRequestHandler):
    timeout = 60  # drop connections that never finish a TLS handshake or request

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        pass  # keep the console for the address and party events

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    # -------------------------------------------------------------- plumbing
    def token(self):
        return self.headers.get("X-Player") or parse_qs(urlparse(self.path).query).get("player", [""])[0]

    def body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY:
            raise ApiError(413, "Request too large")
        raw = self.rfile.read(length) if length else b"{}"
        try:
            return json.loads(raw or b"{}")
        except json.JSONDecodeError:
            raise ApiError(400, "Invalid JSON")

    def reply(self, status, data):
        raw = json.dumps(data, ensure_ascii=False).encode("utf8")
        self.send_response(status)
        if urlparse(self.path).path == "/api/info":
            # The plain-HTTP page probes the HTTPS address to see if this device trusts the host yet.
            self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def api(self, method):
        path = urlparse(self.path).path
        try:
            token = self.token()
            if not token and path not in ("/api/info", "/api/presence", "/api/host", "/api/quit"):
                raise ApiError(401, "Missing player token")
            parts = path.strip("/").split("/")[1:]
            result = self.route(method, parts, token)
            if result is not None:
                self.reply(200, result)
        except ApiError as e:
            self.reply(e.status, {"error": e.message, **e.extra})
        except TradeError as e:
            self.reply(409, {"error": str(e)})

    def do_GET(self):
        path = urlparse(self.path).path
        if path.startswith("/api/"):
            return self.api("GET")
        if path == "/" or path.startswith(STATIC_PREFIXES):
            return super().do_GET()
        if path == "/packrat-ca.crt" and secure_port:
            return self.send_ca()
        self.send_error(404)

    def send_ca(self):
        """The host's CA certificate, which a phone installs once to trust the HTTPS address."""
        der = cert_store().ca_der()
        self.send_response(200)
        self.send_header("Content-Type", "application/x-x509-ca-cert")
        self.send_header("Content-Disposition", 'attachment; filename="PackRat-CA.crt"')
        self.send_header("Content-Length", str(len(der)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(der)

    def do_HEAD(self):
        self.do_GET()

    def do_POST(self):
        self.api("POST")

    def do_PUT(self):
        self.api("PUT")

    def do_DELETE(self):
        self.api("DELETE")

    def is_app(self):
        """Request from the desktop app's own window (not from another player)."""
        return DESKTOP and self.server is app_server

    # -------------------------------------------------------------- routes
    def route(self, method, parts, token):
        chars = state["characters"]
        if method == "GET" and parts == ["info"]:
            return {"party": party_enabled(), "desktop": DESKTOP, "isHost": self.is_app(),
                    "hosting": lan_server is not None, "addresses": lan_addresses(),
                    "port": lan_port if DESKTOP else PORT,
                    "securePort": secure_port if party_enabled() else None,
                    "secure": isinstance(self.connection, ssl.SSLSocket),
                    "secureError": secure_error,
                    "defaultPort": lan_port or DEFAULT_LAN_PORT}
        if parts[:1] in (["presence"], ["host"], ["quit"]):
            if not self.is_app():
                raise ApiError(403, "Only the desktop app can do that")
            if method == "GET" and parts == ["presence"]:
                return self.presence_stream()
            if method == "POST" and parts == ["host"]:
                body = self.body()
                if body.get("enable"):
                    port = int(body.get("port") or DEFAULT_LAN_PORT)
                    if not 1024 <= port <= 65535:
                        raise ApiError(400, "Pick a port between 1024 and 65535")
                    try:
                        start_lan(port)
                    except OSError:
                        raise ApiError(409, f"Port {port} is already in use - try another one")
                else:
                    stop_lan()
                return {"hosting": lan_server is not None}
            if method == "POST" and parts == ["quit"]:
                threading.Thread(target=shutdown_all, daemon=True).start()
                return {"ok": True}
        if not party_enabled():
            raise ApiError(404, "No party is being hosted")
        if method == "GET" and parts == ["events"]:
            return self.events(token)
        if method == "GET" and parts == ["state"]:
            with cond:
                return snapshot(token)

        if parts[:1] == ["characters"]:
            body = self.body() if method in ("POST", "PUT") else {}
            with cond:
                if method == "POST" and len(parts) == 1:
                    c = body.get("character") or {}
                    if not isinstance(c.get("items"), list) or not c.get("name"):
                        raise ApiError(400, "Invalid character")
                    cid = c.get("id")
                    if not cid or cid in chars:
                        cid = new_id("c")
                    c.update(id=cid, owner=token, rev=1)
                    chars[cid] = c
                    changed()
                    print(f"  + {c['name']} joined the party")
                    return {"id": cid, "rev": 1}
                c = chars.get(parts[1]) if len(parts) > 1 else None
                if not c:
                    raise ApiError(404, "No such character")
                if method == "POST" and parts[2:] == ["claim"]:
                    if c["owner"] != token and online.get(c["owner"], 0) > 0:
                        raise ApiError(409, f"{c['name']} is being played on another device right now.")
                    c["owner"] = token
                    c["rev"] += 1
                    changed()
                    print(f"  ~ {c['name']} was taken over by another device")
                    return {"rev": c["rev"]}
                if c["owner"] != token:
                    raise ApiError(403, "That character belongs to someone else.")
                if method == "PUT" and len(parts) == 2:
                    if body.get("baseRev") != c["rev"]:
                        raise ApiError(409, "Out of date", character=public_char(c, token))
                    new = body.get("character") or {}
                    if not isinstance(new.get("items"), list):
                        raise ApiError(400, "Invalid character")
                    new.update(id=c["id"], owner=token, rev=c["rev"] + 1)
                    chars[c["id"]] = new
                    changed()
                    return {"rev": new["rev"]}
                if method == "DELETE" and len(parts) == 2:
                    del chars[c["id"]]
                    for t in state["trades"]:
                        if t["status"] == "pending" and c["id"] in (t["from"], t["to"]):
                            resolve(t, "cancelled", f"{c['name']} left the party.")
                    changed()
                    print(f"  - {c['name']} left the party")
                    return {"ok": True}

        if parts[:1] == ["trades"]:
            body = self.body() if method == "POST" else {}
            with cond:
                if method == "POST" and len(parts) == 1:
                    a, b = chars.get(body.get("from")), chars.get(body.get("to"))
                    if not a or a["owner"] != token:
                        raise ApiError(403, "You can only trade from your own character.")
                    if not b or b is a:
                        raise ApiError(400, "Pick someone else to trade with.")
                    give, ask = clean_side(a, body.get("give")), clean_side(b, body.get("ask"))
                    if not (give["items"] or give["coins"] or ask["items"] or ask["coins"]):
                        raise ApiError(400, "The offer is empty.")
                    check_side(a, give)
                    trade = {"id": new_id("t"), "from": a["id"], "to": b["id"], "fromName": a["name"],
                             "toName": b["name"], "give": give, "ask": ask,
                             "note": str(body.get("note") or "")[:500], "status": "pending", "created": time.time()}
                    state["trades"].insert(0, trade)
                    changed()
                    print(f"  ? {a['name']} offered a trade to {b['name']}")
                    return {"id": trade["id"]}
                trade = next((t for t in state["trades"] if len(parts) == 3 and t["id"] == parts[1]), None)
                if not trade or method != "POST":
                    raise ApiError(404, "No such trade")
                if trade["status"] != "pending":
                    raise ApiError(409, "That trade is already closed.")
                action = parts[2]
                side = "from" if action == "cancel" else "to"
                owner = chars.get(trade[side], {}).get("owner")
                if owner != token or action not in ("accept", "decline", "cancel"):
                    raise ApiError(403, "Not your trade to " + action)
                if action == "accept":
                    try:
                        execute(trade)
                    except TradeError as e:
                        resolve(trade, "failed", str(e))
                        changed()
                        raise
                    resolve(trade, "accepted")
                    print(f"  $ {trade['toName']} accepted a trade from {trade['fromName']}")
                else:
                    resolve(trade, "declined" if action == "decline" else "cancelled")
                changed()
                return {"ok": True}

        raise ApiError(404, "Unknown endpoint")

    # -------------------------------------------------------------- live updates (Server-Sent Events)
    def events(self, token):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()
        self.close_connection = True
        with cond:
            online[token] = online.get(token, 0) + 1
            changed(persist=False)
        last = -1
        try:
            while True:
                with cond:
                    if not party_enabled():
                        break  # the host stopped the party
                    if version == last:
                        cond.wait(timeout=15)
                    data = None
                    if version != last:
                        last = version
                        data = json.dumps(snapshot(token), ensure_ascii=False)
                self.wfile.write(f"event: state\ndata: {data}\n\n".encode("utf8") if data else b": ping\n\n")
                self.wfile.flush()
        except OSError:
            pass
        finally:
            with cond:
                online[token] -= 1
                changed(persist=False)


    def presence_stream(self):
        """Held open by each desktop app window; the app quits when none are left."""
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.end_headers()
        self.close_connection = True
        with cond:
            presence["count"] += 1
            presence["seen"] = True
            presence["changed"] = time.time()
        try:
            while True:
                self.wfile.write(b": ping\n\n")
                self.wfile.flush()
                time.sleep(2)
        except OSError:
            pass
        finally:
            with cond:
                presence["count"] -= 1
                presence["changed"] = time.time()


def shutdown_all():
    stop_lan()
    if app_server:
        app_server.shutdown()


PORT = None  # standalone mode's plain-HTTP port


def main():
    global PORT
    PORT = port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    load()
    try:
        server = QuietServer(("0.0.0.0", port), Handler)
    except OSError as e:
        sys.exit(f"Couldn't start on port {port} ({e}). Is it already running? Try: python server.py {port + 2}")
    start_secure(port + 1)
    print("\n  Pack Rat party server is running!\n")
    print(f"  On this computer:   http://localhost:{port}")
    addrs = lan_addresses()
    if addrs:
        print("  Players on your network join at:")
        for a in addrs:
            print(f"      http://{a}:{port}")
        if secure_port:
            print(f"  Installable app (HTTPS, after trusting the host certificate once): https://{addrs[0]}:{secure_port}")
    else:
        print("  (Couldn't find a network address - are you connected to Wi-Fi/LAN?)")
    if not secure_port:
        print(f"  (HTTPS is off: {secure_error}. Players can still join over HTTP.)")
    print(f"\n  Party data is saved in {DATA_FILE}")
    print("  Press Ctrl+C to stop.\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Server stopped.")


if __name__ == "__main__":
    main()
