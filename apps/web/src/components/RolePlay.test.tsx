import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveAiSettings } from '../ai/settings';
import { db } from '../data/db';
import { RolePlay } from './RolePlay';

const ask = vi.hoisted(() => vi.fn());
vi.mock('../ai/client', async (original) => ({
  ...(await original<typeof import('../ai/client')>()),
  askClaude: ask,
}));

afterEach(async () => {
  cleanup();
  await db.aiSettings.clear();
});

describe('RolePlay', () => {
  it('opens the scene, sends the conversation and shows the correction', async () => {
    const user = userEvent.setup();
    await saveAiSettings('sk-ant-api03-abcdefghijklmnopqrstuvwxyz');
    ask.mockResolvedValue({
      reply: 'Så hyggelig! Hvor kommer du fra?',
      correction: 'Ja, det er min første dag.',
      explanation: 'Use «min» before the noun.',
    });
    render(<RolePlay scenarioId="first-day" />);

    expect(await screen.findByText(/velkommen! Jeg heter Kari/)).toBeTruthy();
    await user.type(screen.getByLabelText('Your message'), 'Ja, det er første dag min');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Så hyggelig! Hvor kommer du fra?')).toBeTruthy();
    expect(screen.getByText('Ja, det er min første dag.')).toBeTruthy();

    const [, request] = ask.mock.calls[0]!;
    expect(request.messages.map((m: { role: string }) => m.role)).toEqual([
      'user',
      'assistant',
      'user',
    ]);
    expect(request.messages[2].content).toBe('Ja, det er første dag min');
  });
});
