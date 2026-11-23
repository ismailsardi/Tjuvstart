import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { TjuvstartDb } from '../data/db';
import { clearAiSettings, getAiSettings, looksLikeApiKey, saveAiSettings } from './settings';

const db = new TjuvstartDb('test-ai-settings');
afterEach(() => db.aiSettings.clear());

describe('AI settings', () => {
  it('checks the shape of a key', () => {
    expect(looksLikeApiKey('sk-ant-api03-abcdefghijklmnopqrstuvwxyz')).toBe(true);
    expect(looksLikeApiKey('  sk-ant-api03-abcdefghijklmnopqrstuvwxyz \n')).toBe(true);
    expect(looksLikeApiKey('sk-proj-abcdefghijklmnopqrstuvwxyz')).toBe(false);
    expect(looksLikeApiKey('sk-ant-short')).toBe(false);
  });

  it('stores the key apart from the profile and removes it', async () => {
    await saveAiSettings(' sk-ant-api03-abcdefghijklmnopqrstuvwxyz ', 'claude-haiku-5-5', db);
    expect(await getAiSettings(db)).toEqual({
      id: 'ai',
      apiKey: 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz',
      model: 'claude-haiku-5-5',
    });
    expect(await db.profiles.count()).toBe(0);
    await clearAiSettings(db);
    expect(await getAiSettings(db)).toBeUndefined();
  });
});
