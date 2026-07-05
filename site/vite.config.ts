import { defineConfig } from 'vite'

// `base: './'` emits *relative* asset URLs in the built index.html. That makes
// the same `dist/` bundle deployable unchanged at a domain root, a subdomain,
// OR an arbitrary subpath (e.g. https://you.github.io/ghost-rivers/) — which is
// exactly the "drop it under my personal GitHub site" deploy target. Because
// this is a single-page scrollytelling site with no client-side router, there
// are no deep-link paths that a relative base would break.
//
// If you ever pin it to a fixed absolute subpath instead, set e.g.
//   base: '/ghost-rivers/'
// and rebuild. Relative base is the portable default; keep it unless a host
// forces otherwise.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    // PMTiles are fetched at runtime via HTTP range requests; nothing here
    // needs a special build step. Large static data lives in /public.
    outDir: 'dist',
  },
})
