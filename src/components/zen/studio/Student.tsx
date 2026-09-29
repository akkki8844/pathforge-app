import { memo, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { PLACE } from "./stage";
import { MODEL_DIR } from "./models";
import { live } from "./live";
import { desk, deskMotion } from "./newsdesk";
import { makePaper } from "./newspaper";
import type { Anim } from "./anim";

/*
 * The reader in the armchair, who keeps the news desk.
 *
 * Most of the time she sits back with legs crossed, reading tonight's paper,
 * which is printed from the admissions feed, so the front page facing the
 * room carries a real headline. Open the News station and she folds the
 * paper into her lap, looks up at you and tells you the stories: her head
 * keeps time with the words, and her free hand talks along.
 *
 * The rig ships in a bind pose, so both poses are authored here and solved
 * once when she loads: the torso and head as small rotations on the rest
 * pose, every limb aimed along a direction in her own frame (x = her left,
 * y = up, z = forward). Aiming ignores how the rig's bone axes are rolled,
 * which is what lets a pose written as directions survive the model. Each
 * frame then only blends between the two solved poses and layers a little
 * life on top (a breath, where she looks, the nods), all as rotations about
 * axes in her frame for the same reason.
 */

type Euler3 = [number, number, number];
type Aim = [bone: string, child: string, dir: Euler3];
type Pose = { lean: Record<string, Euler3>; aim: Aim[] };

/** She is modelled small; at 1.5 she sits in the chair like an adult. */
const SCALE = 1.5;
/** Where her hip joints land, in the armchair's own frame: on the cushion, back against the rest. */
const SEAT = new THREE.Vector3(0, 0.63, -0.2);

/** Legs crossed, left over right. The same in both poses. */
const LEGS: Aim[] = [
  ["LeftUpLeg", "LeftLeg", [-0.22, 0.12, 1]],
  ["LeftLeg", "LeftFoot", [-0.12, -0.9, 0.4]],
  ["LeftFoot", "LeftToeBase", [-0.05, -0.4, 0.9]],
  ["RightUpLeg", "RightLeg", [0.08, -0.05, 1]],
  ["RightLeg", "RightFoot", [0.03, -1, 0.08]],
  ["RightFoot", "RightToeBase", [0, -0.3, 0.95]],
];

const FINGERS = ["Index", "Middle", "Ring", "Pinky"] as const;

/** Four fingers, three joints each, aimed segment by segment. */
function fingers(side: "Left" | "Right", joints: [Euler3, Euler3, Euler3?]): Aim[] {
  const out: Aim[] = [];
  for (const f of FINGERS) {
    joints.forEach((dir, j) => {
      if (dir) out.push([`${side}Hand${f}${j + 1}`, `${side}Hand${f}${j + 2}`, dir]);
    });
  }
  return out;
}

/** Holding a broadsheet open at the edges: fingers round the front, thumbs behind. */
function grip(side: "Left" | "Right"): Aim[] {
  const s = side === "Left" ? 1 : -1;
  return [
    ...fingers(side, [
      [-0.85 * s, 0.25, 0.45],
      [-0.7 * s, -0.1, -0.35],
      [-0.2 * s, -0.2, -0.9],
    ]),
    [`${side}HandThumb1`, `${side}HandThumb2`, [-0.5 * s, 0.4, -0.3]],
    [`${side}HandThumb2`, `${side}HandThumb3`, [-0.6 * s, 0.5, -0.5]],
  ];
}

const READING: Pose = {
  lean: {
    Spine: [-0.16, 0, 0],
    Spine1: [0.03, 0, 0],
    Spine2: [0.06, 0, 0],
    Neck: [0.2, 0, 0],
    Head: [0.34, 0, 0],
  },
  aim: [
    ...LEGS,
    ["LeftArm", "LeftForeArm", [0.42, -0.78, 0.3]],
    ["LeftForeArm", "LeftHand", [-0.18, 0.36, 0.9]],
    ["LeftHand", "LeftHandMiddle1", [-0.1, 0.7, 0.7]],
    ["RightArm", "RightForeArm", [-0.42, -0.78, 0.3]],
    ["RightForeArm", "RightHand", [0.18, 0.36, 0.9]],
    ["RightHand", "RightHandMiddle1", [0.1, 0.7, 0.7]],
    ...grip("Left"),
    ...grip("Right"),
  ],
};

const TELLING: Pose = {
  lean: {
    Spine: [-0.12, 0, 0],
    Spine1: [0.02, 0, 0],
    Spine2: [0.03, 0.05, 0],
    Neck: [0.04, 0, 0],
    Head: [0.02, 0, 0],
  },
  aim: [
    ...LEGS,
    // Left hand rests on her knee, holding the folded paper.
    ["LeftArm", "LeftForeArm", [0.2, -0.85, 0.45]],
    ["LeftForeArm", "LeftHand", [-0.4, -0.12, 0.9]],
    ["LeftHand", "LeftHandMiddle1", [-0.3, -0.1, 0.95]],
    ...fingers("Left", [
      [-0.1, -0.3, 0.95],
      [-0.05, -0.5, 0.85],
    ]),
    // Right hand up and open, the one she talks with.
    ["RightArm", "RightForeArm", [-0.35, -0.85, 0.35]],
    ["RightForeArm", "RightHand", [0.05, 0.55, 0.84]],
    ["RightHand", "RightHandMiddle1", [0.1, 0.35, 0.93]],
    ...fingers("Right", [
      [0.12, 0.45, 0.88],
      [0.1, 0.35, 0.93],
    ]),
  ],
};

function boneKey(name: string) {
  return name.replace(/^mixamorig:?/, "");
}

const tmpQ = new THREE.Quaternion();
const tmpQ2 = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();
const va = new THREE.Vector3();
const vb = new THREE.Vector3();
const vw = new THREE.Vector3();
const vc = new THREE.Vector3();
const ID = new THREE.Quaternion();
const qn = new THREE.Quaternion();

/** Rotate a bone by `q`, given in world space, whatever its local axes are. */
function turnWorld(bone: THREE.Object3D, q: THREE.Quaternion) {
  if (!bone.parent) return;
  const p = bone.parent.getWorldQuaternion(qb);
  tmpQ2.copy(p).invert().multiply(q).multiply(p);
  bone.quaternion.premultiply(tmpQ2);
  bone.updateWorldMatrix(false, true);
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const Student = memo(function Student({
  pointer,
  anim,
}: {
  pointer: React.MutableRefObject<THREE.Vector2>;
  anim: Anim;
}) {
  const { scene } = useGLTF(`${MODEL_DIR}student.glb`, false, true);
  const outer = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);

  const bones = useMemo(() => {
    const map = new Map<string, { bone: THREE.Bone; rest: THREE.Quaternion }>();
    scene.traverse((o) => {
      if ((o as THREE.Bone).isBone) {
        const b = o as THREE.Bone;
        const rest = (b.userData.pfRest as THREE.Quaternion | undefined) ?? b.quaternion.clone();
        b.userData.pfRest = rest;
        map.set(boneKey(b.name), { bone: b, rest });
      }
    });
    return map;
  }, [scene]);
  const list = useMemo(() => [...bones.values()], [bones]);
  /** Bones the per-frame layers turn, so they are reset to the pose every frame. */
  const layered = useMemo(
    () => list.map((x) => ["Spine1", "Neck", "Head", "RightForeArm"].includes(boneKey(x.bone.name))),
    [list],
  );
  const bone = (k: string) => bones.get(k)?.bone;

  const skin = useRef<THREE.MeshStandardMaterial[]>([]);

  // Photoscan-bright plastic under a reading lamp read as a toy; matte cloth
  // and skin read as a person.
  useLayoutEffect(() => {
    skin.current = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.frustumCulled = false;
      // Her shadow is drawn once and she moves; better none than a stale one.
      m.userData.pfNoCast = true;
      const mat = m.material as THREE.MeshPhysicalMaterial;
      mat.roughnessMap = null;
      mat.roughness = 0.78;
      if ("specularIntensity" in mat) mat.specularIntensity = 0.35;
      // A soft fill from the front while she talks to you, faked with her own
      // colours as a faint glow: a real light would re-shade the whole room.
      mat.emissive = new THREE.Color("#ffd6ad");
      mat.emissiveMap = mat.map;
      mat.emissiveIntensity = 0;
      skin.current.push(mat);
      mat.needsUpdate = true;
    });
  }, [scene]);

  const paper = useMemo(() => makePaper(), []);

  /** Both poses, solved: each bone's local rotation, in `list` order. */
  const solved = useRef<{ a: THREE.Quaternion[]; b: THREE.Quaternion[] } | null>(null);
  /** The paper's place relative to her left hand, in each pose. */
  const hold = useRef({
    a: { p: new THREE.Vector3(), q: new THREE.Quaternion() },
    b: { p: new THREE.Vector3(), q: new THREE.Quaternion() },
  });
  const blend = useRef(0);
  /** The blend the bones were last written at; -1 forces a write. */
  const blendDone = useRef(-1);
  /** Which way her face points, in the head bone's own frame. */
  const faceLocal = useRef(new THREE.Vector3(0, 0, 1));

  const herQuat = () => (outer.current ? outer.current.getWorldQuaternion(qa) : qa.identity());

  const solve = (pose: Pose) => {
    for (const { bone: b, rest } of list) b.quaternion.copy(rest);
    for (const [key, e] of Object.entries(pose.lean)) {
      const hit = bones.get(key);
      if (!hit) continue;
      tmpE.set(e[0], e[1], e[2], "XYZ");
      hit.bone.quaternion.copy(hit.rest).multiply(tmpQ.setFromEuler(tmpE));
    }
    const hips = bone("Hips");
    if (!hips) return list.map((x) => x.bone.quaternion.clone());
    hips.updateWorldMatrix(true, true);
    const self = herQuat().clone();
    for (const [key, childKey, dir] of pose.aim) {
      const b = bone(key);
      const c = bone(childKey);
      if (!b || !c || !b.parent) continue;
      b.getWorldPosition(va);
      c.getWorldPosition(vb);
      const cur = vb.sub(va).normalize();
      const want = vw.set(dir[0], dir[1], dir[2]).normalize().applyQuaternion(self);
      const turn = tmpQ.setFromUnitVectors(cur, want);
      const world = b.getWorldQuaternion(qa);
      const parent = b.parent.getWorldQuaternion(qb).invert();
      b.quaternion.copy(parent.multiply(turn).multiply(world));
      b.updateWorldMatrix(false, true);
    }
    return list.map((x) => x.bone.quaternion.clone());
  };

  /** Paper transform relative to the left hand, from a world placement. */
  const relToHand = (pos: THREE.Vector3, quat: THREE.Quaternion, out: { p: THREE.Vector3; q: THREE.Quaternion }) => {
    const hand = bone("LeftHand");
    if (!hand) return;
    const hp = hand.getWorldPosition(new THREE.Vector3());
    const hq = hand.getWorldQuaternion(new THREE.Quaternion());
    const inv = hq.clone().invert();
    out.p.copy(pos).sub(hp).applyQuaternion(inv);
    out.q.copy(inv).multiply(quat);
  };

  useLayoutEffect(() => {
    const o = outer.current;
    const r = root.current;
    if (!o || !r) return;
    r.scale.setScalar(SCALE);
    r.position.set(0, 0, 0);
    o.updateWorldMatrix(true, true);
    const self = herQuat().clone();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(self);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(self);
    const left = new THREE.Vector3(1, 0, 0).applyQuaternion(self);

    // Telling first: that pose defines "facing forward" for her head.
    const b = solve(TELLING);
    const head = bone("Head");
    if (head) faceLocal.current.copy(fwd).applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion()).invert());

    // Seat her: move the whole figure so her hip joints sit on the cushion.
    const lh = bone("LeftUpLeg");
    const rh = bone("RightUpLeg");
    if (lh && rh) {
      const mid = lh.getWorldPosition(new THREE.Vector3()).add(rh.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
      o.worldToLocal(mid);
      r.position.copy(SEAT).sub(mid);
      o.updateWorldMatrix(true, true);
    }
    // Folded paper: held in the left hand, propped on her knee, front page out.
    const lhand = bone("LeftHand");
    if (lhand) {
      const at = lhand.getWorldPosition(new THREE.Vector3()).addScaledVector(up, 0.02).addScaledVector(left, -0.02);
      const q = self.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + 0.62, 0, 0.3)));
      // The fold's spine sits at the paper's edge; centre the folded half under the hand.
      at.addScaledVector(new THREE.Vector3(1, 0, 0).applyQuaternion(q), -0.15);
      relToHand(at, q, hold.current.b);
    }

    const a = solve(READING);
    // Open paper: between her hands, a little above them, tipped back toward her.
    const L = bone("LeftHand");
    const R = bone("RightHand");
    if (L && R) {
      const mid = L.getWorldPosition(new THREE.Vector3()).add(R.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
      mid.addScaledVector(up, 0.05).addScaledVector(fwd, 0.035);
      const q = self.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, 0, 0)));
      relToHand(mid, q, hold.current.a);
    }
    solved.current = { a, b };
    blendDone.current = -1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  // Print tonight's paper, and reprint when the feed changes.
  const printed = useRef(-1);
  useLayoutEffect(() => {
    let alive = true;
    void document.fonts?.ready.then(() => {
      if (alive) printed.current = -1;
    });
    return () => {
      alive = false;
      paper.dispose();
    };
  }, [paper]);

  const look = useRef(0);
  const talk = useRef(0);
  const glanceUntil = useRef(0);
  const nextGlance = useRef(7);
  const handPos = useMemo(() => new THREE.Vector3(), []);
  const handQuat = useMemo(() => new THREE.Quaternion(), []);
  const relP = useMemo(() => new THREE.Vector3(), []);
  const relQ = useMemo(() => new THREE.Quaternion(), []);
  const axis = useMemo(() => new THREE.Vector3(), []);
  const upAxis = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    const s = solved.current;
    const o = outer.current;
    if (!s || !o) return;
    const t = state.clock.elapsedTime;
    const now = performance.now();
    const d = desk.get();

    const data = live.get();
    if (data.rev !== printed.current) {
      printed.current = data.rev;
      paper.repaint(data.news, data.newsState !== "loading");
    }
    paper.setGlow(0.05 + anim.hang * 0.1);
    for (const m of skin.current) m.emissiveIntensity = ease(blend.current) * 0.22 * anim.hang;

    // Pose: ease between reading and telling.
    const goal = d.on ? 1 : 0;
    blend.current = THREE.MathUtils.clamp(blend.current + (goal > blend.current ? dt / 1.1 : -dt / 0.9), 0, 1);
    const e = ease(blend.current);
    const moving = blendDone.current !== e;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (!moving && !layered[i]) continue;
      b.bone.quaternion.slerpQuaternions(s.a[i], s.b[i], e);
    }
    blendDone.current = e;
    const hips = bone("Hips");
    hips?.updateWorldMatrix(true, true);

    const self = o.getWorldQuaternion(qa);
    axis.set(1, 0, 0).applyQuaternion(self);
    upAxis.set(0, 1, 0).applyQuaternion(self);

    // Breath.
    const spine = bone("Spine1");
    if (spine) turnWorld(spine, tmpQ.setFromAxisAngle(axis, Math.sin(t * 1.6) * 0.014));

    // Where she looks. Telling, at you. Reading, now and then over the top
    // of the paper, or when your cursor wanders over to her corner.
    if (t > nextGlance.current) {
      glanceUntil.current = t + 1.6;
      nextGlance.current = t + 10 + Math.random() * 8;
    }
    const near = pointer.current.x < -0.1 && pointer.current.y > -0.6;
    const lookGoal = d.on ? 1 : near || t < glanceUntil.current ? 0.55 : 0;
    look.current += (lookGoal - look.current) * Math.min(1, dt * 3);
    const head = bone("Head");
    const neck = bone("Neck");
    if (head && neck && look.current > 0.002) {
      const hq = head.getWorldQuaternion(qb);
      const face = vc.copy(faceLocal.current).applyQuaternion(hq).normalize();
      const at = head.getWorldPosition(va);
      const want = vw.copy(state.camera.position).sub(at).normalize();
      const angle = face.angleTo(want);
      const full = tmpQ.setFromUnitVectors(face, want);
      const k = look.current * Math.min(1, 0.8 / Math.max(angle, 1e-3));
      turnWorld(neck, qn.slerpQuaternions(ID, full, 0.4 * k));
      turnWorld(head, qn.slerpQuaternions(ID, full, 0.6 * k));
    }

    // Talking: nods on the words, a slow sway, the free hand along with it.
    talk.current += ((deskMotion.talking ? 1 : 0) - talk.current) * Math.min(1, dt * 6);
    const tk = talk.current * e;
    if (tk > 0.002) {
      const since = (now - deskMotion.beat) / 1000;
      const pulse = Math.exp(-since / 0.14);
      if (head) {
        turnWorld(head, tmpQ.setFromAxisAngle(axis, tk * (0.028 * Math.sin(t * 7.5) + 0.06 * pulse)));
        turnWorld(head, tmpQ.setFromAxisAngle(upAxis, tk * 0.05 * Math.sin(t * 1.3)));
      }
      const fore = bone("RightForeArm");
      if (fore) turnWorld(fore, tmpQ.setFromAxisAngle(axis, -tk * (0.14 + 0.08 * Math.sin(t * 2.2) + 0.1 * pulse)));
    }

    // The paper rides in her left hand, folding on the way down.
    const hand = bone("LeftHand");
    if (hand) {
      hand.updateWorldMatrix(true, false);
      hand.matrixWorld.decompose(handPos, handQuat, vb);
      const h = hold.current;
      relP.lerpVectors(h.a.p, h.b.p, e);
      relQ.slerpQuaternions(h.a.q, h.b.q, e);
      paper.group.position.copy(relP).applyQuaternion(handQuat).add(handPos);
      paper.group.quaternion.copy(handQuat).multiply(relQ);
      paper.fold(THREE.MathUtils.smoothstep(e, 0.15, 0.8));
    }

    // The tag over her head while she is on air.
    const tag = deskMotion.tag;
    if (tag && head) {
      const show = e > 0.6;
      if (show) {
        head.getWorldPosition(va).addScaledVector(upAxis, 0.46);
        va.project(state.camera);
        const x = (va.x * 0.5 + 0.5) * state.size.width;
        const y = (-va.y * 0.5 + 0.5) * state.size.height;
        tag.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
      }
      const op = show ? "1" : "0";
      if (tag.style.opacity !== op) tag.style.opacity = op;
    }
  });

  const [x, y, z] = PLACE.armchair.pos;
  return (
    <group userData={{ pfDynamic: true }}>
      <group ref={outer} position={[x, y, z]} rotation-y={PLACE.armchair.rot}>
        <group ref={root}>
          <primitive object={scene} />
        </group>
      </group>
      <primitive object={paper.group} />
    </group>
  );
});
