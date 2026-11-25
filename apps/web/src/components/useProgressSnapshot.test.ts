import { describe, expect, it } from 'vitest';
import { newGuestProfile } from '../data/progress';
import { skillChanges, type ProgressSnapshot } from './useProgressSnapshot';

function snap(answers: Partial<Record<string, number>>, ratings: Partial<Record<string, number>>) {
  const profile = newGuestProfile(0);
  return {
    profile: {
      ...profile,
      answers: { ...profile.answers, ...answers },
      ratings: { ...profile.ratings, ...ratings },
    },
    canDo: new Map(),
  } as ProgressSnapshot;
}

describe('skillChanges', () => {
  it('lists only skills answered this session that have an estimate', () => {
    const before = snap({ reading: 6, listening: 2, writing: 9 }, { reading: 950 });
    const after = snap({ reading: 8, listening: 3, writing: 9 }, { reading: 990 });
    expect(skillChanges(before, after)).toEqual([{ skill: 'reading', before: 950, after: 990 }]);
  });

  it('includes a skill that reaches the estimate threshold during the session', () => {
    const before = snap({ listening: 3 }, { listening: 900 });
    const after = snap({ listening: 5 }, { listening: 940 });
    expect(skillChanges(before, after).map((c) => c.skill)).toEqual(['listening']);
  });
});
