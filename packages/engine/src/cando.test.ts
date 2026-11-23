import { describe, expect, it } from 'vitest';
import { canDoStatus } from './cando';

describe('canDoStatus', () => {
  it('needs answers before anything else', () => {
    expect(canDoStatus([])).toBe('not-started');
  });

  it('needs enough different items', () => {
    expect(canDoStatus([true, true])).toBe('practising');
    expect(canDoStatus([true, true, true])).toBe('can-do');
  });

  it('needs most latest answers right', () => {
    expect(canDoStatus([true, true, true, false])).toBe('practising');
    expect(canDoStatus([true, true, true, true, false])).toBe('can-do');
  });
});
