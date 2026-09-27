// Party mode: when the app is served by server.py, the player's characters
// live on the host computer and players can trade with each other.
//
// Local edits still go through store.update(); after each save we diff the
// characters against what the server last confirmed and push the changes.
// The server streams snapshots back (Server-Sent Events) after any change,
// e.g. when a trade moves items between characters.

const PARTY_TOKEN_KEY = "packrat-player";
const PARTY_ACTIVE_KEY = "packrat-party-active";

// Fields the server adds to characters; not part of the character itself.
const SERVER_FIELDS = ["rev", "mine", "online", "owner"];

function cleanChar(c) {
  const out = { ...c };
  for (const k of SERVER_FIELDS) delete out[k];
  return clone(out);
}

const charJson = c => JSON.stringify(cleanChar(c));

const party = {
  active: false,
  connected: false,
  token: null,
  info: null,
  chars: [],          // every character in the party, from the latest snapshot
  trades: [],         // trades involving my characters
  synced: new Map(),  // id -> { rev, json }: last version the server confirmed
  timers: new Map(),
  inflight: new Set(),

  // Is the page being served by the party server?
  async detect() {
    if (!location.protocol.startsWith("http")) return false;
    this.takeHandoff();
    try {
      const res = await fetch("api/info", { cache: "no-store" });
      if (!res.ok) return false;
      this.info = await res.json();
    } catch {
      return false;
    }
    // On the plain-HTTP address: if this device already trusts the host's
    // certificate, move to the secure (installable) address automatically.
    if (!window.isSecureContext && this.info.securePort && await this.secureReachable()) {
      this.goSecure();
      return new Promise(() => {}); // the page is navigating away
    }
    // The desktop app quits when its last window closes; this stream tells it we're open.
    if (this.info.desktop && this.info.isHost) new EventSource("api/presence");
    if (!this.info.party) return false;
    try { this.token = localStorage.getItem(PARTY_TOKEN_KEY); } catch {}
    if (!this.token) {
      this.token = uid() + uid();
      try { localStorage.setItem(PARTY_TOKEN_KEY, this.token); } catch {}
    }
    const snap = await this.api("GET", "api/state");
    this.chars = snap.characters;
    this.trades = snap.trades;
    for (const c of this.owned()) this.synced.set(c.id, { rev: c.rev, json: charJson(c) });
    this.active = true;
    return true;
  },

  async api(method, url, body) {
    const res = await fetch(url, {
      method, cache: "no-store",
      headers: { "Content-Type": "application/json", "X-Player": this.token },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || res.statusText);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  },

  // ------------------------------------------------------------ HTTPS (installable app)

  secureOrigin() {
    return `https://${location.hostname}:${this.info.securePort}/`;
  },

  // Can this device open the HTTPS address without a certificate error?
  async secureReachable() {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    try {
      const res = await fetch(this.secureOrigin() + "api/info", { cache: "no-store", signal: ctrl.signal });
      return res.ok;
    } catch {
      return false; // untrusted certificate, or HTTPS unavailable
    } finally {
      clearTimeout(timer);
    }
  },

  // The secure address is a different origin with its own storage, so carry
  // this device's player identity across in the URL fragment (never sent to the server).
  goSecure() {
    let token = null, active = null;
    try {
      token = localStorage.getItem(PARTY_TOKEN_KEY);
      active = localStorage.getItem(PARTY_ACTIVE_KEY);
    } catch {}
    const handoff = encodeURIComponent(JSON.stringify({ t: token, a: active }));
    location.replace(this.secureOrigin() + "#handoff=" + handoff);
  },

  takeHandoff() {
    const m = location.hash.match(/^#handoff=(.*)$/);
    if (!m) return;
    history.replaceState(null, "", location.pathname + "#inventory");
    try {
      const { t, a } = JSON.parse(decodeURIComponent(m[1]));
      // An installed app that already has an identity keeps it.
      if (t && !localStorage.getItem(PARTY_TOKEN_KEY)) localStorage.setItem(PARTY_TOKEN_KEY, t);
      if (a && !localStorage.getItem(PARTY_ACTIVE_KEY)) localStorage.setItem(PARTY_ACTIVE_KEY, a);
    } catch {}
  },

  owned() { return this.chars.filter(c => c.mine); },
  others() { return this.chars.filter(c => !c.mine); },
  joinUrls() {
    const port = this.info?.port || location.port;
    const urls = (this.info?.addresses || []).map(a => `http://${a}:${port}`);
    return urls.length ? urls : [location.origin];
  },
  incoming() { return this.trades.filter(t => t.status === "pending" && t.toMine); },

  connect() {
    const es = new EventSource("api/events?player=" + encodeURIComponent(this.token));
    es.addEventListener("state", e => {
      this.connected = true;
      this.applySnapshot(JSON.parse(e.data));
    });
    es.onerror = () => {
      // EventSource reconnects on its own; just show we're offline meanwhile.
      if (this.connected) { this.connected = false; render(); }
    };
  },

  // ------------------------------------------------------------ server -> local

  applySnapshot(snap) {
    const before = this.trades;
    this.chars = snap.characters;
    this.trades = snap.trades;
    const local = store.state.characters;
    let conflict = false, replaced = false;

    for (const c of this.owned()) {
      const i = local.findIndex(x => x.id === c.id);
      const s = this.synced.get(c.id);
      if (i < 0) {
        if (s) continue; // deleted here; the DELETE is on its way
        local.push(cleanChar(c)); // claimed or created on another device
      } else if (!s || c.rev > s.rev) {
        // Our own save echoed back before its response arrived: nothing to do.
        if (charJson(local[i]) === charJson(c)) { this.synced.set(c.id, { rev: c.rev, json: charJson(c) }); continue; }
        // A save is in flight; if it's now stale it gets a 409 and adopts the server copy.
        if (this.inflight.has(c.id)) continue;
        if (s && charJson(local[i]) !== s.json) conflict = true; // unsaved local edit loses
        local[i] = cleanChar(c);
        clearTimeout(this.timers.get(c.id));
      } else continue;
      replaced = true;
      this.synced.set(c.id, { rev: c.rev, json: charJson(c) });
    }

    // Characters that are no longer mine (taken over elsewhere, or removed).
    for (const id of [...this.synced.keys()]) {
      if (this.owned().some(c => c.id === id)) continue;
      const i = local.findIndex(x => x.id === id);
      if (i >= 0) {
        toast(`${local[i].name} is now being played on another device`);
        local.splice(i, 1);
      }
      this.synced.delete(id);
    }
    if (!store.char() && local.length) store.state.activeId = local[0].id;
    if (replaced) cancelUndo();

    if (conflict) toast("Your inventory changed on the server (a trade?) — showing the latest version");
    for (const t of this.trades) {
      const old = before.find(b => b.id === t.id);
      if (!old && t.status === "pending" && t.toMine) toast(`${t.fromName} offered you a trade — see Party`);
      if (old && old.status === "pending" && t.status !== "pending" && t.fromMine) {
        const verb = { accepted: "accepted", declined: "declined", failed: "couldn't complete", cancelled: "cancelled" }[t.status];
        toast(`${t.toName} ${verb} your trade${t.reason ? ": " + t.reason : ""}`);
      }
    }
    render();
  },

  // ------------------------------------------------------------ local -> server

  // Called after every local save with the current (owned) characters.
  sync(chars) {
    if (!this.active) return;
    for (const c of chars) {
      const s = this.synced.get(c.id);
      if (!s) this.create(c);
      else if (charJson(c) !== s.json) this.schedulePut(c.id);
    }
    for (const id of [...this.synced.keys()]) {
      if (!chars.some(c => c.id === id)) this.remove(id);
    }
  },

  async create(c) {
    if (this.inflight.has(c.id)) return;
    this.inflight.add(c.id);
    const id = c.id;
    let retry = false;
    try {
      const json = charJson(c);
      const res = await this.api("POST", "api/characters", { character: cleanChar(c) });
      if (res.id !== c.id) { // id collision: the server picked a new one
        if (store.state.activeId === c.id) store.state.activeId = res.id;
        c.id = res.id;
      }
      this.synced.set(res.id, { rev: res.rev, json: JSON.stringify({ ...JSON.parse(json), id: res.id }) });
      this.setStatus(true);
      toast(`${c.name} is in the party`);
    } catch (e) {
      // Network trouble or a server error: keep trying. A 4xx means the server refused it.
      retry = !e.status || e.status >= 500;
      this.setStatus(false, retry ? `${c.name} isn't saved to the party yet — retrying…` : `Couldn't add ${c.name}: ${e.message}`);
    } finally {
      this.inflight.delete(id);
    }
    if (retry) setTimeout(() => this.sync(store.state.characters), 3000);
    else this.sync(store.state.characters); // flush edits made while creating
  },

  // Shows a warning in the header while changes aren't reaching the host.
  setStatus(ok, message = "") {
    const el = document.getElementById("sync-status");
    if (!el) return;
    el.hidden = ok;
    el.textContent = ok ? "" : "⚠ Not saved";
    el.title = message;
    if (!ok && message && message !== this.lastStatus) toast(message);
    this.lastStatus = ok ? "" : message;
  },

  schedulePut(id, delay = 300) {
    clearTimeout(this.timers.get(id));
    this.timers.set(id, setTimeout(() => this.put(id), delay));
  },

  async put(id) {
    if (this.inflight.has(id)) return this.schedulePut(id);
    const c = store.state.characters.find(x => x.id === id);
    const s = this.synced.get(id);
    if (!c || !s) return;
    const json = charJson(c);
    if (json === s.json) return;
    this.inflight.add(id);
    try {
      const res = await this.api("PUT", "api/characters/" + encodeURIComponent(id), { baseRev: s.rev, character: cleanChar(c) });
      this.synced.set(id, { rev: res.rev, json });
      this.setStatus(true);
    } catch (e) {
      if (e.status === 409 && e.data.character) {
        this.adopt(e.data.character);
        toast("Your inventory changed on the server (a trade?) — showing the latest version");
      } else if (e.status === 403 || e.status === 404) {
        this.synced.delete(id);
        store.state.characters = store.state.characters.filter(x => x.id !== id);
        toast(`${c.name} is no longer yours in this party`);
        render();
      } else {
        this.setStatus(false, "Can't reach the party host — your changes will be saved when it's back");
        this.schedulePut(id, 3000); // server unreachable; retry
      }
    } finally {
      this.inflight.delete(id);
    }
  },

  adopt(c) {
    const local = store.state.characters;
    const i = local.findIndex(x => x.id === c.id);
    if (i >= 0) local[i] = cleanChar(c); else local.push(cleanChar(c));
    this.synced.set(c.id, { rev: c.rev, json: charJson(c) });
    cancelUndo();
    render();
  },

  async remove(id) {
    this.synced.delete(id);
    clearTimeout(this.timers.get(id));
    try { await this.api("DELETE", "api/characters/" + encodeURIComponent(id)); } catch {}
  },

  async claim(id) {
    try {
      await this.api("POST", `api/characters/${encodeURIComponent(id)}/claim`);
      writePref(PARTY_ACTIVE_KEY, id);
      store.state.activeId = id;
    } catch (e) {
      toast(e.message);
    }
  },

  // Desktop app only: start/stop hosting, quit.
  isDesktopHost() { return !!(this.info?.desktop && this.info.isHost); },

  async host(enable, port) {
    await this.api("POST", "api/host", { enable, port });
  },

  async quit() {
    await this.api("POST", "api/quit");
  },

  async offer(trade) {
    await this.api("POST", "api/trades", trade);
  },

  async act(tradeId, action) {
    try {
      await this.api("POST", `api/trades/${encodeURIComponent(tradeId)}/${action}`);
    } catch (e) {
      toast(e.message);
    }
  },
};
