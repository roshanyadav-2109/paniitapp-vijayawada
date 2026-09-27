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

Also reads the base drawing itself: every seat in the main hall (each is an
orange ring with a hollow centre, so each hollow is a seat) and every
structural column (a grey square in a magenta outline).

Writes lib/venue-3d.ts (the stalls, which the page needs), lib/venue-3d-scene.ts
(the building, which only the 3D view needs) and public/map/ground-floor.webp.
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

# ---- the base drawing, rendered --------------------------------------------------------------
pix = page.get_pixmap(dpi=DPI)
render = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].copy()
bgr = cv2.cvtColor(render, cv2.COLOR_RGB2BGR)
hsv_all = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)

# ---- the main hall ---------------------------------------------------------------------------
HALL = (1470, 617, 2640, 1603)          # inside the walls; the stage is open to its west
STAGE = (1210, 824, 1470, 1580)

# Seats: each is drawn as an orange ring. The ring's hollow is the seat.
hx0, hy0, hx1, hy1 = HALL
hall_hsv = hsv_all[hy0:hy1, hx0:hx1]
orange = (((hall_hsv[:, :, 1] > 90) & (hall_hsv[:, :, 0] > 5) & (hall_hsv[:, :, 0] < 25)).astype(np.uint8)) * 255
cnts, hier = cv2.findContours(orange, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
seats = []
for i, c in enumerate(cnts):
    if hier[0][i][3] == -1:
        continue
    if 12 <= cv2.contourArea(c) <= 160:
        m = cv2.moments(c)
        if m["m00"]:
            seats.append((m["m10"] / m["m00"] + hx0, m["m01"] / m["m00"] + hy0))
if not 1400 <= len(seats) <= 1600:
    sys.exit(f"expected about 1500 seats in the hall, found {len(seats)}")

# Columns: a grey square in a magenta outline at the grid intersections.
magenta = cv2.inRange(hsv_all, (140, 60, 120), (170, 255, 255))
cnts, _ = cv2.findContours(magenta, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
columns = []
for c in cnts:
    x, y, w, h = cv2.boundingRect(c)
    if 14 <= w <= 40 and 14 <= h <= 40 and 0.7 < w / h < 1.4 and 330 < y < 2100 and 300 < x < 3300:
        columns.append([mx(x + w / 2), mz(y + h / 2)])

# ---- rooms, read off the drawing room by room ------------------------------------------------
# (name, kind, x0, y0, x1, y1). An empty name is drawn but not labelled.
ROOMS = [
    ("Lift lobby", "circulation", 370, 1420, 524, 1640),
    ("Stairs", "circulation", 560, 1430, 770, 1610),
    ("Store", "service", 524, 1610, 770, 1760),
    ("Stairs", "circulation", 380, 430, 760, 500),
    ("", "circulation", 380, 500, 436, 810),
    ("AHU", "service", 964, 620, 1064, 810),
    ("Stairs", "circulation", 1070, 670, 1150, 800),
    ("Green room", "green", 1150, 650, 1310, 730),
    ("WC", "toilet", 1310, 630, 1380, 730),
    ("VIP lounge", "lounge", 964, 1010, 1210, 1430),
    ("Security", "service", 964, 1460, 1104, 1580),
    ("Green room", "green", 1170, 1520, 1310, 1610),
    ("WC", "toilet", 1310, 1510, 1380, 1600),
    ("AHU", "service", 1140, 400, 1250, 490),
    ("Stairs & lift", "circulation", 2764, 424, 2980, 620),
    ("Office", "office", 2730, 720, 2970, 830),
    ("Office", "office", 2730, 830, 2970, 940),
    ("Toilets (women)", "toilet", 2770, 970, 2970, 1160),
    ("Women's lounge", "lounge", 2880, 1160, 2970, 1290),
    ("Accessible WC", "toilet", 2730, 1300, 2800, 1380),
    ("Toilets (men)", "toilet", 2800, 1300, 2970, 1510),
    ("Stairs", "circulation", 2780, 1700, 2970, 1808),
    ("Electrical", "service", 2990, 1300, 3236, 1420),
    ("UPS", "service", 3090, 1440, 3236, 1520),
    ("LV / AV", "service", 3090, 1530, 3236, 1620),
    ("UR room", "service", 3060, 1630, 3236, 1760),
    ("Kitchen (future)", "kitchen", 2660, 1820, 2990, 2063),
    ("Kitchen", "kitchen", 2990, 1820, 3236, 2063),
]
rooms = [{"name": n or None, "kind": k, "h": 3.2, **box(x0, y0, x1, y1)} for n, k, x0, y0, x1, y1 in ROOMS]
ramp = {"name": "Ramp to basement", **box(2990, 380, 3236, 1300)}


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


def zone_text(r):
    return " ".join(t for t, wx, wy in words if r[0] - 4 <= wx <= r[2] + 4 and r[1] - 4 <= wy <= r[3] + 4)


T = 12  # wall thickness, px
# The hall has four doors on each long side and two at the back.
side_doors = [(x - 30, x + 30) for x in (1560, 1900, 2240, 2560)]
back_doors = [(y - 30, y + 30) for y in (760, 1180)]
hall_walls = []
hall_walls += wall_with_gaps(hx0, hy0, hx1, hy0 + T, side_doors)
hall_walls += wall_with_gaps(hx0, hy1 - T, hx1, hy1, side_doors)
hall_walls += wall_with_gaps(hx1 - T, hy0, hx1, hy1, back_doors, horizontal=False)
hall_walls = [{"kind": "hall-wall", "h": 4.5, **box(*w)} for w in hall_walls]

# The doors in the corridor / dining hall divide are the keep-clear zones that
# straddle it; the fire exits are the zone the drawing labels FIRE.
DIVIDE_Y = 1808
divide_doors = sorted({(round(k[0]), round(k[2])) for k in keep
                       if k[1] < DIVIDE_Y + 20 and k[3] > DIVIDE_Y - 20 and k[2] - k[0] < 260})
fire_exits = [(round(k[0]), round(k[2])) for k in keep if "FIRE" in zone_text(k).upper()]
NORTH_ENTRY = (1880, 2040)     # the double doors behind the 12.7 m keep-clear
WEST_ENTRY = (880, 1170)       # the lobby's doors, which the backdrops face

ext = []
ext += wall_with_gaps(353, 417, 3000, 417 + T, [NORTH_ENTRY])
ext += wall_with_gaps(353, 417, 353 + T, 1808, [WEST_ENTRY], horizontal=False)
ext += [(353, 1808 - T, 1208, 1808), (1208, 1808, 1208 + T, 2063), (3236 - T, 380, 3236, 2063)]
ext += wall_with_gaps(1208, 2063 - T, 3236, 2063, fire_exits)
ext += wall_with_gaps(1208, DIVIDE_Y - T // 2, 2650, DIVIDE_Y + T // 2, divide_doors)
walls = [{"kind": "wall", "h": 3.4, **box(*w)} for w in ext]

# ---- the stage ---------------------------------------------------------------------------------
stage = {
    "platform": {**box(*STAGE), "h": 1.0},
    # The LED wall along the back of the stage, facing the audience.
    "screen": {**box(STAGE[0], 880, STAGE[0] + 12, 1520), "h": 5.5},
    "lectern": box(1425, 1415, 1447, 1437),
    # Steps up from the hall floor at each end of the stage.
    "steps": [box(1310, 790, 1390, 824), box(1310, 1580, 1390, 1614)],
}

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
loop = []
for x in range(1360, 2440, 190):
    loop.append({"x": mx(x), "z": mz(1962), "dir": "east"})
    loop.append({"x": mx(x + 95), "z": mz(1910), "dir": "west"})
start = next(((wx, wy) for t, wx, wy in words if t == "START"), (1329, 1972))

entrances = [
    {"name": "Main entrance", "x": mx(353 - 45), "z": mz(sum(WEST_ENTRY) / 2),
     "w": round((WEST_ENTRY[1] - WEST_ENTRY[0]) / PX_PER_M, 2), "facing": "east"},
    {"name": "Main entry", "x": mx(sum(NORTH_ENTRY) / 2), "z": mz(417 - 45),
     "w": round((NORTH_ENTRY[1] - NORTH_ENTRY[0]) / PX_PER_M, 2), "facing": "south"},
]

# Floating labels, for the places people go. Most important first: when two
# would overlap on screen, the later one gives way.
LABELS = [
    ("Main Hall", f"{len(seats)} seats", 2058, 1110),
    ("Main entrance", "Entrance lobby", 560, 1320),
    ("Exhibition Area", "Dining hall · 22 stalls", 1650, 1936),
    ("Pre-function Area 1", "15 stalls", 2300, 1700),
    ("Pre-function Area 2", "10 stalls", 2300, 575),
    ("Stage", None, 1339, 1217),
    ("Toilets", None, 2870, 1240),
    ("Main entry", "North doors", 1960, 360),
    ("Backdrops", "Checkered · Media", 532, 1045),
    ("Loop start", "S1", start[0], start[1] + 35),
]
labels = [{"title": t, "sub": s, "x": mx(x), "z": mz(y)} for t, s, x, y in LABELS]

# Words on the floor, for the open areas a floating label would crowd.
FLOOR_WORDS = [
    ("ENTRANCE LOBBY", 690, 1330, 9.0),
    ("5 M CORRIDOR", 1350, 575, 6.5),
    ("5 M CORRIDOR", 1350, 1700, 6.5),
    ("2.4 M CORRIDOR", 2700, 850, 3.6),
    ("3.6 M CORRIDOR", 2700, 1250, 3.6),
]
floor_words = [{"text": t, "x": mx(x), "z": mz(y), "size": s} for t, x, y, s in FLOOR_WORDS]

scene = {
    "floor": {"w": round((CROP[2] - CROP[0]) / PX_PER_M, 2), "d": round((CROP[3] - CROP[1]) / PX_PER_M, 2),
              "texture": "/map/ground-floor.webp"},
    "hall": {**box(*HALL), "carpet": box(hx0, hy0 + T, hx1 - T, hy1 - T)},
    "stage": stage, "rooms": rooms, "ramp": ramp,
    "walls": walls + hall_walls, "columns": columns,
    "keepClear": keep_zones, "aisles": aisle_zones, "blocked": blocked_zones,
    "backdrops": backdrop_panels, "loop": loop,
    "loopStart": {"x": mx(start[0]), "z": mz(start[1])},
    "entrances": entrances, "labels": labels, "floorWords": floor_words,
}

# ---- floor texture ----------------------------------------------------------------------------
crop = bgr[CROP[1]:CROP[3], CROP[0]:CROP[2]].copy()
# Soften the architect's colours a little so what stands on the drawing reads
# first, but keep them: the keep-clear zones and aisles are information.
hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV).astype(np.float32)
hsv[:, :, 1] *= 0.7
crop = cv2.cvtColor(hsv.clip(0, 255).astype(np.uint8), cv2.COLOR_HSV2BGR)
crop = cv2.addWeighted(crop, 1.08, np.zeros_like(crop), 0, -10)
rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
tex = Image.fromarray(rgb).resize((2560, round(2560 * crop.shape[0] / crop.shape[1])), Image.LANCZOS)
os.makedirs(os.path.join(APP, "public", "map"), exist_ok=True)
out = os.path.join(APP, "public", "map", "ground-floor.webp")
tex.save(out, "WEBP", quality=78, method=6)

# ---- write the TypeScript modules ----------------------------------------------------------------
BANNER = (
    "/**\n"
    " * Generated from page 3 of the NICC project brief (\"Event & Exhibition Stall\n"
    " * Layout\") by scripts/build_venue3d.py — edit the drawing or the script, not\n"
    " * this file. Coordinates are metres from the middle of the drawing: x runs\n"
    " * east, z runs south.\n"
    " */\n"
)

STALLS_TS = BANNER + """
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

export const STALLS: readonly Stall[] = __STALLS__ as Stall[];

export const ZONE_NAMES: Record<StallZone, string> = {
  exhibition: "Exhibition Area, dining hall",
  "prefunction-1": "Pre-function Area 1, south corridor",
  "prefunction-2": "Pre-function Area 2, north corridor",
};
"""
with open(os.path.join(APP, "lib", "venue-3d.ts"), "w", encoding="utf-8", newline="\n") as f:
    f.write(STALLS_TS.replace("__STALLS__", json.dumps(stalls, indent=1)))

flat = []
for x, y in seats:
    flat += [mx(x), mz(y)]
SCENE_TS = BANNER + """
/** The building: loaded with the 3D view only, never with the page. */
export const SCENE = __SCENE__ as const;

/** Every seat in the main hall, as x, z pairs. All of them face the stage, west. */
export const SEATS: readonly number[] = __SEATS__;
"""
with open(os.path.join(APP, "lib", "venue-3d-scene.ts"), "w", encoding="utf-8", newline="\n") as f:
    f.write(SCENE_TS.replace("__SCENE__", json.dumps(scene, indent=1, ensure_ascii=False))
                    .replace("__SEATS__", json.dumps(flat, separators=(",", ":"))))

by_zone = {}
for s in stalls:
    by_zone[s["zone"]] = by_zone.get(s["zone"], 0) + 1
print("stalls", len(stalls), by_zone)
print("seats", len(seats), "| columns", len(columns), "| rooms", len(rooms), "| walls", len(walls) + len(hall_walls))
print("keep-clear", len(keep_zones), "| aisles", len(aisle_zones), "| loop arrows", len(loop))
print("texture KB", os.path.getsize(out) // 1024, "| scene module KB",
      os.path.getsize(os.path.join(APP, "lib", "venue-3d-scene.ts")) // 1024)
