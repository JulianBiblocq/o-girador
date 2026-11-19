// @ts-ignore — vitest est exécuté via npx vitest hors devDependencies locales
import { describe, it, expect, beforeEach } from 'vitest';
import { frozenPlaybackState, freezeAt, setFrozenStep, clearFreeze } from '../frozenPlaybackState';
import { executeTransportStop } from '../transportStop';
import { executeTransportRewind, resetRewindDoubleClickHistory } from '../transportRewind';
import { computeStickAngle } from '../../../components/circle-sequencer/computeStickAngle';
import { isEditableTarget } from '../../../utils/crossRealmDom';
import { useTransportStore } from '../../../stores/useTransportStore';
import { useSequencerStore } from '../../../stores/useSequencerStore';

function buildMockTransportCtx(overrides: Record<string, any> = {}) {
  const store = useSequencerStore.getState();
  return {
    autoStopTimeoutRef: { current: null as number | null },
    speedTrainerTimeoutsRef: { current: [] as number[] },
    engineTimeoutsRef: { current: new Set<number>() },
    pendingMeasureRef: { current: null as number | null },
    pendingIterationRef: { current: null as number | null },
    soloPatternPlayIdRef: { current: null as number | null },
    mutedVoiceTracksRef: { current: new Set<string | number>() },
    hitTriggersRef: { current: { clear: () => {} } },
    lastPlayedPatternRef: { current: {} as Record<number, any> },
    isPreRollActiveRef: { current: false },
    preRollRemainingMeasuresRef: { current: 0 },
    targetPreRollMeasureRef: { current: 0 },
    totalMeasuresRef: { current: 8 },
    measureTimeSigsRef: { current: { 0: '4/4', 1: '2/4', 2: '6/8', 3: '4/4', 4: '4/4' } as Record<number, string> },
    activeSequencerVocalsRef: { current: new Map<string, any>() },
    anticipatedMeasuresRef: { current: new Set<string>() },
    lastElapsedSecRef: { current: 0 },
    isPlayingRef: { current: false },
    anchoredMeasureStartSecRef: { current: 0 },
    anchoredMeasureIdxRef: { current: -1 },
    currentStepIndexRef: { current: -1 },
    hasFinishedRef: { current: false },
    isPlaybackEndingRef: { current: false },
    measureCountRef: { current: 0 },
    sectionIterationRef: { current: 1 },
    soloLoopCycleRef: { current: 0 },
    maxTicksRef: { current: 96 },
    lastPlayedSignalIdRef: { current: null as string | null },
    tickEventDetailRef: { current: {} as any },
    isLoopRegionActiveRef: { current: false },
    loopStartRef: { current: null as number | null },
    audioEngine: null,
    setIsPlaying: (p: boolean) => store.setIsPlaying(p),
    setSoloPatternPlayId: () => {},
    setCurrentMeasure: (m: number) => store.setCurrentMeasure(m),
    ...overrides,
  };
}

describe('Mission 1 — frozenPlaybackState, Pause/Stop, Rewind & Barrière Clavier', () => {
  beforeEach(() => {
    clearFreeze();
    resetRewindDoubleClickHistory();
    useTransportStore.getState().setIsPaused(false);
    useSequencerStore.setState({
      isPlaying: false, currentMeasure: 0, totalMeasures: 8,
      isLoopRegionActive: false, loopStartMeasure: null, loopEndMeasure: null,
    });
  });

  it('fige et avance pas-à-pas frozenPlaybackState en 4/4, 2/4 et 6/8 + maintient computeStickAngle hors lecture', () => {
    freezeAt({ measure: 2, step: 6, totalSteps: 12, progress: 0.5, tick: 36, maxTicks: 72 });
    expect(frozenPlaybackState.active).toBe(true);
    expect(frozenPlaybackState.measure).toBe(2);
    expect(frozenPlaybackState.step).toBe(6);
    expect(frozenPlaybackState.totalSteps).toBe(12);
    expect(frozenPlaybackState.progress).toBeCloseTo(0.5, 5);

    const frozenAngleRef = { current: -Math.PI / 2 };
    const angle = computeStickAngle({ step: 36, measure: 2, maxTicks: 72, ratio: 0.5, iteration: 1, time: 0 }, false, 10, frozenAngleRef);
    expect(angle).toBeCloseTo(-Math.PI / 2 + Math.PI, 5);

    setFrozenStep(1, 3, 8, 48);
    expect(frozenPlaybackState.measure).toBe(1);
    expect(frozenPlaybackState.step).toBe(3);
    expect(frozenPlaybackState.progress).toBeCloseTo(3 / 8, 5);
    expect(frozenPlaybackState.tick).toBe(18);

    clearFreeze();
    expect(frozenPlaybackState.active).toBe(false);
    const restAngle = computeStickAngle({ step: -1, measure: 1, maxTicks: 48, ratio: 0, iteration: 1, time: 0 }, false, 10, frozenAngleRef);
    expect(restAngle).toBeCloseTo(-Math.PI / 2, 5);
  });

  it('1er Stop cale à 12h (step = -1) sur la mesure courante ; 2e Stop à l arrêt ramène à la Mesure 1 (0)', () => {
    freezeAt({ measure: 5, step: 8, totalSteps: 16, progress: 0.5, tick: 48, maxTicks: 96 });
    useTransportStore.getState().setIsPaused(true);
    const ctx = buildMockTransportCtx({ measureCountRef: { current: 5 } });

    executeTransportStop(ctx);
    expect(frozenPlaybackState.active).toBe(false);
    expect(useTransportStore.getState().isPaused).toBe(false);
    expect(ctx.measureCountRef.current).toBe(5);
    expect(useSequencerStore.getState().currentMeasure).toBe(5);
    expect(ctx.tickEventDetailRef.current.step).toBe(-1);

    // 2e Stop alors que déjà à l'arrêt complet -> ramène à la Mesure 1 (0)
    executeTransportStop(ctx);
    expect(ctx.measureCountRef.current).toBe(0);
    expect(useSequencerStore.getState().currentMeasure).toBe(0);
  });

  it('Retour au début (⏮) : 1er clic -> loopStartMeasure, 2e clic -> Mesure 1 (0)', () => {
    useSequencerStore.setState({ isLoopRegionActive: true, loopStartMeasure: 3, loopEndMeasure: 6, currentMeasure: 5 });
    const ctx = buildMockTransportCtx({
      isLoopRegionActiveRef: { current: true },
      loopStartRef: { current: 3 },
      measureCountRef: { current: 5 },
    });

    executeTransportRewind(ctx);
    expect(ctx.measureCountRef.current).toBe(3);
    expect(useSequencerStore.getState().currentMeasure).toBe(3);

    executeTransportRewind(ctx);
    expect(ctx.measureCountRef.current).toBe(0);
    expect(useSequencerStore.getState().currentMeasure).toBe(0);
  });

  it('distingue <input type="range"> / <button> des vrais champs de saisie texte (Barrière 1)', () => {
    expect(isEditableTarget({ nodeType: 1, tagName: 'INPUT', type: 'range' })).toBe(false);
    expect(isEditableTarget({ nodeType: 1, tagName: 'BUTTON' })).toBe(false);
    expect(isEditableTarget({ nodeType: 1, tagName: 'INPUT', type: 'text' })).toBe(true);
    expect(isEditableTarget({ nodeType: 1, tagName: 'TEXTAREA' })).toBe(true);
    expect(isEditableTarget({ nodeType: 1, tagName: 'DIV', isContentEditable: true })).toBe(true);
  });
});
