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

    // 1. Audit DOM Event Log: Assert that live DOM text does not contain secret truth class tokens or uncommitted ground truth
    const eventLog = page.locator('#event-log, [data-testid="event-log"]');
    await expect(eventLog).toBeVisible({ timeout: 5000 });
    const eventLogText = await eventLog.innerText();
    const forbiddenTokens = ['FPV_ATTACK', 'SWARM_ELEMENT_FW', 'RECON_QUAD', 'LOITERING_MUNITION'];
    for (const token of forbiddenTokens) {
      expect(eventLogText).not.toContain(token);
    }

    // 2. Audit Track Table DOM: Headers and estimated value formatting
    const trackTable = page.getByTestId('track-table');
    await expect(trackTable).toBeVisible({ timeout: 5000 });
    const tableText = await trackTable.innerText();
    expect(tableText).toMatch(/~RNG/);
    expect(tableText).toMatch(/~SPD/);
    for (const token of forbiddenTokens) {
      expect(tableText).not.toContain(token);
    }

    // 3. Trigger effector release block and verify operator feedback toast in the DOM
    const targetNo = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      const tNo = win.__DRISHTI_TEST__?.getTrackList()[0]?.trackNo;
      if (tNo) {
        win.__DRISHTI_TEST__?.positionTrack(tNo, { x: 300, y: 300, z: 50 });
      }
      return tNo;
    });
    expect(targetNo).toBeDefined();

    // Select track and trigger fire (target inside PNR boundary < 500m is hard-blocked)
    const trackRow = page.locator('[data-testid="track-table"] button').first();
    await trackRow.click();
    await page.keyboard.press('f');

    const toast = page.getByTestId('operator-feedback-toast');
    await expect(toast).toBeVisible({ timeout: 5000 });
    const toastText = await toast.innerText();
    // Visible toast must contain estimated telemetry (~ or km) and NOT raw un-estimated truth coordinates or secret tokens
    expect(toastText).toMatch(/RELEASE BLOCKED/i);
    expect(toastText).toMatch(/~|km/i);
    for (const token of forbiddenTokens) {
      expect(toastText).not.toContain(token);
    }

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

    // Record selected track's initial uncertainty
    const initialUncertainty = await page.evaluate((tNo) => {
      const win = window as unknown as WindowWithDrishti;
      const opTrack = win.__DRISHTI_TEST__?.getOperatorTracks().find((t) => t.trackNo === tNo);
      return opTrack?.uncertaintyM;
    }, targetNo);
    expect(initialUncertainty).toBeDefined();

    // Degrade/cut radar to OUT via test bridge
    const cutSuccess = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.setSensorCondition({ sensor: 'RADAR', health: 'OUT' });
    });
    expect(cutSuccess).toBe(true);

    // Poll simulation state until sweep timeout has elapsed and coasting / uncertainty growth occur
    await expect.poll(async () => {
      return await page.evaluate((tNo) => {
        const win = window as unknown as WindowWithDrishti;
        const opTrack = win.__DRISHTI_TEST__?.getOperatorTracks().find((t) => t.trackNo === tNo);
        if (!opTrack) return false;
        return opTrack.isCoasting;
      }, targetNo);
    }, { timeout: 10000, intervals: [200, 500] }).toBe(true);

    const coastingTrack = await page.evaluate((tNo) => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.getOperatorTracks().find((t) => t.trackNo === tNo);
    }, targetNo);
    expect(coastingTrack).toBeDefined();
    expect(coastingTrack?.isCoasting).toBe(true);
    expect(coastingTrack!.uncertaintyM).toBeGreaterThan(initialUncertainty!);

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
    await setupSession(page, 'http://127.0.0.1:4173/HawkEyeAAR/', true);

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

    // Position target within clear optical reach (< 1000m)
    await page.evaluate((trk) => {
      const win = window as unknown as WindowWithDrishti;
      win.__DRISHTI_TEST__?.positionTrack(trk!, { x: 800, y: 800, z: 100 });
    }, targetNo);

    // Wait until observation is resolved via expect.poll
    await expect.poll(async () => {
      return await page.evaluate((tNo) => {
        const win = window as unknown as WindowWithDrishti;
        const state = win.__DRISHTI_TEST__?.getPresentationState(tNo);
        return state?.tracks.find((t) => t.trackNo === tNo)?.observation !== undefined;
      }, targetNo);
    }, { timeout: 10000, intervals: [200, 500] }).toBe(true);

    // Verify presentation state observation uses neutral morphology and estimated range HUD
    const state = await page.evaluate((tNo) => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.getPresentationState(tNo);
    }, targetNo);

    expect(state).toBeDefined();
    const selTrack = state?.tracks.find((t) => t.trackNo === targetNo);
    expect(selTrack).toBeDefined();
    expect(selTrack?.estRangeM).toBeGreaterThan(0);
    expect(selTrack?.observation).toBeDefined();

    const allowedCategories = ['RADAR_SYMBOL', 'OBSERVED_MULTIROTOR', 'OBSERVED_FIXED_WING', 'BIRD', 'UNRESOLVED_AIRFRAME', 'UNKNOWN_AIRFRAME'];
    expect(allowedCategories).toContain(selTrack!.currentCategory);
    // Strictly verify no tactical classification in category or morphology
    expect(selTrack!.currentCategory).not.toBe('HOSTILE_ATTACK');
    expect(selTrack!.currentCategory).not.toBe('HOSTILE_ISR');
    expect(selTrack!.currentCategory).not.toBe('SWARM_ELEMENT');

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

    // Deterministically advance to genuine SESSION_END via test bridge
    const finishAdvancement = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.advanceToSessionEnd();
    });
    expect(finishAdvancement).toBe(true);

    const isEnded = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.isSessionEnded();
    });
    expect(isEnded).toBe(true);

    const sessionStatus = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.getSessionStatus();
    });
    expect(sessionStatus).toBe('COMPLETED');

    // Wait for AAR modal (either already auto-opened upon session completion, or open via TopBar button)
    const aarModal = page.locator('[data-testid="aar-modal"], div.fixed.inset-0').first();
    if (!(await aarModal.isVisible())) {
      const aarBtn = page.getByRole('button', { name: /\[AAR SCORECARD\]|AAR SCORECARD/i });
      if (await aarBtn.isVisible()) {
        await aarBtn.click({ force: true });
      }
    }
    await expect(aarModal).toBeVisible({ timeout: 5000 });

    // Require REPLAY tab and switch to it
    const replayTab = aarModal.getByRole('button', { name: /^REPLAY$/i });
    await expect(replayTab).toBeVisible({ timeout: 5000 });
    await replayTab.click();

    // Verify REPLAY section is active
    const replayHeading = aarModal.getByText(/SYNCHRONIZED AAR TIMELINE REPLAY/i);
    await expect(replayHeading).toBeVisible({ timeout: 5000 });

    // Assert that a recorded sample includes both truth and estimated coordinates
    const snapshotSamples = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.getRecordedSnapshots() ?? [];
    });
    expect(snapshotSamples.length).toBeGreaterThan(0);

    // Find a snapshot sample containing an active track with both truth and estimated coordinates
    const sampleWithEst = snapshotSamples
      .flatMap((s) => s.entities)
      .find((e) => e.tNo && typeof e.x === 'number' && typeof e.estX === 'number');

    expect(sampleWithEst).toBeDefined();
    expect(typeof sampleWithEst?.x).toBe('number');
    expect(typeof sampleWithEst?.y).toBe('number');
    expect(typeof sampleWithEst?.z).toBe('number');
    expect(typeof sampleWithEst?.estX).toBe('number');
    expect(typeof sampleWithEst?.estY).toBe('number');
    expect(typeof sampleWithEst?.estZ).toBe('number');
    expect(typeof sampleWithEst?.estUncertM).toBe('number');
    expect(sampleWithEst?.estUncertM).toBeGreaterThanOrEqual(0);

    // Keep screenshot as an additional artifact after the assertions
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

  test('08. RF Direction-Finding Strobes Render Bearing-Only Measurements without Range', async ({ page }) => {
    await setupSession(page, 'http://127.0.0.1:4173/HawkEyeAAR/', false);

    // Switch sensor to RF
    const rfBtn = page.getByRole('button', { name: /^\[3\] RF$/i });
    if (await rfBtn.isVisible()) {
      await rfBtn.click();
    }

    // Wait until RF measurements are present via test bridge
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const win = window as unknown as WindowWithDrishti;
        const rf = win.__DRISHTI_TEST__?.getRfMeasurements();
        return rf && rf.length > 0;
      });
    }, { timeout: 10000, intervals: [200, 500] }).toBe(true);

    const rfMeasurements = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.getRfMeasurements() ?? [];
    });

    expect(rfMeasurements.length).toBeGreaterThan(0);
    for (const meas of rfMeasurements) {
      expect(typeof meas.measuredBearingDeg).toBe('number');
      expect(typeof meas.bearingUncertaintyDeg).toBe('number');
      expect(meas.bearingUncertaintyDeg).toBeGreaterThan(0);

      // Strictly verify no range or Cartesian fabrication
      const rawMeas = meas as unknown as Record<string, unknown>;
      expect(rawMeas.x).toBeUndefined();
      expect(rawMeas.y).toBeUndefined();
      expect(rawMeas.z).toBeUndefined();
      expect(rawMeas.rangeM).toBeUndefined();
      expect(rawMeas.trueClass).toBeUndefined();
    }

    // Cut RF to OUT via test bridge
    const cutSuccess = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.setSensorCondition({ sensor: 'RF', health: 'OUT' });
    });
    expect(cutSuccess).toBe(true);

    // Poll until RF measurements are suppressed (0 measurements when sensor is OUT)
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const win = window as unknown as WindowWithDrishti;
        const rf = win.__DRISHTI_TEST__?.getRfMeasurements();
        return rf ? rf.length : -1;
      });
    }, { timeout: 10000, intervals: [200, 500] }).toBe(0);

    const postCutRf = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.getRfMeasurements() ?? [];
    });
    expect(postCutRf.length).toBe(0);

    await saveShot(page, 'task18_08_rf_bearing_only_measurements.png');
  });
});
