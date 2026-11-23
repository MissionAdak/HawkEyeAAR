import { test, expect } from '@playwright/test';

/**
 * Helper to measure frame intervals in the browser via requestAnimationFrame.
 * Collects `sampleCount` consecutive frame timestamps and computes summary statistics.
 */
async function measureFrameTiming(page: import('@playwright/test').Page, sampleCount = 60): Promise<{
  meanMs: number;
  p50Ms: number;
  p95Ms: number;
  sampleCount: number;
}> {
  return page.evaluate(async (count) => {
    return new Promise<{ meanMs: number; p50Ms: number; p95Ms: number; sampleCount: number }>((resolve) => {
      const intervals: number[] = [];
      let lastTime = performance.now();
      let frames = 0;

      function onFrame(now: number) {
        const delta = now - lastTime;
        lastTime = now;
        if (frames > 0) {
          intervals.push(delta);
        }
        frames++;
        if (frames <= count) {
          requestAnimationFrame(onFrame);
        } else {
          intervals.sort((a, b) => a - b);
          const sum = intervals.reduce((acc, v) => acc + v, 0);
          const mean = sum / intervals.length;
          const p50 = intervals[Math.floor(intervals.length * 0.5)];
          const p95 = intervals[Math.floor(intervals.length * 0.95)];
          resolve({
            meanMs: Number(mean.toFixed(2)),
            p50Ms: Number(p50.toFixed(2)),
            p95Ms: Number(p95.toFixed(2)),
            sampleCount: intervals.length,
          });
        }
      }

      requestAnimationFrame(onFrame);
    });
  }, sampleCount);
}

test.describe('TASK 25 — Performance, Bundle & Resource Acceptance', () => {
  test('Scenario A & B: 2D baseline and 3D rendering performance with fixed 20 Hz tick invariance', async ({ page }) => {
    await page.goto('/');

    // 1. Start session from Mission Briefing
    const startBtn = page.getByTestId('start-session-btn');
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await startBtn.click();

    // Wait for simulation to populate tracks
    const trackRow = page.locator('aside').first().locator('.cursor-pointer').first();
    await expect(trackRow).toBeVisible({ timeout: 10000 });

    // 2. Measure 2D baseline frame timing
    const timing2D = await measureFrameTiming(page, 60);
    expect(timing2D.sampleCount).toBeGreaterThanOrEqual(50);
    expect(timing2D.meanMs).toBeGreaterThan(0);

    // 3. Verify simulation runs at fixed 20 Hz tick rate (50 ms per tick)
    const tick1 = await page.evaluate(() => window.__DRISHTI_TEST__?.getSimTick?.() ?? -1);
    expect(tick1).toBeGreaterThanOrEqual(0);

    await page.waitForTimeout(500); // NOSONAR typescript:S2925 - calibrated 500ms wall-clock duration to measure 20 Hz tick cadence

    const tick2 = await page.evaluate(() => window.__DRISHTI_TEST__?.getSimTick?.() ?? -1);
    const tickDelta = tick2 - tick1;
    // Over 500ms wall time, tick delta should be in range [7, 13] (nominal 10 ticks at 20 Hz)
    expect(tickDelta).toBeGreaterThanOrEqual(7);
    expect(tickDelta).toBeLessThanOrEqual(14);

    // 4. Switch to 3D View
    const toggleBtn = page.getByRole('button', { name: /\[V\] 3D VIEW/i });
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    const canvas3D = page.locator('canvas.cursor-grab');
    await expect(canvas3D).toBeVisible({ timeout: 5000 });

    // 5. Measure 3D rendering frame timing
    const timing3D = await measureFrameTiming(page, 60);
    expect(timing3D.sampleCount).toBeGreaterThanOrEqual(50);
    expect(timing3D.meanMs).toBeGreaterThan(0);

    // 6. Verify single active animation loop in 3D renderer
    const r3dActive = await page.evaluate(() => {
      const r3d = window.__DRISHTI_TEST__?.getRenderer3D?.() as { animFrameId?: number | null; isDisposed?: boolean } | null;
      return r3d !== null && r3d.isDisposed === false && typeof r3d.animFrameId === 'number';
    });
    expect(r3dActive).toBe(true);

    // 7. Verify simulation tick rate remains strictly 20 Hz under 3D presentation
    const tick3 = await page.evaluate(() => window.__DRISHTI_TEST__?.getSimTick?.() ?? -1);
    await page.waitForTimeout(500); // NOSONAR typescript:S2925 - calibrated 500ms wall-clock duration to measure 20 Hz tick cadence
    const tick4 = await page.evaluate(() => window.__DRISHTI_TEST__?.getSimTick?.() ?? -1);
    const tickDelta3D = tick4 - tick3;
    expect(tickDelta3D).toBeGreaterThanOrEqual(7);
    expect(tickDelta3D).toBeLessThanOrEqual(14);

    console.log('[TASK 25-C Performance Measurements]', {
      timing2D: {
        meanMs: timing2D.meanMs,
        p50Ms: timing2D.p50Ms,
        p95Ms: timing2D.p95Ms,
        estimatedFps: (1000 / timing2D.meanMs).toFixed(1),
      },
      timing3D: {
        meanMs: timing3D.meanMs,
        p50Ms: timing3D.p50Ms,
        p95Ms: timing3D.p95Ms,
        estimatedFps: (1000 / timing3D.meanMs).toFixed(1),
      },
      tickDelta2D_500ms: tickDelta,
      tickDelta3D_500ms: tickDelta3D,
    });
  });

  test('Scenario C: 10 repeated 2D <-> 3D transitions preserve simulation continuity and single rendering loop', async ({ page }) => {
    await page.goto('/');

    const startBtn = page.getByTestId('start-session-btn');
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await startBtn.click();

    const trackRow = page.locator('aside').first().locator('.cursor-pointer').first();
    await expect(trackRow).toBeVisible({ timeout: 10000 });

    let initialTick = await page.evaluate(() => window.__DRISHTI_TEST__?.getSimTick?.() ?? 0);

    // Execute 10 consecutive switching cycles during active simulation
    for (let cycle = 1; cycle <= 10; cycle++) {
      // Switch to 3D
      const to3DBtn = page.getByRole('button', { name: /\[V\] 3D VIEW/i });
      await expect(to3DBtn).toBeVisible();
      await to3DBtn.click();

      const canvas3D = page.locator('canvas.cursor-grab');
      await expect(canvas3D).toBeVisible();

      // Switch to 2D
      const to2DBtn = page.getByRole('button', { name: /\[V\] 2D RADAR/i });
      await expect(to2DBtn).toBeVisible();
      await to2DBtn.click();

      const canvas2D = page.locator('.radar-frame canvas.cursor-crosshair');
      await expect(canvas2D).toBeVisible();

      // Verify clock advanced monotonically
      const currentTick = await page.evaluate(() => window.__DRISHTI_TEST__?.getSimTick?.() ?? 0);
      expect(currentTick).toBeGreaterThan(initialTick);
      initialTick = currentTick;
    }

    // After 10 switches, verify 3D renderer animation loop is stopped while in 2D mode
    const r3dStoppedIn2D = await page.evaluate(() => {
      const r3d = window.__DRISHTI_TEST__?.getRenderer3D?.() as { animFrameId?: number | null } | null;
      return r3d !== null && r3d.animFrameId === null;
    });
    expect(r3dStoppedIn2D).toBe(true);

    // Verify active simulation tracks remain intact
    const tracks = await page.evaluate(() => window.__DRISHTI_TEST__?.getTrackList?.() ?? []);
    expect(tracks.length).toBeGreaterThanOrEqual(1);
  });

  test('TASK 25-E: Offline architecture, zero external requests, and lazy-loaded local chunk verification', async ({ page, context }) => {
    const allRequests: Array<{ url: string; method: string; resourceType: string }> = [];
    const chunkRequests: string[] = [];

    page.on('request', (req) => {
      const url = req.url();
      allRequests.push({ url, method: req.method(), resourceType: req.resourceType() });
      if (url.includes('render3d')) {
        chunkRequests.push(url);
      }
    });

    // 1. Initial 2D load from approved local loopback
    const response = await page.goto('/');
    expect(response?.ok()).toBe(true);

    // Verify Content-Security-Policy: HTTP header and HTML <meta> must strictly enforce CSP
    const headers = response?.headers() ?? {};
    const headerCsp = headers['content-security-policy'];
    expect(headerCsp, 'HTTP response header Content-Security-Policy must be present').toBeDefined();
    expect(headerCsp).toContain("default-src 'self'");
    expect(headerCsp).toContain("connect-src 'none'");

    const metaCsp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(metaCsp, 'HTML <meta http-equiv="Content-Security-Policy"> must be present').not.toBeNull();
    expect(metaCsp).toContain("default-src 'self'");
    expect(metaCsp).toContain("connect-src 'none'");

    // Start session
    const startBtn = page.getByTestId('start-session-btn');
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await startBtn.click();

    await expect(page.locator('.radar-frame canvas.cursor-crosshair')).toBeVisible({ timeout: 5000 });

    // Verify 0 render3d chunks loaded during 2D operation
    expect(chunkRequests).toHaveLength(0);

    // 2. Switch to 3D mode: should dynamically load local render3d chunk
    const to3DBtn = page.getByRole('button', { name: /\[V\] 3D VIEW/i });
    await expect(to3DBtn).toBeVisible();
    await to3DBtn.click();

    const canvas3D = page.locator('canvas.cursor-grab');
    await expect(canvas3D).toBeVisible({ timeout: 5000 });

    // Verify render3d chunk was requested from same-origin loopback
    expect(chunkRequests.length).toBeGreaterThanOrEqual(1);
    for (const chunkUrl of chunkRequests) {
      expect(chunkUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/HawkEyeAAR\/assets\/render3d-[a-zA-Z0-9_-]+\.js$/);
    }

    const chunkRequestCountAfter3D = chunkRequests.length;

    // 3. Switch back to 2D
    const to2DBtn = page.getByRole('button', { name: /\[V\] 2D RADAR/i });
    await expect(to2DBtn).toBeVisible();
    await to2DBtn.click();

    // 4. Re-enter 3D: verify browser cache / in-memory module used without duplicate chunk requests
    await expect(to3DBtn).toBeVisible();
    await to3DBtn.click();
    await expect(canvas3D).toBeVisible();

    expect(chunkRequests).toHaveLength(chunkRequestCountAfter3D);

    // 5. Offline optional 3D verification (TASK 26-B Requirement C):
    // Simulate complete network disconnection and verify switching between 2D and 3D
    await context.setOffline(true);
    try {
      // Step A: Switch from 3D to 2D while offline
      await to2DBtn.click();
      await expect(page.locator('.radar-frame canvas.cursor-crosshair')).toBeVisible();

      // Step B: Re-enter already-loaded 3D view while offline
      await to3DBtn.click();
      await expect(canvas3D).toBeVisible();

      // Step C: Verify optional view works without external requests or new chunk retrieval
      expect(chunkRequests).toHaveLength(chunkRequestCountAfter3D);

      // Step D: Verify authoritative simulation continues advancing offline
      const offlineTick1 = await page.evaluate(() => window.__DRISHTI_TEST__?.getSimTick?.() ?? 0);
      await page.waitForFunction(
        (startTick) => (window.__DRISHTI_TEST__?.getSimTick?.() ?? 0) >= startTick + 5,
        offlineTick1,
        { timeout: 3000 }
      );
      const offlineTick2 = await page.evaluate(() => window.__DRISHTI_TEST__?.getSimTick?.() ?? 0);
      expect(offlineTick2).toBeGreaterThan(offlineTick1);
    } finally {
      // Step E: Cleanly restore network state during test teardown
      await context.setOffline(false);
    }

    // 6. Audit all captured requests: verify ZERO external requests
    const externalRequests = allRequests.filter((r) => {
      const url = r.url;
      return !url.startsWith('http://127.0.0.1') && !url.startsWith('data:') && !url.startsWith('blob:');
    });

    expect(externalRequests, 'No requests should ever leave local loopback (zero external network calls)').toHaveLength(0);

    // Verify 0 analytics, telemetry, or third-party CDN scripts
    const suspiciousRequests = allRequests.filter((r) =>
      /google-analytics|telemetry|sentry|datadog|mixpanel|unpkg|cdnjs|jsdelivr/i.test(r.url)
    );
    expect(suspiciousRequests).toHaveLength(0);
  });
});
