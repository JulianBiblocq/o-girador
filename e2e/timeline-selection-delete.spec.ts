import { test, expect } from '@playwright/test';

test.describe("Timeline Multi-Selection & Batch Deletion (DAW Standards)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174/?view=timeline');
    await page.waitForTimeout(2000);

    const entraBtn = page.locator('#entra-btn');
    if (await entraBtn.isVisible().catch(() => false)) {
      await entraBtn.click();
      await page.waitForTimeout(2000);
    }

    // Attendre que les pistes du preset initial soient complètement chargées
    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 10000 });
  });

  test("Sélection globale (Ctrl + A), suppression (Delete) et annulation (Ctrl + Z)", async ({ page }) => {
    // 1. S'assurer qu'au moins un motif est assigné au départ
    const initialStatus = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const hasAnyAssigned = store.tracks.some((t: any) =>
        t.patterns?.some((p: any) => p.measureAssignments?.some((a: boolean) => a === true))
      );
      return {
        tracksCount: store.tracks.length,
        totalMeasures: store.totalMeasures,
        hasAnyAssigned
      };
    });

    expect(initialStatus.tracksCount).toBeGreaterThan(0);
    expect(initialStatus.hasAnyAssigned).toBe(true);

    // 2. Déclencher Ctrl + A (selectAllTimelineCells)
    await page.evaluate(() => {
      (window as any).__SEQUENCER_STORE__.getState().selectAllTimelineCells();
    });

    const afterCtrlA = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      return {
        selectedCount: store.selectedTimelineCells.length,
        totalMeasures: store.totalMeasures
      };
    });

    expect(afterCtrlA.selectedCount).toBeGreaterThan(0);
    expect(afterCtrlA.selectedCount % afterCtrlA.totalMeasures).toBe(0);

    // 3. Déclencher la suppression (deleteSelectedTimelineCells)
    await page.evaluate(() => {
      (window as any).__SEQUENCER_STORE__.getState().deleteSelectedTimelineCells();
    });

    const afterDelete = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const hasAnyAssigned = store.tracks.some((t: any) =>
        t.patterns?.some((p: any) => p.measureAssignments?.some((a: boolean) => a === true))
      );
      return {
        selectedCount: store.selectedTimelineCells.length,
        hasAnyAssigned
      };
    });

    // La sélection doit être MAINTENUE (non vidée)
    expect(afterDelete.selectedCount).toBe(afterCtrlA.selectedCount);
    // Toutes les cellules sélectionnées doivent être en silence (aucune mesure active)
    expect(afterDelete.hasAnyAssigned).toBe(false);

    // 4. Déclencher Undo (Ctrl + Z)
    await page.evaluate(() => {
      (window as any).__SEQUENCER_STORE__.getState().handleUndo();
    });

    const afterUndo = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const hasAnyAssigned = store.tracks.some((t: any) =>
        t.patterns?.some((p: any) => p.measureAssignments?.some((a: boolean) => a === true))
      );
      return { hasAnyAssigned };
    });

    // L'état précédent doit être restauré
    expect(afterUndo.hasAnyAssigned).toBe(true);
  });

  test("Sélection par instrument (selectTrackTimelineCells)", async ({ page }) => {
    const result = await page.evaluate(() => {
      const storeApi = (window as any).__SEQUENCER_STORE__;
      const store = storeApi.getState();
      const firstTrack = store.tracks[0];
      const secondTrack = store.tracks[1];
      const totalMeasures = store.totalMeasures;

      // Clic sans modificateur sur la première piste
      store.selectTrackTimelineCells(firstTrack.id, false);
      const singleTrackCount = storeApi.getState().selectedTimelineCells.length;
      const allFirstTrack = storeApi.getState().selectedTimelineCells.every((c: any) => c.trackId === firstTrack.id);

      // Clic avec modificateur (Shift / Ctrl) sur la seconde piste
      store.selectTrackTimelineCells(secondTrack.id, true);
      const twoTracksCount = storeApi.getState().selectedTimelineCells.length;

      // Clic avec modificateur (toggle) sur la seconde piste à nouveau
      store.selectTrackTimelineCells(secondTrack.id, true);
      const afterToggleCount = storeApi.getState().selectedTimelineCells.length;

      return {
        totalMeasures,
        singleTrackCount,
        allFirstTrack,
        twoTracksCount,
        afterToggleCount
      };
    });

    expect(result.singleTrackCount).toBe(result.totalMeasures);
    expect(result.allFirstTrack).toBe(true);
    expect(result.twoTracksCount).toBe(result.totalMeasures * 2);
    expect(result.afterToggleCount).toBe(result.totalMeasures);
  });

  test("Suppression sur le bus Toada synchronise Puxador et Coro", async ({ page }) => {
    const syncResult = await page.evaluate(() => {
      const storeApi = (window as any).__SEQUENCER_STORE__;
      const store = storeApi.getState();
      const tracks = store.tracks;
      const toadaBus = tracks.find((t: any) => t.isBusFolder && (t.customName === 'Toada' || String(t.id) === 'toada'));
      const puxTrack = tracks.find((t: any) => t.instrumentIdx === 10 || t.customName === 'Puxador');

      if (!toadaBus || !puxTrack) {
        return { skipped: true, initialPuxActive: false, puxAfterDeleteActive: false };
      }

      // S'assurer qu'au moins une mesure est active sur Puxador
      const hasActive = puxTrack.patterns.some((p: any) => p.measureAssignments?.[0]);
      if (!hasActive && puxTrack.patterns.length > 0) {
        puxTrack.patterns[0].measureAssignments[0] = true;
      }

      const initialPuxActive = puxTrack.patterns.some((p: any) => p.measureAssignments?.[0]);

      // Sélectionner la cellule de la mesure 0 sur le bus Toada
      store.clearTimelineSelection();
      store.selectTimelineCell(toadaBus.id, 0, 'single');

      // Supprimer
      store.deleteSelectedTimelineCells();

      const updatedStore = storeApi.getState();
      const updatedPux = updatedStore.tracks.find((t: any) => t.id === puxTrack.id);
      const puxAfterDeleteActive = updatedPux.patterns.some((p: any) => p.measureAssignments?.[0]);

      return {
        skipped: false,
        initialPuxActive,
        puxAfterDeleteActive
      };
    });

    if (!syncResult.skipped) {
      expect(syncResult.initialPuxActive).toBe(true);
      expect(syncResult.puxAfterDeleteActive).toBe(false);
    }
  });
});
