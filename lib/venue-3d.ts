/**
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

export const VENUE_3D = {
  "pxPerM": 30.0,
  "floor": {
    "w": 100.0,
    "d": 60.33,
    "texture": "/map/ground-floor.webp"
  },
  "stalls": [
    {
      "code": "EX-S1",
      "label": "S1",
      "zone": "exhibition",
      "facing": "north",
      "x": -15.71,
      "z": 26.07,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "EX-S2",
      "label": "S2",
      "zone": "exhibition",
      "facing": "north",
      "x": -12.65,
      "z": 26.07,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "EX-S3",
      "label": "S3",
      "zone": "exhibition",
      "facing": "north",
      "x": -9.59,
      "z": 26.07,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "EX-S4",
      "label": "S4",
      "zone": "exhibition",
      "facing": "north",
      "x": -6.53,
      "z": 26.07,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "EX-S5",
      "label": "S5",
      "zone": "exhibition",
      "facing": "north",
      "x": -3.47,
      "z": 26.07,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "EX-S6",
      "label": "S6",
      "zone": "exhibition",
      "facing": "north",
      "x": -0.41,
      "z": 26.07,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "EX-S7",
      "label": "S7",
      "zone": "exhibition",
      "facing": "north",
      "x": 2.65,
      "z": 26.07,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "EX-S8",
      "label": "S8",
      "zone": "exhibition",
      "facing": "north",
      "x": 5.72,
      "z": 26.07,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "EX-S9",
      "label": "S9",
      "zone": "exhibition",
      "facing": "north",
      "x": 15.6,
      "z": 26.07,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "EX-S10",
      "label": "S10",
      "zone": "exhibition",
      "facing": "north",
      "x": 18.67,
      "z": 26.07,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "EX-S11",
      "label": "S11",
      "zone": "exhibition",
      "facing": "north",
      "x": 21.73,
      "z": 26.07,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "EX-S12",
      "label": "S12",
      "zone": "exhibition",
      "facing": "south",
      "x": 24.79,
      "z": 20.67,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "EX-S13",
      "label": "S13",
      "zone": "exhibition",
      "facing": "south",
      "x": 21.73,
      "z": 20.67,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "EX-S14",
      "label": "S14",
      "zone": "exhibition",
      "facing": "south",
      "x": 18.67,
      "z": 20.67,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "EX-S15",
      "label": "S15",
      "zone": "exhibition",
      "facing": "south",
      "x": 15.6,
      "z": 20.67,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "EX-S16",
      "label": "S16",
      "zone": "exhibition",
      "facing": "south",
      "x": 5.72,
      "z": 20.67,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "EX-S17",
      "label": "S17",
      "zone": "exhibition",
      "facing": "south",
      "x": 2.65,
      "z": 20.67,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "EX-S18",
      "label": "S18",
      "zone": "exhibition",
      "facing": "south",
      "x": -0.41,
      "z": 20.67,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "EX-S19",
      "label": "S19",
      "zone": "exhibition",
      "facing": "south",
      "x": -3.47,
      "z": 20.67,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "EX-S20",
      "label": "S20",
      "zone": "exhibition",
      "facing": "south",
      "x": -6.53,
      "z": 20.67,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "EX-S21",
      "label": "S21",
      "zone": "exhibition",
      "facing": "south",
      "x": -9.59,
      "z": 20.67,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "EX-S22",
      "label": "S22",
      "zone": "exhibition",
      "facing": "south",
      "x": -15.71,
      "z": 20.67,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF1-S1",
      "label": "S1",
      "zone": "prefunction-1",
      "facing": "north",
      "x": -31.02,
      "z": 18.03,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF1-S2",
      "label": "S2",
      "zone": "prefunction-1",
      "facing": "north",
      "x": -27.96,
      "z": 18.03,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF1-S3",
      "label": "S3",
      "zone": "prefunction-1",
      "facing": "north",
      "x": -24.9,
      "z": 18.03,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF1-S4",
      "label": "S4",
      "zone": "prefunction-1",
      "facing": "north",
      "x": -21.83,
      "z": 18.03,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF1-S5",
      "label": "S5",
      "zone": "prefunction-1",
      "facing": "north",
      "x": -18.77,
      "z": 18.03,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF1-S6",
      "label": "S6",
      "zone": "prefunction-1",
      "facing": "north",
      "x": -15.71,
      "z": 18.03,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF1-S7",
      "label": "S7",
      "zone": "prefunction-1",
      "facing": "north",
      "x": -9.59,
      "z": 18.03,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF1-S8",
      "label": "S8",
      "zone": "prefunction-1",
      "facing": "north",
      "x": -6.53,
      "z": 18.03,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF1-S9",
      "label": "S9",
      "zone": "prefunction-1",
      "facing": "north",
      "x": -3.47,
      "z": 18.03,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF1-S10",
      "label": "S10",
      "zone": "prefunction-1",
      "facing": "north",
      "x": -0.41,
      "z": 18.03,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF1-S11",
      "label": "S11",
      "zone": "prefunction-1",
      "facing": "north",
      "x": 2.65,
      "z": 18.03,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF1-S12",
      "label": "S12",
      "zone": "prefunction-1",
      "facing": "north",
      "x": 5.72,
      "z": 18.03,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF1-S13",
      "label": "S13",
      "zone": "prefunction-1",
      "facing": "north",
      "x": 15.6,
      "z": 18.03,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF1-S14",
      "label": "S14",
      "zone": "prefunction-1",
      "facing": "north",
      "x": 18.67,
      "z": 18.03,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF1-S15",
      "label": "S15",
      "zone": "prefunction-1",
      "facing": "north",
      "x": 21.73,
      "z": 18.03,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF2-S1",
      "label": "S1",
      "zone": "prefunction-2",
      "facing": "south",
      "x": -15.71,
      "z": -24.54,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF2-S2",
      "label": "S2",
      "zone": "prefunction-2",
      "facing": "south",
      "x": -12.65,
      "z": -24.54,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF2-S3",
      "label": "S3",
      "zone": "prefunction-2",
      "facing": "south",
      "x": -9.59,
      "z": -24.54,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF2-S4",
      "label": "S4",
      "zone": "prefunction-2",
      "facing": "south",
      "x": -6.53,
      "z": -24.54,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF2-S5",
      "label": "S5",
      "zone": "prefunction-2",
      "facing": "south",
      "x": -3.47,
      "z": -24.54,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF2-S6",
      "label": "S6",
      "zone": "prefunction-2",
      "facing": "south",
      "x": 12.54,
      "z": -24.54,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF2-S7",
      "label": "S7",
      "zone": "prefunction-2",
      "facing": "south",
      "x": 15.6,
      "z": -24.54,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF2-S8",
      "label": "S8",
      "zone": "prefunction-2",
      "facing": "south",
      "x": 18.67,
      "z": -24.54,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF2-S9",
      "label": "S9",
      "zone": "prefunction-2",
      "facing": "south",
      "x": 21.73,
      "z": -24.54,
      "w": 3.0,
      "d": 2.0
    },
    {
      "code": "PF2-S10",
      "label": "S10",
      "zone": "prefunction-2",
      "facing": "south",
      "x": 24.79,
      "z": -24.54,
      "w": 3.0,
      "d": 2.0
    }
  ],
  "volumes": [
    {
      "kind": "stage",
      "h": 1.0,
      "x": -15.37,
      "z": -0.6,
      "w": 9.07,
      "d": 25.0
    },
    {
      "kind": "block",
      "h": 3.2,
      "x": -24.12,
      "z": -4.17,
      "w": 8.43,
      "d": 32.87
    },
    {
      "kind": "block",
      "h": 3.2,
      "x": -41.2,
      "z": 12.52,
      "w": 14.07,
      "d": 13.17
    },
    {
      "kind": "block",
      "h": 3.2,
      "x": -41.12,
      "z": -25.47,
      "w": 12.23,
      "d": 1.93
    },
    {
      "kind": "block",
      "h": 3.2,
      "x": -46.28,
      "z": -20.75,
      "w": 1.9,
      "d": 7.5
    },
    {
      "kind": "block",
      "h": 3.2,
      "x": 35.42,
      "z": -0.75,
      "w": 9.17,
      "d": 39.7
    },
    {
      "kind": "block",
      "h": 3.2,
      "x": 44.03,
      "z": 10.63,
      "w": 8.07,
      "d": 16.93
    },
    {
      "kind": "block",
      "h": 3.2,
      "x": 38.2,
      "z": 23.35,
      "w": 19.73,
      "d": 8.5
    },
    {
      "kind": "block",
      "h": 3.0,
      "x": -20.0,
      "z": -26.3,
      "w": 4.47,
      "d": 3.07
    },
    {
      "kind": "ramp",
      "h": 0.35,
      "x": 44.03,
      "z": -13.25,
      "w": 8.07,
      "d": 30.83
    }
  ],
  "walls": [
    {
      "kind": "hall-wall",
      "h": 3.6,
      "x": 8.6,
      "z": -20.4,
      "w": 39.67,
      "d": 0.4
    },
    {
      "kind": "hall-wall",
      "h": 3.6,
      "x": 8.6,
      "z": 12.07,
      "w": 39.67,
      "d": 0.4
    },
    {
      "kind": "hall-wall",
      "h": 3.6,
      "x": 28.23,
      "z": -4.17,
      "w": 0.4,
      "d": 32.87
    },
    {
      "kind": "wall",
      "h": 2.8,
      "x": -22.78,
      "z": -27.07,
      "w": 50.9,
      "d": 0.4
    },
    {
      "kind": "wall",
      "h": 2.8,
      "x": 24.0,
      "z": -27.07,
      "w": 32.0,
      "d": 0.4
    },
    {
      "kind": "wall",
      "h": 2.8,
      "x": -48.03,
      "z": -19.55,
      "w": 0.4,
      "d": 15.43
    },
    {
      "kind": "wall",
      "h": 2.8,
      "x": -48.03,
      "z": 8.47,
      "w": 0.4,
      "d": 21.27
    },
    {
      "kind": "wall",
      "h": 2.8,
      "x": -33.98,
      "z": 18.9,
      "w": 28.5,
      "d": 0.4
    },
    {
      "kind": "wall",
      "h": 2.8,
      "x": -19.53,
      "z": 23.35,
      "w": 0.4,
      "d": 8.5
    },
    {
      "kind": "wall",
      "h": 2.8,
      "x": -6.25,
      "z": 27.4,
      "w": 26.97,
      "d": 0.4
    },
    {
      "kind": "wall",
      "h": 2.8,
      "x": 21.2,
      "z": 27.4,
      "w": 14.27,
      "d": 0.4
    },
    {
      "kind": "wall",
      "h": 2.8,
      "x": -16.95,
      "z": 19.1,
      "w": 5.57,
      "d": 0.4
    },
    {
      "kind": "wall",
      "h": 2.8,
      "x": -1.95,
      "z": 19.1,
      "w": 18.37,
      "d": 0.4
    },
    {
      "kind": "wall",
      "h": 2.8,
      "x": 20.2,
      "z": 19.1,
      "w": 12.27,
      "d": 0.4
    },
    {
      "kind": "wall",
      "h": 2.8,
      "x": 28.23,
      "z": 19.1,
      "w": 0.2,
      "d": 0.4
    }
  ],
  "keepClear": [
    {
      "x": -19.64,
      "z": -24.54,
      "w": 4.79,
      "d": 2.04,
      "text": "LIFT / STAIR / AHU KEEP CLEAR 4.7 m"
    },
    {
      "x": 4.54,
      "z": -24.54,
      "w": 12.95,
      "d": 2.04,
      "text": "MAIN ENTRY KEEP CLEAR 12.7 m"
    },
    {
      "x": -12.65,
      "z": 18.03,
      "w": 3.06,
      "d": 2.04,
      "text": "DOORS TO EXHIBITION KEEP CLEAR 3.0 m"
    },
    {
      "x": 10.66,
      "z": 18.03,
      "w": 6.83,
      "d": 2.04,
      "text": "DOORS + CROSS ROUTE KEEP CLEAR 6.7 m"
    },
    {
      "x": -12.65,
      "z": 20.61,
      "w": 3.06,
      "d": 2.15,
      "text": "MAIN ENTRANCE KEEP CLEAR 3.0 m"
    },
    {
      "x": 10.66,
      "z": 20.61,
      "w": 6.83,
      "d": 2.15,
      "text": "CORRIDOR DOORS CROSS ROUTE - KEEP CLEAR 6.7 m"
    },
    {
      "x": 10.66,
      "z": 26.07,
      "w": 6.83,
      "d": 2.04,
      "text": "FIRE EXIT DOORS + WASH BASINS KEEP CLEAR 6.7 m"
    },
    {
      "x": 25.7,
      "z": 24.39,
      "w": 4.89,
      "d": 5.4,
      "text": "WASH BASINS SERVICE ACCESS KEEP CLEAR"
    },
    {
      "x": 27.23,
      "z": 20.67,
      "w": 1.83,
      "d": 2.04,
      "text": "SERVICE"
    }
  ],
  "aisles": [
    {
      "x": -0.28,
      "z": -22.07,
      "w": 55.74,
      "d": 2.91
    },
    {
      "x": -2.87,
      "z": 15.47,
      "w": 60.93,
      "d": 3.08
    },
    {
      "x": -5.0,
      "z": 23.37,
      "w": 24.49,
      "d": 3.36
    },
    {
      "x": 18.67,
      "z": 23.37,
      "w": 9.18,
      "d": 3.36
    }
  ],
  "blocked": [
    {
      "x": 0.6,
      "z": 19.3,
      "w": 2.4,
      "d": 0.47
    }
  ],
  "backdrops": [
    {
      "kind": "checkered",
      "x": -42.27,
      "z": -9.87,
      "w": 1.02,
      "d": 6.11
    },
    {
      "kind": "media",
      "x": -42.27,
      "z": -2.83,
      "w": 1.02,
      "d": 6.11
    }
  ],
  "loop": [
    {
      "x": -14.67,
      "z": 24.23,
      "dir": "east"
    },
    {
      "x": -11.5,
      "z": 22.5,
      "dir": "west"
    },
    {
      "x": -8.33,
      "z": 24.23,
      "dir": "east"
    },
    {
      "x": -5.17,
      "z": 22.5,
      "dir": "west"
    },
    {
      "x": -2.0,
      "z": 24.23,
      "dir": "east"
    },
    {
      "x": 1.17,
      "z": 22.5,
      "dir": "west"
    },
    {
      "x": 4.33,
      "z": 24.23,
      "dir": "east"
    },
    {
      "x": 7.5,
      "z": 22.5,
      "dir": "west"
    },
    {
      "x": 10.67,
      "z": 24.23,
      "dir": "east"
    },
    {
      "x": 13.83,
      "z": 22.5,
      "dir": "west"
    },
    {
      "x": 17.0,
      "z": 24.23,
      "dir": "east"
    },
    {
      "x": 20.17,
      "z": 22.5,
      "dir": "west"
    }
  ],
  "loopStart": {
    "x": -15.71,
    "z": 24.58
  },
  "entrances": [
    {
      "name": "Main entrance",
      "x": -49.73,
      "z": -7.0,
      "w": 9.67,
      "facing": "east"
    },
    {
      "name": "Main entry",
      "x": 5.33,
      "z": -28.77,
      "w": 5.33,
      "facing": "south"
    }
  ],
  "labels": [
    {
      "title": "Main Hall",
      "sub": "1500 seats",
      "x": 8.6,
      "z": -4.17
    },
    {
      "title": "Main entrance",
      "sub": "Entrance lobby",
      "x": -41.33,
      "z": 2.83
    },
    {
      "title": "Exhibition Area",
      "sub": "Dining hall · 22 stalls",
      "x": -5.0,
      "z": 23.37
    },
    {
      "title": "Pre-function Area 1",
      "sub": "15 stalls",
      "x": 16.67,
      "z": 15.5
    },
    {
      "title": "Pre-function Area 2",
      "sub": "10 stalls",
      "x": 16.67,
      "z": -22.0
    },
    {
      "title": "Stage",
      "sub": null,
      "x": -15.37,
      "z": -0.6
    },
    {
      "title": "Main entry",
      "sub": "North doors",
      "x": 5.33,
      "z": -29.17
    },
    {
      "title": "Backdrops",
      "sub": "Checkered · Media",
      "x": -42.27,
      "z": -6.33
    },
    {
      "title": "Loop start",
      "sub": "S1",
      "x": -15.71,
      "z": 25.74
    },
    {
      "title": "Toilets",
      "sub": null,
      "x": 35.33,
      "z": -4.5
    },
    {
      "title": "Kitchen",
      "sub": null,
      "x": 38.33,
      "z": 23.33
    }
  ]
} as const;

export const STALLS: readonly Stall[] = VENUE_3D.stalls as unknown as Stall[];

export const ZONE_NAMES: Record<StallZone, string> = {
  exhibition: "Exhibition Area, dining hall",
  "prefunction-1": "Pre-function Area 1, south corridor",
  "prefunction-2": "Pre-function Area 2, north corridor",
};
