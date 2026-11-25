import { expect, test } from '@playwright/test';
import { chooseLanguages, finishLesson, stubAudio } from './helpers';

test('the end of a lesson reveals the score, a run of right answers and how each skill moved', async ({
  page,
}) => {
  await stubAudio(page);
  await page.goto('./');
  await chooseLanguages(page, 'English');
  await page.goto('./#/lesson/a2-first-day-at-work');

  // The first five items are reading questions; answer them correctly, then answer anything.
  const answers = ['Utvikler', 'Sjefen til Sara', 'Klokka 11.30', 'De har et møte', 'Klokka 13.00'];
  for (const answer of answers) {
    await page.getByRole('button', { name: answer, exact: true }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
  }
  await finishLesson(page);
  const done = page.getByRole('heading', { level: 1, name: 'Ferdig!' });

  await expect(done).toBeFocused();
  await expect(page.getByTestId('best-run')).toHaveText(/^\d+ right in a row$/);
  const reading = page.getByTestId('skill-change').filter({ hasText: 'Lesing' });
  await expect(reading).toBeVisible();
  await expect(reading).toContainText(/On the way to|New level/);

  // The actions work while the reveal is still playing.
  await page.getByRole('link', { name: 'Back to home' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Hei!' })).toBeVisible();
});
