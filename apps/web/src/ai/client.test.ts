import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const sdk = vi.hoisted(() => {
  class APIError extends Error {}
  class AuthenticationError extends APIError {}
  class PermissionDeniedError extends APIError {}
  class RateLimitError extends APIError {}
  class APIConnectionError extends APIError {}
  const parse = vi.fn();
  const options: unknown[] = [];
  class Anthropic {
    static APIError = APIError;
    static AuthenticationError = AuthenticationError;
    static PermissionDeniedError = PermissionDeniedError;
    static RateLimitError = RateLimitError;
    static APIConnectionError = APIConnectionError;
    beta = { messages: { parse } };
    constructor(opts: unknown) {
      options.push(opts);
    }
  }
  return { Anthropic, parse, options, RateLimitError };
});

vi.mock('@anthropic-ai/sdk', () => ({ default: sdk.Anthropic }));
vi.mock('@anthropic-ai/sdk/helpers/beta/zod', () => ({
  betaZodOutputFormat: (schema: unknown) => ({ schema }),
}));

import { AiError, askClaude } from './client';

const Reply = z.object({ reply: z.string() });
const request = {
  system: 'S',
  messages: [{ role: 'user' as const, content: 'Hei' }],
  schema: Reply,
};

beforeEach(() => {
  sdk.parse.mockReset();
  sdk.options.length = 0;
});

describe('askClaude', () => {
  it('calls the API from the browser with the learner’s key and a fallback', async () => {
    sdk.parse.mockResolvedValue({ stop_reason: 'end_turn', parsed_output: { reply: 'Hei!' } });
    const out = await askClaude(
      { id: 'ai', apiKey: 'sk-ant-x', model: 'claude-opus-5-5' },
      request,
    );

    expect(out).toEqual({ reply: 'Hei!' });
    expect(sdk.options[0]).toEqual({ apiKey: 'sk-ant-x', dangerouslyAllowBrowser: true });
    expect(sdk.parse.mock.calls[0]![0]).toMatchObject({
      model: 'claude-opus-5-5',
      system: 'S',
      messages: [{ role: 'user', content: 'Hei' }],
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
  });

  it('sends no fallback for Haiku', async () => {
    sdk.parse.mockResolvedValue({ stop_reason: 'end_turn', parsed_output: { reply: 'ok' } });
    await askClaude({ id: 'ai', apiKey: 'k', model: 'claude-haiku-5-5' }, request);
    expect(sdk.parse.mock.calls[0]![0]).not.toHaveProperty('fallbacks');
  });

  it('reports refusals and API errors by kind', async () => {
    sdk.parse.mockResolvedValueOnce({ stop_reason: 'refusal', stop_details: null });
    await expect(
      askClaude({ id: 'ai', apiKey: 'k', model: 'claude-opus-5-5' }, request),
    ).rejects.toMatchObject({ kind: 'refusal' });

    sdk.parse.mockRejectedValueOnce(new sdk.RateLimitError('slow down'));
    const error = await askClaude(
      { id: 'ai', apiKey: 'k', model: 'claude-opus-5-5' },
      request,
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AiError);
    expect(error).toMatchObject({ kind: 'rate' });
  });
});
