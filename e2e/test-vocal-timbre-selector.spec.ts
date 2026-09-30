/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, expect } from '@playwright/test';

test.describe("Sélecteur de timbre vocal dans l'Inspecteur acoustique", () => {
  test.beforeEach(async ({ page }) => {
    // Large desktop viewport to ensure lg:flex on StrokeInspectorPanel is active
    await page.setViewportSize({ width: 1280, height: 850 });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('[BROWSER ERROR]:', msg.text());
      }
    });
    page.on('pageerror', (err) => {
      console.error('[PAGE ERROR]:', err);
    });

    await page.goto('/');

    // Entrer dans le studio si nous sommes sur la landing page
    const entraBtn = page.locator('#entra-btn');
    if (await entraBtn.isVisible()) {
      await entraBtn.click();
    }

    // Attendre le chargement initial du store global
    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 15000 });
  });

  test("Affiche le sélecteur de timbre pour Puxador et permet de commuter les 5 presets en direct", async ({ page }) => {
    // 1. S'assurer qu'une piste vocale (Puxador ou Coro) existe et ouvrir son inspecteur
    const voiceTrackId = await page.evaluate(async () => {
      const { instrumentsConfig } = await import('/src/data.ts');
      const store = (window as any).__SEQUENCER_STORE__.getState();
      
      let track = store.tracks.find((t: any) => {
        const inst = instrumentsConfig[t.instrumentIdx];
        return inst && (inst.type === 'voice' || inst.id === 'puxador' || inst.id === 'coro');
      });

      if (!track) {
        const puxadorIdx = instrumentsConfig.findIndex(i => i.id === 'puxador');
        const newTrack: any = {
          id: 999123,
          instrumentIdx: puxadorIdx !== -1 ? puxadorIdx : 10,
          patterns: [
            {
              id: 991,
              name: 'Puxador 1',
              steps: 16,
              activeSteps: Array(16).fill(0),
              measureAssignments: [true],
            }
          ],
          isMute: false,
          isSolo: false,
          isHidden: false,
          volumeVal: 100,
          selectedPatternId: 991,
          reverbVal: 0,
          panVal: 0,
          pan: 0,
          tuning: 0,
          fxSends: { reverb: 0, distortion: 0 }
        };
        (window as any).__SEQUENCER_STORE__.getState().setTracks([...store.tracks, newTrack]);
        track = newTrack;
      }

      // Ouvrir l'éditeur d'instrument sur la piste vocale
      (window as any).__SEQUENCER_STORE__.getState().setEditingTrackId(track.id);
      return track.id;
    });

    expect(voiceTrackId).not.toBeNull();

    // 2. Vérifier l'affichage du sélecteur de timbre dans l'Inspecteur Acoustique
    const timbreSelector = page.locator('[data-testid="vocal-timbre-selector"]').first();
    await expect(timbreSelector).toBeVisible({ timeout: 10000 });

    const timbreSelect = page.locator('[data-testid="vocal-timbre-select"]').first();
    await expect(timbreSelect).toBeVisible();

    // Vérifier la présence des 5 presets
    const options = timbreSelect.locator('option');
    await expect(options).toHaveCount(5);

    // 3. Tester chaque preset et vérifier la mise à jour immédiate du store et du moteur audio
    const presetsToTest = ['rhodes', 'pifano', 'organ', 'pluck', 'guide'] as const;

    for (const preset of presetsToTest) {
      await timbreSelect.selectOption(preset);

      // Vérifier le store useAudioStore via window.__AUDIO_STORE__
      const currentStorePreset = await page.evaluate(() => {
        return (window as any).__AUDIO_STORE__?.getState().vocalPreset;
      });
      expect(currentStorePreset).toBe(preset);

      // Déclencher le bouton de pré-écoute test direct (qui initialise Tone et joue la note)
      const previewBtn = page.locator('[data-testid="vocal-timbre-preview-btn"]').first();
      await previewBtn.click();
      await page.waitForTimeout(100);

      // Vérifier la synchronisation avec audioEngine si instancié
      const currentEnginePreset = await page.evaluate(() => {
        const engine = (window as any).__AUDIO_ENGINE__;
        return engine ? engine.currentVocalPreset : (window as any).__AUDIO_STORE__?.getState().vocalPreset;
      });
      expect(currentEnginePreset).toBe(preset);
    }

    // 4. Basculer sur un fût percussif (ex: Marcante) et vérifier que le sélecteur vocal disparaît
    await page.evaluate(async () => {
      const { instrumentsConfig } = await import('/src/data.ts');
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const drumTrack = store.tracks.find((t: any) => {
        const inst = instrumentsConfig[t.instrumentIdx];
        return inst && inst.type === 'hands';
      });
      if (drumTrack) {
        store.setEditingTrackId(drumTrack.id);
      }
    });

    // Le sélecteur de timbre vocal ne doit plus être visible sur un instrument de percussion
    await expect(timbreSelector).not.toBeVisible();
  });
});
