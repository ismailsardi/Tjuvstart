import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { db } from '../data/db';
import { Home } from './Home';

describe('Home', () => {
  it('marks completed lessons with the best score', async () => {
    await db.completions.put({
      lessonId: 'a2-calling-in-sick',
      bestScore: 10,
      total: 12,
      firstCompletedAt: 1,
      lastCompletedAt: 1,
    });
    render(<Home />);

    expect((await screen.findByTestId('completed-a2-calling-in-sick')).textContent).toContain(
      'best score 10/12',
    );
    expect(screen.queryByTestId('completed-a2-first-day-at-work')).toBeNull();
  });
});
