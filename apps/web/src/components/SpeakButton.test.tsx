import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SpeakButton } from './SpeakButton';

const speech = vi.hoisted(() => ({
  speak: vi.fn(async () => false),
  speakAll: vi.fn(async () => true),
}));
vi.mock('../audio/speech', () => ({ ...speech, stopSpeaking: vi.fn() }));

describe('SpeakButton', () => {
  it('reads several texts in order, and says when no voice is available', async () => {
    const user = userEvent.setup();
    render(
      <>
        <SpeakButton text={['Hei.', 'Takk.']} label="Listen to the text" />
        <SpeakButton text="Hei." />
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'Listen to the text' }));
    expect(speech.speakAll).toHaveBeenCalledWith(['Hei.', 'Takk.'], { rate: 1 });
    expect(screen.queryByRole('status')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Listen' }));
    expect(await screen.findByRole('status')).toHaveProperty(
      'textContent',
      'No Norwegian voice is available on this device yet.',
    );
  });
});
