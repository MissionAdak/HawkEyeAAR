import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import type { DrishtiTestBridge } from '@/testBridge/drishtiTestBridge';

type WindowWithDrishti = Window & {
  __DRISHTI_TEST__?: DrishtiTestBridge | null;
};

test.describe('TASK 20 — Unit Performance View, Longitudinal Session History & Trend Dashboard', () => {
  const outDir20 = path.resolve(process.cwd(), 'reports/screenshots/task20');
  const artifactDir = 'C:\\Users\\Missi\\.gemini\\antigravity\\brain\\dcbbc993-bf1f-433e-850f-d7e049737f29';

  test.beforeAll(() => {
    if (!fs.existsSync(outDir20)) {
      fs.mkdirSync(outDir20, { recursive: true });
    }
  });

  const saveShot = async (page: Page, filename: string) => {
    const filePath = path.join(outDir20, filename);
    await page.screenshot({ path: filePath, fullPage: true });

    if (fs.existsSync(artifactDir)) {
      fs.copyFileSync(filePath, path.join(artifactDir, filename));
    }
  };

  test('01. Multi-Session Longitudinal Trend Chart, Session History Table & Rules.md R4.4 EVAL Leaderboard', async ({ page }) => {
    // 1. Navigate to application
    await page.goto('http://127.0.0.1:4173/HawkEyeAAR/', { waitUntil: 'networkidle' });

    // 2. Start session from briefing screen
    const startBtn = page.getByTestId('start-session-btn');
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();
    await expect(startBtn).not.toBeVisible({ timeout: 5000 });

    // 3. Wait for test bridge to be initialized
    await page.waitForFunction(() => {
      const win = window as unknown as WindowWithDrishti;
      return Boolean(win.__DRISHTI_TEST__?.isReady());
    }, undefined, { timeout: 10000 });

    // 4. Advance session to completion to trigger AAR
    await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      win.__DRISHTI_TEST__?.advanceToSessionEnd();
    });

    const aarModal = page.getByTestId('aar-modal');
    if (!(await aarModal.isVisible())) {
      const aarBtn = page.getByRole('button', { name: /\[AAR SCORECARD\]|AAR SCORECARD/i });
      if (await aarBtn.isVisible()) {
        await aarBtn.click({ force: true });
      }
    }
    await expect(aarModal).toBeVisible({ timeout: 5000 });

    // 5. Verify default tab is SCORECARD
    const tabScorecard = page.getByTestId('tab-scorecard');
    await expect(tabScorecard).toBeVisible();
    await expect(page.getByText('GLOBAL MISSION SCORE')).toBeVisible();

    // 6. Switch to TRENDS & HISTORY tab
    const tabTrends = page.getByTestId('tab-trends');
    await expect(tabTrends).toBeVisible();
    await tabTrends.click();

    // Assert TrendChart Canvas and Legend controls are visible
    const trendContainer = page.getByTestId('trend-chart-container');
    await expect(trendContainer).toBeVisible({ timeout: 5000 });
    const trendCanvas = page.getByTestId('trend-chart-canvas');
    await expect(trendCanvas).toBeVisible();
    await expect(page.getByText('LONGITUDINAL PERFORMANCE TREND')).toBeVisible();
    await expect(page.getByRole('button', { name: /Score \[S\]/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Difficulty \[d\]/i })).toBeVisible();

    // Assert Session Drill Log Table is visible
    const sessionTableContainer = page.getByTestId('session-table-container');
    await expect(sessionTableContainer).toBeVisible();
    const sessionHistoryTable = page.getByTestId('session-history-table');
    await expect(sessionHistoryTable).toBeVisible();
    await expect(page.getByText('SESSION DRILL LOG')).toBeVisible();

    // Capture screenshot of Trends & Session History
    await saveShot(page, 'task20_01_unit_performance_and_trends.png');

    // 7. Switch to UNIT READINESS tab
    const tabUnit = page.getByTestId('tab-unit');
    await expect(tabUnit).toBeVisible();
    await tabUnit.click();

    // Assert Unit Readiness Overview Cards
    const unitContainer = page.getByTestId('unit-view-container');
    await expect(unitContainer).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('COHORT MEAN EVAL SCORE')).toBeVisible();
    await expect(page.getByText(/EVAL PASS RATE/i)).toBeVisible();
    await expect(page.getByText('TOTAL EVAL DRILLS')).toBeVisible();
    await expect(page.getByText('UNIT OPERATOR ROSTER')).toBeVisible();
    await expect(page.getByText('RULES.MD R4.4: EVAL BENCHMARKS ONLY')).toBeVisible();

    // Assert Unit Leaderboard Table
    const unitLeaderboard = page.getByTestId('unit-leaderboard-table');
    await expect(unitLeaderboard).toBeVisible();

    // Assert operators are displayed in leaderboard
    await expect(unitLeaderboard.getByText('HAWK-1')).toBeVisible();
    await expect(unitLeaderboard.getByText('VIPER-2')).toBeVisible();
    await expect(unitLeaderboard.getByText('GHOST-4')).toBeVisible();

    // Assert Rules.md R4.4: GHOST-4 (TRAIN only) displays IN TRAINING badge
    const ghostRow = page.getByTestId('unit-trainee-row-GHOST-4');
    await expect(ghostRow).toBeVisible();
    await expect(ghostRow.getByText('IN TRAINING')).toBeVisible();

    // Capture screenshot of Unit Readiness & Cohort Leaderboard
    await saveShot(page, 'task20_02_unit_readiness_leaderboard.png');

    // 8. Test Operator Inspection from Leaderboard: Click INSPECT on HAWK-1
    const hawkRow = page.getByTestId('unit-trainee-row-HAWK-1');
    await expect(hawkRow).toBeVisible();
    const inspectHawkBtn = hawkRow.getByRole('button', { name: /INSPECT/i });
    await expect(inspectHawkBtn).toBeVisible();
    await inspectHawkBtn.click();

    // Verify navigating to HAWK-1 automatically switches to TRENDS tab and updates operator select
    await expect(trendContainer).toBeVisible({ timeout: 5000 });
    const operatorSelect = page.getByTestId('operator-callsign-select');
    await expect(operatorSelect).toBeVisible();
    await expect(operatorSelect).toHaveValue('HAWK-1');

    // 9. Close AAR modal and verify clean return to C2 Console
    const closeBtn = page.getByText(/✕ ESC \/ CLOSE/i);
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(aarModal).not.toBeVisible({ timeout: 5000 });
  });
});
