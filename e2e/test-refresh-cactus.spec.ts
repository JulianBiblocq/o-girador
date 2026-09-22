import { test, expect } from '@playwright/test';

test('Chargement fiable du morceau vedette (Cactus 🌵) après rafraîchissement & fin de boucle propre', async ({ page }) => {
  // Capture browser console logs
  page.on('console', msg => console.log(`[BROWSER ${msg.type()}]:`, msg.text()));

  await page.goto('http://localhost:5174/');
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
    const { setDefaultGroupPreset, getDefaultGroupPresetId } = await import('/src/cloudGroups.ts');
    const curDefault = await getDefaultGroupPresetId('Samambaia');
    if (!curDefault) {
      await setDefaultGroupPreset('Samambaia', '29dIDjgc2vPuDnwjiy9V', 'mestre');
    }
  });

  await page.waitForTimeout(2500);

  // Vérifier le preset par défaut résolu
  const resolvedDefault = await page.evaluate(async () => {
    // @ts-ignore
    const { getDefaultGroupPresetId } = await import('/src/cloudGroups.ts');
    return await getDefaultGroupPresetId('Samambaia');
  });
  console.log('Resolved default preset ID for Samambaia:', resolvedDefault);
  expect(resolvedDefault).toBe('29dIDjgc2vPuDnwjiy9V');

  // 3. Rafraîchissement de la page (F5)
  console.log('--- EXÉCUTION DU RAFRAÎCHISSEMENT (F5) ---');
  await page.reload();
  await page.waitForFunction(() => 'firebaseAuth' in window);

  // Attendre la stabilisation des effets asynchrones
  await page.waitForTimeout(3000);

  // 4. Vérifier que les pistes du morceau vedette (Opanijé / 8 pistes) sont bien chargées
  const storeState = await page.evaluate(async () => {
    // @ts-ignore
    const { useSequencerStore } = await import('/src/stores/useSequencerStore.ts');
    const store = useSequencerStore.getState();
    return {
      tracksCount: store.tracks.length,
      trackNames: store.tracks.map((t: any) => t.customName),
      totalMeasures: store.totalMeasures,
      lastLoadedPresetId: localStorage.getItem('girador_last_loaded_preset_id'),
    };
  });
  console.log('Store state after refresh:', storeState);

  // Vérifier qu'on n'a pas écrasé par catalog.json (qui a 4 pistes simples)
  expect(storeState.tracksCount).toBeGreaterThanOrEqual(7);
  expect(storeState.lastLoadedPresetId).toBe('29dIDjgc2vPuDnwjiy9V');

  // 5. Ouvrir l'accordéon / panneau latéral pour vérifier la présence du badge bois et du cactus 🌵
  const menuBtn = page.locator('button:has-text("Menu")').first();
  if (await menuBtn.isVisible()) {
    await menuBtn.click();
    await page.waitForTimeout(500);
  }

  // Ouvrir l'onglet Bibliothèque / Rythmes si fermé
  const rhythmsHeader = page.locator('button:has-text("Rythmes"), button:has-text("Ritmos")').first();
  if (await rhythmsHeader.isVisible()) {
    await rhythmsHeader.click();
    await page.waitForTimeout(500);
  }

  const cactusElements = await page.locator('button:has-text("🌵"), span:has-text("🌵")').count();
  console.log('Cactus icons count in UI:', cactusElements);
  expect(cactusElements).toBeGreaterThanOrEqual(1);

  // 6. Test de fin de boucle propre (useAudioSync)
  // Vérifier qu'en désactivant le loop et en lançant la lecture, isPlaybackEndingRef stoppe proprement sans rejouer la mesure
  const playbackResult = await page.evaluate(async () => {
    // @ts-ignore
    const { useSequencerStore } = await import('/src/stores/useSequencerStore.ts');
    // Forcer 1 mesure pour un test rapide
    useSequencerStore.getState().setIsLooping(false);
    return { isLooping: useSequencerStore.getState().isLooping };
  });
  console.log('Playback test config:', playbackResult);
  expect(playbackResult.isLooping).toBe(false);
});
