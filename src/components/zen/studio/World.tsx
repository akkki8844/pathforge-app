import { memo, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ROOM, SUN, TERRACE } from "./stage";
import { makeCanvasTexture, rand } from "./canvases";
import type { Anim } from "./anim";

/*
 * The world outside the study.
 *
 * Turning the building all the way round means there has to be somewhere for
 * it to stand: a sky that is the same from every side (the window, the glass
 * wall and the terrace all look out on it), a lawn that fades into haze, and
 * trees along the edge. All of it is a few draws with small shaders, drawn
 * before the room and never lit or shadowed, so it costs almost nothing.
 *
 *   Sky       gradient, drifting clouds, a sun (or a moon and stars), and
 *             three ridges of hills with a campus tower among them.
 *   Ground    a mown lawn, a stone path from the terrace, the soft shadow of
 *             the building's footprint on it.
 *   Trees     painted cut-outs that face the camera and sway in the wind.
 *
 * `uWorld` fades all of it out for the blueprint, where the room stands alone
 * on the drawing sheet, and in with the scan on the way in.
 */

const NOISE = /* glsl */ `
  float h11(float p) { return fract(sin(p * 127.1) * 43758.5453); }
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float h31(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < 4; i++) {
      s += a * vnoise(p);
      p = p * 2.03 + 11.7;
      a *= 0.5;
    }
    return s;
  }
`;

/* -------------------------------------------------------------------- sky -- */

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    // Follows the camera, so it is always exactly as far away as the horizon.
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uDay;
  uniform float uWorld;
  uniform float uRain;
  uniform vec3 uSun;
  uniform vec3 uBg;
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uHaze;
  uniform vec3 uCloudLight;
  uniform vec3 uCloudDark;
  uniform vec3 uFar;
  uniform vec3 uMid;
  uniform vec3 uNear;
  uniform vec3 uTown;
  varying vec3 vDir;
  ${NOISE}

  float ridge(float az, float seed, float freq) {
    return 0.5 * sin(az * freq + seed) + 0.3 * sin(az * freq * 2.3 + seed * 1.7) + 0.2 * sin(az * freq * 5.1 + seed * 3.1);
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    float az = atan(d.x, d.z);

    float t = pow(clamp(h, 0.0, 1.0), 0.5);
    vec3 col = mix(uHorizon, uZenith, t);

    float sd = max(dot(d, uSun), 0.0);
    float night = 1.0 - uDay;
    // The sun by day: a hard white core, a warm halo. The moon by night: a disc.
    col += vec3(1.0, 0.93, 0.78) * (pow(sd, 700.0) * 3.0 + pow(sd, 16.0) * 0.22) * uDay;
    col += vec3(0.75, 0.85, 1.0) * (smoothstep(0.9993, 0.9997, sd) * 1.4 + pow(sd, 90.0) * 0.18) * night;

    // Stars, twinkling, only where the sky is dark.
    vec3 sp = d * 110.0;
    vec3 cell = floor(sp);
    float r = h31(cell);
    float star = smoothstep(0.36, 0.0, length(fract(sp) - 0.5)) * step(0.982, r);
    star *= 0.55 + 0.45 * sin(uTime * (1.2 + r * 3.0) + r * 60.0);
    col += vec3(0.9, 0.95, 1.0) * star * night * smoothstep(0.05, 0.4, h) * (1.0 - uRain);

    // Clouds on a plane far overhead, drifting on the wind, lit from the sun's side.
    if (h > 0.0) {
      vec2 p = d.xz / (h + 0.16) * 1.35 + vec2(uTime * 0.007, uTime * 0.0025);
      float c = fbm(p);
      float cover = mix(0.5, 0.36, uRain);
      float dens = smoothstep(cover, cover + 0.26, c);
      float lit = fbm(p + uSun.xz * 0.06);
      float shade = clamp((c - lit) * 3.2 + 0.62, 0.0, 1.0);
      vec3 cc = mix(uCloudDark, uCloudLight, shade);
      col = mix(col, cc, dens * smoothstep(0.0, 0.22, h) * 0.92);
    }

    // Ridges: far, middle, near, and a town with a tower among the middle ones.
    float haze = uHaze.r;
    float far = 0.030 + 0.055 * (ridge(az, 1.3, 2.1) * 0.5 + 0.5);
    float mid = 0.012 + 0.036 * (ridge(az, 4.7, 3.4) * 0.5 + 0.5) + 0.004 * vnoise(vec2(az * 60.0, 1.0));
    float near = 0.004 + 0.018 * (ridge(az, 8.1, 5.2) * 0.5 + 0.5) + 0.006 * vnoise(vec2(az * 140.0, 3.0));
    float e = 0.0016;
    col = mix(col, uFar, (1.0 - smoothstep(far - e, far + e, h)) * step(-0.02, h));
    col = mix(col, uMid, (1.0 - smoothstep(mid - e, mid + e, h)));
    // The town, by the window's line of sight: low blocks and a clock tower.
    float townAz = az - 2.9;
    float blocks = 0.0;
    for (int i = 0; i < 9; i++) {
      float fi = float(i);
      float c0 = -0.34 + fi * 0.085 + h11(fi + 3.0) * 0.03;
      float w = 0.018 + h11(fi + 9.0) * 0.02;
      float ht = 0.012 + h11(fi + 17.0) * 0.03;
      blocks = max(blocks, step(abs(townAz - c0), w) * ht);
    }
    float tower = step(abs(townAz - 0.06), 0.007) * 0.10 + step(abs(townAz - 0.06), 0.017) * step(0.078, h) * 0.0;
    float spire = smoothstep(0.0, 1.0, 1.0 - abs(townAz - 0.06) / 0.012) * 0.03 * step(0.09, h);
    float town = max(blocks, tower + spire * step(0.0999, h)) * step(abs(townAz), 0.5) * (0.6 + 0.4 * step(mid, 0.999));
    col = mix(col, uTown, (1.0 - smoothstep(mid + town - e, mid + town + e, h)) * step(0.0005, town));
    col = mix(col, uNear, (1.0 - smoothstep(near - e, near + e, h)));
    // Night windows in the town.
    vec2 wg = vec2(townAz * 420.0, h * 900.0);
    float win = step(0.86, h21(floor(wg))) * step(0.25, fract(wg.x)) * step(0.25, fract(wg.y));
    col += vec3(1.0, 0.78, 0.45) * win * night * step(mid, h) * step(h, mid + town) * 0.9;

    // Below the horizon, the haze the lawn dissolves into.
    col = mix(col, uHaze, smoothstep(0.0, -0.06, h));

    // Rain greys the sky; a fine grain keeps the gradient from banding.
    float g = dot(col, vec3(0.3, 0.59, 0.11));
    col = mix(col, vec3(g) * 0.92, uRain * 0.45);
    col += (h21(gl_FragCoord.xy) - 0.5) * 0.008;
    col = mix(uBg, col, uWorld);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ----------------------------------------------------------------- ground -- */

const GROUND_VERT = /* glsl */ `
  varying vec3 vW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const GROUND_FRAG = /* glsl */ `
  uniform float uDay;
  uniform float uWorld;
  uniform vec3 uBg;
  uniform vec3 uGrassA;
  uniform vec3 uGrassB;
  uniform vec3 uStone;
  uniform vec3 uHaze;
  uniform vec4 uBox;
  uniform float uDoorX;
  uniform float uPathZ;
  varying vec3 vW;
  ${NOISE}

  void main() {
    vec2 p = vW.xz;
    // A mown lawn: broad stripes, a mid-scale mottle, a fine grain.
    float stripe = 0.5 + 0.5 * sin(p.x * 1.05 + sin(p.y * 0.09) * 1.6);
    float mottle = fbm(p * 0.55);
    float grain = vnoise(p * 9.0) * 0.5 + vnoise(p * 23.0) * 0.5;
    vec3 col = mix(uGrassA, uGrassB, clamp(stripe * 0.55 + mottle * 0.7, 0.0, 1.0));
    col *= 0.9 + grain * 0.2;

    // The path from the terrace's steps: pale flags with dark joints.
    float onPath = (1.0 - smoothstep(0.78, 0.86, abs(p.x - uDoorX))) * smoothstep(uPathZ - 0.02, uPathZ + 0.02, p.y);
    vec2 fl = vec2(p.x - uDoorX, p.y - uPathZ) * vec2(1.25, 0.85);
    vec2 cell = floor(fl);
    vec2 f = fract(fl);
    float joint = smoothstep(0.03, 0.07, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
    vec3 flag = uStone * (0.9 + 0.16 * h21(cell)) * mix(0.72, 1.0, joint);
    col = mix(col, flag, onPath);

    // The building's footprint darkens the grass around it, and the deck's edge.
    vec2 q = abs(p - uBox.xy) - uBox.zw;
    float dBox = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
    col *= 1.0 - 0.42 * exp(-max(dBox, 0.0) * 1.9) * (1.0 - onPath * 0.5);

    float r = length(p - vec2(0.0, 2.0));
    col = mix(col, uHaze, smoothstep(22.0, 70.0, r));
    col = mix(uBg, col, uWorld);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const C = (hex: string) => new THREE.Color(hex);
const PAL = {
  zenith: [C("#050a1f"), C("#6f9be6")],
  horizon: [C("#182452"), C("#e8f0fd")],
  haze: [C("#111a3c"), C("#e3ebf6")],
  cloudLight: [C("#5a6798"), C("#ffffff")],
  cloudDark: [C("#1a2350"), C("#c3cfe8")],
  far: [C("#151f4a"), C("#b3c4e2")],
  mid: [C("#0e1638"), C("#9db9b4")],
  near: [C("#090e26"), C("#7b9d86")],
  town: [C("#0c1332"), C("#c4cbdc")],
  grassA: [C("#0d1b22"), C("#7fa25f")],
  grassB: [C("#12262a"), C("#98b874")],
  stone: [C("#2a3350"), C("#dcd7cb")],
  bg: [C("#040509"), C("#f3f1ec")],
} as const;

const SUN_UP = new THREE.Vector3(...SUN.pos).sub(new THREE.Vector3(...SUN.target)).normalize();

function lerp3(out: THREE.Color, pair: readonly [THREE.Color, THREE.Color], day: number) {
  out.lerpColors(pair[0], pair[1], day);
}

/** Sky, lawn and the trees; one component, so they share the time and the fade. */
export const World = memo(function World({ anim }: { anim: Anim }) {
  const sky = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          uTime: { value: 0 },
          uDay: { value: 1 },
          uWorld: { value: 0 },
          uRain: { value: 0 },
          uSun: { value: SUN_UP.clone() },
          uBg: { value: new THREE.Color() },
          uZenith: { value: new THREE.Color() },
          uHorizon: { value: new THREE.Color() },
          uHaze: { value: new THREE.Color() },
          uCloudLight: { value: new THREE.Color() },
          uCloudDark: { value: new THREE.Color() },
          uFar: { value: new THREE.Color() },
          uMid: { value: new THREE.Color() },
          uNear: { value: new THREE.Color() },
          uTown: { value: new THREE.Color() },
        },
      }),
    [],
  );
  const ground = useMemo(() => {
    const doorX = -3.7 + (7.4 / 6) * 4.5;
    return new THREE.ShaderMaterial({
      vertexShader: GROUND_VERT,
      fragmentShader: GROUND_FRAG,
      uniforms: {
        uDay: { value: 1 },
        uWorld: { value: 0 },
        uBg: { value: new THREE.Color() },
        uGrassA: { value: new THREE.Color() },
        uGrassB: { value: new THREE.Color() },
        uStone: { value: new THREE.Color() },
        uHaze: { value: new THREE.Color() },
        uBox: {
          value: new THREE.Vector4(0, (ROOM.back + TERRACE.z1) / 2, ROOM.halfW + 0.1, (TERRACE.z1 - ROOM.back) / 2 + 0.1),
        },
        uDoorX: { value: doorX },
        uPathZ: { value: TERRACE.z1 },
      },
    });
  }, []);
  const skyMesh = useRef<THREE.Mesh>(null);
  const groundMesh = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const day = anim.day;
    // The world arrives with the scan, floor to sky, and leaves with it.
    const world = THREE.MathUtils.smoothstep(anim.scan, 0.4, 4.6);
    const u = sky.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uDay.value = day;
    u.uWorld.value = world;
    u.uRain.value = anim.rain;
    lerp3(u.uBg.value, PAL.bg, day);
    lerp3(u.uZenith.value, PAL.zenith, day);
    lerp3(u.uHorizon.value, PAL.horizon, day);
    lerp3(u.uHaze.value, PAL.haze, day);
    lerp3(u.uCloudLight.value, PAL.cloudLight, day);
    lerp3(u.uCloudDark.value, PAL.cloudDark, day);
    lerp3(u.uFar.value, PAL.far, day);
    lerp3(u.uMid.value, PAL.mid, day);
    lerp3(u.uNear.value, PAL.near, day);
    lerp3(u.uTown.value, PAL.town, day);
    const g = ground.uniforms;
    g.uDay.value = day;
    g.uWorld.value = world;
    lerp3(g.uBg.value, PAL.bg, day);
    lerp3(g.uGrassA.value, PAL.grassA, day);
    lerp3(g.uGrassB.value, PAL.grassB, day);
    lerp3(g.uStone.value, PAL.stone, day);
    lerp3(g.uHaze.value, PAL.haze, day);
    if (skyMesh.current) skyMesh.current.position.copy(state.camera.position);
  });

  return (
    <group>
      <mesh ref={skyMesh} material={sky} renderOrder={-10} frustumCulled={false} userData={{ pfSkip: true }}>
        <sphereGeometry args={[90, 48, 24]} />
      </mesh>
      <mesh
        ref={groundMesh}
        material={ground}
        rotation-x={-Math.PI / 2}
        position={[0, -0.04, 2]}
        renderOrder={-9}
        frustumCulled={false}
        userData={{ pfSkip: true }}
      >
        <circleGeometry args={[80, 64]} />
      </mesh>
      <Trees anim={anim} />
      <Birds anim={anim} />
      <Fireflies anim={anim} />
    </group>
  );
});


/* ------------------------------------------------------------------ birds -- */

const BIRD_VERT = /* glsl */ `
  attribute vec3 aFlock;
  attribute float aSeed;
  uniform float uTime;
  varying float vSeed;
  varying float vDist;
  void main() {
    // Each bird flies a slow loop high over the lawn, heading along it, wings beating.
    float spd = 0.05 + aSeed * 0.03;
    float a = uTime * spd + aFlock.x;
    vec3 c = vec3(0.0, aFlock.y, -26.0);
    vec3 pos = c + vec3(cos(a) * 54.0, sin(a * 2.3 + aSeed * 9.0) * 2.4, sin(a) * 38.0);
    vec3 fwd = normalize(vec3(-sin(a) * 54.0, 0.0, cos(a) * 38.0));
    vec3 side = vec3(fwd.z, 0.0, -fwd.x);
    float flap = sin(uTime * (6.5 + aSeed * 3.0) + aSeed * 40.0);
    float tip = abs(position.x);
    vec3 p = pos + side * position.x * 1.15 + vec3(0.0, 1.0, 0.0) * (tip * flap * 0.55 + position.y) + fwd * position.z * 1.1;
    vSeed = aSeed;
    vDist = length(p - cameraPosition);
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;
const BIRD_FRAG = /* glsl */ `
  uniform float uAmount;
  uniform vec3 uHaze;
  varying float vSeed;
  varying float vDist;
  void main() {
    vec3 col = mix(vec3(0.13, 0.15, 0.2), uHaze, smoothstep(30.0, 110.0, vDist) * 0.7);
    gl_FragColor = vec4(col, uAmount);
  }
`;

/** A few birds, far off, crossing the sky by day. */
function Birds({ anim }: { anim: Anim }) {
  const { geometry, material } = useMemo(() => {
    const n = 9;
    // A bird is two swept wings and a tail.
    const v = new Float32Array([
      0, 0, 0.5, -1, 0.05, -0.1, 0, 0, -0.15,
      0, 0, 0.5, 1, 0.05, -0.1, 0, 0, -0.15,
      0, 0, -0.15, -0.15, 0, -0.5, 0.15, 0, -0.5,
    ]);
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(v, 3));
    const flock = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    const r = rand(9);
    for (let i = 0; i < n; i++) {
      const cluster = Math.floor(i / 3);
      flock.set([cluster * 2.1 + r() * 0.16, 15 + cluster * 4 + r() * 3, 0], i * 3);
      seed[i] = r();
    }
    g.setAttribute("aFlock", new THREE.InstancedBufferAttribute(flock, 3));
    g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
    g.instanceCount = n;
    const m = new THREE.ShaderMaterial({
      vertexShader: BIRD_VERT,
      fragmentShader: BIRD_FRAG,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uAmount: { value: 0 }, uHaze: { value: new THREE.Color() } },
    });
    return { geometry: g, material: m };
  }, []);
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    const amount = anim.day * (1 - anim.rain) * THREE.MathUtils.smoothstep(anim.scan, 1, 4.6);
    u.uAmount.value = amount;
    lerp3(u.uHaze.value, PAL.haze, anim.day);
    if (ref.current) ref.current.visible = amount > 0.01;
  });
  return <mesh ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={-7} userData={{ pfSkip: true }} />;
}

/* -------------------------------------------------------------- fireflies -- */

const FLY_VERT = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uSize;
  varying float vBlink;
  void main() {
    vec3 p = position;
    float t = uTime * (0.25 + aSeed * 0.2) + aSeed * 60.0;
    p.x += sin(t * 1.3) * 0.9 + sin(t * 0.47) * 0.6;
    p.y += sin(t * 0.9 + 1.0) * 0.35;
    p.z += cos(t * 1.1) * 0.9 + sin(t * 0.39) * 0.5;
    vBlink = smoothstep(0.35, 0.95, 0.5 + 0.5 * sin(uTime * (0.9 + aSeed) + aSeed * 30.0));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(uSize / -mv.z, uSize * 0.4);
  }
`;
const FLY_FRAG = /* glsl */ `
  uniform float uAmount;
  varying float vBlink;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = (smoothstep(0.3, 0.0, d) + smoothstep(1.0, 0.0, d) * 0.35) * uAmount * vBlink;
    if (a < 0.01) discard;
    gl_FragColor = vec4(0.78, 1.0, 0.45, a);
  }
`;

/** Fireflies over the lawn on a night that has warmed up. */
function Fireflies({ anim }: { anim: Anim }) {
  const { geometry, material } = useMemo(() => {
    const n = 70;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    const r = rand(13);
    for (let i = 0; i < n; i++) {
      const side = r() < 0.5 ? -1 : 1;
      const front = r() < 0.6;
      pos.set(
        [front ? (r() - 0.5) * 16 : side * (6 + r() * 6), 0.3 + r() * 2.2, front ? TERRACE.z1 + 1.2 + r() * 9 : (r() - 0.2) * 14],
        i * 3,
      );
      seed[i] = r();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: FLY_VERT,
      fragmentShader: FLY_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uSize: { value: 60 }, uAmount: { value: 0 } },
    });
    return { geometry: g, material: m };
  }, []);
  const ref = useRef<THREE.Points>(null);
  useFrame((state) => {
    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uSize.value = 70 * state.gl.getPixelRatio();
    const amount = (1 - anim.day) * anim.moon * THREE.MathUtils.smoothstep(anim.scan, 1, 4.6) * (1 - anim.rain * 0.8);
    u.uAmount.value = amount;
    if (ref.current) ref.current.visible = amount > 0.01;
  });
  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} userData={{ pfSkip: true }} />;
}

/* ------------------------------------------------------------------ trees -- */

const TREE_VERT = /* glsl */ `
  attribute vec3 aPos;
  attribute vec2 aSize;
  attribute float aSeed;
  uniform float uTime;
  varying vec2 vUv;
  varying float vSeed;
  varying float vDist;
  void main() {
    // A cut-out that always turns its face to the camera, about the vertical only.
    vec3 toCam = cameraPosition - aPos;
    vec3 right = normalize(vec3(toCam.z, 0.0, -toCam.x));
    vec3 p = aPos + right * position.x * aSize.x + vec3(0.0, position.y * aSize.y, 0.0);
    float top = position.y * position.y;
    p += right * sin(uTime * 0.9 + aSeed * 30.0 + position.y * 2.5) * 0.05 * aSize.y * top;
    vUv = uv;
    vSeed = aSeed;
    vDist = length(toCam);
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;

const TREE_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uDay;
  uniform float uWorld;
  uniform vec3 uBg;
  uniform vec3 uHaze;
  varying vec2 vUv;
  varying float vSeed;
  varying float vDist;
  void main() {
    float v = floor(vSeed * 4.0);
    vec2 uv = vec2((vUv.x + mod(v, 2.0)) * 0.5, (vUv.y + floor(v / 2.0)) * 0.5);
    vec4 t = texture2D(uMap, uv);
    if (t.a < 0.5) discard;
    // Day and night, then the haze of distance, then the blueprint's fade.
    vec3 col = t.rgb * mix(vec3(0.06, 0.09, 0.2), vec3(1.0), uDay) * (0.85 + 0.3 * fract(vSeed * 7.0));
    col = mix(col, uHaze, smoothstep(26.0, 100.0, vDist) * 0.62);
    col = mix(uBg, col, uWorld);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Four trees on one sheet: two round-headed, a tall one, a conifer. Painted leaf by leaf. */
function paintTrees(ctx: CanvasRenderingContext2D, size: number) {
  const r = rand(41);
  const cell = size / 2;
  const greens = [
    ["#1f3f26", "#2f5a32", "#43763f", "#5f9450", "#86b866"],
    ["#1d3d2b", "#2c5639", "#3f7048", "#588a5a", "#7fae76"],
    ["#2a4a22", "#3d6a2c", "#568a38", "#78a94a", "#a2c766"],
    ["#14322a", "#1f4636", "#2d5c46", "#427a5c", "#5f987a"],
  ];
  const bough = (x0: number, y0: number, x1: number, y1: number, w: number) => {
    ctx.strokeStyle = "#3d2f24";
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2 + (r() - 0.5) * 20, (y0 + y1) / 2, x1, y1);
    ctx.stroke();
  };
  const leaf = (x: number, y: number, rad: number, col: string, a: number) => {
    ctx.fillStyle = col;
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.ellipse(x, y, rad, rad * (0.55 + r() * 0.3), r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  };
  for (let k = 0; k < 4; k++) {
    const ox = (k % 2) * cell;
    const oy = Math.floor(k / 2) * cell;
    const g = greens[k];
    const cx = ox + cell / 2;
    const foot = oy + cell - 2;
    // Trunk and boughs first; the leaves are laid over them and leave gaps.
    ctx.strokeStyle = "#3d2f24";
    ctx.lineCap = "round";
    ctx.lineWidth = k === 3 ? 7 : 11;
    ctx.beginPath();
    ctx.moveTo(cx, foot);
    ctx.quadraticCurveTo(cx + (r() - 0.5) * 14, oy + cell * 0.72, cx + (r() - 0.5) * 10, oy + cell * (k === 3 ? 0.2 : 0.5));
    ctx.stroke();
    if (k === 3) {
      // A conifer: whorls of drooping sprigs, densest low down, thinning to a point.
      for (let n = 0; n < 5200; n++) {
        const t = Math.pow(r(), 0.85);
        const y = oy + cell * (0.06 + t * 0.9);
        const half = cell * 0.36 * Math.min(1, (y - oy - cell * 0.04) / (cell * 0.75));
        const x = cx + (r() * 2 - 1) * half;
        const edge = Math.abs(x - cx) / Math.max(1, half);
        const lit = (cx - x) / cell + 0.22 - t * 0.2 + (r() - 0.5) * 0.5;
        const idx = Math.max(0, Math.min(4, Math.floor(lit * 6 + 2.2)));
        leaf(x, y + edge * cell * 0.05, 2.2 + r() * 3.4, g[idx], 0.9);
      }
    } else {
      const wide = k === 2 ? 0.26 : 0.4;
      const rx = cell * wide;
      const ry = cell * (k === 2 ? 0.36 : 0.32);
      const cy = oy + cell * (k === 2 ? 0.3 : 0.36);
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.4;
        bough(cx, oy + cell * 0.56, cx + Math.cos(a) * rx * 0.85, cy + Math.sin(a) * ry * 0.7, 4 + r() * 3);
      }
      // A shaded core first, so the crown has depth, then leaves outward.
      for (let n = 0; n < 900; n++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * 0.7;
        leaf(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, 3 + r() * 4, g[0], 0.95);
      }
      for (let n = 0; n < 5600; n++) {
        const a = r() * Math.PI * 2;
        // Bunched into clumps with gaps between, dense at the middle, ragged at the rim.
        const clump = 0.5 + 0.5 * Math.sin(a * 5 + k) * Math.sin(a * 3 - k);
        const d = Math.pow(r(), 0.7) * (0.72 + 0.34 * clump);
        if (d > 0.98 && r() < 0.5) continue;
        const x = cx + Math.cos(a) * rx * d;
        const y = cy + Math.sin(a) * ry * d;
        const lit = (cx - x) / rx * 0.5 + (cy - y) / ry * 0.6 + (r() - 0.5) * 0.65;
        const idx = Math.max(0, Math.min(4, Math.floor(lit * 2.2 + 2.6)));
        leaf(x, y, 2 + r() * 4.5, g[idx], 0.92);
      }
    }
  }
}

function Trees({ anim }: { anim: Anim }) {
  const { geometry, material, tex } = useMemo(() => {
    const size = 1024;
    const t = makeCanvasTexture(size, size);
    t.tex.colorSpace = THREE.SRGBColorSpace;
    paintTrees(t.ctx, size);
    t.tex.needsUpdate = true;
    const r = rand(77);
    const n = 46;
    const pos = new Float32Array(n * 3);
    const sz = new Float32Array(n * 2);
    const seed = new Float32Array(n);
    let placed = 0;
    let guard = 0;
    while (placed < n && guard++ < 4000) {
      // A ring round the building, thicker behind the window; never on the terrace.
      const a = r() * Math.PI * 2;
      const rad = 24 + r() * 34;
      const x = Math.sin(a) * rad;
      const z = 2 + Math.cos(a) * rad;
      if (Math.abs(x) < 7.5 && z > -8 && z < 16) continue;
      const h = 9 + r() * 10;
      pos.set([x, -0.04, z], placed * 3);
      sz.set([h * (0.8 + r() * 0.3), h], placed * 2);
      seed[placed] = r();
      placed++;
    }
    const g = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    quad.translate(0, 0.5, 0);
    g.index = quad.index;
    g.setAttribute("position", quad.getAttribute("position"));
    g.setAttribute("uv", quad.getAttribute("uv"));
    g.setAttribute("aPos", new THREE.InstancedBufferAttribute(pos, 3));
    g.setAttribute("aSize", new THREE.InstancedBufferAttribute(sz, 2));
    g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
    g.instanceCount = placed;
    const m = new THREE.ShaderMaterial({
      vertexShader: TREE_VERT,
      fragmentShader: TREE_FRAG,
      side: THREE.DoubleSide,
      uniforms: {
        uMap: { value: t.tex },
        uTime: { value: 0 },
        uDay: { value: 1 },
        uWorld: { value: 0 },
        uBg: { value: new THREE.Color() },
        uHaze: { value: new THREE.Color() },
      },
    });
    return { geometry: g, material: m, tex: t.tex };
  }, []);
  useLayoutEffect(
    () => () => {
      tex.dispose();
      geometry.dispose();
      material.dispose();
    },
    [tex, geometry, material],
  );
  useFrame((state) => {
    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uDay.value = anim.day;
    u.uWorld.value = THREE.MathUtils.smoothstep(anim.scan, 0.4, 4.6);
    lerp3(u.uBg.value, PAL.bg, anim.day);
    lerp3(u.uHaze.value, PAL.haze, anim.day);
  });
  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={-8} userData={{ pfSkip: true }} />;
}
