import { describe, expect, it } from 'vitest';
import { canDoText, descriptors, trackedDescriptors } from './descriptors';
import { learnerPacks } from './packs';

describe('can-do statements', () => {
  const reading = descriptors.find((d) => d.id === 'A2-R-02')!;

  it('are in the learner’s language, in the first person', () => {
    expect(canDoText(reading, learnerPacks('fr', [])).text).toMatch(/^Je peux/);
    expect(canDoText(reading, []).text).toMatch(/^I can/);
  });

  it('track only descriptors that exercises check', () => {
    expect(trackedDescriptors.map((d) => d.id)).toContain('A2-R-02');
    expect(trackedDescriptors.every((d) => d.skill !== 'speaking')).toBe(true);
  });
});
