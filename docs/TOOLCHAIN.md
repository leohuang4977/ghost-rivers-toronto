# Toolchain & deploy notes

## The Windows geospatial problem, and the pick

The pipeline needs three tools that are all rough on native Windows:

| Tool | Native Windows story |
| --- | --- |
| **GDAL** (+ geopandas/rasterio) | Works via conda-forge on `win-64`, but the classic pip/wheel + system-DLL path is fragile. |
| **tippecanoe** | **No supported native-Windows build.** It's a POSIX C++ tool; conda-forge ships it for `linux`/`osx` only. This is the real blocker. |
| **pmtiles** (Go CLI) | Fine natively — static Go binary with a Windows release. |

**Pick: WSL2 (Ubuntu) as the single home for the whole pipeline, with a
pixi / conda-forge environment inside it.**

Two-line justification:
1. `tippecanoe` forces a POSIX environment no matter what, and Docker Desktop on
   Windows just runs a WSL2 VM under the hood — so WSL2 is the lightest way to get
   GDAL + tippecanoe + pmtiles in one place, with none of Docker's volume/permission friction.
2. Inside WSL, **pixi** resolves the entire geostack — including a *prebuilt* linux
   `tippecanoe` — from conda-forge into one committed lockfile, so there are no
   source builds and the environment is reproducible for the case study.

Rejected alternatives: **conda on native Windows** handles GDAL/geopandas fine but
still can't get `tippecanoe`, forcing a split environment. **Docker** adds a
container layer over the same WSL2 backend for no gain on a run-once local pipeline.

## Machine state at setup (2026-07-05)

- Node 24 / npm 11 present → the `/site` front end builds and runs natively on
  Windows; it does **not** need WSL.
- The only Python on PATH was PsychoPy's bundled 3.6.6 — unusable and irrelevant,
  since the pipeline's Python comes from the pixi env inside WSL.
- WSL was present only as the legacy inbox stub with **no distribution installed**.
  Enabling it (`wsl --install`) needs administrator elevation and a reboot.

## The one manual step (blocked on you)

Enabling the WSL feature is a machine-wide change that requires an **elevated**
shell and a **reboot** — it can't be done from this non-interactive session. Run,
in an **Administrator** PowerShell:

```powershell
wsl --install -d Ubuntu
```

Reboot, complete the Ubuntu first-run (create a UNIX username/password), then:

```bash
cd /mnt/c/Users/leo/toronto_ghost_river/pipeline
bash scripts/setup_wsl_toolchain.sh
```

That script installs pixi + the env + the pmtiles CLI and prints
`gdal`, `tippecanoe`, and `pmtiles` versions to confirm everything runs.

> Note on file locations: the repo lives on the Windows filesystem and is reached
> from WSL at `/mnt/c/...`. That's fine for a run-once pipeline. If a specific step
> is IO-heavy and feels slow across the `/mnt/c` boundary, copy just that step's
> `data/` working set into the native WSL filesystem (`~/`) and copy results back.

## Deploy (the front end only)

`site/vite.config.ts` sets `base: './'`, so `npm run build` produces a `dist/`
folder of **relative-path** static assets that works unchanged at a root, a
subdomain, or any subpath.

### To a subpath of your personal GitHub Pages site

If your site is `https://<user>.github.io/`, a project repo publishes at
`https://<user>.github.io/<repo>/`:

1. `cd site && npm run build` → `site/dist/`.
2. Publish `site/dist/` to the repo's Pages source. Simplest is the `gh-pages`
   branch or a GitHub Actions build step; point Pages at it.
3. Because `base` is relative, the subpath (`/<repo>/`) needs no config change.
   Any runtime data (`.pmtiles`) must be fetched with **relative** URLs
   (`./data/…`) so they resolve under the subpath too.

### To a subdomain (e.g. `rivers.<yourdomain>`)

Same `dist/`. Point the subdomain at Cloudflare Pages / Netlify / GitHub Pages and
drop the bundle in. Relative base means zero changes between the subpath and
subdomain targets — build once, host anywhere.

One caveat for GitHub Pages specifically: it serves over a CDN that supports HTTP
range requests, which PMTiles relies on — this works, but if you ever see range
requests refused, Cloudflare Pages / Netlify are drop-in alternatives.
