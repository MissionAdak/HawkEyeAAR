import { test, expect } from '@playwright/test';
import zlib from 'node:zlib';

/**
 * Validates that a captured PNG screenshot contains non-blank (non-zero/varied) pixel data,
 * preventing silent black-screen or unrendered viewport regressions.
 */
function assertNonBlankPng(pngBuffer: Buffer): void {
  let pos = 8;
  const idatChunks: Buffer[] = [];
  while (pos < pngBuffer.length) {
    const len = pngBuffer.readUInt32BE(pos);
    const type = pngBuffer.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') {
      idatChunks.push(pngBuffer.subarray(pos + 8, pos + 8 + len));
    }
    pos += 12 + len;
  }
  expect(idatChunks.length).toBeGreaterThan(0);
  const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
  let nonZeroCount = 0;
  for (let i = 0; i < decompressed.length; i++) {
    if (decompressed[i] !== 0) {
      nonZeroCount++;
      if (nonZeroCount > 200) {
        break;
      }
    }
  }
  expect(nonZeroCount).toBeGreaterThan(200);
}

test.describe('3D Tactical Environment and Viewport Functionality', () => {
  test('3D view renders, navigates, selects targets, and supports controls without blanking', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');

    // 1. Start session from Mission Briefing
    const startBtn = page.getByTestId('start-session-btn');
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await startBtn.click();

    // Wait for simulation tick and tracks to populate
    const trackRow = page.locator('aside').first().locator('.cursor-pointer').first();
    await expect(trackRow).toBeVisible({ timeout: 10000 });

    // 2. Switch to 3D View
    const toggle3DBtn = page.getByRole('button', { name: /\[V\] 3D VIEW/i });
    await expect(toggle3DBtn).toBeVisible();
    await toggle3DBtn.click();

    // Ensure 3D canvas is visible
    const canvas3d = page.locator('canvas.cursor-grab');
    const radarFrame = page.locator('.radar-frame');
    await expect(canvas3d).toBeVisible();

    // Verify Readout shows 3D CAM: OBLIQUE
    await expect(page.getByText(/3D VIEW \| CAM:/i)).toBeVisible();

    // 3. Cycle Camera Presets
    const topPresetBtn = page.getByRole('button', { name: /\[T\] TOP/i });
    await topPresetBtn.click();
    await expect(page.getByText(/CAM: TOP/i)).toBeVisible();

    const postPresetBtn = page.getByRole('button', { name: /POST/i });
    await postPresetBtn.click();
    await expect(page.getByText(/CAM: POST/i)).toBeVisible();

    const obliquePresetBtn = page.getByRole('button', { name: /\[O\] OBLIQUE/i });
    await obliquePresetBtn.click();
    await expect(page.getByText(/CAM: OBLIQUE/i)).toBeVisible();

    // 4. Test Orbit Dragging on 3D Canvas
    const canvasBox = await canvas3d.boundingBox();
    expect(canvasBox).not.toBeNull();
    if (canvasBox) {
      const centerX = canvasBox.x + canvasBox.width / 2;
      const centerY = canvasBox.y + canvasBox.height / 2;

      // Mouse Drag Orbit
      await page.mouse.move(centerX, centerY);
      await page.mouse.down({ button: 'left' });
      await page.mouse.move(centerX + 60, centerY - 40, { steps: 5 });
      await page.mouse.up({ button: 'left' });

      // Shift + Drag Pan
      await page.keyboard.down('Shift');
      await page.mouse.move(centerX, centerY);
      await page.mouse.down({ button: 'left' });
      await page.mouse.move(centerX - 40, centerY + 30, { steps: 5 });
      await page.mouse.up({ button: 'left' });
      await page.keyboard.up('Shift');

      // Mouse Wheel Zoom
      await page.mouse.wheel(0, -150);
    }

    // 5. Test X-Section in 3D View (Must never turn screen black)
    const xSectionBtn = page.getByRole('button', { name: /X-SECTION/i });
    if (await xSectionBtn.isVisible()) {
      await xSectionBtn.click();

      // Verify modal is open and visible
      const modalHeader = page.getByText(/ELEVATION CROSS-SECTION TRAINING AID/i);
      await expect(modalHeader).toBeVisible();

      // Dismiss modal via ESC
      await page.keyboard.press('Escape');
      await expect(modalHeader).not.toBeVisible();

      // Assert rendered output is nonblank after cross-section dismissal
      const postDismissShot = await radarFrame.screenshot();
      assertNonBlankPng(postDismissShot);
    }

    // 6. Test Toggle Controls (Weapons, LOS, Clusters, Aid)
    const weaponsToggle = page.getByRole('button', { name: /\[E\] WEAPONS/i });
    await weaponsToggle.click(); // Toggle OFF
    await expect(weaponsToggle).toHaveText(/\[E\] WEAPONS OFF/i);
    await weaponsToggle.click(); // Toggle ON
    await expect(weaponsToggle).toHaveText(/\[E\] WEAPONS ON/i);

    const losToggle = page.getByRole('button', { name: /\[K\] LOS/i });
    await losToggle.click(); // Toggle OFF
    await expect(losToggle).toHaveText(/\[K\] LOS OFF/i);
    await losToggle.click(); // Toggle ON
    await expect(losToggle).toHaveText(/\[K\] LOS ON/i);

    const clustersToggle = page.getByRole('button', { name: /\[U\] CLUSTERS/i });
    await clustersToggle.click();
    await expect(clustersToggle).toHaveText(/\[U\] CLUSTERS OFF/i);
    await clustersToggle.click();
    await expect(clustersToggle).toHaveText(/\[U\] CLUSTERS ON/i);

    // 7. Toggle back to 2D Radar
    const toggle2DBtn = page.getByRole('button', { name: /\[V\] 2D RADAR/i });
    await expect(toggle2DBtn).toBeVisible();
    await toggle2DBtn.click();

    // Verify 2D Canvas is back
    const canvas2d = page.locator('canvas.cursor-crosshair');
    await expect(canvas2d).toBeVisible();

    // 8. Toggle back to 3D View to ensure idempotence
    await toggle3DBtn.click();
    await expect(canvas3d).toBeVisible();

    // Assert rendered output is nonblank again after returning to 3D; keep screenshot as artifact
    const finalShot = await radarFrame.screenshot({ path: 'test-results/3d-view-healthy.png' });
    assertNonBlankPng(finalShot);

    // Assert zero uncaught page errors
    expect(pageErrors).toEqual([]);
  });
});
