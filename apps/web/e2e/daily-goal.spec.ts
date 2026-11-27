import { expect, test } from '@playwright/test';
import { chooseLanguages } from './helpers';

test('a learner picks a daily goal and Today shows it with the last seven days', async ({
  page,
}) => {
  await page.goto('./');
  // A beginner skips the level check, so Today shows the daily session straight away.
  await chooseLanguages(page, 'English', [], 'beginner');

  const streak = page.getByTestId('streak');
  await expect(streak).toContainText('0 of 8 done today');
  await expect(
    page.getByRole('list', { name: 'The last seven days' }).getByRole('listitem'),
  ).toHaveCount(7);

  await page.getByRole('link', { name: 'Change goal' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Daily goal' })).toBeFocused();
  await expect(page.getByRole('radio', { name: /Regular/ })).toBeChecked();
  // Reminders need the iOS app; the browser shows no switch for them.
  await expect(page.getByTestId('reminder-settings')).toHaveCount(0);
  await page.getByRole('radio', { name: /Light/ }).check();
  await page.getByRole('link', { name: 'Back to Today' }).click();

  await expect(streak).toContainText('0 of 5 done today');
  await expect(streak).toContainText('Do 5 things today to start a streak.');

  // The choice is kept on the device.
  await page.reload();
  await expect(page.getByTestId('streak')).toContainText('0 of 5 done today');
});
