import { useEffect, useRef, type RefObject } from "react";
import { Renderer, Program, Mesh, Triangle, Color } from "ogl";
import { inView } from "framer-motion";

const PAD = 20;

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2 uCenter;
uniform vec2 uHalfSize;
uniform float uRadius;
uniform float uAngle;
uniform float uPx;
uniform vec3 uLineColor;
uniform vec3 uBaseColor;
uniform float uIntensity;
uniform float uShineSize;
uniform float uShineFade;
uniform float uThickness;
uniform float uBaseWidth;

out vec4 fragColor;

float sdRoundedRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float shapeSDF(vec2 p) { return sdRoundedRect(p, uHalfSize, uRadius); }

float gaussianLine(float d, float sigma) {
  float x = d / (sigma + 1e-6);
  float k = mix(1.0, 1.6, smoothstep(0.0, 1.5, x));
  return exp(-k * x * x);
}

void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  float d = shapeSDF(p);
  vec2 L = vec2(cos(uAngle), sin(uAngle));

  // Dark base stroke hugging the edge for a sense of thickness
  float base = (1.0 - smoothstep(0.0, uBaseWidth, abs(d))) * 0.45;

  // Symmetric specular: the edges facing toward/away from the light both
  // catch a streak. The angular window (size + fade) is measured with an
  // elliptical normal so it varies continuously along straight edges.
  vec2 nEll = normalize(p / (uHalfSize * uHalfSize) + 1e-6);
  float phi = acos(clamp(abs(dot(nEll, L)), 0.0, 1.0));
  float rim = 1.0 - smoothstep(uShineSize - uShineFade, uShineSize + uShineFade + 1e-4, phi);
  float line = gaussianLine(d, uThickness);
  float edgeClamp = 1.0 - smoothstep(0.5 * uPx, 3.0 * uPx, abs(d));
  float hi = line * rim * edgeClamp * uIntensity;

  vec3 col = uBaseColor * base + uLineColor * hi;
  float a = clamp(base + hi, 0.0, 1.0);
  fragColor = vec4(col, a);
}
`;

export interface SpecularEffectProps {
  radius: number;
  lineColor: string;
  baseColor: string;
  intensity: number;
  shineSize: number;
  shineFade: number;
  thickness: number;
  speed: number;
  followMouse: boolean;
  proximity: number;
  autoAnimate: boolean;
}

/**
 * Drives the WebGL edge-shine effect shared by every SpecularButton variant.
 * `hostRef` is the element the shine tracks (for sizing + proximity); `fxRef`
 * is the container the canvas is mounted into.
 */
export function useSpecularEffect(
  hostRef: RefObject<HTMLElement>,
  fxRef: RefObject<HTMLElement>,
  props: SpecularEffectProps
) {
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const host = hostRef.current;
    const fx = fxRef.current;
    if (!host || !fx) return;

    const dpr = window.devicePixelRatio || 1;
    let renderer: Renderer;
    try {
      renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: true, dpr });
      if (!renderer.gl) throw new Error("WebGL context unavailable");
    } catch {
      // No WebGL (disabled, blocklisted GPU, privacy-hardened browser, etc).
      // Degrade to a plain button/link instead of crashing the page.
      return;
    }
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const geometry = new Triangle(gl);
    if (geometry.attributes.uv) delete geometry.attributes.uv;

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uCenter: { value: [0, 0] },
        uHalfSize: { value: [1, 1] },
        uRadius: { value: 0 },
        uAngle: { value: 2.4 },
        uPx: { value: dpr },
        uLineColor: { value: [1, 1, 1] },
        uBaseColor: { value: [0.32, 0.32, 0.32] },
        uIntensity: { value: 1 },
        uShineSize: { value: 0.17 },
        uShineFade: { value: 0.7 },
        uThickness: { value: 1 },
        uBaseWidth: { value: dpr },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    fx.appendChild(gl.canvas);

    const sizeRef = { w: 1, h: 1 };
    const resize = () => {
      // Fractional size + explicit center keep the SDF pinned to the exact
      // CSS border, instead of drifting up to a pixel from offsetWidth rounding.
      const rect = host.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      sizeRef.w = w;
      sizeRef.h = h;
      renderer.setSize(w + PAD * 2, h + PAD * 2);
      program.uniforms.uCenter.value = [(PAD + w / 2) * dpr, (PAD + h / 2) * dpr];
      program.uniforms.uHalfSize.value = [(w / 2) * dpr, (h / 2) * dpr];
    };
    // The uniforms this recomputes are only visible once something draws them,
    // and on a static device nothing ever will unless it is asked to.
    const ro = new ResizeObserver(() => {
      resize();
      drawAfterResize();
    });
    ro.observe(host);
    resize();

    // Light angle steers toward the pointer (anywhere on the page) and falls
    // back to a slow sweep when the pointer hasn't moved yet.
    let pointerAngle: number | null = null;
    let proximityT = 0;
    const onPointerMove = (e: PointerEvent) => {
      // Any pointer activity can change the picture again, so this is also the
      // wake-up for a loop that suspended itself as settled.
      wake();
      const rect = host.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right);
      const dy = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom);
      const dist = Math.hypot(dx, dy);
      // Over the button itself the light settles on the diagonal (framing the
      // corners) and gently sways with the cursor position within the button.
      if (dist === 0) {
        const nx = (e.clientX - cx) / (rect.width / 2);
        const ny = (cy - e.clientY) / (rect.height / 2);
        pointerAngle = Math.atan2(2 / rect.height, -2 / rect.width) + nx * 0.3 + ny * 0.15;
      } else {
        pointerAngle = Math.atan2(cy - e.clientY, e.clientX - cx);
      }
      const t = Math.max(0, 1 - dist / Math.max(propsRef.current.proximity, 1));
      proximityT = t * t * (3 - 2 * t);
    };

    let angle = 2.4;
    let idleAngle = 2.4;
    let bright = 0;
    let last = performance.now();
    let raf = 0;

    const lineC = new Color();
    const baseC = new Color();

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /*
     * Whether this device can ever produce the thing the loop exists to
     * animate.
     *
     * The moving part of this shader is `hi`, and `hi` is multiplied by
     * `uIntensity = intensity * bright`. With the default `autoAnimate: false`,
     * `bright` tracks pointer proximity and nothing else — so on a touch
     * device it is pinned at 0 for the entire life of the page and the only
     * thing the fragment shader ever emits is `base`, a static dark stroke
     * hugging the rounded rect that does not depend on `uAngle` at all.
     *
     * Which means that on every phone and tablet, each of these was rendering
     * a byte-identical frame sixty times a second, for as long as it was on
     * screen, in its own WebGL context — and the landing page mounts four of
     * them. That is the shape of workload Lighthouse reports as blocking time,
     * and it bought a visual difference of exactly zero pixels.
     */
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    /**
     * Nothing here can move the light, so one frame is the whole job.
     *
     * Read as a function rather than captured as a boolean because
     * `autoAnimate` is a prop: it sweeps on a timer with no pointer involved,
     * so a caller that turns it on must still animate on a touch device. No
     * caller sets it today, and a frozen button on every phone is exactly the
     * kind of thing that would not be noticed until one did.
     */
    const isStatic = () =>
      prefersReducedMotion || (!canHover && !propsRef.current.autoAnimate);

    let onScreen = false;

    const draw = (dt: number) => {
      const p = propsRef.current;

      idleAngle += p.speed * dt;
      const steer = p.followMouse && pointerAngle != null && (!p.autoAnimate || proximityT > 0);
      const target = steer ? pointerAngle : idleAngle;
      const diff = ((target - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      angle += diff * (1 - Math.exp(-dt * 7));

      // Shine fades in with pointer proximity unless autoAnimate keeps it on
      const brightTarget = p.autoAnimate ? 1 : proximityT;
      bright += (brightTarget - bright) * (1 - Math.exp(-dt * 8));

      lineC.set(p.lineColor);
      baseC.set(p.baseColor);
      program.uniforms.uAngle.value = angle;
      program.uniforms.uRadius.value = Math.min(p.radius, Math.min(sizeRef.w, sizeRef.h) / 2) * dpr;
      program.uniforms.uLineColor.value = [lineC.r, lineC.g, lineC.b];
      program.uniforms.uBaseColor.value = [baseC.r, baseC.g, baseC.b];
      program.uniforms.uIntensity.value = p.intensity * bright;
      program.uniforms.uShineSize.value = (p.shineSize * Math.PI) / 180;
      program.uniforms.uShineFade.value = (p.shineFade * Math.PI) / 180;
      program.uniforms.uThickness.value = p.thickness * dpr;
      renderer.render({ scene: mesh });
    };

    /**
     * Has this reached a state where the next frame would be identical?
     *
     * `autoAnimate` sweeps forever by definition, so it is never settled.
     * Otherwise the shine is invisible once `bright` has decayed to nothing and
     * the pointer is outside `proximity` — `idleAngle` keeps advancing
     * underneath, but it is multiplied by an intensity of zero, so no pixel it
     * touches changes. The threshold is well below one 8-bit level of alpha.
     */
    const settled = () =>
      !propsRef.current.autoAnimate && proximityT === 0 && bright < 0.002;

    const update = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      draw(dt);
      // Scheduled at the foot rather than the head of the frame, which is what
      // lets the loop decline to book another one.
      raf = settled() ? 0 : requestAnimationFrame(update);
    };

    /** One frame, right now, outside the loop. */
    const renderOnce = () => {
      last = performance.now();
      draw(0);
    };

    // Off-screen buttons (e.g. a CTA below the fold) shouldn't keep a WebGL
    // scene rendering at 60fps for as long as they're mounted.
    const startLoop = () => {
      if (raf) return;
      if (isStatic()) {
        renderOnce();
        return;
      }
      last = performance.now();
      raf = requestAnimationFrame(update);
    };
    const stopLoop = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    /** Restart a loop that suspended itself, but only if it is worth drawing. */
    function wake() {
      if (isStatic() || raf || !onScreen) return;
      last = performance.now();
      raf = requestAnimationFrame(update);
    }

    // A pointermove listener per instance, on the window, is not free either —
    // and on a touch device it can only ever report a tap. Registered solely
    // where the value it feeds can actually be seen.
    if (canHover) window.addEventListener("pointermove", onPointerMove);

    // Keep the static frame correct across a resize or an orientation change,
    // since there is no loop to redraw it.
    // A function declaration, not a const: the ResizeObserver above is created
    // before this point in the effect body and delivers its first callback
    // asynchronously, so hoisting is what keeps that first delivery safe no
    // matter how the surrounding order is edited later.
    function drawAfterResize() {
      if (isStatic() && onScreen) renderOnce();
      else wake();
    }

    const stopInView = inView(host, () => {
      onScreen = true;
      startLoop();
      return () => {
        onScreen = false;
        stopLoop();
      };
    }, { margin: "100px" });

    return () => {
      stopLoop();
      stopInView();
      ro.disconnect();
      if (canHover) window.removeEventListener("pointermove", onPointerMove);
      if (gl.canvas.parentNode === fx) fx.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
