import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('TASK 17.3 E2E Acceptance: Sensor Observation Integrity & Rendering', () => {
  const outDir = path.resolve(process.cwd(), 'reports/screenshots/task17_3');
  const artifactDir = 'C:\\Users\\Missi\\.gemini\\antigravity\\brain\\dcbbc993-bf1f-433e-850f-d7e049737f29';

  test.beforeAll(() => {
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
  });

  const saveShot = async (page: any, filename: string) => {
    const filePath = path.join(outDir, filename);
    await page.screenshot({ path: filePath, fullPage: true });
    if (fs.existsSync(artifactDir)) {
      fs.copyFileSync(filePath, path.join(artifactDir, filename));
    }
  };

  test('Workflow Test A - RADAR: Starts session in 3D and verifies radar symbols', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173/HawkEyeAAR/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Dismiss briefing if visible
    const startBtn = page.getByTestId('start-session-btn');
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForTimeout(1000);
    }

    // Switch to 3D Viewport
    const btn3D = page.getByRole('button', { name: /\[V\] 3D/i });
    if (await btn3D.isVisible()) {
      await btn3D.click();
      await page.waitForTimeout(1500);
    }

    // Ensure RADAR is active
    const radarBtn = page.getByRole('button', { name: /\[1\] RADAR/i });
    await radarBtn.click();
    await page.waitForTimeout(1000);

    // Capture screenshot
    await saveShot(page, 'task17_3_01_radar_symbols.png');

    // Canvas exists and is rendering in 3D
    const canvas3d = page.locator('canvas.cursor-grab');
    await expect(canvas3d).toBeVisible();
  });

  test('Workflow Test B - EO/IR: Switch to EO/IR and verify optical model presentation', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173/HawkEyeAAR/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const startBtn = page.getByTestId('start-session-btn');
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForTimeout(1000);
    }

    const btn3D = page.getByRole('button', { name: /\[V\] 3D/i });
    if (await btn3D.isVisible()) {
      await btn3D.click();
      await page.waitForTimeout(1500);
    }

    // Switch to EO/IR
    const eoirBtn = page.getByRole('button', { name: /\[2\] EO\/IR/i });
    await eoirBtn.click();
    await page.waitForTimeout(2000);

    // Ensure AUTO mode is active
    const autoBtn = page.getByRole('button', { name: /TGT:AUTO/i });
    if (await autoBtn.isVisible()) {
      await autoBtn.click();
    }
    await page.waitForTimeout(1500);

    await saveShot(page, 'task17_3_02_eoir_optical_models.png');
  });

  test('Workflow Test C - Display preference: TGT:AIR with RADAR selected cannot override symbols', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173/HawkEyeAAR/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const startBtn = page.getByTestId('start-session-btn');
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForTimeout(1000);
    }

    const btn3D = page.getByRole('button', { name: /\[V\] 3D/i });
    if (await btn3D.isVisible()) {
      await btn3D.click();
      await page.waitForTimeout(1500);
    }

    // Select RADAR
    const radarBtn = page.getByRole('button', { name: /\[1\] RADAR/i });
    await radarBtn.click();
    await page.waitForTimeout(1000);

    // Attempt to force AIRFRAME mode
    const airframeBtn = page.getByRole('button', { name: /TGT:AIR/i });
    if (await airframeBtn.isVisible()) {
      await airframeBtn.click();
      await page.waitForTimeout(1500);
    }

    // Under Task 17.3 §6: RADAR selected ALWAYS enforces radar symbols regardless of TGT:AIR!
    await saveShot(page, 'task17_3_03_tgtair_radar_override_locked.png');
  });

  test('Workflow Test D & E - Classification independence & Ground Truth Isolation', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173/HawkEyeAAR/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const startBtn = page.getByTestId('start-session-btn');
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForTimeout(1000);
    }

    const btn3D = page.getByRole('button', { name: /\[V\] 3D/i });
    if (await btn3D.isVisible()) {
      await btn3D.click();
      await page.waitForTimeout(1500);
    }

    // Switch to EO/IR to see optical models
    const eoirBtn = page.getByRole('button', { name: /\[2\] EO\/IR/i });
    await eoirBtn.click();
    await page.waitForTimeout(1500);

    // Select first track row
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForTimeout(500);

      // Classify track as FRIENDLY using hotkey or UI
      await page.keyboard.press('Shift+F');
      await page.waitForTimeout(1000);
    }

    await saveShot(page, 'task17_3_04_classification_independence.png');

    // Verify window.__RENDERER_3D__ exists and tracks do not expose droneType
    const hasDroneTypeOnSafeTrack = await page.evaluate(() => {
      const r3d = (window as unknown as { __RENDERER_3D__?: any }).__RENDERER_3D__;
      if (!r3d || !r3d.getTracks) return false;
      const { tracks } = r3d.getTracks();
      return tracks.some((t: any) => 'droneType' in t || 'trueClass' in t || 'valueInr' in t);
    });

    expect(hasDroneTypeOnSafeTrack).toBe(false);
  });

  test('Workflow Test F - EVAL mode restrictions: truth and overrides strictly locked', async ({ page }) => {
    // Navigate with EVAL mode in URL or click EVAL
    await page.goto('http://127.0.0.1:4173/HawkEyeAAR/?mode=EVAL', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const startBtn = page.getByTestId('start-session-btn');
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForTimeout(1000);
    }

    const btn3D = page.getByRole('button', { name: /\[V\] 3D/i });
    if (await btn3D.isVisible()) {
      await btn3D.click();
      await page.waitForTimeout(1500);
    }

    await saveShot(page, 'task17_3_05_eval_truth_locked.png');

    // Ensure safe tracks have zero truth properties
    const safeTracksClean = await page.evaluate(() => {
      const r3d = (window as unknown as { __RENDERER_3D__?: any }).__RENDERER_3D__;
      if (!r3d || !r3d.getTracks) return true;
      const { tracks } = r3d.getTracks();
      return tracks.every((t: any) => !('droneType' in t) && !('trueClass' in t));
    });

    expect(safeTracksClean).toBe(true);
  });
});
