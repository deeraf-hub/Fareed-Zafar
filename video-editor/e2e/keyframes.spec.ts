import { expect, test } from '@playwright/test';
import { ensureFixtures } from './fixtures';

const fixtures = ensureFixtures();

/** Keyframes on an image overlay: values animate between keys and survive a split. */
test('keyframe scale and position on an image overlay', async ({ page }) => {
  await page.goto('/projects');
  await page.getByTestId('new-project').click();
  await page.getByTestId('project-name-input').fill('Keyframes');
  await page.getByTestId('create-project').click();
  await expect(page.getByTestId('editor')).toBeVisible();
  await page.getByTestId('file-input').setInputFiles([fixtures.image]);
  await expect(page.getByTestId('asset-item')).toHaveCount(1, { timeout: 30_000 });
  const item = page.getByTestId('asset-item').first();
  await item.hover();
  await item.getByTestId('add-asset').click();
  await expect(page.getByTestId('clip')).toHaveCount(1); // 5 s image clip at 0
  await expect(page.getByTestId('clip-inspector')).toHaveAttribute('data-kind', 'image');

  // Keyframe scale: 0.5 at 0 s, 1.0 at 2 s.
  await page.keyboard.press('Home');
  await page.getByTestId('kf-scale').click();
  await expect(page.getByTestId('kf-scale')).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Scale value').fill('0.5');
  await page.getByLabel('Scale value').press('Enter');
  await page.getByTestId('time-ruler').click({ position: { x: 120, y: 10 } }); // 2 s
  await expect(page.getByTestId('time-display')).toContainText('00:02:00');
  await page.getByLabel('Scale value').fill('1');
  await page.getByLabel('Scale value').press('Enter');
  await expect(page.getByTestId('kf-scale')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('keyframe-marker')).toHaveCount(2);

  // Halfway (1 s) the eased value is 0.75.
  await page.getByTestId('time-ruler').click({ position: { x: 60, y: 10 } });
  await expect(page.getByTestId('time-display')).toContainText('00:01:00');
  await expect(page.getByLabel('Scale value')).toHaveValue('0.75');
  await expect(page.getByTestId('kf-scale')).toHaveAttribute('aria-pressed', 'false');
  // Before the first key the value is held.
  await page.keyboard.press('Home');
  await expect(page.getByLabel('Scale value')).toHaveValue('0.50');

  // The selection overlay in the preview follows the animated scale.
  const sizeAt = async (x: number) => {
    await page.getByTestId('time-ruler').click({ position: { x, y: 10 } });
    const box = await page.getByLabel('Move selected clip').boundingBox();
    return box!.width;
  };
  const w0 = await sizeAt(1);
  const w2 = await sizeAt(120);
  expect(w2).toBeGreaterThan(w0 * 1.8);

  // Splitting at 1 s keeps both halves animated and adds boundary keys.
  await page.getByTestId('time-ruler').click({ position: { x: 60, y: 10 } });
  await page.getByTestId('split').click();
  await expect(page.getByTestId('clip')).toHaveCount(2);
  await expect(page.getByTestId('keyframe-marker')).toHaveCount(4);

  // Reset clears keyframes on the selected (right) clip.
  await page.getByLabel('Reset transform and keyframes').click();
  await expect(page.getByTestId('keyframe-marker')).toHaveCount(2);
});
