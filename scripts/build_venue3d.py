"""Turn Ground Floor Plan V2 into the 3D venue's data and floor texture.

    python scripts/build_venue3d.py "path/to/Ground Floor Plan V2.pdf"

Everything is measured in pixels of a 200 dpi render, then converted to
metres with one scale: the stalls are 3 m x 2 m, and their rectangles
measure 89 x 59 px, so 29.6 px is a metre.

Stall numbers come from the PDF's own text layer, each paired with the
amber rectangle it sits in; desks, the photo booth and the closed areas
are found by the colours the plan's legend gives them. Writes
lib/venue-3d.ts and public/map/ground-v2.webp.
"""
import json, os, re, sys
import numpy as np, cv2, fitz
from PIL import Image

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = sys.argv[1] if len(sys.argv) > 1 else "Ground Floor Plan V2.pdf"

# ---- read the plan -----------------------------------------------------------
DPI = 200
SC = DPI / 72.0
page = fitz.open(PDF)[0]
pix = page.get_pixmap(dpi=DPI)
render = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].copy()
hsv_all = cv2.cvtColor(render, cv2.COLOR_RGB2HSV)


def components(mask, min_area):
    n, _, st, _ = cv2.connectedComponentsWithStats(mask, 8)
    return [list(map(int, st[i][:4])) for i in range(1, n) if st[i][4] > min_area]


labels_in_pdf = {
    w[4]: ((w[0] + w[2]) / 2 * SC, (w[1] + w[3]) / 2 * SC)
    for w in page.get_text("words")
    if re.fullmatch(r"S\d{1,2}", w[4])
}
amber = components(cv2.inRange(hsv_all, (15, 90, 150), (32, 255, 255)), 400)
g = {"stalls": {}}
for name, (cx, cy) in labels_in_pdf.items():
    hit = [r for r in amber if r[0] <= cx <= r[0] + r[2] and r[1] <= cy <= r[1] + r[3]]
    if hit:
        g["stalls"][name] = min(hit, key=lambda r: r[2] * r[3])
unmatched = sorted(set(labels_in_pdf) - set(g["stalls"]))
if unmatched:
    sys.exit(f"stall labels with no rectangle: {unmatched}")

magenta = cv2.inRange(hsv_all, (140, 120, 150), (170, 255, 255))
blue = cv2.inRange(hsv_all, (105, 150, 120), (130, 255, 255))
red = cv2.inRange(hsv_all, (0, 170, 170), (6, 255, 255)) | cv2.inRange(hsv_all, (174, 170, 170), (180, 255, 255))
g["desks"] = [r for r in components(magenta, 300) if r[1] < 2260]
g["booth"] = [r for r in components(blue, 150) if r[1] < 2200]
g["unused"] = [r for r in components(red, 600) if r[1] < 2200]

PX_PER_M = 29.6
CROP = (300, 330, 3300, 2290)          # building + forecourt, legend excluded
CX = (CROP[0] + CROP[2]) / 2
CY = (CROP[1] + CROP[3]) / 2


def mx(px):  # east-west, metres from the centre
    return round((px - CX) / PX_PER_M, 2)


def mz(py):  # north-south, metres from the centre (south is +z, toward the viewer)
    return round((py - CY) / PX_PER_M, 2)


def box(x0, y0, x1, y1):
    """A pixel rectangle as centre + size in metres."""
    return {
        "x": mx((x0 + x1) / 2), "z": mz((y0 + y1) / 2),
        "w": round((x1 - x0) / PX_PER_M, 2), "d": round((y1 - y0) / PX_PER_M, 2),
    }


# ---- stalls ---------------------------------------------------------------
ZONES = [
    # (first, last, zone key, facing) — facing is the side open to the aisle
    (1, 10, "forecourt", "north"),
    (11, 20, "forecourt", "south"),
    (21, 31, "dining", "north"),
    (32, 32, "dining", "east"),
    (33, 36, "south-corridor", "north"),
    (37, 39, "lobby", "north"),
    (40, 42, "lobby", "south"),
    (43, 54, "north-corridor", "south"),
]

stalls = []
for code, (x, y, w, h) in sorted(g["stalls"].items(), key=lambda kv: int(kv[0][1:])):
    n = int(code[1:])
    zone, facing = next((z, f) for a, b, z, f in ZONES if a <= n <= b)
    b = box(x, y, x + w, y + h)
    stalls.append({"code": code, "zone": zone, "facing": facing, **b})

# ---- registration desks: 13 segments, clustered into desks by row and gap --
# The legend's own magenta swatch sits bottom-left; it is not a desk.
segs = sorted([r for r in g["desks"] if not (r[0] < 1100 and r[1] > 2245)],
              key=lambda r: (round(r[1] / 40), r[0]))
desks, cur = [], None
for x, y, w, h in segs:
    if cur and abs(y - cur[1]) < 20 and x - cur[2] < 6:
        cur[2] = x + w
        cur[3] = max(cur[3], y + h)
    else:
        if cur:
            desks.append(cur)
        cur = [x, y, x + w, y + h]
desks.append(cur)
desks = [box(*d) for d in desks]

# ---- photo booth, closures, entrance ----------------------------------------
backdrop = min(g["booth"], key=lambda r: r[2])            # the thin bar
booth_area = max(g["booth"], key=lambda r: r[2] * r[3])
photo = {"backdrop": box(backdrop[0], backdrop[1], backdrop[0] + backdrop[2], backdrop[1] + backdrop[3]),
         "area": box(booth_area[0], booth_area[1], booth_area[0] + booth_area[2], booth_area[1] + booth_area[3])}

closed = []
for x, y, w, h in g["unused"]:
    kind = "entry-closed" if h > w else "unused"
    closed.append({"kind": kind, **box(x, y, x + w, y + h)})

entrance = box(2033, 2040, 2233, 2075)

# ---- the building's volumes, read off the plan's own grid ------------------
# (kind, x0, y0, x1, y1, height m)
VOLUMES = [
    ("stage",      1203,  842, 1475, 1592, 1.0),
    ("block",       950,  617, 1203, 1603, 3.2),   # VIP lounge / green rooms
    ("block",       353, 1413,  775, 1808, 3.2),   # lifts, stair, store
    ("block",       383,  442,  750,  500, 3.2),   # reception stair (top)
    ("block",       383,  500,  440,  725, 3.2),   # reception stair (side)
    ("block",      2725,  617, 3000, 1808, 3.2),   # toilets, offices
    ("block",      3000, 1300, 3242, 1808, 3.2),   # electrical, UPS, AV
    ("block",      2650, 1808, 3242, 2063, 3.2),   # kitchen and expansion
    ("block",      1133,  400, 1267,  492, 3.0),   # north service room
    ("ramp",       3000,  375, 3242, 1300, 0.35),
]
volumes = [{"kind": k, "h": hgt, **box(x0, y0, x1, y1)} for k, x0, y0, x1, y1, hgt in VOLUMES]

# Main hall: four walls around the seating, so it reads as a room you look
# into rather than a slab you look at.
HALL = (1463, 617, 2653, 1603)
T = 12  # wall thickness in px (~0.4 m)
hall_walls = [
    (HALL[0], HALL[1], HALL[2], HALL[1] + T),
    (HALL[0], HALL[3] - T, HALL[2], HALL[3]),
    (HALL[2] - T, HALL[1], HALL[2], HALL[3]),
]
# Exterior walls, with the gaps the plan leaves: the closed west entry and
# the new main entrance on the south.
EXT = [
    (353, 417, 3000, 417 + T),                 # north
    (353, 417, 353 + T, 817),                  # west, above the closed entry
    (353, 1328, 353 + T, 1808),                # west, below it
    (353, 1808 - T, 1208, 1808),               # south, west block
    (1208, 1808, 1208 + T, 2063),              # dining hall, west
    (1208, 2063 - T, 2033, 2063),              # dining hall south, left of entrance
    (2233, 2063 - T, 2650, 2063),              # dining hall south, right of entrance
    (1208, 1808 - T, 2650, 1808),              # corridor / dining hall divide
]
walls = [{"kind": "hall-wall", "h": 3.6, **box(*w)} for w in hall_walls] + \
        [{"kind": "wall", "h": 2.8, **box(*w)} for w in EXT]

LABELS = [
    # Most important first: when two would overlap on screen, the later one
    # gives way.
    ("Main Hall", "1500 seats", 2058, 1110),
    ("Main Entrance", None, 2133, 2110),
    ("Stage", None, 1339, 1217),
    ("Registration", None, 1500, 2205),
    ("Forecourt", "Stalls S1–S20", 2720, 2330),
    ("Dining Hall", "Stalls S21–S32", 1700, 1905),
    ("North Corridor", "Stalls S43–S54", 1870, 560),
    ("South Corridor", "Stalls S33–S36", 2100, 1740),
    ("Lobby", "Stalls S37–S42", 560, 900),
    ("Toilets", None, 2860, 1100),
    ("Photo Booth", None, 660, 1120),
    ("Entry closed", None, 420, 1070),
]
labels = [{"title": t, "sub": s, "x": mx(x), "z": mz(y)} for t, s, x, y in LABELS]

scene = {
    "pxPerM": PX_PER_M,
    "floor": {"w": round((CROP[2] - CROP[0]) / PX_PER_M, 2), "d": round((CROP[3] - CROP[1]) / PX_PER_M, 2),
              "texture": "/map/ground-v2.webp"},
    "stalls": stalls, "desks": desks, "photo": photo, "closed": closed,
    "entrance": entrance, "volumes": volumes, "walls": walls, "labels": labels,
}

# ---- floor texture ------------------------------------------------------------
img = cv2.cvtColor(render, cv2.COLOR_RGB2BGR)
img[2245:2340, 0:1100] = 255                     # the legend
crop = img[CROP[1]:CROP[3], CROP[0]:CROP[2]]
# Knock back the saturated overlays the 3D objects replace, so a stall's
# amber never shows round the edge of its booth, and lift the drawing a
# little so what stands on it reads first.
hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
sat = hsv[:, :, 1] > 90
gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
crop[sat] = np.stack([gray] * 3, axis=-1)[sat]
# Deepen it slightly instead: the plan is drawn faded, and the booths need a
# ground they stand out against.
crop = cv2.addWeighted(crop, 1.12, np.zeros_like(crop), 0, -18)
rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
tex = Image.fromarray(rgb).resize((2560, round(2560 * crop.shape[0] / crop.shape[1])), Image.LANCZOS)
os.makedirs(os.path.join(APP, "public", "map"), exist_ok=True)
out = os.path.join(APP, "public", "map", "ground-v2.webp")
tex.save(out, "WEBP", quality=80, method=6)

# ---- write the TypeScript module ------------------------------------------------
ts = '''/**
 * The ground floor of the convention centre, as the 3D map draws it.
 *
 * Generated from "Ground Floor Plan V2" by scripts/build_venue3d.py — edit
 * the plan or the script, not this file. One scale throughout: the stalls
 * are 3 m x 2 m, and on the plan they measure 89 x 59 px at 200 dpi, which
 * makes 29.6 px a metre. Coordinates are metres from the middle of the
 * drawing: x runs east, z runs south, toward the main entrance.
 */

export interface Footprint {
  x: number;
  z: number;
  w: number;
  d: number;
}

export type StallZone =
  | "forecourt"
  | "dining"
  | "south-corridor"
  | "lobby"
  | "north-corridor";

export interface Stall extends Footprint {
  code: string;
  zone: StallZone;
  /** The side open to the aisle. */
  facing: "north" | "south" | "east" | "west";
}

export interface Volume extends Footprint {
  kind: "stage" | "block" | "ramp" | "wall" | "hall-wall";
  h: number;
}

export interface MapLabel {
  title: string;
  sub: string | null;
  x: number;
  z: number;
}

export const VENUE_3D = ''' + json.dumps(scene, indent=2, ensure_ascii=False) + ''' as const;

export const STALLS: readonly Stall[] = VENUE_3D.stalls as unknown as Stall[];

export const ZONE_NAMES: Record<StallZone, string> = {
  forecourt: "Forecourt, outside the main entrance",
  dining: "Dining Hall exhibition",
  "south-corridor": "South corridor",
  lobby: "West lobby",
  "north-corridor": "North corridor",
};
'''
open(os.path.join(APP, "lib", "venue-3d.ts"), "w", encoding="utf-8", newline="\n").write(ts)
print("stalls", len(stalls), "| desks", len(desks), "| closed", len(closed),
      "| volumes", len(volumes), "| walls", len(walls))
print("floor", scene["floor"], "| texture KB", os.path.getsize(out) // 1024, "|", tex.size)
