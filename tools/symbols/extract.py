#!/usr/bin/env python3
"""Extract the IEC 60617 symbol table from the source PDF into symbol SVGs.

The source is a three-column table — symbol | description | comments. Each
symbol cell holds a 1-bit image mask (a Visio-style export), drawn over a dotted
layout grid. For every table row this:

  1. renders the symbol cell at the mask's own resolution, so no detail is
     invented or lost;
  2. drops the grid dots (small isolated components) and any cell border;
  3. traces the remaining ink to Bezier outlines with potrace;
  4. normalises the outline into the shared 120x80 viewBox.

The result is the standard's own artwork as vector paths, not a redrawing.

    python3 tools/symbols/extract.py <source.pdf> [rows.json]
"""
import json
import sys
from collections import Counter

import numpy as np
import potrace
import pymupdf
from scipy import ndimage

VIEW_W, VIEW_H = 120.0, 80.0
COLUMNS = (53.9, 256.8, 437.5, 520.6)  # symbol | description | comments
PAD = 5.0
DOT_AREA = 12       # px: isolated blobs at or below this are layout-grid dots
DOT_SPAN = 5        # px: ...and no wider/taller than this
MAX_UNITS_PER_PX = 0.42  # cap magnification so stroke weight stays comparable
SUPERSAMPLE = 2     # render above native resolution so tracing stays smooth


def fmt(v):
    # one decimal on a 120x80 viewBox is well under a pixel on screen and
    # roughly halves the size of the generated file
    return f"{v:.1f}".rstrip("0").rstrip(".")


def cell_bitmap(page, info):
    """Render one symbol cell at (a multiple of) the mask's own resolution."""
    bbox = pymupdf.Rect(info["bbox"])
    if bbox.width <= 1 or bbox.height <= 1:
        return None
    dpi = int(round(info["width"] / bbox.width * 72)) * SUPERSAMPLE
    dpi = max(150, min(dpi, 900))
    pix = page.get_pixmap(dpi=dpi, clip=bbox, colorspace=pymupdf.csGRAY)
    a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width)
    return a < 128  # True where there is ink


def clean(ink):
    """Drop the dotted layout grid and any stray speck."""
    lab, n = ndimage.label(ink, structure=np.ones((3, 3), bool))
    if n == 0:
        return ink
    keep = np.zeros(n + 1, bool)
    scale = max(1, ink.shape[1] // 220)  # thresholds are in source-image pixels
    objs = ndimage.find_objects(lab)
    spans = [max(s[0].stop - s[0].start, s[1].stop - s[1].start) for s in objs]
    areas = [int((lab[s] == i).sum()) for i, s in enumerate(objs, start=1)]
    # the grid is drawn as dots far smaller than any stroke, so judge each blob
    # against the largest one as well as against an absolute floor
    area_cut = max(DOT_AREA * scale * scale, 0.008 * max(areas))
    span_cut = max(DOT_SPAN * scale, 0.045 * max(spans))
    # the grid repeats one blob size many times over; find that size and treat
    # every blob of it as grid, which catches the dots a fixed cut-off misses
    small = [a for a, sp in zip(areas, spans) if sp <= 0.06 * max(spans)]
    lattice = None
    if len(small) >= 5:
        common = Counter(small).most_common(1)[0]
        if common[1] >= 5:
            lattice = common[0]
    for i, (area, span) in enumerate(zip(areas, spans), start=1):
        if area <= area_cut and span <= span_cut:
            continue  # grid dot
        if lattice is not None and abs(area - lattice) <= 1 and span <= 0.06 * max(spans):
            continue  # grid dot of the repeating size
        keep[i] = True
    return keep[lab]


def trace(ink):
    """Trace an ink mask to an SVG path on the shared viewBox."""
    ys, xs = np.nonzero(ink)
    if len(xs) == 0:
        return None
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    crop = ink[y0:y1, x0:x1]
    # potrace reads dark pixels as foreground, so hand it ink-on-white
    bmp = potrace.Bitmap((~crop).astype(np.uint8) * 255)
    path = bmp.trace(turdsize=3, alphamax=1.0, opttolerance=0.6)

    h, w = crop.shape
    scale = min((VIEW_W - 2 * PAD) / w, (VIEW_H - 2 * PAD) / h, MAX_UNITS_PER_PX)
    ox = (VIEW_W - w * scale) / 2
    oy = (VIEW_H - h * scale) / 2

    def P(p):
        return fmt(p.x * scale + ox), fmt(p.y * scale + oy)

    out = []
    for curve in path:
        sx, sy = P(curve.start_point)
        d = [f"M{sx} {sy}"]
        for seg in curve:
            if seg.is_corner:
                cx, cy = P(seg.c)
                ex, ey = P(seg.end_point)
                d.append(f"L{cx} {cy}L{ex} {ey}")
            else:
                c1x, c1y = P(seg.c1)
                c2x, c2y = P(seg.c2)
                ex, ey = P(seg.end_point)
                d.append(f"C{c1x} {c1y} {c2x} {c2y} {ex} {ey}")
        d.append("z")
        out.append("".join(d))
    if not out:
        return None
    return f'<path d="{"".join(out)}" fill="currentColor" stroke="none" fill-rule="evenodd"/>'


def rules(page):
    hor, ver = set(), set()
    for d in page.get_drawings():
        r = d["rect"]
        if r.width > 300 and r.height < 3:
            hor.add(round(r.y0, 1))
        if r.height > 300 and r.width < 3:
            ver.add(round(r.x0, 1))
    return sorted(hor), sorted(ver)


def cell_text(page, clip):
    words = page.get_text("words", clip=pymupdf.Rect(*clip))
    lines = {}
    for x0, y0, x1, y1, word, *_ in words:
        lines.setdefault(round(y0 / 3), []).append((x0, word))
    return " ".join(
        " ".join(w for _, w in sorted(ws)) for _, ws in sorted(lines.items())
    ).strip()


def extract(path):
    doc = pymupdf.open(path)
    rows = []
    for pno in range(doc.page_count):
        page = doc[pno]
        hor, ver = rules(page)
        if len(ver) < 3:
            ver = COLUMNS  # a few pages draw no vertical rules; the grid is fixed
        images = [i for i in page.get_image_info(xrefs=True) if i["bbox"][2] <= ver[1] + 2]
        if len(hor) >= 3:
            bands = list(zip(hor[1:-1], hor[2:]))
        else:
            # no row rules either: one band per symbol image
            bands = [(i["bbox"][1] - 5, i["bbox"][3] + 5)
                     for i in sorted(images, key=lambda i: i["bbox"][1])]
        for top, bot in bands:
            if bot - top < 8:
                continue
            desc = cell_text(page, (ver[1], top, ver[2], bot))
            comment = cell_text(page, (ver[2], top, ver[3] if len(ver) > 3 else 595, bot))
            band = [i for i in images if top - 1 <= (i["bbox"][1] + i["bbox"][3]) / 2 <= bot + 1]
            svg = None
            if band:
                merged = max(band, key=lambda i: (i["bbox"][2] - i["bbox"][0]) * (i["bbox"][3] - i["bbox"][1]))
                if len(band) > 1:  # a cell split across several masks: render the union
                    x0 = min(i["bbox"][0] for i in band)
                    y0 = min(i["bbox"][1] for i in band)
                    x1 = max(i["bbox"][2] for i in band)
                    y1 = max(i["bbox"][3] for i in band)
                    merged = dict(merged, bbox=(x0, y0, x1, y1),
                                  width=max(i["width"] for i in band))
                ink = cell_bitmap(page, merged)
                if ink is not None:
                    svg = trace(clean(ink))
            if not svg and not desc:
                continue
            rows.append({"page": pno + 1, "desc": desc, "comment": comment, "svg": svg or ""})
    return rows


if __name__ == "__main__":
    rows = extract(sys.argv[1])
    out = sys.argv[2] if len(sys.argv) > 2 else "rows.json"
    json.dump(rows, open(out, "w"), ensure_ascii=False, indent=1)
    missing = sum(1 for r in rows if not r["svg"])
    print(f"{len(rows)} rows, {missing} without artwork -> {out}")
