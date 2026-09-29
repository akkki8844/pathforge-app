import { memo, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PLACE, ROOM } from "./stage";
import { makeCanvasTexture, paintNeon, paintSky, rand } from "./canvases";
import type { Anim } from "./anim";
import { edgeMaterial } from "./reveal";

const TEX = "/zen/tex/";

/**
 * A box whose UVs come from world position (half a texture tile per metre),
 * so plaster and wood keep one scale across walls of any size once merged.
 */
function worldBox(w: number, h: number, d: number, x: number, y: number, z: number, tile = 0.5) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);
    if (nx > 0.5) uv.setXY(i, pz * tile, py * tile);
    else if (ny > 0.5) uv.setXY(i, px * tile, pz * tile);
    else uv.setXY(i, px * tile, py * tile);
  }
  return g;
}

function useSurfaceTextures() {
  const maps = useTexture([
    `${TEX}floor_diff.webp`,
    `${TEX}floor_nor.webp`,
    `${TEX}floor_arm.webp`,
    `${TEX}plaster_diff.webp`,
    `${TEX}plaster_nor.webp`,
    `${TEX}plaster_arm.webp`,
    `${TEX}walnut_diff.webp`,
    `${TEX}walnut_nor.webp`,
    `${TEX}walnut_arm.webp`,
  ]);
  return useMemo(() => {
    maps.forEach((t, i) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
      t.colorSpace = i % 3 === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.needsUpdate = true;
    });
    const [fd, fn, fa, pd, pn, pa, wd, wn, wa] = maps;
    const floorMaps = [fd, fn, fa].map((t) => {
      const c = t.clone();
      c.repeat.set(4.2, 3.4);
      c.needsUpdate = true;
      return c;
    });
    const floor = new THREE.MeshStandardMaterial({
      map: floorMaps[0],
      normalMap: floorMaps[1],
      aoMap: floorMaps[2],
      roughnessMap: floorMaps[2],
      // The scan is varnished to a mirror (roughness ~0.1); a study floor
      // that has been walked on reads better at a satin ~0.35.
      roughness: 3.5,
      color: new THREE.Color("#8a7a6c"),
      envMapIntensity: 0.6,
    });
    const plaster = new THREE.MeshStandardMaterial({
      map: pd,
      normalMap: pn,
      normalScale: new THREE.Vector2(0.6, 0.6),
      aoMap: pa,
      roughnessMap: pa,
      color: new THREE.Color("#4a5160"),
      envMapIntensity: 0.25,
    });
    const walnut = new THREE.MeshStandardMaterial({
      map: wd,
      normalMap: wn,
      roughnessMap: wa,
      roughness: 0.8,
      color: new THREE.Color("#b08a6a"),
      envMapIntensity: 0.5,
    });
    // The slats get their own copy with the uplight baked in as emission:
    // a warm wash that is brightest at the floor and gone by head height,
    // which is what a strip light grazing a wood wall looks like, at none of
    // the cost of a real area light in every shader.
    const glow = document.createElement("canvas");
    glow.width = 4;
    glow.height = 256;
    const g = glow.getContext("2d") as CanvasRenderingContext2D;
    const grad = g.createLinearGradient(0, 256, 0, 0);
    grad.addColorStop(0, "rgb(255,255,255)");
    grad.addColorStop(0.18, "rgb(120,120,120)");
    grad.addColorStop(0.55, "rgb(24,24,24)");
    grad.addColorStop(1, "rgb(0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 256);
    const glowTex = new THREE.CanvasTexture(glow);
    glowTex.colorSpace = THREE.SRGBColorSpace;
    const slat = walnut.clone();
    slat.emissive = new THREE.Color("#ff9a4a");
    slat.emissiveMap = glowTex;
    slat.emissiveIntensity = 0;
    return { floor, plaster, walnut, slat };
  }, [maps]);
}

/**
 * A flat-woven wool rug: navy field, a cream border with a cobalt stripe,
 * and the weave itself as fine rows of lighter and darker thread, so it
 * reads as cloth under the reading lamp rather than a painted rectangle.
 */
function paintRug(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const r = rand(12);
  ctx.fillStyle = "#1a2340";
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) {
    ctx.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "0,0,0"},${0.025 + r() * 0.04})`;
    ctx.fillRect(0, y, w, 1);
  }
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(200,210,255,${0.02 + r() * 0.05})`;
    ctx.fillRect(r() * w, r() * h, 1 + r() * 3, 1);
  }
  const band = (inset: number, width: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  };
  band(26, 14, "rgba(226,218,200,0.78)");
  band(46, 5, "rgba(95,130,255,0.85)");
  band(60, 2, "rgba(226,218,200,0.5)");
}

const steel = new THREE.MeshStandardMaterial({ color: "#15171c", metalness: 0.7, roughness: 0.45 });
const ceilingMat = new THREE.MeshStandardMaterial({ color: "#0d0f14", roughness: 0.95 });
const trimMat = new THREE.MeshStandardMaterial({ color: "#101216", roughness: 0.6, metalness: 0.2 });
const brassMat = new THREE.MeshStandardMaterial({ color: "#b89a64", metalness: 1, roughness: 0.3 });
const glassMat = new THREE.MeshStandardMaterial({
  color: "#9fb2d8",
  roughness: 0.04,
  metalness: 0,
  transparent: true,
  opacity: 0.1,
  envMapIntensity: 1.2,
  depthWrite: false,
});

export const Room = memo(function Room({ anim }: { anim: Anim }) {
  const { floor, plaster, walnut, slat } = useSurfaceTextures();
  const { halfW, back, front, height } = ROOM;
  const win = PLACE.window;
  const winL = win.x - win.width / 2;
  const winR = win.x + win.width / 2;

  const walls = useMemo(() => {
    const t = 0.2;
    const bz = back - t / 2;
    const parts = [
      // Back wall around the window opening.
      worldBox(winL + halfW, height, t, (-halfW + winL) / 2, height / 2, bz),
      worldBox(halfW - winR, height, t, (winR + halfW) / 2, height / 2, bz),
      worldBox(win.width, win.sill, t, win.x, win.sill / 2, bz),
      worldBox(win.width, height - win.top, t, win.x, (height + win.top) / 2, bz),
      // Right wall and the plaster behind the slats on the left.
      worldBox(t, height, front - back, halfW + t / 2, height / 2, (front + back) / 2),
      worldBox(t, height, front - back, -halfW - t / 2, height / 2, (front + back) / 2),
    ];
    return mergeGeometries(parts);
  }, [back, front, halfW, height, win.sill, win.top, win.width, win.x, winL, winR]);

  const { slats, slatLines } = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const outline: THREE.BufferGeometry[] = [];
    const w = 0.055;
    const gap = 0.028;
    let i = 0;
    for (let z = back + 0.04; z < front - 0.02; z += w + gap, i++) {
      const g = new THREE.BoxGeometry(0.05, height, w);
      g.translate(-halfW + 0.025, height / 2, z + w / 2);
      // Give each slat its own strip of the veneer so the grain does not repeat.
      const uv = g.attributes.uv;
      const off = (i * 0.137) % 1;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, off + uv.getX(k) * 0.07, uv.getY(k));
      parts.push(g);
      // The blueprint draws only every fifth slat: all ninety at once read
      // as a solid white slab rather than a slatted wall.
      if (i % 5 === 0)
        outline.push(new THREE.BoxGeometry(0.05, height, w).translate(-halfW + 0.025, height / 2, z + w / 2));
    }
    return { slats: mergeGeometries(parts), slatLines: new THREE.EdgesGeometry(mergeGeometries(outline), 30) };
  }, [back, front, halfW, height]);

  const beams = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (const z of [-2.6, -0.9, 0.8, 2.5]) {
      parts.push(new THREE.BoxGeometry(halfW * 2, 0.26, 0.14).translate(0, height - 0.13, z));
      parts.push(new THREE.BoxGeometry(halfW * 2, 0.03, 0.32).translate(0, height - 0.275, z));
    }
    return mergeGeometries(parts);
  }, [halfW, height]);

  const windowFrame = useMemo(() => {
    const f = 0.07;
    const d = 0.12;
    const z = back - 0.1;
    const h = win.top - win.sill;
    const cy = (win.top + win.sill) / 2;
    const parts = [
      new THREE.BoxGeometry(win.width, f, d).translate(win.x, win.top - f / 2, z),
      new THREE.BoxGeometry(win.width, f, d).translate(win.x, win.sill + f / 2, z),
      new THREE.BoxGeometry(f, h, d).translate(winL + f / 2, cy, z),
      new THREE.BoxGeometry(f, h, d).translate(winR - f / 2, cy, z),
      new THREE.BoxGeometry(0.045, h, d * 0.8).translate(win.x - win.width / 6, cy, z),
      new THREE.BoxGeometry(0.045, h, d * 0.8).translate(win.x + win.width / 6, cy, z),
      new THREE.BoxGeometry(win.width, 0.045, d * 0.8).translate(win.x, win.sill + h * 0.68, z),
      // Interior sill.
      new THREE.BoxGeometry(win.width + 0.2, 0.05, 0.3).translate(win.x, win.sill - 0.025, back + 0.08),
    ];
    return mergeGeometries(parts);
  }, [back, win.sill, win.top, win.width, win.x, winL, winR]);

  const door = useMemo(() => {
    const { z, width, height: dh } = PLACE.door;
    return {
      panel: new THREE.BoxGeometry(0.05, dh, width).translate(halfW - 0.025, dh / 2, z),
      trim: mergeGeometries([
        new THREE.BoxGeometry(0.06, dh + 0.08, 0.06).translate(halfW - 0.03, (dh + 0.08) / 2, z - width / 2 - 0.03),
        new THREE.BoxGeometry(0.06, dh + 0.08, 0.06).translate(halfW - 0.03, (dh + 0.08) / 2, z + width / 2 + 0.03),
        new THREE.BoxGeometry(0.06, 0.06, width + 0.12).translate(halfW - 0.03, dh + 0.05, z),
      ]),
      handle: mergeGeometries([
        new THREE.CylinderGeometry(0.03, 0.03, 0.02, 20)
          .rotateZ(Math.PI / 2)
          .translate(halfW - 0.06, 1.02, z - width / 2 + 0.1),
        new THREE.CylinderGeometry(0.012, 0.012, 0.12, 12)
          .translate(halfW - 0.09, 1.02, z - width / 2 + 0.1)
          .rotateX(0),
      ]),
    };
  }, [halfW]);

  // Night outside, and the neon light on the back wall.
  const sky = useMemo(() => {
    const s = makeCanvasTexture(2048, 1024);
    paintSky(s.ctx, 2048, 1024);
    s.tex.needsUpdate = true;
    return s;
  }, []);
  const neon = useMemo(() => {
    const n = makeCanvasTexture(1024, 256);
    paintNeon(n.ctx, 1024, 256);
    n.tex.needsUpdate = true;
    return n;
  }, []);
  useLayoutEffect(() => {
    // Fonts may still be arriving on first paint; repaint once they are in.
    let live = true;
    void document.fonts?.ready.then(() => {
      if (!live) return;
      paintNeon(neon.ctx, 1024, 256);
      neon.tex.needsUpdate = true;
    });
    return () => {
      live = false;
      sky.tex.dispose();
      neon.tex.dispose();
    };
  }, [neon, sky]);

  const skyMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: sky.tex, color: new THREE.Color(0.8, 0.8, 0.85) }),
    [sky],
  );
  const neonMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: neon.tex, transparent: true, toneMapped: false, depthWrite: false }),
    [neon],
  );
  const stripMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffb070"), toneMapped: false }),
    [],
  );
  const rugMat = useMemo(() => {
    const rug = makeCanvasTexture(512, 384);
    paintRug(rug.ctx, 512, 384);
    rug.tex.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: rug.tex, roughness: 1, envMapIntensity: 0.3 });
  }, []);
  const neonLight = useRef<THREE.PointLight>(null);

  useFrame(() => {
    const n = anim.neon;
    neonMat.color.setScalar(0.25 + n * 2.1);
    neonMat.opacity = 0.15 + n * 0.85;
    if (neonLight.current) neonLight.current.intensity = n * 6;
    stripMat.color.set("#ffb070").multiplyScalar(0.1 + anim.strip * 3);
    slat.emissiveIntensity = anim.strip * 0.55;
    skyMat.color.setScalar(0.15 + anim.moon * 0.75);
  });

  return (
    <group userData={{ pfEdges: true }}>
      <mesh geometry={walls} material={plaster} />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, (front + back) / 2]} material={floor}>
        <planeGeometry args={[halfW * 2, front - back]} />
      </mesh>
      <mesh
        rotation-x={Math.PI / 2}
        position={[0, height, (front + back) / 2]}
        material={ceilingMat}
        userData={{ pfNoCast: true }}
      >
        <planeGeometry args={[halfW * 2, front - back]} />
      </mesh>
      <mesh geometry={beams} material={steel} />
      <mesh geometry={slats} material={slat} userData={{ pfNoTwin: true }} />
      <lineSegments geometry={slatLines} material={edgeMaterial} userData={{ pfTwin: true }} />
      <mesh geometry={windowFrame} material={steel} />
      <mesh
        position={[win.x, (win.top + win.sill) / 2, back - 0.12]}
        material={glassMat}
        userData={{ pfNoCast: true, pfNoTwin: true }}
      >
        <planeGeometry args={[win.width, win.top - win.sill]} />
      </mesh>
      <mesh position={[win.x + 0.6, 2.4, back - 4.5]} material={skyMat} userData={{ pfNoCast: true }}>
        <planeGeometry args={[16, 8]} />
      </mesh>
      <mesh geometry={door.panel} material={walnut} />
      <mesh geometry={door.trim} material={trimMat} />
      <mesh geometry={door.handle} material={brassMat} />
      <mesh
        rotation={[-Math.PI / 2, 0, PLACE.rug.rot]}
        position={PLACE.rug.pos}
        material={rugMat}
        userData={{ pfNoCast: true }}
      >
        <planeGeometry args={PLACE.rug.size} />
      </mesh>
      {/* Warm uplight strip along the foot of the slat wall. */}
      <mesh
        position={[-halfW + 0.09, 0.015, (front + back) / 2]}
        material={stripMat}
        userData={{ pfNoCast: true, pfNoTwin: true }}
      >
        <boxGeometry args={[0.03, 0.02, front - back - 0.2]} />
      </mesh>
      {/* The sign. */}
      <mesh position={PLACE.neon.pos} material={neonMat} userData={{ pfNoCast: true, pfNoTwin: true }}>
        <planeGeometry args={PLACE.neon.size} />
      </mesh>
      <pointLight
        ref={neonLight}
        position={[PLACE.neon.pos[0], PLACE.neon.pos[1], PLACE.neon.pos[2] + 0.45]}
        color="#5f82ff"
        intensity={0}
        distance={7}
        decay={2}
      />
    </group>
  );
});
