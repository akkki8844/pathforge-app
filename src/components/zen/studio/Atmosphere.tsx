import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Anim } from "./anim";

/*
 * Two particle layers, one per mode.
 *
 *   Pixel clouds: blueprint mode's atmosphere. Square, grid-snapped points
 *   in drifting clusters of grey and cobalt, the way basement's machine view
 *   fills its air with dithered noise.
 *
 *   Dust: study mode's. A few hundred motes turning slowly in the moonlight
 *   and the lamp's cone, only visible where light would catch them.
 */

const PIX_VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aTone;
  uniform float uTime;
  uniform float uSize;
  varying float vTone;
  varying float vSeed;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.21 + aSeed * 6.28) * 0.18;
    p.y += sin(uTime * 0.17 + aSeed * 12.1) * 0.12;
    p.z += cos(uTime * 0.19 + aSeed * 3.7) * 0.18;
    p = floor(p * 14.0) / 14.0;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(uSize * (0.6 + aSeed * 0.8) / -mv.z, uSize * 0.22);
    vTone = aTone;
    vSeed = aSeed;
  }
`;

const PIX_FRAG = /* glsl */ `
  uniform float uAmount;
  uniform float uTime;
  uniform vec3 uCobalt;
  varying float vTone;
  varying float vSeed;
  void main() {
    float flick = step(0.35, fract(sin(floor(uTime * 6.0) + vSeed * 91.7) * 43758.5));
    vec3 grey = vec3(vTone);
    vec3 col = mix(grey, uCobalt, step(0.82, vSeed));
    float a = uAmount * (0.2 + 0.55 * vTone) * mix(0.5, 1.0, flick);
    if (a < 0.01) discard;
    gl_FragColor = vec4(col, a);
  }
`;

const DUST_VERT = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uSize;
  varying float vSeed;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.13 + aSeed * 40.0) * 0.25;
    p.y += mod(uTime * 0.02 * (0.5 + aSeed), 1.6) - 0.8;
    p.z += cos(uTime * 0.11 + aSeed * 23.0) * 0.25;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    // Clamped, so a mote drifting past the lens stays a mote, not a snowflake.
    gl_PointSize = min(uSize * (0.5 + aSeed) / -mv.z, uSize * 0.3);
    vSeed = aSeed;
  }
`;

const DUST_FRAG = /* glsl */ `
  uniform float uAmount;
  varying float vSeed;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.0, d) * uAmount * (0.08 + 0.22 * vSeed);
    if (a < 0.005) discard;
    gl_FragColor = vec4(vec3(1.0, 0.93, 0.82), a);
  }
`;

function gauss(r: () => number) {
  return (r() + r() + r() - 1.5) / 1.5;
}

export function Atmosphere({ anim }: { anim: Anim }) {
  const pixRef = useRef<THREE.Points>(null);
  const dustRef = useRef<THREE.Points>(null);
  const pixels = useMemo(() => {
    const clusters: Array<[number, number, number, number]> = [
      [-3.3, 2.9, -2.2, 0.9],
      [-3.2, 1.3, 0.6, 0.7],
      [3.5, 3.0, -2.6, 0.9],
      [3.4, 1.1, -0.2, 0.7],
      [0.9, 3.7, -1.4, 1.1],
      [-0.9, 0.5, -0.6, 0.8],
    ];
    const n = 1500;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    const tone = new Float32Array(n);
    let s = 11;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) {
      const [cx, cy, cz, rad] = clusters[i % clusters.length];
      pos[i * 3] = cx + gauss(r) * rad * 1.3;
      pos[i * 3 + 1] = cy + gauss(r) * rad * 0.7;
      pos[i * 3 + 2] = cz + gauss(r) * rad * 1.3;
      seed[i] = r();
      tone[i] = 0.25 + r() * 0.75;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aTone", new THREE.BufferAttribute(tone, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: PIX_VERT,
      fragmentShader: PIX_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 34 },
        uAmount: { value: 0 },
        uCobalt: { value: new THREE.Color("#5f82ff") },
      },
    });
    return { g, m };
  }, []);

  const dust = useMemo(() => {
    const n = 300;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    let s = 5;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) {
      // Two volumes: the moonlight falling through the window, and the lamp.
      const inBeam = i % 3 !== 0;
      if (i >= 180) {
        // The loft, and the lounge under it: light from the glass wall.
        const up = i % 2 === 0;
        pos[i * 3] = -3.6 + r() * 7.2;
        pos[i * 3 + 1] = up ? 2.5 + r() * 1.9 : 0.4 + r() * 1.6;
        pos[i * 3 + 2] = 3.9 + r() * 2.5;
        seed[i] = r();
        continue;
      }
      pos[i * 3] = inBeam ? -0.2 + r() * 2.2 : 0.1 + r() * 1.0;
      pos[i * 3 + 1] = inBeam ? 0.4 + r() * 2.4 : 0.9 + r() * 0.7;
      pos[i * 3 + 2] = inBeam ? -3.2 + r() * 2.6 : -3.0 + r() * 0.7;
      seed[i] = r();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uSize: { value: 18 }, uAmount: { value: 0 } },
    });
    return { g, m };
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const dpr = state.gl.getPixelRatio();
    pixels.m.uniforms.uTime.value = t;
    pixels.m.uniforms.uAmount.value = anim.pix;
    pixels.m.uniforms.uSize.value = 34 * dpr;
    dust.m.uniforms.uTime.value = t;
    dust.m.uniforms.uAmount.value = anim.dust;
    dust.m.uniforms.uSize.value = 11 * dpr;
    // A layer at zero is skipped outright rather than drawn and discarded.
    if (pixRef.current) pixRef.current.visible = anim.pix > 0.002;
    if (dustRef.current) dustRef.current.visible = anim.dust > 0.002;
  });

  return (
    <group>
      <points ref={pixRef} geometry={pixels.g} material={pixels.m} frustumCulled={false} />
      <points ref={dustRef} geometry={dust.g} material={dust.m} frustumCulled={false} />
    </group>
  );
}
