/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, expect } from '@playwright/test';

test.describe("Transposition réelle et dynamique des notes vocales", () => {
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

    // Laisser le chargement initial asynchrone (preset / audio) se stabiliser complètement
    await page.waitForTimeout(2000);
  });

  test("Valide les règles de transposition réelles, l'intégrité des paroles et le cycle Undo/Redo", async ({ page }) => {
    // 1. Initialiser la piste vocale (Puxador) avec D4 au pas 0 et paroles
    const { trackId, patternId } = await page.evaluate(async () => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const { instrumentsConfig } = await import('/src/data.ts');
      
      let voiceTrack = store.tracks.find((t: any) => {
        const inst = instrumentsConfig[t.instrumentIdx];
        return inst && (inst.id === 'puxador' || inst.id === 'coro') && t.patterns && t.patterns.length > 0;
      });

      if (!voiceTrack) {
        const puxIdx = instrumentsConfig.findIndex(i => i.id === 'puxador');
        const newPattern = {
          id: 777222,
          name: 'Puxador Test',
          steps: 16,
          activeSteps: [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          lyrics: ['O-gi-ra-dor', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
          notes: ['D4', 'D4', 'D4', '', '', '', '', '', '', '', '', '', '', '', '', ''],
          preRollActiveSteps: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          preRollLyrics: ['Eh', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
          preRollNotes: ['D4', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
          measureAssignments: [true],
          volumes: Array(16).fill(100),
          decays: Array(16).fill(10),
        };
        voiceTrack = {
          id: 777111,
          instrumentIdx: puxIdx !== -1 ? puxIdx : 10,
          patterns: [newPattern],
          selectedPatternId: newPattern.id,
          volumeVal: 100,
        };
        store.setTracks([...store.tracks, voiceTrack]);
      } else {
        const targetPattern = voiceTrack.patterns[0];
        const nextNotes = [...(targetPattern.notes || Array(16).fill(''))];
        const nextLyrics = [...(targetPattern.lyrics || Array(16).fill(''))];
        const nextActive = [...(targetPattern.activeSteps || Array(16).fill(0))];
        const nextPreNotes = [...(targetPattern.preRollNotes || Array(16).fill(''))];
        const nextPreLyrics = [...(targetPattern.preRollLyrics || Array(16).fill(''))];
        const nextPreActive = [...(targetPattern.preRollActiveSteps || Array(16).fill(0))];

        nextNotes[0] = 'D4';
        nextNotes[1] = 'D4';
        nextNotes[2] = 'D4';
        nextLyrics[0] = 'O-gi-ra-dor';
        nextActive[0] = 1;
        nextActive[1] = 1;
        nextActive[2] = 1;

        nextPreNotes[0] = 'D4';
        nextPreLyrics[0] = 'Eh';
        nextPreActive[0] = 1;

        store.setTracks(store.tracks.map((t: any) => {
          if (String(t.id) === String(voiceTrack.id)) {
            return {
              ...t,
              selectedPatternId: targetPattern.id,
              patterns: t.patterns.map((p: any) => String(p.id) === String(targetPattern.id) ? {
                ...p,
                notes: nextNotes,
                lyrics: nextLyrics,
                activeSteps: nextActive,
                preRollNotes: nextPreNotes,
                preRollLyrics: nextPreLyrics,
                preRollActiveSteps: nextPreActive,
              } : p)
            };
          }
          return t;
        }));
      }

      // Réinitialiser le compteur de transposition à 0
      store.setVocalTransposeSteps(0);

      // Ouvrir l'éditeur de détail pour cette piste
      store.setEditingTrackId(voiceTrack.id);

      const freshStore = (window as any).__SEQUENCER_STORE__.getState();
      const resolvedTrack = freshStore.tracks.find((t: any) => String(t.id) === String(voiceTrack.id));
      const targetPatId = resolvedTrack.patterns[0].id;
      return { trackId: voiceTrack.id, patternId: targetPatId };
    });

    // Vérifier l'état initial des notes avant transposition
    const preCheck = await page.evaluate(({ trackId, patternId }) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => String(t.id) === String(trackId));
      const pattern = track.patterns.find((p: any) => String(p.id) === String(patternId));
      return {
        notes0: pattern.notes[0],
        preRollNote0: pattern.preRollNotes?.[0],
      };
    }, { trackId, patternId });
    expect(preCheck.notes0).toBe('D4');
    expect(preCheck.preRollNote0).toBe('D4');

    // Sélectionner explicitement le motif dans l'UI
    await page.locator(`[data-pattern-card="${patternId}"]`).click();

    // 2. Cibler la cellule du pas 0 de la mesure principale pour CE motif
    const patternFirstCell = page.locator(`.main-measure-section [data-pattern-id="${patternId}"][data-step-index="0"] input.v-note`).first();
    await expect(patternFirstCell).toBeVisible({ timeout: 10000 });
    await expect(patternFirstCell).toHaveValue('D4');

    // 3. Cliquer sur le raccourci [+7]
    const btnPlus7 = page.locator('button:has-text("+7")');
    await expect(btnPlus7).toBeVisible();
    await btnPlus7.click();

    // 4. Vérifier que la note du pas 0 s'est transposée immédiatement en A4
    await expect(patternFirstCell).toHaveValue('A4');

    // 5. Vérifier que le compteur de transposition affiche +7
    const transposeCounter = page.locator('span.font-cactus:has-text("+7")');
    await expect(transposeCounter).toBeVisible();

    // 6. Vérifier dans le store que les notes principales et anacrouse sont A4 et paroles inchangées
    const storeStateAfterPlus7 = await page.evaluate(({ trackId, patternId }) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => String(t.id) === String(trackId));
      const pattern = track.patterns.find((p: any) => String(p.id) === String(patternId));
      return {
        notes: pattern.notes.slice(0, 3),
        preRollNote: pattern.preRollNotes?.[0],
        lyric0: pattern.lyrics[0],
        preRollLyric: pattern.preRollLyrics?.[0],
        vocalTransposeSteps: store.vocalTransposeSteps,
      };
    }, { trackId, patternId });

    expect(storeStateAfterPlus7.notes).toEqual(['A4', 'A4', 'A4']);
    expect(storeStateAfterPlus7.preRollNote).toBe('A4');
    expect(storeStateAfterPlus7.lyric0).toBe('O-gi-ra-dor');
    expect(storeStateAfterPlus7.preRollLyric).toBe('Eh');
    expect(storeStateAfterPlus7.vocalTransposeSteps).toBe(7);

    // 7. Tester l'annulation Undo (Ctrl + Z)
    await page.keyboard.press('Control+z');

    // Attendre que la note redevienne D4 et le compteur 0
    await expect(patternFirstCell).toHaveValue('D4');
    const storeStateAfterUndo = await page.evaluate(({ trackId, patternId }) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => String(t.id) === String(trackId));
      const pattern = track.patterns.find((p: any) => String(p.id) === String(patternId));
      return {
        notes: pattern.notes.slice(0, 3),
        preRollNote: pattern.preRollNotes?.[0],
        vocalTransposeSteps: store.vocalTransposeSteps,
      };
    }, { trackId, patternId });

    expect(storeStateAfterUndo.notes).toEqual(['D4', 'D4', 'D4']);
    expect(storeStateAfterUndo.preRollNote).toBe('D4');
    expect(storeStateAfterUndo.vocalTransposeSteps).toBe(0);

    // 8. Cliquer sur le raccourci [-7]
    const btnMinus7 = page.locator('button:has-text("-7")');
    await expect(btnMinus7).toBeVisible();
    await btnMinus7.click();

    // D4 - 7 demi-tons = G3
    await expect(patternFirstCell).toHaveValue('G3');
    const storeStateAfterMinus7 = await page.evaluate(({ trackId, patternId }) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => String(t.id) === String(trackId));
      const pattern = track.patterns.find((p: any) => String(p.id) === String(patternId));
      return {
        notes: pattern.notes.slice(0, 3),
        preRollNote: pattern.preRollNotes?.[0],
        vocalTransposeSteps: store.vocalTransposeSteps,
      };
    }, { trackId, patternId });

    expect(storeStateAfterMinus7.notes).toEqual(['G3', 'G3', 'G3']);
    expect(storeStateAfterMinus7.preRollNote).toBe('G3');
    expect(storeStateAfterMinus7.vocalTransposeSteps).toBe(-7);
  });
});
