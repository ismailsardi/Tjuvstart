import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { GapFillItem } from '../content/types';
import { db } from '../data/db';
import { getProfile } from '../data/progress';
import { ITEMS_PER_SKILL, Placement } from './Placement';

const items: GapFillItem[] = vi.hoisted(() =>
  [800, 900, 1000, 1100, 1200, 1300, 1400].map((difficulty, i) => ({
    id: `p-${i}`,
    type: 'gap-fill',
    skill: 'writing',
    level: difficulty < 1000 ? 'A1' : 'A2',
    descriptors: ['A2-W-02'],
    difficulty,
    prompt: `Setning ${i}: jeg ___ i Oslo.`,
    answers: ['bor'],
  })),
);

vi.mock('../content/lessons', () => ({
  allItems: items,
  readingTextFor: () => undefined,
}));

describe('Placement', () => {
  it('asks adaptive questions, then shows and saves a starting level', async () => {
    const user = userEvent.setup();
    render(<Placement />);
    await user.click(screen.getByRole('button', { name: 'Start' }));

    for (let n = 1; n <= ITEMS_PER_SKILL; n++) {
      expect(screen.getByText(`Question ${n} of ${ITEMS_PER_SKILL}`)).toBeTruthy();
      await user.type(screen.getByLabelText('Missing word'), 'bor');
      await user.click(screen.getByRole('button', { name: 'Check' }));
      await user.click(await screen.findByRole('button', { name: 'Continue' }));
    }

    expect(await screen.findByText('Your starting level')).toBeTruthy();
    // Right answers all the way should place the learner above the default A2 start.
    expect(screen.getByTestId('placed-writing').textContent).toMatch(/B1|B2/);
    await vi.waitFor(async () => expect((await getProfile(db)).placedAt).toBeDefined());
  });
});
