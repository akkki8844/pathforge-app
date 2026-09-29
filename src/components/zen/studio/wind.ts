import * as THREE from "three";

/*
 * Wind in the leaves. One time uniform for every patched material; each leaf
 * sways from where it grows, more at the tip than at the root, with two
 * frequencies out of step so it never repeats too neatly, and a slow gust on
 * top. A vertex-only effect, so it costs nothing per pixel.
 */
export const wind = {
  uWindTime: { value: 0 },
  uWindAmp: { value: 1 },
};

export function patchWind(mat: THREE.Material, root = 0.0, reach = 0.5, amount = 0.02) {
  if (mat.userData.pfWind) return;
  mat.userData.pfWind = true;
  const prev = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey();
  mat.onBeforeCompile = (shader, renderer) => {
    prev.call(mat, shader, renderer);
    Object.assign(shader.uniforms, wind);
    shader.vertexShader =
      "uniform float uWindTime;\nuniform float uWindAmp;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        [
          "#include <begin_vertex>",
          `  float pfG = clamp((position.y - ${root.toFixed(3)}) / ${reach.toFixed(3)}, 0.0, 1.0);`,
          "  pfG *= pfG;",
          "  float pfPh = position.x * 9.0 + position.z * 7.0;",
          "  float pfGust = 0.65 + 0.35 * sin(uWindTime * 0.37);",
          `  transformed.x += (sin(uWindTime * 1.7 + pfPh) * 0.6 + sin(uWindTime * 2.9 + pfPh * 1.7) * 0.4) * pfG * ${amount.toFixed(4)} * uWindAmp * pfGust;`,
          `  transformed.z += sin(uWindTime * 1.3 + pfPh * 1.3 + 1.7) * pfG * ${(amount * 0.6).toFixed(4)} * uWindAmp * pfGust;`,
        ].join("\n"),
      );
  };
  mat.customProgramCacheKey = () => `wind-${root}-${reach}-${amount}|${prevKey}`;
  mat.needsUpdate = true;
}
