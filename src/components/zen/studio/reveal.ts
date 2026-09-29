import * as THREE from "three";

/*
 * The build-up.
 *
 * Every surface in the study is cut by two horizontal planes that sweep up the
 * room during the entrance:
 *
 *   uDraw  - blueprint lines exist below it. It rises first, so the room is
 *            drafted as line work from the floor up.
 *   uScan  - real materials exist below it, and lines vanish below it. It
 *            rises second, and a thin cobalt band rides on its edge, so the
 *            drawing is "printed" into wood, plaster and skin as it passes.
 *
 * Blueprint mode is the same machine run backwards: the scan drops to the
 * floor and the room is lines again. The uniforms are module-level and shared
 * by every patched material, so one write per frame drives the whole scene.
 */
export const revealUniforms = {
  uPfScan: { value: -0.5 },
  uPfDraw: { value: -0.5 },
  uPfBand: { value: new THREE.Color("#5f82ff") },
  /** How far each side of the building has dissolved, by CutSide index (0 is "none"). */
  uPfCut: { value: new Float32Array(6) },
};

/*
 * The cutaway. Orbiting the study from outside, whichever wall stands between
 * the camera and the room dissolves in a coarse dither, the way a dollhouse
 * is opened, so the building can be turned all the way round and never hides
 * what is inside it. Geometry says which side it belongs to with a per-vertex
 * attribute (0 means none), and one uniform per side drives every surface at
 * once: no per-wall materials, and no transparency to sort.
 */
export type CutSide = "back" | "left" | "right" | "front" | "top";
const CUT_INDEX: Record<CutSide, number> = { back: 1, left: 2, right: 3, front: 4, top: 5 };

export function tagCut<T extends THREE.BufferGeometry>(g: T, side: CutSide): T {
  const n = g.getAttribute("position").count;
  g.setAttribute("aPfCut", new THREE.BufferAttribute(new Float32Array(n).fill(CUT_INDEX[side]), 1));
  return g;
}

/** Eased so a wall dissolves over a fifth of a second, not in a pop. */
export function stepCutaway(goal: Record<CutSide, boolean>, dt: number) {
  const k = 1 - Math.exp(-dt * 9);
  const v = revealUniforms.uPfCut.value;
  for (const side of Object.keys(CUT_INDEX) as CutSide[]) {
    const i = CUT_INDEX[side];
    const to = goal[side] ? 1 : 0;
    v[i] += (to - v[i]) * k;
    if (Math.abs(to - v[i]) < 0.004) v[i] = to;
  }
}

/**
 * Closed until every shader has finished compiling in the background. Drawing
 * even one frame earlier makes the driver link each program synchronously on
 * first use, which froze the main thread for over ten seconds on an
 * integrated GPU. The loader covers the canvas while it is closed.
 */
export const renderGate = { open: false };

const VERT_HEAD = "varying float vPfY;\nattribute float aPfCut;\nvarying float vPfCut;\n";
const VERT_BODY = [
  "#include <project_vertex>",
  "  {",
  "    vec4 pfW = vec4(transformed, 1.0);",
  "    #ifdef USE_INSTANCING",
  "    pfW = instanceMatrix * pfW;",
  "    #endif",
  "    vPfY = (modelMatrix * pfW).y;",
  "    vPfCut = aPfCut;",
  "  }",
].join("\n");

const FRAG_HEAD = [
  "uniform float uPfScan;",
  "uniform float uPfDraw;",
  "uniform vec3 uPfBand;",
  "uniform float uPfCut[6];",
  "varying float vPfY;",
  "varying float vPfCut;",
  // 4 x 4 Bayer: an ordered dither, so a dissolving wall is halftone, not noise.
  "float pfBayer(vec2 p) {",
  "  ivec2 q = ivec2(mod(p, 4.0));",
  "  int i = q.x + q.y * 4;",
  "  const float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);",
  "  return (m[i] + 0.5) / 16.0;",
  "}",
  "",
].join("\n");

function injectVertex(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.vertexShader = VERT_HEAD + shader.vertexShader.replace("#include <project_vertex>", VERT_BODY);
}

/** Solid surfaces: visible below the scan line, with a glowing seam on it. */
export function patchSolid(mat: THREE.Material) {
  if (mat.userData.pfSolid) return;
  mat.userData.pfSolid = true;
  // A material may already carry its own shader change (the plants' wind);
  // this one runs after it, and its cache key extends the other's.
  const prev = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey();
  mat.onBeforeCompile = (shader, renderer) => {
    prev.call(mat, shader, renderer);
    Object.assign(shader.uniforms, revealUniforms);
    injectVertex(shader);
    shader.fragmentShader =
      FRAG_HEAD +
      shader.fragmentShader
        .replace(
          "void main() {",
          "void main() {\n  if (vPfY > uPfScan) discard;\n  { float pfK = uPfCut[int(vPfCut + 0.5)]; if (pfK > 0.0 && pfK > pfBayer(gl_FragCoord.xy)) discard; }",
        )
        .replace(
          "#include <dithering_fragment>",
          [
            "#include <dithering_fragment>",
            "  float pfSeam = 1.0 - smoothstep(0.0, 0.07, uPfScan - vPfY);",
            "  gl_FragColor.rgb += uPfBand * pfSeam * 3.0;",
          ].join("\n"),
        );
  };
  mat.customProgramCacheKey = () => `pf-solid|${prevKey}`;
  mat.needsUpdate = true;
}

/** Blueprint lines: visible between the scan line and the drafting line. */
export function patchLine(mat: THREE.Material) {
  if (mat.userData.pfLine) return;
  mat.userData.pfLine = true;
  const prev = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey();
  mat.onBeforeCompile = (shader, renderer) => {
    prev.call(mat, shader, renderer);
    Object.assign(shader.uniforms, revealUniforms);
    injectVertex(shader);
    shader.fragmentShader =
      FRAG_HEAD +
      shader.fragmentShader
        .replace("void main() {", "void main() {\n  if (vPfY < uPfScan || vPfY > uPfDraw) discard;")
        .replace(
          "#include <dithering_fragment>",
          [
            "#include <dithering_fragment>",
            "  float pfTip = 1.0 - smoothstep(0.0, 0.18, uPfDraw - vPfY);",
            "  gl_FragColor.rgb += uPfBand * pfTip * 2.0;",
            "  gl_FragColor.a = min(1.0, gl_FragColor.a + pfTip);",
          ].join("\n"),
        );
  };
  mat.customProgramCacheKey = () => `pf-line|${prevKey}`;
  mat.needsUpdate = true;
}

export const edgeMaterial = new THREE.LineBasicMaterial({
  color: new THREE.Color("#c9d5ff"),
  transparent: true,
  opacity: 0.5,
  depthWrite: false,
});
patchLine(edgeMaterial);

export const wireMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color("#c9d5ff"),
  wireframe: true,
  transparent: true,
  opacity: 0.22,
  depthWrite: false,
});
patchLine(wireMaterial);

const noRaycast = () => undefined;

/**
 * Walk a finished subtree once: shadows on, every material patched, and a
 * blueprint twin for everything.
 *
 * The furniture ships with its blueprint baked in: the asset pipeline adds
 * each model's feature edges (30 degree crease) as a LINES primitive named
 * `pf_edges`, so no edge detection runs in the browser. Here those lines just
 * get the shared line material. Procedural room geometry, flagged with
 * `userData.pfEdges` on an ancestor, is cheap enough to edge at runtime. The
 * student is skinned, so her twin is a wireframe that shares her skeleton.
 * Safe to call again on the same cached glTF scene: the flags make it a no-op.
 */
export function prepareForReveal(root: THREE.Object3D) {
  const walk = (o: THREE.Object3D, edgesHere: boolean) => {
    const edges = edgesHere || !!o.userData.pfEdges;
    const line = o as THREE.LineSegments;
    if (line.isLine) {
      const m = line.material as THREE.Material;
      if (!o.userData.pfTwin && (m.name === "pf_edges" || o.name.endsWith("_pfedges"))) {
        line.material = edgeMaterial;
        line.raycast = noRaycast;
        o.userData.pfTwin = true;
      }
    } else if ((o as THREE.Mesh).isMesh && !o.userData.pfTwin && !o.userData.pfSkip) {
      prepareMesh(o as THREE.Mesh, edges);
    }
    // Copy: prepareMesh may add children while we walk.
    for (const c of o.children.slice()) walk(c, edges);
  };
  walk(root, false);
}

/**
 * Glass that transmits (the hanging lamp's shade, the clock's cover) makes
 * three render the entire room a second time, every frame, into a texture
 * for the glass to refract. Measured, that second pass was nearly half of
 * each frame. Plain alpha glass looks the same at this size and costs nothing.
 */
function flattenGlass(m: THREE.Material) {
  const p = m as THREE.MeshPhysicalMaterial;
  if (!p.isMeshPhysicalMaterial || !(p.transmission > 0)) return;
  p.transmission = 0;
  p.transparent = true;
  p.opacity = Math.min(p.opacity, 0.3);
  p.depthWrite = false;
  p.needsUpdate = true;
}

function prepareMesh(mesh: THREE.Mesh, runtimeEdges: boolean) {
  mesh.castShadow = !mesh.userData.pfNoCast;
  mesh.receiveShadow = true;
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const m of mats) {
    flattenGlass(m);
    patchSolid(m);
  }
  if (mesh.userData.pfHasTwin || mesh.userData.pfNoTwin) return;
  if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
    mesh.userData.pfHasTwin = true;
    const src = mesh as THREE.SkinnedMesh;
    const twin = new THREE.SkinnedMesh(src.geometry, wireMaterial);
    twin.bind(src.skeleton, src.bindMatrix);
    twin.position.copy(src.position);
    twin.quaternion.copy(src.quaternion);
    twin.scale.copy(src.scale);
    twin.userData.pfTwin = true;
    twin.raycast = noRaycast;
    twin.frustumCulled = false;
    src.parent?.add(twin);
  } else if (runtimeEdges) {
    mesh.userData.pfHasTwin = true;
    const lines = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30), edgeMaterial);
    lines.userData.pfTwin = true;
    lines.raycast = noRaycast;
    mesh.add(lines);
  }
}
