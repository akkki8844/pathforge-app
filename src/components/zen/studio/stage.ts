/*
 * The study's layout and choreography constants, in one place so the scene,
 * the camera and the HUD all agree on where things are.
 *
 * Units are metres. The floor is y = 0, the back wall (with the window) is
 * z = -3.5, the wood-slat wall is x = -4.5, the right wall (door, neon light
 * spill) is x = 4.5. The camera looks in from the open +z side.
 */

export type Vec3 = [number, number, number];

/** Every close-up the camera can move to. Each one is a station of the dashboard. */
export type View =
  | "home"
  | "laptop"
  | "board"
  | "clock"
  | "pinboard"
  | "compass"
  | "shelves"
  | "reader"
  | "notebook"
  | "cassette"
  | "window";

export type StationId = Exclude<View, "home">;

/** Stations, plus the objects that do something in place. */
export type HotspotId = StationId | "cat" | "door" | "lamp";

export const ROOM = { halfW: 4.5, back: -3.5, front: 4.2, height: 4.2 };

export const DESK_TOP = 0.788;

export const PLACE = {
  desk: { pos: [0.8, 0, -2.78] as Vec3, rot: 0 },
  chair: { pos: [0.72, 0, -1.72] as Vec3, rot: Math.PI + 0.42 },
  laptop: { pos: [0.86, DESK_TOP, -2.66] as Vec3, rot: -0.06 },
  lamp: { pos: [0.02, DESK_TOP, -3.02] as Vec3 },
  notebook: { pos: [1.28, DESK_TOP, -2.5] as Vec3, rot: 0.18 },
  stationery: { pos: [1.62, DESK_TOP, -2.98] as Vec3, rot: -0.3 },
  compass: { pos: [0.34, DESK_TOP, -2.46] as Vec3, rot: 0.5 },
  cassette: { pos: [0.06, DESK_TOP, -2.5] as Vec3, rot: 0.35 },
  deskPlant: { pos: [1.74, DESK_TOP, -2.66] as Vec3, rot: 0.4 },
  shelves: { pos: [-4.08, 0, -1.25] as Vec3, rot: Math.PI / 2 },
  armchair: { pos: [-2.55, 0, 0.3] as Vec3, rot: 0.78 },
  hangingLamp: { pos: [-2.75, ROOM.height + 0.32, 0.05] as Vec3 },
  cat: { pos: [-1.55, 0, 1.25] as Vec3, rot: 1.05 },
  floorPlant: { pos: [2.62, 0, -3.02] as Vec3, rot: 0.6 },
  board: { pos: [3.35, 0, -1.45] as Vec3, rot: 2.5 },
  neon: { pos: [3.25, 2.72, -3.47] as Vec3, size: [1.95, 0.49] as [number, number] },
  clock: { pos: [-1.5, 2.5, -3.5] as Vec3 },
  window: { x: 0.8, width: 2.7, sill: 1.0, top: 3.25 },
  door: { z: 1.55, width: 1.02, height: 2.2 },
  rug: { pos: [-2.2, 0.004, 0.45] as Vec3, size: [2.6, 1.9] as [number, number], rot: 0.78 },
  pinboard: { pos: [-2.72, 1.74, -3.47] as Vec3, size: [1.56, 1.04] as [number, number] },
  mug: { pos: [1.56, DESK_TOP, -2.44] as Vec3 },
  calendar: { pos: [-1.5, 1.8, -3.47] as Vec3, size: [0.4, 0.52] as [number, number] },
};

export const VIEWS: Record<View, { pos: Vec3; target: Vec3; fov?: number }> = {
  home: { pos: [1.05, 1.62, 5.0], target: [-0.3, 1.33, -1.5], fov: 54 },
  laptop: { pos: [0.83, 1.2, -1.72], target: [0.86, 1.02, -2.72], fov: 40 },
  board: { pos: [1.79, 1.28, 0.63], target: [3.71, 0.92, -1.18], fov: 40 },
  window: { pos: [0.8, 1.62, -0.55], target: [0.8, 2.0, -5.0], fov: 45 },
  clock: { pos: [-1.72, 2.08, -1.62], target: [-1.16, 2.16, -3.5], fov: 42 },
  pinboard: { pos: [-2.35, 1.72, -0.62], target: [-2.5, 1.68, -3.47], fov: 44 },
  compass: { pos: [0.66, 1.1, -1.82], target: [0.22, 0.87, -2.5], fov: 40 },
  shelves: { pos: [-1.35, 1.55, -0.2], target: [-4.05, 1.25, -1.55], fov: 50 },
  reader: { pos: [-0.95, 1.4, 2.05], target: [-2.75, 0.78, 0.05], fov: 44 },
  notebook: { pos: [1.02, 1.42, -1.62], target: [1.58, 0.84, -2.52], fov: 40 },
  cassette: { pos: [-0.22, 1.08, -1.82], target: [0.26, 0.86, -2.5], fov: 40 },
};

/**
 * A tall phone screen cannot hold the whole room, so its home shot is built
 * around the desk, the window and the sign, from inside the room.
 */
export const PORTRAIT_HOME: { pos: Vec3; target: Vec3; fov: number } = {
  pos: [1.0, 1.5, 3.4],
  target: [1.2, 1.32, -3.0],
  fov: 86,
};

/** Where the camera starts the entrance: high, far and turned away. */
export const INTRO_PATH: Vec3[] = [[6.2, 6.8, 10.5], [4.8, 4.6, 8.2], [2.8, 2.5, 5.9], VIEWS.home.pos];
export const INTRO_TARGET: Vec3 = [0.2, 0.4, -1.0];

/** Axis-aligned hit boxes, [center, size]. Also what the hover frame traces. */
export const HOTSPOTS: Record<HotspotId, { center: Vec3; size: Vec3; label: string }> = {
  laptop: { center: [0.86, 1.02, -2.72], size: [0.68, 0.5, 0.52], label: "Focus session" },
  board: { center: [3.35, 0.78, -1.45], size: [0.95, 1.55, 0.95], label: "Today's plan" },
  clock: { center: [-1.5, 2.17, -3.44], size: [0.48, 1.12, 0.1], label: "Your day" },
  pinboard: { center: [-2.72, 1.74, -3.44], size: [1.62, 1.1, 0.08], label: "Your colleges" },
  compass: { center: [0.34, DESK_TOP + 0.05, -2.46], size: [0.16, 0.12, 0.2], label: "Your progress" },
  shelves: { center: [-4.08, 1.16, -1.1], size: [0.74, 2.32, 2.36], label: "Library" },
  reader: { center: [-2.55, 0.72, 0.28], size: [1.0, 1.45, 1.0], label: "Admissions news" },
  notebook: { center: [1.28, DESK_TOP + 0.03, -2.5], size: [0.36, 0.08, 0.3], label: "Weekly check-in" },
  cassette: { center: [0.06, DESK_TOP + 0.07, -2.5], size: [0.22, 0.16, 0.14], label: "Sound" },
  window: { center: [0.8, 2.12, -3.45], size: [2.7, 2.25, 0.2], label: "Take a breath" },
  lamp: { center: [0.12, DESK_TOP + 0.36, -2.94], size: [0.36, 0.72, 0.36], label: "Desk lamp" },
  cat: { center: [-1.55, 0.15, 1.25], size: [0.36, 0.3, 0.36], label: "Pet the cat" },
  door: { center: [4.45, 1.1, 1.55], size: [0.12, 2.2, 1.02], label: "Leave Zen" },
};

/**
 * The dashboard, as places in the room. Order is the index's order and the
 * number keys'; `side` is where the panel sits so it never covers the object.
 */
export const STATIONS: Array<{ id: StationId; title: string; key: string; side: "left" | "right" | "center" }> = [
  { id: "laptop", title: "Focus", key: "1", side: "right" },
  { id: "board", title: "Plan", key: "2", side: "right" },
  { id: "clock", title: "Today", key: "3", side: "right" },
  { id: "pinboard", title: "Colleges", key: "4", side: "right" },
  { id: "compass", title: "Progress", key: "5", side: "right" },
  { id: "shelves", title: "Library", key: "6", side: "right" },
  { id: "reader", title: "News", key: "7", side: "right" },
  { id: "notebook", title: "Check-in", key: "8", side: "left" },
  { id: "cassette", title: "Sound", key: "9", side: "right" },
  { id: "window", title: "Breathe", key: "0", side: "center" },
];

export const isStation = (id: HotspotId): id is StationId => STATIONS.some((s) => s.id === id);

export const COBALT = "#5f82ff";
