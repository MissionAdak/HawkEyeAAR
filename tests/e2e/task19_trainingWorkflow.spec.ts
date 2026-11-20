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
    // 1. Initial Mission Briefing & Scenario Selection (DEMO-2)
    await page.goto('http://127.0.0.1:4173/HawkEyeAAR/', { waitUntil: 'networkidle' });

    const changeScenarioBtn = page.getByTestId('change-scenario-btn');
    await expect(changeScenarioBtn).toBeVisible({ timeout: 10000 });
    await changeScenarioBtn.click();

    // Select DEMO-2 from catalog modal
    const demo2Card = page.getByTestId('scenario-card-DEMO-2');
    await expect(demo2Card).toBeVisible({ timeout: 5000 });
    const demo2SelectBtn = demo2Card.getByRole('button');
    await demo2SelectBtn.click();

    // Verify briefing screen updates with DEMO-2 parameters
    await expect(page.getByText(/DEMO-2/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Proportionality Drill/i).first()).toBeVisible();

    const startBtn = page.getByTestId('start-session-btn');
    await expect(startBtn).toBeVisible();

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

    // 5. Select first track row
    const trackRow = trackTable.locator('tr, div').filter({ hasText: /T-01|T-02|T-03/i }).first();
    await expect(trackRow).toBeVisible({ timeout: 5000 });
    await trackRow.click();

    // 6. Execute Operator Lifecycle: Designate -> Classify -> Arm Effector -> Fire
    // Designate via Spacebar
    await page.keyboard.press('Space');

    // Classify via button or key
    const classifyBtn = page.getByRole('button', { name: /⚡ CLASSIFY HOSTILE|\[HA\]/i }).first();
    if (await classifyBtn.isVisible()) {
      await classifyBtn.click();
    } else {
      await page.keyboard.press('c');
    }

    // Arm Effector (RF Soft-Kill)
    const rfSoftkillBtn = page.locator('button').filter({ hasText: /RF Soft-Kill/i }).first();
    if (await rfSoftkillBtn.isVisible()) {
      await rfSoftkillBtn.click();
    }

    // Fire via 'f' key
    await page.keyboard.press('f');

    // 7. Fast-forward to session completion via test bridge
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

    // 8. Verify AAR Modal opens and displays SCORECARD tab
    const aarModal = page.getByTestId('aar-modal');
    if (!(await aarModal.isVisible())) {
      const aarBtn = page.getByRole('button', { name: /\[AAR SCORECARD\]|AAR SCORECARD/i });
      if (await aarBtn.isVisible()) {
        await aarBtn.click({ force: true });
      }
    }
    await expect(aarModal).toBeVisible({ timeout: 5000 });

    // Assert AAR Scorecard components
    await expect(aarModal.getByText(/GLOBAL MISSION SCORE/i)).toBeVisible();
    await expect(aarModal.getByText(/DOCTRINAL GRADE EVALUATION/i)).toBeVisible();

    // 9. Switch to REPLAY tab and interact with timeline scrubber
    const replayTab = aarModal.getByRole('button', { name: /^REPLAY$/i });
    await expect(replayTab).toBeVisible();
    await replayTab.click();
    await expect(aarModal.getByText(/SYNCHRONIZED AAR TIMELINE REPLAY/i)).toBeVisible();

    // Interact with timeline scrubber or jump button
    const timelineJumpBtn = aarModal.locator('button').filter({ hasText: /T\+/ }).first();
    if (await timelineJumpBtn.isVisible()) {
      await timelineJumpBtn.click();
    } else {
      const slider = aarModal.locator('input[type="range"]');
      if (await slider.isVisible()) {
        await slider.evaluate((el: HTMLInputElement) => {
          el.value = '5000';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }
    }

    // Capture screenshot of AAR modal in Replay view
    await saveShot(page, 'task19_01_training_workflow_aar.png');

    // 10. Verify JSON Export file download
    const exportJsonBtn = aarModal.getByTestId('aar-export-json-btn');
    await expect(exportJsonBtn).toBeVisible();
    const [jsonDownload] = await Promise.all([
      page.waitForEvent('download'),
      exportJsonBtn.click(),
    ]);
    expect(jsonDownload.suggestedFilename()).toMatch(/^aar-.*\.json$/);
    const jsonStream = await jsonDownload.createReadStream();
    if (jsonStream) {
      const jsonChunks: Buffer[] = [];
      for await (const chunk of jsonStream) {
        jsonChunks.push(Buffer.from(chunk));
      }
      const jsonContent = Buffer.concat(jsonChunks).toString('utf-8');
      const parsed = JSON.parse(jsonContent);
      expect(parsed.sessionUid).toBeTruthy();
      expect(Array.isArray(parsed.events)).toBe(true);
      expect(parsed.sha256).toMatch(/^[a-f0-9]{64}$/);
    }

    // 11. Verify CSV Export file download
    const exportCsvBtn = aarModal.getByTestId('aar-export-csv-btn');
    await expect(exportCsvBtn).toBeVisible();
    const [csvDownload] = await Promise.all([
      page.waitForEvent('download'),
      exportCsvBtn.click(),
    ]);
    expect(csvDownload.suggestedFilename()).toMatch(/^aar-.*\.csv$/);
    const csvStream = await csvDownload.createReadStream();
    if (csvStream) {
      const csvChunks: Buffer[] = [];
      for await (const chunk of csvStream) {
        csvChunks.push(Buffer.from(chunk));
      }
      const csvContent = Buffer.concat(csvChunks).toString('utf-8');
      expect(csvContent).toMatch(/sessionUid.*seq.*tMs.*type/i);
    }

    // 12. Return to Mission Briefing via [B] MISSION BRIEFING button
    const returnBriefingBtn = aarModal.getByTestId('aar-return-briefing-btn');
    await expect(returnBriefingBtn).toBeVisible();
    await returnBriefingBtn.click();

    // 13. Verify clean state after returning to briefing
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

    // Open Scenario Modal
    const changeScenarioBtn = page.getByTestId('change-scenario-btn');
    await expect(changeScenarioBtn).toBeVisible({ timeout: 5000 });
    await changeScenarioBtn.click();

    // Select SWARM-1 from catalog
    const swarmCard = page.getByTestId('scenario-card-SWARM-1');
    await expect(swarmCard).toBeVisible({ timeout: 5000 });
    const swarmSelectBtn = swarmCard.getByRole('button');
    await swarmSelectBtn.click();

    // Verify briefing screen reflects SWARM-1
    await expect(page.getByText(/SWARM-1/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/SWARM INVASION/i).first()).toBeVisible();
    await expect(page.getByText(/SWARM ELEMENT/i).first()).toBeVisible();

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

    // Wait for SWARM tracks to initiate
    await page.waitForFunction(() => {
      const win = window as unknown as WindowWithDrishti;
      return (win.__DRISHTI_TEST__?.getTrackList().length ?? 0) > 0;
    }, undefined, { timeout: 10000 });
  });
});
