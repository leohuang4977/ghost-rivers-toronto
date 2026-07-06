"""Small shared helpers: subprocess runner and pmtiles-binary bootstrap."""
from __future__ import annotations
import json
import os
import stat
import subprocess
import sys
import tarfile
import tempfile
import urllib.request


def run(cmd: list, **kwargs) -> None:
    """Echo then run a command, raising on non-zero exit."""
    printable = " ".join(str(c) for c in cmd)
    print(f"  $ {printable}", flush=True)
    subprocess.run([str(c) for c in cmd], check=True, **kwargs)


def capture(cmd: list) -> str:
    return subprocess.run([str(c) for c in cmd], check=True,
                          capture_output=True, text=True).stdout


def ensure_pmtiles(bin_dir: str) -> str:
    """Return a path to a Linux `pmtiles` CLI, downloading the release binary if
    it isn't already in bin/. (bin/ also holds pmtiles.exe for Windows; the ELF
    binary is named `pmtiles` with no extension.)"""
    os.makedirs(bin_dir, exist_ok=True)
    exe = os.path.join(bin_dir, "pmtiles")
    if os.path.exists(exe) and os.access(exe, os.X_OK):
        return exe
    print("  [pmtiles] Linux binary not found; fetching latest go-pmtiles release ...", flush=True)
    rel = json.load(urllib.request.urlopen(
        "https://api.github.com/repos/protomaps/go-pmtiles/releases/latest"))
    url = None
    for a in rel["assets"]:
        n = a["name"].lower()
        if "linux" in n and ("x86_64" in n or "amd64" in n) and n.endswith(".tar.gz"):
            url = a["browser_download_url"]
            break
    if not url:
        sys.exit("Could not locate a Linux pmtiles asset on the latest release.")
    with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tmp:
        urllib.request.urlretrieve(url, tmp.name)
        with tarfile.open(tmp.name) as tf:
            member = next(m for m in tf.getmembers() if os.path.basename(m.name) == "pmtiles")
            member.name = "pmtiles"
            tf.extract(member, bin_dir)
    os.chmod(exe, os.stat(exe).st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
    return exe
