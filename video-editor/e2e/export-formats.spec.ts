import { expect, test } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureFixtures, ffprobe } from './fixtures';

const fixtures = ensureFixtures();

/** WebM (VP9 + Opus) via the automatic engine and a GIF of a custom range via FFmpeg.wasm. */
test('export WebM and a GIF of a custom range', async ({ page }, testInfo) => {
  testInfo.setTimeout(10 * 60 * 1000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/projects');
  await page.getByTestId('new-project').click();
  await page.getByTestId('project-name-input').fill('Formats');
  await page.getByTestId('create-project').click();
  await expect(page.getByTestId('editor')).toBeVisible();
  await page.getByTestId('file-input').setInputFiles([fixtures.video, fixtures.audio]);
  await expect(page.getByTestId('asset-item')).toHaveCount(2, { timeout: 60_000 });
  for (const i of [0, 1]) {
    const item = page.getByTestId('asset-item').nth(i);
    await item.hover();
    await item.getByTestId('add-asset').click();
  }
  await expect(page.getByTestId('clip')).toHaveCount(2);
  await expect(page.getByTestId('sequence-duration')).toContainText('00:06:00');

  // Ripple-delete the first second of the video: split at 1 s, select the left part, Shift+Delete.
  await page.getByTestId('time-ruler').click({ position: { x: 60, y: 10 } });
  await page.locator('[data-testid="clip"][data-clip-kind="video"]').click({ position: { x: 20, y: 8 } });
  await page.getByTestId('split').click();
  const left = page.locator('[data-testid="clip"][data-clip-kind="video"]').first();
  await left.click({ position: { x: 20, y: 8 } });
  await page.getByTestId('ripple-delete').click();
  await expect(page.locator('[data-testid="clip"][data-clip-kind="video"]')).toHaveCount(1);
  const remaining = await page.locator('[data-testid="clip"][data-clip-kind="video"]').evaluate((el) => (el as HTMLElement).offsetLeft);
  expect(remaining).toBe(0); // pulled back to the start
  await expect(page.getByTestId('sequence-duration')).toContainText('00:05:00');

  const dir = mkdtempSync(join(tmpdir(), 'fw-formats-'));

  // --- WebM, whole sequence, automatic engine ---
  await page.getByTestId('export-button').click();
  await page.getByTestId('export-format').selectOption('webm');
  await page.getByTestId('export-preset').selectOption('480p');
  await page.getByTestId('start-export').click();
  await expect(page.getByTestId('export-done')).toBeVisible({ timeout: 8 * 60 * 1000 });
  console.log('webm summary:', await page.getByTestId('export-done').textContent());
  let dl = page.waitForEvent('download');
  await page.getByTestId('download-export').click();
  let file = await dl;
  const webmPath = join(dir, file.suggestedFilename());
  expect(webmPath.endsWith('.webm')).toBe(true);
  await file.saveAs(webmPath);
  const webm = ffprobe(webmPath);
  console.log('webm ffprobe:', JSON.stringify(webm.streams.map((s) => [s.codec_type, s.codec_name, s.width, s.height])), webm.format.format_name, webm.format.duration);
  expect(webm.format.format_name).toContain('matroska');
  expect(['vp9', 'vp8']).toContain(webm.streams.find((s) => s.codec_type === 'video')!.codec_name);
  expect(webm.streams.find((s) => s.codec_type === 'audio')?.codec_name).toBe('opus');
  expect(Math.abs(parseFloat(webm.format.duration) - 5)).toBeLessThan(0.4);

  // --- GIF of seconds 1.0–3.0 via FFmpeg.wasm ---
  await page.getByRole('button', { name: 'Export again' }).click();
  await page.getByTestId('export-format').selectOption('gif');
  await expect(page.getByTestId('export-engine').locator('option[value="webcodecs"]')).toHaveJSProperty('disabled', true);
  await page.getByTestId('export-range-mode').selectOption('custom');
  await page.getByTestId('export-range-start').fill('1');
  await page.getByTestId('export-range-end').fill('3');
  await expect(page.getByTestId('export-duration')).toContainText('00:02.000');
  await page.getByTestId('start-export').click();
  await expect(page.getByTestId('export-done')).toBeVisible({ timeout: 8 * 60 * 1000 });
  console.log('gif summary:', await page.getByTestId('export-done').textContent());
  dl = page.waitForEvent('download');
  await page.getByTestId('download-export').click();
  file = await dl;
  const gifPath = join(dir, file.suggestedFilename());
  expect(gifPath.endsWith('.gif')).toBe(true);
  await file.saveAs(gifPath);
  const gif = ffprobe(gifPath);
  console.log('gif ffprobe:', JSON.stringify(gif.streams.map((s) => [s.codec_type, s.codec_name, s.width, s.height, s.nb_frames])), gif.format.format_name);
  expect(gif.format.format_name).toBe('gif');
  const gs = gif.streams.find((s) => s.codec_type === 'video')!;
  expect(gs.codec_name).toBe('gif');
  expect(gs.width).toBe(854);
  expect(gs.height).toBe(480);
  expect(Number(gs.nb_frames)).toBe(30); // 2 s at 15 fps

  expect(errors, `page errors: ${errors.join('\n')}`).toEqual([]);
});
