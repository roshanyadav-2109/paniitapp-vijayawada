"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { STALLS, type FloorKey, type Stall, type StallZone } from "@/lib/venue-3d";
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

/** Room floors by what the room is for: tints, so the rooms read as rooms and not as paint. */
const ROOM_FLOOR: Record<string, string> = {
  service: "#D8DCE2",
  toilet: "#D3E5F4",
  lounge: "#E6DDF5",
  green: "#D5ECDB",
  office: "#EEE4D2",
  circulation: "#CDD4DE",
  kitchen: "#F2E1C9",
  meeting: "#D9E8F6",
  activity: "#E5EFDC",
  suite: "#F1E1E8",
  dining: "#F5E4D4",
  arrival: "#DAE7F7",
};

const STONE = "#EBE7E0";
const WALL_PAINT = "#F6F5F2";
const HALL_WALL = "#DDE2EA";
const GLASS = "#9FD4F1";
const COLUMN = "#E4E6EA";
const INK = "#1E2433";
const STAGE_TOP = "#8A6039";
const STAGE_SIDE = "#5E3F24";
const CARPET = "#566278";
const SEAT = "#9C1C33";
const TIMBER = "#7A5537";
const CHAIR = "#343A46";
const BOOTH_WALL = "#FFFFFF";
const ENTRANCE = "#16A34A";
const LOOP = "#059669";
const BLOCKED = "#DC2626";
const BRAND = "#1B1464";
const SELECTED = "#1B1464";

const OUTSIDE: Record<FloorKey, string> = {
  basement: "#2B2F36",
  ground: "#CCDDC4",
  first: "#CCDDC4",
};

const BOOTH_H = 2.5;
const FASCIA_H = 0.55;
const PANEL = 0.06;
/** How far below the first floor the ground floor sits, seen through the hall's void. */
const STOREY = 5.4;

/* ------------------------------------------------------------------ */

export interface CanvasProps {
  floor: FloorKey;
  /** Lay the architects' drawing over the floor. */
  showPlan: boolean;
  /** Stall code to the name of whoever holds it. */
  occupied: Record<string, string>;
  selected: string | null;
  onSelect: (code: string | null) => void;
  /** Changes whenever the camera should fly to a stall. */
  focus: { code: string; nonce: number } | null;
  /** Bumped by the reset button. */
  resetNonce: number;
  /** A DOM layer over the canvas for the floating labels. */
  labelLayer: HTMLDivElement | null;
}

export default function VenueCanvas(props: CanvasProps) {
  return (
    <Canvas
      // Render only when something moves. A map spends most of its life
      // being looked at, and a phone should not be redrawing a still
      // building sixty times a second while it is.
      frameloop="demand"
      shadows
      dpr={[1, 2]}
      camera={{ fov: 38, near: 0.5, far: 1200, position: [40, 70, 90] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onPointerMissed={() => props.onSelect(null)}
      className="touch-none"
    >
      <color attach="background" args={[props.floor === "basement" ? "#22262C" : "#E6ECF3"]} />
      <hemisphereLight args={["#ffffff", "#8e98a8", props.floor === "basement" ? 0.9 : 1.0]} />
      <Sun />
      <Scene {...props} />
    </Canvas>
  );
}

/**
 * The one light that casts shadows, from high in the south-east. The scene
 * does not move, so its shadows are worked out once for each floor rather
 * than on every frame — which is what lets a phone afford them at all.
 */
function Sun() {
  const light = useRef<THREE.DirectionalLight>(null);
  useLayoutEffect(() => {
    const l = light.current;
    if (!l) return;
    const cam = l.shadow.camera as THREE.OrthographicCamera;
    cam.left = -SCENE.extent.w / 2 - 6;
    cam.right = SCENE.extent.w / 2 + 6;
    cam.top = SCENE.extent.d / 2 + 6;
    cam.bottom = -SCENE.extent.d / 2 - 6;
    cam.near = 1;
    cam.far = 220;
    cam.updateProjectionMatrix();
  }, []);
  return (
    <>
      <directionalLight
        ref={light}
        position={[38, 80, 46]}
        intensity={1.55}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <directionalLight position={[-60, 40, -50]} intensity={0.35} />
    </>
  );
}

function ShadowsOnce({ floor }: { floor: FloorKey }) {
  const { gl, invalidate } = useThree();
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    invalidate();
    // Textures arrive a moment later; take the shadows once more when they have.
    const t = window.setTimeout(() => {
      gl.shadowMap.needsUpdate = true;
      invalidate();
    }, 900);
    return () => window.clearTimeout(t);
  }, [floor, gl, invalidate]);
  return null;
}

function Scene({ floor, showPlan, occupied, selected, onSelect, focus, resetNonce, labelLayer }: CanvasProps) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const data = SCENE.floors[floor];

  return (
    <>
      <Outside floor={floor} />
      <Slabs floor={floor} />
      <Rooms floor={floor} />
      {showPlan ? <PlanLayer floor={floor} /> : null}
      <Walls floor={floor} />
      <Columns floor={floor} />
      <FloorWords floor={floor} />

      {floor === "ground" ? (
        <>
          <Hall />
          <Stage />
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
        </>
      ) : null}

      {floor === "first" ? (
        <>
          <BoardRooms />
          {/* The hall is double height: from the first floor you look down
              through the void onto the seats and the stage below. */}
          <group position={[0, -STOREY, 0]}>
            <Hall />
            <Stage />
          </group>
        </>
      ) : null}

      <Labels labels={data.labels} layer={labelLayer} />
      <ShadowsOnce floor={floor} />

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
/* Ground, slabs, rooms, the drawing                                   */
/* ------------------------------------------------------------------ */

function Outside({ floor }: { floor: FloorKey }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, floor === "first" ? -STOREY - 0.05 : -0.32, 0]} receiveShadow>
      <planeGeometry args={[480, 480]} />
      <meshStandardMaterial color={OUTSIDE[floor]} roughness={1} />
    </mesh>
  );
}

/** The floor itself: stone upstairs, painted asphalt in the car park. */
function Slabs({ floor }: { floor: FloorKey }) {
  const slabs = SCENE.floors[floor].slabs;
  return (
    <>
      {slabs.map((s, i) => (
        <mesh key={i} position={[s.x, -0.15, s.z]} receiveShadow>
          <boxGeometry args={[s.w, 0.3, s.d]} />
          <meshStandardMaterial color={floor === "basement" ? "#3F3C39" : STONE} roughness={0.95} />
        </mesh>
      ))}
      {floor === "basement" ? <CarParkMarkings /> : null}
    </>
  );
}

function CarParkMarkings() {
  const tex = useTexture(SCENE.floors.basement.live);
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
  }, [tex]);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, 0]} receiveShadow>
      <planeGeometry args={[SCENE.extent.w, SCENE.extent.d]} />
      <meshStandardMaterial map={tex} roughness={0.95} />
    </mesh>
  );
}

/** The architects' drawing of this floor, laid over it at true scale. */
function PlanLayer({ floor }: { floor: FloorKey }) {
  const tex = useTexture(SCENE.floors[floor].plan);
  const { gl } = useThree();
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
  }, [tex, gl]);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
      <planeGeometry args={[SCENE.extent.w, SCENE.extent.d]} />
      <meshBasicMaterial map={tex} transparent opacity={0.9} depthWrite={false} />
    </mesh>
  );
}

function Rooms({ floor }: { floor: FloorKey }) {
  const hatch = useHatch();
  return (
    <>
      {SCENE.floors[floor].rooms.map((r, i) => (
        <group key={i}>
          <mesh rotation-x={-Math.PI / 2} position={[r.x, 0.01, r.z]} receiveShadow>
            <planeGeometry args={[r.w, r.d]} />
            {r.kind === "ramp" ? (
              // Unlit: a painted marking should read the same in the car
              // park's low light as upstairs, and lit it went black there.
              <meshBasicMaterial map={hatch} />
            ) : (
              <meshStandardMaterial color={ROOM_FLOOR[r.kind] ?? ROOM_FLOOR.service} roughness={0.95} />
            )}
          </mesh>
          {r.name ? (
            <FlatText text={r.name} x={r.x} y={0.035} z={r.z} fit={Math.min(r.w, r.d)} />
          ) : null}
        </group>
      ))}
    </>
  );
}

function useHatch() {
  return useMemo(
    () =>
      canvasTexture(128, 512, (g, w, h) => {
        g.fillStyle = "#B9C1CC";
        g.fillRect(0, 0, w, h);
        g.strokeStyle = "#8F99A8";
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
}

/* ------------------------------------------------------------------ */
/* Walls and columns, straight off the drawings                        */
/* ------------------------------------------------------------------ */

/**
 * Every wall on the floor, as the drawing has it — including its doorways,
 * which are gaps in the drawing's walls and so gaps here. One instanced
 * mesh per kind of wall: painted, the hall's taller walls, and the glass
 * balustrade round the void upstairs.
 */
function Walls({ floor }: { floor: FloorKey }) {
  const walls = SCENE.floors[floor].walls;
  const groups = useMemo(() => {
    const by: Record<string, typeof walls[number][]> = {};
    for (const w of walls) (by[w.kind] ??= []).push(w);
    return by;
  }, [walls]);

  return (
    <>
      {Object.entries(groups).map(([kind, list]) => (
        <WallSet key={`${floor}-${kind}`} kind={kind} list={list} />
      ))}
    </>
  );
}

function WallSet({
  kind,
  list,
}: {
  kind: string;
  list: readonly { x: number; z: number; w: number; d: number; h: number }[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    list.forEach((w, i) => {
      o.position.set(w.x, w.h / 2, w.z);
      o.scale.set(Math.max(w.w, 0.12), w.h, Math.max(w.d, 0.12));
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [list]);
  const glass = kind === "glass";
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, list.length]} castShadow={!glass} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      {glass ? (
        <meshStandardMaterial color={GLASS} transparent opacity={0.38} roughness={0.1} metalness={0.1} />
      ) : (
        <meshStandardMaterial color={kind === "tall" ? HALL_WALL : WALL_PAINT} roughness={0.92} />
      )}
    </instancedMesh>
  );
}

function Columns({ floor }: { floor: FloorKey }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const cols = SCENE.floors[floor].columns;
  const height = floor === "basement" ? 3.0 : 3.2;
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    cols.forEach(([x, z], i) => {
      o.position.set(x, height / 2, z);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [cols, height]);
  return (
    <instancedMesh key={floor} ref={ref} args={[undefined, undefined, cols.length]} castShadow receiveShadow>
      <boxGeometry args={[0.7, height, 0.7]} />
      <meshStandardMaterial color={COLUMN} roughness={0.85} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */
/* The main hall                                                       */
/* ------------------------------------------------------------------ */

/**
 * Carpet and every seat in the hall — 1,515 of them, each off the drawing —
 * as one instanced mesh: one draw call on a phone, not fifteen hundred.
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
    m.computeBoundingSphere();
  }, [count]);

  const c = SCENE.hall.carpet;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[c.x, 0.02, c.z]} receiveShadow>
        <planeGeometry args={[c.w, c.d]} />
        <meshStandardMaterial color={CARPET} roughness={1} />
      </mesh>
      <instancedMesh ref={seats} args={[chair, undefined, count]} castShadow receiveShadow>
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
      <mesh position={[platform.x, platform.h / 2, platform.z]} castShadow receiveShadow>
        <boxGeometry args={[platform.w, platform.h, platform.d]} />
        <meshStandardMaterial attach="material-0" color={STAGE_SIDE} />
        <meshStandardMaterial attach="material-1" color={STAGE_SIDE} />
        <meshStandardMaterial attach="material-2" color={STAGE_TOP} roughness={0.6} />
        <meshStandardMaterial attach="material-3" color={STAGE_SIDE} />
        <meshStandardMaterial attach="material-4" color={STAGE_SIDE} />
        <meshStandardMaterial attach="material-5" color={STAGE_SIDE} />
      </mesh>
      <mesh position={[screen.x + 0.2, platform.h + screen.h / 2, screen.z]} castShadow>
        <boxGeometry args={[0.3, screen.h, screen.d]} />
        <meshBasicMaterial attach="material-0" map={led} />
        <meshStandardMaterial attach="material-1" color="#20242E" />
        <meshStandardMaterial attach="material-2" color="#20242E" />
        <meshStandardMaterial attach="material-3" color="#20242E" />
        <meshStandardMaterial attach="material-4" color="#20242E" />
        <meshStandardMaterial attach="material-5" color="#20242E" />
      </mesh>
      <mesh position={[lectern.x, platform.h + 0.58, lectern.z]} castShadow>
        <boxGeometry args={[0.55, 1.16, 0.6]} />
        <meshStandardMaterial color="#3A2A1C" roughness={0.5} />
      </mesh>
      {steps.map((s, i) =>
        [0, 1, 2].map((k) => {
          const h = ((k + 1) / 3) * platform.h;
          // Lowest step furthest from the stage.
          const toward = i === 0 ? -1 : 1;
          const depth = s.d / 3;
          return (
            <mesh
              key={`${i}-${k}`}
              position={[s.x, h / 2, s.z + toward * (s.d / 2 - depth / 2 - k * depth)]}
              castShadow
              receiveShadow
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
/* First floor furniture                                               */
/* ------------------------------------------------------------------ */

/** Each board room: one long timber table and its 27 chairs. */
function BoardRooms() {
  const chairs = useRef<THREE.InstancedMesh>(null);
  const rooms = SCENE.boardRooms;
  const layout = useMemo(() => {
    const out: [number, number][] = [];
    for (const r of rooms) {
      const len = r.w * 0.78;
      const per = 13;
      for (let i = 0; i < per; i++) {
        const x = r.x - len / 2 + (len / (per - 1)) * i;
        out.push([x, r.z - 1.05], [x, r.z + 1.05]);
      }
      out.push([r.x - len / 2 - 0.9, r.z]); // at the head
    }
    return out;
  }, [rooms]);

  useLayoutEffect(() => {
    const m = chairs.current;
    if (!m) return;
    const o = new THREE.Object3D();
    layout.forEach(([x, z], i) => {
      o.position.set(x, 0.45, z);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [layout]);

  return (
    <>
      {rooms.map((r, i) => (
        <mesh key={i} position={[r.x, 0.38, r.z]} castShadow receiveShadow>
          <boxGeometry args={[r.w * 0.8, 0.76, 1.5]} />
          <meshStandardMaterial color={TIMBER} roughness={0.55} />
        </mesh>
      ))}
      <instancedMesh ref={chairs} args={[undefined, undefined, layout.length]} castShadow>
        <boxGeometry args={[0.5, 0.9, 0.5]} />
        <meshStandardMaterial color={CHAIR} roughness={0.7} />
      </instancedMesh>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Words laid flat                                                     */
/* ------------------------------------------------------------------ */

/**
 * Text lying flat, turning about the vertical as the camera orbits so it
 * always reads upright, the way the names on a map stay upright when you
 * turn the map. `fit` is the room it has; the text stays inside it
 * whichever way it has turned.
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
    const probe = document.createElement("canvas").getContext("2d")!;
    probe.font = `700 ${px}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    const cw = Math.ceil(probe.measureText(text).width) + 24;
    const ch = px + 20;
    const t = canvasTexture(cw, ch, (g2) => {
      g2.font = `700 ${px}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
      g2.fillStyle = INK;
      g2.textAlign = "center";
      g2.textBaseline = "middle";
      g2.fillText(text, cw / 2, ch / 2 + 2);
    });
    let hh = Math.min(size, fit * 0.3);
    let ww = hh * (cw / ch);
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
    gr.rotation.y = Math.atan2(camera.position.x - (t?.x ?? 0), camera.position.z - (t?.z ?? 0));
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

function FloorWords({ floor }: { floor: FloorKey }) {
  return (
    <>
      {SCENE.floors[floor].floorWords.map((f, i) => (
        <FlatText key={`${floor}-${i}`} text={f.text} x={f.x} y={0.04} z={f.z} fit={f.size} size={0.8} />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Stalls                                                              */
/* ------------------------------------------------------------------ */

function tint(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color("#FFFFFF"), amount);
  return `#${c.getHexString()}`;
}

/** A booth: carpet, back wall, two side walls and a fascia with its number. */
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
  const fascia = useFasciaTexture(stall.label, holder, colour);
  const tag = useTagTexture(stall.label, colour, selected);

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
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <boxGeometry args={[width - 0.04, 0.08, depth - 0.04]} />
        <meshStandardMaterial
          color={selected ? SELECTED : holder ? colour : tint(colour, 0.45)}
          roughness={1}
        />
      </mesh>
      <sprite position={[0, BOOTH_H + FASCIA_H + 0.85, 0]} scale={[2.4, 1.05, 1]}>
        <spriteMaterial map={tag} transparent depthWrite={false} />
      </sprite>
      <mesh position={[0, BOOTH_H / 2, depth / 2 - PANEL / 2]} castShadow>
        <boxGeometry args={[width, BOOTH_H, PANEL]} />
        <meshStandardMaterial attach="material-0" color={colour} />
        <meshStandardMaterial attach="material-1" color={colour} />
        <meshStandardMaterial attach="material-2" color={colour} />
        <meshStandardMaterial attach="material-3" color={colour} />
        <meshStandardMaterial attach="material-4" color={colour} />
        <meshStandardMaterial attach="material-5" color={BOOTH_WALL} roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * (width - PANEL)) / 2, BOOTH_H / 2, depth * 0.1]} castShadow>
          <boxGeometry args={[PANEL, BOOTH_H, depth * 0.8]} />
          <meshStandardMaterial color={BOOTH_WALL} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, BOOTH_H - 0.12, depth / 2 - PANEL - 0.01]}>
        <boxGeometry args={[width - PANEL * 2, 0.24, 0.02]} />
        <meshStandardMaterial color={colour} roughness={0.7} />
      </mesh>
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
      <mesh position={[width / 2 - 0.65, 0.5, -depth / 2 + 0.45]} castShadow>
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
      {SCENE.backdrops.map((b) => (
        <mesh key={b.kind} position={[b.x, 1.6, b.z]} castShadow>
          <boxGeometry args={[0.25, 3.2, b.d]} />
          <meshStandardMaterial attach="material-0" color="#2B2F3A" />
          <meshBasicMaterial attach="material-1" map={b.kind === "checkered" ? checks : media} />
          <meshStandardMaterial attach="material-2" color="#2B2F3A" />
          <meshStandardMaterial attach="material-3" color="#2B2F3A" />
          <meshStandardMaterial attach="material-4" color="#2B2F3A" />
          <meshStandardMaterial attach="material-5" color="#2B2F3A" />
        </mesh>
      ))}
    </>
  );
}

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

function Entrances() {
  const shape = useMemo(() => arrowShape(), []);
  return (
    <>
      {SCENE.entrances.map((e) => (
        <group key={e.name} position={[e.x, 0, e.z]} rotation-y={TURN[e.facing] + Math.PI}>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[(side * e.w) / 2, 2.0, 0]} castShadow>
              <boxGeometry args={[0.35, 4.0, 0.35]} />
              <meshStandardMaterial color={ENTRANCE} />
            </mesh>
          ))}
          <mesh position={[0, 4.1, 0]} castShadow>
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

interface LabelData {
  title: string;
  sub: string | null;
  x: number;
  z: number;
}

/**
 * Floating labels, as plain elements in a layer over the canvas, placed
 * from the camera on every frame the canvas draws.
 *
 * They used to be drei's <Html>, which gives every label a React root of its
 * own; under React 19 those roots throw as they are torn down. Plain nodes
 * have no roots to tear down, and placing them here costs a projection per
 * label per frame — nothing, for a dozen.
 *
 * The rules are the ones they had: a fixed size on screen, like the names on
 * a street map; listed most important first, a label that would overlap one
 * already placed gives way; and all of them step aside when the camera is
 * close enough to read the stalls themselves.
 */
function Labels({ labels, layer }: { labels: readonly LabelData[]; layer: HTMLDivElement | null }) {
  const nodes = useRef<HTMLDivElement[]>([]);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;

  useEffect(() => {
    if (!layer) return;
    nodes.current = labels.map((l) => {
      const el = document.createElement("div");
      el.className =
        "pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-full bg-white/95 px-2 py-0.5 text-center shadow-[0_1px_6px_rgba(15,23,42,0.18)] ring-1 ring-black/5 transition-opacity duration-150";
      el.style.opacity = "0";
      const t = document.createElement("p");
      t.className = "text-[10.5px] font-semibold leading-tight text-[#1B1464]";
      t.textContent = l.title;
      el.appendChild(t);
      if (l.sub) {
        const s = document.createElement("p");
        s.className = "text-[8.5px] font-medium leading-tight text-slate-500";
        s.textContent = l.sub;
        el.appendChild(s);
      }
      layer.appendChild(el);
      return el;
    });
    invalidate();
    return () => {
      for (const el of nodes.current) el.remove();
      nodes.current = [];
    };
  }, [labels, layer, invalidate]);

  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    const els = nodes.current;
    if (!els.length) return;
    const near = controls ? camera.position.distanceTo(controls.target) < 45 : false;
    const kept: { x0: number; y0: number; x1: number; y1: number }[] = [];
    labels.forEach((l, i) => {
      const el = els[i];
      if (!el) return;
      v.set(l.x, 6.5, l.z).project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      const w = el.offsetWidth || 80;
      const h = el.offsetHeight || 22;
      const b = { x0: x - w / 2 - 3, y0: y - h / 2 - 3, x1: x + w / 2 + 3, y1: y + h / 2 + 3 };
      const clear =
        !near && v.z < 1 && !kept.some((k) => b.x0 < k.x1 && k.x0 < b.x1 && b.y0 < k.y1 && k.y0 < b.y1);
      if (clear) kept.push(b);
      el.style.transform = `translate(${Math.round(x - w / 2)}px, ${Math.round(y - h / 2)}px)`;
      el.style.opacity = clear ? "1" : "0";
    });
  });

  return null;
}

/* ------------------------------------------------------------------ */
/* Camera                                                              */
/* ------------------------------------------------------------------ */

const STALL_BY_CODE: Record<string, Stall> = Object.fromEntries(STALLS.map((s) => [s.code, s]));

const BOUNDS = new THREE.Box3(
  new THREE.Vector3(-SCENE.extent.w / 2, 0, -SCENE.extent.d / 2),
  new THREE.Vector3(SCENE.extent.w / 2, 6, SCENE.extent.d / 2)
);

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
    // A flight on purpose counts as moving the camera: a resize afterwards
    // (the stall sheet opening is one) must not throw it back to the overview.
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
    const target = new THREE.Vector3(0, 0, 0);
    // On a phone held upright the building is swung nearly end-on, so its
    // long side runs up the screen and fills it.
    const portrait = size.width / size.height < 1;
    const azimuth = portrait ? 1.5 : 0.42;
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
        return Math.abs(v.x) < 0.985 && Math.abs(v.y) < 0.94 && v.z < 1;
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
    // Far enough back to see the stall with a neighbour or two either side,
    // some 12 m across the narrower way of the screen: on a phone held
    // upright that is its width, and a fixed distance there left one tag
    // filling the whole view. Steep enough, at 55 degrees, to see over the
    // 4.5 m hall wall across a corridor into the stall's front.
    const cam = camera as THREE.PerspectiveCamera;
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const halfW = halfH * (size.width / size.height);
    const dist = Math.max(12, 6 / Math.min(halfW, halfH));
    const pos = target
      .clone()
      .addScaledVector(front, dist * Math.cos(0.96))
      .add(new THREE.Vector3(0, dist * Math.sin(0.96), 0));
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
