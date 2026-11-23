import { describe, expect, it } from 'vitest';
import { buildSession } from './session';

const items = [
  { id: 'r1', skill: 'reading', difficulty: 900 },
  { id: 'r2', skill: 'reading', difficulty: 1000 },
  { id: 'r3', skill: 'reading', difficulty: 1100 },
  { id: 'w1', skill: 'writing', difficulty: 900, focus: ['v2-word-order'] },
  { id: 'w2', skill: 'writing', difficulty: 1000, focus: ['v2-word-order'] },
  { id: 'w3', skill: 'writing', difficulty: 1000, focus: ['noun-gender'] },
  { id: 'w4', skill: 'writing', difficulty: 1200 },
];

describe('buildSession', () => {
  it('starts with items that target recurring mistakes, missed ones first', () => {
    const session = buildSession(
      items,
      { reading: 1000, writing: 1000 },
      {
        size: 4,
        recurring: ['v2-word-order'],
        missed: ['w2'],
      },
    );
    expect(session.slice(0, 2).map((i) => i.id)).toEqual(['w2', 'w1']);
    expect(session).toHaveLength(4);
  });

  it('fills the session from the weakest skill first', () => {
    const session = buildSession(items, { reading: 1300, writing: 800 }, { size: 1 });
    expect(session[0]?.skill).toBe('writing');
  });

  it('never repeats an item or uses excluded ones', () => {
    const session = buildSession(
      items,
      { reading: 1000, writing: 1000 },
      {
        size: 10,
        exclude: new Set(['r1']),
      },
    );
    const ids = session.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain('r1');
    expect(ids).toHaveLength(items.length - 1);
  });
});
