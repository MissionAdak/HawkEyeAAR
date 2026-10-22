import { test, expect } from '@playwright/test';

test.describe('Tactical C2 Trainee Interaction & Kill-Chain Execution', () => {
  test('allows trainee to select, classify, engage a track and logs events in the console', async ({
    page,
  }) => {
    await page.goto('/');

    // 1. Wait for sim to boot and tracks to appear
    const trackRow = page.locator('aside').first().locator('.cursor-pointer').first();
    await expect(trackRow).toBeVisible({ timeout: 5000 });

    // 2. Click track row to designate
    await trackRow.click();

    // 3. Verify Track is selected in Fire Control Right Rail
    const fireControlHeader = page.locator('aside').last();
    await expect(fireControlHeader.getByText('T-01').first()).toBeVisible();

    // 4. Click Classify [HA] HOSTILE ATTACK
    const haButton = page.getByRole('button', { name: /\[HA\]/i });
    await expect(haButton).toBeVisible();
    await haButton.click();

    // 5. Verify short code updates to HA
    await expect(trackRow.getByText('HA')).toBeVisible();

    // 6. Select RF Soft-Kill effector
    const rfEffectorCard = page.getByText('RF Soft-Kill / GNSS Denial');
    await rfEffectorCard.click();

    // 7. Verify Live CER is rendered
    await expect(page.getByText('COST RATIO (CER):').first()).toBeVisible();

    // 8. Fire effector
    const fireButton = page.getByRole('button', { name: /RELEASE/i });
    if (await fireButton.isEnabled()) {
      await fireButton.click();

      // 9. Verify event appears in bottom console
      const eventConsole = page.locator('footer');
      await expect(eventConsole.getByText('ENGAGE').first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('sensor mode buttons and pause toggle work smoothly', async ({ page }) => {
    await page.goto('/');

    const modeTabs = page.locator('.radar-frame');

    // Click '[2] EO/IR' tab
    const eoirTab = modeTabs.getByText('[2] EO/IR');
    await eoirTab.click();
    await expect(eoirTab).toHaveClass(/border-phosphor/);

    // Click '[3] RF' tab
    const rfTab = modeTabs.getByText('[3] RF');
    await rfTab.click();
    await expect(rfTab).toHaveClass(/border-phosphor/);

    // Click '[1] RADAR' tab
    const radarTab = modeTabs.getByText('[1] RADAR');
    await radarTab.click();
    await expect(radarTab).toHaveClass(/border-phosphor/);

    // Click Pause / Resume button in TopBar
    const pauseButton = page.getByRole('button', { name: /PAUSE|RESUME/i });
    await expect(pauseButton).toHaveText('[P] PAUSE');
    await pauseButton.click();
    await expect(pauseButton).toHaveText('[P] RESUME');
    await pauseButton.click();
    await expect(pauseButton).toHaveText('[P] PAUSE');
  });

  test('switches to 3D view, supports camera orbit drag, target picking, and syncs selection state with console controls', async ({
    page,
  }) => {
    await page.goto('/');

    // 1. Wait for sim to boot and tracks to appear
    const trackRow = page.locator('aside').first().locator('.cursor-pointer').first();
    await expect(trackRow).toBeVisible({ timeout: 5000 });

    // 2. Toggle from 2D RADAR to 3D VIEW
    const toggle3DButton = page.getByRole('button', { name: /\[V\] 3D VIEW/i });
    await expect(toggle3DButton).toBeVisible();
    await toggle3DButton.click();

    // 3. Verify 3D canvas is active and displayed
    const canvas3d = page.locator('canvas.cursor-grab');
    await expect(canvas3d).toBeVisible();

    // 4. Verify visual enlargement notice and 3D control hints are present
    await expect(
      page.getByText('AIRCRAFT MODELS ENLARGED FOR VISIBILITY — TRACK POSITIONS AND RANGES UNCHANGED')
    ).toBeVisible();
    await expect(page.getByText('DRAG: ORBIT | SCROLL: ZOOM | CLICK: SELECT TARGET')).toBeVisible();

    // 5. Test camera dragging: drag on canvas does not crash or inadvertently select an unintended track
    const canvasBox = await canvas3d.boundingBox();
    expect(canvasBox).not.toBeNull();
    if (canvasBox) {
      await page.mouse.move(canvasBox.x + 50, canvasBox.y + 50);
      await page.mouse.down();
      await page.mouse.move(canvasBox.x + 150, canvasBox.y + 100);
      await page.mouse.up();
    }

    // 6. Test 3D camera presets (OBLIQUE, TOP, POST)
    const topPresetBtn = page.getByRole('button', { name: /\[T\] TOP/i });
    await expect(topPresetBtn).toBeVisible();
    await topPresetBtn.click();
    await expect(page.getByText('3D VIEW | CAM: TOP')).toBeVisible();

    // 7. Click track row or 3D target to verify right rail selection updates
    await trackRow.click();
    const fireControlHeader = page.locator('aside').last();
    await expect(fireControlHeader.getByText('T-01').first()).toBeVisible();

    // 8. Toggle back to 2D RADAR: selection remains synchronized
    const toggle2DButton = page.getByRole('button', { name: /\[V\] 2D RADAR/i });
    await expect(toggle2DButton).toBeVisible();
    await toggle2DButton.click();
    await expect(fireControlHeader.getByText('T-01').first()).toBeVisible();
  });

  test('opens and closes X-SECTION elevation training aid in 3D view without errors or blank screens', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');

    // 1. Switch to 3D view
    const toggle3DButton = page.getByRole('button', { name: /\[V\] 3D VIEW/i });
    await expect(toggle3DButton).toBeVisible();
    await toggle3DButton.click();

    // 2. Select track T-01
    const trackRow = page.locator('aside').first().locator('.cursor-pointer').first();
    await expect(trackRow).toBeVisible();
    await trackRow.click();

    // 3. Open X-SECTION
    const xSectionBtn = page.getByRole('button', { name: /X-SECTION/i });
    await expect(xSectionBtn).toBeVisible();
    await xSectionBtn.click();

    // 4. Verify modal is visible with chart and elevation labels
    const modalTitle = page.getByText(/ELEVATION CROSS-SECTION TRAINING AID/i);
    await expect(modalTitle).toBeVisible();
    await expect(page.getByText(/VERTICAL EXAGGERATION/i)).toBeVisible();

    // 5. Dismiss with ESC key
    await page.keyboard.press('Escape');
    await expect(modalTitle).not.toBeVisible();

    // 6. Reopen and dismiss with [X] key
    await xSectionBtn.click();
    await expect(modalTitle).toBeVisible();
    await page.keyboard.press('x');
    await expect(modalTitle).not.toBeVisible();

    // 7. Reopen and dismiss via backdrop click
    await xSectionBtn.click();
    await expect(modalTitle).toBeVisible();
    const modalBackdrop = page.getByRole('button', { name: /Dismiss elevation cross-section modal/i });
    await modalBackdrop.click({ position: { x: 10, y: 10 } });
    await expect(modalTitle).not.toBeVisible();

    // Zero uncaught page errors
    expect(pageErrors).toHaveLength(0);
  });
});
