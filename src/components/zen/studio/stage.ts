/*
 * The study's layout and choreography constants, in one place so the scene,
 * the camera and the HUD all agree on where things are.
 *
 * Units are metres. The floor is y = 0, the back wall (with the window) is
 * z = -3.5, the wood-slat wall is x = -4.5, the right wall (door, directory)
 * is x = 4.5. The camera looks in from the open +z side.
 */

export type Vec3 = [number, number, number];

/** Every close-up the camera can move to. Each one is a station of the app. */
export type View =
  | "home"
  | "walk"
  | "laptop"
  | "board"
  | "notebook"
  | "phone"
  | "compass"
  | "clock"
  | "calendar"
  | "pinboard"
  | "shelves"
  | "books"
  | "trophy"
  | "reader"
  | "cassette"
  | "window"
  | "door";

export type StationId = Exclude<View, "home" | "walk">;

/** Stations, plus the objects that do something in place. */
export type HotspotId = StationId | "cat" | "lamp";

export const ROOM = { halfW: 4.5, back: -3.5, front: 6.6, height: 4.8 };

/**
 * The mezzanine over the entry bay: a deck at the height of the first floor's
 * ceiling, reached by a straight steel stair up the slat wall. Everything
 * under it is the front lounge; everything on it is upstairs.
 */
export const LOFT = { y: 2.3, thick: 0.16, z0: 3.7, z1: ROOM.front };

/** The stair: a straight flight against the left wall, rising toward the deck. */
export const STAIR = { x0: -4.42, x1: -3.52, z0: 0.15, z1: LOFT.z0, rise: LOFT.y, steps: 13 };

/** The terrace outside the glass wall: deck, rail, table, lights. */
export const TERRACE = { z0: ROOM.front, z1: ROOM.front + 3.0 };

export const DESK_TOP = 0.788;

/** The shelving unit: where it stands, and how a spot on it maps to the room. */
export const SHELF_AT: Vec3 = [-4.06, 0, -1.8];
/** A point in the shelves' own frame (x along the unit, y up, z out) in room space. */
export const onShelf = (x: number, y: number, z = 0): Vec3 => [SHELF_AT[0] + z, SHELF_AT[1] + y, SHELF_AT[2] - x];

export const PLACE = {
  desk: { pos: [0.8, 0, -2.78] as Vec3, rot: 0 },
  chair: { pos: [0.72, 0, -1.72] as Vec3, rot: Math.PI + 0.42 },
  laptop: { pos: [0.86, DESK_TOP, -2.66] as Vec3, rot: -0.06 },
  lamp: { pos: [0.02, DESK_TOP, -3.02] as Vec3 },
  notebook: { pos: [1.28, DESK_TOP, -2.5] as Vec3, rot: 0.18 },
  stationery: { pos: [1.62, DESK_TOP, -2.98] as Vec3, rot: -0.3 },
  compass: { pos: [0.34, DESK_TOP, -2.46] as Vec3, rot: 0.5 },
  cassette: { pos: [0.06, DESK_TOP, -2.5] as Vec3, rot: 0.35 },
  /** Lying face up at the front of the desk, left of the laptop. */
  phone: { pos: [0.5, DESK_TOP, -2.2] as Vec3, rot: 0.28 },
  deskPlant: { pos: [1.74, DESK_TOP, -2.66] as Vec3, rot: 0.4 },
  shelves: { pos: SHELF_AT, rot: Math.PI / 2 },
  /** Prep books, stacked flat on the lowest shelf (shelf-local x, y). */
  books: { local: [0.4, 1.315] as [number, number] },
  /** The cup on top of the shelves (shelf-local x, y). */
  trophy: { local: [-0.4, 3.315] as [number, number] },
  armchair: { pos: [-2.55, 0, 0.3] as Vec3, rot: 0.78 },
  hangingLamp: { pos: [-2.75, 4.52, 0.05] as Vec3 },
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
  /** The building directory beside the door, on the right wall. */
  directory: { pos: [4.49, 1.48, 0.5] as Vec3, size: [0.46, 0.62] as [number, number] },
};

const BOOKS_AT = onShelf(PLACE.books.local[0], PLACE.books.local[1]);
const TROPHY_AT = onShelf(PLACE.trophy.local[0], PLACE.trophy.local[1]);

export const VIEWS: Record<Exclude<View, "walk">, { pos: Vec3; target: Vec3; fov?: number }> = {
  home: { pos: [1.05, 1.62, 5.0], target: [-1.07, 1.33, -1.29], fov: 57 },
  laptop: { pos: [0.83, 1.2, -1.72], target: [0.86, 1.02, -2.72], fov: 40 },
  board: { pos: [1.79, 1.28, 0.63], target: [3.71, 0.92, -1.18], fov: 40 },
  notebook: { pos: [0.92, 1.4, -1.66], target: [1.5, 0.84, -2.5], fov: 40 },
  phone: { pos: [0.3, 1.3, -1.55], target: [0.62, 0.8, -2.3], fov: 36 },
  compass: { pos: [0.66, 1.1, -1.82], target: [0.22, 0.87, -2.5], fov: 40 },
  clock: { pos: [-0.8, 2.22, -1.2], target: [-1.12, 2.3, -3.5], fov: 42 },
  calendar: { pos: [-0.85, 1.78, -1.55], target: [-1.18, 1.76, -3.47], fov: 40 },
  pinboard: { pos: [-2.35, 1.72, -0.62], target: [-2.5, 1.68, -3.47], fov: 44 },
  shelves: { pos: [-2.5, 1.95, -0.55], target: [-4.2, 1.9, -0.6], fov: 36 },
  books: { pos: [-2.15, 1.6, -1.05], target: [BOOKS_AT[0] - 0.13, BOOKS_AT[1] + 0.12, BOOKS_AT[2]], fov: 38 },
  trophy: { pos: [-2.0, 3.0, -0.35], target: [TROPHY_AT[0] - 0.14, TROPHY_AT[1] + 0.12, TROPHY_AT[2]], fov: 38 },
  reader: { pos: [-0.62, 1.42, 2.25], target: [-2.18, 0.98, -0.02], fov: 38 },
  cassette: { pos: [-0.22, 1.08, -1.82], target: [0.26, 0.86, -2.5], fov: 40 },
  window: { pos: [0.8, 1.62, -0.55], target: [0.8, 2.0, -5.0], fov: 45 },
  door: { pos: [3.0, 1.5, 0.1], target: [4.5, 1.35, 0.45], fov: 50 },
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
  notebook: { center: [1.28, DESK_TOP + 0.03, -2.5], size: [0.36, 0.08, 0.3], label: "Essays and applications" },
  phone: { center: [0.5, DESK_TOP + 0.02, -2.2], size: [0.16, 0.06, 0.2], label: "Messages" },
  compass: { center: [0.34, DESK_TOP + 0.05, -2.46], size: [0.16, 0.12, 0.2], label: "Your journey" },
  clock: { center: [-1.5, 2.5, -3.44], size: [0.44, 0.44, 0.1], label: "Your day" },
  calendar: { center: [-1.5, 1.8, -3.44], size: [0.44, 0.56, 0.1], label: "This week" },
  pinboard: { center: [-2.72, 1.74, -3.44], size: [1.62, 1.1, 0.08], label: "Your colleges" },
  shelves: { center: onShelf(-1.22, 1.99, -0.14), size: [0.3, 0.36, 0.62], label: "Documents" },
  books: { center: [BOOKS_AT[0] - 0.13, BOOKS_AT[1] + 0.12, BOOKS_AT[2]], size: [0.3, 0.26, 0.4], label: "Test prep" },
  trophy: { center: [TROPHY_AT[0] - 0.14, TROPHY_AT[1] + 0.15, TROPHY_AT[2]], size: [0.24, 0.32, 0.24], label: "Activities and awards" },
  reader: { center: [-2.58, 0.86, 0.26], size: [1.05, 1.72, 1.05], label: "The news desk" },
  cassette: { center: [0.06, DESK_TOP + 0.07, -2.5], size: [0.22, 0.16, 0.14], label: "Sound" },
  window: { center: [0.8, 2.12, -3.45], size: [2.7, 2.25, 0.2], label: "Take a breath" },
  lamp: { center: [0.12, DESK_TOP + 0.36, -2.94], size: [0.36, 0.72, 0.36], label: "Desk lamp" },
  cat: { center: [-1.55, 0.15, 1.25], size: [0.36, 0.3, 0.36], label: "Pet the cat" },
  door: { center: [4.44, 1.15, 1.05], size: [0.14, 2.3, 2.1], label: "Go anywhere" },
};

/** The parts of the room. Each station belongs to one; the index groups by them. */
export const ZONES = [
  { id: "desk", title: "The desk" },
  { id: "wall", title: "The back wall" },
  { id: "shelves", title: "The shelves" },
  { id: "chair", title: "The reading chair" },
  { id: "room", title: "Around the room" },
] as const;

export type ZoneId = (typeof ZONES)[number]["id"];

/**
 * The app, as places in the room. Order is the index's order; `key` flies
 * there; `side` is where the panel sits so it never covers the object, and
 * `place` names the object, the way a label on a museum wall would.
 */
export const STATIONS: Array<{
  id: StationId;
  title: string;
  key: string;
  zone: ZoneId;
  place: string;
  side: "left" | "right" | "center";
}> = [
  { id: "laptop", title: "Focus", key: "1", zone: "desk", place: "The laptop", side: "right" },
  { id: "board", title: "Plan", key: "2", zone: "desk", place: "The chalkboard", side: "right" },
  { id: "notebook", title: "Essays", key: "3", zone: "desk", place: "The binder", side: "right" },
  { id: "phone", title: "Messages", key: "4", zone: "desk", place: "Your phone", side: "right" },
  { id: "compass", title: "Journey", key: "5", zone: "desk", place: "The compass", side: "right" },
  { id: "clock", title: "Today", key: "6", zone: "wall", place: "The clock", side: "right" },
  { id: "calendar", title: "This week", key: "7", zone: "wall", place: "The calendar", side: "right" },
  { id: "pinboard", title: "Colleges", key: "8", zone: "wall", place: "The pinboard", side: "right" },
  { id: "shelves", title: "Documents", key: "9", zone: "shelves", place: "The binders", side: "right" },
  { id: "books", title: "Test prep", key: "0", zone: "shelves", place: "The prep books", side: "right" },
  { id: "trophy", title: "Activities", key: "A", zone: "shelves", place: "The trophy", side: "right" },
  { id: "reader", title: "News", key: "N", zone: "chair", place: "The reading chair", side: "right" },
  { id: "cassette", title: "Sound", key: "S", zone: "room", place: "The cassette player", side: "right" },
  { id: "window", title: "Breathe", key: "W", zone: "room", place: "The window", side: "center" },
  { id: "door", title: "Directory", key: "D", zone: "room", place: "Beside the door", side: "left" },
];

/** The station a key press flies to, if any. Letters match either case. */
export const stationForKey = (key: string) =>
  key.length === 1 ? STATIONS.find((s) => s.key === key.toUpperCase()) : undefined;

export const isStation = (id: HotspotId): id is StationId => STATIONS.some((s) => s.id === id);

/**
 * The key light, through the window: the sun by day, the moon at night. Its
 * shadows and the shafts of light in the air are both worked from this.
 */
export const SUN = { pos: [-0.6, 6.4, -10.5] as Vec3, target: [1.2, 0, -0.4] as Vec3 };

/** Pathforge's editorial blue, the room's one accent. */
export const BLUE = "#4465d8";
