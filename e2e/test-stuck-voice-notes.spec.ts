/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, expect } from '@playwright/test';
import { ensureStudioLoaded } from './helpers/navigation';

/**
 * Anti-bourdon (notes vocales coincées) sur Toadas multi-mesures :
 *  - un pas vide / silencieux n'est jamais une prolongation ;
 *  - la boucle de tenue (spanSteps) s'arrête au premier silence ;
 *  - la queue de decay ne déborde jamais sur la prochaine attaque ni sur des silences hors-décay ;
 *  - toute durée invalide est remplacée par un repli sûr (0.2 s) ;
 *  - le panic coupe toutes les voix.
 */
test.describe('Notes vocales coincées (Stuck Notes) : règles de tenue et gardes de durée', () => {
  test('isVoiceStepProlongation + spanSteps + plafond de decay sur une phrase de 64 pas', async ({ page }) => {
    await page.goto('/');

    const r = await page.evaluate(async () => {
      const th = await import('../src/utils/musicTheory.ts');
      const cap = await import('../src/utils/voiceNoteDuration.ts');

      const P = th.isVoiceStepProlongation;
      const rules = {
        silenceCur: P(false, true, '', 'C4', ''),
        silencePrev: P(true, false, 'C4', '', ''),
        emptyAfterNote: P(true, true, '', 'C4', ''),
        emptyAfterEmpty: P(true, true, '', '', ''),
        sameNote: P(true, true, 'C4', 'C4', ''),
        holdSymbol: P(true, true, '───', 'C4', ''),
        dash: P(true, true, '-', 'C4', ''),
        newSyllable: P(true, true, 'C4', 'C4', 'Vou'),
        otherNoteNoSyl: P(true, true, 'D4', 'C4', ''),
      };

      // Phrase de 64 pas : note C4 en 40..41 (tenue 2 pas), puis 40 cellules ACTIVES SANS NOTE (ancien bug : bourdon)
      const steps = 64;
      const active = new Array(steps).fill(0);
      const notes = new Array(steps).fill('');
      const lyrics = new Array(steps).fill('');
      active[40] = 1; notes[40] = 'C4'; lyrics[40] = 'Ma';
      active[41] = 1; notes[41] = 'C4';
      for (let i = 42; i < 64; i++) { active[i] = 1; } // actif sans note ni paroles
      const scanSpan = (cell: number) => {
        let span = 1;
        let idx = cell + 1;
        while (idx < steps) {
          const act = active[idx] !== 0;
          if (P(act, true, notes[idx], notes[cell], lyrics[idx])) { span++; idx++; } else break;
        }
        return span;
      };

      // Silence réel après la note : la tenue s'arrête, quel que soit ce qui suit
      const active2 = new Array(steps).fill(0);
      active2[10] = 1; active2[11] = 1; // 10 attaque, 11 tenue (même note), 12.. silence
      const notes2 = new Array(steps).fill(''); notes2[10] = 'G4'; notes2[11] = 'G4';
      let span2 = 1; let i2 = 11;
      while (i2 < steps) {
        if (P(active2[i2] !== 0, true, notes2[i2], notes2[10], '')) { span2++; i2++; } else break;
      }

      // Plafond de decay : tail (decay 16 pas) borné par la prochaine attaque (cell 14) et la fin du motif
      const act3: number[] = new Array(steps).fill(0);
      act3[10] = 1; act3[14] = 1;
      const capBeforeNextAttack = cap.capVoiceNoteSteps({ spanSteps: 1, decaySteps: 16, activeSteps: act3, startIdx: 11, totalSteps: steps });
      const act4: number[] = new Array(steps).fill(0); act4[62] = 1;
      const capAtPhraseEnd = cap.capVoiceNoteSteps({ spanSteps: 1, decaySteps: 16, activeSteps: act4, startIdx: 64, totalSteps: steps });
      const capBoundedByPhraseEnd = cap.capVoiceNoteSteps({ spanSteps: 1, decaySteps: 16, activeSteps: act4, startIdx: 62, totalSteps: steps });
      const capNoTail = cap.capVoiceNoteSteps({ spanSteps: 3, decaySteps: 2, activeSteps: act4, startIdx: 3, totalSteps: steps });
      const capHeldOverMeasure = cap.capVoiceNoteSteps({ spanSteps: 20, decaySteps: 1, activeSteps: act4, startIdx: 20, totalSteps: steps });

      return {
        rules,
        spanMeasure3Note: scanSpan(40),
        span2,
        capBeforeNextAttack,
        capAtPhraseEnd,
        capBoundedByPhraseEnd,
        capNoTail,
        capHeldOverMeasure,
      };
    });

    // Règles de prolongation : seul un symbole de tenue ou la même note sans syllabe lie deux pas actifs
    expect(r.rules.silenceCur).toBe(false);
    expect(r.rules.silencePrev).toBe(false);
    expect(r.rules.emptyAfterNote).toBe(false);
    expect(r.rules.emptyAfterEmpty).toBe(false);
    expect(r.rules.otherNoteNoSyl).toBe(false);
    expect(r.rules.newSyllable).toBe(false);
    expect(r.rules.sameNote).toBe(true);
    expect(r.rules.holdSymbol).toBe(true);
    expect(r.rules.dash).toBe(true);

    // Anciennement 24 pas (bourdon sur toutes les cellules actives vides) → 2 pas exacts
    expect(r.spanMeasure3Note).toBe(2);
    // Silence réel : la boucle de tenue s'interrompt immédiatement (attaque + 1 tenue)
    expect(r.span2).toBe(2);

    // Plafonds de decay
    expect(r.capBeforeNextAttack).toBe(1 + 3); // 11,12,13 silencieux puis attaque en 14
    expect(r.capAtPhraseEnd).toBe(1);          // fin de motif : aucune queue
    expect(r.capBoundedByPhraseEnd).toBe(1);   // act4[62] est une attaque : la queue s'arrête sur elle

    expect(r.capNoTail).toBe(3);               // span prime sur le decay
    expect(r.capHeldOverMeasure).toBe(20);     // une tenue explicite n'est jamais raccourcie
  });

  test('Gardes de durée : NaN / 0 / négatif / Infinity → repli 0.2 s ; chevauchement de même hauteur', async ({ page }) => {
    await page.goto('/');

    const r = await page.evaluate(async () => {
      const g = await import('../src/audio/voiceNoteGuard.ts');

      const durations = [NaN, 0, -1, Infinity, undefined, null, '1', 0.5].map((d) => g.sanitizeVoiceDuration(d as any));
      const times = [NaN, Infinity, undefined, 3.2].map((t) => g.sanitizeVoiceTime(t as any, 7));

      const tr = new g.VoiceOverlapTracker();
      const first = tr.registerAndCheck('1|C4', 1.0, 1.0);           // fin 2.0, rien avant
      const nestedShorter = tr.registerAndCheck('1|C4', 1.5, 0.25);  // fin 1.75 <= 2.0 → relâcher l'ancienne voix
      const longer = tr.registerAndCheck('1|C4', 1.6, 2.0);          // fin 3.6 > 2.0 → polyphonie conservée (évite la coupe prématurée)
      const otherTrack = tr.registerAndCheck('2|C4', 1.5, 0.25);
      tr.clearTrack('1');
      const afterClear = tr.registerAndCheck('1|C4', 1.5, 0.25);

      return { durations, times, first, nestedShorter, longer, otherTrack, afterClear };
    });

    expect(r.durations).toEqual([0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.5]);
    expect(r.times).toEqual([7, 7, 7, 3.2]);
    expect(r.first).toBe(false);
    expect(r.nestedShorter).toBe(true);
    expect(r.longer).toBe(false);
    expect(r.otherTrack).toBe(false);
    expect(r.afterClear).toBe(false);
  });

  test('AudioEngine : durée invalide sans exception, panic global et par piste', async ({ page }) => {
    await page.goto('/');
    await ensureStudioLoaded(page);

    const r = await page.evaluate(async () => {
      const engine = (window as any).__AUDIO_ENGINE__;
      if (!engine) return { skipped: true } as any;

      // Une attaque de chaque type de durée (NaN / 0 / négatif / Infinity / valide) sur 2 pistes vocales
      const errors: unknown[] = [];
      const origError = console.error;
      console.error = (...a: unknown[]) => { errors.push(a); };
      const durations = [NaN, 0, -2, Infinity, 0.3];
      durations.forEach((d, i) => engine.triggerVoiceAttackRelease('C4', d, undefined, 0.8, i % 2 === 0 ? 'trkA' : 'trkB'));
      console.error = origError;

      const createdTracks = Array.from(engine.voiceSynths.keys()).sort();
      engine.releaseVoicesForTrack('trkA');
      const afterTrackPanic = Array.from(engine.voiceSynths.keys()).sort();
      engine.releaseAllVoices();
      const afterPanic = engine.voiceSynths.size;
      // Le synthé est recréé paresseusement après un panic (la lecture peut reprendre)
      engine.triggerVoiceAttackRelease('D4', 0.2, undefined, 0.8, 'trkB');
      const recreated = engine.voiceSynths.has('trkB');
      engine.releaseAllVoices();

      return { skipped: false, errors: errors.length, createdTracks, afterTrackPanic, afterPanic, recreated };
    });

    test.skip(r.skipped, 'AudioEngine non instancié sans interaction utilisateur');
    expect(r.errors).toBe(0);
    expect(r.createdTracks).toEqual(['trkA', 'trkB']);
    expect(r.afterTrackPanic).toEqual(['trkB']);
    expect(r.afterPanic).toBe(0);
    expect(r.recreated).toBe(true);
  });
});
