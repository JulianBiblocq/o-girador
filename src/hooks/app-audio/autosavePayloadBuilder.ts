/**
 * Construction déterministe du payload Autosave (`O GiradorDB`) & signature d'état (< 105 lignes)
 * - Préserve `vocalTransposeSteps` (`-12..+12`) au niveau racine, `metadata` et pistes/motifs.
 * - Suit l'état `hasUnsavedChanges` pour restaurer fidèlement une session modifiée après `F5`.
 */

import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { CURRENT_AUDIO_SCALE_VERSION } from '../../utils/audioMath';
import { sanitizeVocalTransposeSteps } from '../../contexts/audio/presetSerializationHelpers';

let baselineAutosaveSignature: string | null = null;
let unsavedSessionRestored = false;

export function markAutosaveBaselineClean(currentSig?: string): void {
  baselineAutosaveSignature = currentSig ?? computeAutosaveSignature(useSequencerStore.getState());
}

export function setUnsavedSessionRestored(flag: boolean): void {
  unsavedSessionRestored = flag;
}

export function wasUnsavedSessionRestored(): boolean {
  return unsavedSessionRestored;
}

export function computeAutosaveSignature(state: any): string {
  const tracks = Array.isArray(state?.tracks) ? state.tracks : [];
  return JSON.stringify({
    bpm: state?.bpm,
    timeSig: state?.timeSig,
    totalMeasures: state?.totalMeasures,
    loopMode: state?.loopMode,
    isLooping: state?.isLooping,
    loopStartMeasure: state?.loopStartMeasure,
    loopEndMeasure: state?.loopEndMeasure,
    isLoopRegionActive: state?.isLoopRegionActive,
    metadata: state?.metadata,
    letras: state?.letras,
    songSections: state?.songSections,
    measureBpms: state?.measureBpms,
    measureTimeSigs: state?.measureTimeSigs,
    measureVols: state?.measureVols,
    mestreSignals: state?.mestreSignals,
    toadaConductorSlots: state?.toadaConductorSlots,
    vocalTransposeSteps: sanitizeVocalTransposeSteps(state?.vocalTransposeSteps, 0),
    isMasterVolumeBypassed: state?.isMasterVolumeBypassed,
    tracks: tracks.map((t: any) => ({
      id: t.id,
      instrumentIdx: t.instrumentIdx,
      isMute: t.isMute,
      volumeVal: t.volumeVal,
      tuning: t.tuning,
      vocalTransposeSteps: t.vocalTransposeSteps,
      patterns: Array.isArray(t.patterns)
        ? t.patterns.map((p: any) => ({
            id: p.id,
            steps: p.steps,
            activeSteps: p.activeSteps,
            notes: p.notes,
            lyrics: p.lyrics,
            preRollNotes: p.preRollNotes,
            measureAssignments: p.measureAssignments,
            vocalMode: p.vocalMode,
            hasVocalAudio: p.hasVocalAudio,
            vocalClipId: p.vocalClip?.id,
            vocalTransposeSteps: p.vocalTransposeSteps,
          }))
        : [],
    })),
    masterFX: state?.masterFX,
  });
}

export function buildAutosavePayload(audioCtx?: any, currentSig?: string): any | null {
  const state = useSequencerStore.getState();
  if (!state.tracks || !Array.isArray(state.tracks) || state.tracks.length === 0) return null;

  const stripInlineAudio = (list: any[]): any[] =>
    list.map((t: any) => ({
      ...t,
      patterns: Array.isArray(t.patterns)
        ? t.patterns.map(({ vocalAudioData, ...safePattern }: any) => safePattern)
        : [],
      ...(Array.isArray(t.subTracks) ? { subTracks: stripInlineAudio(t.subTracks) } : {}),
    }));

  const currentPreRoll = useTransportStore.getState().preRollSettings;
  const currentVocalPreset = useAudioStore.getState().vocalPreset || 'guide';
  const sanitizedTranspose = sanitizeVocalTransposeSteps(state.vocalTransposeSteps, 0);
  const sig = currentSig ?? computeAutosaveSignature(state);
  const hasUnsavedChanges = baselineAutosaveSignature !== null ? sig !== baselineAutosaveSignature : true;

  return {
    version: 3,
    tracks: stripInlineAudio(state.tracks),
    rodaTrackOrder: state.rodaTrackOrder,
    toadaConductorSlots: state.toadaConductorSlots || [],
    bpm: state.bpm,
    timeSig: state.timeSig,
    totalMeasures: state.totalMeasures,
    measureTimeSigs: state.measureTimeSigs,
    measureBpms: state.measureBpms,
    measureBpmTransitions: state.measureBpmTransitions,
    measureVols: state.measureVols,
    measureVolTransitions: state.measureVolTransitions,
    songSections: state.songSections,
    songMarkers: state.songMarkers,
    measureSignals: state.measureSignals,
    mestreSignals: state.mestreSignals,
    loopStartMeasure: state.loopStartMeasure,
    loopEndMeasure: state.loopEndMeasure,
    isLoopRegionActive: state.isLoopRegionActive,
    loopMode: state.loopMode,
    isLooping: state.isLooping,
    letras: state.letras,
    metadata: {
      ...(state.metadata || {}),
      vocalTransposeSteps: sanitizedTranspose,
      transpositionSemitones: sanitizedTranspose,
    },
    preRollSettings: currentPreRoll,
    vocalPreset: currentVocalPreset,
    vocalTransposeSteps: sanitizedTranspose,
    isMasterVolumeBypassed: Boolean(state.isMasterVolumeBypassed),
    globalAutomationBypass: state.globalAutomationBypass,
    skinChorusAmount: state.skinChorusAmount ?? 0.75,
    rodaBreathingAmount: state.rodaBreathingAmount ?? 0.75,
    masterEQ: audioCtx?.masterEQ,
    masterCompressor: audioCtx?.masterCompressor,
    masterVol: audioCtx?.masterVol,
    masterReverbVol: audioCtx?.masterReverbVol,
    reverbDecay: audioCtx?.reverbDecay,
    masterFX: state.masterFX,
    masterDistortion: state.masterFX?.distortion?.returnVolume,
    masterDistortionDrive: state.masterFX?.distortion?.drive,
    globalSwing: audioCtx?.globalSwing,
    audioScaleVersion: CURRENT_AUDIO_SCALE_VERSION,
    hasUnsavedChanges,
    savedAt: Date.now(),
  };
}
