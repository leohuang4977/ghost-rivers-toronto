"""City context layers — streets, parks, ravines, and the lake.

Clips each City Open Data layer to the study bbox, reprojects to WGS84, and writes
GeoJSON intermediates that tile.py bundles into city.pmtiles. Lake Ontario is derived
from the DTM's nodata (lidar returns nothing over water), so the water edge lines up
exactly with the hillshade edge.

Run:  pixi run city   (depends on `hillshade` for the water derivation)
"""
from __future__ import annotations
import os
import numpy as np
import geopandas as gpd
import rasterio
from rasterio.features import shapes
from shapely.geometry import box, shape, Polygon, MultiPolygon
from shapely.ops import unary_union
from shapely import make_valid

from ghost_rivers.config import CONFIG, resolve, ensure_dir


def _clip4326(gdf: gpd.GeoDataFrame, clip_poly: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    g = gdf.to_crs("EPSG:4326")
    g = gpd.clip(g, clip_poly)
    return g[~g.geometry.is_empty & g.geometry.notna()].copy()


def _polys_only(g: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    g = g.copy()
    g["geometry"] = g.geometry.apply(make_valid)
    return g[g.geometry.geom_type.isin(["Polygon", "MultiPolygon"])]


def _chaikin_ring(coords, iters: int):
    """Chaikin corner-cutting on a closed ring — turns angular vertices into a curve."""
    pts = [np.asarray(c, dtype=float) for c in coords]
    for _ in range(iters):
        new, n = [], len(pts) - 1  # closed ring: last == first
        for i in range(n):
            p, q = pts[i], pts[(i + 1) % n]
            new.append(0.75 * p + 0.25 * q)
            new.append(0.25 * p + 0.75 * q)
        new.append(new[0])
        pts = new
    return [tuple(p) for p in pts]


def _smooth_water(geom, close_m: float, simplify_m: float, chaikin_iters: int, grow_m: float):
    """De-pixelate a raster-derived polygon into smooth vector curves, in a metric CRS.

    Morphological close+open (round joins) dissolves the ~pixel-scale stair-steps, a light
    Douglas-Peucker drops the dense arc vertices, Chaikin rounds what's left, and a small
    outward grow keeps the (drawn-on-top) water from leaving a thin dark rim at the shore.
    """
    g = (geom.buffer(close_m, join_style="round")
             .buffer(-2 * close_m, join_style="round")
             .buffer(close_m, join_style="round"))
    g = g.simplify(simplify_m, preserve_topology=True)

    def _poly(p: Polygon) -> Polygon:
        return Polygon(
            _chaikin_ring(p.exterior.coords, chaikin_iters),
            [_chaikin_ring(r.coords, chaikin_iters) for r in p.interiors if len(r.coords) > 4],
        )

    if g.geom_type == "Polygon":
        g = _poly(g)
    elif g.geom_type == "MultiPolygon":
        g = MultiPolygon([_poly(p) for p in g.geoms])
    return g.buffer(grow_m, join_style="round").buffer(0)


def main() -> None:
    cfg = CONFIG
    ccfg = cfg["city"]
    bbox = cfg["study_area"]["bbox_wgs84"]
    interim = ensure_dir(resolve(cfg["paths"]["interim"]))
    clip_poly = gpd.GeoDataFrame(geometry=[box(*bbox)], crs="EPSG:4326")

    # ── streets: Toronto Centreline, road classes only ──────────────────────────
    cl = gpd.read_file(resolve(ccfg["centreline"]))
    keep = set(ccfg["street_classes"])
    st = cl[cl["FEATURE_CODE_DESC"].isin(keep)].copy()
    st = _clip4326(st, clip_poly)
    st = st[st.geometry.geom_type.isin(["LineString", "MultiLineString"])]
    st = st[["FEATURE_CODE_DESC", "geometry"]].rename(columns={"FEATURE_CODE_DESC": "cls"})
    st.to_file(os.path.join(interim, "streets.geojson"), driver="GeoJSON")
    print(f"[city] streets: {len(st)} features (of {len(cl)} centreline; {len(keep)} road classes)")

    # ── street NAME labels: named arterials only (a handful of key streets) ──────
    lab = cl[cl["FEATURE_CODE_DESC"].isin(set(ccfg["label_classes"]))].copy()
    lab = _clip4326(lab, clip_poly)
    lab = lab[lab.geometry.geom_type.isin(["LineString", "MultiLineString"])]
    lab = lab[["LINEAR_NAME_FULL", "geometry"]].rename(columns={"LINEAR_NAME_FULL": "name"})
    lab = lab[lab["name"].notna() & (lab["name"].astype(str).str.len() > 0)]

    def _abbrev(n: str) -> str:
        for a, b in (("Street", "St"), ("Avenue", "Ave"), ("Boulevard", "Blvd"),
                     ("Road", "Rd"), ("Drive", "Dr"), ("Crescent", "Cres"),
                     (" West", " W"), (" East", " E"), (" North", " N"), (" South", " S")):
            n = n.replace(a, b)
        return n

    lab["name"] = lab["name"].astype(str).map(_abbrev)
    lab = lab.dissolve(by="name", as_index=False)  # one feature per street name
    lab.to_file(os.path.join(interim, "street_labels.geojson"), driver="GeoJSON")
    print(f"[city] street labels: {len(lab)} named arterials")

    # ── parks: Green Spaces ─────────────────────────────────────────────────────
    gs = _polys_only(_clip4326(gpd.read_file(resolve(ccfg["green_spaces"])), clip_poly))
    gs[["geometry"]].to_file(os.path.join(interim, "parks.geojson"), driver="GeoJSON")
    print(f"[city] parks: {len(gs)} features")

    # ── ravines: Ravine bylaw polygons ──────────────────────────────────────────
    rv = _polys_only(_clip4326(gpd.read_file(resolve(ccfg["ravine"])), clip_poly))
    rv[["geometry"]].to_file(os.path.join(interim, "ravines.geojson"), driver="GeoJSON")
    print(f"[city] ravines: {len(rv)} features")

    # ── water: Lake Ontario from DTM nodata, smoothed to vector curves ───────────
    # The lidar returns nothing over water, so the DTM nodata gives an ACCURATE water
    # extent — but as a raster it has pixel stair-steps. We polygonize it, then smooth the
    # stair-steps into curves in a true-metric CRS so the shoreline reads as real geography
    # rather than pixels. (The City Centreline "Major Shoreline" is real vector data but is
    # fragmented across the downtown slips/quays and won't close into a lake polygon, so the
    # lidar extent + smoothing is both more robust and more accurate here.)
    dtm_crs = cfg["crs"]["dtm"]  # EPSG:2958 — true metres, for correct buffer/simplify units
    with rasterio.open(resolve(ccfg["water_from_hillshade"])) as src:
        alpha = src.read(src.count)  # last band = alpha (0 where the DTM has no data)
        transform, rcrs = src.transform, src.crs
    mask = (alpha == 0).astype("uint8")
    geoms = [shape(g) for g, _ in shapes(mask, mask=(mask == 1), transform=transform)]
    water = gpd.GeoDataFrame(geometry=geoms, crs=rcrs)
    water = water[water.geometry.area >= ccfg["water_min_area_m2"]]  # drop small nodata gaps
    scfg = ccfg.get("water_smoothing", {})
    smooth = _smooth_water(
        unary_union(water.to_crs(dtm_crs).geometry.values),
        close_m=scfg.get("close_m", 10.0),
        simplify_m=scfg.get("simplify_m", 5.0),
        chaikin_iters=scfg.get("chaikin_iters", 2),
        grow_m=scfg.get("grow_m", 4.0),
    )
    water = gpd.GeoDataFrame(geometry=[smooth], crs=dtm_crs)
    water = gpd.clip(water.to_crs("EPSG:4326"), clip_poly)
    water = water[~water.geometry.is_empty & water.geometry.notna()]
    water[["geometry"]].to_file(os.path.join(interim, "water.geojson"), driver="GeoJSON")
    npart = sum(len(g.geoms) if g.geom_type == "MultiPolygon" else 1 for g in water.geometry)
    print(f"[city] water: {npart} lake polygon(s), DTM nodata smoothed to vector curves")

    print(f"\n[✓] wrote streets/parks/ravines/water GeoJSON to {interim}")


if __name__ == "__main__":
    main()
