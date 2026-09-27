/**
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

export const VENUE_3D = {
  "pxPerM": 29.6,
  "floor": {
    "w": 101.35,
    "d": 66.22,
    "texture": "/map/ground-v2.webp"
  },
  "stalls": [
    {
      "code": "S1",
      "zone": "forecourt",
      "facing": "north",
      "x": 16.84,
      "z": 29.81,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S2",
      "zone": "forecourt",
      "facing": "north",
      "x": 19.98,
      "z": 29.81,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S3",
      "zone": "forecourt",
      "facing": "north",
      "x": 23.11,
      "z": 29.81,
      "w": 3.04,
      "d": 1.99
    },
    {
      "code": "S4",
      "zone": "forecourt",
      "facing": "north",
      "x": 26.27,
      "z": 29.81,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S5",
      "zone": "forecourt",
      "facing": "north",
      "x": 29.38,
      "z": 29.81,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S6",
      "zone": "forecourt",
      "facing": "north",
      "x": 32.52,
      "z": 29.81,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S7",
      "zone": "forecourt",
      "facing": "north",
      "x": 35.68,
      "z": 29.81,
      "w": 3.04,
      "d": 1.99
    },
    {
      "code": "S8",
      "zone": "forecourt",
      "facing": "north",
      "x": 38.83,
      "z": 29.81,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S9",
      "zone": "forecourt",
      "facing": "north",
      "x": 41.96,
      "z": 29.81,
      "w": 3.04,
      "d": 1.99
    },
    {
      "code": "S10",
      "zone": "forecourt",
      "facing": "north",
      "x": 45.12,
      "z": 29.81,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S11",
      "zone": "forecourt",
      "facing": "south",
      "x": 45.12,
      "z": 26.91,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S12",
      "zone": "forecourt",
      "facing": "south",
      "x": 41.96,
      "z": 26.91,
      "w": 3.04,
      "d": 1.99
    },
    {
      "code": "S13",
      "zone": "forecourt",
      "facing": "south",
      "x": 38.83,
      "z": 26.91,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S14",
      "zone": "forecourt",
      "facing": "south",
      "x": 35.68,
      "z": 26.91,
      "w": 3.04,
      "d": 1.99
    },
    {
      "code": "S15",
      "zone": "forecourt",
      "facing": "south",
      "x": 32.52,
      "z": 26.91,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S16",
      "zone": "forecourt",
      "facing": "south",
      "x": 29.38,
      "z": 26.91,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S17",
      "zone": "forecourt",
      "facing": "south",
      "x": 26.27,
      "z": 26.91,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S18",
      "zone": "forecourt",
      "facing": "south",
      "x": 23.11,
      "z": 26.91,
      "w": 3.04,
      "d": 1.99
    },
    {
      "code": "S19",
      "zone": "forecourt",
      "facing": "south",
      "x": 19.98,
      "z": 26.91,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S20",
      "zone": "forecourt",
      "facing": "south",
      "x": 16.84,
      "z": 26.91,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S21",
      "zone": "dining",
      "facing": "north",
      "x": 22.48,
      "z": 22.99,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S22",
      "zone": "dining",
      "facing": "north",
      "x": 19.39,
      "z": 22.96,
      "w": 3.04,
      "d": 1.99
    },
    {
      "code": "S23",
      "zone": "dining",
      "facing": "north",
      "x": 16.32,
      "z": 22.96,
      "w": 3.04,
      "d": 1.99
    },
    {
      "code": "S24",
      "zone": "dining",
      "facing": "north",
      "x": 6.23,
      "z": 22.99,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S25",
      "zone": "dining",
      "facing": "north",
      "x": 3.09,
      "z": 22.99,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S26",
      "zone": "dining",
      "facing": "north",
      "x": -0.07,
      "z": 22.99,
      "w": 3.04,
      "d": 1.99
    },
    {
      "code": "S27",
      "zone": "dining",
      "facing": "north",
      "x": -3.23,
      "z": 22.99,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S28",
      "zone": "dining",
      "facing": "north",
      "x": -6.33,
      "z": 22.99,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S29",
      "zone": "dining",
      "facing": "north",
      "x": -9.48,
      "z": 22.99,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S30",
      "zone": "dining",
      "facing": "north",
      "x": -12.64,
      "z": 22.99,
      "w": 3.04,
      "d": 1.99
    },
    {
      "code": "S31",
      "zone": "dining",
      "facing": "north",
      "x": -15.79,
      "z": 22.99,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S32",
      "zone": "dining",
      "facing": "east",
      "x": -18.34,
      "z": 20.42,
      "w": 2.03,
      "d": 3.01
    },
    {
      "code": "S33",
      "zone": "south-corridor",
      "facing": "north",
      "x": 25.54,
      "z": 15.56,
      "w": 3.04,
      "d": 1.99
    },
    {
      "code": "S34",
      "zone": "south-corridor",
      "facing": "north",
      "x": 22.47,
      "z": 15.54,
      "w": 3.04,
      "d": 2.03
    },
    {
      "code": "S35",
      "zone": "south-corridor",
      "facing": "north",
      "x": 19.38,
      "z": 15.54,
      "w": 3.01,
      "d": 2.03
    },
    {
      "code": "S36",
      "zone": "south-corridor",
      "facing": "north",
      "x": 16.3,
      "z": 15.52,
      "w": 3.07,
      "d": 2.06
    },
    {
      "code": "S37",
      "zone": "lobby",
      "facing": "north",
      "x": -37.72,
      "z": -19.04,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S38",
      "zone": "lobby",
      "facing": "north",
      "x": -40.88,
      "z": -19.04,
      "w": 3.04,
      "d": 1.99
    },
    {
      "code": "S39",
      "zone": "lobby",
      "facing": "north",
      "x": -44.04,
      "z": -19.04,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S40",
      "zone": "lobby",
      "facing": "south",
      "x": -43.87,
      "z": -25.62,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S41",
      "zone": "lobby",
      "facing": "south",
      "x": -40.73,
      "z": -25.62,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S42",
      "zone": "lobby",
      "facing": "south",
      "x": -37.55,
      "z": -25.62,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S43",
      "zone": "north-corridor",
      "facing": "south",
      "x": -15.52,
      "z": -26.94,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S44",
      "zone": "north-corridor",
      "facing": "south",
      "x": -12.42,
      "z": -26.94,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S45",
      "zone": "north-corridor",
      "facing": "south",
      "x": -9.31,
      "z": -26.94,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S46",
      "zone": "north-corridor",
      "facing": "south",
      "x": -6.22,
      "z": -26.94,
      "w": 3.04,
      "d": 1.99
    },
    {
      "code": "S47",
      "zone": "north-corridor",
      "facing": "south",
      "x": -3.11,
      "z": -26.94,
      "w": 3.04,
      "d": 1.99
    },
    {
      "code": "S48",
      "zone": "north-corridor",
      "facing": "south",
      "x": 0.0,
      "z": -26.94,
      "w": 3.04,
      "d": 1.99
    },
    {
      "code": "S49",
      "zone": "north-corridor",
      "facing": "south",
      "x": 10.56,
      "z": -27.42,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S50",
      "zone": "north-corridor",
      "facing": "south",
      "x": 13.72,
      "z": -27.42,
      "w": 3.04,
      "d": 1.99
    },
    {
      "code": "S51",
      "zone": "north-corridor",
      "facing": "south",
      "x": 16.82,
      "z": -27.42,
      "w": 3.04,
      "d": 1.99
    },
    {
      "code": "S52",
      "zone": "north-corridor",
      "facing": "south",
      "x": 19.98,
      "z": -27.42,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S53",
      "zone": "north-corridor",
      "facing": "south",
      "x": 23.12,
      "z": -27.42,
      "w": 3.01,
      "d": 1.99
    },
    {
      "code": "S54",
      "zone": "north-corridor",
      "facing": "south",
      "x": 26.28,
      "z": -27.42,
      "w": 3.04,
      "d": 1.99
    }
  ],
  "desks": [
    {
      "x": 4.68,
      "z": 29.0,
      "w": 5.71,
      "d": 0.44
    },
    {
      "x": -14.97,
      "z": 31.64,
      "w": 5.68,
      "d": 0.44
    },
    {
      "x": -8.83,
      "z": 31.66,
      "w": 5.71,
      "d": 0.47
    },
    {
      "x": -2.82,
      "z": 31.62,
      "w": 5.71,
      "d": 0.47
    }
  ],
  "photo": {
    "backdrop": {
      "x": -40.79,
      "z": -6.42,
      "w": 0.71,
      "d": 6.28
    },
    "area": {
      "x": -38.33,
      "z": -6.4,
      "w": 4.02,
      "d": 5.1
    }
  },
  "closed": [
    {
      "kind": "entry-closed",
      "x": -49.81,
      "z": -8.01,
      "w": 2.13,
      "d": 17.64
    },
    {
      "kind": "unused",
      "x": -4.78,
      "z": 24.49,
      "w": 25.1,
      "d": 1.01
    },
    {
      "kind": "unused",
      "x": 20.03,
      "z": 24.49,
      "w": 10.54,
      "d": 1.01
    }
  ],
  "entrance": {
    "x": 11.25,
    "z": 25.25,
    "w": 6.76,
    "d": 1.18
  },
  "volumes": [
    {
      "kind": "stage",
      "h": 1.0,
      "x": -15.57,
      "z": -3.14,
      "w": 9.19,
      "d": 25.34
    },
    {
      "kind": "block",
      "h": 3.2,
      "x": -24.44,
      "z": -6.76,
      "w": 8.55,
      "d": 33.31
    },
    {
      "kind": "block",
      "h": 3.2,
      "x": -41.76,
      "z": 10.15,
      "w": 14.26,
      "d": 13.34
    },
    {
      "kind": "block",
      "h": 3.2,
      "x": -41.67,
      "z": -28.34,
      "w": 12.4,
      "d": 1.96
    },
    {
      "kind": "block",
      "h": 3.2,
      "x": -46.91,
      "z": -23.56,
      "w": 1.93,
      "d": 7.6
    },
    {
      "kind": "block",
      "h": 3.2,
      "x": 35.9,
      "z": -3.29,
      "w": 9.29,
      "d": 40.24
    },
    {
      "kind": "block",
      "h": 3.2,
      "x": 44.63,
      "z": 8.24,
      "w": 8.18,
      "d": 17.16
    },
    {
      "kind": "block",
      "h": 3.2,
      "x": 38.72,
      "z": 21.13,
      "w": 20.0,
      "d": 8.61
    },
    {
      "kind": "block",
      "h": 3.0,
      "x": -20.27,
      "z": -29.19,
      "w": 4.53,
      "d": 3.11
    },
    {
      "kind": "ramp",
      "h": 0.35,
      "x": 44.63,
      "z": -15.96,
      "w": 8.18,
      "d": 31.25
    }
  ],
  "walls": [
    {
      "kind": "hall-wall",
      "h": 3.6,
      "x": 8.72,
      "z": -23.21,
      "w": 40.2,
      "d": 0.41
    },
    {
      "kind": "hall-wall",
      "h": 3.6,
      "x": 8.72,
      "z": 9.7,
      "w": 40.2,
      "d": 0.41
    },
    {
      "kind": "hall-wall",
      "h": 3.6,
      "x": 28.61,
      "z": -6.76,
      "w": 0.41,
      "d": 33.31
    },
    {
      "kind": "wall",
      "h": 2.8,
      "x": -4.17,
      "z": -29.97,
      "w": 89.43,
      "d": 0.41
    },
    {
      "kind": "wall",
      "h": 2.8,
      "x": -48.68,
      "z": -23.41,
      "w": 0.41,
      "d": 13.51
    },
    {
      "kind": "wall",
      "h": 2.8,
      "x": -48.68,
      "z": 8.72,
      "w": 0.41,
      "d": 16.22
    },
    {
      "kind": "wall",
      "h": 2.8,
      "x": -34.44,
      "z": 16.62,
      "w": 28.89,
      "d": 0.41
    },
    {
      "kind": "wall",
      "h": 2.8,
      "x": -19.8,
      "z": 21.13,
      "w": 0.41,
      "d": 8.61
    },
    {
      "kind": "wall",
      "h": 2.8,
      "x": -6.06,
      "z": 25.24,
      "w": 27.87,
      "d": 0.41
    },
    {
      "kind": "wall",
      "h": 2.8,
      "x": 21.67,
      "z": 25.24,
      "w": 14.09,
      "d": 0.41
    },
    {
      "kind": "wall",
      "h": 2.8,
      "x": 4.36,
      "z": 16.62,
      "w": 48.72,
      "d": 0.41
    }
  ],
  "labels": [
    {
      "title": "Main Hall",
      "sub": "1500 seats",
      "x": 8.72,
      "z": -6.76
    },
    {
      "title": "Main Entrance",
      "sub": null,
      "x": 11.25,
      "z": 27.03
    },
    {
      "title": "Stage",
      "sub": null,
      "x": -15.57,
      "z": -3.14
    },
    {
      "title": "Registration",
      "sub": null,
      "x": -10.14,
      "z": 30.24
    },
    {
      "title": "Forecourt",
      "sub": "Stalls S1–S20",
      "x": 31.08,
      "z": 34.46
    },
    {
      "title": "Dining Hall",
      "sub": "Stalls S21–S32",
      "x": -3.38,
      "z": 20.1
    },
    {
      "title": "North Corridor",
      "sub": "Stalls S43–S54",
      "x": 2.36,
      "z": -25.34
    },
    {
      "title": "South Corridor",
      "sub": "Stalls S33–S36",
      "x": 10.14,
      "z": 14.53
    },
    {
      "title": "Lobby",
      "sub": "Stalls S37–S42",
      "x": -41.89,
      "z": -13.85
    },
    {
      "title": "Toilets",
      "sub": null,
      "x": 35.81,
      "z": -7.09
    },
    {
      "title": "Photo Booth",
      "sub": null,
      "x": -38.51,
      "z": -6.42
    },
    {
      "title": "Entry closed",
      "sub": null,
      "x": -46.62,
      "z": -8.11
    }
  ]
} as const;

export const STALLS: readonly Stall[] = VENUE_3D.stalls as unknown as Stall[];

export const ZONE_NAMES: Record<StallZone, string> = {
  forecourt: "Forecourt, outside the main entrance",
  dining: "Dining Hall exhibition",
  "south-corridor": "South corridor",
  lobby: "West lobby",
  "north-corridor": "North corridor",
};
