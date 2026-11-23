import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpeakButton } from './SpeakButton';

const speech = vi.hoisted(() => ({
  speak: vi.fn(async () => false),
  speakAll: vi.fn(async () => true),
  canPlay: vi.fn(async (texts: readonly string[]) => !texts.includes('Ny tekst.')),
}));
vi.mock('../audio/speech', () => ({ ...speech, stopSpeaking: vi.fn() }));

afterEach(cleanup);

describe('SpeakButton', () => {
  it('reads several texts in order, and says when the audio fails to load', async () => {
    const user = userEvent.setup();
    render(
      <>
        <SpeakButton text={['Hei.', 'Takk.']} label="Listen to the text" />
        <SpeakButton text="Hei." />
      </>,
    );

    await user.click(await screen.findByRole('button', { name: 'Listen to the text' }));
    expect(speech.speakAll).toHaveBeenCalledWith(['Hei.', 'Takk.'], { rate: 1 });
    expect(screen.queryByRole('status')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Listen' }));
    expect(await screen.findByRole('status')).toHaveProperty(
      'textContent',
      'The audio could not be loaded. Check your connection and try again.',
    );
  });

  it('shows no button for text that cannot be played', async () => {
    render(<SpeakButton text={['Hei.', 'Ny tekst.']} label="Listen to the text" />);
    await vi.waitFor(() => expect(speech.canPlay).toHaveBeenCalledWith(['Hei.', 'Ny tekst.']));
    await vi.waitFor(() => expect(screen.queryByRole('button')).toBeNull());
  });
});
