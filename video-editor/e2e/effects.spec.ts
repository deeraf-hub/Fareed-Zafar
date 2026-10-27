import { expect, test, type Page } from '@playwright/test';
import { ensureFixtures } from './fixtures';

const fixtures = ensureFixtures();

/** Read a pixel from the preview canvas at a fraction of its size. */
async function pixel(page: Page, fx: number, fy: number): Promise<[number, number, number]> {
  return page.evaluate(
    ([x, y]) => {
      const c = document.querySelector<HTMLCanvasElement>('[data-testid="preview-canvas"]')!;
      const d = c.getContext('2d')!.getImageData(Math.floor(c.width * x), Math.floor(c.height * y), 1, 1).data;
      return [d[0], d[1], d[2]] as [number, number, number];
    },
    [fx, fy],
  );
}

test('filters, vignette, transitions and motion change the rendered preview', async ({ page }) => {
  await page.goto('/projects');
  await page.getByTestId('new-project').click();
  await page.getByTestId('project-name-input').fill('Effects');
  await page.getByTestId('create-project').click();
  await expect(page.getByTestId('editor')).toBeVisible();
  await page.getByTestId('file-input').setInputFiles([fixtures.image]); // 400×200 pink image → fills the width, letterboxed
  await expect(page.getByTestId('asset-item')).toHaveCount(1, { timeout: 30_000 });
  const item = page.getByTestId('asset-item').first();
  await item.hover();
  await item.getByTestId('add-asset').click();
  await expect(page.getByTestId('clip-inspector')).toHaveAttribute('data-kind', 'image');
  await page.keyboard.press('Home');

  // Untouched: pink in the centre, black letterbox at the very top.
  await expect.poll(async () => (await pixel(page, 0.5, 0.5))[0]).toBeGreaterThan(200);
  const base = await pixel(page, 0.5, 0.5);
  expect(base[1]).toBeLessThan(140);
  expect((await pixel(page, 0.5, 0.01))[0]).toBeLessThan(20);

  // Black & white look → neutral centre pixel.
  await page.getByTestId('filter-grayscale').click();
  await expect.poll(async () => {
    const [r, g, b] = await pixel(page, 0.5, 0.5);
    return Math.max(Math.abs(r - g), Math.abs(g - b));
  }).toBeLessThan(10);
  await page.getByTestId('filter-none').click();

  // Vignette darkens the image edge but not the centre.
  const edgeBefore = await pixel(page, 0.03, 0.5);
  await page.getByLabel('Vignette value').fill('1');
  await page.getByLabel('Vignette value').press('Enter');
  await expect.poll(async () => (await pixel(page, 0.03, 0.5))[0]).toBeLessThan(edgeBefore[0] - 60);
  expect((await pixel(page, 0.5, 0.5))[0]).toBeGreaterThan(base[0] - 25);
  await page.getByLabel('Vignette value').fill('0');
  await page.getByLabel('Vignette value').press('Enter');

  // Circle transition in: early in the clip only a small disc is visible.
  await page.getByTestId('transition-in').selectOption('circle');
  await page.getByTestId('time-ruler').click({ position: { x: 12, y: 10 } }); // 0.2 s of a 0.5 s transition
  await expect.poll(async () => (await pixel(page, 0.5, 0.5))[0]).toBeGreaterThan(200);
  await expect.poll(async () => (await pixel(page, 0.15, 0.5))[0]).toBeLessThan(20);
  await page.getByTestId('time-ruler').click({ position: { x: 120, y: 10 } }); // 2 s: fully revealed
  await expect.poll(async () => (await pixel(page, 0.15, 0.5))[0]).toBeGreaterThan(200);
  await page.getByTestId('transition-in').selectOption('none');

  // Ken Burns motion: by the end of the clip the image has zoomed past the letterbox.
  await page.getByTestId('motion-loop').selectOption('ken-burns');
  await page.getByLabel('Strength value').fill('1');
  await page.getByLabel('Strength value').press('Enter');
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowLeft'); // last frame
  await expect.poll(async () => (await pixel(page, 0.5, 0.01))[0]).toBeGreaterThan(200);
  await page.keyboard.press('Home');
  await expect.poll(async () => (await pixel(page, 0.5, 0.01))[0]).toBeLessThan(20);

  // Slide-in motion: at the first frame the image is off-screen to the right.
  await page.getByTestId('motion-in').selectOption('slide-left');
  await expect.poll(async () => (await pixel(page, 0.5, 0.5))[0]).toBeLessThan(20);
  await page.getByTestId('time-ruler').click({ position: { x: 120, y: 10 } });
  await expect.poll(async () => (await pixel(page, 0.5, 0.5))[0]).toBeGreaterThan(200);
  await page.getByTestId('motion-in').selectOption('none');
  await page.getByTestId('motion-loop').selectOption('none');

  // Crop to 1:1: the 400×200 image becomes a centred square, so the far left is background.
  await page.getByTestId('crop-1:1').click();
  await expect.poll(async () => (await pixel(page, 0.1, 0.5))[0]).toBeLessThan(20);
  await expect.poll(async () => (await pixel(page, 0.5, 0.5))[0]).toBeGreaterThan(200);
  await page.getByLabel('Reset crop and mask').click();
  await expect.poll(async () => (await pixel(page, 0.1, 0.5))[0]).toBeGreaterThan(200);

  // Circle mask hides the image outside the disc; invert flips it.
  await page.getByTestId('mask-shape').selectOption('circle');
  await page.getByLabel('Size value').fill('0.5');
  await page.getByLabel('Size value').press('Enter');
  await expect.poll(async () => (await pixel(page, 0.2, 0.5))[0]).toBeLessThan(20);
  await expect.poll(async () => (await pixel(page, 0.5, 0.5))[0]).toBeGreaterThan(200);
  await page.getByLabel('Invert mask').click();
  await expect.poll(async () => (await pixel(page, 0.5, 0.5))[0]).toBeLessThan(20);
  await expect.poll(async () => (await pixel(page, 0.2, 0.5))[0]).toBeGreaterThan(200);
  await page.getByLabel('Reset crop and mask').click();

  // Text animations render without errors.
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.getByTestId('tab-text').click();
  await page.getByTestId('add-text-title').click();
  await page.getByTestId('text-content').fill('Wave hello');
  for (const anim of ['wave', 'rise', 'glitch', 'blur', 'spin', 'bounce']) {
    await page.getByTestId('text-animation').selectOption(anim);
    await page.getByTestId('time-ruler').click({ position: { x: 130 + Math.floor(Math.random() * 10), y: 10 } });
    await page.waitForTimeout(80);
  }
  await page.getByLabel('Uppercase').click();
  await page.getByLabel('Gradient fill').click();
  expect(errors).toEqual([]);

  // Audio tracks can be set to duck; the project-level amount appears.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('project-inspector')).toBeVisible();
  await page.getByTestId('track-duck').click();
  await expect(page.getByTestId('track-duck')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Ducking value')).toHaveValue('0.70');
});
