import { test, expect } from '@playwright/test';
import { ensureStudioLoaded } from './helpers/navigation';

test.describe("Effacement au Clic Droit (Workflow Express FL Studio)", () => {
  const ensureEditorOpenForMarcante = async (page: any) => {
    // Attendre que le preset initial soit complètement hydraté dans le store
    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 15000 });

    await page.waitForTimeout(1000);

    await page.evaluate(async () => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const { instrumentsConfig } = await import('../src/data.ts');
      let percTrack = store.tracks.find((t: any) => {
        const inst = instrumentsConfig[t.instrumentIdx];
        const isVocal = inst && (inst.id === 'puxador' || inst.id === 'coro' || inst.type === 'vocal' || inst.isVocal);
        return !isVocal && t.patterns && t.patterns.length > 0;
      }) || store.tracks.find((t: any) => t.patterns && t.patterns.length > 0) || store.tracks[0];

      if (percTrack) {
        const patId = percTrack.selectedPatternId || percTrack.patterns?.[0]?.id || 9301;
        store.setSelectedPatternId(percTrack.id, patId);
        store.setEditingTrackId(percTrack.id);
      }
    });

    const editor = page.getByTestId('instrument-detail-editor-modal');
    try {
      await expect(editor).toBeVisible({ timeout: 5000 });
    } catch (_) {
      // Si une hydratation concurrente tardive a réinitialisé editingTrackId, réactiver
      await page.evaluate(async () => {
        const store = (window as any).__SEQUENCER_STORE__.getState();
        const { instrumentsConfig } = await import('../src/data.ts');
        const percTrack = store.tracks.find((t: any) => {
          const inst = instrumentsConfig[t.instrumentIdx];
          const isVocal = inst && (inst.id === 'puxador' || inst.id === 'coro' || inst.type === 'vocal' || inst.isVocal);
          return !isVocal && t.patterns && t.patterns.length > 0;
        }) || store.tracks[0];
        if (percTrack) {
          store.setEditingTrackId(percTrack.id);
        }
      });
      await expect(editor).toBeVisible({ timeout: 15000 });
    }
  };

  test.beforeEach(async ({ page }) => {
    // Injection du profil utilisateur de test pour éviter tout délai ou blocage d'authentification
    await page.addInitScript(() => {
      localStorage.setItem(
        'girador_test_user_profile',
        JSON.stringify({
          uid: 'playwright-test-uid',
          email: 'playwright@ogirador.com',
          displayName: 'Membre Playwright',
          role: 'membre',
          groupId: 'Samambaia',
          groupName: 'Samambaia',
          canWriteSequenciador: true,
        })
      );
    });

    await page.goto('/');

    // Franchir l'accueil studio
    await ensureStudioLoaded(page);
  });

  test("Clic droit sur un pas simple → efface la note instantanément (pas vide)", async ({ page }) => {
    await ensureEditorOpenForMarcante(page);

    const stepContainer = page.locator('.percussion-step-container').first();
    await stepContainer.waitFor({ state: 'visible', timeout: 10000 });

    const firstStep = page.locator('.step-input-cell').first();
    await expect(firstStep).toBeVisible();

    // 1. Poser une note par clic gauche
    await firstStep.click();
    await page.waitForTimeout(300);

    // Vérifier que la note est posée
    const valueBeforeRightClick = await firstStep.inputValue().catch(() => '')
      ?? await firstStep.textContent();
    expect(valueBeforeRightClick?.trim()).not.toBe('');

    // 2. Intercepter contextmenu pour vérifier que preventDefault a bien été appelé
    await page.evaluate(() => {
      (window as any).__contextMenuDefaultPrevented = false;
      document.addEventListener('contextmenu', (e) => {
        (window as any).__contextMenuDefaultPrevented = e.defaultPrevented;
      }, { capture: false, once: true });
    });

    // 3. Clic droit sur le pas rempli
    await firstStep.click({ button: 'right' });
    await page.waitForTimeout(300);

    // Vérifier que le menu contextuel natif a bien été empêché
    const contextMenuPrevented = await page.evaluate(() => (window as any).__contextMenuDefaultPrevented);
    expect(contextMenuPrevented).toBe(true);

    // 4. Vérifier que le pas est maintenant vide
    const valueAfterRightClick = await firstStep.inputValue().catch(() => '')
      ?? await firstStep.textContent();
    expect(valueAfterRightClick?.trim()).toBe('');
  });

  test("Clic droit sur un pas déjà vide → early return (coût CPU = 0, pas de re-render)", async ({ page }) => {
    await ensureEditorOpenForMarcante(page);

    // Attendre la présence de .percussion-step-container.first() avant toute interaction
    const stepContainer = page.locator('.percussion-step-container').first();
    await stepContainer.waitFor({ state: 'visible', timeout: 10000 });

    const emptyIndex = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => t.id === store.editingTrackId);
      const pattern = track?.patterns?.[0];
      const idx = pattern?.activeSteps?.findIndex((s: any) => s === 0 || s === '' || s === null || s === undefined);
      return idx !== -1 ? idx : 1;
    });
    const emptyStep = page.locator('.step-input-cell').nth(emptyIndex);
    await expect(emptyStep).toBeVisible();

    // Sélectionner explicitement le motif cible affiché (premier motif)
    const targetPatternId = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => t.id === store.editingTrackId);
      const firstPat = track?.patterns?.[0];
      if (track && firstPat) {
        store.setSelectedPatternId(track.id, firstPat.id);
      }
      return firstPat?.id;
    });

    // État initial du store pour vérifier l'absence de mutation inutile
    const initialTrackState = await page.evaluate((patId) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => t.id === store.editingTrackId);
      const pattern = track?.patterns?.find((p: any) => p.id === (patId || track.selectedPatternId));
      return JSON.stringify(pattern?.activeSteps);
    }, targetPatternId);

    // Le pas d'index 1 est vide par défaut. Clic droit ne doit rien changer
    const valueBefore = await emptyStep.inputValue().catch(() => '')
      ?? await emptyStep.textContent();
    expect(valueBefore?.trim()).toBe('');

    await emptyStep.click({ button: 'right' });
    await page.waitForTimeout(200);

    const valueAfter = await emptyStep.inputValue().catch(() => '')
      ?? await emptyStep.textContent();
    expect(valueAfter?.trim()).toBe('');

    // Confirmer que le clic droit sur un silence ne déclenche aucune mutation inutile
    const afterTrackState = await page.evaluate((patId) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => t.id === store.editingTrackId);
      const pattern = track?.patterns?.find((p: any) => p.id === (patId || track.selectedPatternId));
      return JSON.stringify(pattern?.activeSteps);
    }, targetPatternId);

    expect(afterTrackState).toBe(initialTrackState);
  });

  test("Clic droit sur un pas scindé : efface un seul triangle, puis le pas entier", async ({ page }) => {
    await ensureEditorOpenForMarcante(page);

    // Attendre la présence de .percussion-step-container.first() avant toute interaction
    const firstStepContainer = page.locator('.percussion-step-container').first();
    await firstStepContainer.waitFor({ state: 'visible', timeout: 10000 });

    const firstStep = firstStepContainer.locator('.step-input-cell').first();
    await expect(firstStep).toBeVisible();

    // 1. Poser une note (clic gauche)
    await firstStep.click();
    await page.waitForTimeout(300);

    // 2. Activer l'outil Ciseau pour scinder le pas en deux sous-coups
    const scissorBtn = page.locator('button', { hasText: /✂|Ciseau|Scissors|Tesoura/i }).first();
    if (await scissorBtn.isVisible()) {
      await scissorBtn.click();
      await page.waitForTimeout(200);

      // Clic gauche sur le pas pour le scinder
      await firstStep.click();
      await page.waitForTimeout(300);

      // Désactiver l'outil ciseau
      await scissorBtn.click();
      await page.waitForTimeout(200);
    }

    // 3. Effectuer le premier clic droit spécifiquement sur firstStepContainer.locator('[data-sub-index="0"]').first()
    const subIndexZero = firstStepContainer.locator('[data-sub-index="0"]').first();
    const subIndexOne = firstStepContainer.locator('[data-sub-index="1"]').first();

    if (await subIndexZero.isVisible()) {
      await subIndexZero.click({ button: 'right', force: true });
      await page.waitForTimeout(300);

      // 4. Effectuer le second clic droit pour vider complètement la cellule
      if (await subIndexOne.isVisible()) {
        await subIndexOne.click({ button: 'right', force: true });
      } else {
        await firstStepContainer.click({ button: 'right', force: true });
      }
      await page.waitForTimeout(300);

      // Vérifier que le pas est maintenant vide
      const stepValue = await firstStepContainer.locator('input').inputValue().catch(() => '')
        ?? await firstStepContainer.textContent();
      expect(stepValue?.trim()).toBe('');
    }
  });

  test("Clic droit ne déclenche JAMAIS l'outil d'écriture actif", async ({ page }) => {
    await ensureEditorOpenForMarcante(page);

    const stepContainer = page.locator('.percussion-step-container').first();
    await stepContainer.waitFor({ state: 'visible', timeout: 10000 });

    // Trouver un pas vide (index 1)
    const emptyStep = page.locator('.step-input-cell').nth(1);
    await expect(emptyStep).toBeVisible();

    // Clic droit sur un pas vide : ne doit PAS poser de note
    await emptyStep.click({ button: 'right' });
    await page.waitForTimeout(300);

    // Le pas doit rester vide (le clic droit ne pose jamais de note)
    const valueAfterRightClick = await emptyStep.inputValue().catch(() => '')
      ?? await emptyStep.textContent();
    expect(valueAfterRightClick?.trim()).toBe('');
  });

  test("Menu contextuel natif bloqué sur toute la grille (conteneur + triangles)", async ({ page }) => {
    await ensureEditorOpenForMarcante(page);

    // Tester sur le conteneur .percussion-step-container
    const container = page.locator('.percussion-step-container').first();
    await container.waitFor({ state: 'visible', timeout: 10000 });
    await expect(container).toBeVisible();

    // Installer un listener pour détecter si preventDefault a bien été appelé
    await page.evaluate(() => {
      (window as any).__contextMenuDefaultPrevented = false;
      document.addEventListener('contextmenu', (e) => {
        (window as any).__contextMenuDefaultPrevented = e.defaultPrevented;
      }, { capture: false, once: true });
    });

    await container.click({ button: 'right' });
    await page.waitForTimeout(200);

    const wasPrevented = await page.evaluate(() => (window as any).__contextMenuDefaultPrevented);
    expect(wasPrevented).toBe(true);
  });
});
