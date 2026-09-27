package com.packrat.app;

import android.content.res.AssetManager;
import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Android port of server.py (desktop mode). Serves the app to this device's
 * WebView on 127.0.0.1 and, while hosting, to other players on the local
 * network, with the same JSON API: characters, trades and live updates.
 */
public class PartyServer {

    public interface Listener {
        void onHostingChanged(boolean hosting, int port);
        void onQuit();
    }

    static final int DEFAULT_LAN_PORT = 8765;
    static final int[] APP_PORTS = {47651, 47652, 47653, 47654, 47655};
    static final int MAX_BODY = 8 * 1024 * 1024;
    static final int MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    static final String[][] IMAGE_TYPES = {{"image/png", "png"}, {"image/jpeg", "jpg"}, {"image/webp", "webp"}, {"image/gif", "gif"}};
    static final java.util.regex.Pattern IMAGE_ID = java.util.regex.Pattern.compile("[a-z0-9]{6,40}");
    static final java.util.regex.Pattern DATA_URL = java.util.regex.Pattern.compile("^data:(image/[a-z]+);base64,(.+)$", java.util.regex.Pattern.DOTALL);
    static final int KEEP_RESOLVED_TRADES = 50;
    static final Set<String> NON_STACKING = new HashSet<>(Arrays.asList("weapon", "armor", "container", "magic", "pack"));
    static final String[] COINS = {"pp", "gp", "ep", "sp", "cp"};
    static final String[] STATIC_PREFIXES = {"/index.html", "/manifest.webmanifest", "/sw.js", "/css/", "/js/", "/icons/"};
    static final String[] NO_TOKEN = {"/api/info", "/api/presence", "/api/host", "/api/quit"};

    private final AssetManager assets;
    private final File dataFile;
    private volatile Listener listener;

    // Everything below is guarded by `lock` (like `cond` in server.py).
    private final Object lock = new Object();
    private JSONObject characters = new JSONObject();
    private JSONArray trades = new JSONArray();
    private JSONArray shops = new JSONArray();
    private long version = 0;
    private final Map<String, Integer> online = new HashMap<>();

    private ServerSocket appSocket;
    private volatile ServerSocket lanSocket;
    private int appPort;
    private int lanPort = 0;

    private final SecureRandom random = new SecureRandom();

    public PartyServer(AssetManager assets, File dataDir) {
        this.assets = assets;
        dataDir.mkdirs();
        this.dataFile = new File(dataDir, "party.json");
        // This phone's own characters, settings and images, next to party-data (like the
        // Windows app's my-data): kept in a file so they don't depend on the WebView's
        // storage, which is tied to the app's port.
        this.localDir = new File(dataDir.getParentFile(), "my-data");
        load();
        if (partyId.isEmpty()) {
            // Lets devices recognise this party even if the phone's address changes.
            partyId = newId("p");
            save();
        }
        loadLocal();
    }

    private String partyId = "";

    private final File localDir;
    private JSONObject localData = new JSONObject();
    private long localRev = 0;

    private void loadLocal() {
        File f = new File(localDir, "app-data.json");
        if (!f.exists()) return;
        try (InputStream in = new java.io.FileInputStream(f)) {
            JSONObject o = new JSONObject(new String(readAll(in), StandardCharsets.UTF_8));
            localData = o.optJSONObject("data") != null ? o.getJSONObject("data") : new JSONObject();
        } catch (Exception e) {
            f.renameTo(new File(f.getPath() + ".broken-" + System.currentTimeMillis()));
        }
    }

    /** Call with `lock` held. */
    private void saveLocal() {
        try {
            localDir.mkdirs();
            File f = new File(localDir, "app-data.json"), tmp = new File(localDir, "app-data.json.tmp");
            JSONObject o = new JSONObject();
            o.put("data", localData);
            try (OutputStream out = new FileOutputStream(tmp)) { out.write(o.toString().getBytes(StandardCharsets.UTF_8)); }
            if (!tmp.renameTo(f)) {
                // Some filesystems won't rename over an existing file.
                f.delete();
                if (!tmp.renameTo(f)) throw new IOException("rename failed");
            }
        } catch (Exception e) {
            android.util.Log.e("PackRat", "Could not save app data", e);
        }
    }

    /** GET /api/local -> {rev, data}; PUT {set: {key: value or null}}; /api/local/images/... */
    private JSONObject localApi(Request req, List<String> parts, OutputStream out) throws ApiError, IOException, JSONException {
        if (!req.fromApp) throw new ApiError(403, "Only Pack Rat on this phone can do that");
        if (parts.size() >= 2 && parts.get(1).equals("images")) return images(req, parts.subList(1, parts.size()), out, new File(localDir, "images"));
        if (parts.size() != 1) throw new ApiError(404, "Unknown endpoint");
        synchronized (lock) {
            if (req.method.equals("GET")) {
                JSONObject r = new JSONObject();
                r.put("rev", localRev);
                r.put("data", localData);
                return r;
            }
            if (req.method.equals("PUT")) {
                JSONObject set = req.json().optJSONObject("set");
                if (set == null) throw new ApiError(400, "Bad data");
                Iterator<String> it = set.keys();
                while (it.hasNext()) {
                    String k = it.next();
                    Object v = set.get(k);
                    if (v == JSONObject.NULL) localData.remove(k);
                    else if (v instanceof String) localData.put(k, v);
                    else throw new ApiError(400, "Bad data");
                }
                localRev++;
                saveLocal();
                JSONObject r = new JSONObject();
                r.put("rev", localRev);
                return r;
            }
        }
        throw new ApiError(405, "Method not allowed");
    }

    public void setListener(Listener l) { listener = l; }

    // ------------------------------------------------------------------ listeners

    /** Start the private listener the app's own WebView uses. */
    public synchronized void startApp() throws IOException {
        if (appSocket != null) return;
        IOException last = null;
        for (int port : APP_PORTS) {
            try {
                ServerSocket s = new ServerSocket();
                s.setReuseAddress(true);
                s.bind(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), port));
                appSocket = s;
                appPort = port;
                acceptLoop(s, true);
                return;
            } catch (IOException e) {
                last = e;
            }
        }
        throw last;
    }

    public String appUrl() { return "http://127.0.0.1:" + appPort + "/"; }

    public boolean isHosting() { return lanSocket != null; }

    public int lanPort() { return lanPort; }

    public void startLan(int port) throws IOException {
        synchronized (lock) {
            if (lanSocket != null) return;
        }
        ServerSocket s = new ServerSocket();
        s.setReuseAddress(true);
        s.bind(new InetSocketAddress(port)); // all interfaces: Wi-Fi, hotspot...
        synchronized (lock) {
            lanSocket = s;
            lanPort = port;
            changed(false);
        }
        acceptLoop(s, false);
        Listener l = listener;
        if (l != null) l.onHostingChanged(true, port);
    }

    public void stopLan() {
        ServerSocket s;
        synchronized (lock) {
            s = lanSocket;
            lanSocket = null;
            changed(false); // wakes event streams so they notice and close
        }
        if (s != null) {
            try { s.close(); } catch (IOException ignored) {}
            Listener l = listener;
            if (l != null) l.onHostingChanged(false, lanPort);
        }
    }

    private boolean partyEnabled() { return lanSocket != null; }

    private void acceptLoop(final ServerSocket server, final boolean fromApp) {
        Thread t = new Thread(() -> {
            while (!server.isClosed()) {
                try {
                    final Socket client = server.accept();
                    Thread h = new Thread(() -> handle(client, fromApp), "packrat-conn");
                    h.setDaemon(true);
                    h.start();
                } catch (IOException e) {
                    if (server.isClosed()) return;
                }
            }
        }, fromApp ? "packrat-app" : "packrat-lan");
        t.setDaemon(true);
        t.start();
    }

    // ------------------------------------------------------------------ persistence

    private void load() {
        if (!dataFile.exists()) return;
        try (InputStream in = new java.io.FileInputStream(dataFile)) {
            JSONObject data = new JSONObject(new String(readAll(in), StandardCharsets.UTF_8));
            characters = data.optJSONObject("characters") != null ? data.getJSONObject("characters") : new JSONObject();
            trades = data.optJSONArray("trades") != null ? data.getJSONArray("trades") : new JSONArray();
            shops = data.optJSONArray("shops") != null ? data.getJSONArray("shops") : new JSONArray();
            partyId = data.optString("partyId", "");
        } catch (Exception e) {
            // Corrupt file: keep a copy and start fresh rather than refusing to run.
            dataFile.renameTo(new File(dataFile.getPath() + ".broken-" + System.currentTimeMillis()));
        }
    }

    private void save() {
        try {
            JSONObject data = new JSONObject();
            data.put("characters", characters);
            data.put("trades", trades);
            data.put("shops", shops);
            data.put("partyId", partyId);
            File tmp = new File(dataFile.getPath() + ".tmp");
            try (OutputStream out = new FileOutputStream(tmp)) {
                out.write(data.toString().getBytes(StandardCharsets.UTF_8));
            }
            if (!tmp.renameTo(dataFile)) throw new IOException("rename failed");
        } catch (Exception e) {
            android.util.Log.e("PackRat", "Could not save party", e);
        }
    }

    /** Call with `lock` held after mutating state. */
    private void changed(boolean persist) {
        version++;
        if (persist) save();
        lock.notifyAll();
    }

    private String newId(String prefix) {
        String chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        StringBuilder sb = new StringBuilder(prefix).append(Long.toHexString(System.currentTimeMillis()));
        for (int i = 0; i < 8; i++) sb.append(chars.charAt(random.nextInt(chars.length())));
        return sb.toString();
    }

    // ------------------------------------------------------------------ views

    private JSONObject publicChar(JSONObject c, String token) throws JSONException {
        JSONObject out = new JSONObject(c.toString());
        String owner = c.optString("owner");
        out.remove("owner");
        out.put("mine", owner.equals(token));
        Integer n = online.get(owner);
        out.put("online", n != null && n > 0);
        return out;
    }

    private JSONObject snapshot(String token) throws JSONException {
        Set<String> mine = new HashSet<>();
        JSONArray chars = new JSONArray();
        Iterator<String> it = characters.keys();
        while (it.hasNext()) {
            String id = it.next();
            JSONObject c = characters.getJSONObject(id);
            if (c.optString("owner").equals(token)) mine.add(id);
            chars.put(publicChar(c, token));
        }
        JSONArray ts = new JSONArray();
        for (int i = 0; i < trades.length(); i++) {
            JSONObject t = trades.getJSONObject(i);
            boolean fromMine = mine.contains(t.optString("from")), toMine = mine.contains(t.optString("to"));
            if (!fromMine && !toMine) continue;
            JSONObject copy = new JSONObject(t.toString());
            copy.put("fromMine", fromMine);
            copy.put("toMine", toMine);
            ts.put(copy);
        }
        JSONObject snap = new JSONObject();
        snap.put("characters", chars);
        snap.put("trades", ts);
        JSONArray openShops = new JSONArray();
        for (int i = 0; i < shops.length(); i++) if (shops.getJSONObject(i).optBoolean("open")) openShops.put(publicShop(shops.getJSONObject(i)));
        snap.put("shops", openShops);
        return snap;
    }

    static List<String> lanAddresses() {
        List<String> out = new ArrayList<>();
        try {
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) continue;
                for (InetAddress a : Collections.list(ni.getInetAddresses())) {
                    if (a instanceof Inet4Address && a.isSiteLocalAddress()) out.add(a.getHostAddress());
                }
            }
        } catch (Exception ignored) {}
        Collections.sort(out);
        return out;
    }

    // ------------------------------------------------------------------ trades

    static class TradeError extends Exception {
        private static final long serialVersionUID = 1L;
        TradeError(String m) { super(m); }
    }

    static class ApiError extends Exception {
        private static final long serialVersionUID = 1L;
        final int status;
        final JSONObject extra;
        ApiError(int status, String message) { this(status, message, null); }
        ApiError(int status, String message, JSONObject extra) {
            super(message);
            this.status = status;
            this.extra = extra;
        }
    }

    private static JSONObject findEntry(JSONObject ch, String uid) throws JSONException {
        JSONArray items = ch.getJSONArray("items");
        for (int i = 0; i < items.length(); i++) {
            JSONObject e = items.getJSONObject(i);
            if (e.optString("uid").equals(uid)) return e;
        }
        return null;
    }

    private static List<JSONObject> descendants(JSONObject ch, String uid) throws JSONException {
        List<JSONObject> out = new ArrayList<>();
        Set<String> frontier = new HashSet<>(Collections.singleton(uid));
        JSONArray items = ch.getJSONArray("items");
        while (!frontier.isEmpty()) {
            Set<String> next = new HashSet<>();
            for (int i = 0; i < items.length(); i++) {
                JSONObject e = items.getJSONObject(i);
                if (!e.isNull("parent") && frontier.contains(e.optString("parent"))) {
                    out.add(e);
                    next.add(e.optString("uid"));
                }
            }
            frontier = next;
        }
        return out;
    }

    private static int intOf(Object v) {
        if (v instanceof Number) return ((Number) v).intValue();
        try { return (int) Double.parseDouble(String.valueOf(v)); } catch (Exception e) { return 0; }
    }

    private JSONObject cleanSide(JSONObject ch, JSONObject side) throws JSONException, TradeError {
        if (side == null) side = new JSONObject();
        JSONArray items = new JSONArray();
        Set<String> uids = new HashSet<>();
        JSONArray in = side.optJSONArray("items");
        if (in != null) {
            for (int i = 0; i < in.length(); i++) {
                JSONObject it = in.getJSONObject(i);
                int qty = intOf(it.opt("qty"));
                JSONObject e = findEntry(ch, it.optString("uid"));
                if (qty <= 0 || e == null) throw new TradeError("An item in the offer no longer exists.");
                JSONObject clean = new JSONObject();
                clean.put("uid", e.getString("uid"));
                clean.put("qty", qty);
                clean.put("name", e.getJSONObject("item").optString("name"));
                items.put(clean);
                uids.add(e.getString("uid"));
            }
        }
        for (int i = 0; i < items.length(); i++) { // giving a container already gives everything in it
            JSONObject it = items.getJSONObject(i);
            for (JSONObject d : descendants(ch, it.getString("uid"))) {
                if (uids.contains(d.optString("uid"))) {
                    throw new TradeError("Don't list items that are inside " + it.getString("name") + " - they go with it.");
                }
            }
        }
        JSONObject coins = new JSONObject();
        JSONObject inCoins = side.optJSONObject("coins");
        for (String k : COINS) {
            int v = inCoins == null ? 0 : intOf(inCoins.opt(k));
            if (v < 0) throw new TradeError("Coin amounts can't be negative.");
            if (v > 0) coins.put(k, v);
        }
        JSONObject out = new JSONObject();
        out.put("items", items);
        out.put("coins", coins);
        return out;
    }

    private static void checkSide(JSONObject ch, JSONObject side) throws JSONException, TradeError {
        JSONArray items = side.getJSONArray("items");
        for (int i = 0; i < items.length(); i++) {
            JSONObject it = items.getJSONObject(i);
            JSONObject e = findEntry(ch, it.getString("uid"));
            if (e == null || e.optInt("qty") < it.getInt("qty")) {
                throw new TradeError(ch.optString("name") + " no longer has " + it.getInt("qty") + " x " + it.optString("name") + ".");
            }
        }
        JSONObject coins = side.getJSONObject("coins");
        JSONObject have = ch.optJSONObject("coins");
        Iterator<String> ks = coins.keys();
        while (ks.hasNext()) {
            String k = ks.next();
            if ((have == null ? 0 : have.optInt(k)) < coins.getInt(k)) {
                throw new TradeError(ch.optString("name") + " doesn't have " + coins.getInt(k) + " " + k + ".");
            }
        }
    }

    /** Structural equality for JSON values (key order and int/double differences don't matter). */
    static boolean jsonEquals(Object a, Object b) throws JSONException {
        if (a == null || a == JSONObject.NULL) return b == null || b == JSONObject.NULL;
        if (a instanceof JSONObject) {
            if (!(b instanceof JSONObject)) return false;
            JSONObject x = (JSONObject) a, y = (JSONObject) b;
            if (x.length() != y.length()) return false;
            Iterator<String> it = x.keys();
            while (it.hasNext()) {
                String k = it.next();
                if (!y.has(k) || !jsonEquals(x.get(k), y.get(k))) return false;
            }
            return true;
        }
        if (a instanceof JSONArray) {
            if (!(b instanceof JSONArray)) return false;
            JSONArray x = (JSONArray) a, y = (JSONArray) b;
            if (x.length() != y.length()) return false;
            for (int i = 0; i < x.length(); i++) if (!jsonEquals(x.get(i), y.get(i))) return false;
            return true;
        }
        if (a instanceof Number && b instanceof Number) return ((Number) a).doubleValue() == ((Number) b).doubleValue();
        return a.equals(b);
    }

    // ------------------------------------------------------------------ shops (same rules as server.py)

    static final int[] COIN_VALUE = {1000, 100, 50, 10, 1}; // matches COINS order: pp gp ep sp cp

    static final int[] PAYOUT = {1, 3, 4}; // gp, sp, cp (indexes into COINS)

    /** payout() in server.py/store.js: mostly the largest coins up to `top`, but `margin` % in the next smaller coin. */
    static long[] payout(long amount, int margin, int top) {
        long[] out = new long[COINS.length];
        int start = 0;
        while (PAYOUT[start] != top) start++;
        long small = amount * margin / 100;
        long main = amount - small;
        int largest = PAYOUT[PAYOUT.length - 1];
        boolean found = false;
        for (int j = start; j < PAYOUT.length; j++) {
            int i = PAYOUT[j];
            out[i] = main / COIN_VALUE[i];
            main -= out[i] * COIN_VALUE[i];
            if (out[i] > 0 && !found) { largest = i; found = true; }
        }
        int from = 0;
        while (PAYOUT[from] != largest) from++;
        from = Math.min(from + 1, PAYOUT.length - 1); // next smaller coin (cp stays cp)
        for (int j = from; j < PAYOUT.length; j++) {
            int i = PAYOUT[j];
            long n = small / COIN_VALUE[i];
            out[i] += n;
            small -= n * COIN_VALUE[i];
        }
        return out;
    }

    /** payCoins() from store.js: big coins first without overpaying, then break one coin; change comes as payout(margin). */
    static JSONObject payCoins(JSONObject coins, int cost, int margin) throws JSONException {
        int[] c = new int[COINS.length];
        long total = 0;
        for (int i = 0; i < COINS.length; i++) {
            c[i] = coins == null ? 0 : coins.optInt(COINS[i]);
            total += (long) c[i] * COIN_VALUE[i];
        }
        if (total < cost) return null;
        int remaining = cost;
        for (int i = 0; i < COINS.length; i++) {
            int n = Math.min(c[i], remaining / COIN_VALUE[i]);
            c[i] -= n;
            remaining -= n * COIN_VALUE[i];
        }
        if (remaining > 0) {
            int d = -1;
            for (int i = COINS.length - 1; i >= 0; i--) if (c[i] > 0 && COIN_VALUE[i] > remaining) { d = i; break; }
            c[d] -= 1;
            int top = 4;
            for (int i : PAYOUT) if (COIN_VALUE[i] < COIN_VALUE[d]) { top = i; break; }
            long[] change = payout(COIN_VALUE[d] - remaining, margin, top);
            for (int i = 0; i < COINS.length; i++) c[i] += (int) change[i];
        }
        JSONObject out = new JSONObject();
        for (int i = 0; i < COINS.length; i++) out.put(COINS[i], c[i]);
        return out;
    }

    static int listingPrice(JSONObject shop, JSONObject listing) {
        double base = listing.isNull("price") ? listing.optJSONObject("item").optDouble("cost", 0) : listing.optDouble("price", 0);
        if (Double.isNaN(base)) base = 0;
        return (int) Math.max(0, Math.round(base * (100 + shop.optInt("markup")) / 100.0));
    }

    private JSONObject cleanShop(JSONObject raw) throws ApiError {
        if (raw == null) throw new ApiError(400, "Invalid shop");
        // Reject non-numbers rather than quietly treating them as 0 (matches server.py).
        if (raw.has("markup") && !raw.isNull("markup") && Double.isNaN(raw.optDouble("markup"))) throw new ApiError(400, "Invalid shop");
        try {
            JSONArray items = new JSONArray();
            JSONArray in = raw.optJSONArray("items");
            for (int i = 0; in != null && i < in.length() && i < 500; i++) {
                JSONObject li = in.optJSONObject(i);
                JSONObject it = li == null ? null : li.optJSONObject("item");
                if (it == null || it.optString("name").isEmpty() || it.optString("type").isEmpty()) continue;
                JSONObject out = new JSONObject();
                String lid = li.optString("lid");
                out.put("lid", lid.isEmpty() ? newId("l") : lid.substring(0, Math.min(40, lid.length())));
                String src = li.isNull("srcId") ? "" : li.optString("srcId");
                out.put("srcId", src.isEmpty() ? JSONObject.NULL : src);
                out.put("item", it);
                out.put("price", li.isNull("price") || "".equals(li.opt("price")) ? JSONObject.NULL : Math.max(0, li.getInt("price")));
                out.put("stock", li.isNull("stock") || "".equals(li.opt("stock")) ? JSONObject.NULL : Math.max(0, li.getInt("stock")));
                items.put(out);
            }
            JSONObject shop = new JSONObject();
            shop.put("name", cut(raw.optString("name", "Shop"), 80));
            shop.put("keeper", cut(raw.optString("keeper"), 80));
            shop.put("description", cut(raw.optString("description"), 2000));
            String icon = raw.isNull("icon") ? "" : raw.optString("icon");
            shop.put("icon", icon.isEmpty() ? JSONObject.NULL : cut(icon, 40));
            shop.put("open", raw.optBoolean("open"));
            shop.put("markup", Math.max(-90, Math.min(500, raw.optInt("markup"))));
            shop.put("items", items);
            // Buying from players
            shop.put("buys", raw.optBoolean("buys"));
            shop.put("sellRate", raw.isNull("sellRate") || "".equals(raw.opt("sellRate")) ? 50 : Math.max(0, Math.min(1000, raw.getInt("sellRate"))));
            JSONObject rates = new JSONObject();
            JSONObject inRates = raw.optJSONObject("typeRates");
            if (inRates != null) {
                Iterator<String> it = inRates.keys();
                for (int n = 0; it.hasNext() && n < 40; n++) {
                    String k = it.next();
                    if (inRates.isNull(k) || "".equals(inRates.opt(k))) continue;
                    rates.put(cut(k, 20), Math.max(0, Math.min(1000, inRates.getInt(k))));
                }
            }
            shop.put("typeRates", rates);
            JSONArray rules = new JSONArray();
            JSONArray inRules = raw.optJSONArray("sellItems");
            for (int i = 0; inRules != null && i < inRules.length() && i < 300; i++) {
                JSONObject r = inRules.optJSONObject(i);
                if (r == null || r.optString("srcId").isEmpty()) continue;
                boolean fixed = "fixed".equals(r.optString("mode"));
                JSONObject out = new JSONObject();
                out.put("srcId", cut(r.getString("srcId"), 80));
                out.put("name", cut(r.optString("name"), 120));
                String ic = r.isNull("icon") ? "" : r.optString("icon");
                out.put("icon", ic.isEmpty() ? JSONObject.NULL : cut(ic, 40));
                out.put("type", cut(r.optString("type"), 20));
                out.put("mode", fixed ? "fixed" : "percent");
                out.put("value", Math.max(0, Math.min(fixed ? 100000000 : 1000, r.optInt("value"))));
                rules.put(out);
            }
            shop.put("sellItems", rules);
            // Money: one universal pot in copper; null = unlimited. Margin = % of payouts in smaller coins.
            if (raw.has("funds") && !raw.isNull("funds") && !"".equals(raw.opt("funds")) && Double.isNaN(raw.optDouble("funds"))) {
                throw new ApiError(400, "Invalid shop");
            }
            shop.put("funds", raw.isNull("funds") || "".equals(raw.opt("funds")) ? JSONObject.NULL : Math.max(0, raw.getLong("funds")));
            shop.put("changeMargin", raw.isNull("changeMargin") || "".equals(raw.opt("changeMargin")) ? 10 : Math.max(0, Math.min(50, raw.getInt("changeMargin"))));
            return shop;
        } catch (JSONException e) {
            throw new ApiError(400, "Invalid shop");
        }
    }

    private static String cut(String s, int n) { return s.length() > n ? s.substring(0, n) : s; }

    /** sell_offer() in server.py: this item's rule, then its type's %, then the shop's default %. */
    static long sellOffer(JSONObject shop, JSONObject entry, int qty) throws JSONException {
        if (!shop.optBoolean("buys")) return 0;
        JSONObject item = entry.optJSONObject("item");
        if (item == null) return 0;
        long bundle = Math.max(1, item.optInt("bundle", 1));
        JSONObject rule = null;
        JSONArray rules = shop.optJSONArray("sellItems");
        for (int i = 0; rules != null && i < rules.length(); i++) {
            if (rules.getJSONObject(i).optString("srcId").equals(entry.optString("srcId"))) { rule = rules.getJSONObject(i); break; }
        }
        if (rule != null && "fixed".equals(rule.optString("mode"))) return rule.optLong("value") * qty / bundle;
        long pct;
        if (rule != null) pct = rule.optLong("value");
        else {
            JSONObject rates = shop.optJSONObject("typeRates");
            String type = item.optString("type");
            pct = rates != null && rates.has(type) ? rates.optLong(type) : shop.optLong("sellRate", 50);
        }
        return (long) item.optDouble("cost", 0) * qty * pct / (bundle * 100);
    }

    /** receiveCoins() in store.js: add copper as gp/sp/cp (see payout). */
    static JSONObject receiveCoins(JSONObject coins, long amount, int margin) throws JSONException {
        JSONObject c = new JSONObject();
        long[] add = payout(amount, margin, 1);
        for (int i = 0; i < COINS.length; i++) c.put(COINS[i], (coins == null ? 0 : coins.optLong(COINS[i])) + add[i]);
        return c;
    }

    /** A shop as players see it: the stockroom is the host's business. */
    static JSONObject publicShop(JSONObject shop) throws JSONException {
        JSONObject out = new JSONObject(shop.toString());
        out.remove("backroom");
        return out;
    }

    /** Items bought from players go to the stockroom, stacking identical ones. */
    private void addToBackroom(JSONObject shop, JSONObject entry, int qty) throws JSONException {
        JSONObject item = new JSONObject(entry.getJSONObject("item").toString());
        if (shop.optJSONArray("backroom") == null) shop.put("backroom", new JSONArray());
        JSONArray room = shop.getJSONArray("backroom");
        String src = entry.isNull("srcId") ? "" : entry.optString("srcId");
        for (int i = 0; i < room.length(); i++) {
            JSONObject b = room.getJSONObject(i);
            String bs = b.isNull("srcId") ? "" : b.optString("srcId");
            if (bs.equals(src) && jsonEquals(b.getJSONObject("item"), item)) {
                b.put("qty", b.optInt("qty") + qty);
                return;
            }
        }
        JSONObject b = new JSONObject();
        b.put("bid", newId("b"));
        b.put("srcId", src.isEmpty() ? JSONObject.NULL : src);
        b.put("item", item);
        b.put("qty", qty);
        room.put(b);
    }

    private JSONObject shopEntry(JSONObject listing, int lots) throws JSONException {
        JSONObject item = new JSONObject(listing.getJSONObject("item").toString());
        JSONObject e = new JSONObject();
        e.put("uid", newId(""));
        e.put("srcId", listing.opt("srcId"));
        e.put("item", item);
        e.put("qty", Math.max(1, item.optInt("bundle", 1)) * lots);
        e.put("equipped", false);
        e.put("attuned", false);
        e.put("parent", JSONObject.NULL);
        e.put("strapped", false);
        e.put("notes", "");
        if (item.optInt("maxCharges") > 0) e.put("charges", item.optInt("maxCharges"));
        return e;
    }

    /** See shops_api() in server.py for the endpoints. */
    private JSONObject shopsApi(Request req, List<String> parts, String token) throws ApiError, JSONException {
        boolean host = req.fromHostDevice();
        JSONObject body = (req.method.equals("POST") || req.method.equals("PUT")) ? req.json() : new JSONObject();
        synchronized (lock) {
            if (req.method.equals("GET") && parts.isEmpty()) {
                JSONArray list = new JSONArray();
                for (int i = 0; i < shops.length(); i++) {
                    if (host) list.put(shops.get(i));
                    else if (shops.getJSONObject(i).optBoolean("open")) list.put(publicShop(shops.getJSONObject(i)));
                }
                JSONObject r = new JSONObject();
                r.put("shops", list);
                return r;
            }
            if (req.method.equals("POST") && parts.isEmpty()) {
                if (!host) throw new ApiError(403, "Only the host can set up shops");
                JSONObject shop = cleanShop(body.optJSONObject("shop"));
                shop.put("id", newId("s"));
                shop.put("rev", 1);
                shop.put("backroom", new JSONArray());
                shops.put(shop);
                changed(true);
                JSONObject r = new JSONObject();
                r.put("id", shop.getString("id"));
                r.put("rev", 1);
                return r;
            }
            int index = -1;
            for (int i = 0; i < shops.length() && !parts.isEmpty(); i++) if (shops.getJSONObject(i).optString("id").equals(parts.get(0))) index = i;
            if (index < 0) throw new ApiError(404, "No such shop");
            JSONObject shop = shops.getJSONObject(index);
            String action = parts.size() > 1 ? parts.get(1) : null;
            if (req.method.equals("PUT") && action == null) {
                if (!host) throw new ApiError(403, "Only the host can set up shops");
                if (!body.has("baseRev") || body.optLong("baseRev", -1) != shop.optLong("rev")) {
                    JSONObject extra = new JSONObject();
                    extra.put("shop", shop);
                    throw new ApiError(409, "The shop changed (someone may have bought something)", extra);
                }
                JSONObject next = cleanShop(body.optJSONObject("shop"));
                next.put("id", shop.getString("id"));
                next.put("rev", shop.optLong("rev") + 1);
                // The stockroom only changes through sales and the backroom actions.
                next.put("backroom", shop.optJSONArray("backroom") != null ? shop.getJSONArray("backroom") : new JSONArray());
                shops.put(index, next);
                changed(true);
                JSONObject r = new JSONObject();
                r.put("rev", next.getLong("rev"));
                return r;
            }
            if (req.method.equals("DELETE") && action == null) {
                if (!host) throw new ApiError(403, "Only the host can set up shops");
                shops.remove(index);
                changed(true);
                JSONObject r = new JSONObject();
                r.put("ok", true);
                return r;
            }
            if (req.method.equals("POST") && "sell".equals(action)) {
                if (!partyEnabled()) throw new ApiError(404, "No party is being hosted");
                if (!shop.optBoolean("open")) throw new ApiError(409, shop.optString("name") + " is closed");
                if (!shop.optBoolean("buys")) throw new ApiError(409, shop.optString("name") + " doesn't buy items");
                JSONObject c = characters.optJSONObject(body.optString("character"));
                if (c == null || !c.optString("owner").equals(token)) throw new ApiError(403, "You can only sell your own character's items");
                JSONObject entry = findEntry(c, body.optString("uid"));
                int qty = body.optInt("qty", 1);
                if (entry == null || qty < 1 || qty > entry.optInt("qty")) throw new ApiError(409, c.optString("name") + " doesn't have that many");
                JSONArray inv = c.getJSONArray("items");
                for (int i = 0; i < inv.length(); i++) {
                    JSONObject e = inv.getJSONObject(i);
                    // A deck sells with the cards still in it; anything else has to be emptied first.
                    if (!e.isNull("parent") && e.optString("parent").equals(entry.optString("uid")) && !e.getJSONObject("item").optBoolean("card")) {
                        throw new ApiError(409, "Empty the " + entry.getJSONObject("item").optString("name", "container") + " before selling it");
                    }
                }
                long paid = sellOffer(shop, entry, qty);
                if (paid <= 0) throw new ApiError(409, shop.optString("name") + " won't buy " + entry.getJSONObject("item").optString("name", "that"));
                boolean limitedFunds = !shop.isNull("funds") && shop.has("funds");
                if (limitedFunds && shop.optLong("funds") < paid) throw new ApiError(409, shop.optString("name") + " can't afford that right now");
                addToBackroom(shop, entry, qty);
                if (limitedFunds) shop.put("funds", shop.optLong("funds") - paid);
                shop.put("rev", shop.optLong("rev") + 1);
                entry.put("qty", entry.optInt("qty") - qty);
                if (entry.optInt("qty") <= 0) {
                    JSONArray keep = new JSONArray();
                    for (int i = 0; i < inv.length(); i++) {
                        JSONObject x = inv.getJSONObject(i);
                        if (x != entry && !x.optString("parent").equals(entry.optString("uid"))) keep.put(x);
                    }
                    c.put("items", keep);
                }
                c.put("coins", receiveCoins(c.optJSONObject("coins"), paid, shop.optInt("changeMargin", 10)));
                c.put("rev", c.optLong("rev") + 1);
                changed(true);
                JSONObject r = new JSONObject();
                r.put("ok", true);
                r.put("paid", paid);
                return r;
            }
            if (req.method.equals("POST") && ("buy".equals(action) || "take".equals(action))) {
                JSONObject listing = null;
                JSONArray items = shop.getJSONArray("items");
                for (int i = 0; i < items.length(); i++) if (items.getJSONObject(i).optString("lid").equals(body.optString("lid"))) listing = items.getJSONObject(i);
                int lots = body.optInt("qty", 1);
                if (listing == null || lots < 1 || lots > 999) throw new ApiError(400, "That item isn't sold here");
                boolean limited = !listing.isNull("stock");
                if (limited && listing.getInt("stock") < lots) {
                    throw new ApiError(409, listing.getInt("stock") == 0 ? "Sold out" : "Only " + listing.getInt("stock") + " left");
                }
                if ("take".equals(action)) {
                    if (!host) throw new ApiError(403, "Only the host can do that");
                } else {
                    if (!partyEnabled()) throw new ApiError(404, "No party is being hosted");
                    if (!shop.optBoolean("open")) throw new ApiError(409, shop.optString("name") + " is closed");
                    JSONObject c = characters.optJSONObject(body.optString("character"));
                    if (c == null || !c.optString("owner").equals(token)) throw new ApiError(403, "You can only buy for your own character");
                    int total = listingPrice(shop, listing) * lots;
                    JSONObject purse = payCoins(c.optJSONObject("coins"), total, shop.optInt("changeMargin", 10));
                    if (purse == null) throw new ApiError(409, c.optString("name") + " can't afford that");
                    c.put("coins", purse);
                    mergeInto(c, shopEntry(listing, lots));
                    c.put("rev", c.optLong("rev") + 1);
                }
                if (limited) listing.put("stock", listing.getInt("stock") - lots);
                if (shop.has("funds") && !shop.isNull("funds")) shop.put("funds", shop.optLong("funds") + (long) listingPrice(shop, listing) * lots);
                shop.put("rev", shop.optLong("rev") + 1);
                changed(true);
                JSONObject r = new JSONObject();
                r.put("ok", true);
                r.put("shopRev", shop.getLong("rev"));
                return r;
            }
            if (req.method.equals("POST") && "receive".equals(action)) {
                // Host selling their own solo character's item: the shop pays and stocks it here.
                if (!host) throw new ApiError(403, "Only the host can do that");
                JSONObject item = body.optJSONObject("item");
                int qty = body.optInt("qty", 0);
                if (item == null || item.optString("name").isEmpty() || item.optString("type").isEmpty() || qty < 1 || qty > 100000) {
                    throw new ApiError(400, "Invalid item");
                }
                JSONObject entry = new JSONObject();
                String src = body.isNull("srcId") ? "" : cut(body.optString("srcId"), 80);
                entry.put("srcId", src.isEmpty() ? JSONObject.NULL : src);
                entry.put("item", item);
                long paid = sellOffer(shop, entry, qty);
                if (paid <= 0) throw new ApiError(409, shop.optString("name") + " won't buy " + item.optString("name"));
                boolean limitedFunds = shop.has("funds") && !shop.isNull("funds");
                if (limitedFunds && shop.optLong("funds") < paid) throw new ApiError(409, shop.optString("name") + " can't afford that right now");
                addToBackroom(shop, entry, qty);
                if (limitedFunds) shop.put("funds", shop.optLong("funds") - paid);
                shop.put("rev", shop.optLong("rev") + 1);
                changed(true);
                JSONObject r = new JSONObject();
                r.put("ok", true);
                r.put("paid", paid);
                return r;
            }
            if (req.method.equals("POST") && "backroom".equals(action)) {
                // Host: put stockroom items on the shelves, or throw them out.
                if (!host) throw new ApiError(403, "Only the host can do that");
                JSONArray room = shop.optJSONArray("backroom");
                int bi = -1;
                for (int i = 0; room != null && i < room.length(); i++) if (room.getJSONObject(i).optString("bid").equals(body.optString("bid"))) bi = i;
                if (bi < 0) throw new ApiError(404, "That item isn't in the stockroom");
                JSONObject b = room.getJSONObject(bi);
                int bundle = Math.max(1, b.getJSONObject("item").optInt("bundle", 1));
                int qty = body.optInt("qty", 0);
                String act = body.optString("action");
                if ("shelve".equals(act)) {
                    if (qty < 1 || (long) qty * bundle > b.optInt("qty")) throw new ApiError(409, "Not that many in the stockroom");
                    JSONObject same = null;
                    JSONArray items = shop.getJSONArray("items");
                    String src = b.isNull("srcId") ? "" : b.optString("srcId");
                    for (int i = 0; i < items.length(); i++) {
                        JSONObject li = items.getJSONObject(i);
                        String ls = li.isNull("srcId") ? "" : li.optString("srcId");
                        if (ls.equals(src) && jsonEquals(li.getJSONObject("item"), b.getJSONObject("item"))) same = li;
                    }
                    if (same != null) {
                        if (!same.isNull("stock")) same.put("stock", same.getInt("stock") + qty);
                    } else {
                        JSONObject li = new JSONObject();
                        li.put("lid", newId("l"));
                        li.put("srcId", src.isEmpty() ? JSONObject.NULL : src);
                        li.put("item", new JSONObject(b.getJSONObject("item").toString()));
                        li.put("price", body.isNull("price") || "".equals(body.opt("price")) ? JSONObject.NULL : Math.max(0, body.optInt("price")));
                        li.put("stock", qty);
                        items.put(li);
                    }
                    b.put("qty", b.optInt("qty") - qty * bundle);
                } else if ("discard".equals(act)) {
                    if (qty < 1 || qty > b.optInt("qty")) throw new ApiError(409, "Not that many in the stockroom");
                    b.put("qty", b.optInt("qty") - qty);
                } else {
                    throw new ApiError(400, "Unknown stockroom action");
                }
                if (b.optInt("qty") <= 0) room.remove(bi);
                shop.put("rev", shop.optLong("rev") + 1);
                changed(true);
                JSONObject r = new JSONObject();
                r.put("ok", true);
                r.put("shopRev", shop.getLong("rev"));
                return r;
            }
        }
        throw new ApiError(404, "Unknown endpoint");
    }

    private static void mergeInto(JSONObject dst, JSONObject entry) throws JSONException {
        JSONObject item = entry.getJSONObject("item");
        JSONArray items = dst.getJSONArray("items");
        JSONObject features = item.optJSONObject("features");
        boolean separate = features != null && (features.optBoolean("holds") || features.optBoolean("pack"));
        // Decks keep their own cards; anything made a container or pack stays separate too.
        if (!NON_STACKING.contains(item.optString("type")) && item.optJSONArray("deckCards") == null && !separate) {
            for (int i = 0; i < items.length(); i++) {
                JSONObject x = items.getJSONObject(i);
                if (x.isNull("parent") && !x.optBoolean("strapped") && x.optString("srcId").equals(entry.optString("srcId"))
                        && jsonEquals(x.getJSONObject("item"), item) && x.optString("customName").equals(entry.optString("customName"))) {
                    x.put("qty", x.optInt("qty") + entry.optInt("qty"));
                    return;
                }
            }
        }
        items.put(entry);
    }

    private static void makeLoose(JSONObject e) throws JSONException {
        e.put("parent", JSONObject.NULL);
        e.put("strapped", false);
        e.put("equipped", false);
        e.put("attuned", false);
    }

    private void transfer(JSONObject src, JSONObject dst, String uid, int qty) throws JSONException {
        JSONObject e = findEntry(src, uid);
        if (qty >= e.optInt("qty")) {
            List<JSONObject> kids = descendants(src, uid);
            Set<String> moving = new HashSet<>(Collections.singleton(uid));
            for (JSONObject k : kids) moving.add(k.optString("uid"));
            JSONArray keep = new JSONArray();
            JSONArray items = src.getJSONArray("items");
            for (int i = 0; i < items.length(); i++) {
                JSONObject x = items.getJSONObject(i);
                if (!moving.contains(x.optString("uid"))) keep.put(x);
            }
            src.put("items", keep);
            makeLoose(e);
            for (JSONObject k : kids) {
                k.put("equipped", false);
                k.put("attuned", false);
            }
            if (kids.isEmpty()) mergeInto(dst, e);
            else dst.getJSONArray("items").put(e);
            for (JSONObject k : kids) dst.getJSONArray("items").put(k);
        } else {
            e.put("qty", e.optInt("qty") - qty);
            JSONObject part = new JSONObject(e.toString());
            makeLoose(part);
            part.put("uid", newId(""));
            part.put("qty", qty);
            mergeInto(dst, part);
        }
    }

    private static void moveCoins(JSONObject src, JSONObject dst, JSONObject coins) throws JSONException {
        if (src.optJSONObject("coins") == null) src.put("coins", new JSONObject());
        if (dst.optJSONObject("coins") == null) dst.put("coins", new JSONObject());
        Iterator<String> ks = coins.keys();
        while (ks.hasNext()) {
            String k = ks.next();
            int v = coins.getInt(k);
            src.getJSONObject("coins").put(k, src.getJSONObject("coins").optInt(k) - v);
            dst.getJSONObject("coins").put(k, dst.getJSONObject("coins").optInt(k) + v);
        }
    }

    private void execute(JSONObject trade) throws JSONException, TradeError {
        JSONObject a = characters.optJSONObject(trade.getString("from"));
        JSONObject b = characters.optJSONObject(trade.getString("to"));
        if (a == null || b == null) throw new TradeError("One of the characters has left the party.");
        JSONObject give = trade.getJSONObject("give"), ask = trade.getJSONObject("ask");
        checkSide(a, give);
        checkSide(b, ask);
        JSONArray gi = give.getJSONArray("items"), ai = ask.getJSONArray("items");
        for (int i = 0; i < gi.length(); i++) transfer(a, b, gi.getJSONObject(i).getString("uid"), gi.getJSONObject(i).getInt("qty"));
        for (int i = 0; i < ai.length(); i++) transfer(b, a, ai.getJSONObject(i).getString("uid"), ai.getJSONObject(i).getInt("qty"));
        moveCoins(a, b, give.getJSONObject("coins"));
        moveCoins(b, a, ask.getJSONObject("coins"));
        a.put("rev", a.optLong("rev") + 1);
        b.put("rev", b.optLong("rev") + 1);
    }

    private void resolve(JSONObject trade, String status, String reason) throws JSONException {
        trade.put("status", status);
        trade.put("resolved", System.currentTimeMillis() / 1000.0);
        if (reason != null) trade.put("reason", reason);
        JSONArray pending = new JSONArray();
        List<JSONObject> done = new ArrayList<>();
        for (int i = 0; i < trades.length(); i++) {
            JSONObject t = trades.getJSONObject(i);
            if ("pending".equals(t.optString("status"))) pending.put(t); else done.add(t);
        }
        for (int i = Math.max(0, done.size() - KEEP_RESOLVED_TRADES); i < done.size(); i++) pending.put(done.get(i));
        trades = pending;
    }

    // ------------------------------------------------------------------ HTTP

    static class Request {
        String method, path, query = "";
        Map<String, String> headers = new HashMap<>();
        byte[] body = new byte[0];
        boolean fromApp;
        InetAddress remote;

        /** From this device (the host curates shops): the app's own listener, loopback (IPv4 or IPv6) or its own address. */
        boolean fromHostDevice() {
            return fromApp || (remote != null && (remote.isLoopbackAddress() || lanAddresses().contains(remote.getHostAddress())));
        }

        String token() {
            String t = headers.get("x-player");
            if (t != null && !t.isEmpty()) return t;
            for (String kv : query.split("&")) {
                if (kv.startsWith("player=")) {
                    try { return URLDecoder.decode(kv.substring(7), "UTF-8"); } catch (Exception ignored) {}
                }
            }
            return "";
        }

        JSONObject json() throws ApiError {
            try {
                String s = new String(body, StandardCharsets.UTF_8).trim();
                return s.isEmpty() ? new JSONObject() : new JSONObject(s);
            } catch (JSONException e) {
                throw new ApiError(400, "Invalid JSON");
            }
        }
    }

    private void handle(Socket socket, boolean fromApp) {
        try (Socket s = socket) {
            s.setSoTimeout(60000);
            InputStream in = new BufferedInputStream(s.getInputStream());
            OutputStream out = new BufferedOutputStream(s.getOutputStream());
            String line = readLine(in);
            if (line == null || line.isEmpty()) return;
            String[] parts = line.split(" ");
            if (parts.length < 2) return;
            Request req = new Request();
            req.fromApp = fromApp;
            req.remote = s.getInetAddress();
            req.method = parts[0].toUpperCase();
            String target = parts[1];
            int q = target.indexOf('?');
            req.path = q >= 0 ? target.substring(0, q) : target;
            if (q >= 0) req.query = target.substring(q + 1);
            String h;
            while ((h = readLine(in)) != null && !h.isEmpty()) {
                int c = h.indexOf(':');
                if (c > 0) req.headers.put(h.substring(0, c).trim().toLowerCase(), h.substring(c + 1).trim());
            }
            int len = 0;
            try { len = Integer.parseInt(req.headers.getOrDefault("content-length", "0")); } catch (NumberFormatException ignored) {}
            if (len > MAX_BODY) {
                reply(out, 413, error("Request too large", null));
                return;
            }
            if (len > 0) {
                req.body = new byte[len];
                int read = 0;
                while (read < len) {
                    int n = in.read(req.body, read, len - read);
                    if (n < 0) break;
                    read += n;
                }
            }
            CORS.set(corsHeaders(req));
            if (req.path.startsWith("/api/") && req.method.equals("OPTIONS")) preflight(req, out);
            else if (req.path.startsWith("/api/")) api(req, out);
            else if (req.method.equals("GET") || req.method.equals("HEAD")) serveStatic(req, out);
            else send(out, 405, "text/plain", "Method not allowed".getBytes(StandardCharsets.UTF_8), null);
            out.flush();
        } catch (IOException ignored) {
            // client went away (phone asleep, page closed...)
        }
    }

    private static String readLine(InputStream in) throws IOException {
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        int b;
        while ((b = in.read()) != -1) {
            if (b == '\n') break;
            if (b != '\r') buf.write(b);
            if (buf.size() > 16384) throw new IOException("header too long");
        }
        if (b == -1 && buf.size() == 0) return null;
        return new String(buf.toByteArray(), StandardCharsets.ISO_8859_1);
    }

    private static byte[] readAll(InputStream in) throws IOException {
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        byte[] chunk = new byte[16384];
        int n;
        while ((n = in.read(chunk)) > 0) buf.write(chunk, 0, n);
        return buf.toByteArray();
    }

    private static String reason(int status) {
        switch (status) {
            case 200: return "OK";
            case 400: return "Bad Request";
            case 401: return "Unauthorized";
            case 403: return "Forbidden";
            case 404: return "Not Found";
            case 405: return "Method Not Allowed";
            case 409: return "Conflict";
            case 413: return "Payload Too Large";
            default: return "Error";
        }
    }

    // ------------------------------------------------------------------ cross-origin (the apps join from their own page)

    /** CORS headers for the request this connection's thread is answering (see corsHeaders). */
    private static final ThreadLocal<Map<String, String>> CORS = new ThreadLocal<>();
    private static final String[] APP_ONLY = {"/api/local", "/api/presence", "/api/host", "/api/quit"};

    /** The party API answers pages from this device or the home network, never public websites;
     *  the app's private endpoints (its saved data, hosting, quitting) never do. */
    static Map<String, String> corsHeaders(Request req) {
        Map<String, String> h = new HashMap<>();
        if (req.path.equals("/api/info")) { h.put("Access-Control-Allow-Origin", "*"); return h; }
        if (!req.path.startsWith("/api/")) return h;
        for (String p : APP_ONLY) if (req.path.startsWith(p)) return h;
        String origin = req.headers.getOrDefault("origin", "");
        boolean local = origin.equals("null"); // a page opened from a file
        if (!local && !origin.isEmpty()) {
            try {
                String host = java.net.URI.create(origin).getHost();
                if (host != null) {
                    host = host.replace("[", "").replace("]", "");
                    local = host.equals("localhost") || host.equals("::1") || host.endsWith(".local")
                            || host.matches("(127|10)\\..*|192\\.168\\..*|172\\.(1[6-9]|2\\d|3[01])\\..*");
                }
            } catch (IllegalArgumentException ignored) {}
        }
        if (local) { h.put("Access-Control-Allow-Origin", origin); h.put("Vary", "Origin"); }
        return h;
    }

    /** CORS preflight for the party API. */
    private static void preflight(Request req, OutputStream out) throws IOException {
        Map<String, String> h = new HashMap<>();
        if (CORS.get() != null && CORS.get().containsKey("Access-Control-Allow-Origin")) {
            h.put("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
            h.put("Access-Control-Allow-Headers", "Content-Type, X-Player");
            h.put("Access-Control-Max-Age", "600");
            if (req.headers.containsKey("access-control-request-private-network")) h.put("Access-Control-Allow-Private-Network", "true");
        }
        send(out, 204, "text/plain", new byte[0], h);
    }

    private static String corsLines() {
        StringBuilder sb = new StringBuilder();
        if (CORS.get() != null) for (Map.Entry<String, String> e : CORS.get().entrySet()) sb.append(e.getKey()).append(": ").append(e.getValue()).append("\r\n");
        return sb.toString();
    }

    private static void send(OutputStream out, int status, String type, byte[] body, Map<String, String> extra) throws IOException {
        StringBuilder sb = new StringBuilder();
        sb.append("HTTP/1.0 ").append(status).append(' ').append(reason(status)).append("\r\n");
        sb.append("Content-Type: ").append(type).append("\r\n");
        sb.append("Content-Length: ").append(body.length).append("\r\n");
        sb.append("Cache-Control: no-cache\r\n");
        sb.append("Connection: close\r\n");
        Map<String, String> all = new HashMap<>();
        if (CORS.get() != null) all.putAll(CORS.get());
        if (extra != null) all.putAll(extra);
        for (Map.Entry<String, String> e : all.entrySet()) sb.append(e.getKey()).append(": ").append(e.getValue()).append("\r\n");
        sb.append("\r\n");
        out.write(sb.toString().getBytes(StandardCharsets.ISO_8859_1));
        out.write(body);
    }

    private static void reply(OutputStream out, int status, JSONObject data) throws IOException {
        send(out, status, "application/json; charset=utf-8", data.toString().getBytes(StandardCharsets.UTF_8), null);
    }

    private static JSONObject error(String message, JSONObject extra) {
        JSONObject o = new JSONObject();
        try {
            if (extra != null) {
                Iterator<String> it = extra.keys();
                while (it.hasNext()) {
                    String k = it.next();
                    o.put(k, extra.get(k));
                }
            }
            o.put("error", message);
        } catch (JSONException ignored) {}
        return o;
    }

    private void serveStatic(Request req, OutputStream out) throws IOException {
        String path = req.path.equals("/") ? "/index.html" : req.path;
        boolean allowed = false;
        for (String p : STATIC_PREFIXES) if (path.startsWith(p)) allowed = true;
        if (!allowed || path.contains("..")) {
            send(out, 404, "text/plain", "Not found".getBytes(StandardCharsets.UTF_8), null);
            return;
        }
        byte[] body;
        try (InputStream in = assets.open("www" + URLDecoder.decode(path, "UTF-8"))) {
            body = readAll(in);
        } catch (IOException e) {
            send(out, 404, "text/plain", "Not found".getBytes(StandardCharsets.UTF_8), null);
            return;
        }
        if (req.method.equals("HEAD")) {
            send(out, 200, contentType(path), new byte[0], null);
            return;
        }
        send(out, 200, contentType(path), body, null);
    }

    private static String contentType(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html")) return "text/html; charset=utf-8";
        if (p.endsWith(".js")) return "text/javascript; charset=utf-8";
        if (p.endsWith(".css")) return "text/css; charset=utf-8";
        if (p.endsWith(".json")) return "application/json; charset=utf-8";
        if (p.endsWith(".webmanifest")) return "application/manifest+json";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".ico")) return "image/x-icon";
        if (p.endsWith(".txt")) return "text/plain; charset=utf-8";
        return "application/octet-stream";
    }

    // ------------------------------------------------------------------ API

    private void api(Request req, OutputStream out) throws IOException {
        try {
            String token = req.token();
            // Document images load via <img>, which can't send the player header.
            boolean openImage = req.method.equals("GET") && req.path.startsWith("/api/images/");
            boolean shopPath = req.path.startsWith("/api/shops");
            boolean localPath = req.path.startsWith("/api/local"); // the phone's own data: app only, no player token
            if (token.isEmpty() && !openImage && !shopPath && !localPath && !Arrays.asList(NO_TOKEN).contains(req.path)) throw new ApiError(401, "Missing player token");
            List<String> parts = new ArrayList<>();
            for (String p : req.path.substring("/api/".length()).split("/")) if (!p.isEmpty()) parts.add(p);
            JSONObject result = route(req, parts, token, out);
            if (result != null) reply(out, 200, result);
        } catch (ApiError e) {
            reply(out, e.status, error(e.getMessage(), e.extra));
        } catch (TradeError e) {
            reply(out, 409, error(e.getMessage(), null));
        } catch (JSONException e) {
            reply(out, 400, error("Bad data: " + e.getMessage(), null));
        }
    }

    private JSONObject route(Request req, List<String> parts, String token, OutputStream out)
            throws ApiError, TradeError, JSONException, IOException {
        String m = req.method;
        String p0 = parts.isEmpty() ? "" : parts.get(0);

        if (m.equals("GET") && parts.equals(Collections.singletonList("info"))) {
            JSONObject info = new JSONObject();
            info.put("party", partyEnabled());
            info.put("desktop", true); // same role as the Windows app: this device can host
            info.put("android", true);
            info.put("isHost", req.fromApp);
            info.put("localStore", req.fromApp);
            info.put("hosting", partyEnabled());
            info.put("addresses", new JSONArray(lanAddresses()));
            info.put("port", lanPort > 0 ? lanPort : JSONObject.NULL);
            info.put("defaultPort", lanPort > 0 ? lanPort : DEFAULT_LAN_PORT);
            info.put("canManageShops", req.fromHostDevice());
            info.put("partyId", partyId);
            return info; // readable from any page (see corsHeaders): apps check an address before joining
        }
        if (p0.equals("shops")) return shopsApi(req, parts.subList(1, parts.size()), token);
        if (p0.equals("presence") || p0.equals("host") || p0.equals("quit")) {
            if (!req.fromApp) throw new ApiError(403, "Only the app on the hosting device can do that");
            if (m.equals("GET") && p0.equals("presence")) {
                presenceStream(out);
                return null;
            }
            if (m.equals("POST") && p0.equals("host")) {
                JSONObject body = req.json();
                if (body.optBoolean("enable")) {
                    int port = body.optInt("port", DEFAULT_LAN_PORT);
                    if (port < 1024 || port > 65535) throw new ApiError(400, "Pick a port between 1024 and 65535");
                    try {
                        startLan(port);
                    } catch (IOException e) {
                        throw new ApiError(409, "Port " + port + " is already in use - try another one");
                    }
                } else {
                    stopLan();
                }
                JSONObject r = new JSONObject();
                r.put("hosting", partyEnabled());
                return r;
            }
            if (m.equals("POST") && p0.equals("quit")) {
                stopLan();
                Listener l = listener;
                if (l != null) l.onQuit();
                JSONObject r = new JSONObject();
                r.put("ok", true);
                return r;
            }
        }
        // The phone's own data works whether or not a party is running.
        if (p0.equals("local")) return localApi(req, parts, out);
        if (!partyEnabled()) throw new ApiError(404, "No party is being hosted");
        if (p0.equals("images")) return images(req, parts, out, new File(dataFile.getParentFile(), "images"));

        if (m.equals("GET") && p0.equals("events") && parts.size() == 1) {
            eventStream(token, out);
            return null;
        }
        if (m.equals("POST") && p0.equals("leave") && parts.size() == 1) {
            // Leave party: close this player's live connection now, so they show as away at once.
            synchronized (lock) {
                Integer n = online.get(token);
                if (n != null && n > 0) {
                    leaving.add(token);
                    lock.notifyAll();
                }
            }
            JSONObject r = new JSONObject();
            r.put("ok", true);
            return r;
        }
        if (m.equals("GET") && p0.equals("state") && parts.size() == 1) {
            synchronized (lock) { return snapshot(token); }
        }

        if (p0.equals("characters")) {
            JSONObject body = (m.equals("POST") || m.equals("PUT")) ? req.json() : new JSONObject();
            synchronized (lock) {
                if (m.equals("POST") && parts.size() == 1) {
                    JSONObject c = body.optJSONObject("character");
                    if (c == null || c.optJSONArray("items") == null || c.optString("name").isEmpty()) throw new ApiError(400, "Invalid character");
                    String cid = c.optString("id");
                    if (cid.isEmpty() || characters.has(cid)) cid = newId("c");
                    c.put("id", cid);
                    c.put("owner", token);
                    c.put("rev", 1);
                    characters.put(cid, c);
                    changed(true);
                    JSONObject r = new JSONObject();
                    r.put("id", cid);
                    r.put("rev", 1);
                    return r;
                }
                JSONObject c = parts.size() > 1 ? characters.optJSONObject(parts.get(1)) : null;
                if (c == null) throw new ApiError(404, "No such character");
                if (m.equals("POST") && parts.size() == 3 && parts.get(2).equals("claim")) {
                    String owner = c.optString("owner");
                    Integer n = online.get(owner);
                    if (!owner.equals(token) && n != null && n > 0) {
                        throw new ApiError(409, c.optString("name") + " is being played on another device right now.");
                    }
                    c.put("owner", token);
                    c.put("rev", c.optLong("rev") + 1);
                    changed(true);
                    JSONObject r = new JSONObject();
                    r.put("rev", c.getLong("rev"));
                    return r;
                }
                if (m.equals("POST") && parts.size() == 3 && parts.get(2).equals("remove")) {
                    // The host clears out a player who has left: only while they're not connected.
                    if (!req.fromHostDevice()) throw new ApiError(403, "Only the host can remove players");
                    Integer n = online.get(c.optString("owner"));
                    if (n != null && n > 0) {
                        throw new ApiError(409, c.optString("name") + " is connected right now. Players can only be removed while they're away.");
                    }
                    String id = c.getString("id");
                    characters.remove(id);
                    for (int i = 0; i < trades.length(); i++) {
                        JSONObject t = trades.getJSONObject(i);
                        if ("pending".equals(t.optString("status")) && (id.equals(t.optString("from")) || id.equals(t.optString("to")))) {
                            resolve(t, "cancelled", c.optString("name") + " was removed from the party.");
                            i = -1; // resolve() rebuilt the list
                        }
                    }
                    changed(true);
                    JSONObject r = new JSONObject();
                    r.put("ok", true);
                    return r;
                }
                if (!c.optString("owner").equals(token)) throw new ApiError(403, "That character belongs to someone else.");
                if (m.equals("PUT") && parts.size() == 2) {
                    if (!body.has("baseRev") || body.optLong("baseRev", -1) != c.optLong("rev")) {
                        JSONObject extra = new JSONObject();
                        extra.put("character", publicChar(c, token));
                        throw new ApiError(409, "Out of date", extra);
                    }
                    JSONObject nc = body.optJSONObject("character");
                    if (nc == null || nc.optJSONArray("items") == null) throw new ApiError(400, "Invalid character");
                    nc.put("id", c.getString("id"));
                    nc.put("owner", token);
                    nc.put("rev", c.optLong("rev") + 1);
                    characters.put(c.getString("id"), nc);
                    changed(true);
                    JSONObject r = new JSONObject();
                    r.put("rev", nc.getLong("rev"));
                    return r;
                }
                if (m.equals("DELETE") && parts.size() == 2) {
                    String id = c.getString("id");
                    characters.remove(id);
                    for (int i = 0; i < trades.length(); i++) {
                        JSONObject t = trades.getJSONObject(i);
                        if ("pending".equals(t.optString("status")) && (id.equals(t.optString("from")) || id.equals(t.optString("to")))) {
                            resolve(t, "cancelled", c.optString("name") + " left the party.");
                            i = -1; // resolve() rebuilt the list
                        }
                    }
                    changed(true);
                    JSONObject r = new JSONObject();
                    r.put("ok", true);
                    return r;
                }
            }
        }

        if (p0.equals("trades")) {
            JSONObject body = m.equals("POST") ? req.json() : new JSONObject();
            synchronized (lock) {
                if (m.equals("POST") && parts.size() == 1) {
                    JSONObject a = characters.optJSONObject(body.optString("from"));
                    JSONObject b = characters.optJSONObject(body.optString("to"));
                    if (a == null || !a.optString("owner").equals(token)) throw new ApiError(403, "You can only trade from your own character.");
                    if (b == null || b == a) throw new ApiError(400, "Pick someone else to trade with.");
                    JSONObject give = cleanSide(a, body.optJSONObject("give"));
                    JSONObject ask = cleanSide(b, body.optJSONObject("ask"));
                    if (give.getJSONArray("items").length() == 0 && give.getJSONObject("coins").length() == 0
                            && ask.getJSONArray("items").length() == 0 && ask.getJSONObject("coins").length() == 0) {
                        throw new ApiError(400, "The offer is empty.");
                    }
                    checkSide(a, give);
                    JSONObject trade = new JSONObject();
                    trade.put("id", newId("t"));
                    trade.put("from", a.getString("id"));
                    trade.put("to", b.getString("id"));
                    trade.put("fromName", a.optString("name"));
                    trade.put("toName", b.optString("name"));
                    trade.put("give", give);
                    trade.put("ask", ask);
                    String note = body.optString("note", "");
                    trade.put("note", note.length() > 500 ? note.substring(0, 500) : note);
                    trade.put("status", "pending");
                    trade.put("created", System.currentTimeMillis() / 1000.0);
                    JSONArray next = new JSONArray();
                    next.put(trade);
                    for (int i = 0; i < trades.length(); i++) next.put(trades.get(i));
                    trades = next;
                    changed(true);
                    JSONObject r = new JSONObject();
                    r.put("id", trade.getString("id"));
                    return r;
                }
                JSONObject trade = null;
                if (parts.size() == 3) {
                    for (int i = 0; i < trades.length(); i++) {
                        if (trades.getJSONObject(i).optString("id").equals(parts.get(1))) trade = trades.getJSONObject(i);
                    }
                }
                if (trade == null || !m.equals("POST")) throw new ApiError(404, "No such trade");
                if (!"pending".equals(trade.optString("status"))) throw new ApiError(409, "That trade is already closed.");
                String action = parts.get(2);
                String side = action.equals("cancel") ? "from" : "to";
                JSONObject sideChar = characters.optJSONObject(trade.optString(side));
                String owner = sideChar == null ? null : sideChar.optString("owner");
                if (!token.equals(owner) || !Arrays.asList("accept", "decline", "cancel").contains(action)) {
                    throw new ApiError(403, "Not your trade to " + action);
                }
                if (action.equals("accept")) {
                    try {
                        execute(trade);
                    } catch (TradeError e) {
                        resolve(trade, "failed", e.getMessage());
                        changed(true);
                        throw e;
                    }
                    resolve(trade, "accepted", null);
                } else {
                    resolve(trade, action.equals("decline") ? "declined" : "cancelled", null);
                }
                changed(true);
                JSONObject r = new JSONObject();
                r.put("ok", true);
                return r;
            }
        }
        throw new ApiError(404, "Unknown endpoint");
    }

    // ------------------------------------------------------------------ document images

    /** The data really is the image type it claims (checks the file signature). */
    static boolean imageBytesMatch(byte[] b, String mime) {
        switch (mime) {
            case "image/png": return b.length > 8 && (b[0] & 0xff) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G';
            case "image/jpeg": return b.length > 3 && (b[0] & 0xff) == 0xff && (b[1] & 0xff) == 0xd8 && (b[2] & 0xff) == 0xff;
            case "image/gif": return b.length > 6 && b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8';
            case "image/webp": return b.length > 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                    && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P';
            default: return false;
        }
    }

    /** Images used in documents: the party's (party-data/images) or this phone's own (my-data/images), as <id>.<ext>. */
    private JSONObject images(Request req, List<String> parts, OutputStream out, File folder) throws ApiError, IOException {
        if (req.method.equals("POST") && parts.size() == 1) {
            JSONObject body = req.json();
            String id = body.optString("id"), data = body.optString("data");
            java.util.regex.Matcher m = DATA_URL.matcher(data);
            String ext = null;
            if (m.matches()) for (String[] t : IMAGE_TYPES) if (t[0].equals(m.group(1))) ext = t[1];
            if (!IMAGE_ID.matcher(id).matches() || ext == null) throw new ApiError(400, "Not a supported image");
            byte[] raw;
            try {
                raw = Base64.decode(m.group(2), Base64.DEFAULT);
            } catch (IllegalArgumentException e) {
                throw new ApiError(400, "Not a supported image");
            }
            if (raw.length > MAX_IMAGE_BYTES) throw new ApiError(413, "Image is too large");
            if (!imageBytesMatch(raw, m.group(1))) throw new ApiError(400, "Not a supported image");
            folder.mkdirs();
            synchronized (lock) { // first upload wins; ids are random per image
                boolean exists = false;
                for (String[] t : IMAGE_TYPES) if (new File(folder, id + "." + t[1]).exists()) exists = true;
                if (!exists) {
                    try (OutputStream f = new FileOutputStream(new File(folder, id + "." + ext))) { f.write(raw); }
                }
            }
            JSONObject r = new JSONObject();
            try { r.put("ok", true); } catch (JSONException ignored) {}
            return r;
        }
        if (req.method.equals("GET") && parts.size() == 2 && IMAGE_ID.matcher(parts.get(1)).matches()) {
            for (String[] t : IMAGE_TYPES) {
                File f = new File(folder, parts.get(1) + "." + t[1]);
                if (f.exists()) {
                    byte[] raw;
                    try (InputStream in = new java.io.FileInputStream(f)) { raw = readAll(in); }
                    Map<String, String> extra = new HashMap<>();
                    extra.put("X-Content-Type-Options", "nosniff");
                    send(out, 200, t[0], raw, extra);
                    return null;
                }
            }
            throw new ApiError(404, "No such image");
        }
        throw new ApiError(404, "Unknown endpoint");
    }

    // ------------------------------------------------------------------ live updates (Server-Sent Events)

    private static void startStream(OutputStream out) throws IOException {
        String head = "HTTP/1.0 200 OK\r\nContent-Type: text/event-stream\r\nCache-Control: no-cache\r\nConnection: close\r\n" + corsLines() + "\r\n";
        out.write(head.getBytes(StandardCharsets.ISO_8859_1));
        out.flush();
    }

    /** Tokens whose player chose Leave party: their live connections close now. */
    private final Set<String> leaving = new HashSet<>();

    private void eventStream(String token, OutputStream out) throws IOException, JSONException {
        startStream(out);
        synchronized (lock) {
            online.put(token, online.getOrDefault(token, 0) + 1);
            changed(false);
        }
        long last = -1;
        try {
            while (true) {
                String data = null;
                synchronized (lock) {
                    if (!partyEnabled() || leaving.contains(token)) break; // the host stopped the party, or this player left it
                    if (version == last) {
                        try { lock.wait(15000); } catch (InterruptedException e) { break; }
                    }
                    if (leaving.contains(token)) break;
                    if (version != last) {
                        last = version;
                        data = snapshot(token).toString();
                    }
                }
                String msg = data != null ? "event: state\ndata: " + data + "\n\n" : ": ping\n\n";
                out.write(msg.getBytes(StandardCharsets.UTF_8));
                out.flush();
            }
        } finally {
            synchronized (lock) {
                int n = online.getOrDefault(token, 1) - 1;
                online.put(token, n);
                if (n <= 0) leaving.remove(token);
                changed(false);
            }
        }
    }

    /** Kept open by the app's page (the desktop app uses it to know when to quit; here it's just a heartbeat). */
    private void presenceStream(OutputStream out) throws IOException {
        startStream(out);
        while (true) {
            out.write(": ping\n\n".getBytes(StandardCharsets.UTF_8));
            out.flush();
            try { Thread.sleep(5000); } catch (InterruptedException e) { return; }
        }
    }
}
