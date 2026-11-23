import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Lesson } from '../content/types';
import { LessonPlayer } from './LessonPlayer';

const speech = vi.hoisted(() => ({ speak: vi.fn(async () => true) }));
vi.mock('../audio/speech', async (original) => ({
  ...(await original<typeof import('../audio/speech')>()),
  speak: speech.speak,
  canPlay: vi.fn(async () => true),
  stopSpeaking: vi.fn(),
}));

afterEach(cleanup);

const lesson: Lesson = {
  id: 'listening-test',
  level: 'A2',
  title: 'Lytting',
  summary: '',
  items: [
    {
      id: 'lt-1',
      type: 'dictation',
      skill: 'listening',
      level: 'A2',
      descriptors: ['A2-L-01'],
      difficulty: 1000,
      prompt: 'Skriv det du hører.',
      audio: 'Vi var på hytta.',
    },
    {
      id: 'lt-2',
      type: 'multiple-choice',
      skill: 'listening',
      level: 'A2',
      descriptors: ['A2-L-02'],
      difficulty: 1000,
      prompt: 'Hvor var de?',
      audio: 'Vi var på hytta.',
      options: ['På hytta', 'Hjemme'],
      answer: 0,
    },
  ],
};

describe('listening items', () => {
  it('plays the audio at the learner’s speed, marks missed words, then shows the transcript', async () => {
    const user = userEvent.setup();
    render(<LessonPlayer lesson={lesson} />);

    // The text is not on screen before answering.
    expect(screen.queryByText(/Vi var på hytta/)).toBeNull();
    expect(await screen.findByText('Speed 85%')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Play' }));
    expect(speech.speak).toHaveBeenCalledWith('Vi var på hytta.', { rate: 0.85 });

    await user.type(screen.getByLabelText('What you hear'), 'vi på hytta{Enter}');
    expect(await screen.findByText('var')).toHaveProperty('tagName', 'MARK');

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'På hytta' }));
    expect((await screen.findByTestId('transcript')).textContent).toBe('«Vi var på hytta.»');
  });
});
