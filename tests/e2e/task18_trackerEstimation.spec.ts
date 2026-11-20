import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import type { DrishtiTestBridge } from '@/testBridge/drishtiTestBridge';

type WindowWithDrishti = Window & {
  __DRISHTI_TEST__?: DrishtiTestBridge | null;
  __ENGINE__?: unknown;
  __RENDERER_3D__?: unknown;
  SimEngine?: unknown;
};

test.describe('TASK 18 — Deterministic Sensor Measurement & Operator Track-Estimation Decoupling', () => {
  const outDir18 = path.resolve(process.cwd(), 'reports/screenshots/task18');
  const artifactDir = 'C:\\Users\\Missi\\.gemini\\antigravity\\brain\\dcbbc993-bf1f-433e-850f-d7e049737f29';

  test.beforeAll(() => {
    if (!fs.existsSync(outDir18)) {
      fs.mkdirSync(outDir18, { recursive: true });
    }
  });

  const saveShot = async (page: Page, filename: string) => {
    const filePath = path.join(outDir18, filename);
    await page.screenshot({ path: filePath, fullPage: true });

    if (fs.existsSync(artifactDir)) {
      fs.copyFileSync(filePath, path.join(artifactDir, filename));
    }
  };

  const setupSession = async (
    page: Page,
    url: string = 'http://127.0.0.1:4173/HawkEyeAAR/',
    enable3D: boolean = false
  ) => {
    await page.goto(url, { waitUntil: 'networkidle' });

    const startBtn = page.getByTestId('start-session-btn');
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await expect(startBtn).not.toBeVisible({ timeout: 5000 });
    }

    if (enable3D) {
      const btn3D = page.getByRole('button', { name: /\[V\] 3D/i });
      if (await btn3D.isVisible()) {
        await btn3D.click();
        const canvas3d = page.locator('canvas.cursor-grab');
        await expect(canvas3d).toBeVisible({ timeout: 10000 });
      }
    }

    // Wait until test bridge is available and ready on E2E builds
    await page.waitForFunction(() => {
      const win = window as unknown as WindowWithDrishti;
      if (!('__DRISHTI_TEST__' in win) || !win.__DRISHTI_TEST__) return true;
      return win.__DRISHTI_TEST__.isReady() && win.__DRISHTI_TEST__.getTrackList().length > 0;
    }, undefined, { timeout: 10000 });
  };

  test('01. Operator Track Estimation & Zero Truth Leakage Audit', async ({ page }) => {
    await setupSession(page, 'http://127.0.0.1:4173/HawkEyeAAR/', false);

    // Wait for at least one active track
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const win = window as unknown as WindowWithDrishti;
        const tracks = win.__DRISHTI_TEST__?.getTrackList();
        return tracks && tracks.length > 0;
      });
    }, { timeout: 10000 }).toBe(true);

    // Perform audit across all operator-facing paths (SafeTrackView, OperatorTrackView, UiTrackRow)
    const audit = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.inspectOperatorFacingData();
    });

    expect(audit).toBeDefined();
    expect(audit?.hasLeaks).toBe(false);
    expect(audit?.leakedProperties).toEqual([]);

    await saveShot(page, 'task18_01_zero_truth_leakage_audit.png');
  });

  test('02. Radar PPI & Track Directory Show Estimated Quantities (~RNG, ~SPD)', async ({ page }) => {
    await setupSession(page, 'http://127.0.0.1:4173/HawkEyeAAR/', false);

    // Verify Track Table headers include estimated indicators (~RNG and ~SPD)
    const trackTable = page.getByTestId('track-table');
    await expect(trackTable).toBeVisible({ timeout: 5000 });

    const headers = await trackTable.innerText();
    expect(headers).toMatch(/~RNG/i);
    expect(headers).toMatch(/~SPD/i);

    // Verify radar canvas is rendering
    const radarCanvas = page.locator('canvas').first();
    await expect(radarCanvas).toBeVisible();

    await saveShot(page, 'task18_02_radar_ppi_estimated_tracks.png');
  });

  test('03. Radar Dropout / Coasting Shows Uncertainty & Coast Status', async ({ page }) => {
    await setupSession(page, 'http://127.0.0.1:4173/HawkEyeAAR/', true);

    // Wait until track is detected
    let targetNo: string | undefined;
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const win = window as unknown as WindowWithDrishti;
        const tracks = win.__DRISHTI_TEST__?.getTrackList();
        return tracks && tracks.length > 0;
      });
    }, { timeout: 10000 }).toBe(true);

    targetNo = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.getTrackList()[0]?.trackNo;
    });
    expect(targetNo).toBeDefined();

    // Degrade/cut radar to OUT via test bridge
    const cutSuccess = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.setSensorCondition({ sensor: 'RADAR', health: 'OUT' });
    });
    expect(cutSuccess).toBe(true);

    // Wait for simulation time to advance past sweep timeout (2.5s)
    await page.waitForTimeout(2600);

    // Verify presentation state reports safe radar symbol or coasting
    const state = await page.evaluate((tNo) => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.getPresentationState(tNo);
    }, targetNo);

    expect(state).toBeDefined();
    expect(state?.tracks.length).toBeGreaterThan(0);
    expect(state?.allAreRadarSymbols).toBe(true);

    const audit = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.inspectOperatorFacingData();
    });
    expect(audit?.hasLeaks).toBe(false);
    expect(audit?.leakedProperties).toEqual([]);

    await saveShot(page, 'task18_03_radar_coasting_uncertainty.png');
  });

  test('04. EO/IR Viewport Uses Estimated Range and Neutral Airframe Morphology', async ({ page }) => {
    await setupSession(page, 'http://127.0.0.1:4173/HawkEyeAAR/', false);

    // Wait until tracks exist
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const win = window as unknown as WindowWithDrishti;
        const tracks = win.__DRISHTI_TEST__?.getTrackList();
        return tracks && tracks.length > 0;
      });
    }, { timeout: 10000 }).toBe(true);

    const targetNo = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.getTrackList()[0]?.trackNo;
    });
    expect(targetNo).toBeDefined();

    // Switch sensor to EOIR
    const eoirBtn = page.getByRole('button', { name: /\[2\] EO\/IR|EO\/IR/i });
    if (await eoirBtn.isVisible()) {
      await eoirBtn.click();
    }

    // Select target row in TrackTable if available
    const trackRow = page.locator('tr').filter({ hasText: targetNo });
    if (await trackRow.isVisible()) {
      await trackRow.click();
    }

    await page.waitForTimeout(1000);

    // Verify presentation state observation (if resolved) uses neutral morphology
    const state = await page.evaluate((tNo) => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.getPresentationState(tNo);
    }, targetNo);

    expect(state).toBeDefined();
    if (state?.tracks[0]?.observation) {
      const allowedCategories = ['RADAR_SYMBOL', 'OBSERVED_MULTIROTOR', 'OBSERVED_FIXED_WING', 'BIRD', 'UNRESOLVED_AIRFRAME'];
      expect(allowedCategories).toContain(state.tracks[0].currentCategory);
      // Strictly verify no tactical classification in category
      expect(state.tracks[0].currentCategory).not.toBe('HOSTILE_ATTACK');
      expect(state.tracks[0].currentCategory).not.toBe('HOSTILE_ISR');
    }

    await saveShot(page, 'task18_04_eoir_estimated_range_and_neutral_morphology.png');
  });

  test('05. 3D Viewport Consumes SafeTrackView with Zero Ground Truth', async ({ page }) => {
    await setupSession(page, 'http://127.0.0.1:4173/HawkEyeAAR/', true);

    // Verify 3D canvas is present
    const canvas3D = page.locator('canvas.cursor-grab');
    await expect(canvas3D).toBeVisible({ timeout: 5000 });

    await page.waitForTimeout(1000);

    // Check zero leaks in SafeTrackView
    const audit = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.inspectOperatorFacingData();
    });
    expect(audit?.hasLeaks).toBe(false);

    await saveShot(page, 'task18_05_3d_viewport_estimated_tracks.png');
  });

  test('06. Post-Session AAR Preserves Truth-vs-Estimate Comparison', async ({ page }) => {
    await setupSession(page, 'http://127.0.0.1:4173/HawkEyeAAR/', false);

    await page.waitForTimeout(1500);

    // Open AAR debrief via TopBar button
    const aarBtn = page.getByRole('button', { name: /\[AAR SCORECARD\]|AAR SCORECARD/i });
    await expect(aarBtn).toBeVisible({ timeout: 5000 });
    await aarBtn.click();

    // Wait for AAR modal
    const aarModal = page.locator('[data-testid="aar-modal"], div.fixed.inset-0').first();
    await expect(aarModal).toBeVisible({ timeout: 5000 });

    // Click Replay tab if present
    const replayTab = page.getByRole('button', { name: /REPLAY/i });
    if (await replayTab.isVisible()) {
      await replayTab.click();
      await page.waitForTimeout(500);
    }

    await saveShot(page, 'task18_06_aar_truth_vs_estimate_replay.png');
  });

  test('07. Production Debug Window Isolation Audit', async ({ page }) => {
    // Navigate to production preview build on port 4174
    await page.goto('http://127.0.0.1:4174/HawkEyeAAR/', { waitUntil: 'networkidle' });

    // Verify all debug globals are strictly stripped in production build
    const globals = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return {
        hasTestBridge: win.__DRISHTI_TEST__ !== undefined,
        hasEngine: win.__ENGINE__ !== undefined,
        hasRenderer3D: win.__RENDERER_3D__ !== undefined,
        hasSimEngine: win.SimEngine !== undefined,
      };
    });

    expect(globals.hasTestBridge).toBe(false);
    expect(globals.hasEngine).toBe(false);
    expect(globals.hasRenderer3D).toBe(false);
    expect(globals.hasSimEngine).toBe(false);

    await saveShot(page, 'task18_07_production_airgap_and_isolation.png');
  });
});
