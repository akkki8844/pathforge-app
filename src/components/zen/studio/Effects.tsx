import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { renderGate } from "./reveal";
import { OcclusionPass } from "./occlusion";
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
    tDepth: { value: null as THREE.Texture | null },
    toneMappingExposure: { value: 1.3 },
    uTime: { value: 0 },
    uGrain: { value: 0.04 },
    uVignette: { value: 0.9 },
    uDay: { value: 0 },
    uTexel: { value: new THREE.Vector2(1, 1) },
    uNear: { value: 0.05 },
    uFar: { value: 60 },
    uFocus: { value: 2 },
    uAperture: { value: 10 },
    uDof: { value: 0 },
    uFxaa: { value: 1 },
    tAo: { value: null as THREE.Texture | null },
    uAo: { value: 0 },
  },
  // Raw, like three's own OutputShader: the tone mapping and colour space
  // chunks are included here, not by the renderer's prefix.
  vertexShader: /* glsl */ `
    precision highp float;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    in vec3 position;
    in vec2 uv;
    out vec2 vUv;
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
    uniform sampler2D tDepth;
    uniform float uTime;
    uniform float uGrain;
    uniform float uVignette;
    uniform float uDay;
    uniform vec2 uTexel;
    uniform float uNear;
    uniform float uFar;
    uniform float uFocus;
    uniform float uAperture;
    uniform float uDof;
    uniform float uFxaa;
    uniform sampler2D tAo;
    uniform float uAo;
    in vec2 vUv;
    out vec4 fragColor;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    vec3 tap(vec2 uv) { return texture(tDiffuse, uv).rgb; }
    // Luma of an HDR colour, compressed the way the tone curve will, so the
    // edge search sees contrast as it will look rather than as it is stored.
    float luma(vec3 c) { float l = dot(c, vec3(0.299, 0.587, 0.114)); return l / (1.0 + l); }

    // FXAA, the small nine-tap form. Only used without MSAA: the room's
    // straight edges (window bars, shelves, the desk) stair-step badly at
    // the resolutions integrated GPUs can afford.
    vec3 fxaa(vec2 uv, vec3 m) {
      vec3 nw = tap(uv + vec2(-1.0, -1.0) * uTexel);
      vec3 ne = tap(uv + vec2(1.0, -1.0) * uTexel);
      vec3 sw = tap(uv + vec2(-1.0, 1.0) * uTexel);
      vec3 se = tap(uv + vec2(1.0, 1.0) * uTexel);
      float lNW = luma(nw);
      float lNE = luma(ne);
      float lSW = luma(sw);
      float lSE = luma(se);
      float lM = luma(m);
      float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
      float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
      if (lMax - lMin < max(0.03, lMax * 0.12)) return m;
      vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
      float reduce = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0);
      float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + reduce);
      dir = clamp(dir * rcp, vec2(-8.0), vec2(8.0)) * uTexel;
      vec3 a = 0.5 * (tap(uv + dir * (1.0 / 3.0 - 0.5)) + tap(uv + dir * (2.0 / 3.0 - 0.5)));
      vec3 b = a * 0.5 + 0.25 * (tap(uv - dir * 0.5) + tap(uv + dir * 0.5));
      float lB = luma(b);
      return (lB < lMin || lB > lMax) ? a : b;
    }

    float depthAt(vec2 uv) {
      float z = texture(tDepth, uv).x * 2.0 - 1.0;
      return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear));
    }
    // Blur radius in pixels for a surface this far away. A band around the
    // focus stays sharp, so the whole object in a close-up holds, not just
    // the point the camera aims at.
    float coc(float d) {
      float band = uFocus * 0.2;
      return min(max(abs(d - uFocus) - band, 0.0) / d * uAperture, 11.0) * uDof;
    }

    // Depth of field for the close-ups: a gather over a golden-angle disc,
    // after Dennis Gustafsson's single-pass bokeh. Something behind the
    // focus may not blur over the sharp thing in front of it.
    vec3 bokeh(vec2 uv, vec3 base, float cd, float cs) {
      vec3 acc = base;
      float tot = 1.0;
      float ang = hash(uv * 911.0) * 6.2831;
      for (int i = 0; i < 12; i++) {
        float fi = float(i);
        float r = cs * sqrt((fi + 0.5) / 12.0);
        ang += 2.39996;
        vec2 tc = uv + vec2(cos(ang), sin(ang)) * r * uTexel;
        vec3 sc = tap(tc);
        float sd = depthAt(tc);
        float ss = coc(sd);
        if (sd > cd) ss = min(ss, cs * 2.0);
        float m = smoothstep(r - 0.5, r + 0.5, ss);
        acc += mix(acc / tot, sc, m);
        tot += 1.0;
      }
      return acc / tot;
    }

    void main() {
      vec4 c = texture(tDiffuse, vUv);
      float cs = 0.0;
      float cd = 0.0;
      if (uDof > 0.001) {
        cd = depthAt(vUv);
        cs = coc(cd);
      }
      float ao = uAo > 0.001 ? texture(tAo, vUv).r : 1.0;
      if (cs > 0.6) c.rgb = bokeh(vUv, c.rgb, cd, cs);
      else if (uFxaa > 0.5) c.rgb = fxaa(vUv, c.rgb);
      c.rgb *= mix(1.0, ao, uAo);
      c.rgb = ACESFilmicToneMapping(c.rgb);
      vec2 d = vUv - 0.5;
      float v = smoothstep(0.85, 0.2, length(d) * uVignette);
      // By day the corners only settle a little; at night they fall away.
      c.rgb *= mix(mix(0.55, 0.88, uDay), 1.0, v);
      c = sRGBTransferOETF(c);
      // Grade, in display space. At night shadows lean toward blue and
      // highlights stay warm, the way a night interior photographs on
      // daylight film; by day the shadows lift toward the brand's blue-grey
      // and the whites stay clean.
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb += mix(vec3(-0.004, 0.0, 0.012), vec3(0.0, 0.006, 0.02), uDay) * (1.0 - smoothstep(0.0, 0.3, l));
      c.rgb += mix(vec3(0.012, 0.004, -0.01), vec3(0.004, 0.002, -0.002), uDay) * smoothstep(0.5, 1.0, l);
      float g = hash(vUv * vec2(1920.0, 1080.0) + fract(uTime) * 100.0) - 0.5;
      c.rgb += g * uGrain * (1.0 - uDay * 0.5);
      fragColor = c;
    }
  `,
};

type Level = { dpr: number; samples: number; ao: boolean };

/**
 * Cheapest first. `dpr` is a fraction of the screen's own pixel density, so
 * 1 is one rendered pixel per physical pixel: anything less is upscaled by
 * the browser and reads as blur, which is what a fixed 1 did on every laptop
 * scaled to 125 or 150 percent. The occlusion is the first thing given up,
 * before any sharpness: a softer room reads worse than one with lighter
 * corners.
 */
const LEVELS: Level[] = [
  { dpr: 0.6, samples: 0, ao: false },
  { dpr: 0.75, samples: 0, ao: false },
  { dpr: 0.9, samples: 0, ao: false },
  { dpr: 1, samples: 0, ao: false },
  { dpr: 1, samples: 0, ao: true },
  { dpr: 1, samples: 4, ao: true },
];

/** Most pixel density worth rendering: past this the eye gains nothing. */
const MAX_DENSITY = 1.75;
const nativeDensity = () => Math.min(MAX_DENSITY, Math.max(1, window.devicePixelRatio || 1));

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
  return weak || lowPower ? 4 : 5;
}

export function Effects({ bloom = 0.62, anim, lowPower }: { bloom?: number; anim: Anim; lowPower: boolean }) {
  const { gl, scene, camera, size } = useThree();
  const dpr = useThree((s) => s.viewport.dpr);
  const setDpr = useThree((s) => s.setDpr);

  const { composer, bloomPass, finish, occlusion } = useMemo(() => {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 0 });
    // The scene's depth, kept as a texture for the close-ups' depth of field.
    // It comes free with the render; nothing is drawn twice.
    rt.depthTexture = new THREE.DepthTexture(1, 1);
    const c = new EffectComposer(gl, rt);
    c.addPass(new RenderPass(scene, camera));
    const o = new OcclusionPass(camera as THREE.PerspectiveCamera);
    c.addPass(o);
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
        glslVersion: THREE.GLSL3,
      }),
    );
    // No swap after the last pass, so the scene is always drawn into the
    // same target and its depth texture is the one the lens reads.
    f.needsSwap = false;
    c.addPass(f);
    return { composer: c, bloomPass: b, finish: f, occlusion: o };
    // The composer is rebuilt only if the renderer or scene change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);

  useEffect(() => {
    // A parked (display: none) canvas measures 0 x 0; keep the last size.
    if (!size.width || !size.height) return;
    composer.setPixelRatio(dpr);
    composer.setSize(size.width, size.height);
  }, [composer, dpr, size.width, size.height]);

  useEffect(
    () => () => {
      composer.dispose();
      occlusion.dispose();
    },
    [composer, occlusion],
  );

  /* ---- adaptive quality ---- */

  // `before` is the frame rate measured just before a step down, so the next
  // window can tell whether the step helped. `done` stops the monitor.
  const q = useRef({ level: -1, t: 0, d: [] as number[], before: 0, done: false });

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
    setDpr(Math.max(0.5, L.dpr * nativeDensity()));
  };

  useEffect(() => {
    apply(startLevel(gl, lowPower));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, lowPower]);

  useFrame((state, delta) => {
    if (!renderGate.open) return;
    finish.uniforms.uTime.value = state.clock.elapsedTime;
    // Daylight is brighter at the source; the lens stops down for it.
    finish.uniforms.toneMappingExposure.value = gl.toneMappingExposure * (1 - anim.day * 0.18);
    finish.uniforms.uDay.value = anim.day;
    const u = finish.uniforms;
    const src = composer.readBuffer;
    u.tDepth.value = src.depthTexture;
    u.uTexel.value.set(1 / Math.max(1, src.width), 1 / Math.max(1, src.height));
    const cam = camera as THREE.PerspectiveCamera;
    u.uNear.value = cam.near;
    u.uFar.value = cam.far;
    u.uFocus.value = anim.focus;
    // The blur scales with the frame, so it reads the same at any size.
    u.uAperture.value = src.height * 0.014;
    // A machine already below full resolution skips it: the blur's taps
    // cost most exactly where it cannot afford them.
    u.uDof.value = lowPower || q.current.level < 2 ? 0 : anim.dof;
    u.uFxaa.value = src.samples > 0 ? 0 : 1;
    // Less by night, where the dark already sits in the corners.
    u.uAo.value = lowPower || !LEVELS[Math.max(0, q.current.level)].ao ? 0 : 0.45 + anim.day * 0.25;
    u.tAo.value = occlusion.result.texture;
    occlusion.enabled = u.uAo.value > 0;
    bloomPass.strength = bloom * (1 - anim.day * 0.65);
    composer.render(delta);

    // Measure only a settled room: the entrance, camera moves and a dusk or
    // dawn (which rebakes the reflections) are not representative, and a
    // long frame (tab switch, GC) is thrown away.
    const s = q.current;
    const dusk = anim.day > 0.001 && anim.day < 0.999;
    if (!anim.settled || dusk || delta > 0.25) {
      s.t = 0;
      s.d.length = 0;
      return;
    }
    s.t += delta;
    s.d.push(delta);
    if (s.t < 1.5) return;
    // The slowest tenth of the frames is left out: one hitch (a canvas
    // repainting, a font arriving) must not cost the whole visit its
    // sharpness. A room that is simply too heavy is slow in every frame.
    s.d.sort((a, b) => a - b);
    const kept = s.d.slice(0, Math.max(1, Math.floor(s.d.length * 0.9)));
    const fps = kept.length / kept.reduce((a, b) => a + b, 0);
    s.t = 0;
    s.d.length = 0;
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
    if (fps < 46 && s.level > 0) {
      // Giving up the occlusion alone is a small saving, too small to pass
      // the test above; it is kept off and the next window judges the
      // steps that cost sharpness.
      const a = LEVELS[s.level];
      const b = LEVELS[s.level - 1];
      s.before = a.dpr === b.dpr && a.samples === b.samples ? 0 : fps;
      apply(s.level - 1);
    }
  }, 1);

  return null;
}
