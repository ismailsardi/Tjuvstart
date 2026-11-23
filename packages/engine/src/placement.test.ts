import { describe, expect, it } from 'vitest';
import { DEFAULT_RATING } from './rating';
import { nextPlacementItem, recordPlacementAnswer, startPlacement } from './placement';

const items = [800, 900, 1000, 1100, 1200, 1300].flatMap((difficulty) => [
  { id: `r${difficulty}`, skill: 'reading', difficulty },
  { id: `w${difficulty}`, skill: 'writing', difficulty },
]);

describe('placement', () => {
  it('alternates skills and stops after the requested number per skill', () => {
    let state = startPlacement(['reading', 'writing']);
    const skills: string[] = [];
    for (
      let item = nextPlacementItem(state, items, 3);
      item;
      item = nextPlacementItem(state, items, 3)
    ) {
      skills.push(item.skill);
      state = recordPlacementAnswer(state, item, true);
    }
    expect(skills).toHaveLength(6);
    expect(skills.filter((s) => s === 'reading')).toHaveLength(3);
  });

  it('moves quickly towards the learner: up after right answers, down after wrong ones', () => {
    let strong = startPlacement(['reading']);
    let weak = startPlacement(['reading']);
    for (let i = 0; i < 4; i++) {
      const a = nextPlacementItem(strong, items, 4)!;
      strong = recordPlacementAnswer(strong, a, true);
      const b = nextPlacementItem(weak, items, 4)!;
      weak = recordPlacementAnswer(weak, b, false);
    }
    expect(strong.ratings.reading).toBeGreaterThan(DEFAULT_RATING + 80);
    expect(weak.ratings.reading).toBeLessThan(DEFAULT_RATING - 80);
  });
});
