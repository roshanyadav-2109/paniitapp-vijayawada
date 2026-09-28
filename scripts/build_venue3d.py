"""Build the 3D venue — all three floors — from the NICC project brief.

    python scripts/build_venue3d.py "path/to/NICC PROJECT BRIEF - with Exhibition Stall Layout.pdf"

Pages 3, 4 and 5 of the brief are the ground floor (with the architects'
stall layer over it), the first floor and the basement. Almost nothing here
is placed by hand:

  * Floors are registered to one another through the structural grid. Every
    plan carries the same numbered and lettered grid bubbles; matching them
    across pages gives each floor's scale and offset, and the known spacing
    of grid lines 1 to 19 (95.47 m) gives metres.
  * Walls are the plan's own thick strokes. Text, dimension lines and door
    swings are drawn thin, so opening the ink with long, narrow kernels
    keeps straight runs of wall and drops everything else — and a doorway,
    being a gap in a wall, stays a gap.
  * Stall bays, keep-clear zones, aisles, blocked doorways and backdrops are
    vector shapes on page 3, each in its own colour, with the stall number
    written inside the bay.
  * Seats are orange rings on the plan; each ring's hollow is a seat.
  * Parking bays are the red rectangles on the basement plan.
  * Columns are grey squares in magenta outlines.

What is placed by hand is the naming: which room is which, read off the
drawings, and the stage details the drawing only implies.

Writes lib/venue-3d.ts (the stalls — the page needs them), lib/venue-3d-scene.ts
(the building — only the 3D view does) and one plan image per floor in
public/map/.
"""
import itertools, json, os, re, sys
import numpy as np, cv2, fitz
from PIL import Image

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = sys.argv[1] if len(sys.argv) > 1 else "NICC PROJECT BRIEF - with Exhibition Stall Layout.pdf"
DPI = 200
SC = DPI / 72.0
doc = fitz.open(PDF)
PAGES = {"ground": 2, "first": 3, "basement": 4}


def render(page_no):
    pix = doc[page_no].get_pixmap(dpi=DPI)
    rgb = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].copy()
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


renders = {k: render(p) for k, p in PAGES.items()}

# ---- registration through the structural grid -------------------------------------------------
SPACING_X = [6500, 6500, 3350, 5000, 6750, 5000, 5000, 6750, 5000, 5000, 6750, 5000, 5375, 2725, 4590, 3010, 4000, 8270]
GRID_X = np.concatenate([[0], np.cumsum(SPACING_X)]) / 1000.0


def bubbles(img):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    green = cv2.inRange(hsv, (40, 60, 80), (90, 255, 255))
    c = cv2.HoughCircles(cv2.GaussianBlur(green, (5, 5), 1.5), cv2.HOUGH_GRADIENT, dp=1.2, minDist=40,
                         param1=80, param2=18, minRadius=26, maxRadius=48)[0]
    top = sorted(float(x) for x, y, r in c if y < 330)
    left = sorted(float(y) for x, y, r in c if x < 330 and y > 300)
    # A stray circle can sneak in; keep the 19 whose spacing fits the grid.
    best = None
    for combo in itertools.combinations(range(len(top)), len(GRID_X)):
        sub = np.array([top[i] for i in combo])
        k, b = np.polyfit(GRID_X, sub, 1)
        err = np.abs(np.polyval([k, b], GRID_X) - sub).max()
        if best is None or err < best[0]:
            best = (err, sub, k)
    if best[0] > 6:
        sys.exit(f"grid bubbles do not fit the grid (worst {best[0]:.1f}px)")
    return best[1], np.array(left[:12]), best[2]


grid = {k: bubbles(img) for k, img in renders.items()}
PX_PER_M = float(grid["ground"][2])
TO_GROUND = {}
for k, (xs, ys, _) in grid.items():
    ax, bx = np.polyfit(xs, grid["ground"][0], 1)
    ay, by = np.polyfit(ys, grid["ground"][1], 1)
    TO_GROUND[k] = (ax, bx, ay, by)

CROP = (300, 330, 3300, 2230)          # ground-floor pixels the scene covers
CX = (CROP[0] + CROP[2]) / 2
CY = (CROP[1] + CROP[3]) / 2


def g(floor, x, y):
    """A point on a floor's own drawing, in ground-floor pixels."""
    ax, bx, ay, by = TO_GROUND[floor]
    return ax * x + bx, ay * y + by


def mx(px):
    return round((px - CX) / PX_PER_M, 2)


def mz(py):
    return round((py - CY) / PX_PER_M, 2)


def box(x0, y0, x1, y1):
    return {"x": mx((x0 + x1) / 2), "z": mz((y0 + y1) / 2),
            "w": round((x1 - x0) / PX_PER_M, 2), "d": round((y1 - y0) / PX_PER_M, 2)}


def fbox(floor, x0, y0, x1, y1):
    a = g(floor, x0, y0)
    b = g(floor, x1, y1)
    return box(a[0], a[1], b[0], b[1])


# ---- ground floor stall layer (vectors) -----------------------------------------------------------
page = doc[PAGES["ground"]]


def near(c, t, tol=0.02):
    return bool(c) and all(abs(a - b) < tol for a, b in zip(c, t))


bays, keep, aisles, blocked, backdrops = [], [], [], [], []
for d in page.get_drawings():
    r = d["rect"]
    b = [r.x0 * SC, r.y0 * SC, r.x1 * SC, r.y1 * SC]
    if b[1] > 2150:
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


def zone_text(r):
    return " ".join(t for t, wx, wy in words if r[0] - 4 <= wx <= r[2] + 4 and r[1] - 4 <= wy <= r[3] + 4)


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
    stalls.append({"code": f"{PREFIX[zone]}-{label}", "label": label, "zone": zone, "facing": facing,
                   "x": mx(cx), "z": mz(cy), "w": 3.0, "d": 2.0})
order = ["exhibition", "prefunction-1", "prefunction-2"]
stalls.sort(key=lambda s: (order.index(s["zone"]), int(s["label"][1:])))
if len({s["code"] for s in stalls}) != len(stalls):
    sys.exit("two stalls share a code")

# ---- walls, from each drawing's own ink -----------------------------------------------------------
WALL_AREA = {"ground": (330, 380, 3260, 2090), "first": (330, 380, 3260, 1800), "basement": (520, 360, 3010, 1905)}
MIN_RUN = {"ground": 30, "first": 30, "basement": 70}      # driveway dashes are shorter than any wall


def doors_of(floor):
    """
    Door symbols: the green leaves and swings the drawings put in doorways.
    Most sit in a gap in the wall, but some are drawn over a wall line that
    the draughtsman left continuous — the lobby's main doors, and the doors
    from the corridor into the dining hall — so without this those doorways
    come out walled shut.
    """
    hsv = cv2.cvtColor(renders[floor], cv2.COLOR_BGR2HSV)
    green = cv2.inRange(hsv, (40, 60, 80), (90, 255, 255))
    x0, y0, x1, y1 = WALL_AREA[floor]
    area = np.zeros_like(green)
    area[y0:y1, x0:x1] = 255
    green = cv2.bitwise_and(green, area)
    n, _, st, _ = cv2.connectedComponentsWithStats(green, 8)
    out = []
    for i in range(1, n):
        x, y, w, h, a = st[i]
        if 12 <= max(w, h) <= 160 and a >= 20:
            out.append((x, y, x + w, y + h))
    return out


def cut(run, doors, horizontal, pad=10):
    """A wall run with an opening wherever a door symbol crosses it."""
    x0, y0, x1, y1 = run
    gaps = []
    for d in doors:
        dx0, dy0, dx1, dy1 = d[0] - pad, d[1] - pad, d[2] + pad, d[3] + pad
        if dx1 < x0 or dx0 > x1 or dy1 < y0 or dy0 > y1:
            continue
        gaps.append((d[0], d[2]) if horizontal else (d[1], d[3]))
    if not gaps:
        return [run]
    pieces, cur = [], (x0 if horizontal else y0)
    end = x1 if horizontal else y1
    for g0, g1 in sorted(gaps):
        if g0 > cur + 4:
            pieces.append((cur, g0))
        cur = max(cur, g1)
    if end > cur + 4:
        pieces.append((cur, end))
    return [(a, y0, b, y1) if horizontal else (x0, a, x1, b) for a, b in pieces]


def walls_of(floor, exclude=(), keep_shut=()):
    img = renders[floor]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    ink = cv2.bitwise_or((gray < 90).astype(np.uint8) * 255, cv2.inRange(hsv, (100, 120, 80), (130, 255, 255)))
    m = np.zeros_like(ink)
    x0, y0, x1, y1 = WALL_AREA[floor]
    m[y0:y1, x0:x1] = 255
    ink = cv2.bitwise_and(ink, m)
    for ex in exclude:
        a, b, c, d = (int(v) for v in ex)
        ink[max(0, b - 3):d + 3, max(0, a - 3):c + 3] = 0
    # A doorway the drawing marks as blocked stays shut, door symbol or not.
    doors = [d for d in doors_of(floor)
             if not any(d[0] < k[2] and k[0] < d[2] and d[1] < k[3] and k[1] < d[3] for k in keep_shut)]
    out = []
    for kernel, horiz in (((25, 5), True), ((5, 25), False)):
        run = cv2.morphologyEx(ink, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, kernel))
        n, _, st, _ = cv2.connectedComponentsWithStats(run, 8)
        for i in range(1, n):
            x, y, w, h, _ = st[i]
            thick, length = (h, w) if horiz else (w, h)
            if length >= MIN_RUN[floor] and 4 <= thick <= 18:
                for px0, py0, px1, py1 in cut((x, y, x + w, y + h), doors, horiz):
                    if max(px1 - px0, py1 - py0) < 8:
                        continue
                    a = g(floor, px0, py0)
                    b = g(floor, px1, py1)
                    out.append([a[0], a[1], b[0], b[1]])
    return out


HALL = (1470, 617, 2640, 1603)
STAGE = (1210, 824, 1470, 1580)


def on_edge(r, rect, tol=18):
    """Whether a wall run lies along one of a rectangle's sides."""
    x0, y0, x1, y1 = r
    X0, Y0, X1, Y1 = rect
    inside_x = x0 >= X0 - tol and x1 <= X1 + tol
    inside_y = y0 >= Y0 - tol and y1 <= Y1 + tol
    return (inside_x and (abs(y0 - Y0) < tol or abs(y1 - Y1) < tol)) or \
           (inside_y and (abs(x0 - X0) < tol or abs(x1 - X1) < tol))


def wall_list(runs, height, tall=None, glass=None):
    out = []
    for r in runs:
        kind, h = "wall", height
        if glass and any(on_edge(r, v) for v in glass):
            kind, h = "glass", 1.1
        elif tall and on_edge(r, tall):
            kind, h = "tall", 4.5
        out.append({"kind": kind, "h": h, **box(*r)})
    return out


# ---- columns ---------------------------------------------------------------------------------------
def columns_of(floor):
    hsv = cv2.cvtColor(renders[floor], cv2.COLOR_BGR2HSV)
    magenta = cv2.inRange(hsv, (140, 60, 120), (170, 255, 255))
    cnts, _ = cv2.findContours(magenta, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    out = []
    x0, y0, x1, y1 = WALL_AREA[floor]
    for c in cnts:
        x, y, w, h = cv2.boundingRect(c)
        if 12 <= w <= 40 and 12 <= h <= 40 and 0.7 < w / h < 1.4 and x0 < x < x1 and y0 < y < y1:
            px, py = g(floor, x + w / 2, y + h / 2)
            out.append([mx(px), mz(py)])
    return out


# ---- seats -----------------------------------------------------------------------------------------
hx0, hy0, hx1, hy1 = HALL
hall_hsv = cv2.cvtColor(renders["ground"], cv2.COLOR_BGR2HSV)[hy0:hy1, hx0:hx1]
orange = (((hall_hsv[:, :, 1] > 90) & (hall_hsv[:, :, 0] > 5) & (hall_hsv[:, :, 0] < 25)).astype(np.uint8)) * 255
cnts, hier = cv2.findContours(orange, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
seats = []
for i, c in enumerate(cnts):
    if hier[0][i][3] != -1 and 12 <= cv2.contourArea(c) <= 160:
        m = cv2.moments(c)
        if m["m00"]:
            seats.append((m["m10"] / m["m00"] + hx0, m["m01"] / m["m00"] + hy0))
if not 1400 <= len(seats) <= 1600:
    sys.exit(f"expected about 1500 seats in the hall, found {len(seats)}")
seat_flat = []
for x, y in seats:
    seat_flat += [mx(x), mz(y)]

# ---- parking bays ---------------------------------------------------------------------------------
bhsv = cv2.cvtColor(renders["basement"], cv2.COLOR_BGR2HSV)
red = cv2.inRange(bhsv, (0, 90, 120), (8, 255, 255)) | cv2.inRange(bhsv, (165, 90, 120), (180, 255, 255))
red = cv2.morphologyEx(red, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
cnts, _ = cv2.findContours(red, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
bays_b = []
bpx = float(grid["basement"][2])                      # the basement's own px per metre
for c in cnts:
    x, y, w, h = cv2.boundingRect(c)
    short, long_ = sorted((w / bpx, h / bpx))
    if 2.0 <= short <= 3.4 and 4.2 <= long_ <= 12.0 and 540 < x < 3000 and 360 < y < 1905:
        a = g("basement", x, y)
        b = g("basement", x + w, y + h)
        bays_b.append({**box(a[0], a[1], b[0], b[1]), "cars": max(1, round(long_ / 5.2))})
parking_total = sum(b["cars"] for b in bays_b)

# ---- rooms, read off each drawing ------------------------------------------------------------------
# (name, kind, x0, y0, x1, y1) in that floor's own pixels. Empty name: drawn, not labelled.
ROOMS = {
    "ground": [
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
        ("Ramp to basement", "ramp", 2990, 380, 3236, 1300),
    ],
    "first": [
        ("Board room 1", "meeting", 380, 810, 880, 1016),
        ("Board room 2", "meeting", 380, 1024, 880, 1220),
        ("VIP lounge", "lounge", 1010, 810, 1200, 1200),
        ("AHU", "service", 1010, 420, 1260, 550),
        ("Store", "service", 1020, 620, 1110, 700),
        ("Toilets", "toilet", 1120, 620, 1370, 760),
        ("AHU", "service", 1090, 1220, 1370, 1630),
        ("Lift lobby", "circulation", 380, 1410, 530, 1560),
        ("Stairs", "circulation", 530, 1410, 770, 1600),
        ("Toilet", "toilet", 380, 1640, 520, 1780),
        ("Rest room", "lounge", 520, 1640, 650, 1790),
        ("Office", "office", 650, 1640, 860, 1790),
        ("Meeting room", "meeting", 860, 1640, 1020, 1790),
        ("Pantry", "service", 1020, 1690, 1530, 1780),
        ("Activity zone", "activity", 1270, 460, 2610, 610),
        ("Activity zone", "activity", 1530, 1660, 2610, 1780),
        ("Lounge", "lounge", 2650, 770, 2780, 1020),
        ("Lounge", "lounge", 2650, 1210, 2780, 1400),
        ("Reception", "arrival", 2650, 1440, 2830, 1580),
        ("Stairs & lift", "circulation", 2750, 410, 2960, 620),
        ("Suite 01", "suite", 2960, 420, 3220, 550),
        ("Waiting lounge", "lounge", 2970, 620, 3210, 800),
        ("Suite 02", "suite", 2830, 810, 3220, 960),
        ("Suite 03", "suite", 2830, 960, 3220, 1090),
        ("Suite 04", "suite", 2830, 1090, 3220, 1230),
        ("Suite 05", "suite", 2830, 1230, 3220, 1370),
        ("Dining", "dining", 2970, 1380, 3220, 1630),
        ("Pantry", "service", 2840, 1520, 2970, 1630),
        ("AHU", "service", 2970, 1640, 3220, 1780),
        ("Stairs", "circulation", 2760, 1680, 2960, 1780),
    ],
    "basement": [
        ("Store", "service", 565, 395, 720, 490),
        ("Stairs", "circulation", 570, 490, 720, 725),
        ("Lift lobby", "circulation", 565, 1235, 725, 1360),
        ("Lifts", "circulation", 565, 1360, 725, 1430),
        ("Services", "service", 565, 1775, 665, 1900),
        ("AC plant room", "service", 730, 1780, 1550, 1900),
        ("Ramp from ground", "ramp", 1110, 1650, 1550, 1770),
        ("Air handling", "service", 2280, 400, 2535, 555),
        ("Stairs & lift", "circulation", 2595, 400, 2785, 565),
        ("Office", "office", 2790, 395, 2985, 850),
        ("Store", "service", 2270, 565, 2365, 800),
        ("Store", "service", 2270, 1190, 2365, 1420),
        ("Stairs & lift", "circulation", 2605, 1350, 2785, 1565),
        ("Electrical", "service", 2605, 1565, 2785, 1655),
        ("DG room", "service", 2565, 1655, 2785, 1780),
        ("Ramp up to ground", "ramp", 2790, 850, 2985, 1580),
    ],
}


def rooms_of(floor):
    return [{"name": n or None, "kind": k, **fbox(floor, x0, y0, x1, y1)} for n, k, x0, y0, x1, y1 in ROOMS[floor]]


# ---- floor slabs -----------------------------------------------------------------------------------
VOID = [STAGE, HALL]                     # the hall is double height: no first-floor slab over it


def minus(rect, holes):
    """A rectangle with rectangular holes, as a list of rectangles."""
    pieces = [rect]
    for hx0_, hy0_, hx1_, hy1_ in holes:
        nxt = []
        for x0, y0, x1, y1 in pieces:
            if hx1_ <= x0 or hx0_ >= x1 or hy1_ <= y0 or hy0_ >= y1:
                nxt.append((x0, y0, x1, y1))
                continue
            if y0 < hy0_:
                nxt.append((x0, y0, x1, hy0_))
            if hy1_ < y1:
                nxt.append((x0, hy1_, x1, y1))
            my0, my1 = max(y0, hy0_), min(y1, hy1_)
            if x0 < hx0_:
                nxt.append((x0, my0, hx0_, my1))
            if hx1_ < x1:
                nxt.append((hx1_, my0, x1, my1))
        pieces = nxt
    return pieces


SLABS = {
    "ground": [(353, 417, 3236, 1808), (1208, 1808, 3236, 2063)],
    "first": minus((353, 417, 3236, 1808), VOID),
    "basement": [(363, 423, 3231, 2200)],
}

# ---- the ground floor's own furniture ---------------------------------------------------------------
stage = {
    "platform": {**box(*STAGE), "h": 1.0},
    "screen": {**box(STAGE[0], 880, STAGE[0] + 12, 1520), "h": 5.5},
    "lectern": box(1425, 1415, 1447, 1437),
    "steps": [box(1310, 790, 1390, 824), box(1310, 1580, 1390, 1614)],
}
backdrop_panels = []
for b in sorted(backdrops, key=lambda b: b[1]):
    backdrop_panels.append({"kind": "checkered" if not backdrop_panels else "media", **box(*b)})
loop = []
for x in range(1360, 2440, 190):
    loop.append({"x": mx(x), "z": mz(1962), "dir": "east"})
    loop.append({"x": mx(x + 95), "z": mz(1910), "dir": "west"})
start = next(((wx, wy) for t, wx, wy in words if t == "START"), (1329, 1972))
NORTH_ENTRY = (1880, 2040)
WEST_ENTRY = (880, 1170)
entrances = [
    {"name": "Main entrance", "x": mx(353 - 45), "z": mz(sum(WEST_ENTRY) / 2),
     "w": round((WEST_ENTRY[1] - WEST_ENTRY[0]) / PX_PER_M, 2), "facing": "east"},
    {"name": "Main entry", "x": mx(sum(NORTH_ENTRY) / 2), "z": mz(417 - 45),
     "w": round((NORTH_ENTRY[1] - NORTH_ENTRY[0]) / PX_PER_M, 2), "facing": "south"},
]

# Board rooms: one long table each, with the chairs the plan gives them.
board_rooms = []
for _, kind, x0, y0, x1, y1 in ROOMS["first"]:
    if kind != "meeting" or x1 - x0 < 300:
        continue
    r = fbox("first", x0, y0, x1, y1)
    board_rooms.append({"x": r["x"], "z": r["z"], "w": r["w"], "d": r["d"], "seats": 27})

# ---- labels ------------------------------------------------------------------------------------------
LABELS = {
    "ground": [
        ("Main Hall", f"{len(seats)} seats", 2058, 1110),
        ("Main entrance", None, 560, 1320),
        ("Exhibition Area", "Dining hall", 1650, 1936),
        ("Pre-function Area 1", None, 2300, 1700),
        ("Pre-function Area 2", None, 2300, 575),
        ("Stage", None, 1339, 1217),
        ("Toilets", None, 2870, 1240),
        ("Main entry", "North doors", 1960, 360),
        ("Backdrops", None, 532, 1045),
        ("Start here", "Exhibition loop", start[0], start[1] + 35),
    ],
    "first": [
        ("Board room 1", None, 630, 913),
        ("Board room 2", None, 630, 1122),
        ("Main Hall below", None, 2058, 1110),
        ("Activity zone", None, 1940, 535),
        ("Activity zone", "South", 2070, 1720),
        ("VIP lounge", None, 1105, 1005),
        ("Suites", None, 3025, 1090),
        ("Lifts", None, 455, 1485),
        ("Dining", None, 3095, 1505),
    ],
    "basement": [
        ("Parking", None, 1500, 1000),
        ("Lifts", "To ground floor", 645, 1330),
        ("Lifts", "East core", 2695, 1455),
        ("Ramp up", "To ground level", 2887, 1210),
        ("Ramp", "From ground level", 1330, 1710),
    ],
}


def labels_of(floor):
    out = []
    for t, s, x, y in LABELS[floor]:
        px, py = g(floor, x, y)
        out.append({"title": t, "sub": s, "x": mx(px), "z": mz(py)})
    return out


FLOOR_WORDS = {
    "ground": [("ENTRANCE LOBBY", 690, 1330, 9.0), ("CORRIDOR", 1350, 575, 6.5),
               ("CORRIDOR", 1350, 1700, 6.5)],
    "first": [("CORRIDOR", 630, 1360, 7.0), ("CORRIDOR", 940, 1320, 3.6)],
    "basement": [("DRIVEWAY", 1500, 1045, 6.0)],
}


def words_of(floor):
    out = []
    for t, x, y, s in FLOOR_WORDS[floor]:
        px, py = g(floor, x, y)
        out.append({"text": t, "x": mx(px), "z": mz(py), "size": s})
    return out


# ---- assemble --------------------------------------------------------------------------------------------
exclude_ground = backdrops + bays                    # a backdrop is a panel, not a wall
floors = {
    "ground": {
        "label": "Ground",
        "slabs": [box(*r) for r in SLABS["ground"]],
        "walls": wall_list(walls_of("ground", exclude_ground, keep_shut=blocked), 3.2, tall=HALL),
        "columns": columns_of("ground"),
        "rooms": rooms_of("ground"),
        "labels": labels_of("ground"),
        "floorWords": words_of("ground"),
        "plan": "/map/plan-ground.webp",
    },
    "first": {
        "label": "First",
        "slabs": [box(*r) for r in SLABS["first"]],
        "walls": wall_list(walls_of("first"), 3.2, glass=VOID),
        # The structure carries on up — but only where there is a first floor
        # to carry. Over the single-storey dining wing there is none.
        "columns": [c for c in columns_of("ground")
                    if any(abs(c[0] - s["x"]) <= s["w"] / 2 + 0.5 and abs(c[1] - s["z"]) <= s["d"] / 2 + 0.5
                           for s in [box(*r) for r in SLABS["first"]])],
        "rooms": rooms_of("first"),
        "labels": labels_of("first"),
        "floorWords": words_of("first"),
        "plan": "/map/plan-first.webp",
    },
    "basement": {
        "label": "Basement",
        "slabs": [box(*r) for r in SLABS["basement"]],
        "walls": wall_list(walls_of("basement"), 3.0),
        "columns": columns_of("basement"),
        "rooms": rooms_of("basement"),
        "labels": labels_of("basement"),
        "floorWords": words_of("basement"),
        "plan": "/map/plan-basement.webp",
    },
}

scene = {
    "extent": {"w": round((CROP[2] - CROP[0]) / PX_PER_M, 2), "d": round((CROP[3] - CROP[1]) / PX_PER_M, 2)},
    "floors": floors,
    "hall": {**box(*HALL), "carpet": box(hx0, hy0 + 12, hx1 - 12, hy1 - 12)},
    "void": [box(*v) for v in VOID],
    "stage": stage,
    "keepClear": [{**box(*r), "text": zone_text(r)[:60] or None} for r in keep],
    "aisles": [box(*a) for a in aisles],
    "blocked": [box(*b) for b in blocked],
    "backdrops": backdrop_panels,
    "loop": loop,
    "loopStart": {"x": mx(start[0]), "z": mz(start[1])},
    "entrances": entrances,
    "boardRooms": board_rooms,
    "parking": bays_b,
}

# ---- plan images, one per floor, registered into the same frame ---------------------------------------------
os.makedirs(os.path.join(APP, "public", "map"), exist_ok=True)
for old in ("ground-floor.webp", "ground-v2.webp"):
    p = os.path.join(APP, "public", "map", old)
    if os.path.exists(p):
        os.remove(p)
W_OUT = 2400
scale = W_OUT / (CROP[2] - CROP[0])
H_OUT = round((CROP[3] - CROP[1]) * scale)
for floor, img in renders.items():
    ax, bx, ay, by = TO_GROUND[floor]
    # floor pixel -> ground pixel -> output pixel
    M = np.array([[ax * scale, 0, (bx - CROP[0]) * scale],
                  [0, ay * scale, (by - CROP[1]) * scale]], dtype=np.float32)
    warped = cv2.warpAffine(img, M, (W_OUT, H_OUT), flags=cv2.INTER_AREA, borderValue=(255, 255, 255))
    Image.fromarray(cv2.cvtColor(warped, cv2.COLOR_BGR2RGB)).save(
        os.path.join(APP, "public", "map", f"plan-{floor}.webp"), "WEBP", quality=72, method=6)

# ---- the basement floor: asphalt with the drawing's bay lines -----------------------------------------
# The bays are outlined in cyan, violet, magenta and red, with a red X through
# each. Taking every coloured line and keeping only the long straight ones
# keeps the outlines and drops the X's — which leaves what a car park has
# painted on its floor.
bh, bs, bv = cv2.split(bhsv)
colour = ((bs > 70) & (bv > 110) & ~((bh >= 35) & (bh <= 80)) & ~((bh >= 15) & (bh <= 34))).astype(np.uint8) * 255
area = np.zeros_like(colour)
area[380:1905, 540:3000] = 255
colour = cv2.bitwise_and(colour, area)
L = int(round(1.9 * bpx))                      # bay edges are longer than this; an X's steps are not
bay_lines = cv2.bitwise_or(
    cv2.morphologyEx(colour, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (L, 1))),
    cv2.morphologyEx(colour, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, L))))
ax, bx, ay, by = TO_GROUND["basement"]
M = np.array([[ax * scale, 0, (bx - CROP[0]) * scale],
              [0, ay * scale, (by - CROP[1]) * scale]], dtype=np.float32)
lines = cv2.warpAffine(bay_lines, M, (W_OUT, H_OUT), flags=cv2.INTER_LINEAR)
asphalt = np.zeros((H_OUT, W_OUT, 3), np.uint8)
asphalt[:] = (66, 63, 60)                      # BGR: a warm dark grey
noise = np.random.default_rng(7).integers(-6, 7, (H_OUT, W_OUT, 1)).astype(np.int16)
asphalt = np.clip(asphalt.astype(np.int16) + noise, 0, 255).astype(np.uint8)
asphalt[lines > 90] = (224, 226, 228)
Image.fromarray(cv2.cvtColor(asphalt, cv2.COLOR_BGR2RGB)).save(
    os.path.join(APP, "public", "map", "live-basement.webp"), "WEBP", quality=70, method=6)
floors["basement"]["live"] = "/map/live-basement.webp"

# ---- TypeScript ------------------------------------------------------------------------------------------------
BANNER = (
    "/**\n"
    " * Generated from the NICC project brief by scripts/build_venue3d.py — edit\n"
    " * the drawings or the script, not this file. Metres from the middle of the\n"
    " * building: x runs east, z runs south.\n"
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

export type FloorKey = "basement" | "ground" | "first";

/** Bottom to top, as a lift panel reads. */
export const FLOOR_ORDER: FloorKey[] = ["basement", "ground", "first"];
export const FLOOR_NAMES: Record<FloorKey, string> = {
  basement: "Basement",
  ground: "Ground",
  first: "First",
};

export const STALLS: readonly Stall[] = __STALLS__ as Stall[];

export const ZONE_NAMES: Record<StallZone, string> = {
  exhibition: "Exhibition Area, dining hall",
  "prefunction-1": "Pre-function Area 1, south corridor",
  "prefunction-2": "Pre-function Area 2, north corridor",
};
"""
with open(os.path.join(APP, "lib", "venue-3d.ts"), "w", encoding="utf-8", newline="\n") as f:
    f.write(STALLS_TS.replace("__STALLS__", json.dumps(stalls, indent=1)))

SCENE_TS = BANNER + """
/** The building: loaded with the 3D view only, never with the page. */
export const SCENE = __SCENE__ as const;

/** Every seat in the main hall, as x, z pairs. All of them face the stage, west. */
export const SEATS: readonly number[] = __SEATS__;
"""
with open(os.path.join(APP, "lib", "venue-3d-scene.ts"), "w", encoding="utf-8", newline="\n") as f:
    f.write(SCENE_TS.replace("__SCENE__", json.dumps(scene, indent=1, ensure_ascii=False))
                    .replace("__SEATS__", json.dumps(seat_flat, separators=(",", ":"))))

print(f"scale {PX_PER_M:.2f} px/m")
for k, (ax, bx, ay, by) in TO_GROUND.items():
    print(f"  {k:9s} x'={ax:.4f}x{bx:+.1f}  y'={ay:.4f}y{by:+.1f}")
print("stalls", len(stalls), "| seats", len(seats), "| parking bays", len(bays_b), "cars", parking_total)
for k, fl in floors.items():
    kinds = {}
    for w in fl["walls"]:
        kinds[w["kind"]] = kinds.get(w["kind"], 0) + 1
    print(f"  {k:9s} walls {len(fl['walls'])} {kinds} | columns {len(fl['columns'])} | rooms {len(fl['rooms'])}")
print("scene module KB", os.path.getsize(os.path.join(APP, "lib", "venue-3d-scene.ts")) // 1024)
