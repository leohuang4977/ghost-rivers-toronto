"""City context layers — streets, parks, ravines, and the lake.

Clips each City Open Data layer to the study bbox, reprojects to WGS84, and writes
GeoJSON intermediates that tile.py bundles into city.pmtiles. Lake Ontario is derived
from the DTM's nodata (lidar returns nothing over water), so the water edge lines up
exactly with the hillshade edge.

Run:  pixi run city   (depends on `hillshade` for the water derivation)
"""
from __future__ import annotations
import os
import geopandas as gpd
import rasterio
from rasterio.features import shapes
from shapely.geometry import box, shape
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

    # ── parks: Green Spaces ─────────────────────────────────────────────────────
    gs = _polys_only(_clip4326(gpd.read_file(resolve(ccfg["green_spaces"])), clip_poly))
    gs[["geometry"]].to_file(os.path.join(interim, "parks.geojson"), driver="GeoJSON")
    print(f"[city] parks: {len(gs)} features")

    # ── ravines: Ravine bylaw polygons ──────────────────────────────────────────
    rv = _polys_only(_clip4326(gpd.read_file(resolve(ccfg["ravine"])), clip_poly))
    rv[["geometry"]].to_file(os.path.join(interim, "ravines.geojson"), driver="GeoJSON")
    print(f"[city] ravines: {len(rv)} features")

    # ── water: Lake Ontario from DTM nodata ─────────────────────────────────────
    with rasterio.open(resolve(ccfg["water_from_hillshade"])) as src:
        alpha = src.read(src.count)  # last band = alpha (0 where the DTM has no data)
        transform, rcrs = src.transform, src.crs
    mask = (alpha == 0).astype("uint8")
    geoms = [shape(g) for g, _ in shapes(mask, mask=(mask == 1), transform=transform)]
    water = gpd.GeoDataFrame(geometry=geoms, crs=rcrs)
    water = water[water.geometry.area >= ccfg["water_min_area_m2"]]  # drop small nodata gaps
    water = gpd.clip(water.to_crs("EPSG:4326"), clip_poly)
    water[["geometry"]].to_file(os.path.join(interim, "water.geojson"), driver="GeoJSON")
    print(f"[city] water: {len(water)} lake polygon(s) derived from DTM nodata")

    print(f"\n[✓] wrote streets/parks/ravines/water GeoJSON to {interim}")


if __name__ == "__main__":
    main()
