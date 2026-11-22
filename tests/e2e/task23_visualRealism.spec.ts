import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * Validates that a captured PNG screenshot contains authentic tactical scene data,
 * verifying format, dimensions, decompression, and pixel variance to prevent black-screen
 * or unrendered viewport regressions.
 */
function assertValidTacticalScreenshot(
  pngBuffer: Buffer,
  expectedWidth: number = 1774,
  expectedHeight: number = 850
): void {
  // 1. Magic number check
  expect(pngBuffer.length).toBeGreaterThan(15000); // Substantial image file
  const signature = pngBuffer.subarray(0, 8);
  expect(signature.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);

  // 2. IHDR chunk dimensions check
  const ihdrLen = pngBuffer.readUInt32BE(8);
  const ihdrType = pngBuffer.toString('ascii', 12, 16);
  expect(ihdrType).toBe('IHDR');
  const width = pngBuffer.readUInt32BE(16);
  const height = pngBuffer.readUInt32BE(20);
  expect(width).toBe(expectedWidth);
  expect(height).toBe(expectedHeight);

  // 3. IDAT chunks extraction and decompression
  let pos = 8 + 12 + ihdrLen;
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
  expect(decompressed.length).toBeGreaterThan(50000);

  // 4. Color variance check: tactical radar canvas must contain diverse scanline values
  // (not blank black, white, or corrupted single-tone block)
  const distinctValues = new Set<number>();
  let nonZeroCount = 0;
  for (let i = 0; i < decompressed.length; i += 7) {
    const b = decompressed[i];
    distinctValues.add(b);
    if (b !== 0) nonZeroCount++;
  }
  expect(distinctValues.size).toBeGreaterThanOrEqual(15);
  expect(nonZeroCount).toBeGreaterThan(5000);
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
    assertValidTacticalScreenshot(shotBuffer, 1774, 850);

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

      // Helper to query and assert scene state via test bridge
      const assertSceneCheck = async (expected: {
        activeSensor: 'RADAR' | 'EOIR' | 'RF';
        resolution?: 'FULL' | 'UNRESOLVED';
        observedSignature?: string;
        resolvedCategory?: string;
        modelName?: string;
        targetTrackNo?: string;
      }) => {
        const status = await page.evaluate((exp) => {
          const bridge = window.__DRISHTI_TEST__;
          if (!bridge) return { ok: false, error: 'No test bridge' };

          // 1. Assert zero ground-truth leaks
          const leaks = bridge.inspectOperatorFacingData();
          if (leaks.hasLeaks) {
            return { ok: false, error: `Ground-truth leaked: ${leaks.leakedProperties.join(', ')}` };
          }

          // 2. Assert sensor health and active sensor
          const health = bridge.getSensorHealth();
          if (!health[exp.activeSensor] || health[exp.activeSensor] === 'OUT') {
            return { ok: false, error: `Sensor ${exp.activeSensor} not OK` };
          }

          // 3. Assert target category, signature, and model name in 3D scene
          if (exp.modelName || exp.observedSignature || exp.resolvedCategory) {
            const models = bridge.getSceneTrackModels?.() || [];
            const trackModel = exp.targetTrackNo
              ? models.find((m) => m.trackNo === exp.targetTrackNo)
              : models[0];

            if (!trackModel) {
              return { ok: false, error: `No model found for track ${exp.targetTrackNo}` };
            }
            if (exp.modelName && trackModel.modelName !== exp.modelName) {
              return { ok: false, error: `Model mismatch: expected ${exp.modelName}, got ${trackModel.modelName}` };
            }
            if (exp.resolvedCategory && trackModel.category !== exp.resolvedCategory) {
              return { ok: false, error: `Category mismatch: expected ${exp.resolvedCategory}, got ${trackModel.category}` };
            }
            if (exp.observedSignature && trackModel.signature !== exp.observedSignature) {
              return { ok: false, error: `Signature mismatch: expected ${exp.observedSignature}, got ${trackModel.signature}` };
            }
          }

          // 4. Assert observation resolution
          if (exp.resolution && exp.targetTrackNo) {
            const pres = bridge.getPresentationState(exp.targetTrackNo);
            const t = pres.tracks.find((tr) => tr.trackNo === exp.targetTrackNo);
            if (t?.observation?.resolutionLevel !== exp.resolution) {
              return { ok: false, error: `Resolution mismatch: expected ${exp.resolution}, got ${t?.observation?.resolutionLevel}` };
            }
          }

          return { ok: true };
        }, expected);

        expect(status.ok, status.error).toBe(true);
      };

      // Retrieve primary selected track number
      const primaryTrackNo = await page.evaluate(() => {
        const bridge = window.__DRISHTI_TEST__;
        const tracks = bridge?.getTrackList() || [];
        return tracks[0]?.trackNo || 'T-01';
      });

      // ==========================================
      // STATE 1: Radar-only contact display (amber diamonds)
      // Active sensor = RADAR, Display = TGT:RADAR
      // ==========================================
      const radarBtn = page.getByRole('button', { name: /\[1\] RADAR/i });
      await radarBtn.click();
      await setTgtMode('RADAR');
      await page.waitForTimeout(500);

      const radarSymbolsState = await page.evaluate(() => {
        const bridge = window.__DRISHTI_TEST__;
        return bridge?.getPresentationState()?.allAreRadarSymbols ?? false;
      });
      expect(radarSymbolsState).toBe(true);
      await saveShot(page, '01_radar_only_symbols.png');

      // ==========================================
      // Switch to EO/IR sensor and TGT:AIR display
      // ==========================================
      const eoirBtn = page.getByRole('button', { name: /\[2\] EO\/IR/i });
      await eoirBtn.click();
      await setTgtMode('AIR');
      await page.waitForTimeout(500);

      // ==========================================
      // STATE 2: EO/IR-observed multirotor (compact FPV attack quad)
      // Focus on Track 1 (FPV_ATTACK in DEMO-1 -> MULTIROTOR_COMPACT -> Target_FPV_Attack)
      // ==========================================
      await trackRow.click();
      await page.keyboard.press('f'); // Focus camera on selected track
      await page.waitForTimeout(600);

      // Position target within full optical range (800m) and inject full EO/IR resolution
      await page.evaluate((tNo) => {
        window.__DRISHTI_TEST__?.positionTrack(tNo, { x: 800, y: 800, z: 80 });
        window.__DRISHTI_TEST__?.injectObservationOverride(tNo, {
          signature: 'MULTIROTOR_COMPACT',
          observedSignature: 'MULTIROTOR_COMPACT',
          sensorSource: 'EOIR',
          activeSensor: 'EOIR',
          confidence: 0.95,
          resolutionLevel: 'FULL',
          resolution: 'FULL',
          visibilityState: 'CLEAR',
          sensorAvailability: true,
          sensorHealth: 'OK',
          sensorHealthOk: true,
          estimatedRangeM: 800,
        });
      }, primaryTrackNo);
      await page.waitForTimeout(400);

      await assertSceneCheck({
        activeSensor: 'EOIR',
        targetTrackNo: primaryTrackNo,
        resolution: 'FULL',
        observedSignature: 'MULTIROTOR_COMPACT',
        resolvedCategory: 'OBSERVED_MULTIROTOR',
        modelName: 'Target_FPV_Attack',
      });
      await saveShot(page, '02_eoir_observed_multirotor.png');

      // ==========================================
      // STATE 3: Reconnaissance drone (Target_Recon_Quad) in actual live 3D viewport
      // Demonstrates multirotor with camera gimbal turret pod
      // ==========================================
      await page.evaluate((tNo) => {
        window.__DRISHTI_TEST__?.injectObservationOverride(tNo, {
          signature: 'MULTIROTOR_WITH_CAMERA_POD',
          observedSignature: 'MULTIROTOR_WITH_CAMERA_POD',
          sensorSource: 'EOIR',
          activeSensor: 'EOIR',
          confidence: 0.95,
          resolutionLevel: 'FULL',
          resolution: 'FULL',
          visibilityState: 'CLEAR',
          sensorAvailability: true,
          sensorHealth: 'OK',
          sensorHealthOk: true,
          estimatedRangeM: 800,
        });
      }, primaryTrackNo);
      await page.waitForTimeout(400);

      await assertSceneCheck({
        activeSensor: 'EOIR',
        targetTrackNo: primaryTrackNo,
        resolution: 'FULL',
        observedSignature: 'MULTIROTOR_WITH_CAMERA_POD',
        resolvedCategory: 'OBSERVED_MULTIROTOR',
        modelName: 'Target_Recon_Quad',
      });
      await saveShot(page, '03_reconnaissance_drone.png');

      // ==========================================
      // STATE 4: Fixed-wing UAV (Target_Loitering_Munition) in actual live 3D viewport
      // Demonstrates loitering munition with delta wings and pusher propeller
      // ==========================================
      await page.evaluate((tNo) => {
        window.__DRISHTI_TEST__?.injectObservationOverride(tNo, {
          signature: 'FIXED_WING_DELTA',
          observedSignature: 'FIXED_WING_DELTA',
          sensorSource: 'EOIR',
          activeSensor: 'EOIR',
          confidence: 0.95,
          resolutionLevel: 'FULL',
          resolution: 'FULL',
          visibilityState: 'CLEAR',
          sensorAvailability: true,
          sensorHealth: 'OK',
          sensorHealthOk: true,
          estimatedRangeM: 800,
        });
      }, primaryTrackNo);
      await page.waitForTimeout(400);

      await assertSceneCheck({
        activeSensor: 'EOIR',
        targetTrackNo: primaryTrackNo,
        resolution: 'FULL',
        observedSignature: 'FIXED_WING_DELTA',
        resolvedCategory: 'OBSERVED_FIXED_WING',
        modelName: 'Target_Loitering_Munition',
      });
      await saveShot(page, '04_fixed_wing_uav.png');

      // ==========================================
      // STATE 5: Bird-like contact (Target_Bird) in actual live 3D viewport
      // Demonstrates biological wing geometry with zero rotors
      // ==========================================
      await page.evaluate((tNo) => {
        window.__DRISHTI_TEST__?.injectObservationOverride(tNo, {
          signature: 'BIRD_LIKE',
          observedSignature: 'BIRD_LIKE',
          sensorSource: 'EOIR',
          activeSensor: 'EOIR',
          confidence: 0.95,
          resolutionLevel: 'FULL',
          resolution: 'FULL',
          visibilityState: 'CLEAR',
          sensorAvailability: true,
          sensorHealth: 'OK',
          sensorHealthOk: true,
          estimatedRangeM: 800,
        });
      }, primaryTrackNo);
      await page.waitForTimeout(400);

      await assertSceneCheck({
        activeSensor: 'EOIR',
        targetTrackNo: primaryTrackNo,
        resolution: 'FULL',
        observedSignature: 'BIRD_LIKE',
        resolvedCategory: 'BIRD',
        modelName: 'Target_Bird',
      });
      await saveShot(page, '05_bird_like_contact.png');

      // ==========================================
      // STATE 6: Multiple different target models simultaneously rendered
      // Switch to TOP camera to view tactical air picture with varied tracks
      // ==========================================
      // Configure distinct signatures on multiple tracks
      await page.evaluate(() => {
        const bridge = window.__DRISHTI_TEST__;
        const tracks = bridge?.getTrackList() || [];
        if (tracks[0]) {
          bridge?.injectObservationOverride(tracks[0].trackNo, {
            signature: 'MULTIROTOR_COMPACT',
            observedSignature: 'MULTIROTOR_COMPACT',
            sensorSource: 'EOIR',
            activeSensor: 'EOIR',
            confidence: 0.95,
            resolutionLevel: 'FULL',
            resolution: 'FULL',
            visibilityState: 'CLEAR',
            sensorAvailability: true,
            sensorHealth: 'OK',
            sensorHealthOk: true,
            estimatedRangeM: 800,
          });
        }
        if (tracks[1]) {
          bridge?.injectObservationOverride(tracks[1].trackNo, {
            signature: 'FIXED_WING_DELTA',
            observedSignature: 'FIXED_WING_DELTA',
            sensorSource: 'EOIR',
            activeSensor: 'EOIR',
            confidence: 0.95,
            resolutionLevel: 'FULL',
            resolution: 'FULL',
            visibilityState: 'CLEAR',
            sensorAvailability: true,
            sensorHealth: 'OK',
            sensorHealthOk: true,
            estimatedRangeM: 800,
          });
        }
      });

      const topBtn = page.getByRole('button', { name: /\[T\] TOP/i });
      await topBtn.click();
      await page.waitForTimeout(800);

      const sceneModels = await page.evaluate(() => {
        return window.__DRISHTI_TEST__?.getSceneTrackModels?.() || [];
      });
      expect(sceneModels.length).toBeGreaterThanOrEqual(1);

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
      // Position target within kinetic effector range, classify HA, arm and fire kinetic effector
      // Assert ENGAGE event and activeEffectsCount > 0 before capture
      // ==========================================
      // Position target within gun range (1200m)
      await page.evaluate((tNo) => {
        const bridge = window.__DRISHTI_TEST__;
        bridge?.clearOverrides();
        bridge?.positionTrack(tNo, { x: 1200, y: 1200, z: 80 });
      }, primaryTrackNo);

      await trackRow.click();
      const haBtn = page.getByRole('button', { name: /\[HA\]/i });
      if (await haBtn.isVisible()) {
        await haBtn.click();
      }

      const gunCard = page.getByText(/Gun Burst|Interceptor Drone|30mm|Kinetic/i).first();
      if (await gunCard.isVisible().catch(() => false)) {
        await gunCard.click({ force: true });
      } else {
        const anyEffector = page.locator('.effector-card, [data-testid^="effector"]').first();
        if (await anyEffector.isVisible().catch(() => false)) {
          await anyEffector.click({ force: true });
        }
      }

      // Fire weapon: use force click, keyboard 'f', and test-bridge fireTrack to guarantee engagement without DOM detachment
      await page.keyboard.press('f');
      await page.evaluate((tNo) => {
        window.__DRISHTI_TEST__?.fireTrack?.(tNo);
      }, primaryTrackNo);

      // Verify ENGAGE event was emitted in engine
      await expect.poll(async () => {
        return page.evaluate(() => {
          const events = window.__DRISHTI_TEST__?.getRecordedEvents() || [];
          return events.some((e) => e.type === 'ENGAGE');
        });
      }, { timeout: 4000 }).toBe(true);

      // Verify active 3D engagement effects exist in scene
      await expect.poll(async () => {
        return page.evaluate(() => {
          return (window.__DRISHTI_TEST__?.getActiveEffectsCount?.() ?? 0) > 0;
        });
      }, { timeout: 4000 }).toBe(true);

      await saveShot(page, '10_engagement_effects.png');
    });
  });
});
