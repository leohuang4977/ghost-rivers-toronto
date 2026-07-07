"""Annexation boundaries — the REAL "city grows" layer.

Reads the City of Toronto Historical Annexation Boundaries shapefile (Marcel Fortin / U of T
Map & Data Library, Borealis DOI 10.5683/SP3/XN2NRW, CC-BY 4.0 — the same author as this
project's creek data), which carries a per-parcel annexation YEAR (`YrAnxd`). We keep the
parcels intersecting the study frame, drop street-only strips/slivers, simplify the detailed
archival boundaries for the web, and write a small GeoJSON that the site loads directly and
fades in parcel-by-parcel as the timeline year passes each annexation.

Every parcel keeps its `year` + `name` + `date`, so the footprint sweeping outward over the
dying creeks is TRUE, not a proxy. Boundaries are the digitized Archives annexation map —
accurate to that source; label them "annexation boundaries" (not cadastral) in the About.

Run:  pixi run annex
"""
from __future__ import annotations
import json
import os
import geopandas as gpd
from shapely.geometry import box

from ghost_rivers.config import CONFIG, resolve, ensure_dir


def main() -> None:
    cfg = CONFIG
    acfg = cfg["annexation"]
    bbox = cfg["study_area"]["bbox_wgs84"]
    dtm_crs = cfg["crs"]["dtm"]  # EPSG:2958 — true metres for area filter + simplify

    g = gpd.read_file(resolve(acfg["source_shp"])).to_crs("EPSG:4326")
    n0 = len(g)

    # parse the annexation year (string field; "N/A" and blanks are dropped)
    yf, nf, df = acfg["year_field"], acfg["name_field"], acfg["date_field"]

    def _year(v) -> int | None:
        try:
            return int(str(v).strip()[:4])
        except (ValueError, TypeError):
            return None

    g["year"] = g[yf].map(_year)
    dropped_year = g[g["year"].isna()][nf].tolist()
    g = g[g["year"].notna()].copy()
    g["year"] = g["year"].astype(int)

    # keep parcels intersecting the study frame (+ a margin), then clip geometry to it
    buf = acfg.get("bbox_buffer_deg", 0.02)
    frame = box(bbox[0] - buf, bbox[1] - buf, bbox[2] + buf, bbox[3] + buf)
    frame_gdf = gpd.GeoDataFrame(geometry=[frame], crs="EPSG:4326")
    g = g[g.geometry.intersects(frame)].copy()
    g["geometry"] = gpd.clip(g, frame_gdf).geometry

    # drop street-only strips / slivers by TRUE area, and simplify the archival detail
    gm = g.to_crs(dtm_crs)
    g = g[gm.geometry.area.values >= acfg.get("min_area_m2", 30000)].copy()
    gm = g.to_crs(dtm_crs)
    gm["geometry"] = gm.geometry.simplify(acfg.get("simplify_m", 8), preserve_topology=True)
    g = gm.to_crs("EPSG:4326")
    g = g[~g.geometry.is_empty & g.geometry.notna()]

    g = g.sort_values("year").reset_index(drop=True)
    g["name"] = g[nf].astype(str)
    g["date"] = g[df].astype(str)
    out = json.loads(g[["year", "name", "date", "geometry"]].to_json())
    out["note"] = (
        "City of Toronto annexation parcels 1834-1967. Boundaries digitized from the City of "
        "Toronto Archives annexation map by M. Fortin (U of T Map & Data Library), Borealis DOI "
        "10.5683/SP3/XN2NRW, CC-BY 4.0. Approximate to that source; clipped to the study frame."
    )

    pub = ensure_dir(resolve(cfg["paths"]["site_public_data"]))
    dst = os.path.join(pub, "annexations.geojson")
    with open(dst, "w", encoding="utf-8") as fh:
        json.dump(out, fh)

    yrs = sorted({f["properties"]["year"] for f in out["features"]})
    print(f"[annex] {len(out['features'])} parcels kept (of {n0}); years {yrs[0]}-{yrs[-1]}")
    print(f"[annex] distinct annexation years: {yrs}")
    if dropped_year:
        print(f"[annex] dropped {len(dropped_year)} parcels with no numeric year: {dropped_year}")
    print(f"\n[✓] wrote {dst}")

    # ── cumulative footprint per year — the OUTER city limit ────────────────────
    # The site draws the city limit from these, not the raw parcels, so interior borders
    # between already-annexed districts dissolve: once an area joins Toronto, the line shows
    # the entirety of the city, not a patchwork of boxes. One feature per distinct year =
    # the union of everything annexed so far; `next_year` lets the site crossfade between
    # consecutive footprints as the timeline passes each annexation.
    from shapely.ops import unary_union

    gm = g.to_crs(dtm_crs)  # union in true metres, then a tiny buffer heals parcel seams
    cum_feats = []
    footprint = None
    for yr in yrs:
        step = unary_union(gm.loc[gm["year"] <= yr, "geometry"].values)
        step = step.buffer(12).buffer(-12)  # close hairline gaps between adjacent parcels
        footprint = step if footprint is None else unary_union([footprint, step])
        cum_feats.append({"year": int(yr), "geometry": footprint})
    cum = gpd.GeoDataFrame(cum_feats, crs=dtm_crs).to_crs("EPSG:4326")
    cum["next_year"] = cum["year"].shift(-1).fillna(9999).astype(int)
    cum_out = json.loads(cum[["year", "next_year", "geometry"]].to_json())
    cum_out["note"] = out["note"]
    dst_cum = os.path.join(pub, "annexations_cum.geojson")
    with open(dst_cum, "w", encoding="utf-8") as fh:
        json.dump(cum_out, fh)
    holes = sum(
        len(p.interiors) for f in cum.geometry
        for p in (f.geoms if f.geom_type == "MultiPolygon" else [f])
    )
    print(f"[annex] cumulative footprints: {len(cum)} steps ({yrs[0]}-{yrs[-1]}), "
          f"{holes} interior holes across all steps")
    print(f"[✓] wrote {dst_cum}")


if __name__ == "__main__":
    main()
