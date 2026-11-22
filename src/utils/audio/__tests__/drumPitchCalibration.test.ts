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
import {
  buildFactoryLutheriePresets,
  DEFAULT_SIGNATURE_TUNINGS,
  getDefaultSignatureTuning,
} from '../lutherieFactoryPresets';
import { FACTORY_LUTHERIE_PRESETS, isLutheriePresetMatching } from '../lutheriePresetsStorage';
import { useWizardStore } from '../../../stores/useWizardStore';
import { buildDefaultBatuqueTracks } from '../../../stores/helpers/defaultBatuqueTemplateTracks';

describe('Studio f0 Calibration (10/10 Banks), Signature C Major + G4 Default & Harmonic Presets', () => {
  it('locks exact measured fundamentals for the 3 Studio Alfaias, Caixa, Tarol (214.84 / 292.36 Hz), Timbal & Gonguê', () => {
    expect(getDrumNaturalBaseHz('marcante')).toBe(71.21);
    expect(getDrumNaturalBaseHz('meiao')).toBe(81.11);
    expect(getDrumNaturalBaseHz('repique')).toBe(96.33);
    expect(getDrumNaturalBaseHz('caixa')).toBe(165.41);
    expect(getDrumNaturalBaseHz('caixa', { caixa: false })).toBe(166.87);
    expect(getDrumNaturalBaseHz('tarol')).toBe(214.84);
    expect(getDrumNaturalBaseHz('tarol', { tarol: false })).toBe(203.03);
    expect(getDrumNaturalBaseHz('timbal')).toBe(198.27);
    expect(getDrumNaturalBaseHz('timbal', { timbal: false })).toBe(206.91);
    expect(getDrumNaturalBaseHz('gongue')).toBe(411.97);
    for (const role of ['marcante', 'meiao', 'repique', 'caixa', 'tarol', 'timbal', 'gongue'] as const) {
      expect(isDrumStudioBankActive(role)).toBe(true);
    }
    expect(DRUM_FUNDAMENTAL_SPECS.caixa.secondaryHz).toBe(267.55);
    expect(DRUM_FUNDAMENTAL_SPECS.tarol.studioSecondaryHz).toBe(292.36);
    expect(DRUM_FUNDAMENTAL_SPECS.timbal.studioSecondaryHz).toBe(60.8);
    expect(DRUM_FUNDAMENTAL_SPECS.timbal.secondaryHz).toBe(95.39);
  });

  it('includes gongue & tarol in TUNEABLE_INSTRUMENTS and preserves 0.1st & falsy-zero tuning in EngineTuning', () => {
    expect(TUNEABLE_INSTRUMENTS.has('gongue')).toBe(true);
    expect(TUNEABLE_INSTRUMENTS.has('tarol')).toBe(true);
    const gongueCfg: any = { id: 'gongue', name: 'Gonguê', strokes: [], macroPitch: 1.0 };
    expect(EngineTuning.calculateTotalSemitones('gongue', gongueCfg, { tuning: 0 } as any)).toBe(0);
    expect(EngineTuning.calculateTotalSemitones('gongue', gongueCfg, { tuning: -0.9 } as any)).toBe(-0.9);
    expect(EngineTuning.calculatePitch('gongue', gongueCfg, { tuning: 12 } as any)).toBeCloseTo(2.0, 6);
    expect(getDefaultSignatureTuning('marcante')).toBe(-1.5);
    expect(getDefaultSignatureTuning('tarol')).toBe(0);
    expect(getDefaultSignatureTuning('gongue')).toBe(-0.9);
    expect(getDefaultSignatureTuning('agbe')).toBe(0);
  });

  it('computes accurate FR/PT notes, Hz, and cents badges (|cents| >= 5) including Tarol Sol3 (-1.6st) & Gonguê Sol4 (-0.9st)', () => {
    const tarol0 = getDrumPitchNoteInfo('tarol', 0, 'fr');
    expect(tarol0.badgeText).toBe('La3 -41c (A3) • 214.8 Hz | 0 st');

    const tarolSol3 = getDrumPitchNoteInfo('tarol', -1.6, 'fr');
    expect(tarolSol3.noteLabel).toBe('Sol3');
    expect(tarolSol3.intlNote).toBe('G3');
    expect(Math.abs(tarolSol3.cents)).toBeLessThanOrEqual(4);

    const gongueSol4 = getDrumPitchNoteInfo('gongue', -0.9, 'fr');
    expect(gongueSol4.noteLabel).toBe('Sol4');
    expect(gongueSol4.intlNote).toBe('G4');
    expect(Math.abs(gongueSol4.cents)).toBeLessThanOrEqual(4);
    expect(gongueSol4.centsLabel).toBe('');
  });

  it('orders major_triad (Do Majeur + Sol4) 1st and studio_natural last with <= 4 cents accuracy', () => {
    expect(FACTORY_LUTHERIE_PRESETS.map((p) => p.id)).toEqual([
      'major_triad', 'minor_triad', 'fifth_octave', 'fast_tight', 'studio_natural',
    ]);
    const byId = Object.fromEntries(FACTORY_LUTHERIE_PRESETS.map((p) => [p.id, p]));

    expect(byId.major_triad.tunings).toEqual(DEFAULT_SIGNATURE_TUNINGS);
    expect(byId.major_triad.tunings.caixa).toBe(0);
    expect(byId.major_triad.tunings.tarol).toBe(0);
    expect(byId.major_triad.tunings.timbal).toBe(-0.2);
    expect(byId.minor_triad.tunings).toEqual({
      marcante: 0.5, meiao: 1.3, repique: 2.3, caixa: -2.0, tarol: 0.4, timbal: 1.8, gongue: 1.1,
    });
    expect(byId.fifth_octave.tunings).toEqual({
      marcante: -4.5, meiao: 0.3, repique: 2.3, caixa: 0, tarol: 0.4, timbal: 1.8, gongue: 1.1,
    });
    expect(byId.fast_tight.tunings).toEqual({
      marcante: 0.5, meiao: 2.3, repique: 2.3, caixa: -2.0, tarol: 0.4, timbal: 1.8, gongue: 1.1,
    });
    expect(byId.fast_tight.decays).toMatchObject({ marcante: 68, meiao: 74, repique: 82, gongue: 90 });
    expect(byId.studio_natural.tunings).toEqual({
      marcante: 0, meiao: 0, repique: 0, caixa: 0, tarol: 0, timbal: 0, gongue: 0,
    });

    for (const presetId of ['major_triad', 'minor_triad', 'fifth_octave', 'fast_tight']) {
      const p = byId[presetId];
      for (const role of ['marcante', 'meiao', 'repique', 'timbal', 'gongue'] as const) {
        const info = getDrumPitchNoteInfo(role, p.tunings[role], 'fr');
        expect(Math.abs(info.cents)).toBeLessThanOrEqual(4);
      }
    }
    for (const presetId of ['minor_triad', 'fifth_octave', 'fast_tight']) {
      expect(Math.abs(getDrumPitchNoteInfo('tarol', byId[presetId].tunings.tarol, 'fr').cents)).toBeLessThanOrEqual(4);
    }
  });

  it('bounds caixa/tarol to [-2.0, +2.0 st] and matches within 0.05 tolerance', () => {
    const presets = buildFactoryLutheriePresets();
    for (const p of presets) {
      expect(Math.abs(p.tunings.caixa)).toBeLessThanOrEqual(2.0);
      expect(Math.abs(p.tunings.tarol)).toBeLessThanOrEqual(2.0);
      expect(Math.abs(p.tunings.timbal)).toBeLessThanOrEqual(5.0);
    }

    const majorTriad = FACTORY_LUTHERIE_PRESETS[0];
    expect(isLutheriePresetMatching(majorTriad, { ...majorTriad.tunings, marcante: -1.47, tarol: 0.02 }, majorTriad.decays)).toBe(true);
    expect(computeTuningForTargetMidi('tarol', 55)).toBe(-1.6);
  });

  it('seeds Wizard store and Studio Batuque default templates with C Major + G4 signature tunings (Tarol 0 st)', () => {
    expect(useWizardStore.getState().instrumentTunings).toEqual(DEFAULT_SIGNATURE_TUNINGS);
    useWizardStore.getState().setInstrumentTuning('tarol', 1.5);
    useWizardStore.getState().resetWizard();
    expect(useWizardStore.getState().instrumentTunings).toEqual(DEFAULT_SIGNATURE_TUNINGS);

    const tplTracks = buildDefaultBatuqueTracks('wood_studio');
    const byInstIdx = new Map(tplTracks.filter((t) => !t.isBusFolder).map((t) => [t.instrumentIdx, t.tuning]));
    expect(byInstIdx.get(0)).toBe(-1.5);
    expect(byInstIdx.get(1)).toBe(0.3);
    expect(byInstIdx.get(2)).toBe(0.3);
    expect(byInstIdx.get(3)).toBe(0);
    expect(byInstIdx.get(4)).toBe(0);
    expect(byInstIdx.get(5)).toBe(-0.9);
  });
});
