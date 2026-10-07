/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, expect } from '@playwright/test';

test.describe('Normalisation Crête Invisible au Bounce Audio (-0.5 dBFS)', () => {
  test('Vérification mathématique et acoustique de normalizeAudioBuffer sur AudioBuffer réel', async ({ page }) => {
    await page.goto('/');

    const testResults = await page.evaluate(async () => {
      const { normalizeAudioBuffer } = await import('../src/utils/audioBufferUtils.ts');

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const sampleRate = 44100;
      const targetLinear = Math.pow(10, -0.5 / 20); // ~0.944060876

      // ----------------------------------------------------
      // CAS 1 : Signal faible (-6 dBFS, maxPeak = 0.5)
      // ----------------------------------------------------
      const buf1 = ctx.createBuffer(1, 1000, sampleRate);
      const data1 = buf1.getChannelData(0);
      data1[100] = 0.5;
      data1[200] = -0.3;
      data1[500] = 0.1;

      normalizeAudioBuffer(buf1, -0.5);

      let peak1 = 0;
      for (let i = 0; i < buf1.length; i++) {
        const absVal = Math.abs(data1[i]);
        if (absVal > peak1) peak1 = absVal;
      }

      // ----------------------------------------------------
      // CAS 2 : Signal stéréo (préservation stricte de la balance relative)
      // Canal gauche max 0.4, canal droit max 0.2
      // ----------------------------------------------------
      const buf2 = ctx.createBuffer(2, 1000, sampleRate);
      const left2 = buf2.getChannelData(0);
      const right2 = buf2.getChannelData(1);
      left2[50] = 0.4;
      right2[50] = 0.2;

      normalizeAudioBuffer(buf2, -0.5);

      const newLeftPeak = Math.abs(left2[50]);
      const newRightPeak = Math.abs(right2[50]);
      const ratio = newRightPeak / newLeftPeak; // doit rester exactement 0.5

      // ----------------------------------------------------
      // CAS 3 : Silence complet (immunité aux divisions par zéro)
      // ----------------------------------------------------
      const buf3 = ctx.createBuffer(1, 1000, sampleRate);
      normalizeAudioBuffer(buf3, -0.5);
      const data3 = buf3.getChannelData(0);
      let isAllZero = true;
      for (let i = 0; i < buf3.length; i++) {
        if (data3[i] !== 0) isAllZero = false;
      }

      // ----------------------------------------------------
      // CAS 4 : Signal déjà calibré à -0.5 dBFS (bypass)
      // ----------------------------------------------------
      const buf4 = ctx.createBuffer(1, 1000, sampleRate);
      const data4 = buf4.getChannelData(0);
      data4[10] = targetLinear;
      const originalVal = data4[10];
      normalizeAudioBuffer(buf4, -0.5);
      const wasBypassed = Math.abs(data4[10] - originalVal) < 1e-7;

      // ----------------------------------------------------
      // CAS 5 : Signal en sur-modulation / crête chaude (> 1.0 ex: 1.5)
      // Doit être ramené proprement à -0.5 dBFS sans écrêtage dur
      // ----------------------------------------------------
      const buf5 = ctx.createBuffer(1, 1000, sampleRate);
      const data5 = buf5.getChannelData(0);
      data5[300] = 1.5;
      normalizeAudioBuffer(buf5, -0.5);
      const peak5 = Math.abs(data5[300]);

      ctx.close().catch(() => {});

      return {
        targetLinear,
        peak1,
        newLeftPeak,
        newRightPeak,
        stereoRatio: ratio,
        isAllZero,
        wasBypassed,
        peak5
      };
    });

    // Validations d'assertions
    // Cas 1 : Amplifié exactement à ~0.944
    expect(testResults.peak1).toBeCloseTo(testResults.targetLinear, 4);

    // Cas 2 : Stéréo - canal gauche calibré et balance droite préservée
    expect(testResults.newLeftPeak).toBeCloseTo(testResults.targetLinear, 4);
    expect(testResults.stereoRatio).toBeCloseTo(0.5, 4);

    // Cas 3 : Silence intact
    expect(testResults.isAllZero).toBe(true);

    // Cas 4 : Bypass si déjà calibré
    expect(testResults.wasBypassed).toBe(true);

    // Cas 5 : Atténuation propre d'un signal trop fort
    expect(testResults.peak5).toBeCloseTo(testResults.targetLinear, 4);
  });
});
