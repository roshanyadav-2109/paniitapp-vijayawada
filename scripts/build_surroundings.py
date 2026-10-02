"""The real neighbourhood round the venue, for the 3D map.

    python scripts/build_surroundings.py

Reads OpenStreetMap (via the Overpass API) for everything within RADIUS
metres of Dr. B. R. Ambedkar Kala Vedika, Vijayawada: buildings with their
heights, roads by type, parks and grass, water, and the Statue of Social
Justice. Writes lib/venue-surroundings.ts in the 3D scene's own frame:
metres from the middle of the hall, x east and z south, turned so the hall's
long walls lie along x as they do in lib/venue-3d-scene.ts.

The hall itself is newer than the map data, so it is placed from the pin
Google Maps gives for it, and its angle was measured on satellite imagery:
its long walls run about 17 degrees clockwise of east.

Map data (c) OpenStreetMap contributors, ODbL. The page must say so.
"""

import json
import math
import random
import urllib.parse
import urllib.request
from pathlib import Path

HALL_LAT = 16.5082645
HALL_LON = 80.6317745
# The pin sits a little north of the hall's middle (measured on imagery).
CENTRE_OFFSET_EAST = -3.4
CENTRE_OFFSET_NORTH = -13.0
TURN_DEG = 17.0  # the hall's long walls, clockwise of east
RADIUS = 360
# The hall's own footprint, in the scene frame, to keep clear of.
HALL_HALF_W = 52
HALL_HALF_D = 36

ROAD_WIDTH = {
    "trunk": 16, "primary": 14, "secondary": 11, "tertiary": 9,
    "residential": 7, "unclassified": 6, "service": 4.5, "living_street": 5,
    "pedestrian": 4, "footway": 2.2, "path": 1.8, "cycleway": 2,
    "trunk_link": 8, "primary_link": 8, "secondary_link": 7, "tertiary_link": 6,
}

OUT = Path(__file__).resolve().parent.parent / "lib" / "venue-surroundings.ts"


MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]


def overpass(query: str) -> dict:
    """The public Overpass servers are busy at times: try each in turn."""
    data = urllib.parse.urlencode({"data": query}).encode()
    last: Exception | None = None
    for attempt in range(2):
        for url in MIRRORS:
            req = urllib.request.Request(
                url, data=data, headers={"User-Agent": "PanIIT-AP-summit-venue-map/1.0"}
            )
            try:
                with urllib.request.urlopen(req, timeout=150) as r:
                    return json.load(r)
            except Exception as e:  # noqa: BLE001 - any failure means try the next
                last = e
                print(f"  {url.split('/')[2]}: {e}")
    raise SystemExit(f"Overpass unavailable: {last}")


def to_scene(lat: float, lon: float) -> tuple[float, float]:
    east = (lon - HALL_LON) * 111320 * math.cos(math.radians(HALL_LAT)) - CENTRE_OFFSET_EAST
    north = (lat - HALL_LAT) * 110540 - CENTRE_OFFSET_NORTH
    # Turn the world anticlockwise by the hall's angle, so the hall's walls
    # (17 degrees clockwise of east) come to lie along x.
    t = math.radians(TURN_DEG)
    e2 = east * math.cos(t) - north * math.sin(t)
    n2 = east * math.sin(t) + north * math.cos(t)
    return round(e2, 2), round(-n2, 2)


def height_of(tags: dict, rnd: random.Random) -> float:
    for key in ("height", "building:height"):
        v = tags.get(key)
        if v:
            try:
                return max(3.0, float(str(v).split()[0].replace("m", "")))
            except ValueError:
                pass
    levels = tags.get("building:levels")
    if levels:
        try:
            return max(3.0, float(levels) * 3.3)
        except ValueError:
            pass
    kind = tags.get("building", "yes")
    if kind in ("house", "residential", "detached"):
        return rnd.choice([6.5, 6.5, 9.8, 9.8, 13.1])
    if kind in ("apartments",):
        return rnd.choice([13.1, 16.4, 19.7])
    if kind in ("shed", "garage", "roof", "hut", "kiosk"):
        return 3.0
    return rnd.choice([6.5, 9.8, 9.8, 13.1, 16.4])


def inside_hall(pts: list[tuple[float, float]]) -> bool:
    cx = sum(p[0] for p in pts) / len(pts)
    cz = sum(p[1] for p in pts) / len(pts)
    return abs(cx) < HALL_HALF_W and abs(cz) < HALL_HALF_D


def area(pts: list[tuple[float, float]]) -> float:
    return abs(sum(pts[i][0] * pts[i - 1][1] - pts[i - 1][0] * pts[i][1] for i in range(len(pts)))) / 2


def main() -> None:
    rnd = random.Random(7)
    around = f"(around:{RADIUS},{HALL_LAT},{HALL_LON})"
    q = f"""[out:json][timeout:120];
(
  way{around}["building"];
  way{around}["highway"];
  way{around}["leisure"~"park|garden|pitch|playground"];
  way{around}["landuse"~"grass|recreation_ground|meadow|forest|village_green"];
  way{around}["natural"~"water|wood|scrub|grassland"];
  way{around}["water"];
  way{around}["waterway"];
  way{around}["amenity"="parking"];
  node{around}["natural"="tree"];
);
out tags geom;"""
    data = overpass(q)

    buildings, roads, greens, waters, parking, trees = [], [], [], [], [], []
    for e in data["elements"]:
        tags = e.get("tags", {})
        if e["type"] == "node":
            if tags.get("natural") == "tree":
                trees.append(to_scene(e["lat"], e["lon"]))
            continue
        geom = e.get("geometry")
        if not geom or len(geom) < 2:
            continue
        pts = [to_scene(p["lat"], p["lon"]) for p in geom]
        closed = pts[0] == pts[-1] and len(pts) > 3
        if "building" in tags and closed:
            ring = pts[:-1]
            if inside_hall(ring) or area(ring) < 12:
                continue
            buildings.append({"p": [c for p in ring for c in p], "h": round(height_of(tags, rnd), 1)})
        elif "highway" in tags and not closed:
            kind = tags["highway"]
            if kind not in ROAD_WIDTH:
                continue
            roads.append({"p": [c for p in pts for c in p], "w": ROAD_WIDTH[kind], "k": kind, "n": tags.get("name")})
        elif closed and (tags.get("natural") == "water" or "water" in tags):
            waters.append([c for p in pts[:-1] for c in p])
        elif "waterway" in tags and not closed:
            roads.append({"p": [c for p in pts for c in p], "w": 6, "k": "water", "n": tags.get("name")})
        elif closed and tags.get("amenity") == "parking":
            parking.append([c for p in pts[:-1] for c in p])
        elif closed:
            greens.append([c for p in pts[:-1] for c in p])

    # The statue and its pedestal: the building under it is in the data;
    # the figure is placed on it here.
    statue_lat, statue_lon = 16.5071636, 80.6314837
    statue = to_scene(statue_lat, statue_lon)

    # Trees where the imagery shows them and the map does not: scattered
    # through parks and green areas, a few per hundred square metres.
    def point_in(poly: list[float], x: float, z: float) -> bool:
        c = False
        n = len(poly) // 2
        for i in range(n):
            x1, z1 = poly[(i - 1) % n * 2], poly[(i - 1) % n * 2 + 1]
            x2, z2 = poly[i * 2], poly[i * 2 + 1]
            if (z1 > z) != (z2 > z) and x < (x2 - x1) * (z - z1) / (z2 - z1) + x1:
                c = not c
        return c

    for g in greens:
        xs, zs = g[0::2], g[1::2]
        a = area(list(zip(xs, zs)))
        for _ in range(min(int(a / 160), 60)):
            x = rnd.uniform(min(xs), max(xs))
            z = rnd.uniform(min(zs), max(zs))
            if point_in(g, x, z) and not (abs(x) < HALL_HALF_W + 8 and abs(z) < HALL_HALF_D + 8):
                trees.append((round(x, 1), round(z, 1)))

    out = {
        "radius": RADIUS,
        "buildings": buildings,
        "roads": roads,
        "greens": greens,
        "waters": waters,
        "parking": parking,
        "trees": [c for t in trees for c in t],
        "statue": {"x": statue[0], "z": statue[1]},
    }
    OUT.write_text(
        "/**\n"
        " * Generated by scripts/build_surroundings.py from OpenStreetMap data\n"
        " * (c) OpenStreetMap contributors, ODbL. Metres in the 3D scene's frame:\n"
        " * x east, z south, turned so the hall's walls lie along x.\n"
        " */\n\n"
        "export const SURROUNDINGS = " + json.dumps(out, separators=(",", ":")) + " as const;\n",
        encoding="utf-8",
    )
    print(
        f"buildings {len(buildings)}, roads {len(roads)}, greens {len(greens)}, "
        f"waters {len(waters)}, parking {len(parking)}, trees {len(trees)}, "
        f"statue at {statue}, {OUT.stat().st_size // 1024} KB"
    )


if __name__ == "__main__":
    main()
