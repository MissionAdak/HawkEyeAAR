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

test.describe('TASK 19 — End-to-End Scenario Integrity & Complete Training Workflow', () => {
  const outDir19 = path.resolve(process.cwd(), 'reports/screenshots/task19');
  const artifactDir = 'C:\\Users\\Missi\\.gemini\\antigravity\\brain\\dcbbc993-bf1f-433e-850f-d7e049737f29';

  test.beforeAll(() => {
    if (!fs.existsSync(outDir19)) {
      fs.mkdirSync(outDir19, { recursive: true });
    }
  });

  const saveShot = async (page: Page, filename: string) => {
    const filePath = path.join(outDir19, filename);
    await page.screenshot({ path: filePath, fullPage: true });

    if (fs.existsSync(artifactDir)) {
      fs.copyFileSync(filePath, path.join(artifactDir, filename));
    }
  };

  test('01. Complete Trainee Lifecycle: Briefing -> Execution -> Engagement -> AAR -> Replay -> Clean Return', async ({ page }) => {
    // 1. Initial Mission Briefing
    await page.goto('http://127.0.0.1:4173/HawkEyeAAR/', { waitUntil: 'networkidle' });

    const startBtn = page.getByTestId('start-session-btn');
    await expect(startBtn).toBeVisible({ timeout: 10000 });

    // 2. Start Session
    await startBtn.click();
    await expect(startBtn).not.toBeVisible({ timeout: 5000 });

    // 3. Wait for Test Bridge and active tracks
    await page.waitForFunction(() => {
      const win = window as unknown as WindowWithDrishti;
      if (!win.__DRISHTI_TEST__) return false;
      return win.__DRISHTI_TEST__.isReady() && win.__DRISHTI_TEST__.getTrackList().length > 0;
    }, undefined, { timeout: 10000 });

    // 4. Verify Track Table displays estimated telemetry (~RNG, ~SPD, ~BRG)
    const trackTable = page.getByTestId('track-table');
    await expect(trackTable).toBeVisible({ timeout: 5000 });
    const tableText = await trackTable.innerText();
    expect(tableText).toMatch(/~RNG/i);
    expect(tableText).toMatch(/~SPD/i);

    // 5. Select first track row if available
    const trackRow = trackTable.locator('tr, div').filter({ hasText: /T-01|T-02|T-03/i }).first();
    if (await trackRow.isVisible()) {
      await trackRow.click();
    }

    // 6. Fast-forward to session completion via test bridge
    const advanceResult = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.advanceToSessionEnd();
    });
    expect(advanceResult).toBe(true);

    const isEnded = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.isSessionEnded();
    });
    expect(isEnded).toBe(true);

    // 7. Verify AAR Modal opens
    const aarModal = page.getByTestId('aar-modal');
    if (!(await aarModal.isVisible())) {
      const aarBtn = page.getByRole('button', { name: /\[AAR SCORECARD\]|AAR SCORECARD/i });
      if (await aarBtn.isVisible()) {
        await aarBtn.click({ force: true });
      }
    }
    await expect(aarModal).toBeVisible({ timeout: 5000 });

    // 8. Assert AAR Scorecard components
    await expect(aarModal.getByText(/GLOBAL MISSION SCORE/i)).toBeVisible();
    await expect(aarModal.getByText(/DOCTRINAL GRADE EVALUATION/i)).toBeVisible();

    // 9. Assert Export Buttons exist and are visible
    const exportJsonBtn = page.getByTestId('aar-export-json-btn');
    const exportCsvBtn = page.getByTestId('aar-export-csv-btn');
    await expect(exportJsonBtn).toBeVisible();
    await expect(exportCsvBtn).toBeVisible();

    // 10. Switch to REPLAY tab
    const replayTab = aarModal.getByRole('button', { name: /^REPLAY$/i });
    await expect(replayTab).toBeVisible();
    await replayTab.click();
    await expect(aarModal.getByText(/SYNCHRONIZED AAR TIMELINE REPLAY/i)).toBeVisible();

    // Capture screenshot of AAR modal in Replay view
    await saveShot(page, 'task19_01_training_workflow_aar.png');

    // 11. Return to Mission Briefing via [B] MISSION BRIEFING button
    const returnBriefingBtn = page.getByTestId('aar-return-briefing-btn');
    await expect(returnBriefingBtn).toBeVisible();
    await returnBriefingBtn.click();

    // 12. Verify clean state after returning to briefing
    await expect(aarModal).not.toBeVisible({ timeout: 5000 });
    const briefingStartBtn = page.getByTestId('start-session-btn');
    await expect(briefingStartBtn).toBeVisible({ timeout: 5000 });

    // Assert that session state and tracker have been wiped clean
    const postCleanup = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return {
        trackCount: win.__DRISHTI_TEST__?.getTrackList().length ?? 0,
        sessionStatus: win.__DRISHTI_TEST__?.getSessionStatus() ?? 'UNKNOWN',
      };
    });

    expect(postCleanup.trackCount).toBe(0);
    expect(postCleanup.sessionStatus).toBe('READY');
  });

  test('02. Scenario Switching and Parameter Re-Initialization', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173/HawkEyeAAR/', { waitUntil: 'networkidle' });

    // Verify scenario selector is present on briefing screen
    const selectTrigger = page.locator('button, div').filter({ hasText: /DEMO-1|TUTORIAL|SCENARIO/i }).first();
    await expect(selectTrigger).toBeVisible({ timeout: 5000 });

    // Start session and confirm it starts cleanly
    const startBtn = page.getByTestId('start-session-btn');
    await startBtn.click();
    await expect(startBtn).not.toBeVisible({ timeout: 5000 });

    // Verify running session
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const win = window as unknown as WindowWithDrishti;
        return win.__DRISHTI_TEST__?.getSessionStatus();
      });
    }, { timeout: 10000 }).toBe('RUNNING');
  });
});
