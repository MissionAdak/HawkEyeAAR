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
    const initialAudit = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.inspectOperatorFacingData();
    });

    expect(initialAudit).toBeDefined();
    expect(initialAudit?.hasLeaks).toBe(false);
    expect(initialAudit?.leakedProperties).toEqual([]);

    // Canonical taxonomy and secret drone model tokens that must never appear in live operator displays
    const forbiddenTokens = [
      'HOSTILE_ATTACK',
      'HOSTILE_ISR',
      'SWARM_ELEMENT',
      'CIVIL_UAS',
      'FPV_ATTACK',
      'RECON_QUAD',
      'LOITERING_MUNITION',
      'FRIENDLY_UAS',
      'SWARM_ELEMENT_FW',
      'OBSERVED_HOSTILE',
    ];

    // Shared Event Log sanitization verification helper across all stages
    const eventLog = page.locator('#event-log, [data-testid="event-log"]');
    await expect(eventLog).toBeVisible({ timeout: 5000 });

    const assertEventLogSanitized = async (stageDescription: string) => {
      const text = await eventLog.innerText();
      for (const token of forbiddenTokens) {
        expect(text, `[${stageDescription}] Forbidden token leaked in event log: ${token}`).not.toContain(token);
      }
      expect(text, `[${stageDescription}] Raw ground-truth X coordinate leaked`).not.toContain('x: 300');
      expect(text, `[${stageDescription}] Raw ground-truth Y coordinate leaked`).not.toContain('y: 300');
      expect(text, `[${stageDescription}] Secret schema key trueClass leaked`).not.toContain('trueClass');
      expect(text, `[${stageDescription}] Secret schema key droneType leaked`).not.toContain('droneType');
      expect(text, `[${stageDescription}] Secret schema key valueInr leaked`).not.toContain('valueInr');
    };

    // Stage 1: Initial Event Log Inspection
    await assertEventLogSanitized('Stage 1 - Initial');

    // B2: Select the track in the Track Table and inspect rendered estimates vs safe OperatorTrackView
    const targetNo = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.getTrackList()[0]?.trackNo;
    });
    expect(targetNo).toBeDefined();

    // Select the EXACT track row in Track Table
    const targetRow = page.locator('[data-testid="track-table"] button').filter({ hasText: targetNo! }).first();
    await expect(targetRow).toBeVisible();
    await targetRow.click();

    // Phase B1 & B2: Independently control authoritative truth and operator estimate
    // Ground Truth: position (300, 300, 50) -> truth horizontal range 424.264 m -> 0.42 km
    // Operator Estimate: independently controlled estimate range 470.0 m -> 0.47 km
    // Both ranges are below the 500 m PNR boundary, but their two-decimal displays differ (0.42 km vs 0.47 km)
    // Internally consistent kinematics: bearing 45 deg, speed 12 m/s -> vx = 8.49 m/s, vy = 8.49 m/s
    const overrideResults = await page.evaluate((tNo) => {
      const win = window as unknown as WindowWithDrishti;
      // 1. Set authoritative Domain A simulation ground truth
      const posOk = win.__DRISHTI_TEST__?.positionTrack(tNo!, { x: 300, y: 300, z: 50 });
      // 2. Independently set Domain C operator track estimate
      const ovrOk = win.__DRISHTI_TEST__?.overrideTrackEstimate(tNo!, {
        estPos: { x: 332.34, y: 332.34, z: 50 },
        estVel: { x: 8.49, y: 8.49, z: 0 },
        estRangeM: 470.0,
        estBearingDeg: 45,
        estSpeedMps: 12,
        uncertaintyM: 20,
        isCoasting: false,
      });
      return { posOk, ovrOk };
    }, targetNo);

    expect(overrideResults.posOk).toBe(true);
    expect(overrideResults.ovrOk).toBe(true);

    // Read authoritative truth position through the E2E-only truth fixture
    const truthData = await page.evaluate((tNo) => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.getTrackList().find((t) => t.trackNo === tNo);
    }, targetNo);
    expect(truthData).toBeDefined();

    // Read the corresponding OperatorTrackView estimate
    const opTrack = await page.evaluate((tNo) => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.getOperatorTracks().find((t) => t.trackNo === tNo);
    }, targetNo);
    expect(opTrack).toBeDefined();

    const truthRawRangeM = Math.hypot(truthData!.pos.x, truthData!.pos.y);
    const truthRangeKmStr = (truthRawRangeM / 1000).toFixed(2); // "0.42"
    const estRangeKmStr = (opTrack!.estRangeM / 1000).toFixed(2); // "0.47"

    // Numerical divergence check prior to DOM assertions: prove non-circular independent estimation
    expect(truthRawRangeM).toBeLessThan(500);
    expect(opTrack!.estRangeM).toBeLessThan(500);
    expect(estRangeKmStr).not.toBe(truthRangeKmStr);
    expect(truthRangeKmStr).toBe('0.42');
    expect(estRangeKmStr).toBe('0.47');

    // Stage 2: Re-inspect Event Log after controlled position and estimator changes
    await assertEventLogSanitized('Stage 2 - Post-Override');

    // Phase C: Track Table DOM Proof
    const renderedRangeElem = targetRow.locator('[data-testid="track-range"]');
    const renderedSpeedElem = targetRow.locator('[data-testid="track-speed"]');
    await expect(renderedRangeElem).toBeVisible();
    await expect(renderedSpeedElem).toBeVisible();

    await expect(renderedRangeElem).toHaveText(estRangeKmStr, { timeout: 5000 });
    await expect(renderedSpeedElem).toHaveText(String(opTrack!.estSpeedMps), { timeout: 5000 });

    const renderedRange = (await renderedRangeElem.innerText()).trim();
    const renderedSpeed = (await renderedSpeedElem.innerText()).trim();

    // Assert that displayed range matches the estimate and differs from truth at UI precision
    expect(renderedRange).toBe(estRangeKmStr); // Matches estimate: "0.47"
    expect(renderedRange).not.toBe(truthRangeKmStr); // Differs from truth: "0.47" !== "0.42"
    expect(renderedSpeed).toBe(String(opTrack!.estSpeedMps)); // Matches estimated speed: "12"

    // Ensure raw ground truth coordinates or unnormalized values do not appear in track row
    expect(renderedRange).not.toBe(truthRawRangeM.toFixed(4));
    expect(renderedRange).not.toBe(String(truthRawRangeM));

    // Phase D: PNR Feedback DOM Proof
    // Trigger effector release block via UI-driven keyboard command on selected track
    await targetRow.click();
    await page.keyboard.press('f');

    const toast = page.getByTestId('operator-feedback-toast');
    await expect(toast).toBeVisible({ timeout: 5000 });
    const toastText = await toast.innerText();

    // Confirm intended PNR rejection branch executed
    expect(toastText).toContain('RELEASE BLOCKED — RELEASE WINDOW CLOSED');
    expect(toastText).toContain('Point of No Return exceeded');

    // Confirm strict format ~X.XX km
    expect(toastText).toMatch(/~\d+\.\d{2}\s*km/);

    // Confirm toast displays the estimated value (~0.47 km), NOT the truth-derived value (~0.42 km)
    const expectedToastEst = `~${estRangeKmStr} km`;
    const forbiddenToastTruth = `~${truthRangeKmStr} km`;
    expect(toastText).toContain(expectedToastEst); // Contains "~0.47 km"
    expect(toastText).not.toContain(forbiddenToastTruth); // Does NOT contain "~0.42 km"
    expect(toastText).not.toContain(`${truthRawRangeM.toFixed(3)} km`);
    expect(toastText).not.toContain(`${truthRawRangeM.toFixed(1)}m`);
    expect(toastText).not.toContain('424.26m');

    for (const token of forbiddenTokens) {
      expect(toastText).not.toContain(token);
    }

    // Stage 3: Re-inspect Event Log after release-block action
    await assertEventLogSanitized('Stage 3 - Post-Fire');

    // Final audit across all operator-facing paths after all mutations
    const finalAudit = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.inspectOperatorFacingData();
    });
    expect(finalAudit?.hasLeaks).toBe(false);
    expect(finalAudit?.leakedProperties).toEqual([]);

    // Clear overrides to restore normal tracker behavior
    await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      win.__DRISHTI_TEST__?.clearOverrides();
    });

    // Verify post-clear state restoration in the E2E test
    const restoredOpTrack = await page.evaluate((tNo) => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.getOperatorTracks().find((t) => t.trackNo === tNo);
    }, targetNo);
    expect(restoredOpTrack).toBeDefined();
    // Restored estimate range should no longer equal the overridden 470.0 m
    expect(restoredOpTrack!.estRangeM).not.toBe(470.0);

    // Assert that the rendered Track Table row updates to display the restored estimate
    await expect(renderedRangeElem).not.toHaveText(estRangeKmStr, { timeout: 5000 });
    const restoredRenderedRange = (await renderedRangeElem.innerText()).trim();
    expect(restoredRenderedRange).not.toBe(estRangeKmStr);

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
