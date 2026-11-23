/**
 * Listening speed. Audio starts a little slower than natural speech and speeds up as the
 * learner shows they can follow it: three right answers in a row move one step up, a wrong
 * answer moves one step down.
 */

/** Playback rates, from slow to faster than natural speech. */
export const LISTENING_RATES = [0.75, 0.85, 1, 1.15, 1.3] as const;
export const DEFAULT_LISTENING_RATE = 0.85;
export const CORRECT_IN_A_ROW_TO_SPEED_UP = 3;

export interface ListeningSpeed {
  rate: number;
  /** Right answers in a row at the current rate. */
  streak: number;
}

export const DEFAULT_LISTENING_SPEED: ListeningSpeed = { rate: DEFAULT_LISTENING_RATE, streak: 0 };

function stepOf(rate: number): number {
  // Snap unknown rates to the closest step, so a changed list never strands a learner.
  let best = 0;
  LISTENING_RATES.forEach((r, i) => {
    if (Math.abs(r - rate) < Math.abs(LISTENING_RATES[best]! - rate)) best = i;
  });
  return best;
}

export function updateListeningSpeed(speed: ListeningSpeed, correct: boolean): ListeningSpeed {
  const step = stepOf(speed.rate);
  if (!correct) {
    return { rate: LISTENING_RATES[Math.max(0, step - 1)]!, streak: 0 };
  }
  const streak = speed.streak + 1;
  if (streak >= CORRECT_IN_A_ROW_TO_SPEED_UP && step < LISTENING_RATES.length - 1) {
    return { rate: LISTENING_RATES[step + 1]!, streak: 0 };
  }
  return { rate: LISTENING_RATES[step]!, streak };
}
