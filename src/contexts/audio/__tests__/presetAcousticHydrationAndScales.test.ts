// @ts-ignore
import { describe, expect, it } from 'vitest';
import { applyInsertEqTargets } from '../../../audio/effects/insertEqTargets';
import {
  CURRENT_LUTHERIE_VERSION,
  convertLegacyReverbDbToPercent,
  normalizePresetAcousticsOnLoad,
} from '../acousticNormalizer';
import { restoreMasterFxFromPreset } from '../audioMasterFxRestorer';
import { restorePresetLoopState } from '../audioPresetLoopRestorer';
import { migrateAndSanitizePresetTracks } from '../audioPresetTracksMigrator';
import {
  CURRENT_AUDIO_SCALE_VERSION,
  normalizeToFaderPosition,
  sanitizeMasterVolumeDb,
} from '../../../utils/audioMath';
import { useSequencerStore } from '../../../stores/useSequencerStore';

describe('Volet 1 — Hydratation Acoustique Legacy vs Préservation v2/v3, Reset EQ & Échelles Master', () => {
  it('convertit la hiérarchie v1 des volumes intermédiaires (82, 94, 100 -> 71, 74, 75) et recalibre les grilles figées à 100/80 vers 70 sans muter le preset source', () => {
    expect(normalizeToFaderPosition(0, false)).toBe(0);
    expect(normalizeToFaderPosition(-5, false)).toBe(0);
    const v82 = normalizeToFaderPosition(82, false);
    const v94 = normalizeToFaderPosition(94, false);
    const v100 = normalizeToFaderPosition(100, false);
    expect([v82, v94, v100]).toEqual([71, 74, 75]);

    const legacyPreset: any = {
      version: 3, totalMeasures: 4, masterReverbVol: -7.5,
      tracks: [
        { id: 1, instrumentIdx: 0, volumeVal: 100, patterns: [{ id: 10, steps: 4, activeSteps: ['D', 0, 'E', 0], volumes: [100, 100, 100, 100], measureAssignments: [true, true, true, true] }] },
        { id: 2, instrumentIdx: 3, volumeVal: 82, reverbVal: 38, patterns: [{ id: 20, steps: 4, activeSteps: ['D', 'e', 'D', 'e'], volumes: [100, 80, 52, 80], measureAssignments: [true, true, true, true] }] },
      ],
    };
    const snapshotBefore = JSON.stringify(legacyPreset);
    const hydrated = migrateAndSanitizePresetTracks({ ...legacyPreset }, 4, false);

    expect(JSON.stringify(legacyPreset)).toBe(snapshotBefore);
    expect(hydrated[0].volumeVal).toBe(75);
    expect(hydrated[1].volumeVal).toBe(71);
    expect(hydrated[0].patterns[0].volumes).toEqual([70, 70, 70, 70]);
    expect(hydrated[1].patterns[0].volumes).toEqual([100, 70, 52, 70]);
    expect(hydrated[1].eqBands).toBeUndefined();
    expect(hydrated[1].fxSends).toEqual({ reverb: 38, distortion: 0 });
  });

  it('préserve 100 % du mixage utilisateur volontaire sur un preset récent (audioScaleVersion=2, lutherieVersion=3)', () => {
    const modernPreset: any = {
      version: 3, audioScaleVersion: CURRENT_AUDIO_SCALE_VERSION, lutherieVersion: CURRENT_LUTHERIE_VERSION, totalMeasures: 4,
      tracks: [{
        id: 10, instrumentIdx: 0, volumeVal: 100, panVal: -35, lowCut: true,
        eqBands: { low: { f: 95, g: 5 }, mid: { f: 2250, g: 4, q: 'narrow' }, high: { f: 6700, g: -3 } },
        fxSends: { reverb: 24, distortion: 15 },
        patterns: [
          { id: 1, steps: 4, activeSteps: ['D', 'E', 'D', 'E'], volumes: [100, 100, 100, 100], measureAssignments: [true, true, true, true] },
          { id: 2, steps: 4, activeSteps: ['D', 'e', 'D', 'e'], volumes: [80, 94, 70, 80], measureAssignments: [false, false, false, false] },
        ],
      }],
    };
    normalizePresetAcousticsOnLoad(modernPreset);
    const tracks = migrateAndSanitizePresetTracks(modernPreset, 4, true);
    expect(tracks[0].volumeVal).toBe(100);
    expect(tracks[0].patterns[0].volumes).toEqual([100, 100, 100, 100]);
    expect(tracks[0].patterns[1].volumes).toEqual([80, 94, 70, 80]);
    expect(tracks[0].eqBands).toEqual({ low: { f: 95, g: 5 }, mid: { f: 2250, g: 4, q: 'narrow' }, high: { f: 6700, g: -3 } });
    expect(tracks[0].fxSends).toEqual({ reverb: 24, distortion: 15 });
  });

  it('ramène explicitement les 3 filtres Biquad EQ à 0 dB lorsque track.eqBands devient undefined au changement de morceau', () => {
    const mkFilter = (f: number, g = 0, q = 0.7071) => ({ frequency: { value: f }, gain: { value: g }, Q: { value: q } });
    const lowCut: any = mkFilter(80);
    const eqNodes: any = { low: mkFilter(95, 6), mid: mkFilter(2200, -4, 2.5), high: mkFilter(9500, 5) };

    applyInsertEqTargets(lowCut, eqNodes, { instrumentIdx: 0, eqBands: undefined, lowCut: false }, false);
    expect(lowCut.frequency.value).toBe(20);
    expect([eqNodes.low.gain.value, eqNodes.mid.gain.value, eqNodes.high.gain.value]).toEqual([0, 0, 0]);
    expect([eqNodes.low.frequency.value, eqNodes.mid.frequency.value, eqNodes.high.frequency.value]).toEqual([100, 1000, 8000]);
  });

  it('sécurise masterVol (strictement en dB), masterReverbVol, reverbDecay et synchronise les 6 refs de boucle', () => {
    expect(convertLegacyReverbDbToPercent(-7.5)).toBe(18);
    expect(convertLegacyReverbDbToPercent(-50)).toBe(0);
    expect(convertLegacyReverbDbToPercent(35)).toBe(35);
    expect(sanitizeMasterVolumeDb(-3.2, false)).toBeCloseTo(-3.2, 5);
    expect(sanitizeMasterVolumeDb(NaN, true)).toBe(0);
    expect(sanitizeMasterVolumeDb(75, true)).toBe(0);
    expect(sanitizeMasterVolumeDb(100, false)).toBe(0);
    expect(sanitizeMasterVolumeDb(-80, true)).toBe(-Infinity);

    let appliedVol = -99, appliedRev = -1, appliedDecay = -1;
    restoreMasterFxFromPreset(
      { masterVol: -3.2, masterReverbVol: -7.5, reverbDecay: NaN },
      () => {}, () => {},
      (v) => { appliedVol = v; }, (r) => { appliedRev = r; }, (d) => { appliedDecay = d; }
    );
    expect(appliedVol).toBeCloseTo(-3.2, 5);
    expect(appliedRev).toBe(18);
    expect(Number.isFinite(appliedDecay)).toBe(true);

    useSequencerStore.setState({ currentLoopIteration: 4, isLoopBypassed: true, isLoopExitRequested: true });
    const seqMock: any = {
      setLoopStartMeasure: () => {}, setLoopEndMeasure: () => {}, setIsLoopRegionActive: () => {}, setIsLooping: () => {},
      loopModeRef: { current: 1 }, isLoopRegionActiveRef: { current: false },
      loopStartRef: { current: null }, loopEndRef: { current: null },
      isLoopingRef: { current: false }, isLoopExitRequestedRef: { current: true },
    };
    restorePresetLoopState({ loopMode: 4, loopStartMeasure: 2, loopEndMeasure: 5, isLoopRegionActive: true, isLooping: true }, seqMock);
    const st = useSequencerStore.getState();
    expect([st.currentLoopIteration, st.isLoopBypassed, st.isLoopExitRequested]).toEqual([1, false, false]);
    expect([seqMock.loopModeRef.current, seqMock.isLoopRegionActiveRef.current, seqMock.loopStartRef.current, seqMock.loopEndRef.current, seqMock.isLoopingRef.current, seqMock.isLoopExitRequestedRef.current]).toEqual([4, true, 2, 5, true, false]);
  });
});
