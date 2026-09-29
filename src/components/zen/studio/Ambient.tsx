import { memo, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DESK_TOP, PLACE, ROOM, SUN } from "./stage";
import { cloudShade, type Anim } from "./anim";

/*
 * The room's ambient layer, the life that is not furniture:
 *
 *   Rain       streaks falling past the window, only while the rain plays,
 *              so what you hear is also what you see.
 *   Steam      off the mug on the desk, curling in the lamp light.
 *   Shafts     the sun (or the moon) falling through the window, in the air.
 *
 * All are single draws with tiny shaders and sit outside the reveal, so
 * they fade with the lights rather than being drafted and scanned.
 */

const NOISE = /* glsl */ `
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
  }
`;

/* ------------------------------------------------------------------- rain */

const RAIN_VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aEnd;
  uniform float uTime;
  varying float vEnd;
  void main() {
    vec3 p = position;
    float fall = mod(uTime * (6.5 + aSeed * 3.0) + aSeed * 41.0, 5.4);
    p.y = 4.6 - fall - aEnd * (0.16 + aSeed * 0.08);
    p.x += aEnd * 0.025;
    vEnd = aEnd;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const RAIN_FRAG = /* glsl */ `
  uniform float uAmount;
  varying float vEnd;
  void main() {
    gl_FragColor = vec4(0.72, 0.8, 1.0, uAmount * 0.17 * (1.0 - vEnd * 0.9));
  }
`;

function Rain({ anim }: { anim: Anim }) {
  const { geometry, material } = useMemo(() => {
    const n = 620;
    const pos = new Float32Array(n * 2 * 3);
    const seed = new Float32Array(n * 2);
    const end = new Float32Array(n * 2);
    let s = 23;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const { x, width } = PLACE.window;
    for (let i = 0; i < n; i++) {
      const px = x - width / 2 - 0.6 + r() * (width + 1.2);
      const pz = ROOM.back - 0.35 - r() * 3.2;
      const sd = r();
      for (let k = 0; k < 2; k++) {
        const j = i * 2 + k;
        pos.set([px, 0, pz], j * 3);
        seed[j] = sd;
        end[j] = k;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aEnd", new THREE.BufferAttribute(end, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: RAIN_VERT,
      fragmentShader: RAIN_FRAG,
      uniforms: { uTime: { value: 0 }, uAmount: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry: g, material: m };
  }, []);
  const ref = useRef<THREE.LineSegments>(null);
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uAmount.value = anim.rain * anim.moon;
    if (ref.current) ref.current.visible = anim.rain > 0.005;
  });
  return <lineSegments ref={ref} geometry={geometry} material={material} frustumCulled={false} />;
}

/* ----------------------------------------------------------------- shafts */

/** Direction the light travels, window to floor. */
const SUN_DIR = new THREE.Vector3(...SUN.target).sub(new THREE.Vector3(...SUN.pos)).normalize();

const SHAFT_VERT = /* glsl */ `
  attribute float aV;
  varying vec2 vUv;
  varying float vV;
  varying float vNear;
  void main() {
    vUv = uv;
    vV = aV;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // Fade a sheet as the camera comes up to it, so a close-up never
    // looks through a slab of light pressed against the lens.
    vNear = smoothstep(0.35, 1.6, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const SHAFT_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uAmount;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying float vV;
  varying float vNear;
  ${NOISE}
  void main() {
    float u = vUv.x;
    float t = vUv.y;
    // The bars of the window cast their shadows down the shaft, sharp at
    // the glass and softening with distance, as a real penumbra does.
    float soft = 0.008 + 0.05 * t;
    float bars = smoothstep(0.0, soft, abs(u - 1.0 / 3.0)) * smoothstep(0.0, soft, abs(u - 2.0 / 3.0));
    bars *= smoothstep(0.0, soft * 1.4, abs(vV - 0.68));
    float edge = smoothstep(0.0, 0.04 + soft, u) * smoothstep(1.0, 0.96 - soft, u);
    edge *= smoothstep(0.0, 0.06, vV) * smoothstep(1.0, 0.94, vV);
    float along = smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.45, 1.0, t));
    // Most of a sheet is empty from any one view; leave before the noise.
    float a = uAmount * edge * bars * along * vNear;
    if (a < 0.002) discard;
    // Slow streaks of haze drifting across the beam.
    float n = vnoise(vec2(u * 7.0 + uTime * 0.035, vV * 4.0 + t * 1.5 - uTime * 0.02));
    a *= 0.45 + 0.75 * n;
    gl_FragColor = vec4(uColor, a);
  }
`;

const SUN_TINT = [new THREE.Color("#8fa6ff"), new THREE.Color("#fff0d6")];

/**
 * Light falling through the window: a stack of thin sheets, each one the
 * window's width, swept from the glass along the light to the floor. Seen
 * together they read as a volume of lit air. One draw, depth-tested, so the
 * desk and the chair stand in the beam rather than in front of it.
 */
function Shafts({ anim }: { anim: Anim }) {
  const { geometry, material } = useMemo(() => {
    const { x, width, sill, top } = PLACE.window;
    const z = ROOM.back - 0.05;
    const L = SUN_DIR;
    const n = 9;
    const pos: number[] = [];
    const uv: number[] = [];
    const vs: number[] = [];
    const idx: number[] = [];
    for (let k = 0; k < n; k++) {
      const v = (k + 0.5) / n;
      const y = sill + (top - sill) * v;
      // Down to the floor.
      const len = y / -L.y;
      const x0 = x - width / 2;
      const x1 = x + width / 2;
      const base = pos.length / 3;
      pos.push(x0, y, z, x1, y, z, x0 + L.x * len, 0, z + L.z * len, x1 + L.x * len, 0, z + L.z * len);
      uv.push(0, 0, 1, 0, 0, 1, 1, 1);
      vs.push(v, v, v, v);
      idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute("aV", new THREE.Float32BufferAttribute(vs, 1));
    g.setIndex(idx);
    const m = new THREE.ShaderMaterial({
      vertexShader: SHAFT_VERT,
      fragmentShader: SHAFT_FRAG,
      uniforms: { uTime: { value: 0 }, uAmount: { value: 0 }, uColor: { value: new THREE.Color() } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    return { geometry: g, material: m };
  }, []);
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    // Sunlight is a warm, visible beam; moonlight a faint blue one.
    u.uAmount.value = anim.moon * (0.034 - anim.day * 0.008) * cloudShade(state.clock.elapsedTime, anim.day);
    u.uColor.value.lerpColors(SUN_TINT[0], SUN_TINT[1], anim.day);
    if (ref.current) ref.current.visible = u.uAmount.value > 0.002;
  });
  return <mesh ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />;
}

/* ------------------------------------------------------------------ steam */

const STEAM_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const STEAM_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uAmount;
  varying vec2 vUv;
  ${NOISE}
  void main() {
    float y = vUv.y;
    float sway = sin(y * 5.0 - uTime * 0.9) * 0.09 * y;
    float x = vUv.x - 0.5 + sway;
    float n = vnoise(vec2(x * 7.0, y * 3.2 - uTime * 0.55)) * 0.65 + vnoise(vec2(x * 15.0, y * 6.0 - uTime * 0.9)) * 0.35;
    float wisp = smoothstep(0.42, 0.85, n);
    float column = smoothstep(0.34, 0.04, abs(x) - y * 0.08);
    float fade = smoothstep(0.0, 0.12, y) * (1.0 - smoothstep(0.45, 1.0, y));
    float a = wisp * column * fade * uAmount * 0.3;
    if (a < 0.003) discard;
    gl_FragColor = vec4(vec3(1.0, 0.95, 0.88), a);
  }
`;

function Steam({ anim }: { anim: Anim }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: STEAM_VERT,
        fragmentShader: STEAM_FRAG,
        uniforms: { uTime: { value: 0 }, uAmount: { value: 0 } },
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  const ref = useRef<THREE.Mesh>(null);
  const [x, , z] = PLACE.mug.pos;
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uAmount.value = anim.dust;
    const m = ref.current;
    // Turn to face the camera about the vertical only, so it stays a column.
    if (m) m.rotation.y = Math.atan2(state.camera.position.x - x, state.camera.position.z - z);
  });
  return (
    <mesh ref={ref} position={[x, DESK_TOP + 0.09 + 0.14, z]} material={material} frustumCulled={false}>
      <planeGeometry args={[0.13, 0.3]} />
    </mesh>
  );
}

export const Ambient = memo(function Ambient({ anim }: { anim: Anim }) {
  return (
    <group>
      <Shafts anim={anim} />
      <Rain anim={anim} />
      <Steam anim={anim} />
    </group>
  );
});
