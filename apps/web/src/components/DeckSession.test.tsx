import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getDeck } from '../content/vocab';
import { db } from '../data/db';
import { DeckSession } from './DeckSession';

describe('DeckSession', () => {
  it('flips cards and records "know it" and "again" answers', async () => {
    const user = userEvent.setup();
    const deck = getDeck('a2-health');
    if (!deck) throw new Error('Deck missing');
    render(<DeckSession deckId="a2-health" />);

    expect(await screen.findByText(`Card 1 of ${deck.cards.length}`)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Flip' }));
    expect(screen.getByTestId('swipe-card').getAttribute('aria-pressed')).toBe('true');

    await user.click(screen.getByRole('button', { name: 'Know it' }));
    await vi.waitFor(async () => expect((await db.cards.get('syk'))?.reps).toBe(1));

    await user.click(screen.getByRole('button', { name: 'Again' }));
    await vi.waitFor(async () => expect((await db.cards.get('feber'))?.reps).toBe(0));
    // The missed card is added to the end of the session.
    expect(await screen.findByText(`Card 3 of ${deck.cards.length + 1}`)).toBeTruthy();
  });
});
