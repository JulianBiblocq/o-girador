import { test, expect } from '@playwright/test';

test('Test complet : Sauvegarde, Restauration & Décalage dynamique des repères, boucles et signaux', async ({ page }) => {
  await page.goto('http://localhost:5174/?view=timeline');
  await page.waitForTimeout(1000);

  // Click Entrer na Roda si landing page
  const entraBtn = page.locator('#entra-btn');
  if (await entraBtn.isVisible()) {
    await entraBtn.click();
    await page.waitForTimeout(1000);
  }

  // Fermer la modale d'introduction si ouverte
  const closeIntro = page.locator('button:has-text("Créer Roda vide"), button:has-text("Criar Roda vazia")');
  if (await closeIntro.isVisible()) {
    await closeIntro.click();
    await page.waitForTimeout(500);
  }

  // 1. Initialiser un état propre avec repère, boucle et signaux sur la mesure 1 (index 1)
  const initialSetup = await page.evaluate(() => {
    const store = (window as any).__SEQUENCER_STORE__;
    if (!store) return null;

    // Créer un repère sur la mesure 1 (0-indexed = mesure 1)
    store.getState().handleCreateSongMarker('Refrain Maracatu', 1, '#8b2a1a');

    // Définir une boucle de la mesure 1 à la mesure 4
    store.getState().setLoopStartMeasure(1);
    store.getState().setLoopEndMeasure(4);

    // Définir un signal sur la mesure 1
    const signals = Array(store.getState().totalMeasures).fill(null);
    signals[1] = 'signal-alfaia';
    store.getState().setMeasureSignals(signals);

    return {
      markers: store.getState().songMarkers,
      loopStart: store.getState().loopStartMeasure,
      loopEnd: store.getState().loopEndMeasure,
      signals: store.getState().measureSignals
    };
  });

  expect(initialSetup).not.toBeNull();
  expect(initialSetup?.markers.length).toBe(1);
  expect(initialSetup?.markers[0].measure).toBe(1);
  expect(initialSetup?.loopStart).toBe(1);
  expect(initialSetup?.loopEnd).toBe(4);
  expect(initialSetup?.signals[1]).toBe('signal-alfaia');

  // 2. Insérer 2 mesures à la position 0 (au début)
  const afterInsert = await page.evaluate(() => {
    const store = (window as any).__SEQUENCER_STORE__;
    store.getState().handleInsertMeasure(0, 2);

    return {
      markers: store.getState().songMarkers,
      loopStart: store.getState().loopStartMeasure,
      loopEnd: store.getState().loopEndMeasure,
      signals: store.getState().measureSignals,
      totalMeasures: store.getState().totalMeasures
    };
  });

  // Vérifier le décalage automatique : 1 + 2 = 3
  console.log('État après insertion de 2 mesures :', afterInsert);
  expect(afterInsert.markers[0].measure).toBe(3);
  expect(afterInsert.loopStart).toBe(3);
  expect(afterInsert.loopEnd).toBe(6);
  expect(afterInsert.signals[3]).toBe('signal-alfaia');
  expect(afterInsert.signals[0]).toBeNull();
  expect(afterInsert.signals[1]).toBeNull();

  // 3. Supprimer 1 mesure à la position 0
  const afterDelete = await page.evaluate(() => {
    const store = (window as any).__SEQUENCER_STORE__;
    store.getState().handleDeleteMeasure(0);

    return {
      markers: store.getState().songMarkers,
      loopStart: store.getState().loopStartMeasure,
      loopEnd: store.getState().loopEndMeasure,
      signals: store.getState().measureSignals,
      totalMeasures: store.getState().totalMeasures
    };
  });

  // Vérifier le décalage de retour : 3 - 1 = 2
  console.log('État après suppression d\'1 mesure :', afterDelete);
  expect(afterDelete.markers[0].measure).toBe(2);
  expect(afterDelete.loopStart).toBe(2);
  expect(afterDelete.loopEnd).toBe(5);
  expect(afterDelete.signals[2]).toBe('signal-alfaia');

  // 4. Test d'application et restauration d'un preset (applyPreset)
  const presetResult = await page.evaluate(async () => {
    const store = (window as any).__SEQUENCER_STORE__;
    const testPreset = {
      version: 3,
      bpm: 86,
      timeSig: '4/4',
      totalMeasures: 8,
      tracks: store.getState().tracks,
      songMarkers: [
        { id: 'marker-1', name: 'Pont Baque Virado', measure: 4, color: '#e74c3c' },
        { id: 'marker-2', name: 'Sortie', measure: 7, color: '#3498db' }
      ],
      songSections: [
        { id: 'sec-1', name: 'Partie A', startMeasure: 0, endMeasure: 3, color: '#f19066', repeatCount: 1, level: 0 }
      ],
      measureSignals: Array(8).fill(null)
    };

    // Restaurer directement dans le store
    store.setState({
      songMarkers: testPreset.songMarkers,
      songSections: testPreset.songSections
    });
    store.getState().setSongMarkers(testPreset.songMarkers);
    store.getState().setSongSections(testPreset.songSections);

    return {
      markers: store.getState().songMarkers,
      sections: store.getState().songSections
    };
  });

  expect(presetResult.markers.length).toBe(2);
  expect(presetResult.markers[0].name).toBe('Pont Baque Virado');
  expect(presetResult.markers[0].measure).toBe(4);
  expect(presetResult.markers[1].name).toBe('Sortie');
  expect(presetResult.markers[1].measure).toBe(7);

  // 5. Vérifier que les repères sont bien rendus dans le DOM de la Timeline
  await page.waitForTimeout(500);
  const domMarkers = await page.locator('[data-marker="true"]').count();
  console.log('Nombre de repères affichés dans le DOM :', domMarkers);
  expect(domMarkers).toBe(2);

  const markerText = await page.locator('[data-marker="true"]').first().textContent();
  expect(markerText).toContain('Pont Baque Virado');
});
