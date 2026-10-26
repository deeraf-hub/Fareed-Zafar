import { expect, test } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureFixtures, ffprobe } from './fixtures';

const fixtures = ensureFixtures();

/**
 * Forces the portable FFmpeg.wasm engine (libx264 in WebAssembly) so the
 * software path is verified even on machines where WebCodecs is available.
 */
test('export a short 1:1 project with the FFmpeg.wasm engine', async ({ page }, testInfo) => {
  testInfo.setTimeout(10 * 60 * 1000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/projects');
  await page.getByTestId('new-project').click();
  await page.getByTestId('project-name-input').fill('FFmpeg engine');
  await page.getByTestId('aspect-1:1').click();
  await page.getByTestId('create-project').click();
  await expect(page.getByTestId('editor')).toBeVisible();

  await page.getByTestId('file-input').setInputFiles([fixtures.video2, fixtures.audio]);
  await expect(page.getByTestId('asset-item')).toHaveCount(2, { timeout: 60_000 });
  for (const i of [0, 1]) {
    const item = page.getByTestId('asset-item').nth(i);
    await item.hover();
    await item.getByTestId('add-asset').click();
  }
  await expect(page.getByTestId('clip')).toHaveCount(2);

  // Trim the audio to the video length (4 s) by setting the end via the inspector-free route: split at 4 s and delete the tail.
  await page.locator('[data-testid="clip"][data-clip-kind="audio"]').click({ position: { x: 20, y: 8 } });
  await page.getByTestId('time-ruler').click({ position: { x: 240, y: 10 } }); // 4 s
  await page.locator('[data-testid="clip"][data-clip-kind="audio"]').first().click({ position: { x: 20, y: 8 } });
  await page.getByTestId('split').click();
  await expect(page.locator('[data-testid="clip"][data-clip-kind="audio"]')).toHaveCount(2);
  await page.keyboard.press('Delete'); // the right-hand part is selected after a split
  await expect(page.locator('[data-testid="clip"][data-clip-kind="audio"]')).toHaveCount(1);
  await expect(page.getByTestId('sequence-duration')).toContainText('00:04:00');

  // Add a subtitle with a wipe-in transition so text + transitions go through the encoder too.
  await page.keyboard.press('Home');
  await page.getByTestId('tab-text').click();
  await page.getByTestId('add-text-subtitle').click();
  await page.getByTestId('text-content').fill('Software encode');
  await page.getByTestId('transition-in').selectOption('wipe');

  await page.getByTestId('export-button').click();
  await page.getByTestId('export-preset').selectOption('480p');
  await page.getByTestId('export-engine').selectOption('ffmpeg');
  await page.getByTestId('start-export').click();
  await expect(page.getByTestId('export-progress')).toBeVisible();
  await expect(page.getByTestId('export-done')).toBeVisible({ timeout: 8 * 60 * 1000 });
  await expect(page.getByTestId('export-done')).toContainText('FFmpeg.wasm');
  console.log('ffmpeg export summary:', await page.getByTestId('export-done').textContent());

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('download-export').click();
  const download = await downloadPromise;
  const outPath = join(mkdtempSync(join(tmpdir(), 'fw-ffmpeg-')), download.suggestedFilename());
  await download.saveAs(outPath);
  const probe = ffprobe(outPath);
  const video = probe.streams.find((s) => s.codec_type === 'video')!;
  const audio = probe.streams.find((s) => s.codec_type === 'audio');
  console.log('ffprobe:', JSON.stringify(probe.streams.map((s) => ({ type: s.codec_type, codec: s.codec_name, w: s.width, h: s.height })), null, 0), probe.format.duration);
  expect(probe.format.format_name).toContain('mp4');
  expect(video.codec_name).toBe('h264');
  expect(video.width).toBe(480);
  expect(video.height).toBe(480);
  expect(audio?.codec_name).toBe('aac');
  expect(Math.abs(parseFloat(probe.format.duration) - 4)).toBeLessThan(0.3);
  expect(errors, `page errors: ${errors.join('\n')}`).toEqual([]);
});
