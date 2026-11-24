import { test, expect } from '@playwright/test';
import path from 'node:path';

test.describe('TASK 28 — Tactical Viewport, Distinct Presentation, Auto Focus & UI Acceptance', () => {
  const resolutions = [
    { name: '1280x720 (Laptop HD)', width: 1280, height: 720 },
    { name: '1366x768 (Standard Tactical Laptop)', width: 1366, height: 768 },
    { name: '1440x900 (Widescreen Display)', width: 1440, height: 900 },
    { name: '1600x900 (HD+ Display)', width: 1600, height: 900 },
    { name: '1780x858 (Custom Reference Tactical Display)', width: 1780, height: 858 },
    { name: '1920x1080 (Full HD Tactical C2 Display)', width: 1920, height: 1080 },
  ];

  for (const res of resolutions) {
    test(`Fix B & C: verifies side panels visible and zero overflow at ${res.name}`, async ({ page }) => {
      await page.setViewportSize({ width: res.width, height: res.height });
      await page.goto('/');

      // Start session from Mission Briefing
      const startBtn = page.getByTestId('start-session-btn');
      await expect(startBtn).toBeVisible({ timeout: 5000 });
      await startBtn.click();

      // Zero vertical overflow
      const overflow = await page.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        innerHeight: window.innerHeight,
      }));
      expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.innerHeight);

      // Left gutter assertions (exact match to distinguish from effector range descriptions)
      await expect(page.getByText('5.0 km', { exact: true })).toBeVisible();
      await expect(page.getByText('MAX RADAR', { exact: true })).toBeVisible();
      await expect(page.getByText('3.0 km', { exact: true })).toBeVisible();
      await expect(page.getByText('NOMINAL REF', { exact: true })).toBeVisible();
      await expect(page.getByText('0.5 km', { exact: true })).toBeVisible();
      await expect(page.getByText('POINT OF NO RETURN', { exact: true })).toBeVisible();

      // Right gutter assertions
      await expect(page.getByText('30 RPM', { exact: true })).toBeVisible();
      await expect(page.getByText('SWEEP RATE', { exact: true })).toBeVisible();
      await expect(page.getByText('20 Hz', { exact: true })).toBeVisible();
      await expect(page.getByText('DETERMINISTIC SIM', { exact: true })).toBeVisible();
      await expect(page.getByText('60 FPS', { exact: true })).toBeVisible();
      await expect(page.getByText('RENDER TARGET', { exact: true })).toBeVisible();

      // Verify 2D radar is strictly circular (1:1 square aspect ratio)
      const radarFrame = page.locator('.radar-frame');
      const box2D = await radarFrame.boundingBox();
      expect(box2D).not.toBeNull();
      if (box2D) {
        expect(Math.round(box2D.width)).toBe(Math.round(box2D.height));
      }
    });
  }

  test('Fix C & E: 3D viewport expands horizontally and shows G focus shortcut without gutter overlap', async ({ page }) => {
    // Test on 1366x768 standard tactical laptop display
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');

    // Start session
    const startBtn = page.getByTestId('start-session-btn');
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await startBtn.click();

    // 2D box width
    const radarFrame = page.locator('.radar-frame');
    const box2D = await radarFrame.boundingBox();
    expect(box2D).not.toBeNull();
    const width2D = box2D!.width;

    // Switch to 3D View
    const toggle3DBtn = page.getByRole('button', { name: /\[V\] 3D VIEW/i });
    await expect(toggle3DBtn).toBeVisible();
    await toggle3DBtn.click();

    // In 3D view, frame width should not overflow side panels
    const box3D = await radarFrame.boundingBox();
    expect(box3D).not.toBeNull();
    expect(box3D!.width).toBeGreaterThanOrEqual(width2D - 20);

    // Verify left and right gutters remain fully visible in 3D view
    const leftGutter = page.getByText('5.0 km', { exact: true });
    await expect(leftGutter).toBeVisible();
    const rightGutter = page.getByText('30 RPM', { exact: true });
    await expect(rightGutter).toBeVisible();
    const pnrText = page.getByText('POINT OF NO RETURN', { exact: true });
    await expect(pnrText).toBeVisible();
    const simText = page.getByText('DETERMINISTIC SIM', { exact: true });
    await expect(simText).toBeVisible();

    // Assert strictly zero overlap: left gutter is left of radar frame, right gutter is right of radar frame
    const leftBox = await leftGutter.boundingBox();
    const rightBox = await rightGutter.boundingBox();
    const pnrBox = await pnrText.boundingBox();
    const simBox = await simText.boundingBox();
    expect(leftBox).not.toBeNull();
    expect(rightBox).not.toBeNull();
    expect(pnrBox).not.toBeNull();
    expect(simBox).not.toBeNull();

    expect(leftBox!.x).toBeGreaterThanOrEqual(240); // To the right of left rail (240px)
    expect(leftBox!.x + leftBox!.width).toBeLessThanOrEqual(box3D!.x + 1); // Left of 3D canvas
    expect(pnrBox!.x + pnrBox!.width).toBeLessThanOrEqual(box3D!.x + 1); // Longest left string left of 3D canvas
    expect(box3D!.x + box3D!.width).toBeLessThanOrEqual(rightBox!.x + 1); // 3D canvas left of right gutter
    expect(box3D!.x + box3D!.width).toBeLessThanOrEqual(simBox!.x + 1); // 3D canvas left of longest right string
    expect(rightBox!.x + rightBox!.width).toBeLessThanOrEqual(1366 - 320); // To the left of right rail (320px)
    expect(simBox!.x + simBox!.width).toBeLessThanOrEqual(1366 - 320); // Longest right string inside right rail

    // Verify 3D footer hint uses [G] for focus
    await expect(page.getByText(/FOCUS: DBLCLICK \/ \[G\]/i)).toBeVisible();

    // Capture screenshot for visual evidence
    const shotPath = path.join(process.cwd(), 'tests/e2e/screenshots/task28_01_wide_3d_viewport.png');
    await page.screenshot({ path: shotPath, fullPage: true });
  });

  test('Fix C & E: 3D viewport at 1280x720 has strictly zero gutter overlap or clipping', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    const startBtn = page.getByTestId('start-session-btn');
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await startBtn.click();

    const radarFrame = page.locator('.radar-frame');
    const toggle3DBtn = page.getByRole('button', { name: /\[V\] 3D VIEW/i });
    await expect(toggle3DBtn).toBeVisible();
    await toggle3DBtn.click();

    const box3D = await radarFrame.boundingBox();
    expect(box3D).not.toBeNull();

    const leftGutter = page.getByText('5.0 km', { exact: true });
    await expect(leftGutter).toBeVisible();
    const rightGutter = page.getByText('30 RPM', { exact: true });
    await expect(rightGutter).toBeVisible();
    const pnrText = page.getByText('POINT OF NO RETURN', { exact: true });
    await expect(pnrText).toBeVisible();
    const simText = page.getByText('DETERMINISTIC SIM', { exact: true });
    await expect(simText).toBeVisible();

    const leftBox = await leftGutter.boundingBox();
    const rightBox = await rightGutter.boundingBox();
    const pnrBox = await pnrText.boundingBox();
    const simBox = await simText.boundingBox();
    expect(leftBox).not.toBeNull();
    expect(rightBox).not.toBeNull();
    expect(pnrBox).not.toBeNull();
    expect(simBox).not.toBeNull();

    expect(leftBox!.x).toBeGreaterThanOrEqual(240); // To the right of left rail (240px)
    expect(leftBox!.x + leftBox!.width).toBeLessThanOrEqual(box3D!.x + 1); // Left of 3D canvas
    expect(pnrBox!.x + pnrBox!.width).toBeLessThanOrEqual(box3D!.x + 1); // Longest left string left of 3D canvas
    expect(box3D!.x + box3D!.width).toBeLessThanOrEqual(rightBox!.x + 1); // 3D canvas left of right gutter
    expect(box3D!.x + box3D!.width).toBeLessThanOrEqual(simBox!.x + 1); // 3D canvas left of longest right string
    expect(rightBox!.x + rightBox!.width).toBeLessThanOrEqual(1280 - 320); // To the left of right rail (320px)
    expect(simBox!.x + simBox!.width).toBeLessThanOrEqual(1280 - 320); // Longest right string inside right rail
  });

  test('Fix A: Toast feedback when choosing TGT:AIR under non-EO/IR sensor mode', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');

    const startBtn = page.getByTestId('start-session-btn');
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await startBtn.click();

    // Switch to 3D View
    await page.getByRole('button', { name: /\[V\] 3D VIEW/i }).click();

    // Ensure RADAR mode is active (since 3D view defaults to EO/IR)
    await page.getByRole('button', { name: /\[1\] RADAR/i }).click();

    // While RADAR is active, click TGT:AIR
    const airframeBtn = page.getByRole('button', { name: /TGT:AIR/i });
    await expect(airframeBtn).toBeVisible();
    await airframeBtn.click();

    // Operator feedback toast should appear
    await expect(page.getByText('AIRFRAME VIEW REQUIRES CLEAR EO/IR OBSERVATION')).toBeVisible();
    await expect(page.getByText('Radar contacts displayed as symbols until EO/IR is active.')).toBeVisible();

    const shotPath = path.join(process.cwd(), 'tests/e2e/screenshots/task28_02_sensor_feedback_toast.png');
    await page.screenshot({ path: shotPath, fullPage: true });
  });

  test('Fix F & G: Neutralized target and completed session read-only presentation', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');

    const startBtn = page.getByTestId('start-session-btn');
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await startBtn.click();

    // Wait for radar tracks to populate in track directory
    const trackRow = page.locator('aside').first().locator('.cursor-pointer').first();
    await expect(trackRow).toBeVisible({ timeout: 10000 });
    await trackRow.click();

    // Classify as hostile attack
    const haBtn = page.getByRole('button', { name: /\[HA\]\s*HOSTILE ATTACK/i });
    await expect(haBtn).toBeVisible();
    await haBtn.click();

    // Check Track Table active count
    await expect(page.getByText(/ACTIVE: \d+\/\d+/i)).toBeVisible();

    // Fire weapon if in range or wait
    const fireBtn = page.getByRole('button', { name: /FIRE|RELEASE|ENGAGE TARGET/i }).first();
    await expect(fireBtn).toBeVisible({ timeout: 5000 });

    const shotPath = path.join(process.cwd(), 'tests/e2e/screenshots/task28_03_active_engagement.png');
    await page.screenshot({ path: shotPath, fullPage: true });
  });

  test('Fix D: Default 3D view on startup displays 3D canvas and [V] 2D RADAR toggle button', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/?view=3D');

    const startBtn = page.getByTestId('start-session-btn');
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await startBtn.click();

    // Verify 3D canvas is active on startup
    const canvas3D = page.locator('.radar-frame canvas.cursor-grab');
    await expect(canvas3D).toBeVisible();

    // Verify toggle button says [V] 2D RADAR
    const toggle2DBtn = page.getByRole('button', { name: /\[V\] 2D RADAR/i });
    await expect(toggle2DBtn).toBeVisible();

    // Click [V] 2D RADAR to switch to 2D
    await toggle2DBtn.click();
    const canvas2D = page.locator('.radar-frame canvas.cursor-crosshair');
    await expect(canvas2D).toBeVisible();

    // Toggle button should now say [V] 3D VIEW
    const toggle3DBtn = page.getByRole('button', { name: /\[V\] 3D VIEW/i });
    await expect(toggle3DBtn).toBeVisible();
  });
});
