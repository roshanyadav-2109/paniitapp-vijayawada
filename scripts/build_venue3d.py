"""Turn the NICC brief's stall layout into the 3D venue's data and floor texture.

    python scripts/build_venue3d.py "path/to/NICC PROJECT BRIEF - with Exhibition Stall Layout.pdf"

Page 3 of the brief is the ground floor with the architects' stall layer
drawn over it as vectors: every stall bay, keep-clear zone, visitor aisle,
blocked doorway and backdrop is a filled rectangle in its own colour, so
nothing here is traced by eye. Each bay is paired with the "S" number
written inside it.

One scale for everything, taken from the longest dimension on the drawing
rather than the shortest: grid line 1 to grid line 18 is 87.2 m and spans
2,614 px at 200 dpi, so 30.0 px is a metre. (The bays measure 92 x 61 px,
a shade over 3 m x 2 m; they are drawn here at exactly 3 m x 2 m about
their centres.)

Writes lib/venue-3d.ts and public/map/ground-floor.webp.
"""
import json, os, re, sys
import numpy as np, cv2, fitz
from PIL import Image

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = sys.argv[1] if len(sys.argv) > 1 else "NICC PROJECT BRIEF - with Exhibition Stall Layout.pdf"
PAGE = 2                      # "GROUND FLOOR - EVENT & EXHIBITION STALL LAYOUT"

DPI = 200
SC = DPI / 72.0
PX_PER_M = 30.0
CROP = (300, 330, 3300, 2140)          # the building; the legend starts below
CX = (CROP[0] + CROP[2]) / 2
CY = (CROP[1] + CROP[3]) / 2


def mx(px):
    return round((px - CX) / PX_PER_M, 2)


def mz(py):
    return round((py - CY) / PX_PER_M, 2)


def box(x0, y0, x1, y1):
    return {"x": mx((x0 + x1) / 2), "z": mz((y0 + y1) / 2),
            "w": round((x1 - x0) / PX_PER_M, 2), "d": round((y1 - y0) / PX_PER_M, 2)}


# ---- read the drawing's stall layer ------------------------------------------------
page = fitz.open(PDF)[PAGE]


def near(c, t, tol=0.02):
    return bool(c) and all(abs(a - b) < tol for a, b in zip(c, t))


bays, keep, aisles, blocked, backdrops = [], [], [], [], []
for d in page.get_drawings():
    r = d["rect"]
    b = [r.x0 * SC, r.y0 * SC, r.x1 * SC, r.y1 * SC]
    if b[1] > 2150:                           # the legend
        continue
    f = d.get("fill")
    if near(f, (0.86, 0.91, 0.96)):
        bays.append(b)
    elif near(f, (0.99, 0.92, 0.85)):
        keep.append(b)
    elif near(f, (0.79, 0.95, 0.90)):
        aisles.append(b)
    elif near(f, (0.95, 0.83, 0.82)):
        blocked.append(b)
    elif near(f, (0.11, 0.13, 0.17)):
        backdrops.append(b)

words = [(w[4], (w[0] + w[2]) / 2 * SC, (w[1] + w[3]) / 2 * SC) for w in page.get_text("words")]

# ---- stalls ----------------------------------------------------------------------------
# Three areas, told apart by where they sit on the plan. Each numbers its own
# stalls from S1, so a stall's unique code carries its area: PF2-S4, EX-S17.
# (y band in px, key, facing) — facing is the side open to the aisle.
AREAS = [
    ((400, 600), "prefunction-2", "south"),
    ((1700, 1815), "prefunction-1", "north"),
    ((1815, 1900), "exhibition", "south"),
    ((1950, 2060), "exhibition", "north"),
]
PREFIX = {"prefunction-2": "PF2", "prefunction-1": "PF1", "exhibition": "EX"}

stalls = []
for x0, y0, x1, y1 in bays:
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    label = next((t for t, wx, wy in words
                  if re.fullmatch(r"S\d{1,2}", t) and x0 <= wx <= x1 and y0 <= wy <= y1), None)
    if not label:
        sys.exit(f"a bay with no number at {round(cx)},{round(cy)}")
    zone, facing = next((k, f) for (lo, hi), k, f in AREAS if lo <= cy < hi)
    stalls.append({
        "code": f"{PREFIX[zone]}-{label}", "label": label, "zone": zone, "facing": facing,
        "x": mx(cx), "z": mz(cy), "w": 3.0, "d": 2.0,
    })
order = ["exhibition", "prefunction-1", "prefunction-2"]
stalls.sort(key=lambda s: (order.index(s["zone"]), int(s["label"][1:])))
codes = [s["code"] for s in stalls]
if len(set(codes)) != len(codes):
    sys.exit("two stalls share a code")

# ---- building -------------------------------------------------------------------------
T = 12  # wall thickness, px
VOLUMES = [
    ("stage",  1203,  842, 1475, 1592, 1.0),
    ("block",   950,  617, 1203, 1603, 3.2),   # VIP lounge, green rooms
    ("block",   353, 1413,  775, 1808, 3.2),   # lifts, stair, store
    ("block",   383,  442,  750,  500, 3.2),   # reception stair
    ("block",   383,  500,  440,  725, 3.2),
    ("block",  2725,  617, 3000, 1808, 3.2),   # toilets, offices
    ("block",  3000, 1300, 3242, 1808, 3.2),   # electrical, UPS, AV
    ("block",  2650, 1808, 3242, 2063, 3.2),   # kitchen and expansion
    ("block",  1133,  400, 1267,  492, 3.0),   # north service room
    ("ramp",   3000,  375, 3242, 1300, 0.35),
]
volumes = [{"kind": k, "h": h, **box(x0, y0, x1, y1)} for k, x0, y0, x1, y1, h in VOLUMES]


def wall_with_gaps(x0, y0, x1, y1, gaps, horizontal=True):
    """A straight wall, broken wherever there is a door."""
    pieces, cur = [], (x0 if horizontal else y0)
    end = x1 if horizontal else y1
    for g0, g1 in sorted(gaps):
        if g0 > cur:
            pieces.append((cur, g0))
        cur = max(cur, g1)
    if cur < end:
        pieces.append((cur, end))
    return [(a, y0, b, y1) if horizontal else (x0, a, x1, b) for a, b in pieces]


# The doors in the corridor / dining hall divide are the keep-clear zones that
# straddle it; the fire exits are the one against the south wall.
DIVIDE_Y = 1808
divide_doors = sorted({(round(k[0]), round(k[2])) for k in keep
                       if k[1] < DIVIDE_Y + 20 and k[3] > DIVIDE_Y - 20 and k[2] - k[0] < 260})
def zone_text(r):
    return " ".join(t for t, wx, wy in words if r[0] - 4 <= wx <= r[2] + 4 and r[1] - 4 <= wy <= r[3] + 4)


# Only the zone the drawing itself calls a fire exit; the wash basins and
# service access beside it are not a door in the south wall.
fire_exits = [(round(k[0]), round(k[2])) for k in keep if "FIRE" in zone_text(k).upper()]
NORTH_ENTRY = (1880, 2040)     # the double doors behind the 12.7 m keep-clear
WEST_ENTRY = (880, 1170)       # the lobby's doors, which the backdrops face

walls = []
HALL = (1463, 617, 2653, 1603)
for w in [(HALL[0], HALL[1], HALL[2], HALL[1] + T), (HALL[0], HALL[3] - T, HALL[2], HALL[3]),
          (HALL[2] - T, HALL[1], HALL[2], HALL[3])]:
    walls.append({"kind": "hall-wall", "h": 3.6, **box(*w)})
ext = []
ext += wall_with_gaps(353, 417, 3000, 417 + T, [NORTH_ENTRY])
ext += wall_with_gaps(353, 417, 353 + T, 1808, [WEST_ENTRY], horizontal=False)
ext += [(353, 1808 - T, 1208, 1808), (1208, 1808, 1208 + T, 2063)]
ext += wall_with_gaps(1208, 2063 - T, 2650, 2063, fire_exits)
ext += wall_with_gaps(1208, DIVIDE_Y - T // 2, 2650, DIVIDE_Y + T // 2, divide_doors)
walls += [{"kind": "wall", "h": 2.8, **box(*w)} for w in ext]

# ---- what the stall layer adds -------------------------------------------------------------
keep_zones = [{**box(*r), "text": zone_text(r)[:60] or None} for r in keep]
aisle_zones = [box(*a) for a in aisles]
blocked_zones = [box(*b) for b in blocked]
backdrop_panels = []
for b in sorted(backdrops, key=lambda b: b[1]):
    kind = "checkered" if not backdrop_panels else "media"
    backdrop_panels.append({"kind": kind, **box(*b)})

# The one-way loop through the exhibition: in along the south row from S1,
# round at the east end, back along the north row to S22.
loop_west, loop_east = 1300, 2480
lane_south, lane_north = 1962, 1910
loop = []
for x in range(loop_west + 60, loop_east - 40, 190):
    loop.append({"x": mx(x), "z": mz(lane_south), "dir": "east"})
    loop.append({"x": mx(x + 95), "z": mz(lane_north), "dir": "west"})
start = next(((wx, wy) for t, wx, wy in words if t == "START"), (1329, 1972))

entrances = [
    {"name": "Main entrance", "x": mx(353 - 45), "z": mz(sum(WEST_ENTRY) / 2),
     "w": round((WEST_ENTRY[1] - WEST_ENTRY[0]) / PX_PER_M, 2), "facing": "east"},
    {"name": "Main entry", "x": mx(sum(NORTH_ENTRY) / 2), "z": mz(417 - 45),
     "w": round((NORTH_ENTRY[1] - NORTH_ENTRY[0]) / PX_PER_M, 2), "facing": "south"},
]

LABELS = [
    # Most important first: when two would overlap on screen, the later one gives way.
    ("Main Hall", "1500 seats", 2058, 1110),
    ("Main entrance", "Entrance lobby", 560, 1320),
    ("Exhibition Area", "Dining hall · 22 stalls", 1650, 1936),
    ("Pre-function Area 1", "15 stalls", 2300, 1700),
    ("Pre-function Area 2", "10 stalls", 2300, 575),
    ("Stage", None, 1339, 1217),
    ("Main entry", "North doors", 1960, 360),
    ("Backdrops", "Checkered · Media", 532, 1045),
    ("Loop start", "S1", start[0], start[1] + 35),
    ("Toilets", None, 2860, 1100),
    ("Kitchen", None, 2950, 1935),
]
labels = [{"title": t, "sub": s, "x": mx(x), "z": mz(y)} for t, s, x, y in LABELS]

scene = {
    "pxPerM": PX_PER_M,
    "floor": {"w": round((CROP[2] - CROP[0]) / PX_PER_M, 2), "d": round((CROP[3] - CROP[1]) / PX_PER_M, 2),
              "texture": "/map/ground-floor.webp"},
    "stalls": stalls, "volumes": volumes, "walls": walls,
    "keepClear": keep_zones, "aisles": aisle_zones, "blocked": blocked_zones,
    "backdrops": backdrop_panels, "loop": loop,
    "loopStart": {"x": mx(start[0]), "z": mz(start[1])},
    "entrances": entrances, "labels": labels,
}

# ---- floor texture ----------------------------------------------------------------------------
pix = page.get_pixmap(dpi=DPI)
render = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].copy()
img = cv2.cvtColor(render, cv2.COLOR_RGB2BGR)
crop = img[CROP[1]:CROP[3], CROP[0]:CROP[2]].copy()
# Soften the architect's colours a little so what stands on the drawing reads
# first, but keep them: the pink service rooms and the keep-clear zones are
# information.
hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV).astype(np.float32)
hsv[:, :, 1] *= 0.7
crop = cv2.cvtColor(hsv.clip(0, 255).astype(np.uint8), cv2.COLOR_HSV2BGR)
crop = cv2.addWeighted(crop, 1.08, np.zeros_like(crop), 0, -10)
rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
tex = Image.fromarray(rgb).resize((2560, round(2560 * crop.shape[0] / crop.shape[1])), Image.LANCZOS)
os.makedirs(os.path.join(APP, "public", "map"), exist_ok=True)
out = os.path.join(APP, "public", "map", "ground-floor.webp")
tex.save(out, "WEBP", quality=80, method=6)

# ---- write the TypeScript module ---------------------------------------------------------------
ts = '''/**
 * The ground floor of the convention centre, as the 3D map draws it.
 *
 * Generated from page 3 of the NICC project brief ("Event & Exhibition Stall
 * Layout") by scripts/build_venue3d.py — edit the drawing or the script,
 * not this file. Coordinates are metres from the middle of the drawing: x
 * runs east, z runs south.
 */

export interface Footprint {
  x: number;
  z: number;
  w: number;
  d: number;
}

export type StallZone = "exhibition" | "prefunction-1" | "prefunction-2";

export interface Stall extends Footprint {
  /** Unique across the venue, and what booth_number holds: EX-S14, PF1-S3. */
  code: string;
  /** As printed on the plan and on the stall itself: S14. */
  label: string;
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
  exhibition: "Exhibition Area, dining hall",
  "prefunction-1": "Pre-function Area 1, south corridor",
  "prefunction-2": "Pre-function Area 2, north corridor",
};
'''
open(os.path.join(APP, "lib", "venue-3d.ts"), "w", encoding="utf-8", newline="\n").write(ts)

by_zone = {}
for s in stalls:
    by_zone[s["zone"]] = by_zone.get(s["zone"], 0) + 1
print("stalls", len(stalls), by_zone)
print("keep-clear", len(keep_zones), "| aisles", len(aisle_zones), "| blocked", len(blocked_zones),
      "| backdrops", len(backdrop_panels), "| loop arrows", len(loop))
print("divide doors", divide_doors, "| fire exits", fire_exits)
print("floor", scene["floor"], "| texture KB", os.path.getsize(out) // 1024)
