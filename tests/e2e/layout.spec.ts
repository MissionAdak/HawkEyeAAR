import { test, expect } from '@playwright/test';

test.describe('Tactical C2 Zero-Overflow Layout Audit', () => {
  test('1366x768 screen has zero vertical overflow and exact component geometry', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');

    // 1. Wait for canvas to be mounted
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // 2. Assert zero vertical overflow
    const overflowMetrics = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      bodyScrollHeight: document.body.scrollHeight,
    }));

    expect(overflowMetrics.scrollHeight).toBeLessThanOrEqual(overflowMetrics.innerHeight);
    expect(overflowMetrics.bodyScrollHeight).toBeLessThanOrEqual(overflowMetrics.innerHeight);

    // 3. Verify Radar Frame dimensions (520x520)
    const radarFrame = page.locator('.radar-frame');
    const frameBox = await radarFrame.boundingBox();
    expect(frameBox).not.toBeNull();
    if (frameBox) {
      expect(Math.round(frameBox.width)).toBe(520);
      expect(Math.round(frameBox.height)).toBe(520);
    }

    // 4. Verify Left Rail (Track Table) width is 240px
    const leftRail = page.locator('aside').first();
    const leftBox = await leftRail.boundingBox();
    expect(leftBox).not.toBeNull();
    if (leftBox) {
      expect(Math.round(leftBox.width)).toBe(240);
    }

    // 5. Verify Right Rail (Engagement Panel) width is 320px
    const rightRail = page.locator('aside').last();
    const rightBox = await rightRail.boundingBox();
    expect(rightBox).not.toBeNull();
    if (rightBox) {
      expect(Math.round(rightBox.width)).toBe(320);
    }

    // 6. Verify Top Bar height is 45px
    const topBar = page.locator('header');
    const topBox = await topBar.boundingBox();
    expect(topBox).not.toBeNull();
    if (topBox) {
      expect(Math.round(topBox.height)).toBe(45);
    }

    // 7. Verify Bottom Event Console height is 110px
    const eventLog = page.locator('footer');
    const bottomBox = await eventLog.boundingBox();
    expect(bottomBox).not.toBeNull();
    if (bottomBox) {
      expect(Math.round(bottomBox.height)).toBe(110);
    }
  });

  test('Mandatory Anti-SaaS disclaimer footer is present', async ({ page }) => {
    await page.goto('/');
    const disclaimer = page.getByText('SYNTHETIC TRAINING AID | NOTIONAL PARAMETERS | NOT A CERTIFICATION');
    await expect(disclaimer).toBeVisible();
  });

  test('3D toggle preserves zero-overflow layout geometry', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');

    // 1. Locate and click [V] 3D VIEW button
    const toggleBtn = page.getByRole('button', { name: /3D VIEW/ });
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    // 2. 3D canvas is visible and zero vertical overflow holds
    const canvas3d = page.locator('canvas').nth(1);
    await expect(canvas3d).toBeVisible();

    const overflowMetrics = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    }));
    expect(overflowMetrics.scrollHeight).toBeLessThanOrEqual(overflowMetrics.innerHeight);

    // 3. Toggle back to 2D
    const toggleBackBtn = page.getByRole('button', { name: /2D RADAR/ });
    await expect(toggleBackBtn).toBeVisible();
    await toggleBackBtn.click();
    await expect(page.locator('canvas').first()).toBeVisible();
  });
});
