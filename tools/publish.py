"""Publish Pack Rat to its public GitHub repository.

    python tools/publish.py [-m MESSAGE]   stage, commit and push (the Pages site redeploys)
    python tools/publish.py --release      ...then build PackRat.exe and PackRat.apk and publish a release
        [--title TEXT]                     added to the release's title (e.g. "BIG CHANGE: drawn icons")
        [--notes FILE]                     Markdown shown at the top of the release notes

The public copy lives in ../pack-rat, a clone of the repository. It gets the
project's files minus private and local ones (the signing keystore, dist/,
caches, party data), with the item data rebuilt as SRD 5.1 content only.
The release builds are made from that copy, so they carry the same data. The
keystore is copied in for signing the APK but is ignored by git and checked
again before every commit.
"""
import datetime
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAGE = os.path.join(os.path.dirname(ROOT), "pack-rat")
REPO = "jonathansatterthwaite-stack/pack-rat"
AUTHOR = ("jonathansatterthwaite-stack", "231256534+jonathansatterthwaite-stack@users.noreply.github.com")

PUBLISH = ["index.html", "manifest.webmanifest", "sw.js", "css", "js", "icons", "site", ".github", ".gitignore", ".gitattributes",
           "server.py", "desktop.py", "start-party.bat", "README.md", "android", "tools", "parked"]
SKIP_DIRS = {"keystore", ".cache", ".build", "__pycache__"}
# Files edited on GitHub itself: the repository's copy is kept as it is (and copied into the
# project for reference), never replaced from the project.
GITHUB_OWNED = ["planned-updates.md"]
# Kept in the stage between runs: local-only things (never committed; see .gitignore) and the above.
KEEP = {".git", "dist", "tools/.build", "tools/.cache", "android/keystore", *GITHUB_OWNED}
PRIVATE = ("keystore", ".keystore", "password")


def run(*args, cwd=STAGE, capture=False):
    r = subprocess.run(args, cwd=cwd, check=True, text=True, capture_output=capture)
    return r.stdout.strip() if capture else None


def git(*args, capture=False):
    return run("git", *args, capture=capture)


def stage():
    if not os.path.isdir(os.path.join(STAGE, ".git")):
        run("gh", "repo", "clone", REPO, STAGE, cwd=os.path.dirname(ROOT))
    git("config", "user.name", AUTHOR[0])
    git("config", "user.email", AUTHOR[1])
    # Take anything committed on GitHub since the last publish (edits made on the website).
    git("pull", "-q", "--ff-only", "origin", "main")
    for name in GITHUB_OWNED:
        if os.path.exists(os.path.join(STAGE, name)):
            shutil.copy2(os.path.join(STAGE, name), os.path.join(ROOT, name))
    # Start clean (deleted files disappear from the repo too), keeping only the local-only folders.
    for name in os.listdir(STAGE):
        path = os.path.join(STAGE, name)
        if name in KEEP:
            continue
        if name in ("tools", "android") and os.path.isdir(path):
            for sub in os.listdir(path):
                if f"{name}/{sub}" not in KEEP:
                    p = os.path.join(path, sub)
                    shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
            continue
        shutil.rmtree(path) if os.path.isdir(path) else os.remove(path)
    ignore = shutil.ignore_patterns(*SKIP_DIRS, "*.pyc")
    for name in PUBLISH:
        src, dst = os.path.join(ROOT, name), os.path.join(STAGE, name)
        if os.path.isdir(src):
            shutil.copytree(src, dst, ignore=ignore, dirs_exist_ok=True)
        else:
            shutil.copy2(src, dst)
    # The public item data: SRD 5.1 only.
    run(sys.executable, os.path.join(ROOT, "tools", "build_srd.py"), "--srd-only", os.path.join(STAGE, "js", "srd-data.js"), cwd=ROOT)


def check_private():
    git("add", "-A")
    tracked = git("ls-files", capture=True).splitlines()
    leaked = [f for f in tracked if any(p in f.lower() for p in PRIVATE)]
    if leaked:
        git("reset", "-q")
        sys.exit(f"Refusing to publish private files: {leaked}")


def commit_and_push(message):
    check_private()
    if not git("status", "--porcelain", capture=True):
        print("Nothing changed since the last publish.")
    else:
        git("commit", "-q", "-m", message)
        print("Committed:", message.splitlines()[0])
    git("push", "-q", "-u", "origin", "HEAD:main")
    print(f"Pushed. Site: https://{REPO.split('/')[0]}.github.io/{REPO.split('/')[1]}/")


def release(title_extra=None, notes_file=None):
    # Sign with the same key as local builds so phones can update in place.
    shutil.copytree(os.path.join(ROOT, "android", "keystore"), os.path.join(STAGE, "android", "keystore"), dirs_exist_ok=True)
    run(sys.executable, os.path.join(STAGE, "tools", "build_exe.py"))
    run(sys.executable, os.path.join(STAGE, "tools", "build_apk.py"))
    tags = set(git("tag", "--list", capture=True).splitlines()) | set(
        run("gh", "release", "list", "--repo", REPO, "--json", "tagName", "--jq", ".[].tagName", capture=True).splitlines())
    base = "v" + datetime.date.today().strftime("%Y.%m.%d")
    tag, n = base, 2
    while tag in tags:
        tag, n = f"{base}.{n}", n + 1
    notes = ("**Downloads:** `PackRat.exe` for Windows 10/11, `PackRat.apk` for Android 7.0+, "
             f"or use it in the browser at https://{REPO.split('/')[0]}.github.io/{REPO.split('/')[1]}/app/\n\n"
             "Windows may show a SmartScreen warning because the app isn't code-signed: choose *More info → Run anyway*.")
    if notes_file:
        with open(notes_file, encoding="utf8") as f:
            notes = f.read().strip() + "\n\n---\n\n" + notes
    title = f"Pack Rat {tag}" + (f" — {title_extra}" if title_extra else "")
    run("gh", "release", "create", tag, "--repo", REPO, "--target", "main", "--title", title, "--notes", notes,
        os.path.join(STAGE, "dist", "PackRat.exe"), os.path.join(STAGE, "dist", "PackRat.apk"))
    print(f"Released {tag}: https://github.com/{REPO}/releases/tag/{tag}")


def main():
    args = sys.argv[1:]
    message = args[args.index("-m") + 1] if "-m" in args else f"Update Pack Rat ({datetime.date.today():%Y-%m-%d})"
    stage()
    commit_and_push(message)
    opt = lambda name: args[args.index(name) + 1] if name in args else None
    if "--release" in args:
        release(opt("--title"), opt("--notes"))


if __name__ == "__main__":
    main()
