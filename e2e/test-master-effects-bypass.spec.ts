/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, expect } from '@playwright/test';

test.describe('Trois boutons Power / Bypass individuels sur les effets Master (Compresseur, Réverbe, Distorsion)', () => {
  test('Présence, styles Cordel, réactivité UI et neutralisation audio sans clic', async ({ page }) => {
    // 1. Navigation directe vers la console de mixage
    await page.goto('/?view=console');

    const entraBtn = page.locator('#entra-btn');
    if (await entraBtn.isVisible()) {
      await entraBtn.click();
    }

    // Basculer sur la vue console si le header est affiché
    const consoleBtn = page.locator('button[title="Console"]');
    if (await consoleBtn.isVisible()) {
      await consoleBtn.click();
    }

    // Déverrouiller l'audio
    await page.evaluate(async () => {
      const { useAudioStore } = await import('../src/stores/useAudioStore.ts');
      useAudioStore.getState().unlockAudio();
    });

    // Laisser le chargement asynchrone initial des presets se stabiliser
    await page.waitForTimeout(2000);

    // Attendre la présence des trois boutons Power Master
    const compPowerBtn = page.locator('[data-testid="master-power-compressor"]');
    const revPowerBtn = page.locator('[data-testid="master-power-reverb"]');
    const distoPowerBtn = page.locator('[data-testid="master-power-disto"]');

    await expect(compPowerBtn).toBeVisible({ timeout: 10000 });
    await expect(revPowerBtn).toBeVisible();
    await expect(distoPowerBtn).toBeVisible();

    // 2. Vérification de l'état initial (ON par défaut)
    const initialStoreState = await page.evaluate(async () => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      return store.masterEffectsActive;
    });

    expect(initialStoreState.compressor).toBe(true);
    expect(initialStoreState.reverb).toBe(true);
    expect(initialStoreState.disto).toBe(true);

    // Vérifier les classes de couleur ON Cordel
    await expect(compPowerBtn).toHaveClass(/bg-\[#c88b2a\]/);
    await expect(revPowerBtn).toHaveClass(/bg-\[#2a5c8a\]/);
    await expect(distoPowerBtn).toHaveClass(/bg-\[#c25e1a\]/);

    // 3. Test Bypass DISTORSION
    await distoPowerBtn.click();
    await page.waitForTimeout(250);

    const distoStateAfterClick = await page.evaluate(async () => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const { masterDistortionVolumeNode, distortionNode } = await import('../src/audio/effectsChain.ts');
      return {
        isActive: store.masterEffectsActive.disto,
        gainVal: masterDistortionVolumeNode ? masterDistortionVolumeNode.gain.value : null,
        wetVal: distortionNode && distortionNode.wet ? distortionNode.wet.value : null,
      };
    });

    expect(distoStateAfterClick.isActive).toBe(false);
    expect(distoStateAfterClick.gainVal).toBe(0);
    expect(distoStateAfterClick.wetVal).toBe(0);

    // Style éteint et rack grisé
    await expect(distoPowerBtn).toHaveClass(/bg-\[#ded3be\]/);
    const distoSettingsRack = page.locator('[data-testid="master-disto-settings"]');
    await expect(distoSettingsRack).toHaveClass(/opacity-40/);
    await expect(distoSettingsRack).toHaveClass(/grayscale/);
    await expect(distoSettingsRack).toHaveClass(/pointer-events-none/);

    // Réactiver Distorsion
    await distoPowerBtn.click();
    await page.waitForTimeout(250);
    const distoReactivated = await page.evaluate(() => (window as any).__SEQUENCER_STORE__.getState().masterEffectsActive.disto);
    expect(distoReactivated).toBe(true);
    await expect(distoPowerBtn).toHaveClass(/bg-\[#c25e1a\]/);

    // 4. Test Bypass RÉVERBE
    await revPowerBtn.click();
    await page.waitForTimeout(250);

    const revStateAfterClick = await page.evaluate(async () => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const { masterReverbVolumeNode, reverbNode } = await import('../src/audio/effectsChain.ts');
      return {
        isActive: store.masterEffectsActive.reverb,
        gainVal: masterReverbVolumeNode ? masterReverbVolumeNode.gain.value : null,
        wetVal: reverbNode && (reverbNode as any).wet ? (reverbNode as any).wet.value : null,
      };
    });

    expect(revStateAfterClick.isActive).toBe(false);
    expect(revStateAfterClick.gainVal).toBe(0);

    // Style éteint et rack grisé
    await expect(revPowerBtn).toHaveClass(/bg-\[#ded3be\]/);
    const revSettingsRack = page.locator('[data-testid="master-reverb-settings"]');
    await expect(revSettingsRack).toHaveClass(/opacity-40/);
    await expect(revSettingsRack).toHaveClass(/grayscale/);
    await expect(revSettingsRack).toHaveClass(/pointer-events-none/);

    // Réactiver Réverbe
    await revPowerBtn.click();
    await page.waitForTimeout(250);
    const revReactivated = await page.evaluate(() => (window as any).__SEQUENCER_STORE__.getState().masterEffectsActive.reverb);
    expect(revReactivated).toBe(true);
    await expect(revPowerBtn).toHaveClass(/bg-\[#2a5c8a\]/);

    // 5. Test Bypass COMPRESSEUR
    await compPowerBtn.click();
    await page.waitForTimeout(250);

    const compStateAfterClick = await page.evaluate(async () => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const { masterCompressorNode } = await import('../src/audio/effectsChain.ts');
      return {
        isActive: store.masterEffectsActive.compressor,
        threshold: masterCompressorNode ? masterCompressorNode.threshold.value : null,
        ratio: masterCompressorNode ? masterCompressorNode.ratio.value : null,
      };
    });

    expect(compStateAfterClick.isActive).toBe(false);
    // Neutralité parfaite : threshold = 0 dB et ratio = 1
    expect(compStateAfterClick.threshold).toBeCloseTo(0, 1);
    expect(compStateAfterClick.ratio).toBeCloseTo(1, 1);

    // Style éteint et rack grisé
    await expect(compPowerBtn).toHaveClass(/bg-\[#ded3be\]/);
    const compSettingsRack = page.locator('[data-testid="master-compressor-settings"]');
    await expect(compSettingsRack).toHaveClass(/opacity-40/);
    await expect(compSettingsRack).toHaveClass(/grayscale/);
    await expect(compSettingsRack).toHaveClass(/pointer-events-none/);

    // Réactiver Compresseur
    await compPowerBtn.click();
    await page.waitForTimeout(250);
    const compStateReactivated = await page.evaluate(async () => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const { masterCompressorNode } = await import('../src/audio/effectsChain.ts');
      return {
        isActive: store.masterEffectsActive.compressor,
        threshold: masterCompressorNode ? masterCompressorNode.threshold.value : null,
        ratio: masterCompressorNode ? masterCompressorNode.ratio.value : null,
      };
    });

    expect(compStateReactivated.isActive).toBe(true);
    // Restauration fidèle des paramètres de compression
    expect(compStateReactivated.ratio).toBeGreaterThan(1);
    await expect(compPowerBtn).toHaveClass(/bg-\[#c88b2a\]/);
  });
});
