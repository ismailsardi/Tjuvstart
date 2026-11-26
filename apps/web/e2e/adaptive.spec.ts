import { expect, test } from '@playwright/test';
import { answerAnything, chooseLanguages } from './helpers';

test('the level check sets a starting level, then practice targets weak spots', async ({
  page,
}) => {
  await page.goto('./');
  // «Some already» at onboarding goes straight into the first question, with no intro page.
  await chooseLanguages(page, 'English', [], 'some', undefined, false);
  await expect(page).toHaveURL(/#\/placement\/start$/);
  await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(0);

  // The check stops each skill once it is sure enough, so the number of questions varies.
  const done = page.getByRole('heading', { name: 'Your starting level' });
  await expect(page.getByText(/^Question 1 of \d+$/)).toBeVisible();
  for (let n = 0; n < 30 && !(await done.isVisible()); n++) await answerAnything(page);
  await expect(done).toBeVisible();
  await expect(page.getByTestId('placed-reading')).toContainText(/A1|A2|B1|B2/);

  await page.getByRole('link', { name: 'Back to home' }).click();
  await expect(page.getByTestId('skill-reading')).toContainText('estimated');
  await expect(page.getByRole('region', { name: 'Find your level' })).toHaveCount(0);

  await page
    .getByRole('region', { name: 'Practise your weak spots' })
    .getByRole('link', { name: 'Start' })
    .click();
  await expect(page.getByText(/^Question 1 of 8$/)).toBeVisible();
});

test('a learner who leaves the level check can start it again from Today', async ({ page }) => {
  await page.goto('./');
  await chooseLanguages(page, 'English');

  await page
    .getByRole('region', { name: 'Find your level' })
    .getByRole('link', { name: 'Start' })
    .click();
  await expect(page.getByRole('heading', { name: 'Find your level' })).toBeVisible();
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText(/^Question 1 of \d+$/)).toBeVisible();
});
