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

    const startBtn = page.getByTestId('start-session-btn');
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();
    await expect(startBtn).not.toBeVisible({ timeout: 5000 });

    if (enable3D) {
      const btn3D = page.getByRole('button', { name: /\[V\] 3D/i });
      await expect(btn3D).toBeVisible({ timeout: 5000 });
      await btn3D.click();
      const canvas3d = page.locator('canvas.cursor-grab');
      await expect(canvas3d).toBeVisible({ timeout: 10000 });
    }

    // Wait for bridge readiness on E2E builds (where __DRISHTI_TEST__ is active)
    await page.waitForFunction(() => {
      const w = window as unknown as WindowWithDrishti;
      if (!('__DRISHTI_TEST__' in w) || !w.__DRISHTI_TEST__) return true;
      return w.__DRISHTI_TEST__.isReady() && w.__DRISHTI_TEST__.getTrackList().length > 0;
    }, undefined, { timeout: 10000 });
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
    await expect(eoirBtn).toBeVisible();
    await eoirBtn.click();

    const autoBtn = page.getByRole('button', { name: /TGT:AUTO/i });
    await expect(autoBtn).toBeVisible();
    await autoBtn.click();

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

    // Poll for the presentation state to resolve to optical airframe
    await expect.poll(async () => {
      return await page.evaluate((tNo) => {
        const w = window as unknown as WindowWithDrishti;
        const bridge = w.__DRISHTI_TEST__;
        if (!bridge) return null;
        const state = bridge.getPresentationState(tNo);
        const track = state.tracks[0];
        if (!track || !track.observation) return null;
        return {
          found: true,
          category: track.currentCategory,
          sensorSource: track.observation.sensorSource,
          resolutionLevel: track.observation.resolutionLevel,
          visibilityState: track.observation.visibilityState,
        };
      }, targetNo);
    }, { timeout: 10000 }).toMatchObject({
      found: true,
      sensorSource: 'EOIR',
      resolutionLevel: 'FULL',
      visibilityState: 'CLEAR',
    });

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
    await expect(eoirBtn).toBeVisible();
    await eoirBtn.click();

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

    // Poll until degraded observation is reflected
    await expect.poll(async () => {
      return await page.evaluate((tNo) => {
        const w = window as unknown as WindowWithDrishti;
        const bridge = w.__DRISHTI_TEST__;
        if (!bridge) return null;
        const state = bridge.getPresentationState(tNo);
        const track = state.tracks[0];
        if (!track || !track.observation) return null;
        return {
          category: track.currentCategory,
          obsHealth: track.observation.sensorHealth,
          obsResolution: track.observation.resolutionLevel,
        };
      }, targetNo);
    }, { timeout: 10000 }).toMatchObject({
      category: 'UNKNOWN_AIRFRAME',
      obsHealth: 'DEG',
      obsResolution: 'DEGRADED',
    });

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
    expect(result.obsVisibility).toMatch(/^DEGRADED/);
  });

  test('Test F — OUT EO/IR Sensor: Offline sensor strictly prohibits optical models (RADAR_SYMBOL)', async ({
    page,
  }) => {
    await setupSession(page);

    // Switch to EO/IR sensor
    const eoirBtn = page.getByRole('button', { name: /\[2\] EO\/IR/i });
    await expect(eoirBtn).toBeVisible();
    await eoirBtn.click();

    // Set EO/IR sensor to OUT
    await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      const bridge = w.__DRISHTI_TEST__;
      if (!bridge) throw new Error('FAIL: __DRISHTI_TEST__ missing');
      bridge.setSensorCondition({ sensor: 'EOIR', health: 'OUT' });
    });

    // Poll until all tracks are confirmed as radar symbols
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const w = window as unknown as WindowWithDrishti;
        const bridge = w.__DRISHTI_TEST__;
        if (!bridge) return null;
        const evaluation = bridge.getPresentationState();
        return {
          trackCount: evaluation.trackCount,
          allAreRadarSymbols: evaluation.allAreRadarSymbols,
        };
      });
    }, { timeout: 10000 }).toMatchObject({
      allAreRadarSymbols: true,
    });

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
    await expect(eoirBtn).toBeVisible();
    await eoirBtn.click();

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

    // Poll until masking is detected and presentation updates to RADAR_SYMBOL
    await expect.poll(async () => {
      return await page.evaluate((tNo) => {
        const w = window as unknown as WindowWithDrishti;
        const bridge = w.__DRISHTI_TEST__;
        if (!bridge) return null;
        const state = bridge.getPresentationState(tNo);
        const track = state.tracks[0];
        return {
          found: !!track,
          category: track?.currentCategory,
          obsVisibility: track?.observation?.visibilityState,
        };
      }, maskedTrackNo);
    }, { timeout: 10000 }).toMatchObject({
      found: true,
      category: 'RADAR_SYMBOL',
      obsVisibility: 'MASKED',
    });

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
    await expect(eoirBtn).toBeVisible();
    await eoirBtn.click();

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

    // Poll until optical model is resolved
    await expect.poll(async () => {
      return await page.evaluate((tNo) => {
        const w = window as unknown as WindowWithDrishti;
        const bridge = w.__DRISHTI_TEST__;
        if (!bridge) return 'RADAR_SYMBOL';
        const state = bridge.getPresentationState(tNo);
        return state.tracks[0]?.currentCategory;
      }, targetNo);
    }, { timeout: 10000 }).not.toBe('RADAR_SYMBOL');

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

    // Poll until classification change is processed
    await expect.poll(async () => {
      return await page.evaluate((tNo) => {
        const w = window as unknown as WindowWithDrishti;
        const bridge = w.__DRISHTI_TEST__;
        if (!bridge) return null;
        const trk = bridge.getTrackList().find((t) => t.trackNo === tNo);
        return trk ? true : null;
      }, targetNo);
    }, { timeout: 5000 }).toBe(true);

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
    await expect(radarBtn).toBeVisible();
    await radarBtn.click();

    // Mandatory interaction: Enable AIRFRAME mode
    const airframeBtn = page.getByRole('button', { name: /TGT:AIR/i });
    await expect(airframeBtn).toBeVisible();
    await airframeBtn.click();

    // Poll until all tracks are confirmed as radar symbols
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const w = window as unknown as WindowWithDrishti;
        const bridge = w.__DRISHTI_TEST__;
        if (!bridge) return false;
        return bridge.getPresentationState().allAreRadarSymbols;
      });
    }, { timeout: 10000 }).toBe(true);

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

  test('Test K — Fail-Closed Sensor Provenance & Health Validation (Task 17.5.1)', async ({ page }) => {
    await setupSession(page);

    // Switch to EO/IR and clear optical conditions
    const eoirBtn = page.getByRole('button', { name: /\[2\] EO\/IR/i });
    await expect(eoirBtn).toBeVisible();
    await eoirBtn.click();

    const tracks = await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getTrackList();
    });
    expect(tracks.length).toBeGreaterThan(0);
    const targetTrack = tracks[0].trackNo;

    // 1. Position target within clear optical reach
    await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.positionTrack(trk, { x: 800, y: 800, z: 100 });
    }, targetTrack);

    // Poll until baseline optical presentation is resolved
    await expect.poll(async () => {
      return await page.evaluate((trk) => {
        const w = window as unknown as WindowWithDrishti;
        return w.__DRISHTI_TEST__?.getPresentationState(trk).tracks[0]?.currentCategory;
      }, targetTrack);
    }, { timeout: 10000 }).not.toBe('RADAR_SYMBOL');

    // Baseline: track is optically resolved
    const baseState = await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getPresentationState(trk);
    }, targetTrack);
    expect(baseState.tracks[0].currentCategory).not.toBe('RADAR_SYMBOL');

    // Subtest 1: Corrupt sensor-health by omitting EOIR key -> fails closed to RADAR_SYMBOL
    await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.setSensorHealthOverride({ RADAR: 'OK', RF: 'OK' });
    });
    const missingHealthState = await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getPresentationState(trk);
    }, targetTrack);
    expect(missingHealthState.tracks[0].currentCategory).toBe('RADAR_SYMBOL');

    // Subtest 2: Corrupt sensor-health with invalid state string -> fails closed to RADAR_SYMBOL
    await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.setSensorHealthOverride({ RADAR: 'OK', EOIR: 'MALFUNCTION', RF: 'OK' });
    });
    const malformedHealthState = await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getPresentationState(trk);
    }, targetTrack);
    expect(malformedHealthState.tracks[0].currentCategory).toBe('RADAR_SYMBOL');

    // Restore health override
    await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.setSensorHealthOverride(null);
    });

    // Subtest 3: Inject NaN timestamp -> fails closed to RADAR_SYMBOL
    await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.injectObservationOverride(trk, { timestampMs: NaN });
    }, targetTrack);
    const nanTimeState = await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getPresentationState(trk);
    }, targetTrack);
    expect(nanTimeState.tracks[0].currentCategory).toBe('RADAR_SYMBOL');

    // Subtest 4: Inject future timestamp -> fails closed to RADAR_SYMBOL
    await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.injectObservationOverride(trk, { timestampMs: 9999999 });
    }, targetTrack);
    const futureTimeState = await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getPresentationState(trk);
    }, targetTrack);
    expect(futureTimeState.tracks[0].currentCategory).toBe('RADAR_SYMBOL');

    // Subtest 5: Inject inconsistent resolution fields -> fails closed to RADAR_SYMBOL
    await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.injectObservationOverride(trk, {
        resolutionLevel: 'FULL',
        resolution: 'DEGRADED',
      });
    }, targetTrack);
    const inconsistentResState = await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getPresentationState(trk);
    }, targetTrack);
    expect(inconsistentResState.tracks[0].currentCategory).toBe('RADAR_SYMBOL');

    // Subtest 6: Clear overrides -> returns to resolved optical presentation
    await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.clearOverrides();
    });
    await expect.poll(async () => {
      return await page.evaluate((trk) => {
        const w = window as unknown as WindowWithDrishti;
        return w.__DRISHTI_TEST__?.getPresentationState(trk).tracks[0]?.currentCategory;
      }, targetTrack);
    }, { timeout: 10000 }).not.toBe('RADAR_SYMBOL');
    const restoredState = await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getPresentationState(trk);
    }, targetTrack);
    expect(restoredState.tracks[0].currentCategory).not.toBe('RADAR_SYMBOL');

    await saveShot(page, 'task17_5_03_fail_closed_provenance.png');
  });

  test('Test L — Mandatory Simulation Clock & Timestamp Boundary Enforcement (Task 17.5.2)', async ({ page }) => {
    await setupSession(page);

    // Switch to EO/IR
    const eoirBtn = page.getByRole('button', { name: /\[2\] EO\/IR/i });
    await expect(eoirBtn).toBeVisible();
    await eoirBtn.click();

    const tracks = await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getTrackList();
    });
    expect(tracks.length).toBeGreaterThan(0);
    const targetTrack = tracks[0].trackNo;

    // Position target within clear optical reach (< 1000m)
    await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.positionTrack(trk, { x: 800, y: 800, z: 100 });
    }, targetTrack);

    // 1. Normal valid clock allows optical model
    await expect.poll(async () => {
      return await page.evaluate((trk) => {
        const w = window as unknown as WindowWithDrishti;
        return w.__DRISHTI_TEST__?.getPresentationState(trk).tracks[0]?.currentCategory;
      }, targetTrack);
    }, { timeout: 10000 }).not.toBe('RADAR_SYMBOL');

    const baseState = await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getPresentationState(trk);
    }, targetTrack);
    expect(baseState.tracks[0].currentCategory).not.toBe('RADAR_SYMBOL');

    // 2. setSimTimeOverride('MISSING') forces RADAR_SYMBOL
    await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.setSimTimeOverride('MISSING');
    });
    const missingClockState = await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getPresentationState(trk);
    }, targetTrack);
    expect(missingClockState.tracks[0].currentCategory).toBe('RADAR_SYMBOL');

    // 3. setSimTimeOverride('INVALID') forces RADAR_SYMBOL
    await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.setSimTimeOverride('INVALID');
    });
    const invalidClockState = await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getPresentationState(trk);
    }, targetTrack);
    expect(invalidClockState.tracks[0].currentCategory).toBe('RADAR_SYMBOL');

    // 4. NaN observation timestamp forces RADAR_SYMBOL
    await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.setSimTimeOverride(null); // clear sim time override
    });
    await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.injectObservationOverride(trk, { timestampMs: NaN });
    }, targetTrack);
    const nanTimeState = await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getPresentationState(trk);
    }, targetTrack);
    expect(nanTimeState.tracks[0].currentCategory).toBe('RADAR_SYMBOL');

    // Set fixed simulation time for exact boundary testing (currentSimMs = 5000)
    await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.setSimTimeOverride(5000);
    });

    // 5. Observation exactly 50 ms in future (5050 ms) is accepted
    await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.injectObservationOverride(trk, {
        timestampMs: 5050,
        signature: 'MULTIROTOR_COMPACT',
        observedSignature: 'MULTIROTOR_COMPACT',
        resolutionLevel: 'FULL',
        resolution: 'FULL',
        visibilityState: 'CLEAR',
        confidence: 0.95,
      });
    }, targetTrack);
    const futureExactState = await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getPresentationState(trk);
    }, targetTrack);
    expect(futureExactState.tracks[0].currentCategory).toBe('OBSERVED_MULTIROTOR');

    // 6. Observation 51 ms in future (5051 ms) is rejected to RADAR_SYMBOL
    await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.injectObservationOverride(trk, {
        timestampMs: 5051,
        signature: 'MULTIROTOR_COMPACT',
        observedSignature: 'MULTIROTOR_COMPACT',
        resolutionLevel: 'FULL',
        resolution: 'FULL',
        visibilityState: 'CLEAR',
        confidence: 0.95,
      });
    }, targetTrack);
    const futureBeyondState = await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getPresentationState(trk);
    }, targetTrack);
    expect(futureBeyondState.tracks[0].currentCategory).toBe('RADAR_SYMBOL');

    // 7. Observation exactly 1000 ms old (4000 ms) is accepted
    await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.injectObservationOverride(trk, {
        timestampMs: 4000,
        signature: 'MULTIROTOR_COMPACT',
        observedSignature: 'MULTIROTOR_COMPACT',
        resolutionLevel: 'FULL',
        resolution: 'FULL',
        visibilityState: 'CLEAR',
        confidence: 0.95,
      });
    }, targetTrack);
    const ageExactState = await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getPresentationState(trk);
    }, targetTrack);
    expect(ageExactState.tracks[0].currentCategory).toBe('OBSERVED_MULTIROTOR');

    // 8. Observation 1001 ms old (3999 ms) is rejected to RADAR_SYMBOL
    await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.injectObservationOverride(trk, {
        timestampMs: 3999,
        signature: 'MULTIROTOR_COMPACT',
        observedSignature: 'MULTIROTOR_COMPACT',
        resolutionLevel: 'FULL',
        resolution: 'FULL',
        visibilityState: 'CLEAR',
        confidence: 0.95,
      });
    }, targetTrack);
    const ageBeyondState = await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getPresentationState(trk);
    }, targetTrack);
    expect(ageBeyondState.tracks[0].currentCategory).toBe('RADAR_SYMBOL');

    // 9. Clearing test overrides restores normal optical presentation
    await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.clearOverrides();
    });
    await expect.poll(async () => {
      return await page.evaluate((trk) => {
        const w = window as unknown as WindowWithDrishti;
        return w.__DRISHTI_TEST__?.getPresentationState(trk).tracks[0]?.currentCategory;
      }, targetTrack);
    }, { timeout: 10000 }).not.toBe('RADAR_SYMBOL');
    const restoredState = await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getPresentationState(trk);
    }, targetTrack);
    expect(restoredState.tracks[0].currentCategory).not.toBe('RADAR_SYMBOL');

    await saveShot(page, 'task17_5_04_mandatory_simulation_clock.png');
  });

  test('Test M — Negative Observation Timestamp & Producer Sensor-Health Integrity (Task 17.5.3)', async ({ page }) => {
    await setupSession(page);

    // Switch to EO/IR
    const eoirBtn = page.getByRole('button', { name: /\[2\] EO\/IR/i });
    await expect(eoirBtn).toBeVisible();
    await eoirBtn.click();

    const tracks = await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getTrackList();
    });
    expect(tracks.length).toBeGreaterThan(0);
    const targetTrack = tracks[0].trackNo;

    // Position target within clear optical reach (< 1000m)
    await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.positionTrack(trk, { x: 800, y: 800, z: 100 });
    }, targetTrack);

    // 1. A valid EO/IR observation can resolve a physical model
    await expect.poll(async () => {
      return await page.evaluate((trk) => {
        const w = window as unknown as WindowWithDrishti;
        return w.__DRISHTI_TEST__?.getPresentationState(trk).tracks[0]?.currentCategory;
      }, targetTrack);
    }, { timeout: 10000 }).not.toBe('RADAR_SYMBOL');

    const baseState = await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getPresentationState(trk);
    }, targetTrack);
    expect(baseState.tracks[0].currentCategory).not.toBe('RADAR_SYMBOL');

    // 2. An observation timestamp of -1 at simulation time zero cannot resolve an optical model
    await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.setSimTimeOverride(0);
    });
    await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.injectObservationOverride(trk, { timestampMs: -1 });
    }, targetTrack);
    const negativeTimestampState = await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getPresentationState(trk);
    }, targetTrack);
    expect(negativeTimestampState.tracks[0].currentCategory).toBe('RADAR_SYMBOL');

    // Clear the timestamp override before testing producer health
    await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.setSimTimeOverride(null);
      w.__DRISHTI_TEST__!.injectObservationOverride(trk, null);
    }, targetTrack);

    // 3. An invalid or missing producer-side EOIR health record cannot generate an approved optical observation
    await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      // Producer health missing EOIR
      w.__DRISHTI_TEST__!.setProducerHealthOverride({ RADAR: 'OK', RF: 'OK' });
    });
    const missingEoirState = await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getPresentationState(trk);
    }, targetTrack);
    expect(missingEoirState.tracks[0].observation).toBeNull();
    expect(missingEoirState.tracks[0].currentCategory).toBe('RADAR_SYMBOL');

    // 4. Invalid or missing producer-side sensor-health data cannot result in OBSERVED_MULTIROTOR, OBSERVED_FIXED_WING, or BIRD
    const malformedProducerHealths = [
      { RADAR: 'OK', EOIR: null, RF: 'OK' },
      { RADAR: 'OK', EOIR: 'MALFUNCTION', RF: 'OK' },
      null,
    ];
    for (const badHealth of malformedProducerHealths) {
      await page.evaluate((h) => {
        const w = window as unknown as WindowWithDrishti;
        w.__DRISHTI_TEST__!.setProducerHealthOverride(h);
      }, badHealth);
      const badState = await page.evaluate((trk) => {
        const w = window as unknown as WindowWithDrishti;
        return w.__DRISHTI_TEST__!.getPresentationState(trk);
      }, targetTrack);
      expect(badState.tracks[0].observation).toBeNull();
      expect(badState.tracks[0].currentCategory).toBe('RADAR_SYMBOL');
      expect(['OBSERVED_MULTIROTOR', 'OBSERVED_FIXED_WING', 'BIRD']).not.toContain(
        badState.tracks[0].currentCategory
      );
    }

    // 5. Valid OUT health preserves the existing sensor-offline behavior
    await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.setProducerHealthOverride({ RADAR: 'OK', EOIR: 'OUT', RF: 'OK' });
    });
    const outState = await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getPresentationState(trk);
    }, targetTrack);
    expect(outState.tracks[0].observation).not.toBeNull();
    expect(outState.tracks[0].observation?.sensorHealth).toBe('OUT');
    expect(outState.tracks[0].observation?.sensorAvailability).toBe(false);
    expect(outState.tracks[0].currentCategory).toBe('RADAR_SYMBOL');

    // 6. Restoring valid producer inputs restores normal presentation
    await page.evaluate(() => {
      const w = window as unknown as WindowWithDrishti;
      w.__DRISHTI_TEST__!.clearOverrides();
    });
    await expect.poll(async () => {
      return await page.evaluate((trk) => {
        const w = window as unknown as WindowWithDrishti;
        return w.__DRISHTI_TEST__?.getPresentationState(trk).tracks[0]?.currentCategory;
      }, targetTrack);
    }, { timeout: 10000 }).not.toBe('RADAR_SYMBOL');
    const restoredState = await page.evaluate((trk) => {
      const w = window as unknown as WindowWithDrishti;
      return w.__DRISHTI_TEST__!.getPresentationState(trk);
    }, targetTrack);
    expect(restoredState.tracks[0].currentCategory).not.toBe('RADAR_SYMBOL');

    await saveShot(page, 'task17_5_05_producer_health_and_epoch_validation.png');
  });
});
