import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { renderGate } from "./reveal";
import type { Anim } from "./anim";

/*
 * The lens: HDR render, bloom so the neon, the bulbs and the scan seam
 * actually glow, then one last pass that does the tone mapping, a light
 * colour grade, the vignette and film grain, so the frame reads as
 * photographed rather than rendered. Built from three's own passes, so it
 * adds no dependency.
 *
 * Quality adapts to the machine. The study was built on a desktop GPU and ran
 * at about 20 fps on an integrated one, which is what "not smooth" meant. It
 * starts from a guess made from the GPU's name, then the frame rate is
 * measured once the room is up and resolution and MSAA step down until it
 * holds. A step that does not help is undone and the monitor stops; it never
 * probes upward, since every change resizes the canvas, which is itself a
 * long frame.
 */

const FinishShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    toneMappingExposure: { value: 1.3 },
    uTime: { value: 0 },
    uGrain: { value: 0.04 },
    uVignette: { value: 0.9 },
  },
  // Raw, like three's own OutputShader: the tone mapping and colour space
  // chunks are included here, not by the renderer's prefix.
  vertexShader: /* glsl */ `
    precision highp float;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    attribute vec3 position;
    attribute vec2 uv;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    #include <tonemapping_pars_fragment>
    #include <colorspace_pars_fragment>
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrain;
    uniform float uVignette;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      c.rgb = ACESFilmicToneMapping(c.rgb);
      vec2 d = vUv - 0.5;
      float v = smoothstep(0.85, 0.2, length(d) * uVignette);
      c.rgb *= mix(0.55, 1.0, v);
      c = sRGBTransferOETF(c);
      // Grade, in display space: shadows lean a touch toward the room's
      // cobalt and highlights stay warm, the way a night interior
      // photographs on daylight film.
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb += vec3(-0.004, 0.0, 0.012) * (1.0 - smoothstep(0.0, 0.3, l));
      c.rgb += vec3(0.012, 0.004, -0.01) * smoothstep(0.5, 1.0, l);
      float g = hash(vUv * vec2(1920.0, 1080.0) + fract(uTime) * 100.0) - 0.5;
      c.rgb += g * uGrain;
      gl_FragColor = c;
    }
  `,
};

type Level = { dpr: number; samples: number };

/** Cheapest first. The top level only differs from the one below it on a high-DPI screen. */
const LEVELS: Level[] = [
  { dpr: 0.7, samples: 0 },
  { dpr: 0.85, samples: 0 },
  { dpr: 1, samples: 0 },
  { dpr: 1, samples: 4 },
  { dpr: 1.5, samples: 4 },
];

/** Integrated and mobile GPUs start without MSAA; everything else with it. */
function startLevel(gl: THREE.WebGLRenderer, lowPower: boolean) {
  let name = "";
  try {
    const ctx = gl.getContext();
    const ext = ctx.getExtension("WEBGL_debug_renderer_info");
    name = String(ext ? ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ctx.getParameter(ctx.RENDERER));
  } catch {
    /* unknown GPU: assume a capable one and let the monitor step down */
  }
  const weak = /intel|mali|adreno|powervr|swiftshader|llvmpipe|videocore/i.test(name);
  return weak || lowPower ? 2 : 4;
}

export function Effects({ bloom = 0.62, anim, lowPower }: { bloom?: number; anim: Anim; lowPower: boolean }) {
  const { gl, scene, camera, size } = useThree();
  const dpr = useThree((s) => s.viewport.dpr);
  const setDpr = useThree((s) => s.setDpr);

  const { composer, bloomPass, finish } = useMemo(() => {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 0 });
    const c = new EffectComposer(gl, rt);
    c.addPass(new RenderPass(scene, camera));
    const b = new UnrealBloomPass(new THREE.Vector2(256, 256), bloom, 0.55, 0.92);
    // Bloom at a quarter of the frame instead of half: a quarter of the
    // pixels, and the glow it makes is soft anyway.
    const setBloomSize = b.setSize.bind(b);
    b.setSize = (w: number, h: number) => setBloomSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
    c.addPass(b);
    const f = new ShaderPass(
      new THREE.RawShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(FinishShader.uniforms),
        vertexShader: FinishShader.vertexShader,
        fragmentShader: FinishShader.fragmentShader,
      }),
    );
    c.addPass(f);
    return { composer: c, bloomPass: b, finish: f };
    // The composer is rebuilt only if the renderer or scene change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);

  useEffect(() => {
    // A parked (display: none) canvas measures 0 x 0; keep the last size.
    if (!size.width || !size.height) return;
    composer.setPixelRatio(dpr);
    composer.setSize(size.width, size.height);
  }, [composer, dpr, size.width, size.height]);

  useEffect(() => {
    bloomPass.strength = bloom;
  }, [bloomPass, bloom]);

  useEffect(() => () => composer.dispose(), [composer]);

  /* ---- adaptive quality ---- */

  // `before` is the frame rate measured just before a step down, so the next
  // window can tell whether the step helped. `done` stops the monitor.
  const q = useRef({ level: -1, t: 0, n: 0, before: 0, done: false });

  const apply = (level: number) => {
    q.current.level = level;
    const L = LEVELS[level];
    for (const target of [composer.renderTarget1, composer.renderTarget2]) {
      if (target.samples !== L.samples) {
        target.samples = L.samples;
        target.dispose();
      }
    }
    gl.domElement.dataset.zenQuality = String(level);
    setDpr(Math.min(L.dpr, Math.max(1, window.devicePixelRatio || 1)));
  };

  useEffect(() => {
    const top = (window.devicePixelRatio || 1) > 1.2 ? 4 : 3;
    apply(Math.min(top, startLevel(gl, lowPower)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, lowPower]);

  useFrame((state, delta) => {
    if (!renderGate.open) return;
    finish.uniforms.uTime.value = state.clock.elapsedTime;
    finish.uniforms.toneMappingExposure.value = gl.toneMappingExposure;
    composer.render(delta);

    // Measure only a settled room: the entrance and camera moves are not
    // representative, and a long frame (tab switch, GC) is thrown away.
    const s = q.current;
    if (anim.cam < 1 || delta > 0.25) {
      s.t = 0;
      s.n = 0;
      return;
    }
    s.t += delta;
    s.n++;
    if (s.t < 1.5) return;
    const fps = s.n / s.t;
    s.t = 0;
    s.n = 0;
    if (s.done) return;
    if (s.before) {
      // A step down that did not buy at least a tenth more frames means the
      // time is going somewhere resolution does not reach (the CPU); take
      // the sharper picture back and stop.
      if (fps < s.before * 1.1) {
        s.done = true;
        apply(s.level + 1);
        return;
      }
      s.before = 0;
    }
    if (fps < 50 && s.level > 0) {
      s.before = fps;
      apply(s.level - 1);
    }
  }, 1);

  return null;
}
