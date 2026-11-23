import { db as defaultDb, type AiSettings, type TjuvstartDb } from '../data/db';

/** Models the learner can pick. The first one is the default. */
export const AI_MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'] as const;
export type AiModel = (typeof AI_MODELS)[number];
export const DEFAULT_AI_MODEL: AiModel = AI_MODELS[0];

export async function getAiSettings(db: TjuvstartDb = defaultDb): Promise<AiSettings | undefined> {
  return db.aiSettings.get('ai');
}

export async function saveAiSettings(
  apiKey: string,
  model: string = DEFAULT_AI_MODEL,
  db: TjuvstartDb = defaultDb,
): Promise<void> {
  await db.aiSettings.put({ id: 'ai', apiKey: apiKey.trim(), model });
}

export async function clearAiSettings(db: TjuvstartDb = defaultDb): Promise<void> {
  await db.aiSettings.delete('ai');
}

/** A quick shape check so an obvious paste mistake is caught before any request. */
export function looksLikeApiKey(value: string): boolean {
  return /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(value.trim());
}
