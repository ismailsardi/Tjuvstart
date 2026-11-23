import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDeck } from '../content/vocab';
import { db } from '../data/db';
import { DeckSession } from './DeckSession';

describe('DeckSession', () => {
  afterEach(async () => {
    cleanup();
    await Promise.all([db.cards.clear(), db.reviews.clear()]);
  });

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

  it('grades with the arrow keys but leaves browser shortcuts alone', async () => {
    const user = userEvent.setup();
    const deck = getDeck('a2-health');
    if (!deck) throw new Error('Deck missing');
    render(<DeckSession deckId="a2-health" />);
    expect(await screen.findByText(`Card 1 of ${deck.cards.length}`)).toBeTruthy();

    await user.keyboard('{Alt>}{ArrowLeft}{/Alt}');
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(screen.getByText(`Card 1 of ${deck.cards.length}`)).toBeTruthy();

    await user.keyboard('{ArrowRight}');
    expect(await screen.findByText(`Card 2 of ${deck.cards.length}`)).toBeTruthy();
  });
});
