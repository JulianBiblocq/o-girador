/**
 * Déclenchement audio One-Shot d'un pas Roda en exploration pas-à-pas (< 125 lignes).
 * - Respecte Mute, Solo, Bus, Focus, Tocar Junto (Practice) et soloPatternPlayId.
 * - Planifie [sub1, sub2] (Ra / nuplets) sur l'horloge Web Audio et borne les Barulhos (B/b) à stepDurationSec.
 */

import { instrumentsConfig } from '../../data';
import { Track } from '../../types';
import { cancelAudioContextAutoSuspend, safeResumeAudioContext } from '../../audio/audioContextSuspendManager';
import { pushVisualHitTrigger } from '../../audio/visualTickBuffer';
import { useAudioStore } from '../../stores/useAudioStore';
import { getEffectiveMuteState, useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { isTrackMutedByPracticeMode } from '../../utils/practiceAudioMuteGuard';
import {
  computeMeasurePatternStepOffset, getRodaMeasureGeometry, getRodaStepDurationTicks, resolveActiveBeatResolutions,
} from '../../utils/rodaTimeSigGeometry';
import { resolveActivePattern } from '../../workers/compiler/patternResolver';
import { computeStepDecay, computeStepVolume, normalizeStrokeKey } from '../../workers/compiler/stepNotePacker';
import { AudioEngine } from '../../AudioEngine';
import { getAudioEngine } from './audioEngineNodes';
import { getMeasureVariationSnapshot } from './liveVariationLookaheadEngine';

export interface PreviewRodaStepAudioParams {
  measureIdx: number; stepIdx: number; measureBeatRes: readonly number[]; timeSig: string;
  bpm: number; tracks: Track[]; soloPatternPlayId: number | null;
  activeVariationsMap?: Record<number, any> | null; audioEngine?: AudioEngine | null;
}

export function resolveTrackStepIndexForExplore(
  explorerStepIdx: number, measureBeatRes: readonly number[], trackBeatRes: readonly number[]
): number {
  const beatsCount = measureBeatRes.length;
  let explorerCursor = 0, trackCursor = 0;
  for (let b = 0; b < beatsCount; b++) {
    const mRes = Math.max(1, measureBeatRes[b] || 4), tRes = Math.max(1, trackBeatRes[b] || mRes);
    if (explorerStepIdx < explorerCursor + mRes) {
      const s = explorerStepIdx - explorerCursor;
      if (tRes === mRes) return trackCursor + s;
      for (let k = 0; k < tRes; k++) { if (Math.floor((k * mRes) / tRes) === s) return trackCursor + k; }
      return -1;
    }
    explorerCursor += mRes; trackCursor += tRes;
  }
  return -1;
}

export function previewRodaStepAudio(params: PreviewRodaStepAudioParams): void {
  const engine = params.audioEngine ?? getAudioEngine();
  if (!engine) return;

  if (!useAudioStore.getState().isAudioUnlocked) {
    useAudioStore.getState().unlockAudio();
  }
  cancelAudioContextAutoSuspend();
  void safeResumeAudioContext();

  const storeState = useSequencerStore.getState();
  const { measureIdx, stepIdx, measureBeatRes, timeSig, tracks } = params;
  const soloId = params.soloPatternPlayId ?? useTransportStore.getState().soloPatternPlayId ?? null;
  const isSoloPlay = soloId !== null;
  const safeBpm = params.bpm > 0 && Number.isFinite(params.bpm) ? params.bpm : (storeState.bpm || 100);
  const tick96nSec = (60 / safeBpm) / 24;
  const nowAudio = engine.getCurrentTime();
  const varSnapshot = getMeasureVariationSnapshot(measureIdx);
  const varStepsMap = params.activeVariationsMap ?? varSnapshot?.stepsByTrackId ?? null;

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    if (!track || track.isBusFolder || track.isLinkFolder) continue;
    const inst = instrumentsConfig[track.instrumentIdx];
    if (!inst || inst.type === 'voice') continue;

    const isConsoleMuted = !isSoloPlay && getEffectiveMuteState(tracks, track.id);
    if (isConsoleMuted || isTrackMutedByPracticeMode(track.id, tracks, storeState)) continue;

    const activePattern = resolveActivePattern(track, tracks, measureIdx, isSoloPlay, soloId);
    if (!activePattern) continue;

    const trackBeatRes = resolveActiveBeatResolutions(timeSig, activePattern);
    const effectiveStepCount = trackBeatRes.reduce((acc, v) => acc + Math.max(1, v), 0) || getRodaMeasureGeometry(timeSig).defaultSteps;
    const trackStepIdx = resolveTrackStepIndexForExplore(stepIdx, measureBeatRes, trackBeatRes);
    if (trackStepIdx < 0 || trackStepIdx >= effectiveStepCount) continue;

    const stepOffset = computeMeasurePatternStepOffset(activePattern, effectiveStepCount, measureIdx);
    const actualStep = stepOffset + trackStepIdx;
    const canVary = Boolean(activePattern.variations?.length && (isSoloPlay || activePattern.measureAllowVariations?.[measureIdx] !== false));
    const matchedVar = canVary ? varSnapshot?.variedPatternsByTrackId?.get(track.id)?.variation : undefined;
    const activeSteps = (canVary && varStepsMap?.[track.id]) ? varStepsMap[track.id] : activePattern.activeSteps;
    const rawState = activeSteps?.[actualStep];
    if (!rawState || rawState === 0 || rawState === '0' || rawState === '-') continue;

    const volumes = matchedVar?.volumes ?? activePattern.volumes;
    const decays = matchedVar?.decays ?? activePattern.decays;
    const stepDurationSec = tick96nSec * getRodaStepDurationTicks(timeSig, activePattern, trackStepIdx);
    const subStates = Array.isArray(rawState) ? rawState : [rawState];
    const subCount = Math.max(1, subStates.length);
    const subDurSec = stepDurationSec / subCount;

    for (let subIdx = 0; subIdx < subCount; subIdx++) {
      const rawToken = String(subStates[subIdx] ?? '').trim();
      if (!rawToken || rawToken === '0' || rawToken === '-') continue;
      const triggerTime = nowAudio + subIdx * subDurSec;
      if (rawToken === '/' || rawToken === '.') {
        engine.playNote(track.id, rawToken, triggerTime, 0.7, 1.0, false);
        continue;
      }
      const strokeKey = normalizeStrokeKey(inst, rawToken);
      if (!strokeKey) continue;
      const vel = computeStepVolume(volumes?.[actualStep], subIdx, () => 0.5, trackStepIdx);
      const dec = computeStepDecay(decays?.[actualStep], subIdx);
      engine.playNote(track.id, strokeKey, triggerTime, vel, dec, false, subDurSec);
      if (!storeState.isEcoMode) {
        pushVisualHitTrigger(track.id, trackStepIdx, strokeKey.charCodeAt(0), triggerTime);
      }
    }
  }
}
