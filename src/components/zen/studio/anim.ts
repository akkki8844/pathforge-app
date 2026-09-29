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
});

/** Room height plus headroom: a scan here has passed everything. */
export const TOP = 4.8;
export const BOTTOM = -0.5;
