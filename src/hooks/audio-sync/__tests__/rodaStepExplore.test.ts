// @ts-ignore — vitest est exécuté via npx vitest hors devDependencies locales
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearFreeze, frozenPlaybackState } from '../frozenPlaybackState';
import { resetLiveVariationLookahead } from '../liveVariationLookaheadEngine';
import { stepExploreRoda, RodaStepExploreContext } from '../rodaStepExplorer';
import { subscribeToTick, unsubscribeFromTick } from '../audioSyncTypes';
import { computeContinuousSweepRatio } from '../../../components/circle-sequencer/rodaSweepMath';
import { resetStepExploreThrottle, tryHandleRodaStepExploreKeyDown } from '../../keyboard-shortcuts/rodaStepExploreGuard';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { useTransportStore } from '../../../stores/useTransportStore';

function buildExploreTestCtx(overrides: Partial<RodaStepExploreContext> = {}) {
  const playNoteCalls: Array<{ trackId: any; stroke: string; time: number; vel: number; decay: number; maxDur?: number }> = [];
  const mockEngine: any = {
    currentMeasure: 0, currentStep: 0, getCurrentTime: () => 10.0, getIsPlaying: () => false,
    playNote: (trackId: any, stroke: string, time: number, vel: number, decay: number, _hold?: boolean, maxDur?: number) => {
      playNoteCalls.push({ trackId, stroke, time, vel, decay, maxDur });
    },
  };
  const tracks: any[] = [{
    id: 1, instrumentIdx: 0, isMute: false, isSolo: false,
    patterns: [{
      id: 101, name: 'Base', steps: 16, measureAssignments: [true, true, true, true],
      activeSteps: ['D', ['e', 'D'], 'B', 0, 'D', 0, 0, 0, 'E', 0, 0, 0, 'D', 0, 0, 'e'],
      volumes: [80, [60, 90], 75], decays: [100, [80, 100], 100],
    }],
  }];
  const measureChanges: number[] = [];
  const ctx: RodaStepExploreContext = {
    audioEngine: mockEngine, tracksRef: { current: tracks }, totalMeasuresRef: { current: 4 },
    measureCountRef: { current: 0 }, currentStepIndexRef: { current: -1 }, maxTicksRef: { current: 96 },
    measureTimeSigsRef: { current: { 0: '4/4', 1: '2/4', 2: '6/8', 3: '4/4' } },
    measureBpmsRef: { current: [120, 120, 120, 120] },
    isLoopRegionActiveRef: { current: false }, loopStartRef: { current: null }, loopEndRef: { current: null },
    isLoopExitRequestedRef: { current: false }, soloPatternPlayIdRef: { current: null },
    soloPatternVariationIdRef: { current: null }, activeVariationsRef: { current: {} },
    tickEventDetailRef: { current: {} },
    setCurrentMeasure: (m: number) => { measureChanges.push(m); useSequencerStore.getState().setCurrentMeasure(m); },
    ...overrides,
  };
  return { ctx, playNoteCalls, measureChanges, tracks };
}

describe('Mission 2 — Exploration pas-à-pas (← / →) Roda, Balai +180°, Audio Ra/Barulho & Garde Clavier', () => {
  beforeEach(() => {
    clearFreeze(); resetLiveVariationLookahead(); resetStepExploreThrottle();
    (globalThis as any).__OGIRADOR_VIEW_MODE__ = 'roda'; (globalThis as any).oGiradorDetailEditorOpen = false;
    useTransportStore.getState().setIsPaused(false);
    useSequencerStore.setState({
      isPlaying: false, currentMeasure: 0, totalMeasures: 4, editingTrackId: null,
      isLoopRegionActive: false, loopStartMeasure: null, loopEndMeasure: null,
      tocarJuntoActive: false, tocarJuntoTrackId: null, rodaSweepMode: 'sweep6h',
      measureTimeSigs: ['4/4', '2/4', '6/8', '4/4'],
    });
  });

  it('engage Pause à step=0 sur 1er → depuis Stop, planifie Ra [sub1, sub2] sur Web Audio et borne Barulho', () => {
    const { ctx, playNoteCalls, measureChanges } = buildExploreTestCtx();
    stepExploreRoda('next', ctx);
    expect(frozenPlaybackState.active).toBe(true);
    expect(useTransportStore.getState().isPaused).toBe(true);
    expect(frozenPlaybackState.measure).toBe(0);
    expect(frozenPlaybackState.step).toBe(0);
    expect(measureChanges).toHaveLength(0);
    expect(playNoteCalls).toHaveLength(1);
    expect(playNoteCalls[0].stroke).toBe('D');
    expect(playNoteCalls[0].time).toBeCloseTo(10.0, 5);

    playNoteCalls.length = 0;
    stepExploreRoda('next', ctx); // step = 1 : Ra ['e', 'D'] à 120 BPM (0.125s -> +0s et +0.0625s)
    expect(frozenPlaybackState.step).toBe(1);
    expect(playNoteCalls).toHaveLength(2);
    expect(playNoteCalls[0].stroke).toBe('e');
    expect(playNoteCalls[0].time).toBeCloseTo(10.0, 5);
    expect(playNoteCalls[1].stroke).toBe('D');
    expect(playNoteCalls[1].time).toBeCloseTo(10.0625, 5);

    playNoteCalls.length = 0;
    stepExploreRoda('next', ctx); // step = 2 : Barulho 'B' borné à stepDurationSec (0.125s)
    expect(playNoteCalls).toHaveLength(1);
    expect(playNoteCalls[0].stroke).toBe('B');
    expect(playNoteCalls[0].maxDur).toBeCloseTo(0.125, 5);
  });

  it('franchit 12h en ← / → avec respect des signatures (4/4, 2/4, 6/8), de la boucle et du balai +180° à froid', () => {
    useSequencerStore.setState({ isLoopRegionActive: true, loopStartMeasure: 0, loopEndMeasure: 1 });
    const { ctx, measureChanges } = buildExploreTestCtx({
      isLoopRegionActiveRef: { current: true }, loopStartRef: { current: 0 }, loopEndRef: { current: 1 },
    });

    stepExploreRoda('prev', ctx); // 1er ← depuis Stop sur M0 -> dernier pas de M1 (2/4 = 8 pas -> step = 7)
    expect(frozenPlaybackState.measure).toBe(1);
    expect(frozenPlaybackState.totalSteps).toBe(8);
    expect(frozenPlaybackState.step).toBe(7);
    expect(measureChanges).toEqual([1]);

    stepExploreRoda('next', ctx); // → depuis (M1, step = 7) franchit 12h et reboucle sur M0, step = 0
    expect(frozenPlaybackState.measure).toBe(0);
    expect(frozenPlaybackState.step).toBe(0);
    expect(measureChanges).toEqual([1, 0]);
    // Hors boucle partielle : ← depuis M0 (4/4) recule à M3 (4/4, step = 15, progress = 15/16 >= 0.5) -> balai +180° actif
    ctx.isLoopRegionActiveRef!.current = false;
    useSequencerStore.setState({ isLoopRegionActive: false });
    stepExploreRoda('prev', ctx);
    expect(frozenPlaybackState.measure).toBe(3);
    expect(frozenPlaybackState.step).toBe(15);
    expect(computeContinuousSweepRatio(true, frozenPlaybackState.progress, 'sweep6h', 3, 0)).toBeCloseTo(15 / 16 - 0.5, 5);
    stepExploreRoda('next', ctx); // → refranchit 12h vers M0 (4/4, step = 0) -> traîne du balai à 6h (0.5)
    expect(computeContinuousSweepRatio(true, frozenPlaybackState.progress, 'sweep6h', 0, 1)).toBeCloseTo(0.5, 5);
  });

  it('garde la piste muette en Tocar Junto mais émet le tick isStepPreview, et verrouille la barrière clavier + throttle 95 ms', () => {
    useSequencerStore.setState({ tocarJuntoActive: true, tocarJuntoIsMuted: true, tocarJuntoTrackId: 1 });
    const { ctx, playNoteCalls } = buildExploreTestCtx();
    let lastTick: any = null;
    const onTick = (d: any) => { lastTick = { ...d }; };
    subscribeToTick(onTick); stepExploreRoda('next', ctx); unsubscribeFromTick(onTick);

    expect(playNoteCalls).toHaveLength(0);
    expect(lastTick?.isStepPreview).toBe(true);
    expect(lastTick?.isPaused).toBe(true);

    const exploreSpy = vi.fn();
    const rangeInput: any = { nodeType: 1, tagName: 'INPUT', type: 'range', blur: vi.fn() };
    const mkEvt = (over: any = {}) => ({
      key: 'ArrowRight', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, repeat: false,
      target: rangeInput, preventDefault: vi.fn(), stopPropagation: vi.fn(), ...over,
    } as any);

    expect(tryHandleRodaStepExploreKeyDown(mkEvt(), exploreSpy, { nowMs: 1000 })).toBe(true);
    expect(rangeInput.blur).toHaveBeenCalled();
    expect(exploreSpy).toHaveBeenCalledTimes(1);

    const repEvt = mkEvt({ repeat: true });
    expect(tryHandleRodaStepExploreKeyDown(repEvt, exploreSpy, { nowMs: 1040 })).toBe(true);
    expect(repEvt.preventDefault).toHaveBeenCalled();
    expect(exploreSpy).toHaveBeenCalledTimes(1);

    expect(tryHandleRodaStepExploreKeyDown(mkEvt(), exploreSpy, { isPlayingOverride: true, nowMs: 1200 })).toBe(false);
    useSequencerStore.setState({ editingTrackId: 1 });
    expect(tryHandleRodaStepExploreKeyDown(mkEvt(), exploreSpy, { nowMs: 1300 })).toBe(false);
  });
});
