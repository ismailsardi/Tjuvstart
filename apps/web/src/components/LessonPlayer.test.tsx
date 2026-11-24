import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { db } from '../data/db';
import { getLesson } from '../content/lessons';
import { learnerPacks } from '../content/packs';
import type { Lesson } from '../content/types';
import { I18nProvider } from '../i18n/I18nProvider';
import { LessonPlayer } from './LessonPlayer';

const lesson: Lesson = {
  id: 'test-lesson',
  level: 'A2',
  title: 'Test',
  summary: 'Test lesson',
  text: 'Jeg har en jobb.',
  items: [
    {
      id: 't-1',
      type: 'gap-fill',
      skill: 'writing',
      level: 'A2',
      descriptors: ['A2-W-02'],
      difficulty: 1000,
      prompt: 'Jeg ___ i Oslo.',
      answers: ['bor'],
    },
    {
      id: 't-2',
      type: 'word-order',
      skill: 'writing',
      level: 'A2',
      descriptors: ['A2-W-02'],
      difficulty: 1000,
      prompt: 'Lag en setning.',
      tokens: ['har', 'vi', 'Etter lunsj'],
      answer: 'Etter lunsj har vi',
    },
  ],
};

// Unmount after each test so live queries don't update a torn-down DOM.
afterEach(cleanup);

describe('LessonPlayer', () => {
  it('checks answers, shows feedback and ends with a score', async () => {
    const user = userEvent.setup();
    render(<LessonPlayer lesson={lesson} />);

    await user.type(screen.getByLabelText('Missing word'), 'bor');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByText('Correct!')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    for (const word of ['vi', 'Etter lunsj', 'har']) {
      await user.click(screen.getByRole('button', { name: word }));
    }
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByText(/Not quite/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText(/You got 1 of 2 right/)).toBeTruthy();

    // Finishing marks the lesson as completed and adds its A2 words to the word cards.
    await vi.waitFor(async () =>
      expect(await db.completions.get('test-lesson')).toMatchObject({ bestScore: 1, total: 2 }),
    );
    expect(await db.cards.get('jobb')).toBeTruthy();
    expect(await db.cards.get('jeg')).toBeUndefined();
    expect(await screen.findByText(/1 new word was added/)).toBeTruthy();
  });
});

describe('LessonPlayer with language packs', () => {
  it('uses the French interface, marks familiar words and shows notes in French', async () => {
    const user = userEvent.setup();
    const real = getLesson('a2-first-day-at-work');
    if (!real) throw new Error('Sample lesson missing');
    const { container } = render(
      <I18nProvider language="fr">
        <LessonPlayer lesson={real} packs={learnerPacks('fr', ['en'])} />
      </I18nProvider>,
    );

    const marked = [...container.querySelectorAll('.reading-text mark')].map((m) => m.textContent);
    expect(marked).toContain('prosjekt');
    expect(
      screen.getByRole('heading', { name: 'Mots que vous connaissez probablement' }),
    ).toBeTruthy();
    expect(screen.getAllByText(/Astuce/, { selector: 'summary' }).length).toBe(3);
    expect(screen.getByText(`Question 1 sur ${real.items.length}`)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Utvikler' }));
    expect(await screen.findByText('Correct !')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Continuer' }));

    await user.click(screen.getByRole('button', { name: 'Sjefen til Sara' }));
    expect(await screen.findByText(/veut dire la même chose/)).toBeTruthy();
  });
});

describe('LessonPlayer with a real-world text', () => {
  it('shows the text as a document with where it comes from', () => {
    const real = getLesson('a2-nav-letter');
    if (!real?.document) throw new Error('NAV letter missing');
    render(<LessonPlayer lesson={real} />);
    const doc = screen.getByTestId('document');
    expect(doc.className).toContain('doc-letter');
    expect(doc.textContent).toContain('Real-world text, simplified to A2');
    expect(doc.textContent).toContain('Letter');
    expect(doc.textContent).toContain(`From: ${real.document.from ?? ''}`);
  });
});
