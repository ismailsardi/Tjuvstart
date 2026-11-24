import { describe, expect, it } from 'vitest';
import { alphabet } from './alphabet';

describe('alphabet', () => {
  it('has the 29 Norwegian letters in order, each with an example that uses it', () => {
    expect(alphabet.map((l) => l.letter).join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ');
    for (const { letter, example } of alphabet) {
      expect(example).toContain(letter.toLowerCase());
    }
  });
});
