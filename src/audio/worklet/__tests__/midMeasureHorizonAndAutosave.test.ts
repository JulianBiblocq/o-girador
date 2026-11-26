// @ts-ignore
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EngineVoiceSynthManager } from '../../engine/engineVoiceSynth';
import { prewarmVocalGraphForTracks } from '../../vocal/vocalGraphPrewarmer';
import { activeVocals } from '../../vocal/vocalTypes';
import {
  computeHorizonMidPushTick,
  extendWorkletHorizonMidMeasure,
  pushWorkletHorizonAtMeasureBoundary,
  resetWorkletHorizonState,
} from '../horizon/percussionHorizonPusher';
import { createPlaybackAutosaveGate } from '../../../hooks/app-audio/useAutosaveSubscription';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { attachCompiledTrackIds } from '../../../workers/compiler/compiledTrackIdResolver';
import { packNoteData } from '../../../workers/compiler/stepNotePacker';

describe('Déport d’Horizon Worklet (midPushTick 4/4 & 2/4), Pré-instanciation Vocale sobre & Flush Autosave', () => {
  beforeEach(() => {
    resetWorkletHorizonState();
    activeVocals.clear();
  });

  it('calcule midPushTick (4/4 -> 36, 2/4 -> 18, 3/4 & 6/8 -> 27), évite tout push sur step 0 nominal et couvre les sauts imprévus', () => {
    expect(computeHorizonMidPushTick(96)).toBe(36);
    expect(computeHorizonMidPushTick(48)).toBe(18);
    expect(computeHorizonMidPushTick(72)).toBe(27);

    const pat: any = { id: 1, name: 'Baque', steps: 16, activeSteps: ['D', ...Array(15).fill(0)], measureAssignments: [true, true, true, true, true, true] };
    const percTrack: any = { id: 1, instrumentIdx: 0, patterns: [pat], isMute: false, isSolo: false };
    const sigs = { 0: '4/4', 1: '4/4', 2: '2/4', 3: '2/4', 4: '4/4', 5: '2/4' };
    const startTicks = [0, 96, 192, 240, 288, 384];
    const tuples: number[] = [];
    for (let m = 0; m < 6; m++) tuples.push(startTicks[m], packNoteData(0, 0, 'D'.charCodeAt(0), 100, false, false), 0.9, 0);
    const schedule = new Float64Array(tuples);
    attachCompiledTrackIds(schedule as any, [1]);

    let pushCalls = 0;
    const engine: any = {
      workletReady: true, configMap: new Map(), getSampleRate: () => 48000, getCurrentTime: () => 0, getIsPlaying: () => true,
      syncTracksToWorklet: vi.fn(), isTrackRoutedToWorklet: () => true, getTrackSlot: () => 1,
      getTrackUnisonDelaySec: () => 0, getTrackBalancoAdherence: () => 1, getTrackPitchRatio: () => 1,
      selectRoundRobinFile: () => 'm_d1.ogg', getSampleId: () => 1,
      strokesMaps: new Map([['marcante', new Map([['D', { symbol: 'D', keys: ['D'], caseSensitive: true, files: ['m_d1.ogg'], baseGain: 1.0 }]])]]),
      pushWorkletEvents: () => { pushCalls += 1; }, purgeWorkletFromFrame: vi.fn(), purgeRoundRobinFromTime: vi.fn(),
      getOrCreateVoiceSynth: vi.fn(),
    };
    useSequencerStore.setState({ tracks: [percTrack], totalMeasures: 6, bpm: 120 });
    const hCtx: any = {
      engine, tracksRef: { current: [percTrack] }, totalMeasuresRef: { current: 6 },
      measureTimeSigsRef: { current: sigs }, measureBpmsRef: { current: [120, 120, 120, 120, 120, 120] },
      soloPatternPlayIdRef: { current: null }, soloPatternVariationIdRef: { current: null },
      isLoopingRef: { current: true }, isLoopRegionActiveRef: { current: false },
      loopStartRef: { current: null }, loopEndRef: { current: null },
      globalSwingRef: { current: { mode: 'off', customOffsets: [0, 0, 0, 0] } },
      flatCompiledScheduleRef: { current: schedule },
    };

    pushWorkletHorizonAtMeasureBoundary(0, 0, hCtx, 0, 1);
    expect(pushCalls).toBe(4);

    pushCalls = 0;
    pushWorkletHorizonAtMeasureBoundary(2, 1, hCtx, 0, 2);
    expect(pushCalls).toBe(0);

    extendWorkletHorizonMidMeasure(hCtx);
    expect(pushCalls).toBe(1);

    // Frontière vers mesure 2/4 (M2) : toujours 0 push sur step 0, puis extension à midPushTick = 18
    pushCalls = 0;
    pushWorkletHorizonAtMeasureBoundary(4, 2, hCtx, 0, 3);
    expect(pushCalls).toBe(0);
    extendWorkletHorizonMidMeasure(hCtx);
    expect(pushCalls).toBe(1);

    // Filet de sécurité : saut tardif imprévu vers M5 sur step 0 -> reconstruit immédiatement
    pushCalls = 0;
    pushWorkletHorizonAtMeasureBoundary(5, 5, hCtx, 0, 0);
    expect(pushCalls).toBe(4);

    prewarmVocalGraphForTracks([percTrack], engine);
    expect(engine.getOrCreateVoiceSynth).not.toHaveBeenCalled();
    expect(activeVocals.size).toBe(0);
    const mgr = new EngineVoiceSynthManager();
    const fakeSynth = { releaseAll: vi.fn(), disconnect: vi.fn(), dispose: vi.fn() };
    mgr.voiceSynths.set('10', fakeSynth);
    mgr.releaseAllVoices();
    expect(fakeSynth.releaseAll).toHaveBeenCalledTimes(1);
    expect(fakeSynth.dispose).not.toHaveBeenCalled();
  });

  it('diffère l’autosave pendant isPlaying === true et flush immédiatement au Stop/Pause et visibilitychange/pagehide', () => {
    const gate = createPlaybackAutosaveGate();
    expect(gate.onStoreChange(true, false)).toBe('defer');
    expect(gate.onStoreChange(true, true)).toBe('defer');
    expect(gate.onForceSave(true)).toBe('defer');
    expect(gate.hasPending()).toBe(true);

    expect(gate.onStoreChange(false, true)).toBe('flush_now');
    expect(gate.hasPending()).toBe(false);
    expect(gate.onStoreChange(false, false)).toBe('debounce');

    gate.onStoreChange(true, false);
    expect(gate.onVisibilityOrPageHide()).toBe(true);
    expect(gate.hasPending()).toBe(false);
  });
});
