/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, expect } from '@playwright/test';
import { ensureStudioLoaded } from './helpers/navigation';

test.describe('Double-clic et double-tap de réinitialisation sur la console de mixage', () => {
  test('Réinitialisation instantanée du Pan, des EQ, des départs FX et des Faders', async ({ page }) => {
    // 1. Navigation directe vers la console de mixage
    await page.goto('/?view=console');
    await page.waitForTimeout(1000);

    await ensureStudioLoaded(page);

    // Basculer sur la vue console si nécessaire
    const consoleBtn = page.locator('button', { hasText: /MIXEUR|MIXADOR/i }).first();
    if (await consoleBtn.isVisible()) {
      await consoleBtn.click();
    }

    // Déverrouiller l'audio
    await page.evaluate(async () => {
      const { useAudioStore } = await import('../src/stores/useAudioStore.ts');
      useAudioStore.getState().unlockAudio();

      const { getTone } = await import('../src/ToneLoader.ts');
      const Tone = getTone();
      if (Tone.context.state !== 'running') {
        await Tone.start();
      }
    });

    await page.waitForTimeout(1000);

    // Attendre que des tranches soient présentes
    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 15000 });

    // Prendre la première piste active
    const firstTrackId = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      return store.tracks[0]?.id;
    });

    expect(firstTrackId).toBeDefined();

    // ==========================================
    // 1. TEST RÉINITIALISATION DU PANORAMIQUE (Pan -> 0)
    // ==========================================
    // Déplacer le pan à 50
    await page.evaluate((id) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.handleTrackPanChange(id, 50);
    }, firstTrackId);

    await page.waitForTimeout(200);
    let panVal = await page.evaluate((id) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => t.id === id);
      return track?.panVal ?? track?.pan;
    }, firstTrackId);
    expect(panVal).toBe(50);

    // Cibler le potentiomètre Pan de la première tranche et double-cliquer
    const panDial = page.locator(`[title*="Pan:"]`).first();
    await expect(panDial).toBeVisible({ timeout: 5000 });
    await panDial.dblclick();

    await page.waitForTimeout(300);
    panVal = await page.evaluate((id) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => t.id === id);
      return track?.panVal ?? track?.pan;
    }, firstTrackId);
    expect(panVal).toBe(0);

    // ==========================================
    // 2. TEST CARTOUCHE dB (Affichage initial, Édition manuelle, Virgule française & Double-clic)
    // ==========================================
    // Mettre le fader de la première piste à 40
    await page.evaluate((id) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.handleTrackVolumeChange(id, 40);
    }, firstTrackId);

    await page.waitForTimeout(200);
    let volVal = await page.evaluate((id) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => t.id === id);
      return track?.volumeVal;
    }, firstTrackId);
    expect(volVal).toBe(40);

    // Vérifier l'affichage textuel initial garanti de la cartouche (pas de cartouche blanche/vide)
    const dbCartouche = page.locator('[title*="réinitialiser à 0.0 dB"]').first();
    await expect(dbCartouche).toBeVisible({ timeout: 5000 });
    const initialText = await dbCartouche.innerText();
    expect(initialText.trim()).not.toBe('');
    expect(initialText).toContain('dB');

    // Double-cliquer sur le cartouche numérique dB situé sous le fader pour réinitialiser
    await dbCartouche.dblclick();

    await page.waitForTimeout(300);
    volVal = await page.evaluate((id) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => t.id === id);
      return track?.volumeVal;
    }, firstTrackId);
    expect(volVal).toBe(75);

    // Test de l'édition manuelle avec virgule française : clic simple, saisie "-3,5" + Entrée
    await dbCartouche.click();
    const cartoucheInput = dbCartouche.locator('input');
    await expect(cartoucheInput).toBeVisible({ timeout: 2000 });
    await cartoucheInput.fill('-3,5');
    await cartoucheInput.press('Enter');
    await page.waitForTimeout(300);

    // Vérifier que le fader s'est calé à -3.5 dB (position fader = 66)
    volVal = await page.evaluate((id) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => t.id === id);
      return track?.volumeVal;
    }, firstTrackId);
    expect(volVal).toBe(66);

    // Test de la saisie "+3"
    await dbCartouche.click();
    await expect(cartoucheInput).toBeVisible({ timeout: 2000 });
    await cartoucheInput.fill('+3');
    await cartoucheInput.press('Enter');
    await page.waitForTimeout(300);

    volVal = await page.evaluate((id) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => t.id === id);
      return track?.volumeVal;
    }, firstTrackId);
    expect(volVal).toBeGreaterThan(80);

    // Test de la saisie "-inf"
    await dbCartouche.click();
    await expect(cartoucheInput).toBeVisible({ timeout: 2000 });
    await cartoucheInput.fill('-inf');
    await cartoucheInput.press('Enter');
    await page.waitForTimeout(300);

    volVal = await page.evaluate((id) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => t.id === id);
      return track?.volumeVal;
    }, firstTrackId);
    expect(volVal).toBe(0);

    // Test d'annulation avec Échap
    await dbCartouche.click();
    await expect(cartoucheInput).toBeVisible({ timeout: 2000 });
    await cartoucheInput.fill('-12');
    await cartoucheInput.press('Escape');
    await page.waitForTimeout(300);
    // Le mode édition est fermé et la valeur est restée à 0
    await expect(cartoucheInput).not.toBeVisible();
    volVal = await page.evaluate((id) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => t.id === id);
      return track?.volumeVal;
    }, firstTrackId);
    expect(volVal).toBe(0);

    // Test du double-clic sur l'input directement pour réinitialiser à 75 (0.0 dB)
    await dbCartouche.click();
    await expect(cartoucheInput).toBeVisible({ timeout: 2000 });
    await cartoucheInput.dblclick();
    await page.waitForTimeout(300);
    await expect(cartoucheInput).not.toBeVisible();
    volVal = await page.evaluate((id) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => t.id === id);
      return track?.volumeVal;
    }, firstTrackId);
    expect(volVal).toBe(75);

    // ==========================================
    // 3. TEST RÉINITIALISATION DES DÉPARTS D'EFFETS (Rev -> 0 %)
    // ==========================================
    // Mettre l'envoi de réverbe à 60%
    await page.evaluate((id) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.setTrackFxSend(id, 'reverb', 60);
    }, firstTrackId);

    await page.waitForTimeout(200);
    let revVal = await page.evaluate((id) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => t.id === id);
      return track?.fxSends?.reverb ?? track?.reverbVal;
    }, firstTrackId);
    expect(revVal).toBe(60);

    // Double-cliquer sur la barre de fader horizontal Rev
    const revFader = page.locator('.digital-fader', { hasText: 'REV' }).first();
    await expect(revFader).toBeVisible({ timeout: 5000 });
    await revFader.dblclick();

    await page.waitForTimeout(300);
    revVal = await page.evaluate((id) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => t.id === id);
      return track?.fxSends?.reverb ?? track?.reverbVal;
    }, firstTrackId);
    expect(revVal).toBe(0);

    // ==========================================
    // 4. TEST RÉINITIALISATION D'UNE BANDE D'EQ (HG -> 0.0 dB)
    // ==========================================
    // Mettre le gain High de la première piste à 8 dB
    await page.evaluate((id) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.handleTrackEQChange(id, { high: { f: 8000, g: 8 } });
    }, firstTrackId);

    await page.waitForTimeout(200);
    let hgVal = await page.evaluate((id) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => t.id === id);
      return track?.eqBands?.high?.g;
    }, firstTrackId);
    expect(hgVal).toBe(8);

    // Double-cliquer sur le bouton rotatif HG
    const hgKnob = page.locator('div', { hasText: /^HG/ }).first();
    await expect(hgKnob).toBeVisible({ timeout: 5000 });
    await hgKnob.dblclick();

    await page.waitForTimeout(300);
    hgVal = await page.evaluate((id) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => t.id === id);
      return track?.eqBands?.high?.g;
    }, firstTrackId);
    expect(hgVal).toBe(0);
  });
});
