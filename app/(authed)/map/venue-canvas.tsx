"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { STALLS, type Stall, type StallZone } from "@/lib/venue-3d";
import { SCENE, SEATS } from "@/lib/venue-3d-scene";

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

/** One colour per stall area, so a booth says where it is from across the hall. */
export const ZONE_COLOR: Record<StallZone, string> = {
  exhibition: "#0EA5E9",
  "prefunction-1": "#10B981",
  "prefunction-2": "#8B5CF6",
};

/** Rooms by what they are for, pale enough that the stalls stay the loudest thing. */
const ROOM_COLOR: Record<string, string> = {
  service: "#CDD3DC",
  toilet: "#CFE0F1",
  lounge: "#DDD5F3",
  green: "#D2EAD9",
  office: "#E8DFCF",
  circulation: "#C3CBD7",
  kitchen: "#F2DFC6",
};

const INK = "#1E2433";
const WALL = "#E4E8EF";
const HALL_WALL = "#B9C3D2";
const COLUMN = "#D5DAE2";
const STAGE_TOP = "#8A6039";
const STAGE_SIDE = "#5E3F24";
const CARPET = "#5C687E";
const SEAT = "#9C1C33";
const BOOTH_WALL = "#FFFFFF";
const ENTRANCE = "#16A34A";
const LOOP = "#059669";
const BLOCKED = "#DC2626";
const BRAND = "#1B1464";
const SELECTED = "#1B1464";

const BOOTH_H = 2.5;
const FASCIA_H = 0.55;
const PANEL = 0.06;

/* ------------------------------------------------------------------ */

export interface CanvasProps {
  /** Stall code to the name of whoever holds it. */
  occupied: Record<string, string>;
  selected: string | null;
  onSelect: (code: string | null) => void;
  /** Changes whenever the camera should fly to a stall. */
  focus: { code: string; nonce: number } | null;
  /** Bumped by the reset button. */
  resetNonce: number;
}

export default function VenueCanvas(props: CanvasProps) {
  return (
    <Canvas
      // Render only when something moves. A map spends most of its life
      // being looked at, and a phone should not be redrawing a still
      // building sixty times a second while it is.
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 38, near: 0.5, far: 1200, position: [40, 70, 90] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onPointerMissed={() => props.onSelect(null)}
      className="touch-none"
    >
      <color attach="background" args={["#E9EEF4"]} />
      <hemisphereLight args={["#ffffff", "#8b96aa", 1.05]} />
      <directionalLight position={[45, 90, 35]} intensity={1.55} />
      <directionalLight position={[-60, 40, -50]} intensity={0.4} />

      <Scene {...props} />
    </Canvas>
  );
}

function Scene({ occupied, selected, onSelect, focus, resetNonce }: CanvasProps) {
  const controls = useRef<OrbitControlsImpl | null>(null);

  return (
    <>
      <Ground />
      <FloorPlan />
      <Hall />
      <Stage />
      <Rooms />
      <Ramp />
      <Walls />
      <Columns />
      {STALLS.map((s) => (
        <Booth
          key={s.code}
          stall={s}
          holder={occupied[s.code] ?? null}
          selected={selected === s.code}
          onSelect={onSelect}
        />
      ))}
      <Backdrops />
      <OneWayLoop />
      <Blocked />
      <Entrances />
      <FloorWords />
      <Labels />
      {/* Soft shadow under everything that stands up, drawn once: it is
          what makes the building sit on the ground instead of float. */}
      <ContactShadows
        position={[0, 0.015, 0]}
        scale={[SCENE.floor.w + 20, SCENE.floor.d + 20]}
        resolution={1024}
        blur={2.2}
        far={6}
        opacity={0.32}
        frames={1}
      />

      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.12}
        minDistance={8}
        maxDistance={260}
        // Never below the floor, never flat on it: a plan seen edge-on is a line.
        minPolarAngle={0.08}
        maxPolarAngle={Math.PI / 2.25}
        screenSpacePanning={false}
      />
      <CameraRig controls={controls} focus={focus} resetNonce={resetNonce} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Ground and floor                                                    */
/* ------------------------------------------------------------------ */

function Ground() {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.03, 0]}>
      <planeGeometry args={[420, 420]} />
      <meshStandardMaterial color="#D9E3D6" roughness={1} />
    </mesh>
  );
}

/** The architects' own drawing, laid on the ground at true scale. */
function FloorPlan() {
  const tex = useTexture(SCENE.floor.texture);
  const { gl } = useThree();
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    tex.needsUpdate = true;
  }, [tex, gl]);
  return (
    <mesh rotation-x={-Math.PI / 2}>
      <planeGeometry args={[SCENE.floor.w, SCENE.floor.d]} />
      <meshStandardMaterial map={tex} roughness={1} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* The main hall                                                       */
/* ------------------------------------------------------------------ */

/**
 * Carpet and every seat in the hall. The seats come off the drawing one by
 * one — 1,515 of them — and are drawn as one instanced mesh, so they cost
 * the phone one draw call, not fifteen hundred.
 */
function Hall() {
  const seats = useRef<THREE.InstancedMesh>(null);
  const count = SEATS.length / 2;

  const chair = useMemo(() => {
    // Facing west, toward the stage: the back is on the east side.
    const cushion = new THREE.BoxGeometry(0.44, 0.1, 0.48);
    cushion.translate(0, 0.44, 0);
    const back = new THREE.BoxGeometry(0.07, 0.56, 0.48);
    back.translate(0.2, 0.74, 0);
    const base = new THREE.BoxGeometry(0.3, 0.4, 0.36);
    base.translate(0.02, 0.2, 0);
    return mergeGeometries([cushion, back, base]);
  }, []);

  useLayoutEffect(() => {
    const m = seats.current;
    if (!m) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      o.position.set(SEATS[i * 2], 0, SEATS[i * 2 + 1]);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [count]);

  const c = SCENE.hall.carpet;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[c.x, 0.02, c.z]}>
        <planeGeometry args={[c.w, c.d]} />
        <meshStandardMaterial color={CARPET} roughness={1} />
      </mesh>
      <instancedMesh ref={seats} args={[chair, undefined, count]}>
        <meshStandardMaterial color={SEAT} roughness={0.75} />
      </instancedMesh>
    </group>
  );
}

/** The stage: timber platform, LED wall along the back, lectern, steps at each end. */
function Stage() {
  const { platform, screen, lectern, steps } = SCENE.stage;
  const led = useMemo(
    () =>
      canvasTexture(1024, 288, (g, w, h) => {
        const grad = g.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, "#1B1464");
        grad.addColorStop(1, "#0E7490");
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);
        g.fillStyle = "#FFFFFF";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.font = "800 92px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        g.fillText("PanIIT", w / 2, h * 0.4);
        g.font = "600 40px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        g.fillText("Andhra Pradesh Summit 2026", w / 2, h * 0.72);
      }),
    []
  );

  return (
    <group>
      {/* platform: timber top, darker skirt */}
      <mesh position={[platform.x, platform.h / 2, platform.z]}>
        <boxGeometry args={[platform.w, platform.h, platform.d]} />
        <meshStandardMaterial attach="material-0" color={STAGE_SIDE} />
        <meshStandardMaterial attach="material-1" color={STAGE_SIDE} />
        <meshStandardMaterial attach="material-2" color={STAGE_TOP} roughness={0.6} />
        <meshStandardMaterial attach="material-3" color={STAGE_SIDE} />
        <meshStandardMaterial attach="material-4" color={STAGE_SIDE} />
        <meshStandardMaterial attach="material-5" color={STAGE_SIDE} />
      </mesh>
      {/* the LED wall, facing the audience to the east */}
      <mesh position={[screen.x + 0.2, platform.h + screen.h / 2, screen.z]}>
        <boxGeometry args={[0.3, screen.h, screen.d]} />
        <meshBasicMaterial attach="material-0" map={led} />
        <meshStandardMaterial attach="material-1" color="#20242E" />
        <meshStandardMaterial attach="material-2" color="#20242E" />
        <meshStandardMaterial attach="material-3" color="#20242E" />
        <meshStandardMaterial attach="material-4" color="#20242E" />
        <meshStandardMaterial attach="material-5" color="#20242E" />
      </mesh>
      {/* lectern */}
      <mesh position={[lectern.x, platform.h + 0.58, lectern.z]}>
        <boxGeometry args={[0.55, 1.16, 0.6]} />
        <meshStandardMaterial color="#3A2A1C" roughness={0.5} />
      </mesh>
      {/* three steps up at each end */}
      {steps.map((s, i) =>
        [0, 1, 2].map((k) => {
          const h = ((k + 1) / 3) * platform.h;
          // Lowest step furthest from the stage: the north flight climbs south, the south one north.
          const fromHall = i === 0 ? -1 : 1;
          const depth = s.d / 3;
          return (
            <mesh
              key={`${i}-${k}`}
              position={[s.x, h / 2, s.z + fromHall * (s.d / 2 - depth / 2 - k * depth)]}
            >
              <boxGeometry args={[s.w, h, depth]} />
              <meshStandardMaterial color={k === 2 ? STAGE_TOP : STAGE_SIDE} />
            </mesh>
          );
        })
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Rooms, ramp, walls, columns                                         */
/* ------------------------------------------------------------------ */

function Rooms() {
  return (
    <>
      {SCENE.rooms.map((r, i) => (
        <group key={i}>
          <mesh position={[r.x, r.h / 2, r.z]}>
            <boxGeometry args={[r.w, r.h, r.d]} />
            <meshStandardMaterial color={ROOM_COLOR[r.kind] ?? ROOM_COLOR.service} roughness={0.9} />
          </mesh>
          {r.name ? (
            <FlatText text={r.name} x={r.x} y={r.h + 0.02} z={r.z} fit={Math.min(r.w, r.d)} />
          ) : null}
        </group>
      ))}
    </>
  );
}

/** The ramp down to the basement car park: a hatched slab, falling away. */
function Ramp() {
  const r = SCENE.ramp;
  const hatch = useMemo(
    () =>
      canvasTexture(128, 512, (g, w, h) => {
        g.fillStyle = "#BAC2CE";
        g.fillRect(0, 0, w, h);
        g.strokeStyle = "#8E98A8";
        g.lineWidth = 6;
        for (let y = -w; y < h; y += 28) {
          g.beginPath();
          g.moveTo(0, y + w);
          g.lineTo(w / 2, y);
          g.lineTo(w, y + w);
          g.stroke();
        }
      }),
    []
  );
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[r.x, 0.03, r.z]}>
        <planeGeometry args={[r.w, r.d]} />
        <meshStandardMaterial map={hatch} roughness={1} />
      </mesh>
      <FlatText text={r.name} x={r.x} y={0.06} z={r.z} fit={Math.min(r.w, r.d)} />
    </group>
  );
}

function Walls() {
  return (
    <>
      {SCENE.walls.map((w, i) => (
        <mesh key={i} position={[w.x, w.h / 2, w.z]}>
          <boxGeometry args={[w.w, w.h, w.d]} />
          <meshStandardMaterial color={w.kind === "hall-wall" ? HALL_WALL : WALL} roughness={0.9} />
        </mesh>
      ))}
    </>
  );
}

/** The structural columns at the grid intersections, one draw call for all of them. */
function Columns() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const n = SCENE.columns.length;
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    SCENE.columns.forEach(([x, z], i) => {
      o.position.set(x, 1.75, z);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]}>
      <boxGeometry args={[0.7, 3.5, 0.7]} />
      <meshStandardMaterial color={COLUMN} roughness={0.8} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */
/* Words laid flat — on roofs and floors                               */
/* ------------------------------------------------------------------ */

/**
 * Text lying flat, turning about the vertical as the camera orbits so it
 * always reads upright, the way the names on a map stay upright when you
 * turn the map. `fit` is the room it has: the text is sized so that it
 * stays inside that width whichever way it has turned.
 */
function FlatText({
  text,
  x,
  y,
  z,
  fit,
  size = 0.9,
}: {
  text: string;
  x: number;
  y: number;
  z: number;
  fit: number;
  size?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;

  const { tex, w, h } = useMemo(() => {
    const px = 64;
    const c = document.createElement("canvas");
    const g = c.getContext("2d")!;
    g.font = `700 ${px}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    const tw = Math.ceil(g.measureText(text).width) + 24;
    c.width = tw;
    c.height = px + 20;
    const g2 = c.getContext("2d")!;
    g2.font = `700 ${px}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    g2.fillStyle = INK;
    g2.textAlign = "center";
    g2.textBaseline = "middle";
    g2.fillText(text, c.width / 2, c.height / 2 + 2);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    // Height first, then shrink until the diagonal fits the room it is on.
    let hh = Math.min(size, fit * 0.3);
    let ww = hh * (c.width / c.height);
    const diag = Math.hypot(ww, hh);
    if (diag > fit * 0.92) {
      const k = (fit * 0.92) / diag;
      ww *= k;
      hh *= k;
    }
    return { tex: t, w: ww, h: hh };
  }, [text, fit, size]);

  useFrame(({ camera }) => {
    const gr = group.current;
    if (!gr) return;
    const t = controls?.target;
    const ax = camera.position.x - (t?.x ?? 0);
    const az = camera.position.z - (t?.z ?? 0);
    gr.rotation.y = Math.atan2(ax, az);
  });

  return (
    <group ref={group} position={[x, y, z]}>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

function FloorWords() {
  return (
    <>
      {SCENE.floorWords.map((f, i) => (
        <FlatText key={i} text={f.text} x={f.x} y={0.04} z={f.z} fit={f.size} size={0.8} />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Stalls                                                              */
/* ------------------------------------------------------------------ */

/** Mixes a colour toward white; 0 is the colour, 1 is white. */
function tint(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color("#FFFFFF"), amount);
  return `#${c.getHexString()}`;
}

/** A booth: carpet, back wall, two side walls and a lit fascia with its number. */
function Booth({
  stall,
  holder,
  selected,
  onSelect,
}: {
  stall: Stall;
  holder: string | null;
  selected: boolean;
  onSelect: (code: string | null) => void;
}) {
  const colour = ZONE_COLOR[stall.zone];
  // The plan and the stall itself say "S14"; the area is what the colour is for.
  const fascia = useFasciaTexture(stall.label, holder, colour);
  const tag = useTagTexture(stall.label, colour, selected);

  // Work in the booth's own frame: "width" runs along the open front,
  // "depth" runs back from it. A booth facing east or west is the same
  // booth turned a quarter.
  const along = stall.facing === "north" || stall.facing === "south";
  const width = along ? stall.w : stall.d;
  const depth = along ? stall.d : stall.w;
  const rotation =
    stall.facing === "north"
      ? 0
      : stall.facing === "south"
        ? Math.PI
        : stall.facing === "east"
          ? -Math.PI / 2
          : Math.PI / 2;

  function click(e: ThreeEvent<MouseEvent>) {
    // A drag that happens to end on a booth is a pan, not a choice.
    if (e.delta > 6) return;
    e.stopPropagation();
    onSelect(stall.code);
  }

  return (
    <group position={[stall.x, 0, stall.z]} rotation-y={rotation} onClick={click}>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[width - 0.04, 0.08, depth - 0.04]} />
        <meshStandardMaterial
          color={selected ? SELECTED : holder ? colour : tint(colour, 0.45)}
          roughness={1}
        />
      </mesh>
      {/* its number on a tag that always turns to face you */}
      <sprite position={[0, BOOTH_H + FASCIA_H + 0.85, 0]} scale={[2.4, 1.05, 1]}>
        <spriteMaterial map={tag} transparent depthWrite={false} />
      </sprite>
      {/* back wall: white inside, the area's colour outside and along the top */}
      <mesh position={[0, BOOTH_H / 2, depth / 2 - PANEL / 2]}>
        <boxGeometry args={[width, BOOTH_H, PANEL]} />
        <meshStandardMaterial attach="material-0" color={colour} />
        <meshStandardMaterial attach="material-1" color={colour} />
        <meshStandardMaterial attach="material-2" color={colour} />
        <meshStandardMaterial attach="material-3" color={colour} />
        <meshStandardMaterial attach="material-4" color={colour} />
        <meshStandardMaterial attach="material-5" color={BOOTH_WALL} roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * (width - PANEL)) / 2, BOOTH_H / 2, depth * 0.1]}>
          <boxGeometry args={[PANEL, BOOTH_H, depth * 0.8]} />
          <meshStandardMaterial color={BOOTH_WALL} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, BOOTH_H - 0.12, depth / 2 - PANEL - 0.01]}>
        <boxGeometry args={[width - PANEL * 2, 0.24, 0.02]} />
        <meshStandardMaterial color={colour} roughness={0.7} />
      </mesh>
      {/* fascia over the open front */}
      <mesh position={[0, BOOTH_H + FASCIA_H / 2, -depth / 2 + 0.03]}>
        <boxGeometry args={[width, FASCIA_H, 0.05]} />
        <meshBasicMaterial attach="material-0" color={colour} />
        <meshBasicMaterial attach="material-1" color={colour} />
        <meshBasicMaterial attach="material-2" color={colour} />
        <meshBasicMaterial attach="material-3" color={colour} />
        <meshBasicMaterial attach="material-4" map={fascia} />
        <meshBasicMaterial attach="material-5" map={fascia} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`p${side}`} position={[(side * (width - 0.08)) / 2, BOOTH_H / 2, -depth / 2 + 0.04]}>
          <boxGeometry args={[0.06, BOOTH_H, 0.06]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.6} />
        </mesh>
      ))}
      {/* a counter at the front corner, so an empty booth still looks like one */}
      <mesh position={[width / 2 - 0.65, 0.5, -depth / 2 + 0.45]}>
        <boxGeometry args={[1.0, 0.92, 0.5]} />
        <meshStandardMaterial color={selected ? SELECTED : "#F8FAFC"} roughness={0.8} />
      </mesh>
      {selected ? (
        <mesh position={[0, BOOTH_H + FASCIA_H + 2.1, 0]} rotation-x={Math.PI}>
          <coneGeometry args={[0.45, 0.9, 16]} />
          <meshBasicMaterial color={SELECTED} />
        </mesh>
      ) : null}
    </group>
  );
}

function useFasciaTexture(label: string, holder: string | null, colour: string) {
  return useMemo(
    () =>
      canvasTexture(512, 72, (g, w, h) => {
        g.fillStyle = colour;
        g.fillRect(0, 0, w, h);
        g.fillStyle = "#FFFFFF";
        g.textAlign = "center";
        g.textBaseline = "middle";
        const text = holder ? `${label} · ${holder}` : label;
        let size = 40;
        g.font = `700 ${size}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
        while (g.measureText(text).width > w - 24 && size > 18) {
          size -= 2;
          g.font = `700 ${size}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
        }
        g.fillText(text, w / 2, h / 2 + 2);
      }),
    [label, holder, colour]
  );
}

/** The floating tag: a white pill edged in the area's colour, navy when chosen. */
function useTagTexture(label: string, colour: string, selected: boolean) {
  return useMemo(
    () =>
      canvasTexture(256, 112, (g) => {
        const r = 48;
        g.beginPath();
        g.moveTo(r + 6, 6);
        g.arcTo(250, 6, 250, 106, r);
        g.arcTo(250, 106, 6, 106, r);
        g.arcTo(6, 106, 6, 6, r);
        g.arcTo(6, 6, 250, 6, r);
        g.closePath();
        g.fillStyle = selected ? SELECTED : "#FFFFFF";
        g.fill();
        g.lineWidth = 9;
        g.strokeStyle = colour;
        g.stroke();
        g.fillStyle = selected ? "#FFFFFF" : "#0F172A";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.font = "800 60px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        g.fillText(label, 128, 59);
      }),
    [label, colour, selected]
  );
}

/* ------------------------------------------------------------------ */
/* Backdrops, the one-way loop, doors                                   */
/* ------------------------------------------------------------------ */

/** The two 6 m backdrops in the entrance lobby, printed side toward the main doors. */
function Backdrops() {
  const checks = useMemo(
    () =>
      canvasTexture(512, 256, (g, w, h) => {
        const size = w / 16;
        for (let i = 0; i < 16; i++) {
          for (let j = 0; j < Math.ceil(h / size); j++) {
            g.fillStyle = (i + j) % 2 ? "#FFFFFF" : BRAND;
            g.fillRect(i * size, j * size, size, size);
          }
        }
      }),
    []
  );
  const media = useMemo(
    () =>
      canvasTexture(1024, 512, (g, w, h) => {
        g.fillStyle = BRAND;
        g.fillRect(0, 0, w, h);
        g.fillStyle = "#FFFFFF";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.font = "800 96px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        g.fillText("PanIIT", w / 2, h * 0.36);
        g.font = "600 44px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        g.fillText("Andhra Pradesh Summit 2026", w / 2, h * 0.64);
      }),
    []
  );

  return (
    <>
      {SCENE.backdrops.map((b) => {
        const face = b.kind === "checkered" ? checks : media;
        return (
          <mesh key={b.kind} position={[b.x, 1.6, b.z]}>
            <boxGeometry args={[0.25, 3.2, b.d]} />
            <meshStandardMaterial attach="material-0" color="#2B2F3A" />
            <meshBasicMaterial attach="material-1" map={face} />
            <meshStandardMaterial attach="material-2" color="#2B2F3A" />
            <meshStandardMaterial attach="material-3" color="#2B2F3A" />
            <meshStandardMaterial attach="material-4" color="#2B2F3A" />
            <meshStandardMaterial attach="material-5" color="#2B2F3A" />
          </mesh>
        );
      })}
    </>
  );
}

/** The exhibition's one-way loop: in along the south row from S1, back along the north row. */
function OneWayLoop() {
  const shape = useMemo(() => arrowShape(), []);
  const start = SCENE.loopStart;
  return (
    <>
      {SCENE.loop.map((a, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, a.dir === "east" ? -Math.PI / 2 : Math.PI / 2]}
          position={[a.x, 0.07, a.z]}
          scale={0.42}
        >
          <shapeGeometry args={[shape]} />
          <meshBasicMaterial color={LOOP} />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[start.x, 0.06, start.z]}>
        <circleGeometry args={[0.9, 28]} />
        <meshBasicMaterial color={LOOP} />
      </mesh>
    </>
  );
}

/** The doorway the drawing marks as blocked, with stall bays over it. */
function Blocked() {
  return (
    <>
      {SCENE.blocked.map((b, i) => (
        <mesh key={i} position={[b.x, 0.5, b.z]}>
          <boxGeometry args={[b.w, 1.0, 0.3]} />
          <meshStandardMaterial color={BLOCKED} />
        </mesh>
      ))}
    </>
  );
}

const TURN: Record<string, number> = { north: 0, east: -Math.PI / 2, south: Math.PI, west: Math.PI / 2 };

/** An arch over each way in, and an arrow on the ground pointing inside. */
function Entrances() {
  const shape = useMemo(() => arrowShape(), []);
  return (
    <>
      {SCENE.entrances.map((e) => (
        <group key={e.name} position={[e.x, 0, e.z]} rotation-y={TURN[e.facing] + Math.PI}>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[(side * e.w) / 2, 2.0, 0]}>
              <boxGeometry args={[0.35, 4.0, 0.35]} />
              <meshStandardMaterial color={ENTRANCE} />
            </mesh>
          ))}
          <mesh position={[0, 4.1, 0]}>
            <boxGeometry args={[e.w + 0.35, 0.5, 0.4]} />
            <meshStandardMaterial color={ENTRANCE} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, Math.PI]} position={[0, 0.06, -3.2]}>
            <shapeGeometry args={[shape]} />
            <meshBasicMaterial color={ENTRANCE} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function arrowShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 2.2);
  s.lineTo(1.6, 0.4);
  s.lineTo(0.55, 0.4);
  s.lineTo(0.55, -1.8);
  s.lineTo(-0.55, -1.8);
  s.lineTo(-0.55, 0.4);
  s.lineTo(-1.6, 0.4);
  s.closePath();
  return s;
}

function canvasTexture(
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* ------------------------------------------------------------------ */
/* Floating labels                                                     */
/* ------------------------------------------------------------------ */

function Labels() {
  const near = useIsNear(45);
  const shown = useUncrowdedLabels();
  if (near) return null;
  return (
    <>
      {SCENE.labels
        .filter((l) => shown.has(l.title))
        .map((l) => (
          <Html
            key={l.title}
            position={[l.x, 6.5, l.z]}
            center
            zIndexRange={[10, 0]}
            style={{ pointerEvents: "none" }}
          >
            {/* A fixed size on screen, like the names on a street map. */}
            <div className="whitespace-nowrap rounded-full bg-white/95 px-2 py-0.5 text-center shadow-[0_1px_6px_rgba(15,23,42,0.18)] ring-1 ring-black/5">
              <p className="text-[10.5px] font-semibold leading-tight text-[#1B1464]">{l.title}</p>
              {l.sub ? (
                <p className="text-[8.5px] font-medium leading-tight text-slate-500">{l.sub}</p>
              ) : null}
            </div>
          </Html>
        ))}
    </>
  );
}

/**
 * Which labels to draw so that none sits on another. Listed most important
 * first; each is kept only if its box on screen is clear of every label
 * already kept. Worked out again when the camera settles, not on every
 * frame of a drag.
 */
function useUncrowdedLabels() {
  const { camera, controls, size } = useThree() as unknown as {
    camera: THREE.Camera;
    controls: OrbitControlsImpl | null;
    size: { width: number; height: number };
  };
  const all = useMemo(() => new Set(SCENE.labels.map((l) => l.title)), []);
  const [shown, setShown] = useState<Set<string>>(all);
  const invalidate = useThree((st) => st.invalidate);
  useEffect(() => invalidate(), [shown, invalidate]);

  useEffect(() => {
    if (!controls) return;
    let raf = 0;
    const place = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const kept: { x0: number; y0: number; x1: number; y1: number }[] = [];
        const next = new Set<string>();
        const v = new THREE.Vector3();
        for (const l of SCENE.labels) {
          v.set(l.x, 6.5, l.z).project(camera);
          if (v.z > 1) continue;
          const x = (v.x * 0.5 + 0.5) * size.width;
          const y = (-v.y * 0.5 + 0.5) * size.height;
          const chars = Math.max(l.title.length, l.sub ? l.sub.length * 0.8 : 0);
          const w = chars * 6.2 + 18;
          const h = l.sub ? 30 : 20;
          const b = { x0: x - w / 2 - 3, y0: y - h / 2 - 3, x1: x + w / 2 + 3, y1: y + h / 2 + 3 };
          if (!kept.some((k) => b.x0 < k.x1 && k.x0 < b.x1 && b.y0 < k.y1 && k.y0 < b.y1)) {
            kept.push(b);
            next.add(l.title);
          }
        }
        setShown((prev) =>
          prev.size === next.size && [...next].every((t) => prev.has(t)) ? prev : next
        );
      });
    };
    place();
    controls.addEventListener("end", place);
    const settle = window.setInterval(place, 900);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(settle);
      controls.removeEventListener("end", place);
    };
  }, [camera, controls, size.width, size.height]);

  return shown;
}

/** Whether the camera is within `distance` metres of what it is looking at. */
function useIsNear(distance: number) {
  const { camera, controls } = useThree() as unknown as {
    camera: THREE.Camera;
    controls: OrbitControlsImpl | null;
  };
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (!controls) return;
    const check = () => {
      const d = camera.position.distanceTo(controls.target);
      setNear((was) => (was !== d < distance ? d < distance : was));
    };
    check();
    controls.addEventListener("change", check);
    return () => controls.removeEventListener("change", check);
  }, [camera, controls, distance]);
  return near;
}

/* ------------------------------------------------------------------ */
/* Camera                                                              */
/* ------------------------------------------------------------------ */

const STALL_BY_CODE: Record<string, Stall> = Object.fromEntries(STALLS.map((s) => [s.code, s]));

/** The building's extent, which the opening view is fitted to. */
const BOUNDS = new THREE.Box3(
  new THREE.Vector3(-SCENE.floor.w / 2, 0, -SCENE.floor.d / 2),
  new THREE.Vector3(SCENE.floor.w / 2, 6, SCENE.floor.d / 2)
);

/**
 * Places the camera so the whole building fits the canvas, whatever its
 * shape, and flies to a stall when asked.
 */
function CameraRig({
  controls,
  focus,
  resetNonce,
}: {
  controls: React.RefObject<OrbitControlsImpl | null>;
  focus: CanvasProps["focus"];
  resetNonce: number;
}) {
  const { camera, size, invalidate } = useThree();
  const flight = useRef<{
    fromPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toPos: THREE.Vector3;
    toTarget: THREE.Vector3;
    t: number;
  } | null>(null);
  const userMoved = useRef(false);

  function fly(toPos: THREE.Vector3, toTarget: THREE.Vector3, keep = true) {
    const c = controls.current;
    if (!c) return;
    // Flying somewhere on purpose counts as moving the camera: a resize
    // afterwards must not throw it back to the overview. (Opening the stall
    // sheet is such a resize — the page makes room for the scrollbar.)
    userMoved.current = keep;
    flight.current = {
      fromPos: camera.position.clone(),
      fromTarget: c.target.clone(),
      toPos,
      toTarget,
      t: 0,
    };
    invalidate();
  }

  function overview(): [THREE.Vector3, THREE.Vector3] {
    const cam = camera as THREE.PerspectiveCamera;
    const target = new THREE.Vector3(0, 0, 2);
    // Seen corner-on, a long rectangle becomes a diamond with empty space
    // above and below it. On a phone held upright the building is swung
    // round nearly end-on instead, so its long side runs up the screen and
    // it fills the frame.
    const portrait = size.width / size.height < 1;
    const azimuth = portrait ? 1.45 : 0.42;
    const elevation = portrait ? 1.02 : 0.88;
    const dir = new THREE.Vector3(
      Math.sin(azimuth) * Math.cos(elevation),
      Math.sin(elevation),
      Math.cos(azimuth) * Math.cos(elevation)
    ).normalize();
    const corners = [0, 1, 2, 3, 4, 5, 6, 7].map(
      (i) =>
        new THREE.Vector3(
          i & 1 ? BOUNDS.max.x : BOUNDS.min.x,
          i & 2 ? BOUNDS.max.y : BOUNDS.min.y,
          i & 4 ? BOUNDS.max.z : BOUNDS.min.z
        )
    );
    let lo = 20;
    let hi = 600;
    const probe = cam.clone();
    probe.aspect = size.width / size.height;
    probe.updateProjectionMatrix();
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      probe.position.copy(target).addScaledVector(dir, mid);
      probe.lookAt(target);
      probe.updateMatrixWorld();
      const fits = corners.every((p) => {
        const v = p.clone().project(probe);
        return Math.abs(v.x) < 0.96 && Math.abs(v.y) < 0.94 && v.z < 1;
      });
      if (fits) hi = mid;
      else lo = mid;
    }
    return [target.clone().addScaledVector(dir, hi), target];
  }

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const onStart = () => {
      userMoved.current = true;
    };
    c.addEventListener("start", onStart);
    return () => c.removeEventListener("start", onStart);
  }, [controls]);

  useEffect(() => {
    if (userMoved.current) return;
    const [pos, target] = overview();
    camera.position.copy(pos);
    controls.current?.target.copy(target);
    controls.current?.update();
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height]);

  useEffect(() => {
    if (resetNonce === 0) return;
    const [pos, target] = overview();
    fly(pos, target, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetNonce]);

  useEffect(() => {
    if (!focus) return;
    const s = STALL_BY_CODE[focus.code];
    if (!s) return;
    const target = new THREE.Vector3(s.x, 1, s.z);
    const front =
      s.facing === "north"
        ? new THREE.Vector3(0, 0, -1)
        : s.facing === "south"
          ? new THREE.Vector3(0, 0, 1)
          : s.facing === "east"
            ? new THREE.Vector3(1, 0, 0)
            : new THREE.Vector3(-1, 0, 0);
    const pos = target.clone().addScaledVector(front, 9).add(new THREE.Vector3(0, 7.5, 0));
    fly(pos, target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce]);

  useFrame((_, dt) => {
    const f = flight.current;
    const c = controls.current;
    if (!f || !c) return;
    // The first frame after the map has sat still arrives with the whole
    // idle time as its step; capped, the flight is seen rather than skipped.
    f.t = Math.min(1, f.t + Math.min(dt, 1 / 30) / 0.75);
    const k = 1 - Math.pow(1 - f.t, 3);
    camera.position.lerpVectors(f.fromPos, f.toPos, k);
    c.target.lerpVectors(f.fromTarget, f.toTarget, k);
    c.update();
    if (f.t >= 1) flight.current = null;
    else invalidate();
  });

  return null;
}

