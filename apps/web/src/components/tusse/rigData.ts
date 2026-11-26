import type { TussePose } from '../Tusse';

type Point = readonly [number, number];

/**
 * Room around the 400 × 440 art for hops, raised arms and hats: the rig's canvas covers 440 × 524
 * units, with the art 20 in from the left and 80 down from the top.
 */
export const PAD = { x: 20, y: 80, w: 440, h: 524 } as const;

/** Where each bone turns, in the art's 400 × 440 space. A bone a pose doesn't use sits at 0,0. */
export interface PoseRig {
  piv: Record<'earL' | 'earR' | 'armA' | 'tail' | 'head' | 'armB' | 'armC', Point>;
  /** The two eyes as centre x, centre y, radius x, radius y, for poses with open eyes. */
  eyes: readonly [readonly number[], readonly number[]] | null;
  /** Size match for poses drawn wider than the rest: x scale, y scale, source and target centre x. */
  fit?: readonly [number, number, number, number];
}

// Measured on the art by the rig's build scripts (kept with the source files, outside the repo).
export const RIG: Record<TussePose, PoseRig> = {
  rest: {
    piv: {
      earL: [95, 172],
      earR: [270, 150],
      armA: [288, 246],
      tail: [292, 372],
      head: [190, 262],
      armB: [72, 315],
      armC: [284, 315],
    },
    eyes: [
      [138, 172, 33, 35],
      [230, 167, 30, 35],
    ],
    fit: [0.86, 1.035, 175.5, 197],
  },
  wave: {
    piv: {
      earL: [95, 172],
      earR: [270, 150],
      armA: [288, 246],
      tail: [292, 372],
      head: [190, 262],
      armB: [72, 315],
      armC: [284, 315],
    },
    eyes: [
      [138, 172, 33, 35],
      [230, 167, 30, 35],
    ],
    fit: [0.86, 1.035, 175.5, 197],
  },
  thumbs: {
    piv: {
      earL: [102, 160],
      earR: [262, 135],
      armA: [284, 240],
      tail: [276, 365],
      head: [190, 240],
      armB: [105, 300],
      armC: [0, 0],
    },
    eyes: [
      [164, 148, 27, 29],
      [234, 141, 25, 28],
    ],
  },
  shrug: {
    piv: {
      earL: [120, 150],
      earR: [258, 140],
      armA: [0, 0],
      tail: [270, 362],
      head: [190, 230],
      armB: [120, 228],
      armC: [260, 228],
    },
    eyes: [
      [162, 156, 26, 29],
      [232, 144, 25, 28],
    ],
  },
  cheer: {
    piv: {
      earL: [0, 0],
      earR: [0, 0],
      armA: [0, 0],
      tail: [274, 362],
      head: [190, 215],
      armB: [128, 250],
      armC: [266, 250],
    },
    eyes: null,
  },
  coffee: {
    piv: {
      earL: [127, 135],
      earR: [266, 130],
      armA: [190, 300],
      tail: [280, 322],
      head: [190, 215],
      armB: [0, 0],
      armC: [0, 0],
    },
    eyes: null,
  },
  sleep: {
    piv: {
      earL: [90, 312],
      earR: [208, 255],
      armA: [0, 0],
      tail: [364, 330],
      head: [255, 385],
      armB: [0, 0],
      armC: [0, 0],
    },
    eyes: null,
  },
};
