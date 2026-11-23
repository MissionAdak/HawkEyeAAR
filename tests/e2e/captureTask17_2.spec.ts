import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('TASK 17.2 Visual Acceptance Test & Screenshots', () => {
  test('captures screenshots for all visual verification states', async ({ page }) => {
    const outDir = path.resolve(process.cwd(), 'test-results/screenshots/task17_2');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // 1. Navigate to HawkEyeAAR
    await page.goto('http://127.0.0.1:4173/HawkEyeAAR/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000); // NOSONAR typescript:S2925

    // 2. Start session from Mission Briefing
    const startBtn = page.getByTestId('start-session-btn');
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForTimeout(1000); // NOSONAR typescript:S2925
    }

    // 3. Switch to 3D Viewport
    const btn3D = page.getByRole('button', { name: /\[V\] 3D/i });
    await btn3D.click();
    await page.waitForTimeout(2000); // NOSONAR typescript:S2925

    // 4. State 1: RADAR mode with contact symbols
    const radarShotPath = path.join(outDir, '01_radar_mode_symbols.png');
    await page.screenshot({ path: radarShotPath, fullPage: true });
    console.log(`[Captured] State 1 (RADAR symbols): ${radarShotPath}`);

    // Verify presence of new TGT buttons and RECOG GUIDE
    const autoBtn = page.getByRole('button', { name: /TGT:AUTO/i });
    await expect(autoBtn).toBeVisible();
    const recogBtn = page.getByRole('button', { name: /RECOG GUIDE/i });
    await expect(recogBtn).toBeVisible();

    // 5. State 2: Switch to EO/IR mode
    const eoirBtn = page.getByRole('button', { name: /\[2\] EO\/IR/i });
    await eoirBtn.click();
    await page.waitForTimeout(3000); // NOSONAR typescript:S2925

    const eoirShotPath = path.join(outDir, '02_eoir_mode_airframes.png');
    await page.screenshot({ path: eoirShotPath, fullPage: true });
    console.log(`[Captured] State 2 (EO/IR airframes): ${eoirShotPath}`);

    // 6. State 3: Select track and focus camera for close inspection
    // Select first track row in track table
    const firstTrackRow = page.locator('.track-row, tbody tr').first();
    if (await firstTrackRow.isVisible()) {
      await firstTrackRow.click();
      await page.waitForTimeout(500); // NOSONAR typescript:S2925
      // Press F to focus selection
      await page.keyboard.press('f');
      await page.waitForTimeout(1500); // NOSONAR typescript:S2925
    }

    const focusShotPath = path.join(outDir, '03_target_close_inspection.png');
    await page.screenshot({ path: focusShotPath, fullPage: true });
    console.log(`[Captured] State 3 (Close inspection): ${focusShotPath}`);

    // 7. State 4: Open Target Recognition Guide Modal
    await recogBtn.click();
    await page.waitForTimeout(800); // NOSONAR typescript:S2925

    // Verify modal elements
    await expect(page.getByText(/C-UAS TARGET RECOGNITION GUIDE/i)).toBeVisible();
    await expect(page.getByText(/LOITERING MUNITION/i).first()).toBeVisible();

    const guideShotPath = path.join(outDir, '04_target_recognition_guide.png');
    await page.screenshot({ path: guideShotPath, fullPage: true });
    console.log(`[Captured] State 4 (Recognition Guide): ${guideShotPath}`);

    // Close modal
    const closeGuideBtn = page.getByRole('button', { name: /\[ESC \/ CLOSE\]/i });
    await closeGuideBtn.click();
    await page.waitForTimeout(500); // NOSONAR typescript:S2925

    // 8. State 5: Switch back to RADAR mode
    const radarBtn = page.getByRole('button', { name: /\[1\] RADAR/i });
    await radarBtn.click();
    await page.waitForTimeout(1500); // NOSONAR typescript:S2925

    const restoreShotPath = path.join(outDir, '05_radar_symbols_restored.png');
    await page.screenshot({ path: restoreShotPath, fullPage: true });
    console.log(`[Captured] State 5 (RADAR symbols restored): ${restoreShotPath}`);

    // Also copy all screenshots to conversation artifact directory if available
    const artifactDir = 'C:\\Users\\Missi\\.gemini\\antigravity\\brain\\dcbbc993-bf1f-433e-850f-d7e049737f29';
    if (fs.existsSync(artifactDir)) {
      const files = fs.readdirSync(outDir);
      for (const f of files) {
        fs.copyFileSync(path.join(outDir, f), path.join(artifactDir, f));
      }
      console.log(`[Copied] All screenshots to artifact directory: ${artifactDir}`);
    }
  });
});
