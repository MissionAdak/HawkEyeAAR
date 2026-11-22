import { test, expect } from '@playwright/test';

test.describe('TASK 21-PT — Progressive Training UI & End-to-End AAR Feedback', () => {
  test('verifies TopBar difficulty indicator, AAR Red Team Plan debrief, and progression feedback', async ({
    page,
  }) => {
    // 1. Navigate to production root
    await page.goto('./');
    await page.waitForLoadState('domcontentloaded');

    // 2. Verify TopBar displays mode and initial difficulty d=0.30
    const topBarMode = page.locator('header').getByText(/TRAIN|EVAL/i).first();
    await expect(topBarMode).toBeVisible({ timeout: 10000 });

    const diffIndicator = page.locator('header').getByText(/d=0\.\d{2}/i).first();
    await expect(diffIndicator).toBeVisible();

    // 3. Start a session from briefing screen if open
    const briefingStartBtn = page.getByTestId('start-session-btn');
    if (await briefingStartBtn.isVisible()) {
      await briefingStartBtn.click();
      await expect(briefingStartBtn).not.toBeVisible({ timeout: 5000 });
    }

    // Wait for simulation canvas to mount
    const canvas = page.locator('canvas.cursor-crosshair').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // 4. Open After-Action Review (AAR) hot-wash modal via TopBar button
    const aarBtn = page.getByRole('button', { name: /AAR SCORECARD/i });
    await expect(aarBtn).toBeVisible({ timeout: 10000 });
    await aarBtn.click();

    // 5. Verify AAR modal is displayed
    const aarModal = page.locator('[data-testid="aar-modal"]');
    await expect(aarModal).toBeVisible({ timeout: 10000 });

    // 6. Verify Adaptive Red Team Director Plan panel is rendered in Scorecard tab
    const redTeamPlan = page.locator('[data-testid="red-team-plan-panel"]');
    await expect(redTeamPlan).toBeVisible({ timeout: 5000 });

    // 7. Verify Red Team Mode Policy Indicator is present
    const policyIndicator = page.locator('[data-testid="mode-policy-indicator"]');
    await expect(policyIndicator).toBeVisible();

    // 8. Verify Difficulty Adaptation strip displays current d and next d
    const diffStrip = page.locator('[data-testid="difficulty-adaptation-strip"]');
    await expect(diffStrip).toBeVisible();
    await expect(page.locator('[data-testid="current-diff-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="next-diff-display"]')).toBeVisible();

    // 9. Verify EMA 6-dimension metrics grid is rendered
    const emaGrid = page.locator('[data-testid="ema-metrics-grid"]');
    await expect(emaGrid).toBeVisible();
    await expect(page.locator('[data-testid="ema-card-d"]')).toBeVisible();
    await expect(page.locator('[data-testid="ema-card-c"]')).toBeVisible();
    await expect(page.locator('[data-testid="ema-card-econ"]')).toBeVisible();
    await expect(page.locator('[data-testid="ema-card-r"]')).toBeVisible();
    await expect(page.locator('[data-testid="ema-card-sal"]')).toBeVisible();
    await expect(page.locator('[data-testid="ema-card-sat"]')).toBeVisible();

    // 10. Verify Director Rationale text box is visible
    const rationaleBox = page.locator('[data-testid="director-rationale-box"]');
    await expect(rationaleBox).toBeVisible();
    await expect(page.locator('[data-testid="director-rationale-text"]')).toBeVisible();

    // 11. Switch to Trends Tab and verify Red Team Plan is accessible alongside historical trends
    const trendsTab = page.locator('[data-testid="tab-trends"]');
    await trendsTab.click();

    const trendsPanel = page.locator('[data-testid="aar-trends-panel"]');
    await expect(trendsPanel).toBeVisible();
    await expect(trendsPanel.locator('[data-testid="red-team-plan-panel"]')).toBeVisible();

    // 12. Switch to Unit Readiness Tab and verify evaluation leaderboard
    const unitTab = page.locator('[data-testid="tab-unit"]');
    await unitTab.click();

    const unitPanel = page.locator('[data-testid="aar-unit-panel"]');
    await expect(unitPanel).toBeVisible();

    // Save test evidence screenshot strictly inside test-results directory
    await page.screenshot({
      path: 'test-results/screenshots/task21_pt/progressive_training_aar.png',
      fullPage: true,
    });
  });
});
