import * as THREE from "three";
import { FullScreenQuad, Pass } from "three/examples/jsm/postprocessing/Pass.js";

/*
 * Ambient occlusion from the depth alone: the soft darkening where things
 * meet (under the desk, in the corners, round the chair's feet) that makes
 * them sit in the room instead of on it.
 *
 * Scalable ambient obscurance (McGuire, Mara and Luebke, 2012), worked at
 * half resolution with ten taps, then a 4x4 blur that stops at depth edges so
 * the dither of the taps is smoothed out without the shadow leaking from a
 * chair onto the wall behind it. The lens reads the result with one tap.
 */

const VERT = /* glsl */ `
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
`;

const DEPTH = /* glsl */ `
  uniform sampler2D tDepth;
  uniform float uNear;
  uniform float uFar;
  float depthAt(vec2 uv) {
    float z = texture(tDepth, uv).x * 2.0 - 1.0;
    return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear));
  }
`;

const AO_FRAG = /* glsl */ `
  precision highp float;
  ${DEPTH}
  uniform vec2 uTan;
  uniform vec2 uTexel;
  uniform float uPxPerM;
  uniform float uRadius;
  uniform float uBias;
  uniform float uIntensity;
  in vec2 vUv;
  out vec4 fragColor;
  vec3 viewPos(vec2 uv, float d) { return vec3((uv * 2.0 - 1.0) * uTan * d, -d); }
  void main() {
    float d = depthAt(vUv);
    vec3 P = viewPos(vUv, d);
    // The normal, from the neighbour on whichever side lies on the same
    // surface: across an edge (a beam's corner, a window bar) the other
    // side would tilt it, and the surface would shade itself in dashes.
    vec2 ox = vec2(uTexel.x, 0.0);
    vec2 oy = vec2(0.0, uTexel.y);
    vec3 pr = viewPos(vUv + ox, depthAt(vUv + ox));
    vec3 pl = viewPos(vUv - ox, depthAt(vUv - ox));
    vec3 pu = viewPos(vUv + oy, depthAt(vUv + oy));
    vec3 pd = viewPos(vUv - oy, depthAt(vUv - oy));
    vec3 dx = abs(pr.z - P.z) < abs(P.z - pl.z) ? pr - P : P - pl;
    vec3 dy = abs(pu.z - P.z) < abs(P.z - pd.z) ? pu - P : P - pd;
    vec3 N = normalize(cross(dx, dy));
    float ao = 1.0;
    float rpx = min(uRadius * uPxPerM / d, 40.0);
    if (d < 15.0 && rpx > 1.5) {
      float r2 = uRadius * uRadius;
      float fc = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
      float ang = fc * 6.2831;
      float sum = 0.0;
      for (int i = 0; i < 10; i++) {
        float r = rpx * (float(i) + fc) / 10.0 + 1.0;
        ang += 2.39996;
        vec2 tc = vUv + vec2(cos(ang), sin(ang)) * r * uTexel;
        vec3 v = viewPos(tc, depthAt(tc)) - P;
        float vv = dot(v, v);
        float f = max(r2 - vv, 0.0);
        // The bias grows with distance, where depth is coarser, so flat
        // surfaces seen edge-on (the ceiling beams) do not shade themselves.
        sum += f * f * f * max((dot(v, N) - uBias * d) / (vv + 0.01), 0.0);
      }
      ao = max(0.0, 1.0 - sum * uIntensity / (r2 * r2 * r2 * 10.0));
    }
    fragColor = vec4(ao, d, 0.0, 1.0);
  }
`;

const BLUR_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D tAo;
  uniform vec2 uTexel;
  in vec2 vUv;
  out vec4 fragColor;
  void main() {
    vec2 c = texture(tAo, vUv).rg;
    float sum = 0.0;
    float w = 0.0;
    for (int y = -2; y < 2; y++) {
      for (int x = -2; x < 2; x++) {
        vec2 s = texture(tAo, vUv + (vec2(float(x), float(y)) + 0.5) * uTexel).rg;
        float k = exp(-abs(s.g - c.g) / (c.g * 0.04));
        sum += s.r * k;
        w += k;
      }
    }
    fragColor = vec4(w > 0.0 ? sum / w : c.r, c.g, 0.0, 1.0);
  }
`;

export class OcclusionPass extends Pass {
  readonly result: THREE.WebGLRenderTarget;
  private raw: THREE.WebGLRenderTarget;
  readonly aoMat: THREE.RawShaderMaterial;
  private blurMat: THREE.RawShaderMaterial;
  private quad: FullScreenQuad;
  private camera: THREE.PerspectiveCamera;

  constructor(camera: THREE.PerspectiveCamera) {
    super();
    this.camera = camera;
    this.needsSwap = false;
    const opts = { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false };
    this.raw = new THREE.WebGLRenderTarget(1, 1, opts);
    // Read by the lens with one bilinear tap.
    this.result = new THREE.WebGLRenderTarget(1, 1, { ...opts, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.aoMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERT,
      fragmentShader: AO_FRAG,
      uniforms: {
        tDepth: { value: null },
        uNear: { value: 0.05 },
        uFar: { value: 60 },
        uTan: { value: new THREE.Vector2(1, 1) },
        uTexel: { value: new THREE.Vector2(1, 1) },
        uPxPerM: { value: 400 },
        uRadius: { value: 0.4 },
        uBias: { value: 0.004 },
        uIntensity: { value: 3 },
      },
    });
    this.blurMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERT,
      fragmentShader: BLUR_FRAG,
      uniforms: { tAo: { value: this.raw.texture }, uTexel: { value: new THREE.Vector2(1, 1) } },
    });
    this.quad = new FullScreenQuad(this.aoMat);
  }

  setSize(width: number, height: number) {
    const w = Math.max(1, Math.ceil(width / 2));
    const h = Math.max(1, Math.ceil(height / 2));
    this.raw.setSize(w, h);
    this.result.setSize(w, h);
    this.aoMat.uniforms.uTexel.value.set(1 / w, 1 / h);
    this.blurMat.uniforms.uTexel.value.set(1 / w, 1 / h);
  }

  render(renderer: THREE.WebGLRenderer, _write: THREE.WebGLRenderTarget, read: THREE.WebGLRenderTarget) {
    const u = this.aoMat.uniforms;
    const cam = this.camera;
    const tanY = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    u.tDepth.value = read.depthTexture;
    u.uNear.value = cam.near;
    u.uFar.value = cam.far;
    u.uTan.value.set(tanY * cam.aspect, tanY);
    u.uPxPerM.value = (0.5 * this.raw.height) / tanY;
    this.quad.material = this.aoMat;
    renderer.setRenderTarget(this.raw);
    this.quad.render(renderer);
    this.quad.material = this.blurMat;
    renderer.setRenderTarget(this.result);
    this.quad.render(renderer);
  }

  dispose() {
    this.raw.dispose();
    this.result.dispose();
    this.aoMat.dispose();
    this.blurMat.dispose();
    this.quad.dispose();
  }
}
