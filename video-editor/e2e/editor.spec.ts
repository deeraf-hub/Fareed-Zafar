import { expect, test, type Page } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureFixtures, ffprobe } from './fixtures';

const fixtures = ensureFixtures();

async function createProject(page: Page, name: string, aspect: '16:9' | '9:16' | '1:1' = '16:9') {
  await page.goto('/projects');
  await page.getByTestId('new-project').click();
  await page.getByTestId('project-name-input').fill(name);
  await page.getByTestId(`aspect-${aspect}`).click();
  await page.getByTestId('create-project').click();
  await expect(page.getByTestId('editor')).toBeVisible();
  await expect(page.getByTestId('project-title')).toHaveValue(name);
}

async function importFiles(page: Page, files: string[]) {
  await page.getByTestId('file-input').setInputFiles(files);
  await expect(page.getByTestId('asset-item')).toHaveCount(files.length, { timeout: 60_000 });
}

async function addAssetToTimeline(page: Page, index: number) {
  const item = page.getByTestId('asset-item').nth(index);
  await item.hover();
  await item.getByTestId('add-asset').click();
}

async function dragClip(page: Page, clipIndex: number, dx: number, dy = 0, handle?: 'trim-start' | 'trim-end') {
  const clip = page.getByTestId('clip').nth(clipIndex);
  const target = handle ? clip.getByTestId(handle) : clip;
  const box = (await target.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 5 });
  await page.mouse.move(x + dx, y + dy, { steps: 5 });
  await page.mouse.up();
}

async function clipState(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-testid="clip"]')).map((el) => ({
      id: el.dataset.clipId,
      kind: el.dataset.clipKind,
      left: el.offsetLeft,
      width: el.offsetWidth,
      track: (el.parentElement as HTMLElement).dataset.trackLane,
    })),
  );
}

test.describe('Framewright editor (local mode)', () => {
  test('dashboard: create, rename, reopen and delete projects', async ({ page }) => {
    await createProject(page, 'Dashboard test', '9:16');
    await expect(page.getByTestId('aspect-select')).toHaveValue('9:16');
    await page.goto('/projects');
    await expect(page.getByTestId('project-card')).toHaveCount(1);
    await expect(page.getByTestId('project-card')).toContainText('Dashboard test');

    // rename
    await page.getByLabel('Project actions').click();
    await page.getByRole('menuitem', { name: 'Rename' }).click();
    await page.getByTestId('rename-input').fill('Renamed project');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByTestId('project-card')).toContainText('Renamed project');

    // reopen
    await page.getByTestId('project-card').click();
    await expect(page.getByTestId('project-title')).toHaveValue('Renamed project');

    // delete
    await page.goto('/projects');
    await page.getByLabel('Project actions').click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByTestId('confirm-delete').click();
    await expect(page.getByTestId('project-card')).toHaveCount(0);
  });

  test('drag-and-drop from the library onto a specific track', async ({ page }) => {
    await createProject(page, 'DnD test');
    await importFiles(page, [fixtures.video2, fixtures.audio]);
    const lanes = page.getByTestId('track-lane');
    await expect(lanes).toHaveCount(3);
    // Drop the video onto the top (overlay) lane at ~2 s (120 px at 60 px/s).
    await page.getByTestId('asset-item').nth(0).dragTo(lanes.nth(0), { targetPosition: { x: 120, y: 20 } });
    await expect(page.getByTestId('clip')).toHaveCount(1);
    let state = await clipState(page);
    expect(state[0].kind).toBe('video');
    expect(Math.abs(state[0].left - 120)).toBeLessThanOrEqual(8);
    const topLane = await lanes.nth(0).getAttribute('data-track-lane');
    expect(state[0].track).toBe(topLane);
    // Drop the audio file onto the audio lane at 0.
    await page.getByTestId('asset-item').nth(1).dragTo(lanes.nth(2), { targetPosition: { x: 5, y: 20 } });
    await expect(page.getByTestId('clip')).toHaveCount(2);
    state = await clipState(page);
    expect(state.find((c) => c.kind === 'audio')!.left).toBe(0);
    // Dragging an existing clip to another video lane moves it.
    const videoIdx = state.findIndex((c) => c.kind === 'video');
    await dragClip(page, videoIdx, 60, 60);
    state = await clipState(page);
    expect(state.find((c) => c.kind === 'video')!.track).toBe(await lanes.nth(1).getAttribute('data-track-lane'));
    expect(state.find((c) => c.kind === 'video')!.left).toBeGreaterThan(150);
  });

  test('import real media, edit the timeline, preview, autosave, reload and export an MP4', async ({ page }, testInfo) => {
    testInfo.setTimeout(12 * 60 * 1000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await createProject(page, 'E2E export');
    await importFiles(page, [fixtures.video, fixtures.video2, fixtures.audio, fixtures.image]);
    const kinds = await page.getByTestId('asset-item').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.assetKind));
    expect(kinds.sort()).toEqual(['audio', 'image', 'video', 'video']);

    // --- Build a sequence: video A at 0, video B appended, image overlay, text title, music ---
    await addAssetToTimeline(page, 0); // clip-a (6 s) at playhead 0
    await expect(page.getByTestId('clip')).toHaveCount(1);
    await expect(page.getByTestId('sequence-duration')).toContainText('00:06:00');

    // Move playhead to the end and append clip B
    await page.keyboard.press('End');
    await addAssetToTimeline(page, 1);
    await expect(page.getByTestId('clip')).toHaveCount(2);
    await expect(page.getByTestId('sequence-duration')).toContainText('00:10:00');

    // Image overlay on the top track starting at 1 s
    await page.keyboard.press('Home');
    await page.getByTestId('time-ruler').click({ position: { x: 60, y: 10 } }); // 60 px / 60 px-per-s = 1 s
    await expect(page.getByTestId('time-display')).toContainText('00:01:00');
    await addAssetToTimeline(page, 3);
    await expect(page.getByTestId('clip')).toHaveCount(3);
    // Image lands on the lowest video track (occupied) → store picks next free spot or we move it; verify it exists on a video track.
    const clips = await clipState(page);
    expect(clips.filter((c) => c.kind === 'image')).toHaveLength(1);

    // The image should have landed on a free video track (the overlay layer), not been pushed to the end.
    const imageClip = clips.find((c) => c.kind === 'image')!;
    expect(imageClip.left).toBe(60);
    expect(imageClip.track).not.toBe(clips.find((c) => c.kind === 'video')!.track);

    // Shrink image overlay and move it to the top-right in the inspector
    await page.locator('[data-testid="clip"][data-clip-kind="image"]').click({ position: { x: 30, y: 8 } });
    await expect(page.getByTestId('clip-inspector')).toHaveAttribute('data-kind', 'image');
    await page.getByLabel('Scale value').fill('0.4');
    await page.getByLabel('Scale value').press('Enter');
    await page.getByLabel('Position X value').fill('500');
    await page.getByLabel('Position X value').press('Enter');
    await page.getByLabel('Position Y value').fill('-300');
    await page.getByLabel('Position Y value').press('Enter');

    // Title text at the playhead (1 s) on the top track
    await page.getByTestId('tab-text').click();
    await page.getByTestId('add-text-title').click();
    await expect(page.getByTestId('clip-inspector')).toHaveAttribute('data-kind', 'text');
    await page.getByTestId('text-content').fill('Framewright E2E');
    await page.getByTestId('text-animation').selectOption('pop');
    await expect(page.locator('[data-testid="clip"][data-clip-kind="text"]')).toHaveCount(1);

    // Music on the audio track at 0, with a fade out
    await page.getByTestId('tab-media').click();
    await page.keyboard.press('Home');
    await addAssetToTimeline(page, 2);
    await expect(page.locator('[data-testid="clip"][data-clip-kind="audio"]')).toHaveCount(1);
    await expect(page.getByTestId('clip-inspector')).toHaveAttribute('data-kind', 'audio');
    await page.getByLabel('Fade out value').fill('1.5');
    await page.getByLabel('Fade out value').press('Enter');

    // --- Editing operations on clip A ---
    const videoA = page.locator('[data-testid="clip"][data-clip-kind="video"]').first();
    await videoA.click({ position: { x: 40, y: 8 } });
    await expect(page.getByTestId('clip-inspector')).toHaveAttribute('data-kind', 'video');

    // Filters + adjustments + transition
    await page.getByTestId('filter-vivid').click();
    await page.getByLabel('Saturation value').fill('1.4');
    await page.getByLabel('Saturation value').press('Enter');
    await page.getByTestId('transition-in').selectOption('fade');

    // Split clip A at 3 s
    await page.getByTestId('time-ruler').click({ position: { x: 180, y: 10 } }); // 3 s
    await expect(page.getByTestId('time-display')).toContainText('00:03:00');
    await page.getByTestId('split').click();
    await expect(page.locator('[data-testid="clip"][data-clip-kind="video"]')).toHaveCount(3);

    // Delete the middle piece (3–6 s) so there is a gap, then undo
    const pieces = await clipState(page);
    const middle = pieces.filter((c) => c.kind === 'video').sort((a, b) => a.left - b.left)[1];
    await page.locator(`[data-clip-id="${middle.id}"]`).click({ position: { x: 20, y: 8 } });
    await page.keyboard.press('Delete');
    await expect(page.locator('[data-testid="clip"][data-clip-kind="video"]')).toHaveCount(2);
    await page.getByTestId('undo').click();
    await expect(page.locator('[data-testid="clip"][data-clip-kind="video"]')).toHaveCount(3);
    await page.getByTestId('redo').click();
    await expect(page.locator('[data-testid="clip"][data-clip-kind="video"]')).toHaveCount(2);

    // Trim the end of the first piece by ~1 s (60 px) using the right handle
    const before = (await clipState(page)).filter((c) => c.kind === 'video').sort((a, b) => a.left - b.left);
    const firstIdx = (await clipState(page)).findIndex((c) => c.id === before[0].id);
    await dragClip(page, firstIdx, -60, 0, 'trim-end');
    const afterTrim = (await clipState(page)).find((c) => c.id === before[0].id)!;
    expect(afterTrim.width).toBeLessThan(before[0].width - 40);

    // Move clip B left into the gap (drag by -180 px ≈ -3 s); snapping should land it right after the trimmed clip
    const bIdx = (await clipState(page)).findIndex((c) => c.id === before[1].id);
    await dragClip(page, bIdx, -180);
    const afterMove = (await clipState(page)).find((c) => c.id === before[1].id)!;
    expect(afterMove.left).toBeLessThan(before[1].left - 100);

    // Duplicate clip B
    await page.locator(`[data-clip-id="${before[1].id}"]`).click({ position: { x: 20, y: 8 } });
    await page.getByTestId('duplicate').click();
    await expect(page.locator('[data-testid="clip"][data-clip-kind="video"]')).toHaveCount(3);

    // Speed change on the duplicated clip (last video clip)
    const dupId = (await clipState(page)).filter((c) => c.kind === 'video').sort((a, b) => a.left - b.left)[2].id;
    await page.locator(`[data-clip-id="${dupId}"]`).click({ position: { x: 20, y: 8 } });
    const widthBefore = (await clipState(page)).find((c) => c.id === dupId)!.width;
    await page.getByTestId('speed-2').click();
    const widthAfter = (await clipState(page)).find((c) => c.id === dupId)!.width;
    expect(Math.abs(widthAfter * 2 - widthBefore)).toBeLessThan(6);

    // --- Preview playback actually advances and renders pixels ---
    await page.keyboard.press('Home');
    await page.getByTestId('play-toggle').click();
    await page.waitForTimeout(1500);
    const t1 = await page.getByTestId('time-display').textContent();
    await page.getByTestId('play-toggle').click();
    expect(t1).not.toContain('00:00:00 /');
    const nonBlack = await page.evaluate(() => {
      const c = document.querySelector<HTMLCanvasElement>('[data-testid="preview-canvas"]')!;
      const ctx = c.getContext('2d')!;
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let lit = 0;
      for (let i = 0; i < d.length; i += 4 * 97) if (d[i] + d[i + 1] + d[i + 2] > 60) lit++;
      return lit;
    });
    expect(nonBlack).toBeGreaterThan(50);

    // --- Autosave + reload recovery ---
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'local', { timeout: 10_000 });
    const summaryBefore = await clipState(page);
    await page.reload();
    await expect(page.getByTestId('editor')).toBeVisible();
    await expect(page.getByTestId('clip')).toHaveCount(summaryBefore.length);
    const summaryAfter = await clipState(page);
    expect(summaryAfter.map((c) => [c.kind, c.left, c.width, c.track])).toEqual(summaryBefore.map((c) => [c.kind, c.left, c.width, c.track]));
    // Media was restored from IndexedDB (no "Missing" badges)
    await expect(page.getByText('Missing')).toHaveCount(0);
    await expect(page.getByTestId('project-title')).toHaveValue('E2E export');

    // --- Export to MP4 (480p for speed) and verify the file with ffprobe ---
    await page.getByTestId('export-button').click();
    await expect(page.getByTestId('export-form')).toBeVisible();
    await page.getByTestId('export-preset').selectOption('480p');
    const engineOptions = await page.getByTestId('export-engine').locator('option').evaluateAll((els) => els.map((e) => ({ value: (e as HTMLOptionElement).value, disabled: (e as HTMLOptionElement).disabled })));
    console.log('export engines:', JSON.stringify(engineOptions));
    await page.getByTestId('start-export').click();
    await expect(page.getByTestId('export-progress')).toBeVisible();
    await expect(page.getByTestId('export-done')).toBeVisible({ timeout: 9 * 60 * 1000 });
    const summary = await page.getByTestId('export-done').textContent();
    console.log('export summary:', summary);

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('download-export').click();
    const download = await downloadPromise;
    const dir = mkdtempSync(join(tmpdir(), 'fw-e2e-'));
    const outPath = join(dir, download.suggestedFilename());
    await download.saveAs(outPath);
    const probe = ffprobe(outPath);
    console.log('ffprobe:', JSON.stringify(probe.streams.map((s) => ({ type: s.codec_type, codec: s.codec_name, w: s.width, h: s.height, dur: s.duration })), null, 0), 'format', probe.format.format_name, probe.format.duration);
    const video = probe.streams.find((s) => s.codec_type === 'video')!;
    const audio = probe.streams.find((s) => s.codec_type === 'audio');
    expect(probe.format.format_name).toContain('mp4');
    expect(video.codec_name).toBe('h264');
    expect(video.width).toBe(854);
    expect(video.height).toBe(480);
    expect(audio?.codec_name).toBe('aac');
    const expected = (await clipState(page)).reduce((m, c) => Math.max(m, (c.left + c.width) / 60), 0);
    expect(Math.abs(parseFloat(probe.format.duration) - expected)).toBeLessThan(0.6);
    expect(Number(probe.format.size)).toBeGreaterThan(50_000);

    expect(errors, `page errors: ${errors.join('\n')}`).toEqual([]);
  });
});
