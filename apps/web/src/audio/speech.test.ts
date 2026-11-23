import { afterEach, describe, expect, it, vi } from 'vitest';
import { audioUrlFor, canPlay, normalize, resetAudioIndex, sentences } from './speech';

afterEach(() => {
  resetAudioIndex();
  vi.unstubAllGlobals();
});

describe('sentences', () => {
  it('splits like the content CLI, keeping dates and times whole', () => {
    expect(
      sentences(
        'Fra mandag 3. mars går ikke trikken. Ta buss 31T!  Har du spørsmål?\nRing klokka 07.15.',
      ),
    ).toEqual([
      'Fra mandag 3. mars går ikke trikken.',
      'Ta buss 31T!',
      'Har du spørsmål?',
      'Ring klokka 07.15.',
    ]);
  });

  it('normalizes whitespace', () => {
    expect(normalize('  Jeg har\n en jobb. ')).toBe('Jeg har en jobb.');
  });
});

describe('audioUrlFor', () => {
  it('finds recorded audio by text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ 'Jeg har en jobb.': 'abc123' }))),
    );
    expect(await audioUrlFor('Jeg har  en jobb.')).toBe('/audio/abc123.mp3');
    expect(await audioUrlFor('Ukjent.')).toBeUndefined();
  });

  it('treats a missing audio build as no audio', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 })),
    );
    expect(await audioUrlFor('Jeg har en jobb.')).toBeUndefined();
  });
});

describe('canPlay', () => {
  it('is true only when every text was recorded, on a device without a Norwegian voice', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ 'Hei.': 'v-a1', 'Takk.': 'v-b2' }))),
    );
    expect(await canPlay(['Hei.', ' Takk. '])).toBe(true);
    expect(await canPlay(['Hei.', 'En ny tekst fra KI.'])).toBe(false);
  });

  it('asks the network for a fresh list', async () => {
    const fetch = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    await audioUrlFor('Hei.');
    expect(fetch).toHaveBeenCalledWith('/audio/index.json', { cache: 'no-cache' });
  });
});
