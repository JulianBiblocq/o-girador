import { test, expect } from '@playwright/test';
import { ensureStudioLoaded } from './helpers/navigation';

test.describe("Comportement contextuel de Suppr et Navigation fluide aux flèches", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Charger l'application en mode timeline
    await page.goto('http://localhost:5174/?view=timeline');
    await page.waitForTimeout(1000);

    await ensureStudioLoaded(page);

    // Attendre que le store et les pistes soient prêts
    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 15000 });

    await page.waitForFunction(() => {
      const tracks = (window as any).useSequencerStore?.getState?.()?.tracks || [];
      return tracks.some((t: any) => 
        t.instrumentRoleKey === 'puxador' || 
        t.instrumentRoleKey === 'coro' || 
        t.name?.toLowerCase().includes('puxador') ||
        t.id === 'puxador'
      );
    }, { timeout: 10000 });

    // Ouvrir l'éditeur de détail pour la piste vocale Puxador
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
      }
    });

    // Attendre que la grille vocale soit visible
    const step0MainVoice = page.locator('[id^="detail-voice-"] [data-step-type="voice"][data-step-index="0"]').first();
    await expect(step0MainVoice).toBeVisible({ timeout: 10000 });
  });

  test("1. Édition texte : Suppr au milieu d'un mot n'efface que la lettre, sans toucher à la note", async ({ page }) => {
    const card0 = page.locator('[id^="detail-voice-"] [data-step-index="0"].v-card').first();
    const sylInput = card0.locator('.v-syl');
    const noteInput = card0.locator('.v-note');

    // Saisir une note et une syllabe complète
    await noteInput.focus();
    await noteInput.fill('C4');
    await noteInput.blur();
    await page.waitForTimeout(100);

    await sylInput.focus();
    await sylInput.fill('maracatu');
    await expect(sylInput).toHaveValue('maracatu');

    // Positionner le curseur entre 'mara' et 'catu' (offset 4)
    await sylInput.focus();
    await sylInput.evaluate((el: HTMLInputElement) => {
      el.setSelectionRange(4, 4);
    });

    // Appuyer sur Delete (Suppr) : doit supprimer 'c' sans effacer la cellule ni la note
    await page.keyboard.press('Delete');
    await page.waitForTimeout(150);

    // Vérifier que le texte est devenu 'maraatu' (suppression du 'c' dans m-a-r-a-c-a-t-u)
    await expect(sylInput).toHaveValue('maraatu');

    // Vérifier que la note C4 est restée intacte
    await expect(noteInput).toHaveValue('C4');

    // Vérifier que la cellule est toujours active dans le store
    const checkState = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const currentTrack = store.tracks.find((t: any) => t.id === store.editingTrackId);
      const targetPatternId = currentTrack?.selectedPatternId || currentTrack?.patterns?.[0]?.id;
      const pattern = currentTrack?.patterns?.find((p: any) => p.id === targetPatternId);
      return {
        activeStep: pattern?.activeSteps?.[0],
        note: pattern?.notes?.[0],
        lyrics: pattern?.lyrics?.[0]
      };
    });

    expect(checkState.activeStep).toBeTruthy();
    expect(checkState.note).toBe('C4');
    expect(checkState.lyrics).toBe('maraatu');
  });

  test("2. Effacement cellule : Suppr vide tout (note, syllabe, couleur) et supporte Undo", async ({ page }) => {
    const card0 = page.locator('[id^="detail-voice-"] [data-step-index="0"].v-card').first();
    const sylInput = card0.locator('.v-syl');
    const noteInput = card0.locator('.v-note');

    // Saisir une note et une syllabe
    await noteInput.focus();
    await noteInput.fill('D4');
    await noteInput.blur();
    await page.waitForTimeout(100);

    await sylInput.focus();
    await sylInput.fill('le');
    await page.waitForTimeout(100);

    // Vérifier la coloration initiale (non transparente)
    const initialBg = await card0.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(initialBg).not.toBe('rgba(0, 0, 0, 0)');

    // Sélectionner tout le texte dans le champ syl puis appuyer sur Suppr
    await sylInput.focus();
    await sylInput.selectText();
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    // Vérifier que le pas est atomiquement vidé dans le store
    const emptyState = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const currentTrack = store.tracks.find((t: any) => t.id === store.editingTrackId);
      const targetPatternId = currentTrack?.selectedPatternId || currentTrack?.patterns?.[0]?.id;
      const pattern = currentTrack?.patterns?.find((p: any) => p.id === targetPatternId);
      return {
        activeStep: pattern?.activeSteps?.[0],
        note: pattern?.notes?.[0],
        lyrics: pattern?.lyrics?.[0]
      };
    });

    expect(emptyState.activeStep === 0 || emptyState.activeStep === '0').toBe(true);
    expect(emptyState.note).toBe('');
    expect(emptyState.lyrics).toBe('');

    // Vérifier la décoloration effective de la carte vers son fond transparent
    const clearedBg = await card0.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(clearedBg).toBe('rgba(0, 0, 0, 0)');

    // Test Undo (Ctrl + Z)
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(250);

    const restoredState = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const currentTrack = store.tracks.find((t: any) => t.id === store.editingTrackId);
      const targetPatternId = currentTrack?.selectedPatternId || currentTrack?.patterns?.[0]?.id;
      const pattern = currentTrack?.patterns?.find((p: any) => p.id === targetPatternId);
      return {
        activeStep: pattern?.activeSteps?.[0],
        note: pattern?.notes?.[0],
        lyrics: pattern?.lyrics?.[0]
      };
    });

    expect(restoredState.note).toBe('D4');
    expect(restoredState.lyrics).toBe('le');
  });

  test("3. Navigation flèches : franchissement fluide des temps, saut vertical 1<->2 et traversée anacrouse<->principale", async ({ page }) => {
    // A. Franchissement des temps et saut de ligne (0 -> 1 -> 2 -> 3 -> 4 -> ... -> 7 -> 8)
    const step0Syl = page.locator('[id^="detail-voice-"] [data-step-index="0"] .v-syl').first();
    await step0Syl.focus();

    // Depuis pas 0, flèche droite -> pas 1
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    let activeIdx = await page.evaluate(() => (window as any).__SEQUENCER_STORE__.getState().selectedStepIdx);
    expect(activeIdx).toBe(1);

    // Naviguer jusqu'au pas 3 (fin temps 1)
    await page.keyboard.press('ArrowRight'); // -> 2
    await page.keyboard.press('ArrowRight'); // -> 3
    activeIdx = await page.evaluate(() => (window as any).__SEQUENCER_STORE__.getState().selectedStepIdx);
    expect(activeIdx).toBe(3);

    // Franchissement frontière temps 1 -> temps 2 (3 -> 4)
    await page.keyboard.press('ArrowRight');
    activeIdx = await page.evaluate(() => (window as any).__SEQUENCER_STORE__.getState().selectedStepIdx);
    expect(activeIdx).toBe(4);

    // B. Saut vertical entre rangée 1 et rangée 2 (ArrowDown / ArrowUp)
    // Depuis pas 4 (rangée 1), ArrowDown doit sauter à 4 + 8 = 12 (rangée 2)
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(50);
    activeIdx = await page.evaluate(() => (window as any).__SEQUENCER_STORE__.getState().selectedStepIdx);
    expect(activeIdx).toBe(12);

    // Vérifier que le focus est toujours sur le champ .v-syl du pas 12
    const isStep12SylFocused = await page.evaluate(() => {
      const activeEl = document.activeElement;
      return activeEl?.classList.contains('v-syl') && activeEl?.closest('[data-step-index="12"]') !== null;
    });
    expect(isStep12SylFocused).toBe(true);

    // Remonter avec ArrowUp -> doit revenir au pas 4 (12 - 8)
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(50);
    activeIdx = await page.evaluate(() => (window as any).__SEQUENCER_STORE__.getState().selectedStepIdx);
    expect(activeIdx).toBe(4);

    // C. Traversée Mesure principale -> Anacrouse (pre-roll)
    // Revenir au pas 0
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.setSelectedStepIdx(0);
      store.setSelectedStepIsPreRoll?.(false);
    });
    await step0Syl.focus();
    await step0Syl.evaluate((el: HTMLInputElement) => {
      el.setSelectionRange(0, 0);
    });

    // Flèche gauche au début du pas 0 de la mesure principale -> saute au pas 15 de l'anacrouse
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);

    const preRollState = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      return {
        selectedStepIdx: store.selectedStepIdx,
        selectedStepIsPreRoll: store.selectedStepIsPreRoll
      };
    });
    expect(preRollState.selectedStepIdx).toBe(15);
    expect(preRollState.selectedStepIsPreRoll).toBe(true);

    // D. Traversée Anacrouse -> Mesure principale
    // Depuis le pas 15 de l'anacrouse, flèche droite à la fin du texte -> saute au pas 0 de la mesure principale
    const preRollStep15Syl = page.locator('.pre-roll-section [data-step-index="15"] .v-syl').first();
    await preRollStep15Syl.focus();
    await preRollStep15Syl.evaluate((el: HTMLInputElement) => {
      el.setSelectionRange(el.value.length, el.value.length);
    });

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);

    const mainState = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      return {
        selectedStepIdx: store.selectedStepIdx,
        selectedStepIsPreRoll: store.selectedStepIsPreRoll
      };
    });
    expect(mainState.selectedStepIdx).toBe(0);
    expect(mainState.selectedStepIsPreRoll).toBe(false);
  });
});
