import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('TASK 17.4 E2E Sensor Observation Integrity & Non-Vacuous Verification', () => {
  const outDir17_3 = path.resolve(process.cwd(), 'reports/screenshots/task17_3');
  const outDir17_4 = path.resolve(process.cwd(), 'reports/screenshots/task17_4');
  const artifactDir = 'C:\\Users\\Missi\\.gemini\\antigravity\\brain\\dcbbc993-bf1f-433e-850f-d7e049737f29';

  test.beforeAll(() => {
    if (!fs.existsSync(outDir17_3)) {
      fs.mkdirSync(outDir17_3, { recursive: true });
    }
    if (!fs.existsSync(outDir17_4)) {
      fs.mkdirSync(outDir17_4, { recursive: true });
    }
  });

  const saveShot = async (page: any, filename: string, alsoInTask17_3?: string) => {
    const filePath = path.join(outDir17_4, filename);
    await page.screenshot({ path: filePath, fullPage: true });
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

  const setup3DSession = async (page: any, modeUrl: string = 'http://127.0.0.1:4173/HawkEyeAAR/') => {
    await page.goto(modeUrl, { waitUntil: 'networkidle' });
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

    const canvas3d = page.locator('canvas.cursor-grab');
    await expect(canvas3d).toBeVisible();

    // STRICT NON-VACUOUS CHECK: Verify window.__RENDERER_3D__ is loaded and accessible
    const rendererReady = await page.evaluate(() => {
      const r3d = (window as any).__RENDERER_3D__;
      return !!r3d && typeof r3d.getTracks === 'function';
    });
    expect(rendererReady).toBe(true);
  };

  test('Test 1 - RADAR Mode: Contacts display strictly as RADAR symbols', async ({ page }) => {
    await setup3DSession(page);

    // Switch to RADAR sensor
    const radarBtn = page.getByRole('button', { name: /\[1\] RADAR/i });
    await radarBtn.click();
    await page.waitForTimeout(1000);

    // Capture required screenshots
    await saveShot(page, 'task17_4_01_radar_symbols.png', 'task17_3_01_radar_symbols.png');

    // Observable assertions
    const evaluation = await page.evaluate(() => {
      const r3d = (window as any).__RENDERER_3D__;
      if (!r3d) throw new Error('FAIL: __RENDERER_3D__ missing');
      const { tracks } = r3d.getTracks();
      r3d.update(tracks, null);
      const scene3d = r3d.getScene3D();

      const details = tracks.map((t: any) => {
        const record = scene3d.getTrackRecord(t.trackNo);
        return {
          trackNo: t.trackNo,
          hasRecord: !!record,
          currentCategory: record?.currentCategory,
        };
      });

      return {
        trackCount: tracks.length,
        allAreRadarSymbols: details.length > 0 && details.every((d: any) => d.currentCategory === 'RADAR_SYMBOL'),
        details,
      };
    });

    expect(evaluation.trackCount).toBeGreaterThan(0);
    expect(evaluation.allAreRadarSymbols).toBe(true);
  });

  test('Test 2 - EO/IR Mode: Optical physical airframe models with provenance', async ({ page }) => {
    await setup3DSession(page);

    // Switch to EO/IR sensor
    const eoirBtn = page.getByRole('button', { name: /\[2\] EO\/IR/i });
    await eoirBtn.click();
    await page.waitForTimeout(1000);

    const autoBtn = page.getByRole('button', { name: /TGT:AUTO/i });
    if (await autoBtn.isVisible()) {
      await autoBtn.click();
    }

    // Position one track in unmasked clear optical range (quadrant 2: x = -500, y = 300, range ~583m < 840m fog clear threshold)
    await page.evaluate(() => {
      const eng = (window as any).__ENGINE__;
      if (!eng || !eng.curr) throw new Error('FAIL: __ENGINE__ missing');
      const target = eng.curr.find((e: any) => e.trackNo && e.lifecycle === 'ACTIVE');
      if (target) {
        target.pos = { x: -500, y: 300, z: 60 };
        target.vel = { x: 0, y: 0, z: 0 };
        target.masked = false;
        target.q = 0.95;
      }
    });

    await page.waitForTimeout(2000);

    await saveShot(page, 'task17_4_02_eoir_physical_models.png', 'task17_3_02_eoir_optical_models.png');

    const evaluation = await page.evaluate(() => {
      const r3d = (window as any).__RENDERER_3D__;
      if (!r3d) throw new Error('FAIL: __RENDERER_3D__ missing');
      const { tracks } = r3d.getTracks();
      r3d.update(tracks, null);
      const scene3d = r3d.getScene3D();

      const opticalResolved = tracks
        .map((t: any) => {
          const record = scene3d.getTrackRecord(t.trackNo);
          return {
            trackNo: t.trackNo,
            obs: t.sensorObservation,
            currentCategory: record?.currentCategory,
          };
        })
        .filter((item: any) => item.obs && (item.obs.resolutionLevel === 'FULL' || item.obs.resolution === 'FULL'));

      const provenanceValid = opticalResolved.every((item: any) => {
        const o = item.obs;
        return (
          o.sensorSource === 'EOIR' &&
          typeof o.timestampMs === 'number' &&
          o.confidence >= 0 &&
          o.confidence <= 1 &&
          o.sensorHealth === 'OK' &&
          item.currentCategory !== 'RADAR_SYMBOL'
        );
      });

      return {
        totalTracks: tracks.length,
        opticalResolvedCount: opticalResolved.length,
        provenanceValid,
        opticalCategories: opticalResolved.map((i: any) => i.currentCategory),
      };
    });

    expect(evaluation.totalTracks).toBeGreaterThan(0);
    expect(evaluation.opticalResolvedCount).toBeGreaterThan(0);
    expect(evaluation.provenanceValid).toBe(true);
  });

  test('Test 3 - DEG EO/IR Sensor: Produces UNKNOWN_AIRFRAME with DEGRADED_OPTICAL', async ({ page }) => {
    await setup3DSession(page);

    // Switch to EO/IR sensor
    const eoirBtn = page.getByRole('button', { name: /\[2\] EO\/IR/i });
    await eoirBtn.click();
    await page.waitForTimeout(1000);

    // Position track within optical reach and degrade EO/IR sensor
    const targetNo = await page.evaluate(() => {
      const eng = (window as any).__ENGINE__;
      if (!eng || !eng.curr) throw new Error('FAIL: __ENGINE__ missing');
      const target = eng.curr.find((e: any) => e.trackNo && e.lifecycle === 'ACTIVE');
      if (target) {
        target.pos = { x: -500, y: 300, z: 60 };
        target.vel = { x: 0, y: 0, z: 0 };
        target.masked = false;
        target.q = 0.95;
      }
      eng.sensorHealth.EOIR = 'DEG';
      return target?.trackNo;
    });
    await page.waitForTimeout(1500);

    await saveShot(page, 'task17_4_03_deg_eoir_observation.png');

    const evaluation = await page.evaluate((tNo) => {
      const r3d = (window as any).__RENDERER_3D__;
      if (!r3d) throw new Error('FAIL: __RENDERER_3D__ missing');
      const { tracks } = r3d.getTracks();
      r3d.update(tracks, null);
      const scene3d = r3d.getScene3D();

      const targetTrack = tracks.find((t: any) => t.trackNo === tNo);
      const record = scene3d.getTrackRecord(tNo);

      return {
        trackCount: tracks.length,
        foundTarget: !!targetTrack,
        targetCategory: record?.currentCategory,
        obsResolution: targetTrack?.sensorObservation?.resolutionLevel,
        obsVisibility: targetTrack?.sensorObservation?.visibilityState,
        obsSensorHealth: targetTrack?.sensorObservation?.sensorHealth,
        sensorAvailability: targetTrack?.sensorObservation?.sensorAvailability,
      };
    }, targetNo);

    expect(evaluation.trackCount).toBeGreaterThan(0);
    expect(evaluation.foundTarget).toBe(true);
    // Under DEG sensor health, optical observation is permitted but degraded into generic unresolved airframe
    expect(evaluation.targetCategory).toBe('UNKNOWN_AIRFRAME');
    expect(evaluation.obsResolution).toBe('DEGRADED');
    expect(evaluation.obsVisibility).toBe('DEGRADED');
    expect(evaluation.obsSensorHealth).toBe('DEG');
    expect(evaluation.sensorAvailability).toBe(true);
  });

  test('Test 4 - OUT EO/IR Sensor: Offline sensor prohibits optical models (RADAR_SYMBOL)', async ({ page }) => {
    await setup3DSession(page);

    // Switch to EO/IR sensor
    const eoirBtn = page.getByRole('button', { name: /\[2\] EO\/IR/i });
    await eoirBtn.click();
    await page.waitForTimeout(1000);

    // Set EO/IR sensor to OUT
    await page.evaluate(() => {
      const eng = (window as any).__ENGINE__;
      if (!eng || !eng.curr) throw new Error('FAIL: __ENGINE__ missing');
      eng.sensorHealth.EOIR = 'OUT';
    });
    await page.waitForTimeout(1500);

    await saveShot(page, 'task17_4_04_out_eoir_sensor.png');

    const evaluation = await page.evaluate(() => {
      const r3d = (window as any).__RENDERER_3D__;
      if (!r3d) throw new Error('FAIL: __RENDERER_3D__ missing');
      const { tracks } = r3d.getTracks();
      r3d.update(tracks, null);
      const scene3d = r3d.getScene3D();

      const details = tracks.map((t: any) => {
        const record = scene3d.getTrackRecord(t.trackNo);
        return {
          trackNo: t.trackNo,
          currentCategory: record?.currentCategory,
          obsState: t.sensorObservation?.sensorHealth,
        };
      });

      const allAreRadarSymbols = details.every((d: any) => d.currentCategory === 'RADAR_SYMBOL');
      return {
        trackCount: tracks.length,
        allAreRadarSymbols,
        details,
      };
    });

    expect(evaluation.trackCount).toBeGreaterThan(0);
    expect(evaluation.allAreRadarSymbols).toBe(true);
  });

  test('Test 5 - Masked Target: Line-of-sight masking occludes optical view (RADAR_SYMBOL)', async ({ page }) => {
    await setup3DSession(page);

    // Switch to EO/IR sensor
    const eoirBtn = page.getByRole('button', { name: /\[2\] EO\/IR/i });
    await eoirBtn.click();
    await page.waitForTimeout(1000);

    // Position track inside building zone U1 below the 40m roofline (centroid 1898, 1329, z = 20)
    const maskedTrackNo = await page.evaluate(() => {
      const eng = (window as any).__ENGINE__;
      if (!eng || !eng.curr) throw new Error('FAIL: __ENGINE__ missing');
      const active = eng.curr.find((e: any) => e.trackNo && e.lifecycle === 'ACTIVE');
      if (!active) throw new Error('FAIL: no active track in curr');
      active.pos = { x: 1898, y: 1329, z: 20 };
      active.vel = { x: 0, y: 0, z: 0 };
      return active.trackNo;
    });

    await page.waitForTimeout(1500);
    await saveShot(page, 'task17_4_05_masked_target.png');

    const maskedEvaluation = await page.evaluate((targetNo) => {
      const r3d = (window as any).__RENDERER_3D__;
      if (!r3d) throw new Error('FAIL: __RENDERER_3D__ missing');
      const { tracks } = r3d.getTracks();
      r3d.update(tracks, null);
      const scene3d = r3d.getScene3D();
      const record = scene3d.getTrackRecord(targetNo);
      const safeTrack = tracks.find((t: any) => t.trackNo === targetNo);

      return {
        found: !!safeTrack,
        isMasked: safeTrack?.masked === true,
        currentCategory: record?.currentCategory,
        obsVisibility: safeTrack?.sensorObservation?.visibilityState,
      };
    }, maskedTrackNo);

    expect(maskedEvaluation.found).toBe(true);
    expect(maskedEvaluation.isMasked).toBe(true);
    expect(maskedEvaluation.currentCategory).toBe('RADAR_SYMBOL');
  });

  test('Test 6 - Classification Independence: Label changes do not alter airframe geometry', async ({ page }) => {
    await setup3DSession(page);

    // Switch to EO/IR sensor
    const eoirBtn = page.getByRole('button', { name: /\[2\] EO\/IR/i });
    await eoirBtn.click();
    await page.waitForTimeout(1000);

    // Position track in unmasked clear optical range
    await page.evaluate(() => {
      const eng = (window as any).__ENGINE__;
      if (!eng || !eng.curr) throw new Error('FAIL: __ENGINE__ missing');
      const target = eng.curr.find((e: any) => e.trackNo && e.lifecycle === 'ACTIVE');
      if (target) {
        target.pos = { x: -500, y: 300, z: 60 };
        target.vel = { x: 0, y: 0, z: 0 };
        target.masked = false;
        target.q = 0.95;
      }
    });

    await page.waitForTimeout(1500);

    // Find track with optical resolved category
    const initialCheck = await page.evaluate(() => {
      const r3d = (window as any).__RENDERER_3D__;
      if (!r3d) throw new Error('FAIL: __RENDERER_3D__ missing');
      const { tracks } = r3d.getTracks();
      r3d.update(tracks, null);
      const scene3d = r3d.getScene3D();

      const candidate = tracks.find((t: any) => {
        const record = scene3d.getTrackRecord(t.trackNo);
        return record && record.currentCategory && record.currentCategory !== 'RADAR_SYMBOL';
      });

      if (!candidate) return null;
      const rec = scene3d.getTrackRecord(candidate.trackNo);
      return {
        trackNo: candidate.trackNo,
        initialCategory: rec.currentCategory,
        meshUuid: rec.bodyMesh?.geometry?.uuid,
      };
    });

    expect(initialCheck).not.toBeNull();
    const trackNo = initialCheck!.trackNo;
    const initialCat = initialCheck!.initialCategory;
    const meshUuid = initialCheck!.meshUuid;

    // Mutate operator classification label to FRIENDLY
    await page.evaluate((tNo) => {
      const eng = (window as any).__ENGINE__;
      if (eng && typeof eng.classifyTrack === 'function') {
        eng.classifyTrack(tNo, 'FRIENDLY');
      } else if (eng && eng.curr) {
        const entity = eng.curr.find((e: any) => e.trackNo === tNo);
        if (entity) entity.traineeLabel = 'FRIENDLY';
      }
    }, trackNo);

    await page.waitForTimeout(1500);
    await saveShot(page, 'task17_4_06_classification_independence.png', 'task17_3_04_classification_independence.png');

    const postCheck = await page.evaluate((tNo) => {
      const r3d = (window as any).__RENDERER_3D__;
      const { tracks } = r3d.getTracks();
      r3d.update(tracks, null);
      const scene3d = r3d.getScene3D();
      const safeTrack = tracks.find((t: any) => t.trackNo === tNo);
      const rec = scene3d.getTrackRecord(tNo);

      return {
        traineeLabel: safeTrack?.traineeLabel,
        currentCategory: rec?.currentCategory,
        meshUuid: rec?.bodyMesh?.geometry?.uuid,
      };
    }, trackNo);

    // Label updated
    expect(postCheck.traineeLabel).toBe('FRIENDLY');
    // BUT physical geometry/category remained invariant!
    expect(postCheck.currentCategory).toBe(initialCat);
    expect(postCheck.meshUuid).toBe(meshUuid);
  });

  test('Test 7 - Display preference: TGT:AIR with RADAR selected cannot override symbols', async ({ page }) => {
    await setup3DSession(page);

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

    await saveShot(page, 'task17_3_03_tgtair_radar_override_locked.png');

    const evaluation = await page.evaluate(() => {
      const r3d = (window as any).__RENDERER_3D__;
      if (!r3d) throw new Error('FAIL: __RENDERER_3D__ missing');
      const { tracks } = r3d.getTracks();
      r3d.update(tracks, null);
      const scene3d = r3d.getScene3D();

      return {
        trackCount: tracks.length,
        allAreRadarSymbols: tracks.every((t: any) => {
          const record = scene3d.getTrackRecord(t.trackNo);
          return record?.currentCategory === 'RADAR_SYMBOL';
        }),
      };
    });

    expect(evaluation.trackCount).toBeGreaterThan(0);
    expect(evaluation.allAreRadarSymbols).toBe(true);
  });

  test('Test 8 - EVAL Mode Restrictions: Truth and overrides strictly locked', async ({ page }) => {
    await setup3DSession(page, 'http://127.0.0.1:4173/HawkEyeAAR/?mode=EVAL');
    await saveShot(page, 'task17_3_05_eval_truth_locked.png');

    const safeTracksClean = await page.evaluate(() => {
      const r3d = (window as any).__RENDERER_3D__;
      if (!r3d || !r3d.getTracks) throw new Error('FAIL: __RENDERER_3D__ missing in EVAL');
      const { tracks } = r3d.getTracks();

      if (tracks.length === 0) throw new Error('FAIL: no tracks found in EVAL session');

      const leaks = tracks.filter((t: any) =>
        'droneType' in t ||
        'trueClass' in t ||
        'valueInr' in t ||
        'waypoints' in t ||
        'baseRcsM2' in t
      );

      return {
        totalTracks: tracks.length,
        hasLeaks: leaks.length > 0,
        leakedFields: leaks.map((l: any) => Object.keys(l)),
      };
    });

    expect(safeTracksClean.totalTracks).toBeGreaterThan(0);
    expect(safeTracksClean.hasLeaks).toBe(false);
  });
});
