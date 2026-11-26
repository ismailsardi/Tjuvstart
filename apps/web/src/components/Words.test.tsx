import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { jobDeck, deckId } from '../content/vocab';
import { db } from '../data/db';
import { getProfile } from '../data/progress';
import { Words } from './Words';

afterEach(async () => {
  cleanup();
  await db.profiles.clear();
});

describe('Words', () => {
  it('asks for a line of work, then shows only that job deck', async () => {
    const user = userEvent.setup();
    render(<Words />);

    const health = deckId(jobDeck('health')!);
    const it_ = deckId(jobDeck('it')!);
    await user.click(await screen.findByRole('button', { name: /^Health and care/ }));

    expect(await screen.findByTestId(`deck-${health}`)).toBeTruthy();
    expect(screen.queryByTestId(`deck-${it_}`)).toBeNull();
    expect((await getProfile()).jobField).toBe('health');

    // "Change" brings the choices back.
    await user.click(screen.getByRole('button', { name: 'Change' }));
    await user.click(screen.getByRole('button', { name: /^IT and software/ }));
    expect(await screen.findByTestId(`deck-${it_}`)).toBeTruthy();
    expect(screen.queryByTestId(`deck-${health}`)).toBeNull();
  });
});
