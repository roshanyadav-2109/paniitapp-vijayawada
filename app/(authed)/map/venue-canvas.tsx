"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, useTexture } from "@react-three/drei";
import { EffectComposer, N8AO, SMAA } from "@react-three/postprocessing";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { INSIDE_VIEWS, STALLS, type FloorKey, type Stall, type StallZone } from "@/lib/venue-3d";
import { SCENE, SEATS } from "@/lib/venue-3d-scene";
import { SURROUNDINGS } from "@/lib/venue-surroundings";
import { ENVELOPE } from "@/lib/venue-envelope";

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

const WALL_PAINT = "#F6F5F2";
const HALL_WALL = "#E8DDC8";
const GLASS = "#D7E9EF";
const COLUMN = "#E4E6EA";
const INK = "#1E2433";
const STAGE_TOP = "#8A6039";
const STAGE_SIDE = "#5E3F24";
const CARPET = "#566278";
// As the hall is: cream seats on a deep maroon carpet.
const SEAT = "#E2D5BA";
const HALL_CARPET = "#5A2725";
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
  /** Inside the main hall with its roof on, rather than the open map. */
  inside: boolean;
  /** Which of INSIDE_VIEWS (lib/venue-3d) to stand at, when inside. */
  spot: number;
  /**
   * Walking, inside: forward (up to 1) or back (down to -1), and turning
   * left (-1) or right (1). Read every frame; `walking` says when to start.
   */
  move: { current: { f: number; t: number } };
  walking: boolean;
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
      <color attach="background" args={[props.floor === "basement" ? "#22262C" : "#DDE7F1"]} />
      <hemisphereLight
        args={["#ffffff", "#8e98a8", props.inside ? 0.62 : props.floor === "basement" ? 0.75 : 0.42]}
      />
      {/* Soft light from every side and something for glass and polished
          stone to reflect: a few light panels rendered into an environment
          map on the device, so nothing is downloaded for it. */}
      <Environment resolution={64} frames={1} environmentIntensity={props.floor === "basement" ? 0.35 : 0.32}>
        <Lightformer form="rect" intensity={2.2} position={[0, 30, 0]} rotation-x={Math.PI / 2} scale={[80, 80, 1]} />
        <Lightformer form="rect" intensity={0.9} position={[-40, 12, 20]} rotation-y={Math.PI / 2} scale={[60, 14, 1]} color="#FFF4E6" />
        <Lightformer form="rect" intensity={0.7} position={[40, 12, -20]} rotation-y={-Math.PI / 2} scale={[60, 14, 1]} color="#E6F0FF" />
      </Environment>
      <Sun inside={props.inside} />
      <Scene {...props} />
      {/* Inside, soft shade where things meet — wall and floor, seat and
          carpet — as a room has and a render without it lacks. */}
      {props.inside ? (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO halfRes quality="performance" aoRadius={1.1} distanceFalloff={0.7} intensity={2.4} color="#2A2018" />
          <SMAA />
        </EffectComposer>
      ) : null}
    </Canvas>
  );
}

/**
 * The one light that casts shadows, from high in the south-east. The scene
 * does not move, so its shadows are worked out once for each floor rather
 * than on every frame — which is what lets a phone afford them at all.
 */
function Sun({ inside }: { inside: boolean }) {
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
        // Inside, under a roof, there is no sun: the light is the ceiling's,
        // from straight above, its shadows falling straight down.
        position={inside ? [3, 70, 2] : [46, 62, 40]}
        intensity={inside ? 1.5 : 2.6}
        color={inside ? "#FFF3E0" : "#FFFFFF"}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <directionalLight position={[-60, 40, -50]} intensity={0.2} />
    </>
  );
}

function ShadowsOnce({ floor, inside = false }: { floor: FloorKey; inside?: boolean }) {
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
  }, [floor, inside, gl, invalidate]);
  return null;
}

function Scene({ floor, showPlan, occupied, selected, onSelect, focus, resetNonce, labelLayer, inside, spot, move, walking }: CanvasProps) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const data = SCENE.floors[floor];
  const [walk, setWalk] = useState<Walk | null>(null);

  return (
    <>
      {inside && floor === "first" ? (
        // Upstairs, under its ceiling: the board rooms and lounges, and the
        // hall below seen through glass.
        <>
          <Outside floor="first" />
          <Slabs floor="first" />
          <Rooms floor="first" />
          <Walls floor="first" upTo={CEILING.first} />
          <Envelope floor="first" height={CEILING.first} />
          <Columns floor="first" />
          <BoardRooms />
          <group position={[0, -STOREY, 0]}>
            <Hall ribs={false} />
            <Stage />
            <HallInterior gallery />
          </group>
          <FloorCeiling y={CEILING.first} />
          <FloorWalk onWalk={(steps) => setWalk({ steps, nonce: Date.now() })} />
        </>
      ) : inside && floor === "basement" ? (
        // The car park, under its slab.
        <>
          <Outside floor="basement" />
          <Slabs floor="basement" />
          <Rooms floor="basement" />
          <Walls floor="basement" upTo={CEILING.basement} />
          <Envelope floor="basement" height={CEILING.basement} />
          <Columns floor="basement" />
          <FloorCeiling y={CEILING.basement} hole={false} />
          <FloorWalk onWalk={(steps) => setWalk({ steps, nonce: Date.now() })} />
        </>
      ) : inside ? (
        // Roof on: the hall closed in, and the floor round it under its
        // ceiling, its doors open to walk through.
        <>
          <Outside floor="ground" />
          <Slabs floor="ground" />
          <Rooms floor="ground" />
          <Walls floor="ground" upTo={CEILING.ground} />
          <Envelope floor="ground" height={CEILING.ground} />
          <Columns floor="ground" />
          <Hall ribs={false} />
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
          <HallInterior />
          <FloorCeiling />
          <Doors onWalk={(steps) => setWalk({ steps, nonce: Date.now() })} />
          <FloorWalk onWalk={(steps) => setWalk({ steps, nonce: Date.now() })} />
        </>
      ) : (
        <>
          <Outside floor={floor} />
          <Slabs floor={floor} />
          <Rooms floor={floor} />
          {showPlan ? <PlanLayer floor={floor} /> : null}
          <Walls floor={floor} />
          <Envelope floor={floor} height={floor === "basement" ? 3 : 3.2} />
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
        </>
      )}

      <ShadowsOnce floor={floor} inside={inside} />

      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.12}
        // Inside, the camera turns about a point just in front of it: a drag
        // looks around from where you stand, and you move by tapping.
        minDistance={inside ? EYE_REACH : 8}
        maxDistance={inside ? EYE_REACH : 480}
        enableZoom={!inside}
        rotateSpeed={inside ? 0.45 : 1}
        // Outside: never below the floor, never flat on it, as a plan seen
        // edge-on is a line. Inside: low enough to look up at the ceiling.
        // Inside, the head turns as a person's does: all the way round, but
        // up or down only so far.
        minPolarAngle={inside ? Math.PI / 2 - 0.62 : 0.08}
        maxPolarAngle={inside ? Math.PI / 2 + 0.5 : Math.PI / 2.25}
        screenSpacePanning={false}
        enablePan={!inside}
      />
      <CameraRig controls={controls} focus={focus} resetNonce={resetNonce} inside={inside} spot={spot} walk={walk} floor={floor} move={move} walking={walking} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Ground, slabs, rooms, the drawing                                   */
/* ------------------------------------------------------------------ */

function Outside({ floor }: { floor: FloorKey }) {
  const base = floor === "first" ? -STOREY - 0.05 : -0.32;
  // The world outside is seen, not walked into: no collisions with it.
  if (floor === "basement") {
    return (
      <mesh rotation-x={-Math.PI / 2} position={[0, base, 0]} receiveShadow userData={{ noCollide: true }}>
        <planeGeometry args={[480, 480]} />
        <meshStandardMaterial color={OUTSIDE[floor]} roughness={1} />
      </mesh>
    );
  }
  return (
    <group userData={{ noCollide: true }}>
      <Landscape y={base} />
    </group>
  );
}

/**
 * The real neighbourhood, from OpenStreetMap (lib/venue-surroundings.ts):
 * every building round the hall at its height, the roads at their widths,
 * parks and green areas, water, trees, and the Statue of Social Justice on
 * its pedestal to the south. The hall stands on a stone forecourt.
 */
function Landscape({ y }: { y: number }) {
  const W = SCENE.extent.w;
  const D = SCENE.extent.d;
  const R = SURROUNDINGS.radius;

  const ground = useMemo(() => {
    const t = canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = "#CBCDB6";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) {
        g.fillStyle = Math.random() < 0.5 ? "rgba(110,100,80,0.10)" : "rgba(255,250,240,0.12)";
        g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(70, 70);
    return t;
  }, []);

  const roads = useMemo(() => {
    const asphalt: THREE.BufferGeometry[] = [];
    const paths: THREE.BufferGeometry[] = [];
    const water: THREE.BufferGeometry[] = [];
    for (const r of SURROUNDINGS.roads) {
      const geo = ribbon(r.p, r.w);
      if (!geo) continue;
      if ((r.k as string) === "water") water.push(geo);
      else if (r.w <= 2.5) paths.push(geo);
      else asphalt.push(geo);
    }
    const merge = (list: THREE.BufferGeometry[]) => (list.length ? mergeGeometries(list) : null);
    return { asphalt: merge(asphalt), paths: merge(paths), water: merge(water) };
  }, []);

  const areas = useMemo(() => {
    const merge = (polys: readonly (readonly number[])[]) => {
      const list = polys.map((p) => flatShape(p)).filter((g): g is THREE.BufferGeometry => !!g);
      return list.length ? mergeGeometries(list) : null;
    };
    return {
      green: merge(SURROUNDINGS.greens),
      water: merge(SURROUNDINGS.waters),
      parking: merge(SURROUNDINGS.parking),
    };
  }, []);

  const buildings = useMemo(() => {
    const st = SURROUNDINGS.statue;
    const list: THREE.BufferGeometry[] = [];
    const colour = new THREE.Color();
    SURROUNDINGS.buildings.forEach((b, i) => {
      const pts: THREE.Vector2[] = [];
      for (let k = 0; k < b.p.length; k += 2) pts.push(new THREE.Vector2(b.p[k], -b.p[k + 1]));
      if (pts.length < 3) return;
      const cx = pts.reduce((a, v) => a + v.x, 0) / pts.length;
      const cz = -pts.reduce((a, v) => a + v.y, 0) / pts.length;
      // The statue's pedestal is 81 feet tall; the map records it as low.
      const h = Math.hypot(cx - st.x, cz - st.z) < 30 ? 24.7 : b.h;
      const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: h, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
      // A building is not all one white: a shade apart each, warm to cool.
      colour.setHSL(0.09 + (i % 5) * 0.012, 0.12 + (i % 3) * 0.04, 0.78 + (i % 7) * 0.018);
      const n = geo.attributes.position.count;
      const rgb = new Float32Array(n * 3);
      for (let v = 0; v < n; v++) {
        rgb[v * 3] = colour.r;
        rgb[v * 3 + 1] = colour.g;
        rgb[v * 3 + 2] = colour.b;
      }
      geo.setAttribute("color", new THREE.BufferAttribute(rgb, 3));
      list.push(geo);
    });
    return list.length ? mergeGeometries(list) : null;
  }, []);

  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    const t = SURROUNDINGS.trees;
    for (let i = 0; i < t.length; i += 2) out.push([t[i], t[i + 1], 0.85 + ((i * 37) % 9) * 0.04]);

    // The streets here are lined with trees, as the satellite view shows,
    // though few are on the map: plant them along both sides of the larger
    // roads, never on a building, a road or the hall's forecourt.
    const footprints = SURROUNDINGS.buildings.map((b) => b.p);
    const inPoly = (poly: readonly number[], x: number, z: number) => {
      let c = false;
      const n = poly.length / 2;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = poly[i * 2], zi = poly[i * 2 + 1], xj = poly[j * 2], zj = poly[j * 2 + 1];
        if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
      }
      return c;
    };
    const clearOfHall = (x: number, z: number) =>
      Math.abs(x) > SCENE.extent.w / 2 + 9 || Math.abs(z) > SCENE.extent.d / 2 + 9;
    let k = 0;
    for (const r of SURROUNDINGS.roads) {
      if (r.w < 6) continue;
      const p = r.p;
      for (let i = 0; i < p.length / 2 - 1; i++) {
        const x1 = p[i * 2], z1 = p[i * 2 + 1], x2 = p[i * 2 + 2], z2 = p[i * 2 + 3];
        const len = Math.hypot(x2 - x1, z2 - z1);
        if (len < 1) continue;
        const nx = -(z2 - z1) / len, nz = (x2 - x1) / len;
        const off = r.w / 2 + 2.6;
        for (let s = 6; s < len; s += 13) {
          const bx = x1 + ((x2 - x1) * s) / len, bz = z1 + ((z2 - z1) * s) / len;
          for (const side of [1, -1]) {
            const x = bx + nx * off * side, z = bz + nz * off * side;
            if (Math.hypot(x, z) > SURROUNDINGS.radius) continue;
            if (!clearOfHall(x, z)) continue;
            if (footprints.some((f) => inPoly(f, x, z))) continue;
            out.push([x, z, 0.8 + ((k++ * 29) % 9) * 0.045]);
          }
        }
      }
    }
    return out;
  }, []);

  return (
    <group position={[0, y, 0]}>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[R + 140, 64]} />
        <meshStandardMaterial map={ground} roughness={1} />
      </mesh>
      {areas.green ? (
        <mesh geometry={areas.green} position={[0, 0.015, 0]} receiveShadow>
          <meshStandardMaterial color="#9DBB86" roughness={1} />
        </mesh>
      ) : null}
      {areas.parking ? (
        <mesh geometry={areas.parking} position={[0, 0.02, 0]} receiveShadow>
          <meshStandardMaterial color="#A9A9A6" roughness={0.95} />
        </mesh>
      ) : null}
      {areas.water ? (
        <mesh geometry={areas.water} position={[0, 0.025, 0]}>
          <meshStandardMaterial color="#6E9EC2" roughness={0.15} metalness={0.2} />
        </mesh>
      ) : null}
      {roads.water ? (
        <mesh geometry={roads.water} position={[0, 0.026, 0]}>
          <meshStandardMaterial color="#6E9EC2" roughness={0.15} metalness={0.2} />
        </mesh>
      ) : null}
      {roads.paths ? (
        <mesh geometry={roads.paths} position={[0, 0.03, 0]} receiveShadow>
          <meshStandardMaterial color="#CFC8BA" roughness={0.9} />
        </mesh>
      ) : null}
      {roads.asphalt ? (
        <mesh geometry={roads.asphalt} position={[0, 0.035, 0]} receiveShadow>
          <meshStandardMaterial color="#5E6168" roughness={0.85} />
        </mesh>
      ) : null}
      {/* the forecourt the hall stands on */}
      <FinishedFloor kind="paving" x={0} z={0} w={W + 14} d={D + 14} y={0.045} />
      {buildings ? (
        <mesh geometry={buildings} castShadow receiveShadow>
          <meshStandardMaterial vertexColors roughness={0.85} />
        </mesh>
      ) : null}
      <Statue x={SURROUNDINGS.statue.x} z={SURROUNDINGS.statue.z} />
      <Trees at={trees} />
    </group>
  );
}

/** A road or path: its centre line, widened to its width, flat on the ground. */
function ribbon(line: readonly number[], width: number): THREE.BufferGeometry | null {
  const n = line.length / 2;
  if (n < 2) return null;
  const pos: number[] = [];
  const half = width / 2;
  for (let i = 0; i < n - 1; i++) {
    const x1 = line[i * 2], z1 = line[i * 2 + 1];
    const x2 = line[i * 2 + 2], z2 = line[i * 2 + 3];
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < 0.01) continue;
    const nx = (-dz / len) * half, nz = (dx / len) * half;
    // the segment, and a round joint at its end so bends have no gaps
    pos.push(x1 + nx, 0, z1 + nz, x2 + nx, 0, z2 + nz, x2 - nx, 0, z2 - nz);
    pos.push(x1 + nx, 0, z1 + nz, x2 - nx, 0, z2 - nz, x1 - nx, 0, z1 - nz);
    const steps = 8;
    for (let k = 0; k < steps; k++) {
      const a1 = (k / steps) * Math.PI * 2, a2 = ((k + 1) / steps) * Math.PI * 2;
      pos.push(x2, 0, z2, x2 + Math.cos(a2) * half, 0, z2 + Math.sin(a2) * half, x2 + Math.cos(a1) * half, 0, z2 + Math.sin(a1) * half);
    }
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // A flat ribbon faces up whichever way its triangles wind.
  const normals = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < normals.count; i++) normals.setXYZ(i, 0, 1, 0);
  return g;
}

/** A flat area (a park, a pond, a car park) from its outline. */
function flatShape(poly: readonly number[]): THREE.BufferGeometry | null {
  if (poly.length < 6) return null;
  const pts: THREE.Vector2[] = [];
  for (let k = 0; k < poly.length; k += 2) pts.push(new THREE.Vector2(poly[k], -poly[k + 1]));
  const g = new THREE.ShapeGeometry(new THREE.Shape(pts));
  g.rotateX(-Math.PI / 2);
  return g;
}

/**
 * The Statue of Social Justice: 125 feet of bronze on its 81-foot pedestal.
 * Drawn simply, as a figure in a long coat holding a book, so it reads as
 * the landmark it is from anywhere on the map.
 */
function Statue({ x, z }: { x: number; z: number }) {
  const base = 24.7;
  const bronze = "#7A5A3A";
  return (
    <group position={[x, base, z]}>
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[4.2, 4.6, 2, 24]} />
        <meshStandardMaterial color="#B8B2A7" roughness={0.6} />
      </mesh>
      {/* legs and long coat */}
      <mesh position={[0, 10, 0]} castShadow>
        <cylinderGeometry args={[2.4, 3.2, 16, 20]} />
        <meshStandardMaterial color={bronze} roughness={0.45} metalness={0.55} />
      </mesh>
      {/* chest and shoulders */}
      <mesh position={[0, 23, 0]} castShadow>
        <cylinderGeometry args={[3.1, 2.5, 10, 20]} />
        <meshStandardMaterial color={bronze} roughness={0.45} metalness={0.55} />
      </mesh>
      {/* head */}
      <mesh position={[0, 31, 0]} castShadow>
        <sphereGeometry args={[2.2, 20, 16]} />
        <meshStandardMaterial color={bronze} roughness={0.45} metalness={0.55} />
      </mesh>
      {/* the book, held at the chest */}
      <mesh position={[2.6, 21.5, 1.4]} rotation={[0, 0.4, 0.2]} castShadow>
        <boxGeometry args={[0.6, 3.2, 2.4]} />
        <meshStandardMaterial color={bronze} roughness={0.45} metalness={0.55} />
      </mesh>
    </group>
  );
}

function Trees({ at }: { at: [number, number, number][] }) {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const t = trunks.current;
    const c = crowns.current;
    if (!t || !c) return;
    const o = new THREE.Object3D();
    const colour = new THREE.Color();
    at.forEach(([x, z, s], i) => {
      o.rotation.set(0, 0, 0);
      o.position.set(x, 1.3 * s, z);
      o.scale.set(s, s, s);
      o.updateMatrix();
      t.setMatrixAt(i, o.matrix);
      o.position.set(x, 3.6 * s, z);
      o.rotation.set(0, (x + z) * 0.7, 0);
      o.updateMatrix();
      c.setMatrixAt(i, o.matrix);
      c.setColorAt(i, colour.setHSL(0.27 + (i % 7) * 0.006, 0.38, 0.33 + (i % 5) * 0.015));
    });
    t.instanceMatrix.needsUpdate = true;
    c.instanceMatrix.needsUpdate = true;
    if (c.instanceColor) c.instanceColor.needsUpdate = true;
    t.computeBoundingSphere();
    c.computeBoundingSphere();
  }, [at]);
  return (
    <>
      <instancedMesh ref={trunks} args={[undefined, undefined, at.length]} castShadow>
        <cylinderGeometry args={[0.13, 0.2, 2.6, 8]} />
        <meshStandardMaterial color="#6B4E37" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, at.length]} castShadow receiveShadow>
        <icosahedronGeometry args={[2.1, 1]} />
        <meshStandardMaterial roughness={0.95} flatShading />
      </instancedMesh>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Floor finishes                                                       */
/* ------------------------------------------------------------------ */

type Finish = "stone" | "paving" | "timber" | "tile" | "carpet" | "plain";

/** Which finish each kind of room is laid in. */
function finishOf(kind: string): Finish {
  if (kind === "stone" || kind === "paving" || kind === "carpet") return kind;
  if (kind === "circulation" || kind === "arrival" || kind === "service") return "stone";
  if (kind === "office" || kind === "lounge" || kind === "meeting" || kind === "suite" || kind === "dining")
    return "timber";
  if (kind === "toilet" || kind === "kitchen") return "tile";
  return "plain";
}

/** Metres of floor one copy of each finish's texture covers. */
const FINISH_SPAN: Record<Finish, number> = {
  stone: 2.4,
  paving: 3.2,
  timber: 2.0,
  tile: 1.2,
  carpet: 1.6,
  plain: 4,
};

const FINISH_BASE: Partial<Record<Finish, string>> = {
  stone: "#E9E4DC",
  paving: "#D8D2C8",
  carpet: CARPET,
  tile: "#E8EEF3",
  timber: "#C79E74",
};

const finishTextures = new Map<string, THREE.Texture>();

/** One texture per finish and colour, drawn once and shared by every room. */
function finishTexture(finish: Finish, base: string): THREE.Texture {
  const key = `${finish}:${base}`;
  const hit = finishTextures.get(key);
  if (hit) return hit;
  const speckle = (g: CanvasRenderingContext2D, w: number, h: number, n: number, a: number) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a * 1.4})`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  };
  const line = (g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  };
  const t = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    if (finish === "stone" || finish === "paving") {
      // large-format slabs, each a shade apart, with thin grout lines
      const n = finish === "stone" ? 2 : 4;
      const step = w / n;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          g.fillStyle = (i + j) % 2 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.035)";
          g.fillRect(i * step, j * step, step, step);
        }
      speckle(g, w, h, 1400, 0.035);
      g.strokeStyle = finish === "stone" ? "rgba(90,80,70,0.28)" : "rgba(80,75,70,0.35)";
      g.lineWidth = 2;
      for (let k = 0; k <= n; k++) {
        line(g, k * step, 0, k * step, h);
        line(g, 0, k * step, w, k * step);
      }
    } else if (finish === "timber") {
      // planks with staggered joints and a little grain
      const rows = 10;
      const ph = h / rows;
      for (let r = 0; r < rows; r++) {
        const shade = 0.82 + ((r * 37) % 11) / 55;
        g.fillStyle = `rgba(${Math.round(150 * shade)},${Math.round(108 * shade)},${Math.round(72 * shade)},0.55)`;
        g.fillRect(0, r * ph, w, ph);
        g.strokeStyle = "rgba(60,40,25,0.35)";
        g.lineWidth = 1.5;
        line(g, 0, r * ph, w, r * ph);
        const off = ((r * 97) % 5) * (w / 5);
        line(g, off, r * ph, off, (r + 1) * ph);
        g.strokeStyle = "rgba(70,45,25,0.08)";
        for (let k = 0; k < 6; k++) {
          const yy = r * ph + Math.random() * ph;
          line(g, 0, yy, w, yy + (Math.random() - 0.5) * 4);
        }
      }
    } else if (finish === "tile") {
      const n = 4;
      const step = w / n;
      speckle(g, w, h, 500, 0.03);
      g.strokeStyle = "rgba(255,255,255,0.85)";
      g.lineWidth = 3;
      for (let k = 0; k <= n; k++) {
        line(g, k * step, 0, k * step, h);
        line(g, 0, k * step, w, k * step);
      }
    } else if (finish === "carpet") {
      speckle(g, w, h, 5000, 0.06);
      g.strokeStyle = "rgba(255,255,255,0.06)";
      g.lineWidth = 6;
      for (let k = -h; k < w; k += 32) line(g, k, 0, k + h, h);
    } else {
      speckle(g, w, h, 900, 0.03);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  finishTextures.set(key, t);
  return t;
}

/** A floor laid in its finish, the pattern at its real size. */
function FinishedFloor({
  kind,
  x,
  z,
  w,
  d,
  y = 0.01,
  colour,
}: {
  kind: string;
  x: number;
  z: number;
  w: number;
  d: number;
  y?: number;
  colour?: string;
}) {
  const finish = finishOf(kind);
  const base = colour ?? FINISH_BASE[finish] ?? ROOM_FLOOR[kind] ?? ROOM_FLOOR.service;
  const map = useMemo(() => {
    const t = finishTexture(finish, base).clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(w / FINISH_SPAN[finish], 0.2), Math.max(d / FINISH_SPAN[finish], 0.2));
    return t;
  }, [finish, base, w, d]);
  const shine = finish === "stone" || finish === "tile";
  return (
    <mesh rotation-x={-Math.PI / 2} position={[x, y, z]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial
        map={map}
        roughness={shine ? 0.35 : finish === "carpet" ? 1 : 0.7}
        envMapIntensity={shine ? 0.9 : 0.4}
      />
    </mesh>
  );
}

/** The floor itself: stone upstairs, painted asphalt in the car park. */
function Slabs({ floor }: { floor: FloorKey }) {
  const slabs = SCENE.floors[floor].slabs;
  return (
    <>
      {slabs.map((s, i) => (
        <group key={i}>
          <mesh position={[s.x, -0.15, s.z]} receiveShadow>
            <boxGeometry args={[s.w, 0.3, s.d]} />
            <meshStandardMaterial color={floor === "basement" ? "#3F3C39" : "#CFC9BF"} roughness={0.95} />
          </mesh>
          {floor === "basement" ? null : (
            <FinishedFloor kind="stone" x={s.x} z={s.z} w={s.w} d={s.d} y={0.004} />
          )}
        </group>
      ))}
      {floor === "basement" ? (
        <>
          <CarParkMarkings />
          <ParkedCars />
        </>
      ) : null}
    </>
  );
}

/**
 * Cars in the basement's bays, about four in five of them taken: a sedan's
 * side profile drawn out across its width, dark glass for the windows,
 * wheels, and its lights. Everyday colours, mostly white, silver and grey.
 * Instanced, so ninety cars cost a handful of draw calls; seeded, so the
 * same cars are in the same bays every time.
 */
function ParkedCars() {
  const body = useRef<THREE.InstancedMesh>(null);
  const glass = useRef<THREE.InstancedMesh>(null);
  const wheels = useRef<THREE.InstancedMesh>(null);
  const lamps = useRef<THREE.InstancedMesh>(null);

  const cars = useMemo(() => {
    const sl = SCENE.floors.basement.slabs[0];
    const inside = (x: number, z: number) => Math.abs(x - sl.x) < sl.w / 2 && Math.abs(z - sl.z) < sl.d / 2;
    let seed = 20261003;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const colours = ["#F2F2EF", "#F2F2EF", "#F2F2EF", "#B9BDC2", "#B9BDC2", "#6E737A", "#2A2D31", "#1E2124", "#8E1B1B", "#1F3A68", "#5B5F55"];
    const out: { x: number; z: number; turn: number; colour: string }[] = [];
    for (const b of SCENE.parking) {
      if (!inside(b.x, b.z)) continue;
      const along = b.d >= b.w ? "z" : "x";
      const long = Math.max(b.w, b.d);
      const n = Math.max(1, Math.min(b.cars, Math.floor(long / 4.8)));
      for (let i = 0; i < n; i++) {
        if (rnd() > 0.8) continue;
        const off = (i - (n - 1) / 2) * (long / n);
        // nosed in or backed in, and never quite square in the bay
        const flip = rnd() < 0.5 ? 0 : Math.PI;
        const jitter = (rnd() - 0.5) * 0.06;
        out.push({
          x: b.x + (along === "x" ? off : (rnd() - 0.5) * 0.12),
          z: b.z + (along === "z" ? off : (rnd() - 0.5) * 0.12),
          turn: (along === "x" ? 0 : Math.PI / 2) + flip + jitter,
          colour: colours[Math.floor(rnd() * colours.length)],
        });
      }
    }
    return out;
  }, []);

  const geo = useMemo(() => {
    // A sedan in side view, nose to the +x end: 4.5 m long, 1.45 m tall.
    const side = (pts: [number, number][]) => {
      const sh = new THREE.Shape();
      sh.moveTo(pts[0][0], pts[0][1]);
      for (const [x, y] of pts.slice(1)) sh.lineTo(x, y);
      return sh;
    };
    const lower = side([
      [-2.25, 0.32], [2.25, 0.32], [2.27, 0.62], [2.12, 0.78], [0.95, 0.86], [-1.45, 0.88],
      [-2.18, 0.84], [-2.27, 0.62],
    ]);
    const bodyGeo = new THREE.ExtrudeGeometry(lower, { depth: 1.76, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 });
    bodyGeo.translate(0, 0, -0.88);
    // the roof and pillars, in the body colour, over the glass
    const roofGeo = new THREE.BoxGeometry(1.5, 0.06, 1.42);
    roofGeo.translate(-0.42, 1.43, 0);
    const cabin = side([[0.95, 0.86], [0.25, 1.4], [-1.1, 1.4], [-1.62, 0.88]]);
    const glassGeo = new THREE.ExtrudeGeometry(cabin, { depth: 1.5, bevelEnabled: false });
    glassGeo.translate(0, 0, -0.75);
    const wheel = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 16);
    wheel.rotateX(Math.PI / 2);
    const lamp = new THREE.BoxGeometry(0.05, 0.12, 0.42);
    return { body: mergeGeometries([bodyGeo.toNonIndexed(), roofGeo.toNonIndexed()]), glass: glassGeo, wheel, lamp };
  }, []);

  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    const w = new THREE.Object3D();
    cars.forEach((car, i) => {
      o.position.set(car.x, 0, car.z);
      o.rotation.set(0, car.turn, 0);
      o.updateMatrix();
      body.current?.setMatrixAt(i, o.matrix);
      body.current?.setColorAt(i, c.set(car.colour));
      glass.current?.setMatrixAt(i, o.matrix);
      [[1.38, 0.82], [1.38, -0.82], [-1.42, 0.82], [-1.42, -0.82]].forEach(([dx, dz], k) => {
        w.position.set(dx, 0.33, dz);
        w.rotation.set(0, 0, 0);
        w.updateMatrix();
        w.matrix.premultiply(o.matrix);
        wheels.current?.setMatrixAt(i * 4 + k, w.matrix);
      });
      [[2.27, 0.58, 0.55], [2.27, 0.58, -0.55], [-2.28, 0.64, 0.6], [-2.28, 0.64, -0.6]].forEach(([dx, dy, dz], k) => {
        w.position.set(dx, dy, dz);
        w.updateMatrix();
        w.matrix.premultiply(o.matrix);
        lamps.current?.setMatrixAt(i * 4 + k, w.matrix);
        lamps.current?.setColorAt(i * 4 + k, c.set(k < 2 ? "#F4F1E6" : "#9E1A1A"));
      });
    });
    for (const m of [body.current, glass.current, wheels.current, lamps.current]) {
      if (!m) continue;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
    }
  }, [cars]);

  return (
    <group>
      <instancedMesh ref={body} args={[geo.body, undefined, cars.length]} castShadow receiveShadow>
        <meshStandardMaterial roughness={0.32} metalness={0.45} envMapIntensity={1.2} />
      </instancedMesh>
      <instancedMesh ref={glass} args={[geo.glass, undefined, cars.length]}>
        <meshStandardMaterial color="#14181D" roughness={0.08} metalness={0.6} />
      </instancedMesh>
      <instancedMesh ref={wheels} args={[geo.wheel, undefined, cars.length * 4]} castShadow>
        <meshStandardMaterial color="#17181A" roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={lamps} args={[geo.lamp, undefined, cars.length * 4]}>
        <meshStandardMaterial roughness={0.3} />
      </instancedMesh>
    </group>
  );
}

function CarParkMarkings() {
  const tex = useTexture(SCENE.floors.basement.live);
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 16;
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
          {r.kind === "ramp" ? (
            <mesh rotation-x={-Math.PI / 2} position={[r.x, 0.01, r.z]} receiveShadow>
              <planeGeometry args={[r.w, r.d]} />
              {/* Unlit: a painted marking should read the same in the car
                  park's low light as upstairs, and lit it went black there. */}
              <meshBasicMaterial map={hatch} />
            </mesh>
          ) : (
            <FinishedFloor kind={r.kind} x={r.x} z={r.z} w={r.w} d={r.d} />
          )}
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
/** A box standing on the line a–b, from y0 to y1, `thick` through. */
function alongLine(a: readonly [number, number], b: readonly [number, number], y0: number, y1: number, thick: number, at = 0, len?: number) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const full = Math.hypot(dx, dz);
  const l = len ?? full;
  const g = new THREE.BoxGeometry(l, y1 - y0, thick);
  // Centred at distance `at` + l/2 along the line from a.
  const t = (at + l / 2) / full;
  g.rotateY(-Math.atan2(dz, dx));
  g.translate(a[0] + dx * t, (y0 + y1) / 2, a[1] + dz * t);
  return g;
}

/**
 * What the drawing leaves out along each floor's edge (lib/venue-envelope.ts):
 * curtain walls of glass in aluminium frames, the entrances as framed
 * doorways, glass balustrades at the voids, the basement's concrete walls.
 */
function Envelope({ floor, height }: { floor: FloorKey; height: number }) {
  const parts = useMemo(() => {
    const glass: THREE.BufferGeometry[] = [];
    const frame: THREE.BufferGeometry[] = [];
    const railGlass: THREE.BufferGeometry[] = [];
    const steel: THREE.BufferGeometry[] = [];
    const solid: THREE.BufferGeometry[] = [];
    const DOOR_TOP = 2.6;
    for (const sg of ENVELOPE[floor]) {
      const len = Math.hypot(sg.b[0] - sg.a[0], sg.b[1] - sg.a[1]);
      if (sg.k === "solid") {
        solid.push(alongLine(sg.a, sg.b, 0, height, 0.3));
      } else if (sg.k === "glass") {
        glass.push(alongLine(sg.a, sg.b, 0.08, height - 0.08, 0.03));
        frame.push(alongLine(sg.a, sg.b, 0, 0.08, 0.12), alongLine(sg.a, sg.b, height - 0.08, height, 0.12));
        // a transom where a door head would be, and mullions every 1.5 m
        frame.push(alongLine(sg.a, sg.b, DOOR_TOP - 0.03, DOOR_TOP + 0.03, 0.1));
        const n = Math.max(1, Math.round(len / 1.5));
        for (let i = 0; i <= n; i++) frame.push(alongLine(sg.a, sg.b, 0, height, 0.12, Math.min(len - 0.06, Math.max(0, (len * i) / n - 0.03)), 0.06));
      } else if (sg.k === "door") {
        // open to walk through: jambs, a head, glass above it
        frame.push(alongLine(sg.a, sg.b, 0, height, 0.14, 0, 0.1), alongLine(sg.a, sg.b, 0, height, 0.14, len - 0.1, 0.1));
        frame.push(alongLine(sg.a, sg.b, DOOR_TOP, DOOR_TOP + 0.12, 0.14));
        glass.push(alongLine(sg.a, sg.b, DOOR_TOP + 0.12, height - 0.08, 0.03));
        frame.push(alongLine(sg.a, sg.b, height - 0.08, height, 0.12));
      } else {
        railGlass.push(alongLine(sg.a, sg.b, 0.05, 1.05, 0.02));
        steel.push(alongLine(sg.a, sg.b, 1.05, 1.1, 0.06));
        const n = Math.max(1, Math.round(len / 1.4));
        for (let i = 0; i <= n; i++) steel.push(alongLine(sg.a, sg.b, 0, 1.08, 0.05, Math.min(len - 0.05, Math.max(0, (len * i) / n - 0.025)), 0.05));
      }
    }
    const merge = (l: THREE.BufferGeometry[]) => (l.length ? mergeGeometries(l) : null);
    return { glass: merge(glass), frame: merge(frame), railGlass: merge(railGlass), steel: merge(steel), solid: merge(solid) };
  }, [floor, height]);

  return (
    <>
      {parts.solid ? (
        <mesh geometry={parts.solid} castShadow receiveShadow>
          <meshStandardMaterial color="#8F8B84" roughness={0.95} />
        </mesh>
      ) : null}
      {parts.frame ? (
        <mesh geometry={parts.frame} castShadow>
          <meshStandardMaterial color="#5B636C" roughness={0.35} metalness={0.7} />
        </mesh>
      ) : null}
      {parts.glass ? (
        <mesh geometry={parts.glass}>
          <meshPhysicalMaterial color="#9FB9C4" transparent opacity={0.3} roughness={0.06} metalness={0.15} envMapIntensity={1.3} depthWrite={false} />
        </mesh>
      ) : null}
      {parts.railGlass ? (
        <mesh geometry={parts.railGlass}>
          <meshPhysicalMaterial color={GLASS} transparent opacity={0.18} roughness={0.05} depthWrite={false} />
        </mesh>
      ) : null}
      {parts.steel ? (
        <mesh geometry={parts.steel} castShadow>
          <meshStandardMaterial color="#B9BEC4" roughness={0.25} metalness={0.9} />
        </mesh>
      ) : null}
    </>
  );
}

function Walls({ floor, upTo = 0 }: { floor: FloorKey; upTo?: number }) {
  const walls = SCENE.floors[floor].walls;
  const groups = useMemo(() => {
    const by: Record<string, { kind: string; h: number; x: number; z: number; w: number; d: number }[]> = {};
    // Inside, a room's walls meet its ceiling; glass rails keep their height.
    for (const w of walls) (by[w.kind] ??= []).push(w.kind === "glass" ? w : { ...w, h: Math.max(w.h, upTo) });
    return by;
  }, [walls, upTo]);

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
    <>
      <instancedMesh ref={ref} args={[undefined, undefined, list.length]} castShadow={!glass} receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        {glass ? (
          <meshPhysicalMaterial
            color={GLASS}
            transparent
            opacity={0.18}
            depthWrite={false}
            roughness={0.05}
            metalness={0.1}
            clearcoat={1}
            envMapIntensity={1.4}
          />
        ) : (
          <meshStandardMaterial color={kind === "tall" ? HALL_WALL : WALL_PAINT} roughness={0.88} />
        )}
      </instancedMesh>
      {/* A wall is more than a box: a capping line along its top and a
          skirting at its foot, or for glass a metal frame top and bottom. */}
      <WallTrim list={list} at="top" glass={glass} />
      <WallTrim list={list} at="foot" glass={glass} />
    </>
  );
}

function WallTrim({
  list,
  at,
  glass,
}: {
  list: readonly { x: number; z: number; w: number; d: number; h: number }[];
  at: "top" | "foot";
  glass: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const h = glass ? 0.07 : at === "top" ? 0.06 : 0.12;
  const grow = glass ? 0.04 : at === "top" ? 0.06 : 0.025;
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    list.forEach((w, i) => {
      const y = at === "top" ? w.h + h / 2 - 0.001 : h / 2;
      // Wider than the wall across its thickness only, so the trim stands
      // proud of both faces without running past the wall's ends.
      const along = w.w >= w.d;
      o.position.set(w.x, y, w.z);
      o.scale.set(
        Math.max(w.w, 0.12) + (along ? 0 : grow),
        h,
        Math.max(w.d, 0.12) + (along ? grow : 0)
      );
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [list, at, h, grow]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, list.length]} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={glass ? "#5B6472" : at === "top" ? "#C9C4BB" : "#6E6A64"}
        roughness={glass ? 0.35 : 0.7}
        metalness={glass ? 0.6 : 0}
      />
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
      <cylinderGeometry args={[0.36, 0.36, height, 20]} />
      <meshStandardMaterial color={COLUMN} roughness={0.6} />
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
function Hall({ ribs = true }: { ribs?: boolean }) {
  const seats = useRef<THREE.InstancedMesh>(null);
  const count = SEATS.length / 2;

  const chair = useMemo(() => {
    // Facing west, toward the stage: the back is on the east side.
    const cushion = new THREE.BoxGeometry(0.46, 0.11, 0.46);
    cushion.translate(-0.02, 0.45, 0);
    // The back leans away a little, as a hall seat's does.
    const back = new THREE.BoxGeometry(0.08, 0.6, 0.46);
    back.rotateZ(-0.14);
    back.translate(0.23, 0.78, 0);
    // An armrest on one side; the next seat's closes the other.
    const arm = new THREE.BoxGeometry(0.42, 0.05, 0.05);
    arm.translate(0.02, 0.66, 0.255);
    const armPost = new THREE.BoxGeometry(0.05, 0.62, 0.05);
    armPost.translate(-0.12, 0.33, 0.255);
    const base = new THREE.BoxGeometry(0.3, 0.4, 0.34);
    base.translate(0.02, 0.2, 0);
    return mergeGeometries([cushion, back, arm, armPost, base]);
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
      <FinishedFloor kind="carpet" x={c.x} z={c.z} w={c.w} d={c.d} y={0.02} colour={HALL_CARPET} />
      <instancedMesh ref={seats} args={[chair, undefined, count]} castShadow receiveShadow userData={{ walkable: true }}>
        <meshStandardMaterial color={SEAT} roughness={0.8} />
      </instancedMesh>
      {ribs ? <HallRibs /> : null}
    </group>
  );
}

/** A rib's path: up the wall, then a quarter turn inward over the hall. */
function ribPath(H: number, R: number): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, H - R, 0)];
  for (let k = 1; k <= 10; k++) {
    const a = (k / 10) * (Math.PI / 2);
    pts.push(new THREE.Vector3(0, H - R + Math.sin(a) * R, (1 - Math.cos(a)) * R));
  }
  return new THREE.CatmullRomCurve3(pts);
}

/**
 * The hall's signature, as the event footage shows it: cream pilasters up
 * the long walls, each edged with a warm LED line, that turn over into the
 * ceiling as rounded arches. Drawn as far as the turn, so the hall stays
 * open to the camera above.
 */
function HallRibs() {
  const hall = SCENE.hall;
  const north = hall.z - hall.d / 2 + 0.2;
  const south = hall.z + hall.d / 2 - 0.2;
  const H = 4.5;
  const R = 1.4;
  const xs = useMemo(() => {
    const from = hall.x - hall.w / 2 + 3;
    const to = hall.x + hall.w / 2 - 4;
    return Array.from({ length: 6 }, (_, i) => from + ((to - from) * i) / 5);
  }, [hall.x, hall.w]);

  const { line, fascia } = useMemo(() => {
    const path = ribPath(H, R);
    const shape = new THREE.Shape();
    shape.moveTo(-0.32, -0.12);
    shape.lineTo(0.32, -0.12);
    shape.lineTo(0.32, 0.12);
    shape.lineTo(-0.32, 0.12);
    return {
      line: new THREE.TubeGeometry(path, 40, 0.05, 6, false),
      fascia: new THREE.ExtrudeGeometry(shape, { steps: 40, bevelEnabled: false, extrudePath: path }),
    };
  }, []);

  return (
    <group>
      {xs.flatMap((x) =>
        [
          { z: north, turn: 0 },
          { z: south, turn: Math.PI },
        ].map(({ z, turn }) => (
          <group key={`${x}-${z}`} position={[x, 0, z]} rotation-y={turn}>
            <mesh geometry={fascia} position={[0, 0, 0.14]} castShadow>
              <meshStandardMaterial color="#EFE6D3" roughness={0.6} />
            </mesh>
            {[-0.36, 0.36].map((dx) => (
              <mesh key={dx} geometry={line} position={[dx, 0.3, 0.2]}>
                <meshStandardMaterial color="#FFE9BE" emissive="#FFD58A" emissiveIntensity={1.6} toneMapped={false} />
              </mesh>
            ))}
          </group>
        ))
      )}
    </group>
  );
}

/**
 * The stage as it is set for an event there: a dais of carved maroon chairs
 * with low tables, a podium at each front corner, banks of flowers along
 * the front edge, and the lighting truss over the LED wall.
 */
function StageDressing() {
  const { platform, screen, lectern } = SCENE.stage;
  const top = platform.h;
  const front = platform.x + platform.w / 2;
  const chairX = platform.x - 0.6;
  const seats = useMemo(() => {
    const span = platform.d - 7;
    return Array.from({ length: 11 }, (_, i) => platform.z - span / 2 + (span * i) / 10);
  }, [platform.d, platform.z]);
  const otherLectern = 2 * platform.z - lectern.z;

  const flowers = useMemo(() => {
    const out: { x: number; y: number; z: number; c: string }[] = [];
    const palette = ["#F4E04D", "#FFFFFF", "#C2185B", "#8E44AD", "#F39C12", "#E84A5F", "#F8BBD0"];
    let seed = 11;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let z = platform.z - platform.d / 2 + 0.2; z < platform.z + platform.d / 2 - 0.2; z += 0.1) {
      for (let row = 0; row < 4; row++) {
        // Flowers come in runs of one colour, not confetti.
        const run = Math.floor((z - platform.z) / 0.7 + row * 3);
        out.push({
          x: front + 0.5 - row * 0.12 + rnd() * 0.04,
          y: 0.42 + row * 0.1 + rnd() * 0.05,
          z: z + rnd() * 0.05,
          c: palette[Math.abs(run) % palette.length],
        });
      }
    }
    return out;
  }, [front, platform.z, platform.d]);

  const step = seats[1] - seats[0];
  return (
    <group>
      {/* the dais, facing the hall */}
      {seats.map((z, i) => (
        <group key={z} position={[chairX, top, z]}>
          <mesh position={[0, 0.48, 0]} castShadow>
            <boxGeometry args={[0.6, 0.12, 0.62]} />
            <meshStandardMaterial color="#7B2430" roughness={0.6} />
          </mesh>
          <mesh position={[-0.28, 0.95, 0]} castShadow>
            <boxGeometry args={[0.1, 1.0, 0.66]} />
            <meshStandardMaterial color="#5A2A1A" roughness={0.45} metalness={0.1} />
          </mesh>
          <mesh position={[-0.22, 1.0, 0]}>
            <boxGeometry args={[0.03, 0.72, 0.5]} />
            <meshStandardMaterial color="#8C2F3A" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.21, 0]}>
            <boxGeometry args={[0.52, 0.42, 0.54]} />
            <meshStandardMaterial color="#5A2A1A" roughness={0.5} />
          </mesh>
          {i % 2 === 0 && i < seats.length - 1 ? (
            <group position={[0.85, 0, step / 2]}>
              <mesh position={[0, 0.3, 0]} castShadow>
                <boxGeometry args={[0.5, 0.6, 0.6]} />
                <meshStandardMaterial color="#3B2418" roughness={0.4} />
              </mesh>
              <mesh position={[0, 0.72, 0]}>
                <sphereGeometry args={[0.2, 10, 8]} />
                <meshStandardMaterial color="#E84A5F" roughness={0.9} />
              </mesh>
            </group>
          ) : null}
        </group>
      ))}

      {/* the second podium, opposite the first; flowers on the front of each */}
      <mesh position={[lectern.x, top + 0.58, otherLectern]} castShadow>
        <boxGeometry args={[0.55, 1.16, 0.6]} />
        <meshStandardMaterial color="#3A2A1C" roughness={0.5} />
      </mesh>
      {[lectern.z, otherLectern].map((z) => (
        <mesh key={z} position={[lectern.x + 0.34, top + 0.95, z]}>
          <sphereGeometry args={[0.28, 12, 10]} />
          <meshStandardMaterial color="#C2185B" roughness={0.9} />
        </mesh>
      ))}

      {/* flower banks along the front edge, in a bed of leaves */}
      <mesh position={[front + 0.32, 0.22, platform.z]} receiveShadow>
        <boxGeometry args={[0.6, 0.44, platform.d]} />
        <meshStandardMaterial color="#2F5524" roughness={1} />
      </mesh>
      <mesh position={[front + 0.33, 0.47, platform.z]} rotation-x={Math.PI / 2} scale={[1, 1, 0.35]}>
        <cylinderGeometry args={[0.32, 0.32, platform.d, 10, 1]} />
        <meshStandardMaterial color="#3D6B2C" roughness={1} />
      </mesh>
      <Flowers at={flowers} />

      {/* the lighting truss over the LED wall and its row of moving heads */}
      <mesh position={[screen.x + 1.4, top + screen.h + 0.9, screen.z]}>
        <boxGeometry args={[0.35, 0.35, screen.d + 2]} />
        <meshStandardMaterial color="#2A2D33" roughness={0.4} metalness={0.7} wireframe />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => screen.z - screen.d / 2 + (screen.d * (i + 0.5)) / 12).map((z) => (
        <mesh key={z} position={[screen.x + 1.4, top + screen.h + 0.55, z]} rotation-z={0.5}>
          <cylinderGeometry args={[0.13, 0.17, 0.4, 10]} />
          <meshStandardMaterial color="#15171B" roughness={0.4} metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function Flowers({ at }: { at: { x: number; y: number; z: number; c: string }[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    at.forEach((f, i) => {
      o.position.set(f.x, f.y, f.z);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(f.c));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [at]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, at.length]}>
      <dodecahedronGeometry args={[0.065, 0]} />
      <meshStandardMaterial roughness={0.85} />
    </instancedMesh>
  );
}

/**
 * The hall closed in, as it is when you stand in it: double height, from the
 * stage wall to the back wall. Its walls up to 4.5 m are the drawing's own,
 * doorways and all; above them a band of wall runs up to the ceiling. None of
 * it casts a shadow, so the sun still lights the room as its lamps would.
 */
const ROOM = { x0: -19.8, x1: 27.05, z0: -21.51, z1: 10.69, h: 10.2 };
/** The drawing's hall walls stop at 4.5 m; the band above starts there. */
const HALL_WALL_TOP = 4.5;
/** The ceiling over the rest of the ground floor, just over its 3.2 m walls. */
const FLOOR_CEILING = 3.3;
/** Each floor's ceiling, just over its walls: 3.2 m above, 3 m in the basement. */
const CEILING: Record<FloorKey, number> = { ground: FLOOR_CEILING, first: FLOOR_CEILING, basement: 3.1 };
/** The stage wings have no tall wall in the drawing: closed in up to here. */
const WING_END = { north: -11.0, south: -8.38 };

export interface Walk {
  steps: { pos: [number, number, number]; look: [number, number, number] }[];
  nonce: number;
}

function inHall(x: number, z: number) {
  return x > ROOM.x0 && x < ROOM.x1 && z > ROOM.z0 && z < ROOM.z1;
}

/**
 * From the first floor the hall is seen through glass: its walls at that
 * level are windows onto it, under the solid wall above.
 */
function HallInterior({ gallery = false }: { gallery?: boolean }) {
  const { x0, x1, z0, z1, h } = ROOM;
  const w = x1 - x0;
  const d = z1 - z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const R = 2.2;
  const bands = gallery
    ? [
        { y0: HALL_WALL_TOP, y1: STOREY, glass: false },
        { y0: STOREY, y1: STOREY + FLOOR_CEILING, glass: true },
        { y0: STOREY + FLOOR_CEILING, y1: h, glass: false },
      ]
    : [{ y0: HALL_WALL_TOP, y1: h, glass: false }];

  // Seven arches across the hall, each a cream band edged both sides in
  // warm light, running just under the lowered ceiling and framing it.
  const ribXs = useMemo(() => [-8.5, -2.5, 3.5, 9.5, 15.5, 21, 26.2], []);
  const { rib, glow } = useMemo(() => {
    const top = h - 0.75;
    const pts: THREE.Vector3[] = [];
    const push = (y: number, z: number) => pts.push(new THREE.Vector3(0, y, z));
    push(0.05, z0 + 0.25);
    push(top - R, z0 + 0.25);
    for (let k = 1; k <= 12; k++) {
      const a = (k / 12) * (Math.PI / 2);
      push(top - R + Math.sin(a) * R, z0 + 0.25 + (1 - Math.cos(a)) * R);
    }
    for (let k = 1; k <= 8; k++) push(top, z0 + 0.25 + R + ((d - 0.5 - 2 * R) * k) / 9);
    for (let k = 0; k <= 12; k++) {
      const a = (k / 12) * (Math.PI / 2);
      push(top - R + Math.cos(a) * R, z1 - 0.25 - (1 - Math.sin(a)) * R);
    }
    push(0.05, z1 - 0.25);
    const path = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    return {
      rib: new THREE.TubeGeometry(path, 240, 0.26, 4, false),
      glow: new THREE.TubeGeometry(path, 240, 0.045, 5, false),
    };
  }, [z0, z1, d, h]);

  const downlights = useMemo(() => {
    const out: [number, number][] = [];
    for (let x = x0 + 4; x < x1 - 1; x += 2.6) {
      for (let z = z0 + 4; z < z1 - 3; z += 2.6) out.push([x, z]);
    }
    return out;
  }, [x0, x1, z0, z1]);
  const lightsRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = lightsRef.current;
    if (!m) return;
    const o = new THREE.Object3D();
    downlights.forEach(([x, z], i) => {
      o.position.set(x, h - 0.42, z);
      o.rotation.set(Math.PI / 2, 0, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [downlights, h]);

  const wall = <meshStandardMaterial color="#E8DDC8" roughness={0.9} side={THREE.DoubleSide} />;
  const northWing = WING_END.north - x0;
  const southWing = WING_END.south - x0;
  return (
    <group>
      {/* the wall above the drawing's walls on three sides, or glass at
          first-floor level when seen from there */}
      {bands.map((b) => {
        const bh = b.y1 - b.y0;
        const y = b.y0 + bh / 2;
        const mat = b.glass ? (
          <meshPhysicalMaterial color={GLASS} transparent opacity={0.14} roughness={0.05} depthWrite={false} side={THREE.DoubleSide} />
        ) : (
          wall
        );
        return (
          <group key={b.y0}>
            <mesh position={[cx, y, z0]}>
              <planeGeometry args={[w, bh]} />
              {mat}
            </mesh>
            <mesh position={[cx, y, z1]}>
              <planeGeometry args={[w, bh]} />
              {mat}
            </mesh>
            <mesh position={[x1, y, cz]} rotation-y={Math.PI / 2}>
              <planeGeometry args={[d, bh]} />
              {mat}
            </mesh>
          </group>
        );
      })}
      {/* the stage wall, full height, and the wings either side of the stage */}
      <mesh position={[x0, h / 2, cz]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[d, h]} />
        <meshStandardMaterial color="#D6C8AE" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[x0 + northWing / 2, HALL_WALL_TOP / 2, z0]}>
        <planeGeometry args={[northWing, HALL_WALL_TOP]} />
        {wall}
      </mesh>
      <mesh position={[x0 + southWing / 2, HALL_WALL_TOP / 2, z1]}>
        <planeGeometry args={[southWing, HALL_WALL_TOP]} />
        {wall}
      </mesh>

      {/* the ceiling, and lowered between the arches, set with downlights */}
      <mesh position={[cx, h, cz]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#F1EBDF" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[cx + 1, h - 0.4, cz]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[w - 6, d - 2 * R - 1.2]} />
        <meshStandardMaterial color="#F4EFE6" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <instancedMesh ref={lightsRef} args={[undefined, undefined, downlights.length]}>
        <circleGeometry args={[0.12, 12]} />
        <meshBasicMaterial color="#FFF3D6" side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>

      {/* the arches */}
      {ribXs.map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh geometry={rib}>
            <meshStandardMaterial color="#EFE5D0" roughness={0.6} />
          </mesh>
          {[-0.3, 0.3].map((dx) => (
            <mesh key={dx} geometry={glow} position={[dx, 0, 0]}>
              <meshStandardMaterial color="#FFE9BE" emissive="#FFD58A" emissiveIntensity={1.8} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}

      {/* the control room window high in the back wall */}
      <mesh position={[x1 - 0.03, 5.6, cz]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[7, 1.6]} />
        <meshStandardMaterial color="#2A3038" roughness={0.4} />
      </mesh>

      {/* the room's own light, warm, from the ceiling */}
      {[-6, 6, 18].map((x) => (
        <pointLight key={x} position={[x, h - 1.5, cz]} intensity={60} distance={0} decay={1.4} color="#FFE7C2" />
      ))}
    </group>
  );
}

/**
 * A ceiling over the rest of the ground floor, open over the hall, with its
 * downlights: walking out of the hall, you are indoors still.
 */
function FloorCeiling({ y = FLOOR_CEILING, hole = true }: { y?: number; hole?: boolean }) {
  const geo = useMemo(() => {
    const W = SCENE.extent.w / 2;
    const D = SCENE.extent.d / 2;
    const s = new THREE.Shape([
      new THREE.Vector2(-W, -D),
      new THREE.Vector2(W, -D),
      new THREE.Vector2(W, D),
      new THREE.Vector2(-W, D),
    ]);
    // Shape y is world -z once laid flat.
    if (hole) s.holes.push(
      new THREE.Path([
        new THREE.Vector2(ROOM.x0, -ROOM.z0),
        new THREE.Vector2(ROOM.x0, -ROOM.z1),
        new THREE.Vector2(ROOM.x1, -ROOM.z1),
        new THREE.Vector2(ROOM.x1, -ROOM.z0),
      ])
    );
    const g = new THREE.ShapeGeometry(s);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [hole]);

  const spots = useMemo(() => {
    const out: [number, number][] = [];
    const W = SCENE.extent.w / 2;
    const D = SCENE.extent.d / 2;
    for (let x = -W + 2; x < W - 1; x += 3.6) {
      for (let z = -D + 2; z < D - 1; z += 3.6) {
        if (!hole || !inHall(x, z)) out.push([x, z]);
      }
    }
    return out;
  }, [hole]);
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    spots.forEach(([x, z], i) => {
      o.position.set(x, y - 0.01, z);
      o.rotation.set(Math.PI / 2, 0, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [spots, y]);

  return (
    <>
      <mesh geometry={geo} position={[0, y, 0]}>
        {/* lit from below by its lamps, not dark against the sun above it */}
        <meshStandardMaterial color="#EEEAE2" emissive="#EEEAE2" emissiveIntensity={0.55} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, spots.length]}>
        <circleGeometry args={[0.1, 10]} />
        <meshBasicMaterial color="#FFF6E0" side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
    </>
  );
}

/** Seconds to walk a leg of a path: brisk, and never long across the hall. */
function legSeconds(metres: number) {
  return THREE.MathUtils.clamp(metres / 3.5, 0.45, 2.2);
}

/** How far ahead of the eye the camera turns about, inside. */
const EYE_REACH = 0.08;
/** Eye height of someone standing. */
const EYE = 1.6;
/** Walking, in metres a second, and turning, in radians a second. */
const WALK_SPEED = 2.2;
const TURN_SPEED = 1.3;
const UP = new THREE.Vector3(0, 1, 0);
const WALK_RAY = new THREE.Raycaster();

/** The floor's height underfoot: the stage is a metre up, all else level. */
function floorAt(floor: FloorKey, x: number, z: number) {
  const pl = SCENE.stage.platform;
  if (floor === "ground" && Math.abs(x - pl.x) < pl.w / 2 && Math.abs(z - pl.z) < pl.d / 2) return pl.h;
  return 0;
}

/**
 * Tap the floor to walk there, as in a street view: anywhere you can see
 * floor (or seats, or the stage), not through a wall to the floor beyond.
 */
function FloorWalk({ onWalk }: { onWalk: (steps: Walk["steps"]) => void }) {
  const { camera, scene, raycaster } = useThree();
  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[0, 0.05, 0]}
      userData={{ ghost: true }}
      onClick={(e) => {
        // A drag to look round ends in a click too; only a tap walks.
        if (e.delta > 6) return;
        e.stopPropagation();
        raycaster.set(e.ray.origin, e.ray.direction);
        raycaster.camera = camera;
        const first = raycaster
          .intersectObjects(scene.children, true)
          .find((h) => !h.object.userData.ghost && (h.object as THREE.Mesh).isMesh && h.object.visible);
        if (!first) return;
        // Floor of this storey only: not the hall seen below from upstairs.
        const ok = first.point.y > -0.3 && (first.object.userData.walkable || first.point.y < 0.3);
        if (!ok) return;
        const x = first.point.x;
        const z = first.point.z;
        const floorY = first.object.userData.walkable === "stage" ? SCENE.stage.platform.h : 0;
        const dx = x - camera.position.x;
        const dz = z - camera.position.z;
        const len = Math.hypot(dx, dz) || 1;
        onWalk([{ pos: [x, floorY + EYE, z], look: [x + (dx / len) * 2, floorY + EYE, z + (dz / len) * 2] }]);
      }}
    >
      <planeGeometry args={[SCENE.extent.w, SCENE.extent.d]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

interface Door {
  id: string;
  /** Middle of the doorway, on the wall's line. */
  x: number;
  z: number;
  width: number;
  /** Which way the wall runs. */
  along: "x" | "z";
  /** Outward, away from the hall. */
  n: [number, number];
  /** How far past the doorway to walk, clear of what lies beyond. */
  step: number;
}

/**
 * The hall's doorways, read off the drawing: the gaps of a metre or more
 * between its tall walls on the north, south and back (east) sides.
 */
function hallDoors(): Door[] {
  const tall = SCENE.floors.ground.walls.filter((w) => w.kind === "tall");
  const lines: { along: "x" | "z"; at: number; n: [number, number]; step: number }[] = [
    { along: "x", at: -21.67, n: [0, -1], step: 3 },
    { along: "x", at: 10.86, n: [0, 1], step: 3 },
    { along: "z", at: 27.22, n: [1, 0], step: 3.6 },
  ];
  const out: Door[] = [];
  for (const L of lines) {
    const segs = tall
      .filter((w) =>
        L.along === "x"
          ? Math.abs(w.z - L.at) < 0.1 && w.w >= w.d - 0.01
          : Math.abs(w.x - L.at) < 0.1 && w.d >= w.w - 0.01
      )
      .map((w) => (L.along === "x" ? [w.x - w.w / 2, w.x + w.w / 2] : [w.z - w.d / 2, w.z + w.d / 2]))
      .sort((a, b) => a[0] - b[0]);
    if (!segs.length) continue;
    let end = segs[0][1];
    for (let i = 1; i < segs.length; i++) {
      const [s, e] = segs[i];
      if (s - end >= 1) {
        const c = (s + end) / 2;
        out.push({
          id: `${L.along}${L.at}:${c.toFixed(2)}`,
          x: L.along === "x" ? c : L.at,
          z: L.along === "x" ? L.at : c,
          width: s - end,
          along: L.along,
          n: L.n,
          step: L.step,
        });
      }
      end = Math.max(end, e);
    }
  }
  return out;
}

const DOOR_H = 2.6;
const DOOR_OPEN = Math.PI / 2 - 0.12;

/**
 * Every doorway with its doors, standing open. Tap one and you walk through
 * it, and it swings shut behind you; tap it again to open it and go back.
 */
function Doors({ onWalk }: { onWalk: (steps: Walk["steps"]) => void }) {
  const doors = useMemo(hallDoors, []);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);

  /** Of the ways to face from a spot, the one with the most room ahead. */
  function openestWay(x: number, z: number, ways: [number, number][]): [number, number] {
    const ray = new THREE.Raycaster();
    ray.far = 40;
    // Sprites in the scene (the trees) need the camera to be hit-tested.
    ray.camera = camera;
    let best = ways[0];
    let bestRoom = -1;
    for (const w of ways) {
      ray.set(new THREE.Vector3(x, EYE, z), new THREE.Vector3(w[0], 0, w[1]));
      const hit = ray
        .intersectObjects(scene.children, true)
        .find((h) => !h.object.userData.ghost && (h.object as THREE.Mesh).isMesh);
      const room = hit ? hit.distance : 40;
      // Straight on is the natural way to go: it wins unless cramped.
      const score = w === ways[0] && room > 6 ? room + 100 : room;
      if (score > bestRoom) {
        bestRoom = score;
        best = w;
      }
    }
    return best;
  }
  const invalidate = useThree((s) => s.invalidate);
  // Openness of each door, 0 shut to 1 open, and where each is heading.
  const open = useRef<Record<string, number>>({});
  const target = useRef<Record<string, number>>({});
  const leaves = useRef<Record<string, THREE.Group | null>>({});
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  useFrame((_, dt) => {
    let moving = false;
    for (const d of doors) {
      const now = open.current[d.id] ?? 1;
      const to = target.current[d.id] ?? 1;
      if (now === to) continue;
      const next = now < to ? Math.min(to, now + dt * 2.2) : Math.max(to, now - dt * 2.2);
      open.current[d.id] = next;
      moving = true;
      for (const side of [0, 1]) {
        const g = leaves.current[`${d.id}:${side}`];
        if (g) g.rotation.y = (g.userData.closed as number) + (g.userData.swing as number) * next;
      }
    }
    if (moving) invalidate();
  });

  function walkThrough(d: Door) {
    const [nx, nz] = d.n;
    const fromHall = inHall(camera.position.x, camera.position.z);
    const at = (k: number, y = 1.6): [number, number, number] => [d.x + nx * k, y, d.z + nz * k];
    const out = at(d.step);
    const [fx, fz] = openestWay(out[0], out[2], [
      [nx, nz],
      [nz, -nx],
      [-nz, nx],
    ]);
    const steps: Walk["steps"] = fromHall
      ? [
          { pos: at(-1.4), look: at(2) },
          { pos: out, look: [out[0] + fx * 2, EYE, out[2] + fz * 2] },
        ]
      : [
          { pos: at(1.4), look: at(-2) },
          { pos: at(-4.5), look: at(-6.5) },
        ];
    // Open it if it was shut, walk through, and once through let it close
    // behind you.
    let from = camera.position.clone();
    let seconds = 0;
    for (const st of steps) {
      const to = new THREE.Vector3(...st.pos);
      seconds += legSeconds(from.distanceTo(to));
      from = to;
    }
    target.current[d.id] = 1;
    invalidate();
    onWalk(steps);
    timers.current.push(
      window.setTimeout(() => {
        target.current[d.id] = 0;
        invalidate();
      }, seconds * 1000 + 300)
    );
  }

  return (
    <>
      {doors.map((d) => {
        const [nx, nz] = d.n;
        const double = d.width > 2.2;
        const leafW = double ? d.width / 2 : d.width;
        // Hinges at the ends of the doorway; a shut leaf runs from its hinge
        // across the opening, an open one stands out from the wall.
        const ends: { hx: number; hz: number; dx: number; dz: number }[] =
          d.along === "x"
            ? [
                { hx: d.x - d.width / 2, hz: d.z, dx: 1, dz: 0 },
                { hx: d.x + d.width / 2, hz: d.z, dx: -1, dz: 0 },
              ]
            : [
                { hx: d.x, hz: d.z - d.width / 2, dx: 0, dz: 1 },
                { hx: d.x, hz: d.z + d.width / 2, dx: 0, dz: -1 },
              ];
        const used = double ? ends : [ends[0]];
        const inward = d.along === "x" ? 0 : -Math.PI / 2;
        return (
          <group key={d.id}>
            {used.map((e, side) => {
              // Rotation about y taking local +x to a direction (vx, vz).
              const closed = Math.atan2(-e.dz, e.dx);
              const towardN = Math.atan2(-nz, nx);
              let swing = towardN - closed;
              while (swing > Math.PI) swing -= 2 * Math.PI;
              while (swing < -Math.PI) swing += 2 * Math.PI;
              swing = Math.sign(swing) * DOOR_OPEN;
              return (
                <group
                  key={side}
                  position={[e.hx, 0, e.hz]}
                  rotation-y={closed + swing}
                  userData={{ closed, swing }}
                  ref={(g) => {
                    leaves.current[`${d.id}:${side}`] = g;
                  }}
                >
                  <mesh position={[leafW / 2, DOOR_H / 2, 0]} castShadow>
                    <boxGeometry args={[leafW - 0.03, DOOR_H, 0.06]} />
                    <meshStandardMaterial color="#6B4A2E" roughness={0.55} />
                  </mesh>
                  <mesh position={[leafW - 0.18, 1.05, 0]}>
                    <boxGeometry args={[0.04, 0.4, 0.12]} />
                    <meshStandardMaterial color="#C9B48A" roughness={0.3} metalness={0.8} />
                  </mesh>
                </group>
              );
            })}
            {/* the wall over the doorway, and its exit sign on the hall side */}
            <group position={[d.x, 0, d.z]} rotation-y={inward}>
              <mesh position={[0, (DOOR_H + HALL_WALL_TOP) / 2, 0]}>
                <boxGeometry args={[d.width, HALL_WALL_TOP - DOOR_H, 0.3]} />
                <meshStandardMaterial color={HALL_WALL} roughness={0.88} />
              </mesh>
              <mesh position={[0, DOOR_H + 0.3, (d.along === "x" ? -nz : nx) * 0.17]}>
                <boxGeometry args={[0.7, 0.24, 0.04]} />
                <meshBasicMaterial color="#19B35A" toneMapped={false} />
              </mesh>
            </group>
            {/* what you tap: the doorway itself */}
            <mesh
              position={[d.x, DOOR_H / 2, d.z]}
              rotation-y={inward}
              userData={{ ghost: true }}
              onClick={(e) => {
                if (e.delta > 6) return;
                e.stopPropagation();
                walkThrough(d);
              }}
              onPointerOver={() => (document.body.style.cursor = "pointer")}
              onPointerOut={() => (document.body.style.cursor = "")}
            >
              <boxGeometry args={[d.width, DOOR_H, 0.4]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </>
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
      <mesh position={[platform.x, platform.h / 2, platform.z]} castShadow receiveShadow userData={{ walkable: "stage" }}>
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
              userData={{ walkable: "stage" }}
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
      <StageDressing />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* First floor furniture                                               */
/* ------------------------------------------------------------------ */

/**
 * Each board room: one long timber table on two pedestals, and its 27
 * office chairs, each turned to the table.
 */
function BoardRooms() {
  const chairs = useRef<THREE.InstancedMesh>(null);
  const frames = useRef<THREE.InstancedMesh>(null);
  const rooms = SCENE.boardRooms;
  const layout = useMemo(() => {
    const out: [number, number, number][] = [];
    for (const r of rooms) {
      const len = r.w * 0.78;
      const per = 13;
      for (let i = 0; i < per; i++) {
        const x = r.x - len / 2 + (len / (per - 1)) * i;
        out.push([x, r.z - 1.05, 0], [x, r.z + 1.05, Math.PI]);
      }
      out.push([r.x - len / 2 - 0.9, r.z, Math.PI / 2]); // at the head
    }
    return out;
  }, [rooms]);

  // Facing +z: upholstered seat and back, on a post and a five-star base.
  const { upholstery, frame } = useMemo(() => {
    const seat = new THREE.BoxGeometry(0.48, 0.08, 0.46);
    seat.translate(0, 0.47, 0.02);
    const back = new THREE.BoxGeometry(0.46, 0.56, 0.06);
    back.rotateX(-0.12);
    back.translate(0, 0.82, -0.22);
    const post = new THREE.CylinderGeometry(0.025, 0.025, 0.4, 8);
    post.translate(0, 0.24, 0);
    const legs: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 5; k++) {
      const leg = new THREE.BoxGeometry(0.03, 0.03, 0.3);
      leg.translate(0, 0.05, 0.15);
      leg.rotateY((k / 5) * Math.PI * 2);
      legs.push(leg);
    }
    return { upholstery: mergeGeometries([seat, back]), frame: mergeGeometries([post, ...legs]) };
  }, []);

  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    for (const m of [chairs.current, frames.current]) {
      if (!m) continue;
      layout.forEach(([x, z, turn], i) => {
        o.position.set(x, 0, z);
        o.rotation.set(0, turn, 0);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
      });
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
    }
  }, [layout]);

  return (
    <>
      {rooms.map((r, i) => (
        <group key={i} position={[r.x, 0, r.z]}>
          <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
            <boxGeometry args={[r.w * 0.8, 0.05, 1.5]} />
            <meshStandardMaterial color={TIMBER} roughness={0.38} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * r.w * 0.27, 0.36, 0]} castShadow>
              <boxGeometry args={[0.5, 0.72, 0.9]} />
              <meshStandardMaterial color="#4A3322" roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}
      <instancedMesh ref={chairs} args={[upholstery, undefined, layout.length]} castShadow receiveShadow>
        <meshStandardMaterial color={CHAIR} roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={frames} args={[frame, undefined, layout.length]} castShadow>
        <meshStandardMaterial color="#9AA0A8" roughness={0.3} metalness={0.8} />
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
  // Seen along the floor at eye height, a texture blurs unless filtered for it.
  t.anisotropy = 16;
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
  inside,
  spot,
  walk,
  floor,
  move,
  walking,
}: {
  controls: React.RefObject<OrbitControlsImpl | null>;
  focus: CanvasProps["focus"];
  resetNonce: number;
  inside: boolean;
  spot: number;
  walk: Walk | null;
  floor: FloorKey;
  move: CanvasProps["move"];
  walking: boolean;
}) {
  const { camera, size, invalidate, scene } = useThree();
  const moveRef = move;
  // What can stop you walking, gathered once a floor: not the world outside,
  // not the floor or the seats, not what is there only to be tapped.
  const colliderList = useRef<THREE.Object3D[] | null>(null);
  useEffect(() => {
    colliderList.current = null;
  }, [inside, floor]);
  function colliders() {
    if (colliderList.current) return colliderList.current;
    const out: THREE.Object3D[] = [];
    const visit = (o: THREE.Object3D) => {
      if (o.userData.noCollide || o.userData.ghost || o.userData.walkable || !o.visible) return;
      if ((o as THREE.Mesh).isMesh) out.push(o);
      o.children.forEach(visit);
    };
    scene.children.forEach(visit);
    colliderList.current = out;
    return out;
  }
  useEffect(() => {
    if (walking) invalidate();
  }, [walking, invalidate]);
  const flight = useRef<{
    fromPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toPos: THREE.Vector3;
    toTarget: THREE.Vector3;
    t: number;
    /** Seconds the leg takes. */
    dur: number;
    /** Eased to a stop, or walked at an even pace into the next leg. */
    ease: boolean;
    /** Legs still to go, for a walk through a door. */
    next: Walk["steps"];
  } | null>(null);
  const userMoved = useRef(false);

  function fly(toPos: THREE.Vector3, toTarget: THREE.Vector3, keep = true, dur = 0.75, ease = true, next: Walk["steps"] = []) {
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
      dur,
      ease,
      next,
    };
    invalidate();
  }

  /** Walk a path at a walking pace (a brisk one: this is a map). */
  function walkLegs(steps: Walk["steps"]) {
    const [first, ...rest] = steps;
    if (!first) return;
    const to = new THREE.Vector3(...first.pos);
    const dur = legSeconds(camera.position.distanceTo(to));
    fly(to, new THREE.Vector3(...first.look), true, dur, rest.length === 0, rest);
  }

  useEffect(() => {
    if (walk) walkLegs(walk.steps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walk?.nonce]);

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
    if (userMoved.current || inside) return;
    const [pos, target] = overview();
    camera.position.copy(pos);
    controls.current?.target.copy(target);
    controls.current?.update();
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height]);

  useEffect(() => {
    if (resetNonce === 0) return;
    if (inside) {
      const views = INSIDE_VIEWS[floor];
      const v = views[spot] ?? views[0];
      fly(new THREE.Vector3(...v.pos), new THREE.Vector3(...v.look));
      return;
    }
    const [pos, target] = overview();
    fly(pos, target, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetNonce]);

  // Stepping in: a closer near plane, for chairs at arm's length, and off to
  // the chosen spot. Stepping out: back to the whole venue.
  const wasInside = useRef(inside);
  const wasFloor = useRef(floor);
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    // A wider lens in the room, as the eye has: on a phone held upright the
    // map's narrow one would show a slice of the stage and none of the walls.
    cam.fov = inside ? 66 : 38;
    cam.near = inside ? 0.1 : 0.5;
    cam.updateProjectionMatrix();
    if (inside) {
      const views = INSIDE_VIEWS[floor];
      const v = views[spot] ?? views[0];
      const to = new THREE.Vector3(...v.pos);
      const look = new THREE.Vector3(...v.look);
      if (!wasInside.current || wasFloor.current !== floor) {
        // From outside, or by the lift from another floor, appear at the
        // spot at once: a flight would pass through a roof or a slab. Any
        // flight still under way out there (a reset, a stall) is dropped,
        // or it would carry on and lift you back over the roof.
        flight.current = null;
        camera.position.copy(to);
        controls.current?.target.copy(to).addScaledVector(look.sub(to).normalize(), EYE_REACH);
        controls.current?.update();
        userMoved.current = true;
        invalidate();
      } else {
        fly(to, look);
      }
    } else if (wasInside.current) {
      flight.current = null;
      const [pos, target] = overview();
      camera.position.copy(pos);
      controls.current?.target.copy(target);
      controls.current?.update();
      userMoved.current = false;
      invalidate();
    }
    wasInside.current = inside;
    wasFloor.current = floor;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inside, spot, floor]);

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
    const c = controls.current;
    const m = moveRef.current;
    if (inside && c && !flight.current && (walking || m.f || m.t)) {
      // Walking: turn on the spot, step forward or back at a walking pace,
      // and stop short of anything in the way (seats and the floor aside).
      const step = Math.min(dt, 1 / 30);
      const look = c.target.clone().sub(camera.position);
      if (m.t) look.applyAxisAngle(UP, -m.t * TURN_SPEED * step);
      if (m.f) {
        const dir = new THREE.Vector3(look.x, 0, look.z).normalize().multiplyScalar(Math.sign(m.f));
        const dist = WALK_SPEED * Math.abs(m.f) * step;
        // Anything from the knee up stops you: a rail, a table, a wall.
        const feet = camera.position.y - EYE;
        WALK_RAY.far = dist + 0.45;
        WALK_RAY.camera = camera;
        const list = colliders();
        const blocked = [0.3, 0.75, 1.2, EYE].some((hgt) => {
          WALK_RAY.set(new THREE.Vector3(camera.position.x, feet + hgt, camera.position.z), dir);
          return WALK_RAY.intersectObjects(list, false).length > 0;
        });
        if (!blocked) {
          camera.position.addScaledVector(dir, dist);
          camera.position.y = floorAt(floor, camera.position.x, camera.position.z) + EYE;
        }
      }
      c.target.copy(camera.position).add(look);
      c.update();
      invalidate();
    }
    if (inside && c && !flight.current) {
      // However it is turned or zoomed, the camera stays in the room.
      // In the hall, up to its high ceiling; out on the floor, under its
      // low one and within the building.
      const p = camera.position;
      if (floor === "ground" && inHall(p.x, p.z)) {
        p.y = THREE.MathUtils.clamp(p.y, 1, ROOM.h - 1.2);
      } else {
        p.x = THREE.MathUtils.clamp(p.x, -SCENE.extent.w / 2 + 1, SCENE.extent.w / 2 - 1);
        p.z = THREE.MathUtils.clamp(p.z, -SCENE.extent.d / 2 + 1, SCENE.extent.d / 2 - 1);
        p.y = THREE.MathUtils.clamp(p.y, 1, CEILING[floor] - 0.4);
      }
    }
    const f = flight.current;
    if (!f || !c) return;
    // The first frame after the map has sat still arrives with the whole
    // idle time as its step; capped, the flight is seen rather than skipped.
    f.t = Math.min(1, f.t + Math.min(dt, 1 / 30) / f.dur);
    const k = f.ease ? 1 - Math.pow(1 - f.t, 3) : f.t;
    camera.position.lerpVectors(f.fromPos, f.toPos, k);
    if (inside) {
      // Inside, the turning point stays at the eye: carry the direction of
      // view round from the old one to the new, rather than the point.
      const a = f.fromTarget.clone().sub(f.fromPos).normalize();
      const b = f.toTarget.clone().sub(f.toPos).normalize();
      const dir = a.lerp(b, k);
      if (dir.lengthSq() < 1e-4) dir.copy(b);
      c.target.copy(camera.position).addScaledVector(dir.normalize(), EYE_REACH);
    } else {
      c.target.lerpVectors(f.fromTarget, f.toTarget, k);
    }
    c.update();
    if (f.t >= 1) {
      flight.current = null;
      if (f.next.length) walkLegs(f.next);
    }
    else invalidate();
  });

  return null;
}
