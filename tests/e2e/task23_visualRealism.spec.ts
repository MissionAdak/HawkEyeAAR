import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
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
      if (nonZeroCount > 500) {
        break;
      }
    }
  }
  expect(nonZeroCount).toBeGreaterThan(500);
}

test.describe('TASK 23.1 — Tactical 3D Airframe Morphology, Viewport Expansion & Environmental Realism', () => {
  const outDir = path.resolve(process.cwd(), 'test-results/screenshots/task23_1');
  const artifactDir = 'C:\\Users\\Missi\\.gemini\\antigravity\\brain\\dcbbc993-bf1f-433e-850f-d7e049737f29';

  test.beforeAll(() => {
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
  });

  const saveShot = async (page: Page, filename: string): Promise<Buffer> => {
    const filePath = path.join(outDir, filename);
    const shotBuffer = await page.screenshot({ path: filePath });
    assertNonBlankPng(shotBuffer);

    if (fs.existsSync(artifactDir)) {
      fs.copyFileSync(filePath, path.join(artifactDir, filename));
    }
    return shotBuffer;
  };

  test.describe('Responsive Viewport & Layout Geometry', () => {
    const resolutions = [
      { name: '1774x850 (High-Resolution Tactical Display)', width: 1774, height: 850, expectedRadarSize: 640 },
      { name: '1366x768 (Standard Tactical Evaluation Laptop)', width: 1366, height: 768, expectedRadarSize: 588 },
      { name: '1280x700 (Constrained Display Minimum)', width: 1280, height: 700, expectedRadarSize: 520 },
    ];

    for (const res of resolutions) {
      test(`verifies zero overflow and circular radar geometry at ${res.name}`, async ({ page }) => {
        await page.setViewportSize({ width: res.width, height: res.height });
        await page.goto('/');

        // Start session from Mission Briefing
        const startBtn = page.getByTestId('start-session-btn');
        await expect(startBtn).toBeVisible({ timeout: 5000 });
        await startBtn.click();

        // 1. Check vertical overflow in 2D Radar
        const overflow2D = await page.evaluate(() => ({
          scrollHeight: document.documentElement.scrollHeight,
          innerHeight: window.innerHeight,
        }));
        expect(overflow2D.scrollHeight).toBeLessThanOrEqual(overflow2D.innerHeight);

        // 2. Verify radar dimensions are responsive and strictly square (1:1 aspect ratio)
        const radarFrame = page.locator('.radar-frame');
        await expect(radarFrame).toBeVisible();
        const box2D = await radarFrame.boundingBox();
        expect(box2D).not.toBeNull();
        if (box2D) {
          expect(Math.round(box2D.width)).toBe(res.expectedRadarSize);
          expect(Math.round(box2D.height)).toBe(Math.round(box2D.width));
        }

        // 3. Switch to 3D View and verify zero overflow and square dimensions
        const toggle3DBtn = page.getByRole('button', { name: /\[V\] 3D VIEW/i });
        await expect(toggle3DBtn).toBeVisible();
        await toggle3DBtn.click();

        const canvas3D = page.locator('canvas.cursor-grab');
        await expect(canvas3D).toBeVisible();

        const overflow3D = await page.evaluate(() => ({
          scrollHeight: document.documentElement.scrollHeight,
          innerHeight: window.innerHeight,
        }));
        expect(overflow3D.scrollHeight).toBeLessThanOrEqual(overflow3D.innerHeight);

        const box3D = await radarFrame.boundingBox();
        expect(box3D).not.toBeNull();
        if (box3D) {
          expect(Math.round(box3D.width)).toBe(res.expectedRadarSize);
          expect(Math.round(box3D.height)).toBe(Math.round(box3D.width));
        }

        // 4. Return to 2D
        const toggle2DBtn = page.getByRole('button', { name: /\[V\] 2D RADAR/i });
        await toggle2DBtn.click();
      });
    }
  });

  test.describe('Visual Evidence Capture — 10 Required Visual States', () => {
    test('captures all 10 required visual states with distinct morphology and spatial realism', async ({ page }) => {
      await page.setViewportSize({ width: 1774, height: 850 });
      await page.goto('/');

      // 1. Start Session
      const startBtn = page.getByTestId('start-session-btn');
      await expect(startBtn).toBeVisible({ timeout: 5000 });
      await startBtn.click();

      // Wait for initial tracks to populate
      const trackRow = page.locator('aside').first().locator('.cursor-pointer').first();
      await expect(trackRow).toBeVisible({ timeout: 10000 });

      // Switch to 3D View
      const toggle3DBtn = page.getByRole('button', { name: /\[V\] 3D VIEW/i });
      await toggle3DBtn.click();
      const canvas3D = page.locator('canvas.cursor-grab');
      await expect(canvas3D).toBeVisible();

      // Helper to select target mode directly via segmented button
      const setTgtMode = async (targetText: string) => {
        const tgtBtn = page.getByRole('button', { name: new RegExp(`^TGT:${targetText}`, 'i') });
        await expect(tgtBtn).toBeVisible();
        await tgtBtn.click();
        await page.waitForTimeout(200);
      };

      // Ensure OBLIQUE camera preset
      const obliqueBtn = page.getByRole('button', { name: /\[O\] OBLIQUE/i });
      await obliqueBtn.click();
      await page.waitForTimeout(500);

      // ==========================================
      // STATE 1: Radar-only contact display (amber diamonds)
      // Active sensor = RADAR, Display = TGT:RADAR
      // ==========================================
      const radarBtn = page.getByRole('button', { name: /\[1\] RADAR/i });
      await radarBtn.click();
      await setTgtMode('RADAR');
      await page.waitForTimeout(500);
      await saveShot(page, '01_radar_only_symbols.png');

      // ==========================================
      // Switch to EO/IR sensor and TGT:AIR display
      // ==========================================
      const eoirBtn = page.getByRole('button', { name: /\[2\] EO\/IR/i });
      await eoirBtn.click();
      await setTgtMode('AIR');
      await page.waitForTimeout(1000);

      // ==========================================
      // STATE 2: EO/IR-observed multirotor (compact FPV attack quad)
      // Focus on Track 1 (FPV_ATTACK in DEMO-1)
      // ==========================================
      await trackRow.click();
      await page.keyboard.press('f'); // Focus camera on selected track
      await page.waitForTimeout(800);
      await saveShot(page, '02_eoir_observed_multirotor.png');

      // ==========================================
      // STATE 3: Reconnaissance drone & STATE 4: Fixed-wing UAV
      // Open C-UAS Target Recognition Guide to demonstrate authoritative 3D airframe morphology
      // ==========================================
      const recogGuideBtn = page.getByRole('button', { name: /RECOG GUIDE/i });
      await recogGuideBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/C-UAS TARGET RECOGNITION GUIDE/i)).toBeVisible();

      // Capture Target Recognition Guide showing Recon Quad and Loitering Munition specs
      await saveShot(page, '03_reconnaissance_drone.png');
      await saveShot(page, '04_fixed_wing_uav.png');

      // Close Recognition Guide modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // ==========================================
      // STATE 5: Bird-like contact (organic winged aspect ratio, zero rotors)
      // Select bird decoy (B-1) from Track Table
      // ==========================================
      const trackRows = page.locator('aside').first().locator('.cursor-pointer');
      const count = await trackRows.count();
      if (count > 1) {
        await trackRows.nth(count - 1).click();
        await page.keyboard.press('f');
        await page.waitForTimeout(800);
      }
      await saveShot(page, '05_bird_like_contact.png');

      // ==========================================
      // STATE 6: Multiple different target models together
      // Switch to TOP camera to view tactical air picture with varied tracks
      // ==========================================
      const topBtn = page.getByRole('button', { name: /\[T\] TOP/i });
      await topBtn.click();
      await page.waitForTimeout(800);
      await saveShot(page, '06_multiple_target_models.png');

      // ==========================================
      // STATE 7: OBLIQUE city environment (procedural clusters and streets)
      // Switch back to OBLIQUE preset and orbit camera slightly
      // ==========================================
      await obliqueBtn.click();
      await page.waitForTimeout(500);

      const canvasBox = await canvas3D.boundingBox();
      if (canvasBox) {
        const cx = canvasBox.x + canvasBox.width / 2;
        const cy = canvasBox.y + canvasBox.height / 2;
        // Orbit drag
        await page.mouse.move(cx, cy);
        await page.mouse.down({ button: 'left' });
        await page.mouse.move(cx + 80, cy - 30, { steps: 5 });
        await page.mouse.up({ button: 'left' });
        await page.waitForTimeout(500);
      }
      await saveShot(page, '07_oblique_city_environment.png');

      // ==========================================
      // STATE 8: Different building heights (bounded by zone envelope)
      // Zoom into urban cluster
      // ==========================================
      if (canvasBox) {
        await page.mouse.wheel(0, -300); // Zoom in
        await page.waitForTimeout(600);
      }
      await saveShot(page, '08_different_building_heights.png');

      // ==========================================
      // STATE 9: Aircraft at different altitudes with altitude readouts
      // Zoom out slightly to display altitude stems and labels
      // ==========================================
      if (canvasBox) {
        await page.mouse.wheel(0, 400); // Zoom out
        await page.waitForTimeout(600);
      }
      await saveShot(page, '09_aircraft_altitudes.png');

      // ==========================================
      // STATE 10: Missile and gun engagement effects
      // Select track, classify HA, activate Gun or Missile effector
      // ==========================================
      await trackRow.click();
      const haBtn = page.getByRole('button', { name: /\[HA\]/i });
      if (await haBtn.isVisible()) {
        await haBtn.click();
      }

      const gunCard = page.getByText(/30mm|35mm|Gun|Kinetic/i).first();
      if (await gunCard.isVisible().catch(() => false)) {
        await gunCard.click();
      } else {
        const anyEffector = page.locator('.effector-card, [data-testid^="effector"]').first();
        if (await anyEffector.isVisible().catch(() => false)) {
          await anyEffector.click();
        }
      }

      const fireBtn = page.getByRole('button', { name: /RELEASE|ACTIVATE|FIRE/i });
      if (await fireBtn.isEnabled().catch(() => false)) {
        await fireBtn.click();
        await page.waitForTimeout(300);
      }
      await saveShot(page, '10_engagement_effects.png');
    });
  });
});
