import { memo, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DESK_TOP, PLACE, ROOM } from "./stage";
import type { Anim } from "./anim";

/*
 * The room's ambient layer, the life that is not furniture:
 *
 *   Rain       streaks falling past the window, only while the rain plays,
 *              so what you hear is also what you see.
 *   Steam      off the mug on the desk, curling in the lamp light.
 *
 * Both are single draws with tiny shaders and sit outside the reveal, so
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
      <Rain anim={anim} />
      <Steam anim={anim} />
    </group>
  );
});
