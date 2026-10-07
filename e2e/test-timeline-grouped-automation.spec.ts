import { test, expect } from '@playwright/test';
import { ensureStudioLoaded } from './helpers/navigation';

test.describe("Sélection continue (Shift + Clic) et modification groupée des automations Tempo & Volume", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Charger l'application en vue Timeline
    await page.goto('http://localhost:5174/?view=timeline');
    await page.waitForTimeout(1000);

    await ensureStudioLoaded(page);

    // Attendre que le store et les pistes soient prêts
    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 25000 });

    // S'assurer d'avoir au moins 8 mesures
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      if ((store.totalMeasures || 0) < 8) {
        store.setTotalMeasures(8);
      }
    });

    // Attendre que le chargement asynchrone du morceau vedette / preset soit stabilisé
    await page.waitForTimeout(1000);

    // Attendre que les cellules de tempo de la piste d'automation soient affichées
    const tempoCell0 = page.locator('[data-automation-type="bpm"][data-measure-idx="0"]').first();
    await expect(tempoCell0).toBeVisible({ timeout: 10000 });
  });

  test("1. Clic tempo M1 puis Shift + Clic tempo M4 : sélection continue des mesures 1 à 4", async ({ page }) => {
    const badgeM1 = page.locator('[data-automation-type="bpm"][data-measure-idx="0"]').first();
    const badgeM4 = page.locator('[data-automation-type="bpm"][data-measure-idx="3"]').first();

    // Clic simple sur la mesure 1 (index 0)
    await badgeM1.click({ force: true });
    await page.waitForTimeout(100);

    let state = await page.evaluate(() => {
      const s = (window as any).__SEQUENCER_STORE__.getState();
      return {
        type: s.selectedAutomationType,
        trackId: s.selectedAutomationTrackId,
        range: s.selectedAutomationRange,
        anchor: s.automationAnchorMeasure
      };
    });

    expect(state.type).toBe('bpm');
    expect(state.trackId).toBeNull();
    expect(state.range).toEqual({ start: 0, end: 0 });
    expect(state.anchor).toBe(0);

    // Shift + Clic sur la mesure 4 (index 3)
    await badgeM4.click({ modifiers: ['Shift'], force: true });
    await page.waitForTimeout(100);

    state = await page.evaluate(() => {
      const s = (window as any).__SEQUENCER_STORE__.getState();
      return {
        type: s.selectedAutomationType,
        trackId: s.selectedAutomationTrackId,
        range: s.selectedAutomationRange,
        anchor: s.automationAnchorMeasure
      };
    });

    expect(state.type).toBe('bpm');
    expect(state.trackId).toBeNull();
    expect(state.range).toEqual({ start: 0, end: 3 });
    expect(state.anchor).toBe(0);

    // Vérifier la surbrillance sur les cellules 0, 1, 2, 3
    for (let i = 0; i <= 3; i++) {
      const badge = page.locator(`[data-automation-type="bpm"][data-measure-idx="${i}"]`).first();
      await expect(badge).toHaveClass(/bg-amber-500|#e67e22/);
    }
  });

  test("2. Modification groupée Tempo : passer M2 à 110 BPM aligne M1 à M4 et supporte Ctrl+Z", async ({ page }) => {
    // 1. Initialiser les tempos de départ des mesures 1 à 4 à des valeurs connues (ex: 80, 85, 90, 95)
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const bpms = [...store.measureBpms];
      bpms[0] = 80;
      bpms[1] = 85;
      bpms[2] = 90;
      bpms[3] = 95;
      store.setMeasureBpms(bpms);
      store.pushUndoState();
    });

    const badgeM1 = page.locator('[data-automation-type="bpm"][data-measure-idx="0"]').first();
    const badgeM4 = page.locator('[data-automation-type="bpm"][data-measure-idx="3"]').first();

    // Sélectionner de la mesure 1 à 4 via Shift+Clic
    await badgeM1.click({ force: true });
    await page.waitForTimeout(50);

    await badgeM4.click({ modifiers: ['Shift'], force: true });
    await page.waitForTimeout(50);

    // Vérifier que la sélection est active
    const range = await page.evaluate(() => (window as any).__SEQUENCER_STORE__.getState().selectedAutomationRange);
    expect(range).toEqual({ start: 0, end: 3 });

    // Modifier le tempo sur la mesure 2 (index 1) à 110 BPM
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.handleMeasureBpmChange(1, 110);
    });
    await page.waitForTimeout(100);

    // Vérifier que les mesures 0, 1, 2, 3 sont TOUTES passées à 110 BPM
    const bpmsAfter = await page.evaluate(() => (window as any).__SEQUENCER_STORE__.getState().measureBpms.slice(0, 4));
    expect(bpmsAfter).toEqual([110, 110, 110, 110]);

    // 3. Test Undo (Ctrl + Z) : un seul rollback doit restaurer [80, 85, 90, 95]
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(200);

    const bpmsRestored = await page.evaluate(() => (window as any).__SEQUENCER_STORE__.getState().measureBpms.slice(0, 4));
    expect(bpmsRestored).toEqual([80, 85, 90, 95]);
  });

  test("3. Volume individuel par instrument (trackId) : sélection continue et modification groupée", async ({ page }) => {
    // Récupérer le premier instrument réel
    const targetTrackId = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const trk = store.tracks.find((t: any) => !t.isBusFolder && !t.isHidden);
      return trk ? trk.id : null;
    });
    expect(targetTrackId).not.toBeNull();

    // Sélectionner mesure 2 à mesure 5 sur le volume de cet instrument
    await page.evaluate((tId) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.selectAutomationMeasure('volume', 1, false, tId);
      store.selectAutomationMeasure('volume', 4, true, tId);
    }, targetTrackId);

    const selState = await page.evaluate(() => {
      const s = (window as any).__SEQUENCER_STORE__.getState();
      return {
        type: s.selectedAutomationType,
        trackId: s.selectedAutomationTrackId,
        range: s.selectedAutomationRange
      };
    });

    expect(selState.type).toBe('volume');
    expect(selState.trackId).toBe(targetTrackId);
    expect(selState.range).toEqual({ start: 1, end: 4 });

    // Appliquer 75% de volume sur la mesure 3 (index 2)
    await page.evaluate((tId) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.handleTrackMeasureVolChange(tId, 2, 75);
    }, targetTrackId);

    // Vérifier que les mesures 1 à 4 de cette piste sont passées à 75
    const volsAfter = await page.evaluate((tId) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const trk = store.tracks.find((t: any) => t.id === tId);
      return trk?.measureVols?.slice(1, 5);
    }, targetTrackId);

    expect(volsAfter).toEqual([75, 75, 75, 75]);

    // Test Undo sur le volume de piste
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(200);

    const volsRestored = await page.evaluate((tId) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const trk = store.tracks.find((t: any) => t.id === tId);
      return trk?.measureVols?.slice(1, 5);
    }, targetTrackId);

    expect(volsRestored).not.toEqual([75, 75, 75, 75]);
  });

  test("4. Désélection propre (Échap & clic cellule)", async ({ page }) => {
    // Activer une sélection de tempo
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.selectAutomationMeasure('bpm', 0, false, null);
      store.selectAutomationMeasure('bpm', 3, true, null);
    });

    let isSelected = await page.evaluate(() => (window as any).__SEQUENCER_STORE__.getState().selectedAutomationRange !== null);
    expect(isSelected).toBe(true);

    // Appui sur Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    isSelected = await page.evaluate(() => (window as any).__SEQUENCER_STORE__.getState().selectedAutomationRange !== null);
    expect(isSelected).toBe(false);
  });
});
