import { test, expect } from '@playwright/test';

test.describe("Puxador & Coro Vocal Cohabitation", () => {
  test("Puxador and Coro can coexist on the same measure without erasing each other", async ({ page }) => {
    await page.goto('http://localhost:5174/?view=timeline');
    await page.waitForTimeout(2000);

    const entraBtn = page.locator('#entra-btn');
    if (await entraBtn.isVisible().catch(() => false)) {
      await entraBtn.click();
      await page.waitForTimeout(1000);
    }

    // Wait for store to be ready
    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 10000 });

    // 1. Verify and obtain tracks
    const trackInfo = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const tracks = store.tracks;

      console.log('TRACKS in test:', JSON.stringify(tracks.map((t: any) => ({
        id: t.id,
        customName: t.customName,
        busId: t.busId,
        isBusFolder: t.isBusFolder,
        instrumentIdx: t.instrumentIdx,
      }))));

      const toadaBus = tracks.find((t: any) => t.isBusFolder && (t.customName === 'Toada' || String(t.id) === 'toada'));
      const puxTrack = tracks.find((t: any) => 
        (toadaBus && t.busId && String(t.busId) === String(toadaBus.id)) ||
        t.customName === 'Puxador' || t.id === 'puxador'
      );
      const coroTrack = tracks.find((t: any) => 
        (toadaBus && t.busId && String(t.busId) === String(toadaBus.id) && t.id !== puxTrack?.id) ||
        t.customName === 'Coro' || t.id === 'coro'
      );

      return {
        allTracks: tracks.map((t: any) => ({ id: t.id, name: t.customName, busId: t.busId, instIdx: t.instrumentIdx })),
        toadaBusId: toadaBus?.id,
        puxTrackId: puxTrack?.id,
        coroTrackId: coroTrack?.id,
        puxPatId: puxTrack?.patterns?.[0]?.id,
        coroPatId: coroTrack?.patterns?.[0]?.id,
      };
    });

    console.log('TrackInfo retrieved:', trackInfo);

    expect(trackInfo.toadaBusId).toBeDefined();
    expect(trackInfo.puxTrackId).toBeDefined();
    expect(trackInfo.coroTrackId).toBeDefined();

    // 2. Assign pattern to Puxador at Measure 0
    await page.evaluate(({ puxTrackId, puxPatId }) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.handleTimelinePatternAssign(puxTrackId, puxPatId, 0);
    }, { puxTrackId: trackInfo.puxTrackId, puxPatId: trackInfo.puxPatId });

    // Verify Puxador is assigned
    const checkAfterPux = await page.evaluate(({ puxTrackId, puxPatId, coroTrackId }) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const pTrack = store.tracks.find((t: any) => t.id === puxTrackId);
      const cTrack = store.tracks.find((t: any) => t.id === coroTrackId);
      return {
        puxActive: pTrack?.patterns.find((p: any) => p.id === puxPatId)?.measureAssignments[0],
        coroActive: cTrack?.patterns.some((p: any) => p.measureAssignments[0]),
      };
    }, { puxTrackId: trackInfo.puxTrackId, puxPatId: trackInfo.puxPatId, coroTrackId: trackInfo.coroTrackId });

    expect(checkAfterPux.puxActive).toBe(true);
    expect(checkAfterPux.coroActive).toBe(false);

    // 3. Assign pattern to Coro at Measure 0
    await page.evaluate(({ coroTrackId, coroPatId }) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.handleTimelinePatternAssign(coroTrackId, coroPatId, 0);
    }, { coroTrackId: trackInfo.coroTrackId, coroPatId: trackInfo.coroPatId });

    // CRITICAL ASSERTION: BOTH MUST BE ACTIVE! Puxador MUST NOT be erased by Coro!
    const checkBothActive = await page.evaluate(({ puxTrackId, puxPatId, coroTrackId, coroPatId }) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const pTrack = store.tracks.find((t: any) => t.id === puxTrackId);
      const cTrack = store.tracks.find((t: any) => t.id === coroTrackId);
      return {
        puxActive: pTrack?.patterns.find((p: any) => p.id === puxPatId)?.measureAssignments[0],
        coroActive: cTrack?.patterns.find((p: any) => p.id === coroPatId)?.measureAssignments[0],
      };
    }, { puxTrackId: trackInfo.puxTrackId, puxPatId: trackInfo.puxPatId, coroTrackId: trackInfo.coroTrackId, coroPatId: trackInfo.coroPatId });

    expect(checkBothActive.puxActive).toBe(true);
    expect(checkBothActive.coroActive).toBe(true);

    // 4. Duplicate Toada bus from Measure 0 to Measure 1
    await page.evaluate(({ toadaBusId }) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.duplicateMeasurePattern(toadaBusId, 0, 1);
    }, { toadaBusId: trackInfo.toadaBusId });

    // Both Puxador and Coro should be duplicated to Measure 1
    const checkDuplicated = await page.evaluate(({ puxTrackId, puxPatId, coroTrackId, coroPatId }) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const pTrack = store.tracks.find((t: any) => t.id === puxTrackId);
      const cTrack = store.tracks.find((t: any) => t.id === coroTrackId);
      return {
        puxActiveM1: pTrack?.patterns.find((p: any) => p.id === puxPatId)?.measureAssignments[1],
        coroActiveM1: cTrack?.patterns.find((p: any) => p.id === coroPatId)?.measureAssignments[1],
      };
    }, { puxTrackId: trackInfo.puxTrackId, puxPatId: trackInfo.puxPatId, coroTrackId: trackInfo.coroTrackId, coroPatId: trackInfo.coroPatId });

    expect(checkDuplicated.puxActiveM1).toBe(true);
    expect(checkDuplicated.coroActiveM1).toBe(true);

    // 5. Test atomic Undo of the Toada duplication
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.handleUndo();
    });

    const checkAfterUndo = await page.evaluate(({ puxTrackId, puxPatId, coroTrackId, coroPatId }) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const pTrack = store.tracks.find((t: any) => t.id === puxTrackId);
      const cTrack = store.tracks.find((t: any) => t.id === coroTrackId);
      return {
        puxActiveM1: pTrack?.patterns.find((p: any) => p.id === puxPatId)?.measureAssignments[1],
        coroActiveM1: cTrack?.patterns.find((p: any) => p.id === coroPatId)?.measureAssignments[1],
      };
    }, { puxTrackId: trackInfo.puxTrackId, puxPatId: trackInfo.puxPatId, coroTrackId: trackInfo.coroTrackId, coroPatId: trackInfo.coroPatId });

    // Single rollback should have reverted both Measure 1 assignments back to false!
    expect(checkAfterUndo.puxActiveM1).toBe(false);
    expect(checkAfterUndo.coroActiveM1).toBe(false);

    // 6. Test Folded display of Toada
    // Fold Toada
    await page.evaluate(({ toadaBusId }) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.handleToggleSequencerFoldBus(toadaBusId);
    }, { toadaBusId: trackInfo.toadaBusId });

    await page.waitForTimeout(500);

    // Scroll timeline vertical container to bottom to make Toada visible
    await page.evaluate(() => {
      const container = document.querySelector('.overflow-y-auto');
      if (container) container.scrollTop = container.scrollHeight;
    });
    await page.waitForTimeout(500);

    // Check that folded Toada measure cell 0 shows the dual badges [P] and [C]
    const puxBadge = page.locator('[title*="Puxador"]').first();
    const coroBadge = page.locator('[title*="Coro"]').first();
    await expect(puxBadge).toBeVisible();
    await expect(coroBadge).toBeVisible();

    // 7. Test individual subtrack duplication (Puxador duplicated to measure 2 without affecting Coro)
    await page.evaluate(({ puxTrackId }) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.duplicateMeasurePattern(puxTrackId, 0, 2);
    }, { puxTrackId: trackInfo.puxTrackId });

    const checkPuxSoloDup = await page.evaluate(({ puxTrackId, puxPatId, coroTrackId }) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const pTrack = store.tracks.find((t: any) => t.id === puxTrackId);
      const cTrack = store.tracks.find((t: any) => t.id === coroTrackId);
      return {
        puxActiveM2: pTrack?.patterns.find((p: any) => p.id === puxPatId)?.measureAssignments[2],
        coroActiveM2: cTrack?.patterns.some((p: any) => p.measureAssignments[2]),
      };
    }, { puxTrackId: trackInfo.puxTrackId, puxPatId: trackInfo.puxPatId, coroTrackId: trackInfo.coroTrackId });

    expect(checkPuxSoloDup.puxActiveM2).toBe(true);
    expect(checkPuxSoloDup.coroActiveM2).toBe(false);
  });
});
