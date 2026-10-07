import { test, expect } from '@playwright/test';
import { ensureStudioLoaded } from './helpers/navigation';

test('Chargement fiable du morceau vedette (Cactus 🌵) après rafraîchissement & fin de boucle propre', async ({ page }) => {
  test.setTimeout(45000);

  // Capture browser console logs and unhandled page errors
  const unhandledErrors: string[] = [];
  page.on('pageerror', err => unhandledErrors.push(err.message));
  page.on('console', msg => console.log(`[BROWSER ${msg.type()}]:`, msg.text()));

  await page.goto('http://localhost:5174/');
  await ensureStudioLoaded(page);

  await page.waitForFunction(() => 'firebaseAuth' in window);

  // 1. Authentifier l'utilisateur de test (Mestre de Samambaia)
  await page.evaluate(async () => {
    // @ts-ignore
    const auth = window.firebaseAuth;
    // @ts-ignore
    const signIn = window.signInWithEmailAndPassword;
    await signIn(auth, 'playwright@ogirador.com', 'playwrighttest');
  });

  // 2. Synchroniser le miroir Firestore pour Samambaia si besoin
  await page.evaluate(async () => {
    // @ts-ignore
    const { setDefaultGroupPreset, getDefaultGroupPresetId } = await import('../src/cloudGroups.ts');
    const curDefault = await getDefaultGroupPresetId('Samambaia');
    if (!curDefault) {
      await setDefaultGroupPreset('Samambaia', '29dIDjgc2vPuDnwjiy9V', 'mestre');
    }
  });

  await page.waitForTimeout(2000);

  // Vérifier le preset par défaut résolu
  const resolvedDefault = await page.evaluate(async () => {
    // @ts-ignore
    const { getDefaultGroupPresetId } = await import('../src/cloudGroups.ts');
    return await getDefaultGroupPresetId('Samambaia');
  });
  console.log('Resolved default preset ID for Samambaia:', resolvedDefault);
  expect(resolvedDefault).toBe('29dIDjgc2vPuDnwjiy9V');

  // 3. Rafraîchissement de la page (F5) et cycle post-reload
  console.log('--- EXÉCUTION DU RAFRAÎCHISSEMENT (F5) ---');
  await page.reload();
  await page.waitForFunction(() => 'firebaseAuth' in window);
  await ensureStudioLoaded(page);

  // 4. Hydratation du preset vedette : attendre les pistes et le titre/id du preset Cactus
  await page.waitForFunction(() => {
    const s = (window as any).useSequencerStore?.getState?.() || (window as any).__SEQUENCER_STORE__?.getState?.();
    const name = s?.metadata?.toada || s?.activePresetName || '';
    const preset = s?.preset || '';
    return Boolean(
      s && s.tracks && s.tracks.length >= 7 && (
        name.toLowerCase().includes('opanij') ||
        name.toLowerCase().includes('cactus') ||
        preset.includes('29dIDjgc2vPuDnwjiy9V')
      )
    );
  }, { timeout: 15000 });

  const storeState = await page.evaluate(() => {
    const store = (window as any).useSequencerStore?.getState?.() || (window as any).__SEQUENCER_STORE__?.getState?.();
    return {
      tracksCount: store.tracks.length,
      trackNames: store.tracks.map((t: any) => t.customName),
      totalMeasures: store.totalMeasures,
      lastLoadedPresetId: localStorage.getItem('girador_last_loaded_preset_id'),
    };
  });
  console.log('Store state after refresh:', storeState);
  expect(storeState.tracksCount).toBeGreaterThanOrEqual(7);

  // 5. Ouvrir le menu pour vérifier la présence de l'indicateur Cactus
  const menuBtn = page.locator('button:has-text("Menu")').first();
  if (await menuBtn.isVisible()) {
    await menuBtn.click();
    await page.waitForTimeout(500);
  }

  // Si l'accordéon Samambaia est fermé (flèche ▶), on l'ouvre
  const closedAccordionBtn = page.locator('button:has-text("Catálogo"):has-text("▶")').first();
  if (await closedAccordionBtn.isVisible().catch(() => false)) {
    await closedAccordionBtn.click();
    await page.waitForTimeout(500);
  }

  // Cibler le cactus par data-testid, classe Cordel font-cactus-star, émoji ou titre sémantique
  const cactusLocator = page.locator('[data-testid="cactus-default-preset"], .font-cactus-star, button:has-text("🌵"), span:has-text("🌵"), [title*="referência"], [title*="Morceau de travail"]');
  await expect(cactusLocator.first()).toBeVisible({ timeout: 10000 });
  const cactusElements = await cactusLocator.count();
  console.log('Cactus icons count in UI:', cactusElements);
  expect(cactusElements).toBeGreaterThanOrEqual(1);

  // Refermer le menu pour libérer la barre de transport
  if (await menuBtn.isVisible()) {
    await menuBtn.click();
    await page.waitForTimeout(300);
  }

  // 6. Test de fin de boucle propre (useAudioSync)
  // Désactiver le loop, régler sur 1 mesure courte à 240 BPM, désactiver pre-roll, lancer la lecture
  await page.evaluate(() => {
    const store = (window as any).useSequencerStore?.getState?.() || (window as any).__SEQUENCER_STORE__?.getState?.();
    if (store) {
      store.handleClearLoop?.();
      store.setIsLoopRegionActive?.(false);
      store.setIsLooping?.(false);
      store.handleTotalMeasuresChange?.(1);
      if (typeof store.setTempo === 'function') {
        store.setTempo(240);
      } else if (typeof store.setBpm === 'function') {
        store.setBpm(240);
      }
      store.setMeasureBpms?.([240]);
    }
    const transport = (window as any).__TRANSPORT_STORE__?.getState?.();
    if (transport) {
      transport.setPreRollSettings?.({ enabled: false });
    }
  });

  const playButton = page.locator('[data-testid="transport-play-btn"]');
  await expect(playButton).toBeVisible({ timeout: 5000 });
  await expect(playButton).toBeEnabled({ timeout: 10000 });
  await playButton.click();

  // Attendre le démarrage effectif de la lecture
  await page.waitForFunction(() => {
    const store = (window as any).useSequencerStore?.getState?.() || (window as any).__SEQUENCER_STORE__?.getState?.();
    const isPlaying = store?.isPlaying === true || (window as any).__IS_PLAYING__ === true;
    const square = Boolean(document.querySelector('[data-testid="transport-play-btn"] svg.lucide-square'));
    return isPlaying || square;
  }, { timeout: 10000 });

  // Attendre la fin de séquence et l'arrêt propre
  await page.waitForFunction(() => {
    const store = (window as any).useSequencerStore?.getState?.() || (window as any).__SEQUENCER_STORE__?.getState?.();
    const isStopped = store?.isPlaying === false && (window as any).__IS_PLAYING__ !== true;
    const playIcon = Boolean(document.querySelector('[data-testid="transport-play-btn"] svg.lucide-play'));
    return isStopped || playIcon;
  }, { timeout: 15000 });

  // Vérifier le retour de l'icône Play
  await expect(page.locator('[data-testid="transport-play-btn"] svg.lucide-play')).toBeVisible({ timeout: 5000 });

  // Aucune exception non gérée ne doit s'être produite
  expect(unhandledErrors).toEqual([]);
});
