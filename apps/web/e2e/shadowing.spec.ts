import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { chooseLanguages } from './helpers';

// A fake microphone, so recording works without a real device or a permission prompt.
test.use({
  permissions: ['microphone'],
  launchOptions: async ({ launchOptions }, provide) => {
    await provide({
      ...launchOptions,
      args: [
        ...(launchOptions.args ?? []),
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
      ],
    });
  },
});

const silence = readFileSync(new URL('./fixtures/silence.mp3', import.meta.url));

test('a learner can listen, record and shadow a lesson sentence by sentence', async ({ page }) => {
  // Stand in for the Piper build, which only runs in the audio job and on deploy.
  const played: string[] = [];
  await page.route('**/audio/index.json', (route) => route.fulfill({ json: { 'Hei!': 'hei' } }));
  await page.route('**/audio/*.mp3', (route) => {
    played.push(new URL(route.request().url()).pathname.split('/').pop()!);
    return route.fulfill({ body: silence, contentType: 'audio/mpeg' });
  });

  await page.goto('./');
  await chooseLanguages(page, 'English');
  await page
    .getByRole('region', { name: /^(Next lesson|Prochaine leçon)$/ })
    .getByRole('link', { name: /Første dag på jobben/ })
    .click();
  await page.getByRole('link', { name: 'Shadow this text' }).click();

  await expect(page.getByRole('heading', { name: /Shadowing/ })).toBeVisible();
  await expect(page.getByTestId('shadow-line')).toHaveText('Hei!');
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect.poll(() => played).toContain('hei.mp3');

  await page.getByRole('button', { name: 'Record' }).click();
  await page.getByRole('button', { name: 'Stop recording' }).click();
  await expect(page.getByRole('button', { name: 'Play mine' })).toBeVisible();
  await page.getByRole('button', { name: 'Sounded close' }).click();
  await expect(page.getByText(/^Sentence 2 of \d+$/)).toBeVisible();

  // Skipping without recording counts nothing.
  await page.getByRole('button', { name: 'Next sentence' }).click();
  await expect(page.getByText(/^Sentence 3 of \d+$/)).toBeVisible();

  await page.getByRole('link', { name: 'Back to the lesson' }).click();
  await page.getByRole('link', { name: 'Home' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Me' }).click();
  await expect(page.getByTestId('shadowed')).toHaveText('Sentences said out loud: 1');
});
