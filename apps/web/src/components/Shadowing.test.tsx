import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Lesson } from '../content/types';
import { shadowedSentences } from '../data/progress';
import { Shadowing } from './Shadowing';

const speech = vi.hoisted(() => ({ speak: vi.fn(async () => true) }));
vi.mock('../audio/speech', async (original) => ({
  ...(await original<typeof import('../audio/speech')>()),
  speak: speech.speak,
  canPlay: vi.fn(async () => true),
  speakAll: vi.fn(async () => true),
  stopSpeaking: vi.fn(),
}));

const lesson: Lesson = {
  id: 'shadow-test',
  level: 'A2',
  title: 'Test',
  summary: '',
  text: 'Jeg heter Sara. Fra 3. mars jobber jeg her.',
  items: [],
};

beforeEach(() => speech.speak.mockClear());
afterEach(cleanup);

describe('Shadowing', () => {
  it('goes sentence by sentence and saves what the learner judged close', async () => {
    // jsdom has no MediaRecorder, so this is the listen-and-repeat path.
    const user = userEvent.setup();
    render(<Shadowing lesson={lesson} />);

    expect(screen.getByText('Sentence 1 of 2')).toBeTruthy();
    expect(screen.getByTestId('shadow-line').textContent).toBe('Jeg heter Sara.');
    expect(screen.getByRole('status').textContent).toMatch(/not available/);

    await user.click(screen.getByRole('button', { name: 'Listen' }));
    expect(speech.speak).toHaveBeenCalledWith('Jeg heter Sara.', { rate: 1 });
    await user.click(screen.getByRole('button', { name: 'Slower' }));
    expect(speech.speak).toHaveBeenLastCalledWith('Jeg heter Sara.', { rate: 0.75 });

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Sentence 1 of 2')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Sounded close' }));
    expect(await screen.findByText('Sentence 2 of 2')).toBeTruthy();
    expect(screen.getByTestId('shadow-line').textContent).toBe('Fra 3. mars jobber jeg her.');
    await user.click(screen.getByRole('button', { name: 'Sounded close' }));

    expect(await screen.findByText('You said 2 of 2 sentences out loud.')).toBeTruthy();
    expect(await shadowedSentences()).toBe(2);
  });

  it('can hide the text to practise by ear', async () => {
    const user = userEvent.setup();
    render(<Shadowing lesson={lesson} />);
    await user.click(screen.getByLabelText('Hide the text'));
    expect(screen.getByTestId('shadow-line').className).toContain('hidden-line');
  });
});
