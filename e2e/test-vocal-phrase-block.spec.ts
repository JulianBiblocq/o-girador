/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, expect } from '@playwright/test';

test.describe('Toadas multi-mesures : utilitaire de bloc de phrase (vocalPhraseBlock)', () => {
  test('span, mesure relative, offset, blocs adjacents, solo modulo, résolutions 6/8', async ({ page }) => {
    await page.goto('/');

    const r = await page.evaluate(async () => {
      const m = await import('../src/utils/vocalPhraseBlock.ts');

      const mono = { steps: 16, measureAssignments: { 0: true } as any };
      const toada = { steps: 64, measureAssignments: { 0: true, 1: true, 2: true, 3: true } as any };
      const twoBlocks = {
        steps: 64,
        measureAssignments: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true } as any,
      };
      const compound = { steps: 24, beatResolutions: [4, 4, 4, 4, 4, 4], measureAssignments: { 0: true } as any };

      const monoInfo = m.getPhraseBlockInfo(mono, 0, 4);
      const toadaInfos = [0, 1, 2, 3].map((i) => m.getPhraseBlockInfo(toada, i, 4));
      const adj = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => m.getPhraseBlockInfo(twoBlocks, i, 4));
      const outside = m.getPhraseBlockInfo(toada, 6, 4);

      const soloInfos = [0, 1, 2, 3, 4, 5].map((c) => m.getSoloPhraseInfo(toada, c, 4));
      const tracks = [{ patterns: [{ id: 42, ...toada }] }];
      let counter = 0;
      const counters: number[] = [];
      for (let i = 0; i < 9; i++) {
        counters.push(counter);
        counter = m.advanceSoloPhraseMeasure(counter, tracks as any, 42, 4);
      }
      const monoCounter = m.advanceSoloPhraseMeasure(0, [{ patterns: [{ id: 7, ...mono }] }] as any, 7, 4);

      return {
        monoInfo,
        toadaInfos,
        adj,
        outside,
        soloInfos,
        counters,
        monoCounter,
        compoundSpm: m.getPatternStepsPerMeasure(compound, 6),
        compoundInfo: m.getPhraseBlockInfo(compound, 0, 6),
        startMid: m.isPhraseBlockStart(toada, 2, 4),
        startFirst: m.isPhraseBlockStart(toada, 0, 4),
        startSolo: m.isPhraseBlockStart(toada, 2, 4, true),
      };
    });

    // Motif mono-mesure : comportement historique intact
    expect(r.monoInfo.span).toBe(1);
    expect(r.monoInfo.isBlockStart).toBe(true);
    expect(r.monoInfo.cellsPerMeasure).toBe(16);
    expect(r.monoInfo.stepOffset).toBe(0);

    // Toada 4 mesures : relIdx 0..3, offset 0/16/32/48, un seul début de bloc
    expect(r.toadaInfos.map((i: any) => i.relIdx)).toEqual([0, 1, 2, 3]);
    expect(r.toadaInfos.map((i: any) => i.stepOffset)).toEqual([0, 16, 32, 48]);
    expect(r.toadaInfos.map((i: any) => i.isBlockStart)).toEqual([true, false, false, false]);
    expect(r.toadaInfos.every((i: any) => i.span === 4 && i.cellsPerMeasure === 16)).toBe(true);
    expect(r.toadaInfos.every((i: any) => i.blockStartMeasure === 0)).toBe(true);

    // Deux blocs contigus de 4 mesures : relIdx = m % 4, débuts de bloc en 0 et 4
    expect(r.adj.map((i: any) => i.relIdx)).toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
    expect(r.adj.map((i: any) => i.blockStartMeasure)).toEqual([0, 0, 0, 0, 4, 4, 4, 4]);

    // Mesure hors bloc assigné : pas de plantage, position cohérente
    expect(r.outside.span).toBe(4);
    expect(r.outside.blockStartMeasure).toBe(6);

    // Solo : compteur modulo span
    expect(r.soloInfos.map((i: any) => i.relIdx)).toEqual([0, 1, 2, 3, 0, 1]);
    expect(r.counters).toEqual([0, 1, 2, 3, 0, 1, 2, 3, 0]);
    expect(r.monoCounter).toBe(0);

    // 6/8 : somme des résolutions
    expect(r.compoundSpm).toBe(24);
    expect(r.compoundInfo.span).toBe(1);

    // Démarrage au milieu de bloc : pas de début de bloc (sauf solo)
    expect(r.startMid).toBe(false);
    expect(r.startFirst).toBe(true);
    expect(r.startSolo).toBe(true);
  });
});
