"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  STALLS,
  VENUE_3D,
  type Footprint,
  type Stall,
  type StallZone,
} from "@/lib/venue-3d";

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

/** One colour per stall zone, so a booth says where it is from across the hall. */
export const ZONE_COLOR: Record<StallZone, string> = {
  forecourt: "#F59E0B",
  dining: "#0EA5E9",
  "south-corridor": "#10B981",
  lobby: "#8B5CF6",
  "north-corridor": "#6366F1",
};

const WALL = "#FFFFFF";
const BLOCK = "#C9D1DD";
const STAGE = "#7A5A3C";
const EXTERIOR = "#AEB9CA";
const HALL_WALL = "#9FAFC6";
const DESK = "#C026D3";
const BOOTH_BLUE = "#2563EB";
const CLOSED = "#DC2626";
const ENTRANCE = "#16A34A";
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
      <color attach="background" args={["#EAF0F7"]} />
      <hemisphereLight args={["#ffffff", "#8f9bb0", 1.0]} />
      <directionalLight position={[45, 90, 35]} intensity={1.6} />
      <directionalLight position={[-60, 40, -50]} intensity={0.35} />

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
      {VENUE_3D.volumes.map((v, i) => (
        <VolumeMesh key={`v${i}`} v={v as unknown as VolumeData} />
      ))}
      {VENUE_3D.walls.map((v, i) => (
        <VolumeMesh key={`w${i}`} v={v as unknown as VolumeData} />
      ))}
      {STALLS.map((s) => (
        <Booth
          key={s.code}
          stall={s}
          holder={occupied[s.code] ?? null}
          selected={selected === s.code}
          onSelect={onSelect}
        />
      ))}
      {VENUE_3D.desks.map((d, i) => (
        <Desk key={`d${i}`} f={d} />
      ))}
      <PhotoBooth />
      <Closures />
      <Entrance />
      <Labels />

      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.12}
        minDistance={10}
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
      <meshStandardMaterial color="#DDE4EC" roughness={1} />
    </mesh>
  );
}

/** The architects' own drawing, laid on the ground at true scale. */
function FloorPlan() {
  const tex = useTexture(VENUE_3D.floor.texture);
  const { gl } = useThree();
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    tex.needsUpdate = true;
  }, [tex, gl]);
  return (
    <mesh rotation-x={-Math.PI / 2}>
      <planeGeometry args={[VENUE_3D.floor.w, VENUE_3D.floor.d]} />
      <meshStandardMaterial map={tex} roughness={1} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Building volumes                                                    */
/* ------------------------------------------------------------------ */

interface VolumeData extends Footprint {
  kind: "stage" | "block" | "ramp" | "wall" | "hall-wall";
  h: number;
}

const VOLUME_COLOR: Record<VolumeData["kind"], string> = {
  stage: STAGE,
  block: BLOCK,
  ramp: "#CBD2DC",
  wall: EXTERIOR,
  "hall-wall": HALL_WALL,
};

function VolumeMesh({ v }: { v: VolumeData }) {
  return (
    <mesh position={[v.x, v.h / 2, v.z]}>
      <boxGeometry args={[v.w, v.h, v.d]} />
      <meshStandardMaterial
        color={VOLUME_COLOR[v.kind]}
        roughness={0.85}
        // Blocks are the rooms nobody visits, so they stay in the
        // background: pale, and a little see-through where they would
        // otherwise hide a stall behind them.
        transparent={v.kind === "block"}
        opacity={v.kind === "block" ? 0.96 : 1}
      />
    </mesh>
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
  const fascia = useFasciaTexture(stall.code, holder, colour);
  const tag = useTagTexture(stall.code, colour, selected);

  // Work in the booth's own frame: "width" runs along the open front,
  // "depth" runs back from it. A booth facing east or west is the same
  // booth turned a quarter.
  const along = stall.facing === "north" || stall.facing === "south";
  const width = along ? stall.w : stall.d;
  const depth = along ? stall.d : stall.w;
  const rotation =
    stall.facing === "north" ? 0 : stall.facing === "south" ? Math.PI : stall.facing === "east" ? -Math.PI / 2 : Math.PI / 2;

  function click(e: ThreeEvent<MouseEvent>) {
    // A drag that happens to end on a booth is a pan, not a choice.
    if (e.delta > 6) return;
    e.stopPropagation();
    onSelect(stall.code);
  }

  return (
    <group position={[stall.x, 0, stall.z]} rotation-y={rotation} onClick={click}>
      {/* carpet */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[width - 0.04, 0.08, depth - 0.04]} />
        <meshStandardMaterial
          color={selected ? SELECTED : holder ? colour : tint(colour, 0.45)}
          roughness={1}
        />
      </mesh>
      {/* its number on a tag that always turns to face you. Painted on the
          carpet it read sideways from most angles, and the two rows of a
          double aisle read in opposite directions. */}
      <sprite position={[0, BOOTH_H + FASCIA_H + 0.85, 0]} scale={[2.4, 1.05, 1]}>
        <spriteMaterial map={tag} transparent depthWrite={false} />
      </sprite>
      {/* back wall — the booth faces -z in its own frame, so the back is +z.
          White inside, the zone's colour outside and along the top. */}
      <mesh position={[0, BOOTH_H / 2, depth / 2 - PANEL / 2]}>
        <boxGeometry args={[width, BOOTH_H, PANEL]} />
        <meshStandardMaterial attach="material-0" color={colour} />
        <meshStandardMaterial attach="material-1" color={colour} />
        <meshStandardMaterial attach="material-2" color={colour} />
        <meshStandardMaterial attach="material-3" color={colour} />
        <meshStandardMaterial attach="material-4" color={colour} />
        <meshStandardMaterial attach="material-5" color={WALL} roughness={0.9} />
      </mesh>
      {/* side walls, stopping short of the front so the booth reads as open */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * (width - PANEL)) / 2, BOOTH_H / 2, depth * 0.1]}>
          <boxGeometry args={[PANEL, BOOTH_H, depth * 0.8]} />
          <meshStandardMaterial color={WALL} roughness={0.9} />
        </mesh>
      ))}
      {/* a coloured band along the top of the back wall */}
      <mesh position={[0, BOOTH_H - 0.12, depth / 2 - PANEL - 0.01]}>
        <boxGeometry args={[width - PANEL * 2, 0.24, 0.02]} />
        <meshStandardMaterial color={colour} roughness={0.7} />
      </mesh>
      {/* fascia over the open front, with the stall's number */}
      <mesh position={[0, BOOTH_H + FASCIA_H / 2, -depth / 2 + 0.03]}>
        <boxGeometry args={[width, FASCIA_H, 0.05]} />
        <meshBasicMaterial attach="material-0" color={colour} />
        <meshBasicMaterial attach="material-1" color={colour} />
        <meshBasicMaterial attach="material-2" color={colour} />
        <meshBasicMaterial attach="material-3" color={colour} />
        <meshBasicMaterial attach="material-4" map={fascia} />
        <meshBasicMaterial attach="material-5" map={fascia} />
      </mesh>
      {/* fascia supports */}
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

/**
 * The fascia's face, drawn once per stall on a canvas: its number in large
 * type and, when somebody holds it, their name beneath.
 */
function useFasciaTexture(code: string, holder: string | null, colour: string) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 72;
    const g = c.getContext("2d")!;
    g.fillStyle = colour;
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#FFFFFF";
    g.textBaseline = "middle";
    g.font = "700 40px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    const label = holder ? `${code} · ${holder}` : code;
    let size = 40;
    while (g.measureText(label).width > c.width - 24 && size > 18) {
      size -= 2;
      g.font = `700 ${size}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    }
    g.textAlign = "center";
    g.fillText(label, c.width / 2, c.height / 2 + 2);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [code, holder, colour]);
}

/** The floating tag: a white pill edged in the zone's colour, navy when chosen. */
function useTagTexture(code: string, colour: string, selected: boolean) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 112;
    const g = c.getContext("2d")!;
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
    g.fillText(code, c.width / 2, c.height / 2 + 3);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [code, colour, selected]);
}

/* ------------------------------------------------------------------ */
/* Registration, photo booth, closures, entrance                       */
/* ------------------------------------------------------------------ */

function Desk({ f }: { f: Footprint }) {
  return (
    <group position={[f.x, 0, f.z]}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[f.w, 1.1, Math.max(0.7, f.d)]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.13, 0]}>
        <boxGeometry args={[f.w + 0.1, 0.06, Math.max(0.8, f.d) + 0.1]} />
        <meshStandardMaterial color={DESK} roughness={0.6} />
      </mesh>
    </group>
  );
}

function PhotoBooth() {
  const { backdrop, area } = VENUE_3D.photo;
  return (
    <group>
      <mesh position={[area.x, 0.03, area.z]}>
        <boxGeometry args={[area.w, 0.06, area.d]} />
        <meshStandardMaterial color="#BFDBFE" roughness={1} />
      </mesh>
      <mesh position={[backdrop.x, 1.5, backdrop.z]}>
        <boxGeometry args={[Math.max(0.12, backdrop.w * 0.3), 3.0, backdrop.d]} />
        <meshStandardMaterial color={BOOTH_BLUE} roughness={0.6} />
      </mesh>
    </group>
  );
}

function Closures() {
  return (
    <group>
      {VENUE_3D.closed.map((c, i) =>
        c.kind === "entry-closed" ? (
          // A barrier across the old west entrance: posts and a red rail.
          <group key={i} position={[c.x, 0, c.z]}>
            <mesh position={[0, 0.55, 0]}>
              <boxGeometry args={[0.18, 0.12, c.d]} />
              <meshStandardMaterial color={CLOSED} />
            </mesh>
            {Array.from({ length: 6 }).map((_, k) => (
              <mesh key={k} position={[0, 0.5, -c.d / 2 + (k * c.d) / 5]}>
                <cylinderGeometry args={[0.07, 0.07, 1.0, 10]} />
                <meshStandardMaterial color="#374151" />
              </mesh>
            ))}
          </group>
        ) : (
          <mesh key={i} position={[c.x, 0.3, c.z]}>
            <boxGeometry args={[c.w, 0.6, Math.max(0.6, c.d)]} />
            <meshStandardMaterial color={CLOSED} roughness={0.8} transparent opacity={0.8} />
          </mesh>
        )
      )}
    </group>
  );
}

function Entrance() {
  const e = VENUE_3D.entrance;
  return (
    <group position={[e.x, 0, e.z]}>
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
      {/* an arrow on the ground, pointing in */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.06, 3.2]}>
        <shapeGeometry args={[arrowShape()]} />
        <meshBasicMaterial color={ENTRANCE} />
      </mesh>
    </group>
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

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

function Labels() {
  const near = useIsNear(45);
  const shown = useUncrowdedLabels();
  if (near) return null;
  return (
    <>
      {VENUE_3D.labels.filter((l) => shown.has(l.title)).map((l) => (
        <Html
          key={l.title}
          position={[l.x, 6.5, l.z]}
          center
          zIndexRange={[10, 0]}
          style={{ pointerEvents: "none" }}
        >
          {/* A fixed size on screen, like the names on a street map. Scaled
              with distance they were unreadable from the overview and
              covered half the hall up close. */}
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
 * Which labels to draw so that none sits on another.
 *
 * The labels are listed most important first; each is projected to the
 * screen, given a box the size its pill will be, and kept only if that box
 * is clear of every label already kept. Worked out again when the camera
 * settles rather than on every frame of a drag, so turning the building is
 * not paid for in layout.
 */
function useUncrowdedLabels() {
  const { camera, controls, size } = useThree() as unknown as {
    camera: THREE.Camera;
    controls: OrbitControlsImpl | null;
    size: { width: number; height: number };
  };
  const all = useMemo(() => new Set(VENUE_3D.labels.map((l) => l.title)), []);
  const [shown, setShown] = useState<Set<string>>(all);
  const invalidate = useThree((st) => st.invalidate);
  // Labels are placed on the next frame, and this canvas only draws when
  // asked to.
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
        for (const l of VENUE_3D.labels) {
          v.set(l.x, 6.5, l.z).project(camera);
          if (v.z > 1) continue;
          const x = (v.x * 0.5 + 0.5) * size.width;
          const y = (-v.y * 0.5 + 0.5) * size.height;
          const chars = Math.max(l.title.length, l.sub ? l.sub.length * 0.8 : 0);
          const w = chars * 6.2 + 18;
          const h = l.sub ? 30 : 20;
          const box = { x0: x - w / 2 - 3, y0: y - h / 2 - 3, x1: x + w / 2 + 3, y1: y + h / 2 + 3 };
          const clash = kept.some(
            (k) => box.x0 < k.x1 && k.x0 < box.x1 && box.y0 < k.y1 && k.y0 < box.y1
          );
          if (!clash) {
            kept.push(box);
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
    // Damping keeps the camera moving after the finger lifts; place again
    // once it has come to rest.
    const settle = window.setInterval(place, 900);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(settle);
      controls.removeEventListener("end", place);
    };
  }, [camera, controls, size.width, size.height]);

  return shown;
}

/**
 * Whether the camera is within `distance` metres of what it is looking at.
 * Re-renders only when that answer changes, not on every frame of a drag.
 */
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

const STALL_BY_CODE = Object.fromEntries(STALLS.map((s) => [s.code, s]));

/** The building's extent, which the opening view is fitted to. */
const BOUNDS = new THREE.Box3(
  new THREE.Vector3(-VENUE_3D.floor.w / 2, 0, -VENUE_3D.floor.d / 2),
  new THREE.Vector3(VENUE_3D.floor.w / 2, 6, VENUE_3D.floor.d / 2)
);

/**
 * Places the camera so the whole building fits the canvas, whatever its
 * shape, looking in from the main-entrance side — the way people arrive —
 * and flies to a stall when asked.
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
    const target = new THREE.Vector3(0, 0, 4);
    // From the south-east and above. On a tall phone screen the building is
    // turned further, so its long side runs up the screen instead of
    // across it.
    // Seen corner-on, a long rectangle becomes a diamond with empty space
    // above and below it. On a phone held upright the building is swung
    // round nearly end-on instead, so its 101 m runs up the screen and its
    // 66 m across it, and it fills the frame.
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
    // Back off until every corner is on screen, with a little margin.
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

  // Opening view, and again whenever the canvas changes shape — until the
  // person has moved the camera themselves.
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
    // Stand in front of the booth, up and back, so its fascia is readable.
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
