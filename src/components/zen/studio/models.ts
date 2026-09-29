import { useGLTF } from "@react-three/drei";

/*
 * The study's furniture. Photoscanned CC0 models from Poly Haven and the
 * student (a Mixamo character from the three.js examples), run through
 * glTF-Transform: meshopt geometry, WebP textures, node structure kept so
 * the clock hands still turn, and each model's feature edges baked in as a
 * `pf_edges` LINES primitive for the blueprint. See public/zen/CREDITS.txt.
 */
export const MODEL_DIR = "/zen/models/";

const MODELS = [
  "metal_office_desk",
  "mid_century_lounge_chair",
  "classic_laptop",
  "desk_lamp_arm_01",
  "binder_notebook",
  "stationery_supplies",
  "seadogs_compass",
  "portable_cassette_player",
  "potted_plant_04",
  "potted_plant_02",
  "steel_frame_shelves_03",
  "book_encyclopedia_set_01",
  "marble_bust_01",
  "modern_arm_chair_01",
  "hanging_industrial_lamp",
  "concrete_cat_statue",
  "standing_chalkboard_01",
  "wall_clock",
  "student",
];

/** Start every download at once, as soon as the Zen chunk is evaluated. */
export function preloadModels() {
  for (const name of MODELS) useGLTF.preload(`${MODEL_DIR}${name}.glb`, false, true);
}
