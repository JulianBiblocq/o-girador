// @ts-ignore — vitest est exécuté via npx vitest
import { describe, expect, it, vi } from 'vitest';
import { primeNativeAudioContextHardwareSync } from '../iosAudioSessionUnlock';
import { extractActiveInstrumentsFromTracks } from '../engine/activeTrackPreloadExtractor';
import { sanitizeRestoredAutosave } from '../../hooks/app-audio/autosaveRestoreSanitizer';
import { handleTogglePlay } from '../../hooks/audio-sync/transportPlayToggle';
import { isTrackMutedByPracticeMode } from '../../utils/practiceAudioMuteGuard';

describe('Blindage Audio Universel — Réveil Natif, Verrou isStartingPlayRef, Passe 1 Liée & Anti-Silence', () => {
  it('wakes interrupted/suspended native AudioContext synchronously with 1-sample silent pulse', () => {
    const startSpy = vi.fn();
    const resumeSpy = vi.fn(() => Promise.resolve());
    const interruptedCtx = {
      state: 'interrupted',
      sampleRate: 48000,
      destination: {},
      resume: resumeSpy,
      createBuffer: vi.fn(() => ({})),
      createBufferSource: vi.fn(() => ({ buffer: null, connect: vi.fn(), disconnect: vi.fn(), start: startSpy, onended: null })),
    } as unknown as AudioContext;

    expect(primeNativeAudioContextHardwareSync(interruptedCtx)).toBe(true);
    expect(resumeSpy).toHaveBeenCalledTimes(1);
    expect(startSpy).toHaveBeenCalledWith(0);
  });

  it('blocks concurrent reentrant Play clicks via isStartingPlayRef while cold preload is pending', async () => {
    let resolveSync!: () => void;
    const syncGate = new Promise<void>((r) => { resolveSync = r; });
    const startEngineSpy = vi.fn();
    const isStartingPlayRef = { current: false };
    const ctx: any = {
      isStartingRef: isStartingPlayRef, isStartingPlayRef, isPlayingRef: { current: false },
      soloPatternPlayIdRef: { current: null }, autoStopTimeoutRef: { current: null },
      isPlaybackEndingRef: { current: false }, lastPlayedSignalIdRef: { current: null },
      tracksRef: { current: [{ id: 1, instrumentIdx: 5, isMute: false, patterns: [{ id: 10, activeSteps: ['G'], measureAssignments: [true] }] }] },
      totalMeasuresRef: { current: 1 }, measureCountRef: { current: 0 }, currentStepIndexRef: { current: -1 },
      measureBpmsRef: { current: [100] }, measureTimeSigsRef: { current: { 0: '4/4' } },
      targetPreRollMeasureRef: { current: 0 }, isPreRollActiveRef: { current: false }, preRollRemainingMeasuresRef: { current: 0 },
      engineTimeoutsRef: { current: new Set() }, anticipatedMeasuresRef: { current: new Set() },
      activeSequencerVocalsRef: { current: new Map() }, tickEventDetailRef: { current: {} },
      trackInputs: {}, channels: { 1: {} }, busChannels: {},
      setSoloPatternPlayId: vi.fn(), setIsPlaying: vi.fn(), setCurrentMeasure: vi.fn(), setIsLoading: vi.fn(),
      audioEngine: {
        getAudioContext: () => ({ state: 'running', currentTime: 1 }),
        stopAllBarulho: vi.fn(),
        syncActiveInstrumentsMemory: vi.fn(() => syncGate),
        waitForWorkletReady: vi.fn(async () => true),
        syncTracksToWorklet: vi.fn(),
        start: startEngineSpy,
        currentMeasure: 0, currentStep: 0, schedulingMeasure: 0, schedulingStep: 0,
      },
    };

    const p1 = handleTogglePlay({ skipPreRoll: true }, ctx);
    expect(isStartingPlayRef.current).toBe(true);
    const p2 = handleTogglePlay({ skipPreRoll: true }, ctx);
    resolveSync();
    await Promise.all([p1, p2]);
    expect(startEngineSpy).toHaveBeenCalledTimes(1);
    expect(ctx.isPlayingRef.current).toBe(true);
    expect(isStartingPlayRef.current).toBe(false);
  });

  it('preloads linked slave track strokes in Pass 1, sanitizes muted parent Bus/measureVols, and guards solo laptop Tocar Junto', () => {
    const linkedTracks: any[] = [
      { id: 10, instrumentIdx: 0, isLinkMaster: true, patterns: [{ id: 1, activeSteps: ['D', 'E', 'A', 'I'] }] },
      { id: 11, instrumentIdx: 1, linkedToTrackId: '10', patterns: [{ id: 2, activeSteps: [0, 0, 0, 0] }] },
    ];
    const extracted = extractActiveInstrumentsFromTracks(linkedTracks);
    expect(extracted.find((x) => x.id === 'meiao')?.activeStrokes).toEqual(['A', 'D', 'E', 'I']);

    const sanitized = sanitizeRestoredAutosave({
      masterVol: -75,
      measureVols: [0, 0, 2],
      tracks: [{ id: 100, isBusFolder: true, isMute: true }, { id: 10, busId: '100', isMute: false }],
    });
    expect(sanitized.masterVol).toBe(0);
    expect(sanitized.measureVols).toEqual([100, 100, 100]);
    expect(sanitized.tracks[0].isMute).toBe(false);

    const studioTracks: any[] = [
      { id: 60, instrumentIdx: 5, isMute: false, isSolo: false, patterns: [] },
      { id: 70, instrumentIdx: 3, isMute: false, isSolo: false, patterns: [] },
    ];
    expect(isTrackMutedByPracticeMode(60, studioTracks, {
      mobileViewMode: 'complet', isRestOfEnsembleMuted: true, focusTrackId: 60,
      tocarJuntoActive: true, tocarJuntoIsMuted: true, tocarJuntoTrackId: 60, tocarJuntoMuteScope: 'track',
    })).toBe(false);
  });
});
