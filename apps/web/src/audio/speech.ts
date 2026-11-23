/**
 * Plays Norwegian text aloud. Texts recorded at build time with Piper (tools/audio) play from
 * audio/<key>.mp3; anything else, such as a lesson added since the last audio build, falls back
 * to the browser's own Norwegian voice when there is one.
 */

/** Same rule as the content CLI: split after . ! ? … (not after a digit, so "3. mars" stays). */
const SENTENCE_BREAK = /(?<=(?<!\d)[.!?…]»?)\s+|\n+/;

export function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function sentences(text: string): string[] {
  return text
    .split(SENTENCE_BREAK)
    .map(normalize)
    .filter((s) => s.length > 0);
}

type AudioIndex = Record<string, string>;
let indexPromise: Promise<AudioIndex> | undefined;

/**
 * The map from text to audio file, written by the audio build. Empty when there is none.
 * File names change when the voice changes, so the list is always asked from the network first
 * (the service worker falls back to its copy offline).
 */
export function loadAudioIndex(): Promise<AudioIndex> {
  indexPromise ??= fetch(`${import.meta.env.BASE_URL}audio/index.json`, { cache: 'no-cache' })
    .then((response) => (response.ok ? (response.json() as Promise<AudioIndex>) : {}))
    .catch(() => ({}));
  return indexPromise;
}

/** For tests. */
export function resetAudioIndex() {
  indexPromise = undefined;
}

export async function audioUrlFor(text: string): Promise<string | undefined> {
  const key = (await loadAudioIndex())[normalize(text)];
  return key ? `${import.meta.env.BASE_URL}audio/${key}.mp3` : undefined;
}

export interface SpeakOptions {
  /** 1 is normal speed; 0.75 is a comfortable slow speed for shadowing. */
  rate?: number;
}

let current: { stop: () => void } | undefined;
// Bumped whenever playback is stopped or restarted, so a running sequence knows to give up.
let generation = 0;

export function stopSpeaking() {
  generation++;
  current?.stop();
  current = undefined;
}

function norwegianVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => /^nb\b/i.test(v.lang)) ?? voices.find((v) => /^(no|nn)\b/i.test(v.lang))
  );
}

export function canSpeak(): boolean {
  return typeof Audio !== 'undefined' || 'speechSynthesis' in window;
}

/**
 * Speaks the text and resolves when it has finished (or was stopped). Resolves false when
 * nothing could play it.
 */
export function speak(text: string, { rate = 1 }: SpeakOptions = {}): Promise<boolean> {
  stopSpeaking();
  return play(text, rate, generation);
}

/**
 * Plays one text for the playback started at `mine`. Loading the clip list takes a network
 * round trip, so after every wait it checks that nothing stopped or replaced this playback;
 * otherwise a Stop pressed while loading would be ignored, and two clips could overlap.
 */
async function play(text: string, rate: number, mine: number): Promise<boolean> {
  const cancelled = () => generation !== mine;
  const url = await audioUrlFor(text);
  if (cancelled()) return true;
  if (url) {
    if (await playFile(url, rate)) return true;
    if (cancelled()) return true;
    // The list may be out of date (for example right after a new voice was deployed):
    // fetch it again and retry once with the new file.
    resetAudioIndex();
    const fresh = await audioUrlFor(text);
    if (cancelled()) return true;
    if (fresh && fresh !== url && (await playFile(fresh, rate))) return true;
    if (cancelled()) return true;
  }
  if (hasBrowserVoice()) return speakWithBrowser(text, rate);
  return false;
}

function hasBrowserVoice(): boolean {
  return 'speechSynthesis' in window && norwegianVoice() !== undefined;
}

/**
 * Whether every text can be played: it was recorded, or the device has a Norwegian voice.
 * Buttons for text that cannot be played are not shown, so learners never hit a dead end.
 */
export async function canPlay(texts: readonly string[]): Promise<boolean> {
  if (hasBrowserVoice()) return true;
  const index = await loadAudioIndex();
  return texts.every((text) => normalize(text) in index);
}

/** Plays the learner's own recording, stopping anything else that is playing. */
export function playRecording(url: string): Promise<boolean> {
  stopSpeaking();
  return playFile(url, 1);
}

function playFile(url: string, rate: number): Promise<boolean> {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.playbackRate = rate;
    audio.preservesPitch = true;
    const done = (ok: boolean) => {
      audio.onended = audio.onerror = null;
      resolve(ok);
    };
    audio.onended = () => done(true);
    audio.onerror = () => done(false);
    current = {
      stop: () => {
        audio.pause();
        done(true);
      },
    };
    audio.play().catch(() => done(false));
  });
}

function speakWithBrowser(text: string, rate: number): Promise<boolean> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'nb-NO';
    utterance.voice = norwegianVoice() ?? null;
    utterance.rate = rate;
    utterance.onend = () => resolve(true);
    utterance.onerror = () => resolve(false);
    current = {
      stop: () => {
        window.speechSynthesis.cancel();
        resolve(true);
      },
    };
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Speaks several texts one after the other. Starting or stopping any other sound ends it.
 * Resolves false when the texts could not be played at all.
 */
export async function speakAll(texts: string[], { rate = 1 }: SpeakOptions = {}): Promise<boolean> {
  stopSpeaking();
  const mine = generation;
  for (const text of texts) {
    if (generation !== mine) return true;
    if (!(await play(text, rate, mine))) return false;
  }
  return true;
}
