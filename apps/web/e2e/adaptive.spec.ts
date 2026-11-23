import { expect, test } from '@playwright/test';
import { answerAnything, chooseLanguages } from './helpers';

test('the level check sets a starting level, then practice targets weak spots', async ({
  page,
}) => {
  await page.goto('./');
  await chooseLanguages(page, 'English');

  await page
    .getByRole('region', { name: 'Find your level' })
    .getByRole('link', { name: 'Start' })
    .click();
  await expect(page.getByRole('heading', { name: 'Find your level' })).toBeVisible();
  await page.getByRole('button', { name: 'Start' }).click();

  const counter = page.getByText(/^Question \d+ of (\d+)$/);
  const total = Number((await counter.textContent())!.match(/of (\d+)/)![1]);
  for (let n = 0; n < total; n++) await answerAnything(page);

  await expect(page.getByRole('heading', { name: 'Your starting level' })).toBeVisible();
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
