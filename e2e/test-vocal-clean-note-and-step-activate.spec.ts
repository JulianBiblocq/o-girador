/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, expect } from '@playwright/test';

test.describe("Nettoyage du rendu des notes et activation du mode Pas-à-Pas MIDI", () => {
  test("Rendu unique de note sans superposition et activation pas-à-pas avec tolérance MIDI", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 850 });
    page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));

    await page.goto('http://localhost:5174/?view=timeline');
    await page.waitForTimeout(1500);

    const entraBtn = page.locator('#entra-btn');
    if (await entraBtn.isVisible().catch(() => false)) {
      await entraBtn.click();
      await page.waitForTimeout(1000);
    }

    // Attendre que le store et les pistes soient prêts
    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 15000 });

    // 1. Ouvrir l'éditeur de détail pour la piste Puxador
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const toada = store.tracks.find((t: any) => t.isBusFolder && t.customName === 'Toada');
      const puxTrack = store.tracks.find((t: any) =>
        (toada && t.busId && String(t.busId) === String(toada.id)) ||
        t.customName?.includes('Puxador') ||
        t.id === 'puxador'
      );
      if (puxTrack) {
        store.setEditingTrackId(puxTrack.id);
        // S'assurer qu'aucun pas n'est sélectionné au départ
        store.setSelectedStepIdx?.(null);
        (window as any).__SEQUENCER_STORE__.setState({ selectedStepIdx: null, selectedStepIsPreRoll: false });
      }
    });

    // 2. Vérifier le bouton "Saisie pas à pas" dans le dock
    const stepModeBtn = page.locator('[data-testid="voice-step-mode-btn"]').first();
    await expect(stepModeBtn).toBeVisible({ timeout: 10000 });

    // S'assurer que le mode vocal commence en "free"
    await page.evaluate(() => {
      (window as any).__AUDIO_STORE__?.getState().setVoiceInputMode('free');
    });

    // Cliquer sur le bouton "Saisie pas à pas"
    await stepModeBtn.click();
    await page.waitForTimeout(200);

    // Vérifier que voiceInputMode est passé à 'step'
    const currentMode = await page.evaluate(() => {
      return (window as any).__AUDIO_STORE__?.getState().voiceInputMode;
    });
    expect(currentMode).toBe('step');

    // Vérifier que le pas 0 a été sélectionné automatiquement
    const autoSelectedStep = await page.evaluate(() => {
      return (window as any).__SEQUENCER_STORE__?.getState().selectedStepIdx;
    });
    expect(autoSelectedStep).toBe(0);

    // 3. Simuler une note MIDI NoteOn 60 (C4)
    await page.evaluate(() => {
      (window as any).__oGiradorSimulateMidi(0x90, 60, 100);
    });
    await page.waitForTimeout(300);

    // Vérifier l'inscription de C4 au pas 0 et l'avancement automatique au pas 1
    const step0Data = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const currentTrack = store.tracks.find((t: any) => t.id === store.editingTrackId);
      const activeCard = document.querySelector('[data-pattern-card][data-selected="true"]');
      const activePatternId = activeCard ? Number(activeCard.getAttribute('data-pattern-card')) : null;
      const targetPatternId = activePatternId || currentTrack?.selectedPatternId || currentTrack?.patterns?.[0]?.id;
      const pattern = currentTrack?.patterns?.find((p: any) => p.id === targetPatternId) || currentTrack?.patterns?.[0];
      return {
        selectedStepIdx: store.selectedStepIdx,
        step0Note: pattern?.notes?.[0],
        step0Role: pattern?.activeSteps?.[0],
        currentTrackId: currentTrack?.id,
        targetPatternId: pattern?.id
      };
    });

    expect(step0Data.step0Note).toBe('C4');
    expect(step0Data.step0Role).toBe('P');
    expect(step0Data.selectedStepIdx).toBe(1);

    // 4. VÉRIFICATION DU RENDU VISUEL UNIQUE (Aucune superposition)
    // Sélectionner la cellule du pas 0 de la grille du motif actif
    const step0Cell = page.locator(`[id="detail-voice-${step0Data.currentTrackId}-${step0Data.targetPatternId}"] [data-step-type="voice"][data-step-index="0"]`).first();
    await expect(step0Cell).toBeVisible();

    const noteInputContainer = step0Cell.locator('.relative.w-full.h-\\[24px\\]');
    await expect(noteInputContainer).toBeVisible();

    // Vérifier qu'il y a exactement un input .v-note et ZÉRO span superposé
    const noteInput = noteInputContainer.locator('input.v-note');
    await expect(noteInput).toHaveCount(1);
    await expect(noteInput).toHaveValue('C4');

    const ghostSpans = noteInputContainer.locator('span');
    await expect(ghostSpans).toHaveCount(0);

    // 5. TEST DE TOLÉRANCE MIDI : Réinitialiser selectedStepIdx à null et envoyer NoteOn 62 (D4)
    await page.evaluate(() => {
      (window as any).__SEQUENCER_STORE__.setState({ selectedStepIdx: null, selectedStepIsPreRoll: false });
    });

    await page.evaluate(() => {
      (window as any).__oGiradorSimulateMidi(0x90, 62, 100);
    });
    await page.waitForTimeout(300);

    // Vérifier que le contrôleur a écrit D4 au pas 0 par tolérance et est passé au pas 1
    const toleranceData = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const currentTrack = store.tracks.find((t: any) => t.id === store.editingTrackId);
      const activeCard = document.querySelector('[data-pattern-card][data-selected="true"]');
      const activePatternId = activeCard ? Number(activeCard.getAttribute('data-pattern-card')) : null;
      const targetPatternId = activePatternId || currentTrack?.selectedPatternId || currentTrack?.patterns?.[0]?.id;
      const pattern = currentTrack?.patterns?.find((p: any) => p.id === targetPatternId) || currentTrack?.patterns?.[0];
      return {
        selectedStepIdx: store.selectedStepIdx,
        step0Note: pattern?.notes?.[0],
      };
    });

    expect(toleranceData.step0Note).toBe('D4');
    expect(toleranceData.selectedStepIdx).toBe(1);
  });
});
