import { memo, useLayoutEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LOFT, ROOM, TERRACE, type Vec3 } from "./stage";
import { useModel } from "./Props";
import { Bookcase, type CaseSpec } from "./Library";
import { makeCanvasTexture, rand } from "./canvases";
import type { Anim } from "./anim";

/*
 * What is in the two rooms the building gained: the loft over the front bay,
 * the lounge beneath it, and the terrace. Each object is a photoscanned
 * prop, set down where a person would set it: a leather sofa turned to the
 * view, a lamp on a side table, a science desk under the window, a tall clock
 * against the wall, paintings, a mirror, a ceiling fan turning slowly.
 */

const Y = LOFT.y;

/** The library upstairs: the same wall, lower, along the slat wall beside the stair's head. */
const LOFT_LIBRARY: CaseSpec = {
  length: 2.7,
  bays: 3,
  rows: 4,
  rowH: 0.45,
  base: 0.3,
  depth: 0.38,
  seed: 23,
  gaps: [
    [1, 1],
    [2, 0],
    [0, 2],
  ],
};

/** A private copy of a cached model, so it can stand in more than one place. */
function useCopy(name: string) {
  const src = useModel(name);
  return useMemo(() => src.clone(true), [src]);
}

/** Height of a model's top above its own floor, for setting things on it. */
function heightOf(o: THREE.Object3D) {
  return new THREE.Box3().setFromObject(o).max.y;
}

function Prop({
  object,
  pos,
  rot = 0,
  scale = 1,
  hang = false,
}: {
  object: THREE.Object3D;
  pos: Vec3;
  rot?: number;
  scale?: number;
  /** Hung from its own top (a lamp on a cord, a fan) rather than stood on its base. */
  hang?: boolean;
}) {
  const lift = useMemo(() => {
    const b = new THREE.Box3().setFromObject(object);
    return hang ? -b.max.y : -b.min.y;
  }, [object, hang]);
  return (
    <group position={pos} rotation-y={rot} scale={scale}>
      <primitive object={object} position-y={lift} />
    </group>
  );
}

/** A woven rug: off-white ground, a blue border and a hairline of ink. */
function paintLoftRug(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const r = rand(31);
  ctx.fillStyle = "#e8e0d0";
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) {
    ctx.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "90,70,40"},${0.03 + r() * 0.05})`;
    ctx.fillRect(0, y, w, 1);
  }
  for (let i = 0; i < 3200; i++) {
    ctx.fillStyle = `rgba(120,100,70,${0.02 + r() * 0.05})`;
    ctx.fillRect(r() * w, r() * h, 1 + r() * 4, 1);
  }
  const band = (inset: number, width: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  };
  band(22, 20, "#4465d8");
  band(52, 4, "#1a2238");
  band(64, 2, "#4465d8");
  // A row of small diamonds inside the border, as a kilim has.
  ctx.fillStyle = "rgba(68,101,216,0.55)";
  for (let x = 92; x < w - 80; x += 34) {
    for (const y of [86, h - 86]) {
      ctx.beginPath();
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x + 8, y);
      ctx.lineTo(x, y + 8);
      ctx.lineTo(x - 8, y);
      ctx.fill();
    }
  }
}

function Rug({ pos, size, seedRot = 0 }: { pos: Vec3; size: [number, number]; seedRot?: number }) {
  const mat = useMemo(() => {
    const t = makeCanvasTexture(768, 512);
    paintLoftRug(t.ctx, 768, 512);
    t.tex.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: t.tex, roughness: 1, envMapIntensity: 0.25 });
  }, []);
  useLayoutEffect(() => () => mat.map?.dispose(), [mat]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, seedRot]} position={pos} material={mat} userData={{ pfNoCast: true }}>
      <planeGeometry args={size} />
    </mesh>
  );
}

/** The fan turns slowly and steadily, the loft's one thing that moves on its own. */
function Fan({ anim, pos }: { anim: Anim; pos: Vec3 }) {
  const fan = useCopy("ceiling_fan");
  const blades = useMemo(() => fan.getObjectByName("ceiling_fan_blades") ?? null, [fan]);
  useMemo(() => {
    if (blades) blades.userData.pfDynamic = true;
  }, [blades]);
  useFrame((_, dt) => {
    // It spins up as the lights come on.
    if (blades) blades.rotation.y += Math.min(dt, 0.05) * (0.6 + anim.hang * 1.6);
  });
  return <Prop object={fan} pos={pos} hang />;
}

/** A pipe lamp whose bulb takes the light of the room, on and off with the lights. */
function PipeLamp({ anim, pos, rot = 0 }: { anim: Anim; pos: Vec3; rot?: number }) {
  const lamp = useCopy("industrial_pipe_lamp");
  const glow = useMemo(() => {
    // The bulb is the mesh whose material (or node) is named for it; a node
    // that also carries baked edge lines is a group, so look at meshes only.
    let mesh: THREE.Mesh | null = null;
    lamp.traverse((o) => {
      const m = o as THREE.Mesh;
      if (mesh || !m.isMesh) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      if (mats.some((x) => /bulb/i.test(x.name)) || /bulb/i.test(m.name) || (m.parent && /bulb/i.test(m.parent.name))) mesh = m;
    });
    if (!mesh) return null;
    const found = mesh as THREE.Mesh;
    const src = (Array.isArray(found.material) ? found.material[0] : found.material) as THREE.MeshStandardMaterial;
    const m = src.clone();
    m.emissive = new THREE.Color("#ffc47e");
    m.emissiveMap = null;
    m.emissiveIntensity = 0;
    found.material = m;
    return m;
  }, [lamp]);
  useFrame(() => {
    if (glow) glow.emissiveIntensity = anim.hang * 1.5;
  });
  return <Prop object={lamp} pos={pos} rot={rot} />;
}

export const Upstairs = memo(function Upstairs({ anim }: { anim: Anim }) {
  const sofaUp = useCopy("sofa_02");
  const sofaDown = useCopy("sofa_02");
  const pillowsUp = useCopy("throw_pillows_01");
  const pillowsDown = useCopy("throw_pillows_01");
  const tableA = useCopy("side_table_01");
  const tableB = useCopy("side_table_01");
  const tableC = useCopy("side_table_01");
  const tableD = useCopy("side_table_01");
  const micro = useCopy("vintage_microscope");
  const bunsen = useCopy("bunsen_burner");
  const projector = useCopy("filmstrip_projector_8mm");
  const clock = useCopy("vintage_grandfather_clock_01");
  const paint = useCopy("fancy_picture_frame_01");
  const mirror = useCopy("ornate_mirror_01");
  const pendantA = useCopy("modern_ceiling_lamp_01");
  const pendantB = useCopy("modern_ceiling_lamp_01");
  const vase = useCopy("ceramic_vase_02");
  const photoA = useCopy("standing_picture_frame_01");
  const photoB = useCopy("standing_picture_frame_02");
  const ladder = useCopy("wooden_ladder");
  const plantA = useCopy("potted_plant_02");
  const plantB = useCopy("potted_plant_02");
  const plantC = useCopy("potted_plant_04");
  const plantD = useCopy("potted_plant_02");
  const shelfPhoto = useCopy("standing_picture_frame_02");
  const shelfVase = useCopy("ceramic_vase_02");
  const shelfPlant = useCopy("potted_plant_04");
  const table = useMemo(() => heightOf(tableA), [tableA]);
  const seat = 0.4;
  const z1 = ROOM.front;
  const ceil = ROOM.height;

  return (
    <group>
      {/* Upstairs: a reading corner turned to the view, a science desk under the glass. */}
      <Rug pos={[0.6, Y + 0.003, 5.2]} size={[3.7, 2.4]} />
      <Prop object={sofaUp} pos={[0.2, Y, 4.7]} rot={Math.PI} />
      <Prop object={pillowsUp} pos={[-0.4, Y + seat, 4.85]} rot={Math.PI + 0.25} />
      <Prop object={tableA} pos={[1.7, Y, 4.75]} />
      <PipeLamp anim={anim} pos={[1.7, Y + table, 4.75]} rot={0.6} />
      <Prop object={tableB} pos={[-2.1, Y, z1 - 0.4]} />
      <Prop object={micro} pos={[-2.1, Y + table, z1 - 0.4]} rot={2.9} scale={1.1} />
      <Prop object={bunsen} pos={[-1.85, Y + table, z1 - 0.4]} rot={0.4} />
      <Prop object={tableC} pos={[3.1, Y, z1 - 0.55]} />
      <Prop object={projector} pos={[3.1, Y + table, z1 - 0.55]} rot={-2.3} scale={0.9} />
      <Prop object={clock} pos={[4.3, Y, 5.2]} rot={-Math.PI / 2} />
      <Prop object={paint} pos={[4.47, Y + 1.3, 6.0]} rot={-Math.PI / 2} scale={1.1} />
      <Prop object={mirror} pos={[4.47, Y + 1.15, 4.3]} rot={-Math.PI / 2} scale={0.55} />
      <Fan anim={anim} pos={[0.6, ceil, 5.2]} />
      <Prop object={pendantA} pos={[-1.6, ceil, 4.95]} hang />
      <Prop object={vase} pos={[-3.6, Y, 4.0]} scale={0.9} />
      <group position={[-4.06, Y, 5.15]} rotation-y={Math.PI / 2}>
        <Bookcase spec={LOFT_LIBRARY} anim={anim}>
          <primitive object={shelfVase} position={[0, 0.3 + 0.45 + 0.015, -0.16]} scale={0.55} />
          <primitive object={shelfPhoto} position={[-0.9, 0.3 + 0.9 + 0.015, -0.14]} rotation-y={0.25} scale={0.85} />
          <primitive object={shelfPlant} position={[0.9, 0.3 + 0.015, -0.17]} scale={0.8} />
        </Bookcase>
      </group>
      <Prop object={plantA} pos={[3.7, Y, 4.15]} scale={1.05} rot={0.9} />
      <Prop object={plantB} pos={[-3.75, Y, z1 - 0.45]} scale={1.15} rot={2.1} />
      <Prop object={photoA} pos={[1.7 - 0.3, Y + table, 4.75 + 0.05]} rot={0.3} scale={0.9} />

      {/* Downstairs, under the deck: the lounge by the glass door. */}
      <Rug pos={[-1.7, 0.003, 5.3]} size={[3.1, 2.1]} seedRot={0} />
      <Prop object={sofaDown} pos={[-1.7, 0, z1 - 0.65]} rot={0} />
      <Prop object={pillowsDown} pos={[-2.25, seat, z1 - 0.5]} rot={-0.3} />
      <Prop object={tableD} pos={[-0.35, 0, z1 - 0.6]} />
      <Prop object={plantC} pos={[-0.35, table, z1 - 0.6]} scale={0.9} />
      <Prop object={photoB} pos={[-0.35 + 0.15, table, z1 - 0.45]} rot={Math.PI + 0.3} scale={0.8} />
      <Prop object={pendantB} pos={[-1.7, LOFT.y - LOFT.thick, 5.3]} hang />
      <Prop object={ladder} pos={[-4.0, 0, 5.4]} rot={Math.PI / 2 - 0.1} />
      <Prop object={plantD} pos={[3.9, 0, 4.3]} scale={1.1} rot={0.3} />
    </group>
  );
});

/** The terrace's furniture: a bistro table and chairs, a watering can, planters. */
export const TerraceProps = memo(function TerraceProps() {
  const set = useModel("outdoor_table_chair_set_01");
  const can = useCopy("watering_can_metal_01");
  const boxA = useCopy("planter_box_01");
  const boxB = useCopy("planter_box_01");
  const plantA = useCopy("potted_plant_04");
  const plantB = useCopy("potted_plant_04");
  const plantC = useCopy("potted_plant_02");
  const z0 = TERRACE.z0;
  const top = useMemo(() => heightOf(boxA) * 0.9, [boxA]);
  return (
    <group>
      <Prop object={set} pos={[-2.7, 0, z0 + 1.55]} rot={0.35} scale={1.05} />
      <Prop object={can} pos={[2.8, 0, z0 + 0.45]} rot={-0.6} />
      <Prop object={boxA} pos={[3.6, 0, z0 + 2.4]} rot={0} />
      <Prop object={boxB} pos={[-3.8, 0, z0 + 2.45]} rot={0} />
      <Prop object={plantA} pos={[3.6, top - 0.18, z0 + 2.4]} scale={1.2} />
      <Prop object={plantB} pos={[-3.8, top - 0.18, z0 + 2.45]} scale={1.2} rot={1.2} />
      <Prop object={plantC} pos={[4.1, 0, z0 + 0.6]} scale={1.2} rot={2} />
    </group>
  );
});

