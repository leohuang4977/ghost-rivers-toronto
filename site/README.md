# site — Ghost Rivers of Toronto (front end)

Vite + TypeScript + [MapLibre GL JS](https://maplibre.org/) with the
[PMTiles](https://protomaps.com/) protocol pre-registered. This is the **only part
that deploys**. It calls nothing at runtime except its own static files.

## Run it locally

```bash
cd site
npm install      # first time only
npm run dev      # → http://localhost:5173
```

You should see a full-viewport **blank dark basemap** centered on the Garrison
Creek corridor. That's the Phase 0 target: the map engine is alive and the
build/deploy path works, with zero data and zero external requests.

## Build / preview the production bundle

```bash
npm run build    # type-checks, then emits a static bundle to site/dist/
npm run preview  # serves site/dist/ locally to sanity-check the build
```

## Deploy

`vite.config.ts` sets `base: './'`, so `dist/` is portable: copy it to a domain
root, a subdomain, or any subpath (e.g. `you.github.io/ghost-rivers/`) without a
rebuild. See the root `README.md` → **Deploy** for the exact GitHub steps.

## What's here vs. what's coming

- **Now (Phase 0):** blank dark map, PMTiles protocol registered, deploy config.
- **Later:** the Protomaps basemap + creek/hillshade/historical layers get built
  by the `/pipeline` and dropped into `site/public/` as `.pmtiles` files, then
  referenced from the MapLibre style. No new runtime dependencies.
