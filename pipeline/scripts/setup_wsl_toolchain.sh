#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# One-shot GIS toolchain setup for Ghost Rivers of Toronto.
# Run this INSIDE WSL2 (Ubuntu), from the repo, AFTER:
#   1. (Windows, elevated PowerShell)  wsl --install -d Ubuntu
#   2. reboot, finish the Ubuntu first-run (create a UNIX user)
#   3. cd /mnt/c/Users/leo/toronto_ghost_river/pipeline
#   4. bash scripts/setup_wsl_toolchain.sh
#
# Installs: pixi (conda-forge env manager) + the pipeline env
# (gdal/geopandas/rasterio/tippecanoe) + the pmtiles CLI. Idempotent.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

REPO_PIPELINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_PIPELINE"

echo "==> [1/4] Ensuring base build tools (curl, tar) ..."
if ! command -v curl >/dev/null 2>&1; then
  sudo apt-get update -y && sudo apt-get install -y curl ca-certificates
fi

echo "==> [2/4] Installing pixi (if missing) ..."
if ! command -v pixi >/dev/null 2>&1; then
  curl -fsSL https://pixi.sh/install.sh | bash
fi
export PATH="$HOME/.pixi/bin:$PATH"

echo "==> [3/4] Resolving the conda-forge pipeline env (this is the slow step) ..."
pixi install

echo "==> [4/4] Installing the pmtiles CLI (Go release binary) into ./bin ..."
mkdir -p bin
PM_URL="$(curl -fsSL https://api.github.com/repos/protomaps/go-pmtiles/releases/latest \
  | grep -oP '"browser_download_url":\s*"\K[^"]+' \
  | grep -i 'linux' | grep -iE 'x86_64|amd64' | grep -iE '\.tar\.gz$' | head -1)"
if [ -z "${PM_URL:-}" ]; then
  echo "!! Could not auto-detect the Linux pmtiles asset; grab it from" >&2
  echo "   https://github.com/protomaps/go-pmtiles/releases and drop it in ./bin" >&2
else
  curl -fsSL "$PM_URL" -o /tmp/pmtiles.tgz
  tar -xzf /tmp/pmtiles.tgz -C bin pmtiles
  chmod +x bin/pmtiles
fi

echo ""
echo "==> Confirming the toolchain:"
echo -n "gdal:       "; pixi run gdalinfo --version || true
echo -n "tippecanoe: "; pixi run tippecanoe --version 2>&1 || true
echo -n "pmtiles:    "; ./bin/pmtiles version 2>&1 || true
echo ""
echo "==> Done. Activate the env for interactive work with:  pixi shell"
