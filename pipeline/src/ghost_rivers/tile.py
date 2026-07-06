"""Step 4 — tile the creeks (vector) and hillshade (raster) to PMTiles.

  creeks_4326.geojson  --tippecanoe-->            creeks.pmtiles
  hillshade_3857.tif   --gdal MBTiles--> --pmtiles convert--> hillshade.pmtiles

Both final .pmtiles are copied into site/public/data/ so the Vite site serves
them as static assets.

Run:  pixi run tiles   (depends on `creeks` and `hillshade`)
"""
from __future__ import annotations
import os
import shutil

from ghost_rivers.config import CONFIG, resolve, ensure_dir
from ghost_rivers._util import run, capture, ensure_pmtiles

# Web-Mercator resolution (m/px) at a given zoom, for aligning the raster base level.
_WEBMERC_M = 156543.03392804097


def _pmtiles_show(pmtiles_bin: str, path: str) -> None:
    out = capture([pmtiles_bin, "show", path])
    for line in out.splitlines():
        low = line.lower()
        if any(k in low for k in ("zoom", "bounds", "tile type", "tile entries", "min", "max")):
            print("      " + line.strip())


def build_creeks(cfg, processed, minz, maxz) -> str:
    src = os.path.join(processed, "creeks_4326.geojson")
    out = os.path.join(processed, "creeks.pmtiles")
    run(["tippecanoe", "-o", out, "--force",
         "-Z", minz, "-z", maxz, "-l", "creeks",
         "--no-tile-size-limit", "--no-feature-limit",
         "--no-simplification-of-shared-nodes", "--preserve-input-order",
         src])
    return out


def build_hillshade(cfg, interim, processed, minz, maxz) -> str:
    src = os.path.join(processed, "hillshade_3857.tif")
    z16 = os.path.join(interim, "hillshade_z_base.tif")
    mbt = os.path.join(interim, "hillshade.mbtiles")
    out = os.path.join(processed, "hillshade.pmtiles")
    for f in (mbt, out):
        if os.path.exists(f):
            os.remove(f)

    zres = _WEBMERC_M / (2 ** maxz)
    b = cfg["study_area"]["bbox_wgs84"]
    from rasterio.warp import transform_bounds
    te = transform_bounds("EPSG:4326", cfg["crs"]["web"], *b, densify_pts=21)
    # resample the hillshade to the exact max-zoom base resolution, tile-grid aligned
    run(["gdalwarp", "-t_srs", cfg["crs"]["web"], "-tr", zres, zres, "-tap",
         "-te", te[0], te[1], te[2], te[3], "-r", "bilinear",
         "-of", "GTiff", "-co", "COMPRESS=DEFLATE", "-co", "TILED=YES", "-overwrite",
         src, z16])
    # base MBTiles at max zoom, then overviews down to min zoom
    run(["gdal_translate", z16, mbt, "-of", "MBTiles",
         "-co", "TILE_FORMAT=PNG", "-co", f"NAME=ghost-rivers-hillshade"])
    factors = [2 ** k for k in range(1, maxz - minz + 1)]   # z15..zminz
    run(["gdaladdo", "-r", "average", mbt, *factors])

    pmtiles_bin = ensure_pmtiles(resolve(cfg["paths"]["bin"]))
    run([pmtiles_bin, "convert", mbt, out])
    return out


def build_city(cfg, interim, processed, minz, maxz) -> str:
    """Bundle streets/parks/ravines/water into one multi-layer city.pmtiles."""
    out = os.path.join(processed, "city.pmtiles")
    inputs = []
    for name in ("streets", "parks", "ravines", "water"):
        p = os.path.join(interim, f"{name}.geojson")
        if os.path.exists(p):
            inputs += ["-L", f"{name}:{p}"]
    run(["tippecanoe", "-o", out, "--force",
         "-Z", minz, "-z", maxz,
         "--drop-densest-as-needed", "--extend-zooms-if-still-dropping",
         "--no-simplification-of-shared-nodes",
         *inputs])
    return out


def main() -> None:
    cfg = CONFIG
    processed = ensure_dir(resolve(cfg["paths"]["processed"]))
    interim = ensure_dir(resolve(cfg["paths"]["interim"]))
    pub = ensure_dir(resolve(cfg["paths"]["site_public_data"]))
    pmtiles_bin = ensure_pmtiles(resolve(cfg["paths"]["bin"]))

    print("[4] tiling creeks -> PMTiles")
    creeks = build_creeks(cfg, processed,
                          cfg["tiles"]["creeks_minzoom"], cfg["tiles"]["creeks_maxzoom"])
    print("[4] tiling hillshade -> PMTiles")
    hs = build_hillshade(cfg, interim, processed,
                         cfg["tiles"]["hillshade_minzoom"], cfg["tiles"]["hillshade_maxzoom"])
    print("[4] tiling city context -> PMTiles")
    city = build_city(cfg, interim, processed,
                      cfg["tiles"]["city_minzoom"], cfg["tiles"]["city_maxzoom"])

    print("\n[4] verifying + staging into site/public/data/")
    for f in (creeks, hs, city):
        dst = os.path.join(pub, os.path.basename(f))
        # copyfile (not copy2): the Windows drvfs mount rejects copystat's utime,
        # and we only need the bytes staged for the static site.
        shutil.copyfile(f, dst)
        size_mb = os.path.getsize(dst) / 1e6
        print(f"\n  {os.path.basename(f)}  ({size_mb:.2f} MB)  -> {dst}")
        _pmtiles_show(pmtiles_bin, dst)


if __name__ == "__main__":
    main()
