import { test, expect } from '@playwright/test';

test.describe('Scenario Selector & Lifecycle (TASK 12)', () => {
  test('DEMO-1 is the startup default scenario', async ({ page }) => {
    await page.goto('/');

    // 1. Verify left rail displays DEMO-1
    const leftRail = page.locator('aside').first();
    await expect(leftRail.getByText('DEMO-1').first()).toBeVisible({ timeout: 5000 });

    // 2. Verify Tactical Viewport Tabs shows [S] DEMO-1
    await expect(page.getByRole('button', { name: /\[S\] DEMO-1/i })).toBeVisible();
  });

  test('opens scenario catalog modal, displays all 6 scenarios, and closes with ESC', async ({
    page,
  }) => {
    await page.goto('/');

    // Open Scenario Modal using left rail button
    const scenarioBtn = page.getByRole('button', { name: /\[S\] SCENARIO/i });
    await expect(scenarioBtn).toBeVisible({ timeout: 5000 });
    await scenarioBtn.click();

    // Verify modal header is visible
    const modal = page.getByRole('dialog', { name: /Mission \/ Exercise Scenario Selector/i });
    await expect(modal).toBeVisible();
    await expect(modal.getByText('TACTICAL EXERCISE & SCENARIO CATALOG')).toBeVisible();

    // Verify all 6 scenarios are listed
    await expect(modal.locator('[data-testid="scenario-card-DEMO-1"]')).toBeVisible();
    await expect(modal.getByText('DEMO-2 — Proportionality Drill')).toBeVisible();
    await expect(modal.getByText('SWARM INVASION — Saturation Scenario')).toBeVisible();
    await expect(modal.getByText('FULL SPECTRUM — Mixed-Class Scenario')).toBeVisible();
    await expect(modal.getByText('PROCEDURAL TRAIN — Difficulty-Scaled Scenario')).toBeVisible();
    await expect(modal.getByText('RANDOM-1 — Unpredictable Assessment')).toBeVisible();

    // Verify duration displays 120s for every scenario
    await expect(modal.locator('[data-testid="scenario-duration-DEMO-1"]')).toHaveText(/DURATION:\s*120s/i);
    await expect(modal.locator('[data-testid="scenario-duration-DEMO-2"]')).toHaveText(/DURATION:\s*120s/i);
    await expect(modal.locator('[data-testid="scenario-duration-SWARM-1"]')).toHaveText(/DURATION:\s*120s/i);
    await expect(modal.locator('[data-testid="scenario-duration-SPECTRUM-1"]')).toHaveText(/DURATION:\s*120s/i);
    await expect(modal.locator('[data-testid="scenario-duration-PROCEDURAL-1"]')).toHaveText(/DURATION:\s*120s/i);
    await expect(modal.locator('[data-testid="scenario-duration-RANDOM-1"]')).toHaveText(/DURATION:\s*120s/i);

    // Verify DEMO-1 has ACTIVE SESSION badge and restart action
    await expect(modal.locator('[data-testid="scenario-card-DEMO-1"]').getByText('ACTIVE SESSION')).toBeVisible();
    await expect(modal.locator('[data-testid="scenario-card-DEMO-1"]').getByRole('button', { name: /RESTART/i })).toBeVisible();

    // Close modal via Escape key
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('loads RANDOM-1 unpredictable assessment and updates tactical console', async ({ page }) => {
    await page.goto('/');

    // Wait for simulation clock to advance
    await expect(page.locator('header').getByText(/T\+00:0[1-9]/i)).toBeVisible();

    // Open Scenario Modal
    await page.getByRole('button', { name: /\[S\] SCENARIO/i }).click();
    const modal = page.getByRole('dialog', { name: /Mission \/ Exercise Scenario Selector/i });
    await expect(modal).toBeVisible();

    // Find RANDOM-1 card and click [LOAD SCENARIO]
    const randomCard = modal.locator('[data-testid="scenario-card-RANDOM-1"]');
    await expect(randomCard).toBeVisible();
    await randomCard.getByRole('button', { name: /LOAD SCENARIO/i }).click();

    // Explicit confirmation dialog must appear
    const confirmDialog = page.getByRole('alertdialog');
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: /CONFIRM & LOAD SCENARIO/i }).click();

    // Modal should close and active scenario should now be RANDOM-1
    await expect(modal).not.toBeVisible();
    const leftRail = page.locator('aside').first();
    await expect(leftRail.getByText('RANDOM-1').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /\[S\] RANDOM-1/i })).toBeVisible();
  });

  test('requires explicit confirmation before replacing an active session', async ({ page }) => {
    await page.goto('/');

    // Wait for simulation clock to advance
    await expect(page.locator('header').getByText(/T\+00:0[1-9]/i)).toBeVisible();

    // Open Scenario Modal
    await page.getByRole('button', { name: /\[S\] SCENARIO/i }).click();
    const modal = page.getByRole('dialog', { name: /Mission \/ Exercise Scenario Selector/i });
    await expect(modal).toBeVisible();

    // Find SWARM-1 card and click [LOAD SCENARIO]
    const swarmCard = modal.locator('[data-testid="scenario-card-SWARM-1"]');
    await expect(swarmCard).toBeVisible();
    await swarmCard.getByRole('button', { name: /LOAD SCENARIO/i }).click();

    // Explicit confirmation dialog must appear
    const confirmDialog = page.getByRole('alertdialog');
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog.getByText(/CONFIRM SCENARIO SWITCH/i)).toBeVisible();

    // Clicking CANCEL must dismiss confirmation without changing scenario
    await confirmDialog.getByRole('button', { name: /CANCEL/i }).click();
    await expect(confirmDialog).not.toBeVisible();
    await expect(modal).toBeVisible();

    // Click [LOAD SCENARIO] again and this time CONFIRM
    await swarmCard.getByRole('button', { name: /LOAD SCENARIO/i }).click();
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: /CONFIRM & LOAD SCENARIO/i }).click();

    // Modal should close and active scenario should now be SWARM-1
    await expect(modal).not.toBeVisible();
    const leftRail = page.locator('aside').first();
    await expect(leftRail.getByText('SWARM-1').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /\[S\] SWARM-1/i })).toBeVisible();
  });

  test('restarts the currently active scenario, not DEMO-1', async ({ page }) => {
    await page.goto('/');

    // Switch to DEMO-2 via modal
    await page.getByRole('button', { name: /\[S\] SCENARIO/i }).click();
    const modal = page.getByRole('dialog', { name: /Mission \/ Exercise Scenario Selector/i });
    await expect(modal).toBeVisible();
    const demo2Card = modal.locator('[data-testid="scenario-card-DEMO-2"]');
    await demo2Card.getByRole('button', { name: /LOAD SCENARIO/i }).click();

    const confirmDialog = page.getByRole('alertdialog');
    if (await confirmDialog.isVisible()) {
      await confirmDialog.getByRole('button', { name: /CONFIRM & LOAD SCENARIO/i }).click();
    }

    // Modal should close and active scenario should now be DEMO-2
    await expect(modal).not.toBeVisible();
    const leftRail = page.locator('aside').first();
    await expect(leftRail.getByText('DEMO-2').first()).toBeVisible({ timeout: 5000 });

    // Allow the simulation to run so clock advances beyond T+00:00
    await expect(page.locator('header').getByText(/T\+00:0[1-9]/i)).toBeVisible();

    // Click RESTART in left rail, which opens the Scenario Modal while a session is active
    const restartBtn = leftRail.getByRole('button', { name: /RESTART/i });
    await restartBtn.click();

    // Wait for scenario modal visibility
    await expect(modal).toBeVisible();

    // Click the DEMO-2 card's RESTART button
    await demo2Card.getByRole('button', { name: /RESTART/i }).click();

    // Wait for the alert dialog before confirming
    const restartConfirmDialog = page.getByRole('alertdialog');
    await expect(restartConfirmDialog).toBeVisible();
    await restartConfirmDialog.getByRole('button', { name: /CONFIRM & RESTART/i }).click();

    // Modal closes, clock resets back to T+00:00, and scenario remains DEMO-2
    await expect(modal).not.toBeVisible();
    await expect(page.locator('header').getByText('T+00:00')).toBeVisible();
    await expect(leftRail.getByText('DEMO-2').first()).toBeVisible();
  });

  test('preserves zero vertical overflow at 1366x768 and 1280x700 with scenario selector', async ({
    page,
  }) => {
    for (const viewport of [
      { width: 1366, height: 768 },
      { width: 1280, height: 700 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/');

      const overflowMetrics = await page.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        innerHeight: window.innerHeight,
        bodyScrollHeight: document.body.scrollHeight,
      }));

      expect(
        overflowMetrics.scrollHeight,
        `Vertical overflow detected at ${viewport.width}x${viewport.height}`
      ).toBeLessThanOrEqual(overflowMetrics.innerHeight);

      expect(
        overflowMetrics.bodyScrollHeight,
        `Body vertical overflow detected at ${viewport.width}x${viewport.height}`
      ).toBeLessThanOrEqual(overflowMetrics.innerHeight);
    }
  });
});
