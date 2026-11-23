import { describe, expect, it } from 'vitest';
import { pickNextItem } from './picker';

const items = [
  { id: 'easy', difficulty: 600 },
  { id: 'fit', difficulty: 760 },
  { id: 'hard', difficulty: 1300 },
];

describe('pickNextItem', () => {
  it('picks the item closest to the target success rate', () => {
    expect(pickNextItem(1000, items)?.id).toBe('fit');
  });

  it('skips excluded items', () => {
    expect(pickNextItem(1000, items, { exclude: new Set(['fit']) })?.id).toBe('easy');
  });

  it('returns undefined when nothing is left', () => {
    expect(pickNextItem(1000, [])).toBeUndefined();
  });
});
