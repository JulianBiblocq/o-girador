/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, expect } from '@playwright/test';
import { ensureStudioLoaded } from './helpers/navigation';

test.describe("Activation et application du Balanço sur Puxador et Coro", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 850 });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('[BROWSER ERROR]:', msg.text());
      }
    });

    await page.goto('/');

    await ensureStudioLoaded(page);

    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 15000 });

    // Laisser le chargement asynchrone des morceaux se stabiliser
    await page.waitForTimeout(2000);
  });

  test("Déverrouillage UI du Balanço sur Puxador et Coro avec indépendance des réglages et ancrage du Temps 1", async ({ page }) => {
    // 1. Initialiser ou repérer les pistes Puxador et Coro
    const { puxTrackId, coroTrackId } = await page.evaluate(async () => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const { instrumentsConfig } = await import('../src/data.ts');

      const pux = store.tracks.find((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador' || String(t.id) === 'puxador');
      const coro = store.tracks.find((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'coro' || String(t.id) === 'coro');

      // Ouvrir l'éditeur sur Puxador
      store.setEditingTrackId(pux.id);

      return { puxTrackId: pux.id, coroTrackId: coro.id };
    });

    // 2. Vérifier que la section Balanço (⚖️) est bien visible dans l'Éditeur Détaillé
    const presetSelect = page.getByTestId('track-balanco-preset-select');
    await expect(presetSelect).toBeVisible({ timeout: 10000 });

    const balancoSlider = page.getByTestId('track-balanco-slider');
    await expect(balancoSlider).toBeVisible();

    // 3. Régler le Balanço de Puxador à 100% sur le preset 'maracatu-trad' (Maracatu Nagô)
    await presetSelect.selectOption('maracatu-trad');
    await balancoSlider.evaluate((el: HTMLInputElement) => {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      nativeSetter ? nativeSetter.call(el, '100') : (el.value = '100');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Vérifier l'affichage du pourcentage
    const amountLabel = page.getByTestId('track-balanco-amount-label');
    await expect(amountLabel).toHaveText('100%');

    // 4. Vérifier dans le store que Puxador a bien enregistré ces valeurs
    const puxStateAfterSetting = await page.evaluate((id) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const t = store.tracks.find((trk: any) => String(trk.id) === String(id));
      return {
        amount: t.balancoAmount,
        presetId: t.balancoPresetId
      };
    }, puxTrackId);

    expect(puxStateAfterSetting.amount).toBe(100);
    expect(puxStateAfterSetting.presetId).toBe('maracatu-trad');

    // 5. Basculer sur l'onglet Coro dans l'en-tête de l'éditeur
    const coroTab = page.locator('button:has-text("Coro")').first();
    await expect(coroTab).toBeVisible();
    await coroTab.click();

    // 6. Régler le Balanço de Coro à 0% sur le preset 'straight' (Binaire droit / Quantisé)
    await presetSelect.selectOption('straight');
    await balancoSlider.evaluate((el: HTMLInputElement) => {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      nativeSetter ? nativeSetter.call(el, '0') : (el.value = '0');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(amountLabel).toHaveText('0%');

    // 7. Vérifier dans le store que Coro est à 0% / straight et que Puxador est TOUJOURS à 100% / maracatu-trad
    const tracksStateAfterCoro = await page.evaluate(({ puxId, coroId }) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const pux = store.tracks.find((trk: any) => String(trk.id) === String(puxId));
      const coro = store.tracks.find((trk: any) => String(trk.id) === String(coroId));
      return {
        puxAmount: pux.balancoAmount,
        puxPreset: pux.balancoPresetId,
        coroAmount: coro.balancoAmount,
        coroPreset: coro.balancoPresetId
      };
    }, { puxId: puxTrackId, coroId: coroTrackId });

    expect(tracksStateAfterCoro.puxAmount).toBe(100);
    expect(tracksStateAfterCoro.puxPreset).toBe('maracatu-trad');
    expect(tracksStateAfterCoro.coroAmount).toBe(0);
    expect(tracksStateAfterCoro.coroPreset).toBe('straight');

    // 8. Validation mathématique de getBalancoOffsetSec pour Puxador et Coro
    const offsetCalculations = await page.evaluate(async ({ puxId, coroId }) => {
      const { getBalancoOffsetSec } = await import('../src/utils/balancoUtils.ts');
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const pux = store.tracks.find((trk: any) => String(trk.id) === String(puxId));
      const coro = store.tracks.find((trk: any) => String(trk.id) === String(coroId));

      const bpm = 120;
      const steps = 16;

      // Puxador (100% Maracatu Nagô)
      const puxStep0 = getBalancoOffsetSec({ stepIdx: 0, steps, bpm, track: pux, globalSwing: null });
      const puxStep1 = getBalancoOffsetSec({ stepIdx: 1, steps, bpm, track: pux, globalSwing: null });
      const puxStep2 = getBalancoOffsetSec({ stepIdx: 2, steps, bpm, track: pux, globalSwing: null });
      const puxStep3 = getBalancoOffsetSec({ stepIdx: 3, steps, bpm, track: pux, globalSwing: null });

      // Coro (0% Binaire droit)
      const coroStep0 = getBalancoOffsetSec({ stepIdx: 0, steps, bpm, track: coro, globalSwing: null });
      const coroStep1 = getBalancoOffsetSec({ stepIdx: 1, steps, bpm, track: coro, globalSwing: null });
      const coroStep2 = getBalancoOffsetSec({ stepIdx: 2, steps, bpm, track: coro, globalSwing: null });
      const coroStep3 = getBalancoOffsetSec({ stepIdx: 3, steps, bpm, track: coro, globalSwing: null });

      return {
        puxOffsets: [puxStep0, puxStep1, puxStep2, puxStep3],
        coroOffsets: [coroStep0, coroStep1, coroStep2, coroStep3]
      };
    }, { puxId: puxTrackId, coroId: coroTrackId });

    // Ancrage strict du pas 0 à 0 sec
    expect(offsetCalculations.puxOffsets[0]).toBe(0);
    expect(offsetCalculations.coroOffsets[0]).toBe(0);

    // Pour Puxador à 100%, les contretemps ont bien un chaloupement (deltaT non nul)
    expect(offsetCalculations.puxOffsets[1]).not.toBe(0);
    expect(offsetCalculations.puxOffsets[2]).not.toBe(0);
    expect(offsetCalculations.puxOffsets[3]).not.toBe(0);

    // Pour Coro à 0%, tous les pas restent rigoureusement alignés sur 0
    expect(offsetCalculations.coroOffsets[1]).toBe(0);
    expect(offsetCalculations.coroOffsets[2]).toBe(0);
    expect(offsetCalculations.coroOffsets[3]).toBe(0);
  });
});
