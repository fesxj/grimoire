"""Image metadata helpers for map endpoints."""
import re
from pathlib import Path
from typing import Optional

from PIL import Image as PILImage  # type: ignore[import-untyped]


# Matches: (20x25), [30 by 40], 20x25, 20 X 25, 20×25, 20 by 25, 20-by-25
_DIM_RE = re.compile(r"[\(\[]?\b(\d{1,3})\s*(?:[xX×]|(?:[Bb][Yy])|-[Bb][Yy]-)\s*(\d{1,3})\b[\)\]]?")


def _parse_grid_dims(text: str) -> Optional[tuple[int, int]]:
    m = _DIM_RE.search(text)
    if m:
        w, h = int(m.group(1)), int(m.group(2))
        if 2 <= w <= 300 and 2 <= h <= 300:
            return w, h
    return None


def _estimate_grid(
    px_w: int, px_h: int, dpi: Optional[float] = None
) -> Optional[tuple[int, int, int]]:
    """Return (grid_w, grid_h, cell_px) for the best-fitting common cell size."""
    candidates = [50, 70, 100, 140, 150, 200, 250, 300]
    if dpi and int(dpi) not in candidates:
        candidates.append(int(dpi))
    best: Optional[tuple[int, int, int]] = None
    best_err = 0.06
    for cell in sorted(candidates):
        wc = px_w / cell
        hc = px_h / cell
        err = (abs(wc - round(wc)) + abs(hc - round(hc))) / 2
        if err < best_err and round(wc) >= 2 and round(hc) >= 2:
            best_err = err
            best = (round(wc), round(hc), cell)
    return best


def _map_image_info(filepath: str, relative_path: str) -> dict:
    info: dict = {"pixel_width": None, "pixel_height": None, "dpi": None, "grid": None}
    try:
        img = PILImage.open(filepath)
        info["pixel_width"], info["pixel_height"] = img.size
        raw_dpi = img.info.get("dpi")
        if raw_dpi:
            dpi_val = float(raw_dpi[0]) if isinstance(raw_dpi, (tuple, list)) else float(raw_dpi)
            if 10 < dpi_val < 2000:
                info["dpi"] = round(dpi_val)
        img.close()
    except Exception:
        return info

    pw, ph = info["pixel_width"], info["pixel_height"]

    # 1. Parse grid dimensions from filename and folder names
    for part in reversed(Path(relative_path).parts):
        dims = _parse_grid_dims(part)
        if dims:
            info["grid"] = {"width": dims[0], "height": dims[1], "source": "filename"}
            break

    if not info["grid"] and pw and ph:
        # 2. DPI-based: TTRPG standard is 1 inch = 1 cell
        if info["dpi"]:
            gw = round(pw / info["dpi"])
            gh = round(ph / info["dpi"])
            err = (abs(pw / info["dpi"] - gw) + abs(ph / info["dpi"] - gh)) / 2
            if 2 <= gw <= 300 and 2 <= gh <= 300 and err < 0.05:
                info["grid"] = {"width": gw, "height": gh, "cell_px": info["dpi"], "source": "dpi"}

        # 3. Estimate from common pixel-per-cell sizes
        if not info["grid"]:
            est = _estimate_grid(pw, ph, info["dpi"])
            if est:
                info["grid"] = {
                    "width": est[0],
                    "height": est[1],
                    "cell_px": est[2],
                    "source": "computed",
                }

    return info
