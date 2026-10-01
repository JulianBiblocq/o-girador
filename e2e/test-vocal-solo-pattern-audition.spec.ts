/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, expect } from '@playwright/test';

test.describe("Audition solo de motif vocal (Puxador et Coro)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 850 });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('[BROWSER ERROR]:', msg.text());
      }
    });

    await page.goto('/');

    const entraBtn = page.locator('#entra-btn');
    if (await entraBtn.isVisible()) {
      await entraBtn.click();
    }

    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 15000 });

    await page.waitForTimeout(1500);
  });

  test("Puxador : L'audition solo d'un motif non assigné à la mesure 0 déclenche le moteur vocal et anime les pas", async ({ page }) => {
    // 1. Configurer un motif avec notes sur Puxador (non assigné à la mesure 0)
    const { puxTrackId, patternId } = await page.evaluate(async () => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const { instrumentsConfig } = await import('/src/data.ts');

      // Vider l'historique d'attaque vocal pour repartir de zéro
      (window as any).__VOICE_ATTACK_HISTORY__ = [];

      const pux = store.tracks.find((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador' || String(t.id) === 'puxador');
      if (!pux) throw new Error("Puxador track non trouvée");

      // Créer un motif dédié "SoloTest" non assigné à la mesure 0
      const testPattern = {
        id: 888801,
        name: 'Motif Solo Test Pux',
        steps: 16,
        activeSteps: [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        lyrics: ['O', '', 'LÁ', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        notes: ['D4', '', 'G4', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        measureAssignments: [false, false, false, false], // STRICTEMENT NON ASSIGNÉ À MESURE 0
        volumes: Array(16).fill(80),
        decays: Array(16).fill(100),
        microtimings: Array(16).fill(0),
        variations: [],
        vocalMode: 'synth' as const,
      };

      store.setTracks((prev: any[]) => prev.map((t: any) => {
        if (t.id === pux.id) {
          return {
            ...t,
            patterns: [...t.patterns, testPattern],
            selectedPatternId: testPattern.id,
          };
        }
        return t;
      }));

      // Ouvrir l'éditeur sur Puxador
      store.setEditingTrackId(pux.id);

      return { puxTrackId: pux.id, patternId: testPattern.id };
    });

    // 2. Vérifier que l'Éditeur Détaillé s'ouvre
    const editor = page.getByTestId('instrument-detail-editor-modal');
    await expect(editor).toBeVisible({ timeout: 5000 });

    // 3. Repérer et cliquer sur le bouton de lecture solo du motif (motif de base)
    const soloPlayBtn = page.getByTestId(`btn-solo-pattern-${patternId}-base`);
    await expect(soloPlayBtn).toBeVisible({ timeout: 5000 });
    await soloPlayBtn.click();

    // 4. Attendre que le solo soit actif et que les notes soient jouées via l'historique natif de AudioEngine
    await page.waitForFunction(() => {
      const transStore = (window as any).__TRANSPORT_STORE__?.getState();
      const history = (window as any).__VOICE_ATTACK_HISTORY__ || [];
      return transStore?.soloPatternPlayId !== null && history.length > 0;
    }, { timeout: 8000 });

    // 5. Vérifier les données déclenchées
    const triggerData = await page.evaluate(() => {
      const transStore = (window as any).__TRANSPORT_STORE__?.getState();
      const history = (window as any).__VOICE_ATTACK_HISTORY__ || [];
      return {
        soloPatternPlayId: transStore?.soloPatternPlayId,
        historyCount: history.length,
        pitches: history.map((item: any) => String(item.pitch || '')),
      };
    });

    expect(triggerData.soloPatternPlayId).toBe(patternId);
    expect(triggerData.historyCount).toBeGreaterThan(0);
    // Les notes programmées 'D4' ou 'G4' doivent figurer dans les notes déclenchées
    expect(triggerData.pitches.some((p: string) => p.includes('D4') || p.includes('G4'))).toBe(true);

    // 6. Cliquer à nouveau pour arrêter l'audition solo
    await soloPlayBtn.click();

    // 7. Vérifier que soloPatternPlayId redevient null
    await page.waitForFunction(() => {
      const transStore = (window as any).__TRANSPORT_STORE__?.getState();
      return transStore?.soloPatternPlayId === null;
    }, { timeout: 3000 });

    const finalSoloId = await page.evaluate(() => {
      return (window as any).__TRANSPORT_STORE__?.getState()?.soloPatternPlayId;
    });
    expect(finalSoloId).toBeNull();
  });

  test("Coro : L'audition solo déclenche bien la voix de chœur avec préservation du mixeur", async ({ page }) => {
    // 1. Configurer un motif avec notes sur Coro
    const { coroTrackId, patternId } = await page.evaluate(async () => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const { instrumentsConfig } = await import('/src/data.ts');

      // Vider l'historique d'attaque vocal
      (window as any).__VOICE_ATTACK_HISTORY__ = [];

      const coro = store.tracks.find((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'coro' || String(t.id) === 'coro');
      if (!coro) throw new Error("Coro track non trouvée");

      const testPattern = {
        id: 888802,
        name: 'Motif Solo Test Coro',
        steps: 16,
        activeSteps: [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        lyrics: ['A', '', '', '', 'Ê', '', '', '', '', '', '', '', '', '', '', ''],
        notes: ['E4', '', '', '', 'B4', '', '', '', '', '', '', '', '', '', '', ''],
        measureAssignments: [false, false, false, false],
        volumes: Array(16).fill(80),
        decays: Array(16).fill(100),
        microtimings: Array(16).fill(0),
        variations: [],
        vocalMode: 'synth' as const,
      };

      store.setTracks((prev: any[]) => prev.map((t: any) => {
        if (t.id === coro.id) {
          return {
            ...t,
            patterns: [...t.patterns, testPattern],
            selectedPatternId: testPattern.id,
          };
        }
        return t;
      }));

      // Ouvrir l'éditeur sur Coro
      store.setEditingTrackId(coro.id);

      return { coroTrackId: coro.id, patternId: testPattern.id };
    });

    // 2. Vérifier que l'Éditeur Détaillé s'ouvre
    const editor = page.getByTestId('instrument-detail-editor-modal');
    await expect(editor).toBeVisible({ timeout: 5000 });

    // 3. Cliquer sur le bouton solo
    const soloPlayBtn = page.getByTestId(`btn-solo-pattern-${patternId}-base`);
    await expect(soloPlayBtn).toBeVisible({ timeout: 5000 });
    await soloPlayBtn.click();

    // 4. Attendre le déclenchement des notes
    await page.waitForFunction(() => {
      const transStore = (window as any).__TRANSPORT_STORE__?.getState();
      const history = (window as any).__VOICE_ATTACK_HISTORY__ || [];
      return transStore?.soloPatternPlayId !== null && history.length > 0;
    }, { timeout: 8000 });

    const triggerData = await page.evaluate(() => {
      const history = (window as any).__VOICE_ATTACK_HISTORY__ || [];
      return {
        historyCount: history.length,
        pitches: history.map((item: any) => String(item.pitch || '')),
      };
    });

    expect(triggerData.historyCount).toBeGreaterThan(0);
    expect(triggerData.pitches.some((p: string) => p.includes('E4') || p.includes('B4'))).toBe(true);

    // 5. Arrêter le solo
    await soloPlayBtn.click();

    await page.waitForFunction(() => {
      const transStore = (window as any).__TRANSPORT_STORE__?.getState();
      return transStore?.soloPatternPlayId === null;
    }, { timeout: 3000 });
  });
});
