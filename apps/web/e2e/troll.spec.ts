import { expect, test } from '@playwright/test';
import { chooseLanguages } from './helpers';

test('the learner names their troll at onboarding and can rename it later', async ({ page }) => {
  await page.goto('./');
  await chooseLanguages(page, 'English', [], 'beginner', 'Knut');

  await page.goto('./#/me');
  await expect(page.getByTestId('troll-name')).toContainText('Knut');
  await page.getByRole('link', { name: 'Name and outfit' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Knut' })).toBeVisible();

  // Nothing is earned yet: every item says what earns it.
  await expect(page.getByRole('radio', { name: /Knitted scarf/ })).toBeDisabled();
  await expect(page.getByTestId('slot-neck')).toContainText('3-day streak');
  await expect(page.getByTestId('next-item')).toContainText('Knitted scarf, at a 3-day streak');

  await page.getByRole('textbox', { name: 'Name' }).fill('  Ragnhild  ');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Ragnhild' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Name saved.');

  // A blank name goes back to the default.
  await page.getByRole('textbox', { name: 'Name' }).fill('');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tusse' })).toBeVisible();
});
