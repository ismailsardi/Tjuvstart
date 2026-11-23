import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
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
    expect(screen.getByText('Question 1 sur 15')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Utvikler' }));
    expect(await screen.findByText('Correct !')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Continuer' }));

    await user.click(screen.getByRole('button', { name: 'Sjefen til Sara' }));
    expect(await screen.findByText(/veut dire la même chose/)).toBeTruthy();
  });
});
