import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getItem } from '../content/lessons';
import { recordAnswer } from '../data/progress';
import { Practice, PRACTICE_SIZE } from './Practice';

describe('Practice', () => {
  it('starts with the item the learner missed last', async () => {
    const missed = getItem('a2-sick-11')!;
    await recordAnswer(missed, 'calling-in-sick', false);
    render(<Practice />);

    expect(await screen.findByText(`Question 1 of ${PRACTICE_SIZE}`)).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(missed.prompt);
  });
});
