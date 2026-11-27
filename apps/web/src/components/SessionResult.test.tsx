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

function renderResult(
  before: ProgressSnapshot,
  after: ProgressSnapshot,
  bestRun = 0,
  score = 3,
  total = 5,
) {
  render(
    <I18nProvider language="en">
      <SessionResult
        heading="Ferdig!"
        score={score}
        total={total}
        bestRun={bestRun}
        before={before}
        after={after}
      >
        <a href="#/">Back to Today</a>
      </SessionResult>
    </I18nProvider>,
  );
}

afterEach(cleanup);

describe('SessionResult', () => {
  it('shows the score, the run and how far the skill is toward the next level', () => {
    renderResult(snap({ answers: 5, rating: 820 }), snap({ answers: 10, rating: 860 }), 4);
    expect(screen.getByTestId('score-line').textContent).toBe(
      'You got 3 of 5 right. Your level estimate is up to date.',
    );
    expect(screen.getByTestId('best-run').textContent).toBe('4 right in a row');
    expect(screen.getByTestId('skill-change').textContent).toContain('On the way to A2');
    expect(screen.queryByTestId('gear-unlock')).toBeNull();
  });

  it('celebrates a new level, and gives the helmet only once A2 is held', () => {
    renderResult(snap({ answers: 15, rating: 880 }), snap({ answers: 20, rating: 1010 }));
    expect(screen.getByTestId('skill-change').textContent).toContain('New level: A2!');
    expect(screen.getByRole('heading', { name: 'Tusse got a horned helmet' })).toBeTruthy();
    expect(screen.getByTestId('gear-unlock').textContent).toContain(
      'One of your skills has held A2 over 20 answers.',
    );
  });

  it('gives no gear for a first estimate after a weak lesson, and says it was tough', () => {
    renderResult(snap({ answers: 0, rating: 800 }), snap({ answers: 5, rating: 960 }), 0, 5, 19);
    expect(screen.queryByTestId('gear-unlock')).toBeNull();
    expect(screen.getByTestId('score-line').textContent).toBe(
      'A tough one: 5 of 19 right. The ones you missed come back in your practice.',
    );
  });

  it('says so when it went well', () => {
    renderResult(snap({ answers: 5, rating: 820 }), snap({ answers: 10, rating: 860 }), 0, 9, 10);
    expect(screen.getByTestId('score-line').textContent).toBe(
      'You got 9 of 10 right. That went well.',
    );
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
