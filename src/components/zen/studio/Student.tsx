import { memo, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { PLACE } from "./stage";
import { MODEL_DIR } from "./models";

/*
 * The student in the armchair, reading.
 *
 * The rig ships in a bind pose, so the seated pose is authored here as a
 * rotation per bone, applied on top of each bone's rest rotation. On top of
 * that pose runs a little life: breathing through the spine, a page turned
 * every so often, and a glance up at you when your cursor comes near.
 */

type Euler3 = [number, number, number];

/**
 * The torso and head are posed as small rotations on top of the rest pose
 * (x leans forward). Everything else is posed by direction instead: each limb
 * bone is aimed along a vector in the student's own space (x = her left,
 * y = up, z = forward), solved parent first. Aiming is independent of how the
 * rig's bone axes happen to be rolled, which is what makes a pose authored
 * here survive any clean bind pose.
 */
const LEAN: Record<string, Euler3> = {
  Spine: [0.06, 0, 0],
  Spine1: [0.08, 0, 0],
  Spine2: [0.05, 0, 0],
  Neck: [0.2, 0, 0],
  Head: [0.3, 0, 0],
};

const AIM: Array<[bone: string, child: string, dir: Euler3]> = [
  ["LeftUpLeg", "LeftLeg", [0.14, -0.08, 1]],
  ["LeftLeg", "LeftFoot", [0.04, -1, 0.1]],
  ["LeftFoot", "LeftToeBase", [0.02, -0.55, 0.84]],
  ["RightUpLeg", "RightLeg", [-0.14, -0.08, 1]],
  ["RightLeg", "RightFoot", [-0.04, -1, 0.1]],
  ["RightFoot", "RightToeBase", [-0.02, -0.55, 0.84]],
  ["LeftArm", "LeftForeArm", [0.3, -0.84, 0.38]],
  ["LeftForeArm", "LeftHand", [-0.42, 0.28, 0.86]],
  ["LeftHand", "LeftHandMiddle1", [-0.3, 0.05, 0.95]],
  ["RightArm", "RightForeArm", [-0.3, -0.84, 0.38]],
  ["RightForeArm", "RightHand", [0.42, 0.28, 0.86]],
  ["RightHand", "RightHandMiddle1", [0.3, 0.05, 0.95]],
];

const STUDENT_SEAT = { lift: -0.42, back: -0.12, scale: 1 };

function boneKey(name: string) {
  return name.replace(/^mixamorig:?/, "");
}

const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();
const qc = new THREE.Quaternion();
const va = new THREE.Vector3();
const vb = new THREE.Vector3();
const vw = new THREE.Vector3();

export const Student = memo(function Student({ pointer }: { pointer: React.MutableRefObject<THREE.Vector2> }) {
  const { scene } = useGLTF(`${MODEL_DIR}student.glb`, false, true);
  const root = useRef<THREE.Group>(null);
  const bones = useMemo(() => {
    const map = new Map<string, { bone: THREE.Bone; rest: THREE.Quaternion }>();
    scene.traverse((o) => {
      if ((o as THREE.Bone).isBone) {
        const b = o as THREE.Bone;
        const key = boneKey(b.name);
        const rest = (b.userData.pfRest as THREE.Quaternion | undefined) ?? b.quaternion.clone();
        b.userData.pfRest = rest;
        map.set(key, { bone: b, rest });
      }
    });
    return map;
  }, [scene]);

  // A hardcover held open in the lap.
  const book = useMemo(() => {
    const g = new THREE.Group();
    const cover = new THREE.MeshStandardMaterial({ color: "#1f2f5c", roughness: 0.6 });
    const paper = new THREE.MeshStandardMaterial({ color: "#e9e3d4", roughness: 0.95 });
    for (const side of [-1, 1]) {
      const half = new THREE.Group();
      half.rotation.y = side * 0.32;
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.006, 0.22), cover);
      c.position.set(side * 0.075, 0, 0);
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.142, 0.014, 0.21), paper);
      p.position.set(side * 0.073, 0.01, 0);
      half.add(c, p);
      half.rotation.z = -side * 0.22;
      g.add(half);
    }
    const page = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.2), paper);
    page.geometry.translate(0.07, 0, 0);
    page.rotation.x = -Math.PI / 2;
    page.position.y = 0.019;
    page.name = "page";
    g.add(page);
    return g;
  }, []);

  const look = useRef(0);
  const glanceUntil = useRef(0);
  const nextGlance = useRef(6);
  const nextPage = useRef(9);
  const pageT = useRef(-1);

  /** Torso and head: rest pose times this frame's lean, breath and glance. */
  const lean = (t: number) => {
    const breathe = Math.sin(t * 1.6) * 0.012;
    for (const [key, e] of Object.entries(LEAN)) {
      const hit = bones.get(key);
      if (!hit) continue;
      let [x, y] = e;
      const z = e[2];
      if (key === "Spine1") x += breathe;
      if (key === "Spine2") x += breathe * 0.6;
      if (key === "Head" || key === "Neck") {
        // Glance: lift the head and turn toward the viewer, eased by `look`.
        const k = key === "Head" ? 1 : 0.4;
        x -= look.current * 0.42 * k;
        y += look.current * (0.35 + pointer.current.x * 0.25) * k;
      }
      tmpE.set(x, y, z, "XYZ");
      tmpQ.setFromEuler(tmpE);
      hit.bone.quaternion.copy(hit.rest).multiply(tmpQ);
    }
  };

  /**
   * The limbs are aimed once, not every frame. None of them moves on its
   * own, and they hang from the spine, so they still follow each breath.
   * Solving twelve bones against the whole skeleton every frame was the
   * single most expensive thing on the CPU in the room.
   */
  const solve = () => {
    for (const { bone, rest } of bones.values()) bone.quaternion.copy(rest);
    lean(0);
    const hips = bones.get("Hips")?.bone;
    if (!hips) return;
    hips.updateWorldMatrix(true, true);
    // Her own frame, from the hips: x left, y up, z forward.
    const self = hips.getWorldQuaternion(qc);
    for (const [key, childKey, dir] of AIM) {
      const bone = bones.get(key)?.bone;
      const child = bones.get(childKey)?.bone;
      if (!bone || !child || !bone.parent) continue;
      bone.getWorldPosition(va);
      child.getWorldPosition(vb);
      const cur = vb.sub(va).normalize();
      const want = vw.set(dir[0], dir[1], dir[2]).normalize().applyQuaternion(self);
      const turn = tmpQ.setFromUnitVectors(cur, want);
      const world = bone.getWorldQuaternion(qa);
      const parent = bone.parent.getWorldQuaternion(qb).invert();
      bone.quaternion.copy(parent.multiply(turn).multiply(world));
      bone.updateWorldMatrix(false, true);
    }
  };

  const lh = useMemo(() => new THREE.Vector3(), []);
  const rh = useMemo(() => new THREE.Vector3(), []);

  useLayoutEffect(() => {
    solve();
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.frustumCulled = false;
    });
    // The book sits between her hands, which only move with a breath.
    const L = bones.get("LeftHand")?.bone;
    const R = bones.get("RightHand")?.bone;
    if (L && R && root.current) {
      root.current.updateWorldMatrix(true, true);
      L.getWorldPosition(lh);
      R.getWorldPosition(rh);
      const mid = lh.add(rh).multiplyScalar(0.5);
      root.current.worldToLocal(mid);
      book.position.copy(mid);
      book.position.y += 0.03;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  const page = useMemo(() => book.getObjectByName("page") ?? null, [book]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    // Look up when the cursor is near the reading corner, or now and then
    // on her own, the way anyone does mid-chapter.
    const near = pointer.current.x < -0.1 && pointer.current.y > -0.6;
    if (t > nextGlance.current) {
      glanceUntil.current = t + 1.8;
      nextGlance.current = t + 9 + Math.random() * 7;
    }
    const want = near || t < glanceUntil.current ? 1 : 0;
    look.current += (want - look.current) * Math.min(1, dt * 2.2);
    lean(t);

    // Page turn: a single leaf swings over the spine.
    if (t > nextPage.current && pageT.current < 0) pageT.current = 0;
    if (page && pageT.current >= 0) {
      pageT.current += dt / 0.9;
      const p = Math.min(1, pageT.current);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      page.rotation.z = e * Math.PI * 0.92;
      page.position.y = 0.019 + Math.sin(p * Math.PI) * 0.04;
      if (pageT.current >= 1) {
        pageT.current = -1;
        page.rotation.z = 0;
        nextPage.current = t + 10 + Math.random() * 8;
      }
    }
  });

  const [x, y, z] = PLACE.armchair.pos;
  return (
    <group position={[x, y, z]} rotation-y={PLACE.armchair.rot} userData={{ pfDynamic: true }}>
      <group ref={root} position={[0, STUDENT_SEAT.lift, STUDENT_SEAT.back]} scale={STUDENT_SEAT.scale}>
        <primitive object={scene} />
        <primitive object={book} rotation={[0.55, 0, 0]} />
      </group>
    </group>
  );
});
