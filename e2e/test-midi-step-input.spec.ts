import { test, expect } from '@playwright/test';

test.describe("Rétablissement de l'écriture pas-à-pas au clavier maître MIDI", () => {
  test("Saisie pas-à-pas sur Puxador ('P'), Coro ('C') et Alfaia avec avance automatique", async ({ page }) => {
    // 1. Charger l'application
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

    // ==========================================
    // TEST 1 : Puxador - Saisie pas-à-pas vocale
    // ==========================================
    // Ouvrir l'éditeur de détail pour la piste Puxador
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

    // Attendre que la cellule vocale principale du pas 0 apparaisse dans le DOM
    const step0MainVoice = page.locator('[id^="detail-voice-"] [data-step-type="voice"][data-step-index="0"]').first();
    await expect(step0MainVoice).toBeVisible({ timeout: 10000 });

    // Cliquer sur le pas 0 principal de Puxador
    await step0MainVoice.click();
    await page.waitForTimeout(200);

    // Vérifier que le pas 0 est sélectionné dans le store et non-preRoll
    const step0Status = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      return {
        selectedStepIdx: store.selectedStepIdx,
        selectedStepIsPreRoll: store.selectedStepIsPreRoll
      };
    });
    expect(step0Status.selectedStepIdx).toBe(0);
    expect(step0Status.selectedStepIsPreRoll).toBe(false);

    // Simuler l'envoi d'une note MIDI Note On 60 (C4)
    await page.evaluate(() => {
      (window as any).__oGiradorSimulateMidi(0x90, 60, 100);
    });
    await page.waitForTimeout(300);

    // Vérifier l'inscription de 'C4', le rôle 'P', et l'avancement automatique au pas 1
    const puxDataAfterC4 = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const currentTrack = store.tracks.find((t: any) => t.id === store.editingTrackId);
      const targetPatternId = currentTrack?.selectedPatternId || currentTrack?.patterns?.[0]?.id;
      const pattern = currentTrack?.patterns?.find((p: any) => p.id === targetPatternId) || currentTrack?.patterns?.[0];
      return {
        selectedStepIdx: store.selectedStepIdx,
        step0Note: pattern?.notes?.[0],
        step0Role: pattern?.activeSteps?.[0],
      };
    });

    expect(puxDataAfterC4.step0Note).toBe('C4');
    expect(puxDataAfterC4.step0Role).toBe('P');
    expect(puxDataAfterC4.selectedStepIdx).toBe(1);

    // Simuler Note On 62 (D4) sur le pas 1 devenu actif
    await page.evaluate(() => {
      (window as any).__oGiradorSimulateMidi(0x90, 62, 100);
    });
    await page.waitForTimeout(300);

    const puxDataAfterD4 = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const currentTrack = store.tracks.find((t: any) => t.id === store.editingTrackId);
      const targetPatternId = currentTrack?.selectedPatternId || currentTrack?.patterns?.[0]?.id;
      const pattern = currentTrack?.patterns?.find((p: any) => p.id === targetPatternId) || currentTrack?.patterns?.[0];
      return {
        selectedStepIdx: store.selectedStepIdx,
        step1Note: pattern?.notes?.[1],
        step1Role: pattern?.activeSteps?.[1],
      };
    });

    expect(puxDataAfterD4.step1Note).toBe('D4');
    expect(puxDataAfterD4.step1Role).toBe('P');
    expect(puxDataAfterD4.selectedStepIdx).toBe(2);

    // ==========================================
    // TEST 2 : Coro - Saisie pas-à-pas vocale
    // ==========================================
    // Basculer l'éditeur sur la piste Coro
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const toada = store.tracks.find((t: any) => t.isBusFolder && t.customName === 'Toada');
      const puxTrack = store.tracks.find((t: any) =>
        (toada && t.busId && String(t.busId) === String(toada.id)) ||
        t.customName?.includes('Puxador') ||
        t.id === 'puxador'
      );
      const coroTrack = store.tracks.find((t: any) =>
        (toada && t.busId && String(t.busId) === String(toada.id) && t.id !== puxTrack?.id) ||
        t.customName?.includes('Coro') ||
        t.id === 'coro'
      );
      if (coroTrack) {
        store.setEditingTrackId(coroTrack.id);
      }
    });

    await page.waitForTimeout(500);

    // Sélectionner le pas 0 principal sur Coro
    const step0MainCoro = page.locator('[id^="detail-voice-"] [data-step-type="voice"][data-step-index="0"]').first();
    await expect(step0MainCoro).toBeVisible({ timeout: 5000 });
    await step0MainCoro.click();
    await page.waitForTimeout(200);

    // Simuler Note On 65 (F4) sur Coro
    await page.evaluate(() => {
      (window as any).__oGiradorSimulateMidi(0x90, 65, 100);
    });
    await page.waitForTimeout(300);

    // Vérifier l'inscription de 'F4', le rôle 'C' (étanche), et l'avancement au pas 1
    const coroDataAfterF4 = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const currentTrack = store.tracks.find((t: any) => t.id === store.editingTrackId);
      const targetPatternId = currentTrack?.selectedPatternId || currentTrack?.patterns?.[0]?.id;
      const pattern = currentTrack?.patterns?.find((p: any) => p.id === targetPatternId) || currentTrack?.patterns?.[0];
      return {
        selectedStepIdx: store.selectedStepIdx,
        step0Note: pattern?.notes?.[0],
        step0Role: pattern?.activeSteps?.[0],
      };
    });

    expect(coroDataAfterF4.step0Note).toBe('F4');
    expect(coroDataAfterF4.step0Role).toBe('C');
    expect(coroDataAfterF4.selectedStepIdx).toBe(1);

    // ==========================================
    // TEST 3 : Percussion (Alfaia) hors lecture
    // ==========================================
    // Basculer l'éditeur sur une piste de percussion (Alfaia)
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const alfaiaTrack = store.tracks.find((t: any) =>
        !t.isBusFolder && t.type !== 'voice' && (t.customName?.toLowerCase().includes('alfaia') || t.customName?.toLowerCase().includes('marcante') || t.id !== 'puxador')
      );
      if (alfaiaTrack) {
        store.setEditingTrackId(alfaiaTrack.id);
      }
    });

    await page.waitForTimeout(500);

    // Sélectionner le pas 0 sur l'Alfaia
    const step0Perc = page.locator('.percussion-step-container[data-step-index="0"]').first();
    await expect(step0Perc).toBeVisible({ timeout: 5000 });
    await step0Perc.click();
    await page.waitForTimeout(200);

    // Vérifier que le pas 0 est actif
    const selectedPercStep = await page.evaluate(() => (window as any).__SEQUENCER_STORE__.getState().selectedStepIdx);
    expect(selectedPercStep).toBe(0);

    // Simuler l'envoi d'une note MIDI Note On 36 (C2)
    await page.evaluate(() => {
      (window as any).__oGiradorSimulateMidi(0x90, 36, 100);
    });
    await page.waitForTimeout(300);

    // Vérifier l'inscription de la frappe et l'avancement au pas 1
    const percData = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const currentTrack = store.tracks.find((t: any) => t.id === store.editingTrackId);
      const targetPatternId = currentTrack?.selectedPatternId || currentTrack?.patterns?.[0]?.id;
      const pattern = currentTrack?.patterns?.find((p: any) => p.id === targetPatternId) || currentTrack?.patterns?.[0];
      return {
        selectedStepIdx: store.selectedStepIdx,
        step0Value: pattern?.activeSteps?.[0],
      };
    });

    expect(percData.step0Value).not.toBe(0);
    expect(percData.step0Value).not.toBe('0');
    expect(percData.selectedStepIdx).toBe(1);
  });
});
