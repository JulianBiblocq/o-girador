/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, expect } from '@playwright/test';

/**
 * Simulation déterministe de la logique de décision du tick vocal (mêmes formules et mêmes appels
 * utilitaires que `useAudioSync.ts`) sur une Toada de 4 mesures (64 pas) + anacrouse :
 *  - indexation absolue des pas sans redémarrage à chaque mesure,
 *  - cadence = tempo naturel de la batterie (pas de ×4),
 *  - un seul déclenchement de sample par bloc, réarmement au rebouclage (y compris région de boucle),
 *  - continuité des notes tenues (spanSteps) au-delà du pas 15.
 */
test.describe('Toada 4 mesures + anacrouse : indexation, cadence et réarmement', () => {
  test('cellules 0→63 sans redémarrage, cadence naturelle, sample unique par bloc, boucle M1-M4', async ({ page }) => {
    await page.goto('/');

    const r = await page.evaluate(async () => {
      const m = await import('../src/utils/vocalPhraseBlock.ts');
      const TICKS = 96;
      const toada = {
        steps: 64,
        measureAssignments: { 0: true, 1: true, 2: true, 3: true } as any,
      };
      const BEATS = 4;

      // --- 1. Indexation absolue + cadence sur une lecture linéaire de 4 mesures
      const fired: number[] = [];
      const firedTick: number[] = [];
      let tickAbs = 0;
      for (let meas = 0; meas < 4; meas++) {
        const phrase = m.getPhraseBlockInfo(toada, meas, BEATS);
        const ticksPerStep = TICKS / phrase.cellsPerMeasure;
        for (let stepIdx = 0; stepIdx < TICKS; stepIdx++, tickAbs++) {
          if (stepIdx % ticksPerStep === 0) {
            fired.push(phrase.stepOffset + Math.floor(stepIdx / ticksPerStep));
            firedTick.push(tickAbs);
          }
        }
      }
      const gaps = new Set(firedTick.slice(1).map((t, i) => t - firedTick[i]));

      // --- 2. Notes tenues : un sustain débutant au pas 14 de M1 se prolonge sur 6 cellules (14..19)
      const active = new Array(64).fill(0);
      for (let i = 14; i <= 19; i++) active[i] = 1;
      let span = 1;
      let idx = 14 + 1;
      while (idx < toada.steps && active[idx]) { span++; idx++; }
      // Au pas 0 de la mesure 2 (cellule 16) la cellule précédente est active → prolongation, pas de réattaque
      const m2Phrase = m.getPhraseBlockInfo(toada, 1, BEATS);
      const cellAtM2Step0 = m2Phrase.stepOffset + 0;
      const isReattackAtM2 = !(active[cellAtM2Step0] && active[cellAtM2Step0 - 1]);

      // --- 3. Déclenchements sample : timeline linéaire 2 tours (8 mesures bouclées sur 4)
      let sampleStarts = 0;
      const anticipated = new Set<string>();
      const active_ = new Set<string>();
      const loopStart = 0;
      const loopEnd = 3;
      let anticipationsArmed = 0;
      for (let lap = 0; lap < 2; lap++) {
        for (let meas = 0; meas < 4; meas++) {
          const cur = m.getPhraseBlockInfo(toada, meas, BEATS);
          const key = `t_m${cur.blockStartMeasure}`;

          // Pas 0 : déclenchement sauf si déjà anticipé ; les mesures de continuation ne font rien
          const isAlready = anticipated.has(key);
          const canStart = cur.isBlockStart && (cur.span > 1 || !active_.has(key));
          if (!isAlready && canStart) { sampleStarts++; active_.add(key); }

          // Pas >= 4 : réarmement de la clé (n'est jamais bloqué par l'état anticipé du tour précédent)
          if (isAlready) anticipated.delete(key);

          // Seconde moitié : anticipation de la mesure suivante (rebouclage M4 → M1 inclus), début de bloc uniquement
          const next = meas === loopEnd ? loopStart : meas + 1;
          const nextPhrase = m.getPhraseBlockInfo(toada, next, BEATS);
          if (nextPhrase.isBlockStart) {
            const k = `t_m${next}`;
            if (!anticipated.has(k)) { anticipated.add(k); anticipationsArmed++; sampleStarts++; active_.add(k); }
          }
        }
      }

      return {
        fired,
        gapTicks: Array.from(gaps),
        span,
        isReattackAtM2,
        sampleStarts,
        anticipationsArmed,
      };
    });

    // 64 cellules, 0→63 dans l'ordre, une seule fois chacune (aucun redémarrage à 0 par mesure)
    expect(r.fired.length).toBe(64);
    expect(r.fired).toEqual(Array.from({ length: 64 }, (_, i) => i));
    // 96 ticks / 16 cellules par mesure = 6 ticks par pas : tempo naturel, pas de ×4
    expect(r.gapTicks).toEqual([6]);
    // Note tenue 14..19 : span complet de 6 cellules, aucune réattaque au pas 0 de la mesure suivante
    expect(r.span).toBe(6);
    expect(r.isReattackAtM2).toBe(false);
    // 2 tours de la boucle M1-M4 : l'anacrouse est réarmée à chaque fin de M4 (1 départ initial + 1 anticipation / tour)
    expect(r.anticipationsArmed).toBe(2);
    expect(r.sampleStarts).toBe(3);
  });
});
