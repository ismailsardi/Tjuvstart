import { expect, test } from '@playwright/test';
import { answerAnything, chooseLanguages } from './helpers';

test('the daily session ends with a streak and can-do statements on Me', async ({ page }) => {
  await page.goto('./');
  await chooseLanguages(page, 'English');

  // A new learner has nothing due, so the session goes straight to the exercises.
  await page.goto('./#/daily');
  const counter = page.getByText(/^Question \d+ of (\d+)$/);
  await expect(counter).toBeVisible();
  const total = Number((await counter.textContent())!.match(/of (\d+)/)![1]);
  for (let n = 0; n < total; n++) await answerAnything(page);

  await expect(page.getByRole('heading', { name: 'Done for today!' })).toBeVisible();
  await expect(page.getByTestId('streak')).toContainText('Streak: 1 day');
  await expect(page.getByTestId('streak')).toContainText('Daily goal reached.');

  await page.getByRole('link', { name: 'Back to home' }).click();
  const daily = page.getByRole('region', { name: 'Today’s 10 minutes' });
  await expect(daily.getByRole('link', { name: 'One more round' })).toBeVisible();

  await page.getByRole('navigation').getByRole('link', { name: 'Me' }).click();
  const canDo = page.getByRole('region', { name: 'What I can do' });
  await expect(canDo).toContainText('I can find what I need in notices');
  await expect(canDo.getByTestId('can-do').first()).toBeVisible();
});
