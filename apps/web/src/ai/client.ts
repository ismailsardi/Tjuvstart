import type { z } from 'zod';
import type { AiSettings } from '../data/db';

export type AiErrorKind = 'auth' | 'rate' | 'refusal' | 'network' | 'other';

export class AiError extends Error {
  constructor(
    readonly kind: AiErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Haiku has no server-side fallback model; the others fall back on a policy decline. */
const supportsFallback = (model: string) => !model.startsWith('claude-haiku');

/**
 * Sends one request to Claude straight from the browser with the learner's own key and
 * returns the reply parsed against `schema`. The SDK is loaded only when an AI feature is
 * used, so the core app stays small and works without it.
 */
export async function askClaude<S extends z.ZodType>(
  settings: AiSettings,
  request: {
    system: string;
    messages: readonly ChatMessage[];
    schema: S;
    effort?: 'low' | 'medium' | 'high';
    maxTokens?: number;
  },
): Promise<z.infer<S>> {
  const [{ default: Anthropic }, { betaZodOutputFormat }] = await Promise.all([
    import('@anthropic-ai/sdk'),
    import('@anthropic-ai/sdk/helpers/beta/zod'),
  ]);
  // The key belongs to the learner and only ever goes to the provider they chose.
  const client = new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true });

  try {
    const fallback = supportsFallback(settings.model);
    const response = await client.beta.messages.parse({
      model: settings.model,
      max_tokens: request.maxTokens ?? 8000,
      system: request.system,
      messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      output_config: {
        effort: request.effort ?? 'low',
        format: betaZodOutputFormat(request.schema),
      },
      ...(fallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}),
    });
    if (response.stop_reason === 'refusal') {
      throw new AiError('refusal', response.stop_details?.explanation ?? 'Declined');
    }
    if (response.parsed_output == null) {
      throw new AiError('other', `No usable answer (stop reason: ${response.stop_reason})`);
    }
    return response.parsed_output as z.infer<S>;
  } catch (error) {
    if (error instanceof AiError) throw error;
    if (error instanceof Anthropic.AuthenticationError) throw new AiError('auth', error.message);
    if (error instanceof Anthropic.PermissionDeniedError) throw new AiError('auth', error.message);
    if (error instanceof Anthropic.RateLimitError) throw new AiError('rate', error.message);
    if (error instanceof Anthropic.APIConnectionError) throw new AiError('network', error.message);
    if (error instanceof Anthropic.APIError) throw new AiError('other', error.message);
    throw error;
  }
}
