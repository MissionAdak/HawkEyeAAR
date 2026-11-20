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

test.describe('TASK 17.5 E2E Security Boundary, Sensor-Health Lifecycle & Neutral Recognition', () => {
  const outDir17_3 = path.resolve(process.cwd(), 'reports/screenshots/task17_3');
  const outDir17_4 = path.resolve(process.cwd(), 'reports/screenshots/task17_4');
  const outDir17_5 = path.resolve(process.cwd(), 'reports/screenshots/task17_5');
  const artifactDir = 'C:\\Users\\Missi\\.gemini\\antigravity\\brain\\dcbbc993-bf1f-433e-850f-d7e049737f29';

  test.beforeAll(() => {
    for (const d of [outDir17_3, outDir17_4, outDir17_5]) {
      if (!fs.existsSync(d)) {
        fs.mkdirSync(d, { recursive: true });
      }
    }
  });

  const saveShot = async (page: Page, filename: string, alsoInTask17_3?: string) => {
    const filePath = path.join(outDir17_5, filename);
    await page.screenshot({ path: filePath, fullPage: true });

    // Also copy to legacy folders for report continuity
    const p17_4 = path.join(outDir17_4, filename);
    fs.copyFileSync(filePath, p17_4);

    if (fs.existsSync(artifactDir)) {
      fs.copyFileSync(filePath, path.join(artifactDir, filename));
    }
    if (alsoInTask17_3) {
      const p17_3 = path.join(outDir17_3, alsoInTask17_3);
      await page.screenshot({ path: p17_3, fullPage: true });
      if (fs.existsSync(artifactDir)) {
        fs.copyFileSync(p17_3, path.join(artifactDir, alsoInTask17_3));
      }
    }
  };

  const setupSession = async (
    page: Page,
    url: string = 'http://127.0.0.1:4173/HawkEyeAAR/',
    enable3D: boolean = true
  ) => {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const startBtn = page.getByTestId('start-session-btn');
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForTimeout(1000);
    }

    if (enable3D) {
      const btn3D = page.getByRole('button', { name: /\[V\] 3D/i });
      if (await btn3D.isVisible()) {
        await btn3D.click();
        await page.waitForTimeout(1500);
      }
      const canvas3d = page.locator('canvas.cursor-grab');
      await expect(canvas3d).toBeVisible();
    }
  };

  test('Test A — Production debug isolation: All prohibited debug globals absent in production build', async ({
    page,
  }) => {
    // Port 4174 serves the clean production build from dist/
    await setupSession(page, 'http://127.0.0.1:4174/HawkEyeAAR/', true);

    const globalsCheck = await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      return {
        hasEngine: '__ENGINE__' in w && w.__ENGINE__ !== null,
        hasRenderer3D: '__RENDERER_3D__' in w && w.__RENDERER_3D__ !== null,
        hasDrishtiTest: '__DRISHTI_TEST__' in w && w.__DRISHTI_TEST__ !== null,
        hasSimEngine: 'SimEngine' in w,
      };
    });

    expect(globalsCheck.hasEngine).toBe(false);
    expect(globalsCheck.hasRenderer3D).toBe(false);
    expect(globalsCheck.hasDrishtiTest).toBe(false);
    expect(globalsCheck.hasSimEngine).toBe(false);

    await saveShot(page, 'task17_5_01_production_debug_isolation.png');
  });

  test('Test B — E2E instrumentation isolation: Controlled test bridge active without truth leakage', async ({
    page,
  }) => {
    // Port 4173 serves the E2E build from dist-e2e/
    await setupSession(page, 'http://127.0.0.1:4173/HawkEyeAAR/', true);

    const isolationCheck = await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      const testBridge = w.__DRISHTI_TEST__;
      if (!testBridge) {
        return { hasBridge: false };
      }

      return {
        hasBridge: true,
        hasEngine: '__ENGINE__' in w && w.__ENGINE__ !== null,
        hasRenderer3D: '__RENDERER_3D__' in w && w.__RENDERER_3D__ !== null,
        isReady: testBridge.isReady(),
        trackCount: testBridge.getTrackList().length,
        // Assert that raw engine or entity internals are NOT directly accessible on bridge
        exposesEngine: 'engine' in testBridge,
        exposesSpec: 'spec' in testBridge,
        exposesCurr: 'curr' in testBridge,
      };
    });

    expect(isolationCheck.hasBridge).toBe(true);
    expect(isolationCheck.hasEngine).toBe(false);
    expect(isolationCheck.hasRenderer3D).toBe(false);
    expect(isolationCheck.isReady).toBe(true);
    expect(isolationCheck.trackCount).toBeGreaterThan(0);
    expect(isolationCheck.exposesEngine).toBe(false);
    expect(isolationCheck.exposesSpec).toBe(false);
    expect(isolationCheck.exposesCurr).toBe(false);
  });

  test('Test C — Sensor health lifecycle: Deterministic chaos onset, recovery, and baseline preservation', async ({
    page,
  }) => {
    await setupSession(page);

    const healthLifecycle = await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      const bridge = w.__DRISHTI_TEST__;
      if (!bridge) throw new Error('FAIL: __DRISHTI_TEST__ missing');

      // 1. Initial baseline
      const initial = bridge.getSensorHealth();

      // 2. Simulate environmental fog between 1000ms and 5000ms
      bridge.setSimChaos([
        { type: 'FOG', severity: 0.8, tStartMs: 1000, tEndMs: 5000 },
        { type: 'JAMMING', severity: 1.0, tStartMs: 6000, tEndMs: 10000 },
      ]);

      // Check effective health at t = 3000ms (during fog)
      const duringFog = bridge.getEffectiveSensorHealth(3000);

      // Check effective health at t = 5500ms (after fog ended) -> MUST recover to OK!
      const afterFog = bridge.getEffectiveSensorHealth(5500);

      // Check effective health at t = 8000ms (during jamming)
      const duringJam = bridge.getEffectiveSensorHealth(8000);

      // Check effective health at t = 12000ms (after jamming ended) -> MUST recover to OK!
      const afterJam = bridge.getEffectiveSensorHealth(12000);

      // 3. Set a damaged baseline: EOIR is OUT
      bridge.setSensorCondition({ sensor: 'EOIR', health: 'OUT' });
      const damagedBaseline = bridge.getEffectiveSensorHealth(3000); // During fog, damaged baseline cannot heal to DEG
      const damagedClear = bridge.getEffectiveSensorHealth(12000);   // Clear weather cannot heal to OK

      // Reset baseline for subsequent tests
      bridge.setSensorCondition({ sensor: 'EOIR', health: 'OK' });
      bridge.setSimChaos([]);

      return {
        initial,
        duringFogEOIR: duringFog.EOIR,
        afterFogEOIR: afterFog.EOIR,
        duringJamRF: duringJam.RF,
        afterJamRF: afterJam.RF,
        damagedDuringFog: damagedBaseline.EOIR,
        damagedDuringClear: damagedClear.EOIR,
      };
    });

    expect(healthLifecycle.initial.EOIR).toBe('OK');
    expect(healthLifecycle.duringFogEOIR).toBe('DEG');
    expect(healthLifecycle.afterFogEOIR).toBe('OK');
    expect(healthLifecycle.duringJamRF).toBe('OUT');
    expect(healthLifecycle.afterJamRF).toBe('OK');
    expect(healthLifecycle.damagedDuringFog).toBe('OUT');
    expect(healthLifecycle.damagedDuringClear).toBe('OUT');

    await saveShot(page, 'task17_5_02_sensor_health_recovery.png');
  });

  test('Test D — EO/IR Clear Observation: Approved observation produces neutral physical morphology', async ({
    page,
  }) => {
    await setupSession(page);

    // Switch to EO/IR sensor
    const eoirBtn = page.getByRole('button', { name: /\[2\] EO\/IR/i });
    await eoirBtn.click();
    await page.waitForTimeout(1000);

    const autoBtn = page.getByRole('button', { name: /TGT:AUTO/i });
    if (await autoBtn.isVisible()) {
      await autoBtn.click();
    }

    // Position one track in unmasked clear optical range (quadrant 2: x = -500, y = 300, z = 60)
    const targetNo = await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      const bridge = w.__DRISHTI_TEST__;
      if (!bridge) throw new Error('FAIL: __DRISHTI_TEST__ missing');
      const tracks = bridge.getTrackList();
      if (tracks.length === 0) throw new Error('FAIL: no active tracks');
      const tNo = tracks[0].trackNo;
      bridge.positionTrack(tNo, { x: -500, y: 300, z: 60 });
      return tNo;
    });

    await page.waitForTimeout(2000);
    await saveShot(page, 'task17_4_02_eoir_physical_models.png', 'task17_3_02_eoir_optical_models.png');

    const result = await page.evaluate((tNo) => {
      const w = window as unknown as WindowWithDrishti;
      const bridge = w.__DRISHTI_TEST__;
      if (!bridge) throw new Error('FAIL: __DRISHTI_TEST__ missing');
      const state = bridge.getPresentationState(tNo);
      const track = state.tracks[0];
      return {
        found: !!track,
        category: track?.currentCategory,
        observation: track?.observation,
      };
    }, targetNo);

    expect(result.found).toBe(true);
    // Neutral morphology: MUST be neutral OBSERVED_MULTIROTOR or OBSERVED_FIXED_WING, NEVER tactical HOSTILE_ATTACK
    expect(['OBSERVED_MULTIROTOR', 'OBSERVED_FIXED_WING']).toContain(result.category);
    expect(result.observation?.sensorSource).toBe('EOIR');
    expect(result.observation?.confidence).toBeGreaterThan(0);
    expect(result.observation?.confidence).toBeLessThanOrEqual(1.0);
    expect(result.observation?.resolutionLevel).toBe('FULL');
    expect(result.observation?.visibilityState).toBe('CLEAR');
  });

  test('Test E — DEG EO/IR Sensor: Produces UNKNOWN_AIRFRAME and DEGRADED_OPTICAL', async ({ page }) => {
    await setupSession(page);

    // Switch to EO/IR sensor
    const eoirBtn = page.getByRole('button', { name: /\[2\] EO\/IR/i });
    await eoirBtn.click();
    await page.waitForTimeout(1000);

    // Position track within optical reach and degrade EO/IR baseline
    const targetNo = await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      const bridge = w.__DRISHTI_TEST__;
      if (!bridge) throw new Error('FAIL: __DRISHTI_TEST__ missing');
      const tracks = bridge.getTrackList();
      const tNo = tracks[0].trackNo;
      bridge.positionTrack(tNo, { x: -500, y: 300, z: 60 });
      bridge.setSensorCondition({ sensor: 'EOIR', health: 'DEG' });
      return tNo;
    });

    await page.waitForTimeout(1500);
    await saveShot(page, 'task17_4_03_deg_eoir_observation.png');

    const result = await page.evaluate((tNo) => {
      const w = window as unknown as WindowWithDrishti;
      const bridge = w.__DRISHTI_TEST__;
      if (!bridge) throw new Error('FAIL: __DRISHTI_TEST__ missing');
      const state = bridge.getPresentationState(tNo);
      const track = state.tracks[0];
      return {
        found: !!track,
        category: track?.currentCategory,
        obsHealth: track?.observation?.sensorHealth,
        obsResolution: track?.observation?.resolutionLevel,
        obsVisibility: track?.observation?.visibilityState,
      };
    }, targetNo);

    expect(result.found).toBe(true);
    // Under DEG sensor health, optical observation is permitted but resolved into generic unresolved airframe
    expect(result.category).toBe('UNKNOWN_AIRFRAME');
    expect(result.obsHealth).toBe('DEG');
    expect(result.obsResolution).toBe('DEGRADED');
    expect(result.obsVisibility).toBe('DEGRADED');
  });

  test('Test F — OUT EO/IR Sensor: Offline sensor strictly prohibits optical models (RADAR_SYMBOL)', async ({
    page,
  }) => {
    await setupSession(page);

    // Switch to EO/IR sensor
    const eoirBtn = page.getByRole('button', { name: /\[2\] EO\/IR/i });
    await eoirBtn.click();
    await page.waitForTimeout(1000);

    // Set EO/IR sensor to OUT
    await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      const bridge = w.__DRISHTI_TEST__;
      if (!bridge) throw new Error('FAIL: __DRISHTI_TEST__ missing');
      bridge.setSensorCondition({ sensor: 'EOIR', health: 'OUT' });
    });

    await page.waitForTimeout(1500);
    await saveShot(page, 'task17_4_04_out_eoir_sensor.png');

    const evaluation = await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      const bridge = w.__DRISHTI_TEST__;
      if (!bridge) throw new Error('FAIL: __DRISHTI_TEST__ missing');
      return bridge.getPresentationState();
    });

    expect(evaluation.trackCount).toBeGreaterThan(0);
    expect(evaluation.allAreRadarSymbols).toBe(true);
  });

  test('Test G — Terrain/building masking: Line-of-sight occlusion enforces RADAR_SYMBOL', async ({ page }) => {
    await setupSession(page);

    // Switch to EO/IR sensor
    const eoirBtn = page.getByRole('button', { name: /\[2\] EO\/IR/i });
    await eoirBtn.click();
    await page.waitForTimeout(1000);

    // Position track inside building zone U1 below 40m roofline (centroid 1898, 1329, z = 20)
    const maskedTrackNo = await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      const bridge = w.__DRISHTI_TEST__;
      if (!bridge) throw new Error('FAIL: __DRISHTI_TEST__ missing');
      bridge.setSensorCondition({ sensor: 'EOIR', health: 'OK' });
      const tracks = bridge.getTrackList();
      const tNo = tracks[0].trackNo;
      bridge.positionTrack(tNo, { x: 1898, y: 1329, z: 20 });
      return tNo;
    });

    await page.waitForTimeout(1500);
    await saveShot(page, 'task17_4_05_masked_target.png');

    const maskedResult = await page.evaluate((tNo) => {
      const w = window as unknown as WindowWithDrishti;
      const bridge = w.__DRISHTI_TEST__;
      if (!bridge) throw new Error('FAIL: __DRISHTI_TEST__ missing');
      const state = bridge.getPresentationState(tNo);
      const track = state.tracks[0];
      return {
        found: !!track,
        category: track?.currentCategory,
        obsVisibility: track?.observation?.visibilityState,
      };
    }, maskedTrackNo);

    expect(maskedResult.found).toBe(true);
    expect(maskedResult.category).toBe('RADAR_SYMBOL');
    expect(maskedResult.obsVisibility).toBe('MASKED');
  });

  test('Test H — Classification independence: Label changes do not alter physical airframe geometry', async ({
    page,
  }) => {
    await setupSession(page);

    // Switch to EO/IR sensor
    const eoirBtn = page.getByRole('button', { name: /\[2\] EO\/IR/i });
    await eoirBtn.click();
    await page.waitForTimeout(1000);

    // Position track in unmasked clear optical range
    const targetNo = await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      const bridge = w.__DRISHTI_TEST__;
      if (!bridge) throw new Error('FAIL: __DRISHTI_TEST__ missing');
      bridge.setSensorCondition({ sensor: 'EOIR', health: 'OK' });
      const tracks = bridge.getTrackList();
      const tNo = tracks[0].trackNo;
      bridge.positionTrack(tNo, { x: -500, y: 300, z: 60 });
      return tNo;
    });

    await page.waitForTimeout(1500);

    const initialRecord = await page.evaluate((tNo) => {
      const w = window as unknown as WindowWithDrishti;
      const bridge = w.__DRISHTI_TEST__;
      if (!bridge) throw new Error('FAIL: __DRISHTI_TEST__ missing');
      const state = bridge.getPresentationState(tNo);
      const track = state.tracks[0];
      return {
        category: track.currentCategory,
        meshUuid: track.meshUuid,
      };
    }, targetNo);

    expect(initialRecord.category).not.toBe('RADAR_SYMBOL');

    // Change operator classification label to FRIENDLY
    await page.evaluate((tNo) => {
      const w = window as unknown as WindowWithDrishti;
      const bridge = w.__DRISHTI_TEST__;
      if (!bridge) throw new Error('FAIL: __DRISHTI_TEST__ missing');
      bridge.classifyTrack(tNo, 'FRIENDLY');
    }, targetNo);

    await page.waitForTimeout(1500);
    await saveShot(page, 'task17_4_06_classification_independence.png', 'task17_3_04_classification_independence.png');

    const postRecord = await page.evaluate((tNo) => {
      const w = window as unknown as WindowWithDrishti;
      const bridge = w.__DRISHTI_TEST__;
      if (!bridge) throw new Error('FAIL: __DRISHTI_TEST__ missing');
      const state = bridge.getPresentationState(tNo);
      const track = state.tracks[0];
      return {
        category: track.currentCategory,
        meshUuid: track.meshUuid,
      };
    }, targetNo);

    // Physical category and underlying 3D geometry mesh MUST remain invariant!
    expect(postRecord.category).toBe(initialRecord.category);
    expect(postRecord.meshUuid).toBe(initialRecord.meshUuid);
  });

  test('Test I — RADAR/RF override: TGT:AIR with RADAR or RF selected cannot override symbols', async ({ page }) => {
    await setupSession(page);

    // Select RADAR
    const radarBtn = page.getByRole('button', { name: /\[1\] RADAR/i });
    await radarBtn.click();
    await page.waitForTimeout(1000);

    // Mandatory interaction: Enable AIRFRAME mode
    const airframeBtn = page.getByRole('button', { name: /TGT:AIR/i });
    await expect(airframeBtn).toBeVisible();
    await airframeBtn.click();
    await page.waitForTimeout(1500);

    await saveShot(page, 'task17_3_03_tgtair_radar_override_locked.png');

    const evaluation = await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      const bridge = w.__DRISHTI_TEST__;
      if (!bridge) throw new Error('FAIL: __DRISHTI_TEST__ missing');
      return bridge.getPresentationState();
    });

    expect(evaluation.trackCount).toBeGreaterThan(0);
    expect(evaluation.allAreRadarSymbols).toBe(true);
  });

  test('Test J — EVAL mode restrictions: Zero truth leakage in EVAL mode', async ({ page }) => {
    await setupSession(page, 'http://127.0.0.1:4173/HawkEyeAAR/?mode=EVAL', true);
    await saveShot(page, 'task17_3_05_eval_truth_locked.png');

    const audit = await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      const bridge = w.__DRISHTI_TEST__;
      if (!bridge) throw new Error('FAIL: __DRISHTI_TEST__ missing in EVAL');
      return bridge.inspectOperatorFacingData();
    });

    expect(audit.hasLeaks).toBe(false);
    expect(audit.leakedProperties).toHaveLength(0);
  });
});
