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
  "marble_bust_01",
  "modern_arm_chair_01",
  "hanging_industrial_lamp",
  "concrete_cat_statue",
  "standing_chalkboard_01",
  "wall_clock",
  "student",
  "sofa_02",
  "side_table_01",
  "industrial_pipe_lamp",
  "vintage_grandfather_clock_01",
  "fancy_picture_frame_01",
  "standing_picture_frame_01",
  "standing_picture_frame_02",
  "ornate_mirror_01",
  "throw_pillows_01",
  "ceiling_fan",
  "modern_ceiling_lamp_01",
  "vintage_microscope",
  "bunsen_burner",
  "ceramic_vase_02",
  "wooden_ladder",
  "filmstrip_projector_8mm",
  "watering_can_metal_01",
  "outdoor_table_chair_set_01",
  "planter_box_01",
];

/** Start every download at once, as soon as the Zen chunk is evaluated. */
export function preloadModels() {
  for (const name of MODELS) useGLTF.preload(`${MODEL_DIR}${name}.glb`, false, true);
}
