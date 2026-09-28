# Pack Rat — RPG Inventory Manager

A D&D 5e inventory manager that runs in any browser, on PC and phone. It's static HTML/CSS/JS with no build step. On its own it saves data in the browser; with the optional party server, everyone on your network gets their own inventory and can trade.

**Download:** [Windows app](https://github.com/jonathansatterthwaite-stack/pack-rat/releases/latest/download/PackRat.exe) · [Android app](https://github.com/jonathansatterthwaite-stack/pack-rat/releases/latest/download/PackRat.apk) · [Use it in your browser](https://jonathansatterthwaite-stack.github.io/pack-rat/app/) · [All releases](https://github.com/jonathansatterthwaite-stack/pack-rat/releases)

## Features

- **Character panel** at the top of the inventory (Armor Class, weight carried, coins, abilities). It collapses to a single line with the coins (tap them to open the coin purse) and the pounds carried out of your capacity. Add items from the **Catalog** tab, or make one with **New custom item** there.
- **Player mode** (Settings): hides the Catalog and Custom tabs and item editing, for players whose gear comes from the DM, shops and trades. In any mode, an item's details have a **Display name** box: a name of your own for that copy (e.g. *Dawnbringer* for a longsword), shown everywhere instead of the item's name.
- **Writing**: paper, parchment, books, journals and documents can be written in (**Write in it** in their details, or the pencil on their row), and read like documents once there's something written. Writing on one sheet of a stack takes it off the stack. Any item can be made writable with the *Writing* feature, or be just an image with the *Picture* feature (viewed full screen with zoom).
- **Catalog** of the core equipment: weapons, armor, ammunition, adventuring gear, containers, equipment packs, tools, poisons and trade goods (234 items from the System Reference Document 5.1). A copy built from source can also include tool activity DCs, gemstones and the trinket table (see [Updating the item data](#updating-the-item-data)).
- **Multiple characters**, each with their own inventory, coins, STR and DEX.
- **Groups**: the filters and catalog tabs group related types. **Gear & Tools** (adventuring gear, tools and equipment packs); **Consumables** (potions & supplies, ammunition and poisons); **Treasure & Trinkets** (gemstones, trade goods, other valuables and trinkets); plus Weapons, Armor, Containers, Magic Items and Documents. Picking a group shows a second row of shaded chips to narrow it to one subcategory (e.g. just Tools, or just Heavy armor). Each item keeps its own type, so ammunition bundles, tool activities and poison save DCs work as before. The shop editor's sell rates, the shop stock picker, the template list and the base-type choice all use the same groups.
  - Some catalog items were in the wrong place and have moved: Acid, Alchemist's Fire, Antitoxin, Holy Water, Oil and Potion of Healing are now consumables (Rations too, as Food), and Basic Poison is a poison. Copies already in inventories (and solo shops) are updated when the app loads; a party host's shops are updated the next time the host edits and saves them.
- **Split and combine stacks**: in an item's details, **Split stack** divides it (choose how many with a number or slider, and where the new stack goes; a quiver or case that only has room for part takes what fits). Identical stacks in the same place can be joined again with **Combine**.
- **Tile view**: square tiles showing each item's colour, its icon and its name over the icon, with small labels sitting across the top and bottom edges: worth on the left of the top edge, weight on the right (both including what's inside, for containers), and along the bottom the stack count or, for a container, how full it is (e.g. 16/30 lb, 15/20, 2.5/4 pt). The worth and weight labels can be switched off with the two toggle buttons next to the layout switch. Long names shrink to fit. The inventory and the catalog each remember their own layout and label settings.
- **Containers**: put items in backpacks and chests (nested containers work too). A container is listed as an item wherever it's carried ("On person", or inside another container), showing what's in it, and has its own section below with its contents. Sections (and "On person") can be collapsed, and the ↑ ↓ buttons on a container's section put them in whatever order you like; the order is saved with the character. Drag and drop on desktop, or use *Location* in an item's details on a phone. Shows each container's load against its capacity. Weightless containers (e.g. Bag of Holding) are supported.
  - A faint tint fills each container's heading and row as it fills up, and turns red when it is over capacity. On tiles it's a gauge set just inside the tile: its outline marks "full" and the tint rises inside it, so fullness reads at a glance.
  - **Cases and quivers** take only their own kind of thing, counted: the map/scroll case holds 10 rolled-up sheets of paper (parchment counts double) or maps, letters, notes and scrolls; the quiver holds 20 arrows; the bolt case holds 20 bolts. Moving a bigger stack in moves only what fits. Custom containers can do the same.
  - **Liquid containers** (waterskin, flask, vial, bottle, jug, pot, bucket, barrel) record what is in them and how much, with a slider and Empty/Fill buttons, in the item's details.
  - **Sets** (a deck of cards, a chess set, any item with the *Set* feature) hold their pieces as separate items without appearing as containers in the inventory. Each piece has a name and, optionally, a picture (a real card face, say): **Add from pictures…** makes a piece from each picture you pick, so a whole deck's faces can be added at once, and **Paste a list…** adds names. Name what one piece is called (card, piece, tile…). The set's details list the pieces to **Take out**, or **Take all out**.
    - **Drawing** (**Draw a card**, or **Take one at random** for other sets) opens a window of its own. The first piece fills it; each further draw shrinks them all to share the space (side by side, 2×2, 3×3…, whichever suits their shape, e.g. portrait cards), and once they'd get too small the window scrolls instead. **Keep** leaves the drawn pieces in the inventory where the set is (so does closing the window), **Put back** returns them all, and each piece has its own put-back button.
    - Taken-out pieces are ordinary items; put them back from a piece's details (**Put back in the …**). Sets don't stack, sell with their pieces still in them, and trade with them.
- **Combat panel** (collapsible, above the inventory): each equipped weapon with its to-hit bonus, damage (and two-handed damage for versatile weapons), reach or range, the ability used, and property notes with their rules. Off-hand damage appears for light weapons. Ranged weapons show their ammunition and where it is (quiver first), with buttons to use or recover one. Also shows an unarmed strike. Set the proficiency bonus and simple/martial proficiency there. With nothing equipped, it shows every weapon carried.
- **Rules math**: AC from worn armor, shield and Dex; carried weight versus STR × 15 (or variant encumbrance); coin weight; attunement count; warnings for Strength requirements and stealth disadvantage.
- **Coins**: buy items with automatic change-making, sell at any percentage, and gain, spend, or consolidate coins.
- **Equipment packs**: open a pack to plan its unpacking: tick the items you want, change how many, and choose where each goes (inside the pack's backpack or chest, strapped outside, or on person). By default everything goes in the pack's container, with bedrolls, blankets, rope, tents and the like strapped to a backpack's side. You can pack into a container you already carry instead, add the pack as a single item (and unpack it later from its details, the same way), and optionally pay for it. Make your own packs with the **Equipment Pack** template (or **Customize** a catalog pack): list its items, how many, and where each goes ("Auto" follows the defaults).
- **Trinket roller** for every trinket table (in builds that include them).
- **Drawn icons** (new, experimental): when editing a custom item, **Draw…** next to its icon opens an icon editor ([svg-lay-tool](https://github.com/jonathansatterthwaite-stack/Svg-lay-tool)): build the icon from shapes on layers, pick layers in the strip beside the canvas, press and hold a shape to move it, and add modifiers (outlines, effects, masks that cut the layers below). It's drawn in one colour, and the app tints it with the item's colour like its built-in icons. The editor is loaded only when you open it.
  - **Live drawings**: in the editor's **Variables** tab, bind a layer's position, size, rotation, visibility or a modifier to a formula. The tab lists the values the app fills in for each item in an inventory, under **Pack Rat item** (with a copy's real values when you edit its drawing from the inventory): `fill` (how full a container or its liquid is, 0–1), `used` and `capacity`, `qty`, `charges` and `maxCharges`, `pieces` and `piecesTotal` (a set's pieces left and in all), `equipped`, `attuned`, `worth` (gp) and `weight` (lb). A jar's water can rise as it fills, a quiver empty as arrows are used, a wand dim as charges run out. The time is always available too (`hours12`, `minutes`, `seconds`, `time`…), so a clock icon keeps the real time. Live icons are redrawn from their item's values (the catalog and the library show the drawing's own slider values), and ones that use the time keep ticking while they're on screen.
  - **GM values**: a variable you add to a drawing whose name starts with `gm_` (e.g. `gm_curse`, how cursed a blade is) is set by the GM. Formula names can only be letters, digits and underscores, so the `gm_` prefix keeps them apart from the drawing's own variables and Pack Rat's values. In a party, the host gets a **GM values** tab on the Party screen: each `gm_` value in use, then the players whose items use it, then those items, as a collapsible list. Set a value for everyone, for a player, or for one item: each item uses the most specific one (its own, else its player's, else the party's, else the drawing's slider value), and every player's icons update straight away. The host keeps them with the party (`gm` in party.json; `POST /api/gm`, host only).
  - **Drawings library** (Custom tab → **Drawings**): every drawing is kept to use again. Give one to any item from its icon's **Choose…** (drawings come first), **Edit** one (the items using it update too; editing from one item that shares it asks whether to change it everywhere or just there), **Use as template** to start a new drawing from a copy (or **Start from…** in the editor), rename or delete (items keep their icon). Items carry their own copy of the drawing, so they trade, sell and export with it.
- **Item images**: any item can have an image (*Image* when editing it), shown in place of its icon in lists, tiles and its details, e.g. a portrait, a playing card's face. In a party, images go to the host with the item, so other players see them too.
- **Item icons**: every item gets a fitting icon automatically (Longsword → sword, Rope → coil of rope, Lute → lute, and so on), tinted with its type's colour. You can pick any of 221 icons for custom items, or for a single copy in an inventory (**Change icon** in its details).
- **Documents**: letters, notes, books, journals, scrolls and maps, written in Markdown (headings, **bold**, *italic*, lists, quotes, tables, links) with a formatting toolbar and live preview. They open in a full-screen reader with adjustable text size. Tap **Read** in a document's details, or the book button on its row.
  - **Just a picture**: any item with the *Picture* feature (maps, handouts, portraits) is just an image. It then opens full screen on a dark background, fitted to the screen. Zoom with the buttons, the mouse wheel, a double-click or a pinch, and drag to look around. Several pictures page left and right.
  - **Add image** uploads a picture (for example a map) into the text. Large photos are shrunk to at most 2048 px. Tap an image in the reader to view it full size.
  - Images are kept in the browser's database (IndexedDB), not inside the item, so maps don't fill up storage or slow down party syncing. In a party they're uploaded to the host once, so a traded document still shows its map on the other player's device. Exports include them.
  - Documents come from other players too, so Markdown is sanitised: no scripts, and no images from other websites.
- **Shops**: the host (e.g. the DM) creates shops, each with a name, shopkeeper, description, sign icon and a % price adjustment, and stocks them from the catalog, including custom items. Each item can have its own price and an optional limited stock. Shops can be opened or closed.
  - In a party, players see the **open** shops on their own devices and buy with their character's coins. The host handles each sale in one step: it checks the shop is open, the stock and the coins (with change), then hands over the item. Two players can't buy the same last potion, and stock updates live for everyone.
  - **Selling to shops**: a shop can also buy from players. The host sets a default offer (% of list price), a % for each item type (0% means it won't buy that kind of item), and rules for specific items: their own %, or a fixed price, such as 2 gp per wolf pelt even though pelts have no list value. The most specific rule wins. Players tap **Sell items**, see the offer for everything they carry, and sell. In a party, the host checks the item and pays out. Containers must be emptied first.
  - **Stockroom**: items players sell go to the shop's stockroom, not straight onto the shelf. Only the host sees it. From there the host can **put items on the shelf** (adding to a matching item's stock, or as a new item at a price they choose) or **throw them out**.
  - **Funds**: each shop has a till. It's unlimited by default. Give it an amount and sales to players fill it, and buying from players empties it. A shop won't buy what it can't pay for, and players see "can't afford it" in the sell list.
  - **Small change**: coins are universal, but shopkeepers don't always pay in the biggest coins. The *small change margin* (10% by default, 0 to 50%) is the share of every payout, whether money for items or change, given in the next smaller coins. At 10%, selling for 9 gp pays 8 gp and 10 sp, and 5 sp of change comes as 4 sp and 10 cp. Set it to 0% for largest-coins-only.
  - Shops are kept with the host (in `party-data`), so you can prepare them before a session. Solo, you can buy from your own shops too. The plain web version keeps shops in the browser.
- **Custom items** built from **templates**. The built-in templates are Weapon, Armor, Adventuring Gear, Tool, Consumable, Ammunition, Poison, Container, Magic Item, Treasure, Trinket and Document, shown in their groups. You can make your own templates (e.g. *Firearm*, *Spell Scroll*) that extend a base type with extra text, number, yes/no, choice, tag or dice fields.
  - **Features**: when editing any item, the collapsible **Features** panel (above the description) lists what it can do, whatever its type: **Container** (capacity, straps, counted contents…), **Liquid**, **Set**, **Pack** (its contents), **Writing** (author and text), **Picture** (just an image), **Charges**, **Attunement**, **Armor bonus** (AC while worn) and **Bundle**. Each feature's settings only show while it's ticked, so a sword doesn't show container settings, and a custom pouch or book can have them. Closed, the panel lists the ticked features. Items start with the features their kind usually has.
  - **Colours**: every group and every custom template has its own hue. Pick it with the rainbow slider or quick swatches: for a built-in group use **Colour** on its tile under Custom → Templates, and for your templates use the template editor. Subcategories are shades of that hue, arranged so neighbours contrast (light next to dark, strong next to soft, with a slight lean of hue) rather than forming a gradient, so items in the same group are easy to tell apart: the types in a combined group (Gear / Tools), or the categories of a single type (Light, Medium, Heavy armor and Shields). Group colours are saved per device.
- Any catalog item can be **customized** into a custom copy (e.g. a +1 longsword), and each inventory copy can be edited on its own.
- **Undo** for destructive actions, and **export/import** as JSON, either all data or a single character.
- **Party mode**: host a server on your local network so each player has their own inventory and can trade items and coins (see below).
- **Installable PWA**: works offline after the first load.

## Desktop app (Windows)

`dist/PackRat.exe` is a single file: copy it anywhere and double-click it. It opens Pack Rat in its own window (using the Edge that comes with Windows, or Chrome) and needs nothing else installed. Closing the window closes the app.

**One set of data per PC.** Your characters, custom items, templates, settings, party identity and document images are saved in `%APPDATA%\PackRat\my-data`, not in a browser. Every Pack Rat window on the PC uses that folder: the app's own window, any browser at `http://localhost:47651` while the app is running, and the host address (`http://192.168.x.x:8765`) opened on the same PC. They all show the same characters and update live when one changes. Other devices keep their own data, and only this PC can read the folder. Back it up to keep your characters safe. The phone app works the same way: its data is kept in a file in the app's own storage, so it doesn't depend on the address the app opens on. Use Export/Import to move characters between devices.

**Finding saved data.** A copy of Pack Rat that opens with nothing saved (for example the web app opened from a file, or from a different address) checks whether the Windows or phone app is running on the same device. If it is, a banner offers to open it, since that's where your characters are. The empty inventory also offers to import a backup.

The first time a window opens with this version, the characters it had saved before are merged into the folder. Nothing is overwritten, and the window's old copy is left in place as a backup.

To play together, go to **Settings → Host a party → Start hosting**. The app shows an address, like `http://192.168.1.27:8765`, for everyone else on your Wi-Fi to open in their browser. **Stop hosting** or quitting ends the party, and everyone's inventory stays saved for next time. The first time you host, Windows asks whether Pack Rat may use the network: allow it on private networks.

Windows SmartScreen or antivirus may warn about the exe the first time, because it isn't code-signed. Choose **More info → Run anyway** if you trust the build.

To rebuild it after changing the app:

```bash
python -m pip install pyinstaller pillow
python tools/build_exe.py
```

## Android app

`dist/PackRat.apk` is Pack Rat for Android 7.0 or newer. It works like the Windows app:

- **Solo**: your own offline inventory on the phone. No host needed.
- **Host a party**: go to **Settings → Host a party → Start hosting**. The phone runs the party server, and other players on the same Wi-Fi, or connected to the phone's hotspot, join at the address and QR code shown. A notification stays up while hosting, with a **Stop hosting** button. Keep Pack Rat running; it keeps serving with the screen off.
- **Join someone else's party**: go to **Settings → Join someone else's party** and type the address from the host's Party tab, or tap **Scan QR code** and point the camera at the host's QR code (or pick a photo or screenshot of it, for PCs without a camera). The app stays on its own page and your own saved characters: choose which one to play. It reconnects to that party whenever the app opens (if the host isn't up yet, it keeps checking and reconnects when it is), until you choose **Leave party** (Party tab or Settings).

To install it, copy the APK to the phone and open it. Allow "Install unknown apps" for the app you opened it with, such as Files or Chrome. Google Play Protect may warn because the app isn't from the Play Store.

To rebuild it (no Android Studio needed):

```bash
python tools/build_apk.py
```

This needs a JDK 17 and the Android SDK command-line tools (`platforms;android-34`, `build-tools;34.0.0`) in `../android-toolchain`, or set `PACKRAT_ANDROID_TOOLCHAIN`. The APK is signed with `android/keystore/`. **Back up that folder and keep it private.** Android only installs updates signed with the same key, so losing it means uninstalling (and losing phone data) to update.

## Running it from source

On a PC, open `index.html` directly, or serve the folder (needed for offline/install support):

```bash
python -m http.server 8765
```

Then browse to http://localhost:8765.

**On a phone:** to install it to the home screen and use it offline, the app has to be served over HTTPS. The easiest way is to push this folder to a GitHub repo and turn on GitHub Pages. Netlify Drop or Cloudflare Pages also work. To try it on the same Wi-Fi without installing, run `python -m http.server 8765 --bind 0.0.0.0` and open `http://<your-PC-IP>:8765` on the phone.

Each device keeps its own data. Use **Settings → Export / Import** to move a character between devices.

## Party mode (play together on your network)

The easiest way is the desktop app's **Start hosting** button (see above). Without the exe, on the computer that will host the party, double-click `start-party.bat`, or run:

```bash
python server.py
```

It prints the address to share, for example:

```
  Players on your network join at:
      http://192.168.1.27:8765
```

Everyone on the same Wi-Fi/LAN opens that address in a browser, or scans the QR code shown with it on the **Party** tab and under **Settings**. New players are asked for their character's name as soon as they join. The first time you run it, Windows may ask whether Python can use the network: allow it on **private** networks.

- **Characters live on your device.** Joining a party means choosing which of your characters to play (or making a new one). The host keeps a live copy so everyone can see and trade with it: every change, yours or from a trade or a shop, updates both the copy on your device and the host's. You can bring several characters, and switch between them from the character menu.
- **Leaving and coming back**: when you leave (or just close the app), your character stays in the party, and your device keeps its own up-to-date copy. When you rejoin, whichever copy changed in the meantime is used — for example a trade that completed after you left. If both changed, the app asks which version to keep.
- **Taking over**: a party character that isn't open anywhere else can be taken over from another device (useful when switching devices); it's saved on that device from then on.
- **Your own inventory**: only the device playing a character can change it. Changes sync to the host immediately.
- **Trading**: open **Party → Trade**, or use **Trade** in an item's details. Pick what you give (items and coins) and what you want back; each side has a search box (by name, category, or the container an item is in), and items you've picked stay listed while you search. The other player gets the offer live and can accept or decline. The server checks both sides still have everything and swaps it all at once. Giving a container gives what's inside and strapped to it too.
- **Removing players**: the host can remove a player who isn't connected, using the bin button on their card in the Party tab. The host is whoever runs the party, on that device. Removing takes the character out of the party and cancels any trades waiting on them; the player's own device keeps its copy (the dialog can also download a backup). Connected players can't be removed. A removed player can play the character again by rejoining.
- **Party members**: you can see who's online and look through other players' inventories.
- **Saving**: the party is saved on the host in `party-data/party.json` (document images in `party-data/images/`), so stopping and restarting the server keeps everything. Delete that folder to start a fresh party.
- To use a different port, run `python server.py 9000`.

There are no passwords, so only run the server on a network you trust. Custom items, templates and display settings stay in each player's own browser.

## Updating the item data

```bash
python tools/build_srd.py            # uses cached pages in tools/.cache
python tools/build_srd.py --refresh  # re-download from dnd5e.wikidot.com
```

This regenerates `js/srd-data.js` with everything the wiki pages list, for your own use. The public release uses only System Reference Document 5.1 content: `python tools/build_srd.py --srd-only OUT` writes that version (no trinkets, gemstones, setting-specific games or tool activities). After changing app files, bump `VERSION` in `sw.js` so installed copies refresh their offline cache.

## Publishing a release

```bash
python tools/publish.py            # stage, build and push; the site redeploys
python tools/publish.py --release  # also build PackRat.exe and PackRat.apk and publish them as a GitHub release
python tools/publish.py --release --title "BIG CHANGE: …" --notes notes.md  # with a title and notes of its own
```

`tools/publish.py` copies the project into `../pack-rat` (a clone of the GitHub repository) without private or local files (the signing keystore, `dist/`, caches), swaps in the SRD-only item data, commits and pushes. GitHub Actions then deploys the download page (`site/index.html`) and the web app (at `/app/`) to GitHub Pages. With `--release` it builds the exe and APK from that SRD-only copy (signed with the same keystore, which is copied in but never committed) and uploads them to a new release, so the download links always point at the latest version.

## Files

| Path | What it is |
|---|---|
| `index.html` | App shell |
| `css/app.css` | Styles (light/dark theme, phone layout under 720px) |
| `js/srd-data.js` | Generated item data |
| `js/templates.js` | Item templates, field definitions and colours (hues and shades) |
| `js/store.js` | State, persistence and rules (weight, AC, coins) |
| `js/app.js` | UI views and modals |
| `js/party.js`, `js/party-ui.js` | Party mode: syncing with the server, joining, trading |
| `server.py`, `start-party.bat` | Party server (Python standard library only) |
| `desktop.py` | Desktop launcher, the entry point of `PackRat.exe` |
| `tools/build_exe.py` | Builds `dist/PackRat.exe` with PyInstaller |
| `android/` | Android app: `src/` (WebView activity, Java port of the party server, hosting service), `res/`, manifest, signing `keystore/` |
| `tools/build_apk.py` | Builds `dist/PackRat.apk` with the Android SDK build tools (no Gradle) |
| `parked/app-install/` | Shelved code for installing Pack Rat on players' devices (HTTPS + home-screen guide). Not used; see its README |
| `js/vendor/qrcode.min.js` | QR code generator ([kazuhikoarase/qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator), MIT) |
| `js/vendor/svg-lay-tool.js` | Icon editor for drawn icons ([Svg-lay-tool](https://github.com/jonathansatterthwaite-stack/Svg-lay-tool), MIT), built from its repository with `npm run build` and loaded only when drawing |
| `js/vendor/jsQR.js` | QR code reader for scanning a host's join code ([cozmo/jsQR](https://github.com/cozmo/jsQR), Apache-2.0), loaded only when scanning |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA support |
| `js/shops.js` | Shops: list, counter, buying, selling, stockroom, host's shop editor |
| `js/documents.js` | Documents: Markdown rendering, reader, editor, image store |
| `js/vendor/marked.min.js`, `purify.min.js` | Markdown parser ([marked](https://github.com/markedjs/marked), MIT) and HTML sanitiser ([DOMPurify](https://github.com/cure53/DOMPurify), Apache-2.0/MPL-2.0) |
| `js/icons-data.js`, `js/icons.js` | Item icons (generated) and the automatic-icon rules and picker |
| `tools/build_icons.py` | Builds `js/icons-data.js` from a curated list of game-icons.net icons |
| `tools/build_srd.py` | Scraper/parser for the wiki tables |
| `tools/publish.py` | Stages the public repository and publishes releases (see above) |
| `site/index.html` | The download page on GitHub Pages |
| `.github/workflows/pages.yml` | Deploys the download page and the web app to GitHub Pages |

This work includes material from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License (https://creativecommons.org/licenses/by/4.0/legalcode). Item tables were parsed from dnd5e.wikidot.com (CC BY-SA 3.0). The icon editor is [svg-lay-tool](https://github.com/jonathansatterthwaite-stack/Svg-lay-tool) (MIT). Item icons are from [game-icons.net](https://game-icons.net) by Lorc, Delapouite, Carl Olsen, DarkZaitzev, Faithtoken, John Redman, Lucas, Sbed, Skoll, Willdabeast and Zajkonur, under CC BY 3.0. This is an unofficial fan tool, not affiliated with or endorsed by Wizards of the Coast.
