import { expect, type Page } from '@playwright/test';

/** Completes the first-run language question. */
export async function chooseLanguages(page: Page, native: string, known: string[] = []) {
  await page.getByRole('radio', { name: native }).check();
  for (const language of known) {
    await page.getByRole('checkbox', { name: language }).check();
  }
  await page.getByRole('button', { name: /Continue|Continuer/ }).click();
  await expect(page.getByRole('heading', { name: /^Hei ?!$/ })).toBeVisible();
}

/** Answers whatever exercise is on screen, right or wrong, and moves on. */
export async function answerAnything(page: Page) {
  const options = page.getByRole('group', { name: 'Answer options' });
  const words = page.getByRole('group', { name: 'Words' });
  const gap = page.getByLabel('Missing word');
  await expect(options.or(words).or(gap)).toBeVisible();

  if (await options.isVisible()) {
    await options.getByRole('button').first().click();
  } else if (await gap.isVisible()) {
    await gap.fill('x');
    await page.getByRole('button', { name: 'Check' }).click();
  } else {
    while ((await words.getByRole('button').count()) > 0) {
      await words.getByRole('button').first().click();
    }
    await page.getByRole('button', { name: 'Check' }).click();
  }
  await page.getByRole('button', { name: 'Continue' }).click();
}
