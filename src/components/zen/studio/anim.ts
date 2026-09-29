/*
 * The single mutable record the choreography writes and the scene reads.
 * GSAP tweens these plain numbers; components pick them up in useFrame, so the
 * whole build-up runs without a React render per frame.
 */
export type Anim = {
  /** World height of the blueprint drafting line. */
  draw: number;
  /** World height of the materialising scan. */
  scan: number;
  /** Pixel clouds (blueprint atmosphere), 0..1. */
  pix: number;
  /** Dust in the light (study atmosphere), 0..1. */
  dust: number;
  lamp: number;
  hang: number;
  neon: number;
  moon: number;
  strip: number;
  screen: number;
  /** Camera entrance progress along the intro path, 0..1. */
  cam: number;
  /** Cat squash, 0..1, pulsed on a pet. */
  pet: number;
  /** Rain outside the window, 0..1; follows the sound. */
  rain: number;
  /** Daylight, 0..1: 1 is the sunlit studio, 0 the night-time one. */
  day: number;
  /** Depth of field, 0..1, and the distance it is focused at (m). The camera writes both. */
  dof: number;
  focus: number;
  /** 1 while the camera is at rest on a view; the quality monitor only measures then. */
  settled: number;
};

export const createAnim = (): Anim => ({
  draw: -0.5,
  scan: -0.5,
  pix: 0,
  dust: 0,
  lamp: 0,
  hang: 0,
  neon: 0,
  moon: 0,
  strip: 0,
  screen: 0,
  cam: 0,
  pet: 0,
  rain: 0,
  day: 1,
  dof: 0,
  focus: 2,
  settled: 0,
});

/**
 * The sun through drifting cloud: 1 in the open, dipping to about 0.8 as a
 * cloud goes over, slowly and never in step with anything else. By day only.
 */
export const cloudShade = (t: number, day: number) => {
  const c = 0.5 + 0.5 * Math.sin(t * 0.17 + Math.sin(t * 0.06) * 2.2);
  return 1 - 0.2 * day * Math.pow(c, 1.6);
};

/** Room height plus headroom: a scan here has passed everything. */
export const TOP = 5.7;
export const BOTTOM = -0.5;
