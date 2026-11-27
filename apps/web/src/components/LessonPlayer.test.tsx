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

describe('LessonPlayer layout', () => {
  it('keeps the text in view for reading questions and folds it for the rest', async () => {
    const user = userEvent.setup();
    const real = getLesson('a2-first-day-at-work');
    if (!real) throw new Error('Sample lesson missing');
    const reading = real.items.findIndex((item) => item.skill === 'reading');
    const writing = real.items.findIndex((item) => item.skill === 'writing');
    const items = [real.items[reading]!, real.items[writing]!];
    const { container } = render(
      <LessonPlayer lesson={{ ...real, id: 'layout-lesson', items }} packs={learnerPacks('en')} />,
    );

    // A reading question: the text is open, and the word help comes after the answers.
    expect(screen.queryByTestId('text-toggle')).toBeNull();
    expect(container.querySelector('.reading-text')).toBeTruthy();
    const answers = screen.getByRole('group', { name: 'Answer options' });
    const help = container.querySelector('.word-help');
    expect(help).toBeTruthy();
    expect(answers.compareDocumentPosition(help!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(answers.querySelectorAll('button')[1]!);
    await user.click(await screen.findByRole('button', { name: 'Continue' }));

    // A writing exercise: the text is folded behind «Show the text», without the glossaries.
    const toggle = screen.getByTestId('text-toggle');
    expect(toggle.hasAttribute('open')).toBe(false);
    expect(toggle.querySelector('.reading-text')).toBeTruthy();
    expect(container.querySelector('.glossary')).toBeNull();
  });

  it('does not offer the text on a dictation, since it holds the answer', async () => {
    const real = getLesson('a2-calling-in-sick');
    if (!real) throw new Error('Sample lesson missing');
    const dictation = real.items.find((item) => item.type === 'dictation');
    if (!dictation?.audio || !real.text?.includes(dictation.audio.replace(/[.!?]$/, ''))) {
      throw new Error('Expected a dictation whose sentence is in the lesson text');
    }
    const { container } = render(
      <LessonPlayer lesson={{ ...real, id: 'listening-lesson', items: [dictation] }} />,
    );
    expect(screen.queryByTestId('text-toggle')).toBeNull();
    expect(container.querySelector('.reading-text')).toBeNull();
  });

  it('accepts the whole sentence typed into a gap', async () => {
    const user = userEvent.setup();
    render(<LessonPlayer lesson={{ ...lesson, id: 'sentence-lesson' }} />);

    await user.type(screen.getByLabelText('Missing word'), 'Jeg bor i Oslo.');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect((await screen.findByRole('status')).className).toContain('good');
  });

  it('repeats a wrong typed answer in the feedback', async () => {
    const user = userEvent.setup();
    render(<LessonPlayer lesson={{ ...lesson, id: 'given-lesson' }} />);

    await user.type(screen.getByLabelText('Missing word'), 'heter');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect((await screen.findByTestId('given')).textContent).toBe('You wrote: heter');
  });
});

describe('LessonPlayer with language packs', () => {
  it('counts a small typo as right and shows the spelling', async () => {
    const user = userEvent.setup();
    const typoLesson: Lesson = {
      ...lesson,
      id: 'typo-lesson',
      items: [
        { ...lesson.items[0]!, id: 't-typo', answers: ['jobber'] } as Lesson['items'][number],
      ],
    };
    render(<LessonPlayer lesson={typoLesson} />);

    await user.type(screen.getByLabelText('Missing word'), 'jbober');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    const status = await screen.findByRole('status');
    expect(status.textContent).toContain('Watch the spelling: jobber');
    expect(status.className).toContain('good');
  });

  it('uses the French interface, marks familiar words and shows notes in French', async () => {
    const user = userEvent.setup();
    const real = getLesson('a2-first-day-at-work');
    if (!real) throw new Error('Sample lesson missing');
    const { container } = render(
      <I18nProvider language="fr">
        <LessonPlayer lesson={real} packs={learnerPacks('fr', ['en'])} />
      </I18nProvider>,
    );

    const familiar = [...container.querySelectorAll('.reading-text .cognate')].map(
      (m) => m.textContent,
    );
    expect(familiar).toContain('prosjekt');
    // Only look-alikes are <mark>ed; familiar words wait for their list to be opened.
    const marked = [...container.querySelectorAll('.reading-text mark')].map((m) => m.textContent);
    expect(marked).not.toContain('prosjekt');
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
