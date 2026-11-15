// @ts-ignore — vitest est exécuté via npx vitest hors devDependencies locales
import { describe, expect, it } from 'vitest';
import { EngineTuning } from '../../../audio/engine/engineTuning';
import { TUNEABLE_INSTRUMENTS } from '../../../audio/engine/engineTypes';
import {
  computeTuningForTargetMidi,
  DRUM_FUNDAMENTAL_SPECS,
  getDrumNaturalBaseHz,
  isDrumStudioBankActive,
} from '../drumFundamentalRegistry';
import { getDrumPitchNoteInfo } from '../drumPitchToNote';
import { buildFactoryLutheriePresets } from '../lutherieFactoryPresets';
import { FACTORY_LUTHERIE_PRESETS, isLutheriePresetMatching } from '../lutheriePresetsStorage';

describe('Studio f0 Calibration, 0.1st Note Converter & Harmonic Presets', () => {
  it('locks exact measured fundamentals for the 3 Studio Alfaias and Gonguê', () => {
    expect(getDrumNaturalBaseHz('marcante')).toBe(71.21);
    expect(getDrumNaturalBaseHz('meiao')).toBe(81.11);
    expect(getDrumNaturalBaseHz('repique')).toBe(96.33);
    expect(getDrumNaturalBaseHz('gongue')).toBe(414.5);
    expect(isDrumStudioBankActive('marcante')).toBe(true);
    expect(isDrumStudioBankActive('gongue')).toBe(true);
    expect(isDrumStudioBankActive('caixa')).toBe(false);
    expect(DRUM_FUNDAMENTAL_SPECS.timbal.secondaryHz).toBe(95.39);
  });

  it('includes gongue in TUNEABLE_INSTRUMENTS and preserves 0.1st & falsy-zero tuning in EngineTuning', () => {
    expect(TUNEABLE_INSTRUMENTS.has('gongue')).toBe(true);
    const gongueCfg: any = { id: 'gongue', name: 'Gonguê', strokes: [], macroPitch: 1.0 };
    expect(EngineTuning.calculateTotalSemitones('gongue', gongueCfg, { tuning: 0 } as any)).toBe(0);
    expect(EngineTuning.calculateTotalSemitones('gongue', gongueCfg, { tuning: -1.5 } as any)).toBe(-1.5);
    expect(EngineTuning.calculatePitch('gongue', gongueCfg, { tuning: 12 } as any)).toBeCloseTo(2.0, 6);
  });

  it('computes accurate FR/PT notes, Hz, and cents badges (|cents| >= 5)', () => {
    const marcante0 = getDrumPitchNoteInfo('marcante', 0, 'fr');
    expect(marcante0.noteLabel).toBe('Do#2');
    expect(marcante0.intlNote).toBe('C#2');
    expect(marcante0.cents).toBe(47);
    expect(marcante0.centsLabel).toBe('+47c');
    expect(marcante0.badgeText).toBe('Do#2 +47c (C#2) • 71.2 Hz | 0 st');

    const meiaoPt = getDrumPitchNoteInfo('meiao', 0, 'pt');
    expect(meiaoPt.noteLabel).toBe('Mi2');
    expect(meiaoPt.cents).toBe(-27);
    expect(meiaoPt.centsLabel).toBe('-27c');

    const repique0 = getDrumPitchNoteInfo('repique', 0, 'fr');
    expect(repique0.noteLabel).toBe('Sol2');
    expect(repique0.cents).toBe(-30);

    const gongue0 = getDrumPitchNoteInfo('gongue', 0, 'fr');
    expect(gongue0.noteLabel).toBe('Sol#4');
    expect(gongue0.cents).toBe(-3);
    expect(gongue0.centsLabel).toBe('');
    expect(gongue0.badgeText).toBe('Sol#4 (G#4) • 414.5 Hz | 0 st');
  });

  it('generates exact 0.1st harmonic presets on Studio Alfaias while keeping pending legacy drums at 0st', () => {
    const byId = Object.fromEntries(FACTORY_LUTHERIE_PRESETS.map((p) => [p.id, p]));

    expect(byId.studio_natural.tunings).toEqual({
      marcante: 0, meiao: 0, repique: 0, caixa: 0, tarol: 0, timbal: 0, gongue: 0,
    });
    expect(byId.gongue_minor.tunings).toMatchObject({
      marcante: -0.5, meiao: 0.3, repique: 1.3, caixa: 0, tarol: 0, timbal: 0, gongue: 0,
    });
    expect(byId.major_triad.tunings).toMatchObject({
      marcante: -1.5, meiao: 0.3, repique: 0.3, caixa: 0, tarol: 0, timbal: 0, gongue: 0,
    });
    expect(byId.minor_triad.tunings).toMatchObject({
      marcante: 0.5, meiao: 1.3, repique: 2.3, caixa: 0, tarol: 0, timbal: 0, gongue: 0,
    });
    expect(byId.fifth_octave.tunings).toMatchObject({
      marcante: -4.5, meiao: 0.3, repique: 2.3, caixa: 0, tarol: 0, timbal: 0, gongue: 0,
    });
    expect(byId.fast_tight.tunings).toMatchObject({
      marcante: 0.5, meiao: 2.3, repique: 2.3, caixa: 0, tarol: 0, timbal: 0, gongue: 0,
    });
    expect(byId.fast_tight.decays).toMatchObject({ marcante: 68, meiao: 74, repique: 82 });

    // Verify resulting chord notes are in tune within <= 4 cents!
    for (const presetId of ['gongue_minor', 'major_triad', 'minor_triad', 'fifth_octave', 'fast_tight']) {
      const p = byId[presetId];
      for (const role of ['marcante', 'meiao', 'repique'] as const) {
        const info = getDrumPitchNoteInfo(role, p.tunings[role], 'fr');
        expect(Math.abs(info.cents)).toBeLessThanOrEqual(4);
      }
    }
  });

  it('bounds caixa/tarol to [-2.0, +2.0 st] once STUDIO_BANK_ENABLED flips to true and matches within 0.05 tolerance', () => {
    const futurePresets = buildFactoryLutheriePresets({ caixa: true, tarol: true, timbal: true });
    for (const p of futurePresets) {
      expect(Math.abs(p.tunings.caixa)).toBeLessThanOrEqual(2.0);
      expect(Math.abs(p.tunings.tarol)).toBeLessThanOrEqual(2.0);
      expect(Math.abs(p.tunings.timbal)).toBeLessThanOrEqual(5.0);
    }

    const gongueMinor = FACTORY_LUTHERIE_PRESETS.find((p) => p.id === 'gongue_minor')!;
    expect(
      isLutheriePresetMatching(
        gongueMinor,
        { ...gongueMinor.tunings, marcante: -0.47, meiao: 0.33 },
        gongueMinor.decays
      )
    ).toBe(true);
    expect(computeTuningForTargetMidi('marcante', 38)).toBe(0.5);
  });
});
