import { test, expect } from '@playwright/test';

test.describe("Playback End - Thread Lockup Guard", () => {
  test("Playback reaching the end of sequence stops cleanly without thread lockup", async ({ page }) => {
    // Collect any page errors or console logs
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    await page.goto('http://localhost:5174/?view=timeline');
    await page.waitForTimeout(2000);

    const entraBtn = page.locator('#entra-btn');
    if (await entraBtn.isVisible().catch(() => false)) {
      await entraBtn.click();
      await page.waitForTimeout(1000);
    }

    // Wait for store
    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 10000 });

    // Configure sequencer for quick playback end test:
    // 2 measures, high BPM (300 BPM), clear loop region and song sections
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.handleTotalMeasuresChange(2);
      store.handleClearLoop();
      store.setSongSections([]);
      store.setBpm(300);
      store.setMeasureBpms([300, 300]);
    });

    // Toggle loop OFF via loop button on transport bar
    const loopButton = page.locator('button[title*="boucle"], button[title*="Loop"]').first();
    await expect(loopButton).toBeVisible();
    await loopButton.click();

    const storeState = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      return {
        isLooping: store.isLooping,
        totalMeasures: store.totalMeasures,
        bpm: store.bpm,
      };
    });

    expect(storeState.isLooping).toBe(false);
    expect(storeState.totalMeasures).toBe(2);

    // Click the play button (lucide-play icon)
    const playButton = page.locator('button:has(svg.lucide-play)').first();
    await expect(playButton).toBeVisible();
    await playButton.click();

    // Verify playback starts: play button turns into stop/pause (lucide-square icon)
    const squareButton = page.locator('button:has(svg.lucide-square)').first();
    await expect(squareButton).toBeVisible({ timeout: 5000 });

    // Verify thread responsiveness during and after sequence end:
    // With 2 measures at 300 BPM, playback reaches the end in ~1.6s.
    // Reaching the end triggers isPlaybackEndingRef = true (and 3s autoStop timeout).
    // The main thread must NEVER freeze, lock up, or drop responsiveness.
    const startTime = Date.now();
    let responsiveTicks = 0;
    while (Date.now() - startTime < 6000) {
      const isAlive = await page.evaluate(() => {
        return window.performance.now() > 0;
      });
      expect(isAlive).toBe(true);
      responsiveTicks++;
      await page.waitForTimeout(400);
    }

    // Must have completed responsive polling without lockup
    expect(responsiveTicks).toBeGreaterThanOrEqual(10);
    expect(pageErrors).toEqual([]);

    // After 3s autoStop timeout has elapsed, playback stops cleanly,
    // playhead rewinds to measure 0, and button reverts to Play icon
    await expect(playButton).toBeVisible({ timeout: 8000 });
  });
});
