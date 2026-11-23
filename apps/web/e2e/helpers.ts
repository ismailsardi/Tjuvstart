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
