import { readFileSync, readdirSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';

const silence = readFileSync(new URL('./fixtures/silence.mp3', import.meta.url));
const lessonsDir = new URL('../../../content/lessons/', import.meta.url);

/**
 * Stands in for the audio build, which only runs in the audio job and on deploy: every
 * listening text, letter name and alphabet example gets a silent clip. Returns the clips
 * played, in order.
 */
export async function stubAudio(page: Page): Promise<string[]> {
  const index: Record<string, string> = {};
  for (const level of readdirSync(lessonsDir)) {
    for (const file of readdirSync(new URL(`${level}/`, lessonsDir))) {
      const lesson = JSON.parse(readFileSync(new URL(`${level}/${file}`, lessonsDir), 'utf8')) as {
        items: { id: string; audio?: string }[];
      };
      for (const item of lesson.items) {
        if (item.audio) index[item.audio.replace(/\s+/g, ' ').trim()] = item.id;
      }
    }
  }
  const alphabet = JSON.parse(
    readFileSync(new URL('../../../content/alphabet.json', import.meta.url), 'utf8'),
  ) as { letters: { name: string; example: string }[] };
  alphabet.letters.forEach(({ name, example }, i) => {
    index[name] = `letter-${i + 1}`;
    index[example] = `example-${i + 1}`;
  });
  const played: string[] = [];
  await page.route('**/audio/index.json', (route) => route.fulfill({ json: index }));
  await page.route('**/audio/*.mp3', (route) => {
    played.push(new URL(route.request().url()).pathname.split('/').pop()!);
    return route.fulfill({ body: silence, contentType: 'audio/mpeg' });
  });
  return played;
}

/**
 * Completes the first-run questions: languages, then how much Norwegian the learner knows.
 * By default the learner says they know some, which sends them to the level check. Pass
 * `null` when editing languages later, where the level is not asked again.
 */
/** The onboarding «Continue» button in every interface language. */
const CONTINUE = /Continue|Continuer|Weiter|Continuar/;

export async function chooseLanguages(
  page: Page,
  native: string,
  known: string[] = [],
  startingPoint: 'beginner' | 'some' | null = 'some',
) {
  await page.getByRole('radio', { name: native }).check();
  // Onboarding asks one question per screen.
  await page.getByRole('button', { name: CONTINUE }).click();
  for (const language of known) {
    await page.getByRole('checkbox', { name: language }).check();
  }
  await page.getByRole('button', { name: CONTINUE }).click();
  if (startingPoint) {
    const level =
      startingPoint === 'beginner'
        ? /^(None yet|Je débute|Noch gar nicht|Nada todavía)/
        : /^(Some already|J’ai déjà des bases|Schon ein bisschen|Ya sé algo)/;
    await page.getByRole('radio', { name: level }).check();
    await page.getByRole('button', { name: CONTINUE }).click();
  }
  await expect(page.getByRole('heading', { name: /^Hei ?!$/ })).toBeVisible();
}

/** Answers whatever exercise is on screen, right or wrong, and moves on. Works in English and French. */
export async function answerAnything(page: Page) {
  const options = page.getByRole('group', { name: /^(Answer options|Réponses possibles)$/ });
  const words = page.getByRole('group', { name: /^(Words|Mots)$/ });
  const gap = page.getByLabel(/^(Missing word|Mot manquant|What you hear|Ce que vous entendez)$/);
  await expect(options.or(words).or(gap)).toBeVisible();

  if (await options.isVisible()) {
    await options.getByRole('button').first().click();
  } else if (await gap.isVisible()) {
    await gap.fill('x');
    await page.getByRole('button', { name: /^(Check|Vérifier)$/ }).click();
  } else {
    while ((await words.getByRole('button').count()) > 0) {
      await words.getByRole('button').first().click();
    }
    await page.getByRole('button', { name: /^(Check|Vérifier)$/ }).click();
  }
  await page.getByRole('button', { name: /^(Continue|Continuer)$/ }).click();
}

/** Answers whatever comes until the lesson's end screen shows. */
export async function finishLesson(page: Page) {
  const done = page.getByRole('heading', { level: 1, name: 'Ferdig!' });
  const question = page
    .getByRole('button', { name: /^(Check|Vérifier)$/ })
    .or(page.getByRole('group', { name: /^(Answer options|Réponses possibles)$/ }));
  while (true) {
    await expect(done.or(question.first())).toBeVisible();
    if (await done.isVisible()) return;
    await answerAnything(page);
  }
}
