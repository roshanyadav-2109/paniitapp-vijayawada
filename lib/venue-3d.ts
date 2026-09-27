/**
 * Generated from page 3 of the NICC project brief ("Event & Exhibition Stall
 * Layout") by scripts/build_venue3d.py — edit the drawing or the script, not
 * this file. Coordinates are metres from the middle of the drawing: x runs
 * east, z runs south.
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

export const STALLS: readonly Stall[] = [
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
] as Stall[];

export const ZONE_NAMES: Record<StallZone, string> = {
  exhibition: "Exhibition Area, dining hall",
  "prefunction-1": "Pre-function Area 1, south corridor",
  "prefunction-2": "Pre-function Area 2, north corridor",
};
