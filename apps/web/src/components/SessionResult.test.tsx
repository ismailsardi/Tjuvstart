import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { newGuestProfile } from '../data/progress';
import { I18nProvider } from '../i18n/I18nProvider';
import { SessionResult } from './SessionResult';
import type { ProgressSnapshot } from './useProgressSnapshot';

function snap(reading: { answers: number; rating: number }, longest = 0): ProgressSnapshot {
  const profile = newGuestProfile(0);
  return {
    longest,
    profile: {
      ...profile,
      answers: { ...profile.answers, reading: reading.answers },
      ratings: { ...profile.ratings, reading: reading.rating },
    },
    canDo: new Map(),
  };
}

function renderResult(before: ProgressSnapshot, after: ProgressSnapshot, bestRun = 0) {
  render(
    <I18nProvider language="en">
      <SessionResult
        heading="Ferdig!"
        score={4}
        total={5}
        bestRun={bestRun}
        before={before}
        after={after}
      >
        <a href="#/">Back to home</a>
      </SessionResult>
    </I18nProvider>,
  );
}

afterEach(cleanup);

describe('SessionResult', () => {
  it('shows the score, the run and how far the skill is toward the next level', () => {
    renderResult(snap({ answers: 5, rating: 820 }), snap({ answers: 10, rating: 860 }), 4);
    expect(
      screen.getByText('You got 4 of 5 right. Your level estimate has been updated.'),
    ).toBeTruthy();
    expect(screen.getByTestId('best-run').textContent).toBe('4 right in a row');
    expect(screen.getByTestId('skill-change').textContent).toContain('On the way to A2');
    expect(screen.queryByTestId('gear-unlock')).toBeNull();
  });

  it('celebrates a new level and the helmet the troll gets for it', () => {
    renderResult(snap({ answers: 5, rating: 880 }), snap({ answers: 10, rating: 910 }));
    expect(screen.getByTestId('skill-change').textContent).toContain('New level: A2!');
    expect(screen.getByRole('heading', { name: 'Tusse got a horned helmet' })).toBeTruthy();
  });

  it('gives the scarf when the streak first reaches three days, under the chosen name', () => {
    const before = snap({ answers: 5, rating: 820 }, 2);
    const after = snap({ answers: 10, rating: 840 }, 3);
    after.profile.trollName = 'Knut';
    renderResult(before, after);
    expect(screen.getByRole('heading', { name: 'Knut got a knitted scarf' })).toBeTruthy();
    expect(screen.getByTestId('gear-unlock').textContent).toContain('For a 3-day streak.');
    expect(screen.getByRole('link', { name: 'Change outfit' }).getAttribute('href')).toBe(
      '#/troll',
    );
  });

  it('does not give the scarf again after a break', () => {
    const before = snap({ answers: 5, rating: 820 }, 1);
    before.profile.bestStreak = 4;
    const after = snap({ answers: 10, rating: 840 }, 3);
    after.profile.bestStreak = 4;
    renderResult(before, after);
    expect(screen.queryByTestId('gear-unlock')).toBeNull();
  });

  it('leaves out runs under three', () => {
    renderResult(snap({ answers: 5, rating: 820 }), snap({ answers: 10, rating: 860 }), 2);
    expect(screen.queryByTestId('best-run')).toBeNull();
  });
});
