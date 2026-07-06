"""Step 3 — mosaic the lidar DTM tiles and build a hillshade for the study area.

Handles the two known DTM gotchas explicitly:
  * tiles carry a compound 3D CRS -> we force plain 2D EPSG:2958 on input,
  * tiles carry inconsistent nodata (+/-3.4e38) -> gdalwarp masks each tile by its
    own header nodata, and we write one clean nodata out.
The hillshade is COMPUTED in the metric CRS (EPSG:2958) so slopes are physically
correct, then reprojected to Web Mercator for tiling.

Run:  pixi run hillshade
"""
from __future__ import annotations
import glob
import os
import rasterio
from rasterio.warp import transform_bounds
from osgeo import gdal

from ghost_rivers.config import CONFIG, resolve, ensure_dir
from ghost_rivers._util import run

gdal.UseExceptions()


def _select_tiles(tiles: list, bounds_2958) -> list:
    """Tiles whose footprint intersects the (buffered) study bbox in EPSG:2958."""
    minx, miny, maxx, maxy = bounds_2958
    hit = []
    for p in tiles:
        with rasterio.open(p) as ds:
            l, b, r, t = ds.bounds
        if not (r < minx or l > maxx or t < miny or b > maxy):
            hit.append(p)
    return hit


def main() -> None:
    cfg = CONFIG
    bbox = cfg["study_area"]["bbox_wgs84"]
    dtm_crs = cfg["crs"]["dtm"]      # EPSG:2958
    web_crs = cfg["crs"]["web"]      # EPSG:3857
    res = cfg["dtm"]["target_res_m"]
    resampling = cfg["dtm"].get("resampling", "bilinear")
    out_nodata = cfg["dtm"]["out_nodata"]
    margin = cfg["hillshade"]["margin_m"]
    zf = cfg["hillshade"]["z_factor"]
    multidir = cfg["hillshade"]["multidirectional"]
    azimuth = cfg["hillshade"].get("azimuth", 315)
    altitude = cfg["hillshade"].get("altitude", 45)

    interim = ensure_dir(resolve(cfg["paths"]["interim"]))
    processed = ensure_dir(resolve(cfg["paths"]["processed"]))
    mosaic = os.path.join(interim, "dtm_mosaic_1m_2958.tif")
    hs_2958 = os.path.join(interim, "hillshade_2958.tif")
    hs_3857 = os.path.join(processed, "hillshade_3857.tif")

    tiles = sorted(glob.glob(resolve(cfg["dtm"]["tiles_glob"])))
    if not tiles:
        raise SystemExit("ABORT: no DTM tiles found.")

    # study bbox -> metric CRS (densified), buffered by margin, for tile pick + mosaic
    b2958 = transform_bounds("EPSG:4326", dtm_crs, *bbox, densify_pts=21)
    mb = (b2958[0] - margin, b2958[1] - margin, b2958[2] + margin, b2958[3] + margin)
    sel = _select_tiles(tiles, mb)
    print(f"[3] {len(sel)}/{len(tiles)} DTM tiles intersect the buffered study bbox")
    if not sel:
        raise SystemExit("ABORT: no tiles cover the study area.")

    # ── mosaic -> 1 m, forced 2D EPSG:2958, per-tile nodata masked, one clean nodata out
    run(["gdalwarp",
         "-s_srs", dtm_crs, "-t_srs", dtm_crs,        # force plain 2D 2958 (drop CGVD2013)
         "-tr", res, res, "-r", resampling,
         "-te", mb[0], mb[1], mb[2], mb[3],
         "-dstnodata", out_nodata, "-ot", "Float32",
         "-of", "GTiff", "-co", "COMPRESS=DEFLATE", "-co", "PREDICTOR=3",
         "-co", "TILED=YES", "-wo", "NUM_THREADS=ALL_CPUS", "-multi", "-overwrite",
         *sel, mosaic])

    # confirm no nodata sentinel leaked into real values
    ds = gdal.Open(mosaic)
    bmin, bmax, bmean, _ = ds.GetRasterBand(1).ComputeStatistics(False)
    gt = ds.GetGeoTransform()
    print(f"[3] mosaic: {ds.RasterXSize}x{ds.RasterYSize} @ {gt[1]:g} m, "
          f"elev min={bmin:.2f} max={bmax:.2f} mean={bmean:.2f} m (nodata={out_nodata})")
    ds = None
    if bmax > 1e6 or bmin < -1e6:
        raise SystemExit(f"ABORT: nodata sentinel leaked into pixels (min={bmin}, max={bmax}).")

    # ── hillshade IN METRIC CRS (correct slopes) ───────────────────────────────
    hs_cmd = ["gdaldem", "hillshade", mosaic, hs_2958,
              "-z", zf, "-compute_edges",
              "-of", "GTiff", "-co", "COMPRESS=DEFLATE", "-co", "TILED=YES"]
    if multidir:
        hs_cmd.append("-multidirectional")
    else:
        hs_cmd += ["-az", azimuth, "-alt", altitude]
    run(hs_cmd)

    # ── reproject the hillshade to Web Mercator, clip to the EXACT study bbox ───
    b3857 = transform_bounds("EPSG:4326", web_crs, *bbox, densify_pts=21)
    run(["gdalwarp", "-s_srs", dtm_crs, "-t_srs", web_crs,
         "-te", b3857[0], b3857[1], b3857[2], b3857[3],
         "-r", "bilinear", "-dstalpha",
         "-of", "GTiff", "-co", "COMPRESS=DEFLATE", "-co", "TILED=YES", "-overwrite",
         hs_2958, hs_3857])

    info = gdal.Info(hs_3857, format="json")
    gt = info["geoTransform"]
    sz = info["size"]
    print(f"\n[✓] wrote {hs_3857}")
    print(f"    CRS: {web_crs}   size: {sz[0]}x{sz[1]}   pixel: {gt[1]:.3f} m (Web Mercator)")
    print(f"    bands: {len(info['bands'])} (gray + alpha)   "
          f"extent(3857): [{b3857[0]:.1f}, {b3857[1]:.1f}, {b3857[2]:.1f}, {b3857[3]:.1f}]")


if __name__ == "__main__":
    main()
