import { test, expect } from '@playwright/test';
import { ensureStudioLoaded } from './helpers/navigation';

test.describe("Playback End - Thread Lockup Guard", () => {
  test("Playback reaching the end of sequence stops cleanly without thread lockup", async ({ page }) => {
    test.setTimeout(45000);

    // Collect any page errors or console logs
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    await page.goto('http://localhost:5174/?view=timeline');
    await page.waitForTimeout(1000);

    await ensureStudioLoaded(page);

    // Wait for store initialization
    await page.waitForFunction(() => {
      const store = (window as any).useSequencerStore?.getState?.() || (window as any).__SEQUENCER_STORE__?.getState?.();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 10000 });

    // Configure sequencer for quick, deterministic playback end test:
    // 2 measures, high BPM (240 BPM), clear loop region and song sections, disarm infinite loop, disable pre-roll
    await page.evaluate(() => {
      const store = (window as any).useSequencerStore?.getState?.() || (window as any).__SEQUENCER_STORE__?.getState?.();
      if (store) {
        store.handleTotalMeasuresChange?.(2);
        store.handleClearLoop?.();
        store.setSongSections?.([]);
        store.setIsLoopRegionActive?.(false);
        store.setIsLooping?.(false);
        if (typeof store.setTempo === 'function') {
          store.setTempo(240);
        } else if (typeof store.setBpm === 'function') {
          store.setBpm(240);
        }
        store.setMeasureBpms?.([240, 240]);
      }
      const transport = (window as any).__TRANSPORT_STORE__?.getState?.();
      if (transport) {
        transport.setPreRollSettings?.({ enabled: false });
      }
    });

    const storeState = await page.evaluate(() => {
      const store = (window as any).useSequencerStore?.getState?.() || (window as any).__SEQUENCER_STORE__?.getState?.();
      return {
        isLooping: store.isLooping,
        isLoopRegionActive: store.isLoopRegionActive,
        totalMeasures: store.totalMeasures,
        bpm: store.bpm,
      };
    });

    expect(storeState.isLooping).toBe(false);
    expect(storeState.isLoopRegionActive).toBe(false);
    expect(storeState.totalMeasures).toBe(2);

    // Locate the central transport play button and wait until audio loading finishes
    const playButton = page.locator('[data-testid="transport-play-btn"]');
    await expect(playButton).toBeVisible({ timeout: 5000 });
    await expect(playButton).toBeEnabled({ timeout: 10000 });
    await playButton.click();

    // Verify playback starts: isPlaying becomes true or square/pause icon appears
    await page.waitForFunction(() => {
      const store = (window as any).useSequencerStore?.getState?.() || (window as any).__SEQUENCER_STORE__?.getState?.();
      const isPlaying = store?.isPlaying === true || (window as any).__IS_PLAYING__ === true;
      const square = Boolean(document.querySelector('[data-testid="transport-play-btn"] svg.lucide-square, button[title*="Pausar"], button[title*="Pause"]'));
      return isPlaying || square;
    }, { timeout: 10000 });

    const squareIcon = page.locator('[data-testid="transport-play-btn"] svg.lucide-square');
    await expect(squareIcon).toBeVisible({ timeout: 5000 });

    // Verify thread responsiveness during and after sequence end:
    // With 2 measures at 240 BPM, playback reaches the end in ~2s.
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
      await page.waitForTimeout(300);
    }

    // Must have completed responsive polling without lockup
    expect(responsiveTicks).toBeGreaterThanOrEqual(10);

    // After 3s autoStop timeout has elapsed, playback stops cleanly:
    // waitForFunction verifies isPlaying === false and play button is restored
    await page.waitForFunction(() => {
      const store = (window as any).useSequencerStore?.getState?.() || (window as any).__SEQUENCER_STORE__?.getState?.();
      const isStopped = store?.isPlaying === false && (window as any).__IS_PLAYING__ !== true;
      const playIcon = Boolean(document.querySelector('[data-testid="transport-play-btn"] svg.lucide-play'));
      return isStopped || playIcon;
    }, { timeout: 15000 });

    // Transport button reverts to Play icon
    await expect(page.locator('[data-testid="transport-play-btn"] svg.lucide-play')).toBeVisible({ timeout: 5000 });
    expect(pageErrors).toEqual([]);
  });
});
