// @ts-ignore
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { TrackGroup } from '../../../types';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { clearFreeze, freezeAt } from '../../../hooks/audio-sync/frozenPlaybackState';
import { getTrackRadius } from '../circleGeometry';
import { buildVisibleRodaSignature, resolveOrderedVisibleRodaTracks } from '../resolveVisibleRodaTracks';
import { renderTrackStepLayer } from '../renderTrackStepLayer';
import { resolveRodaPedagogicalHit } from '../resolveRodaPedagogicalHit';
import { attachRodaIdleDirtyListeners } from '../attachRodaIdleDirtyListeners';
import { clearRodaTrackFrameCache, getRodaTrackFrameCacheSize, resolveCachedTrackStepsForMeasure } from '../rodaTrackFrameCache';

function makeTrack(id: number, instrumentIdx: number, customName: string, stroke = 'D', extra: Partial<TrackGroup> = {}): TrackGroup {
  const steps = [stroke, ...Array(15).fill(0)];
  return {
    id, instrumentIdx, customName, isMute: false, isSolo: false, isHidden: false, volumeVal: 75, selectedPatternId: id * 10,
    patterns: [{ id: id * 10, name: 'Base', steps: 16, activeSteps: steps, lyrics: [], notes: [], measureAssignments: [true] }],
    ...extra,
  };
}

function makeMockCtx() {
  const labels: string[] = [];
  let dashedArcCount = 0, currentDash: number[] = [];
  const noop = vi.fn();
  const ctx: any = {
    save: noop, restore: noop, beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    quadraticCurveTo: noop, clip: noop, fill: noop, arc: noop, clearRect: noop,
    drawImage: noop, setTransform: noop, strokeText: noop,
    setLineDash: (d: number[]) => { currentDash = d; },
    stroke: () => { if (currentDash.length > 0) dashedArcCount += 1; },
    fillText: (txt: string) => { labels.push(txt); },
  };
  return { ctx: ctx as CanvasRenderingContext2D, labels, getDashedArcCount: () => dashedArcCount };
}

describe('Bouton Œil Roda vs Mute [M], hit-testing radial et réveil 0 FPS', () => {
  const NINE_TRACKS: TrackGroup[] = [
    makeTrack(1, 0, 'Marcante', 'D', { isLinkMaster: true, linkedToTrackId: '100' }),
    makeTrack(2, 1, 'Meião', 'D', { linkedToTrackId: '100' }),
    makeTrack(3, 2, 'Repique', 'D', { linkedToTrackId: '100' }),
    makeTrack(4, 8, 'Timbal', 'T'),
    makeTrack(5, 5, 'Gonguê', 'G'),
    makeTrack(6, 3, 'Caixa', 'E', { isLinkMaster: true, linkedToTrackId: '200' }),
    makeTrack(7, 4, 'Tarol', 'E', { linkedToTrackId: '200' }),
    makeTrack(8, 6, 'Agbê', 'P'),
    makeTrack(9, 7, 'Mineiro', 'D'),
  ];

  beforeEach(() => {
    clearFreeze();
    clearRodaTrackFrameCache();
    useSequencerStore.setState({
      tracks: NINE_TRACKS, rodaTrackOrder: NINE_TRACKS.map((t) => t.id), showLinkedTracksOnRoda: true,
      isFocusActive: false, focusTrackId: null, referenceTrackId: null, isPlaying: false,
      currentMeasure: 0, timeSig: '4/4', measureTimeSigs: { 0: '4/4' } as any,
    });
  });

  it('garde isMute: true visible sur la Roda, exclut les pistes Œil barré (anneaux, labels 12h, hit-test) et gère 0 piste sans NaN', () => {
    useSequencerStore.getState().handleRodaTrackMuteToggle(1);
    for (const id of [2, 4, 5, 9]) useSequencerStore.getState().handleTrackHideToggle(id);

    const updated = useSequencerStore.getState().tracks;
    expect(updated.find((t) => t.id === 1)?.isMute).toBe(true);
    expect(updated.find((t) => t.id === 1)?.isHidden).toBe(false);

    const visible = resolveOrderedVisibleRodaTracks(updated, { isMobile: false, showLinkedTracksOnRoda: true });
    expect(visible.map((t) => t.id)).toEqual([1, 3, 6, 7, 8]);

    const { ctx, labels, getDashedArcCount } = makeMockCtx();
    const liveRef = { current: { step: -1, measure: 0, maxTicks: 96, ratio: 0, iteration: 1, time: 0 } };
    const pendingRef = { current: null };
    renderTrackStepLayer(ctx, visible, updated, '#1a1a1a', '#8b2a1a', '#1a1a1a', (t) => t.selectedPatternId ?? null, liveRef as any, { isPlaying: false, currentMeasure: 0, timeSig: '4/4' }, pendingRef, undefined, 1.4, false, 600, 600);

    expect(getDashedArcCount()).toBe(5);
    expect(labels).toContain('Marcante');
    for (const hiddenName of ['Meião', 'Timbal', 'Gonguê', 'Mineiro']) expect(labels).not.toContain(hiddenName);

    const caixaRad = getTrackRadius(2, visible.length);
    const hit = resolveRodaPedagogicalHit({
      clientX: 300, clientY: 100, mouseX: 600, mouseY: 600 - caixaRad, distance: caixaRad,
      visibleTracks: visible, allTracks: updated, livePlaybackRef: liveRef as any,
      stateRef: { current: { isPlaying: false, currentMeasure: 0, lang: 'fr' } } as any,
    });
    expect(hit?.trackId).toBe(6);

    for (const id of [1, 3, 6, 7, 8]) useSequencerStore.getState().handleTrackHideToggle(id);
    const allHidden = useSequencerStore.getState().tracks;
    const emptyVisible = resolveOrderedVisibleRodaTracks(allHidden, { isMobile: false, showLinkedTracksOnRoda: true });
    expect(emptyVisible).toEqual([]);
    expect(buildVisibleRodaSignature(emptyVisible)).toBe('empty');
    expect(getTrackRadius(0, 0)).toBe(0);

    const emptyCanvas = makeMockCtx();
    renderTrackStepLayer(emptyCanvas.ctx, emptyVisible, allHidden, '#1a1a1a', '#8b2a1a', '#1a1a1a', () => null, liveRef as any, { isPlaying: false, currentMeasure: 0, timeSig: '4/4' }, pendingRef, undefined, 1, false, 600, 600);
    expect(emptyCanvas.getDashedArcCount()).toBe(0);
    expect(emptyCanvas.labels).toHaveLength(0);
  });

  it('invalide immédiatement rodaTrackFrameCache et appelle requestRodaRedraw() à l’arrêt, en Pause et en lecture', () => {
    const fakeCanvas = { parentElement: null } as unknown as HTMLCanvasElement;
    let redrawCount = 0;
    const requestRodaRedraw = vi.fn(() => { redrawCount += 1; clearRodaTrackFrameCache(); });
    const detach = attachRodaIdleDirtyListeners(fakeCanvas, { paintRodaFrame: vi.fn(), scheduleIdleRedraw: vi.fn(), invalidateAndRedraw: requestRodaRedraw });

    try {
      const warm = () => {
        const st = useSequencerStore.getState();
        resolveCachedTrackStepsForMeasure(0, st.tracks[0], st.tracks, 0, null, null, st.measureTimeSigs as any, st.timeSig);
        expect(getRodaTrackFrameCacheSize()).toBeGreaterThan(0);
      };

      warm();
      useSequencerStore.getState().handleTrackHideToggle(4);
      expect(redrawCount).toBe(1);
      expect(getRodaTrackFrameCacheSize()).toBe(0);

      freezeAt({ measure: 0, step: 4, totalSteps: 16, progress: 0.25 });
      warm();
      useSequencerStore.getState().handleTrackHideToggle(5);
      expect(redrawCount).toBe(2);
      expect(getRodaTrackFrameCacheSize()).toBe(0);

      clearFreeze();
      useSequencerStore.setState({ isPlaying: true });
      const beforePlayToggle = redrawCount;
      warm();
      useSequencerStore.getState().handleTrackHideToggle(2);
      expect(redrawCount).toBe(beforePlayToggle + 1);
      expect(getRodaTrackFrameCacheSize()).toBe(0);
    } finally {
      detach();
    }
  });
});
