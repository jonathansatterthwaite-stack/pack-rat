# Parked: installing Pack Rat on players' devices

Snapshot of the app-install work, taken out on 2026-09-26 to keep the party version simple.
None of these files are used by the app. They are full copies of the files as they were
while the feature was in, so you can compare them with the live files or copy pieces back.

What it did:

- **Add to Home Screen guide**: a one-time "Put Pack Rat on this device" banner after
  joining, plus Settings → Install, with steps for each phone and browser
  (`installSteps`, `installBanner`, `installSection`, `openInstall` in `party-ui.js`).
- **HTTPS for full installs**: the host made its own certificate authority, limited to
  private network addresses (`certs.py`), and served HTTPS on the next port up
  (`make_secure_server` / `start_secure` / `send_ca` in `server.py`).
  - Players downloaded `/packrat-ca.crt` and trusted it once (`certSteps` /
    `openSecureSetup` in `party-ui.js`).
  - After that, the plain-HTTP page detected the trust and moved to HTTPS, carrying the
    player's identity in the URL fragment (`secureReachable` / `goSecure` / `takeHandoff`
    in `party.js`).
  - Needs `pip install cryptography`, which the exe build also bundled.

Status when parked: the server side was verified (certificate chain, name constraints
rejecting public names, and the exe serving HTTPS). The in-browser flow was tested up to
the "not trusted yet" state. It was never tried on a real phone after trusting the
certificate.
