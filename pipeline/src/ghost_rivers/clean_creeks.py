"""Step 1 + 2 — assemble downtown creek geometry and attach 'year last seen'.

Reads the best-interpreted lost-rivers layer, reprojects to WGS84, clips to the
downtown study bbox, repairs/dedupes geometry, and attaches the `lastNTS` year
(the year each creek was last drawn on a map). Writes creeks_4326.geojson.

Run:  pixi run creeks   (or PYTHONPATH=src python -m ghost_rivers.clean_creeks)
"""
from __future__ import annotations
import os
import geopandas as gpd
import pandas as pd
from shapely import make_valid
from shapely.geometry import box

from ghost_rivers.config import CONFIG, resolve, ensure_dir


def _read_zip_shp(zip_path: str) -> gpd.GeoDataFrame:
    for p in (f"/vsizip/{zip_path}", f"zip://{zip_path}", zip_path):
        try:
            return gpd.read_file(p)
        except Exception:
            continue
    raise RuntimeError(f"could not read {zip_path}")


def _year_coverage(series: pd.Series, nodata: list) -> str:
    """Human summary of how well a year column is populated (nodata/0 = missing)."""
    s = pd.to_numeric(series, errors="coerce")
    missing = s.isna() | s.isin(nodata)
    real = s[~missing]
    return (f"{(~missing).sum()}/{len(s)} dated "
            f"({real.min():.0f}-{real.max():.0f}, {real.nunique()} distinct); "
            f"{missing.sum()} undated")


def main() -> None:
    cfg = CONFIG
    ccfg = cfg["creeks"]
    bbox = cfg["study_area"]["bbox_wgs84"]
    out_crs = cfg["crs"]["vector_out"]
    dtm_crs = cfg["crs"]["dtm"]
    year_field = ccfg["year_field"]
    year_nodata = ccfg["year_nodata"]

    processed = ensure_dir(resolve(cfg["paths"]["processed"]))
    out_path = os.path.join(processed, "creeks_4326.geojson")

    # ── load primary source (latest best-interpreted lost rivers) ──────────────
    gdb = resolve(ccfg["source_gdb"])
    layer = ccfg["source_layer"]
    print(f"[1] reading {layer} from {os.path.basename(gdb)}")
    g = gpd.read_file(gdb, layer=layer)
    if g.crs is None:
        raise SystemExit("ABORT: source layer has no CRS; refusing to assume one.")
    print(f"    source: {len(g)} features, CRS={g.crs.to_string()}, "
          f"geom={sorted(g.geom_type.dropna().unique())}")

    # ── reproject -> WGS84, clip to downtown bbox ──────────────────────────────
    g = g.to_crs(out_crs)
    clip_poly = gpd.GeoDataFrame(geometry=[box(*bbox)], crs="EPSG:4326")
    g = gpd.clip(g, clip_poly)
    print(f"[1] clipped to downtown bbox: {len(g)} features")

    # ── repair + dedupe geometry ───────────────────────────────────────────────
    g = g[~g.geometry.is_empty & g.geometry.notna()].copy()
    g["geometry"] = g.geometry.apply(make_valid)
    g = g[g.geometry.type.isin(["LineString", "MultiLineString"])].copy()
    before = len(g)
    g = g[~g.geometry.apply(lambda geom: geom.wkb).duplicated()].copy()
    print(f"[1] repaired geometry; dropped {before - len(g)} exact duplicates -> {len(g)} features")

    # ── attach 'year last seen' (Step 2) ───────────────────────────────────────
    raw = pd.to_numeric(g[year_field], errors="coerce")
    missing = raw.isna() | raw.isin(year_nodata)
    g["year_last_seen"] = raw.where(~missing).astype("Int64")
    g["has_year"] = (~missing).astype(int)

    n_dated = int((~missing).sum())
    print(f"[2] year field '{year_field}': {n_dated}/{len(g)} downtown features dated, "
          f"{int(missing.sum())} undated (kept + flagged has_year=0)")
    dist = (g.loc[g["has_year"] == 1, "year_last_seen"]
            .value_counts().sort_index())
    print("[2] downtown year distribution (year: count):")
    for yr, cnt in dist.items():
        print(f"      {int(yr)}: {int(cnt)}")

    # coverage comparison vs the canonical May-2017 shapefile (report only)
    try:
        can = _read_zip_shp(resolve(ccfg["canonical_shp"])).to_crs(out_crs)
        can = gpd.clip(can, clip_poly)
        print(f"[2] coverage comparison on the SAME downtown bbox:")
        print(f"      chosen  ({layer}): {_year_coverage(g[year_field], year_nodata)}")
        print(f"      canonical (shapefile): {_year_coverage(can[year_field], year_nodata)}")
    except Exception as e:
        print(f"    (canonical comparison skipped: {e})")

    # ── length report + write ──────────────────────────────────────────────────
    total_km = g.to_crs(dtm_crs).length.sum() / 1000.0
    keep = g[["year_last_seen", "has_year", "geometry"]].reset_index(drop=True)
    keep.to_file(out_path, driver="GeoJSON")

    print(f"\n[✓] wrote {out_path}")
    print(f"    features: {len(keep)}   total length: {total_km:.2f} km   "
          f"dated: {n_dated} ({100*n_dated/len(keep):.0f}%)")


if __name__ == "__main__":
    main()
