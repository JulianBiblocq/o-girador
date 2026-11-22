/**
 * offlineVocalSynthRenderer.ts — Synthèse vocale hors-ligne (timbres VOCAL_PRESETS + mélismes legato) (< 120 lignes).
 */
import { VOCAL_PRESETS, type VocalPresetId } from '../../audio/vocalPresets';
import { getVoiceNoteStepsFromDecay, noteToFrequency } from '../../hooks/audio-sync/vocalSampleHelpers';
import { scanVoiceLegatoChain } from '../../hooks/audio-sync/voiceLegatoChainScanner';
import { getBalancoOffsetSec } from '../balancoUtils';
import type { BaqueCycleTimingResult } from '../baqueBounceTiming';
import { getBeatsPerMeasure } from '../measureHelpers';
import {
  isVoiceHoldNote, isVoiceMelismaStep, isVoiceStepProlongation, resolveEffectiveVoicePitch, type VoiceMelismaGlide,
} from '../musicTheory';
import { resolveVocalPhraseInfo } from '../vocalPhraseBlock';
import { capVoiceNoteSteps } from '../voiceNoteDuration';

function triggerOfflineSynthVoice(
  ctx: OfflineAudioContext, dest: AudioNode, presetId: VocalPresetId,
  freq: number, startSec: number, durationSec: number, velocity: number, glides?: VoiceMelismaGlide[]
): void {
  const maxDur = ctx.length / ctx.sampleRate;
  if (!(freq > 20) || durationSec <= 0.01 || startSec >= maxDur - 0.005) return;
  const preset = VOCAL_PRESETS[presetId] || VOCAL_PRESETS.guide;
  const t0 = Math.max(0, startSec);
  const tEnd = Math.min(maxDur, t0 + durationSec + (preset.options?.envelope?.release ?? 0.25));
  if (tEnd <= t0 + 0.01) return;

  const osc = ctx.createOscillator(), env = ctx.createGain();
  const rawType = String(preset.options?.oscillator?.type || 'triangle');
  osc.type = rawType === 'sine' ? 'sine' : rawType === 'pulse' ? 'square' : 'triangle';
  osc.frequency.setValueAtTime(freq, t0);

  if (preset.synthClass === 'FMSynth') {
    const mod = ctx.createOscillator(), modGain = ctx.createGain();
    mod.type = 'sine';
    mod.frequency.setValueAtTime(freq * (preset.options?.harmonicity ?? 3), t0);
    modGain.gain.setValueAtTime(freq * 0.45, t0);
    modGain.gain.exponentialRampToValueAtTime(Math.max(1, freq * 0.08), Math.min(tEnd, t0 + 0.5));
    mod.connect(modGain); modGain.connect(osc.frequency);
    mod.start(t0); mod.stop(tEnd);
  }

  if (glides && glides.length > 0) {
    let curF = freq;
    for (const g of glides) {
      if (!(g.freq > 0) || g.offsetSec <= 0 || g.offsetSec >= durationSec) continue;
      const gt = t0 + g.offsetSec, ramp = Math.min(0.022, Math.max(0.005, (durationSec - g.offsetSec) * 0.35));
      osc.frequency.setValueAtTime(curF, gt);
      osc.frequency.exponentialRampToValueAtTime(g.freq, Math.min(tEnd, gt + ramp));
      curF = g.freq;
    }
  }

  const peak = Math.max(0.001, velocity * 0.28);
  const att = Math.min(0.06, Math.max(0.005, preset.options?.envelope?.attack ?? 0.02));
  const sus = Math.max(0.05, preset.options?.envelope?.sustain ?? 0.8);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(peak, Math.min(tEnd, t0 + att));
  env.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * sus), Math.min(tEnd, t0 + durationSec));
  env.gain.exponentialRampToValueAtTime(0.0001, tEnd);

  osc.connect(env); env.connect(dest);
  osc.start(t0); osc.stop(tEnd);
}

export function scheduleOfflineVocalSynthForMeasure(params: {
  ctx: OfflineAudioContext; dest: AudioNode; track: any; pattern: any; measureIdx: number;
  timing: BaqueCycleTimingResult; timeSig: string; bpm: number; globalSwing: any;
  presetId: VocalPresetId; referencePitchHz?: number; ignoreGlobalPitch?: boolean;
}): void {
  const { ctx, dest, track, pattern, measureIdx, timing, timeSig, bpm, globalSwing, presetId, referencePitchHz, ignoreGlobalPitch } = params;
  if (!pattern || pattern.ignoreMelodyPitch || ignoreGlobalPitch) return;

  const phrase = resolveVocalPhraseInfo({ pattern, measureIdx, beatsPerMeasure: getBeatsPerMeasure(timeSig), isSolo: false, soloMeasureCounter: 0 });
  const cells = Math.max(1, phrase.cellsPerMeasure || pattern.steps || 16);
  const mStart = timing.measureStartsSec[measureIdx] ?? 0, mDur = timing.measureDurationsSec[measureIdx] ?? 2;
  const singleStepSec = mDur / cells, lyrics = pattern.lyrics || [], totalSteps = pattern.steps || cells;

  for (let localCell = 0; localCell < cells; localCell++) {
    const cellIdx = phrase.stepOffset + localCell;
    const rawState = pattern.activeSteps?.[cellIdx];
    if (rawState === undefined || rawState === null || rawState === 0 || rawState === '0') continue;
    const noteVal = typeof pattern.notes?.[cellIdx] === 'string' ? pattern.notes[cellIdx].trim() : '';
    if (!noteVal || isVoiceHoldNote(noteVal)) continue;

    const prevState = cellIdx > 0 ? pattern.activeSteps?.[cellIdx - 1] : 0;
    const prevActive = prevState !== undefined && prevState !== null && prevState !== 0 && prevState !== '0';
    const prevPitch = cellIdx > 0 ? resolveEffectiveVoicePitch(pattern.notes, pattern.activeSteps, cellIdx - 1) : '';
    if (isVoiceStepProlongation(true, prevActive, noteVal, prevPitch, lyrics[cellIdx])) continue;
    if (prevPitch && isVoiceMelismaStep(true, prevActive, noteVal, prevPitch, lyrics[cellIdx])) continue;

    const baseTime = mStart + localCell * singleStepSec;
    const balanco = localCell === 0 ? 0 : getBalancoOffsetSec({
      stepIdx: localCell, steps: cells, beatResolutions: pattern.beatResolutions,
      track, pattern, globalSwing, bpm, isPreRoll: false, baseStepAudioSec: baseTime,
    });
    const microRaw = pattern.microtimings?.[cellIdx] ?? 0;
    const microPct = Array.isArray(microRaw) ? (microRaw[0] ?? 0) : Number(microRaw) || 0;
    const { spanSteps, melismaGlides } = scanVoiceLegatoChain(pattern.activeSteps, pattern.notes, lyrics, cellIdx, totalSteps, noteVal, singleStepSec);
    const decayRaw = pattern.decays?.[cellIdx] ?? 10;
    const decayNum = Array.isArray(decayRaw) ? (decayRaw[0] ?? 10) : Number(decayRaw) || 10;
    const effSteps = capVoiceNoteSteps({ spanSteps, decaySteps: getVoiceNoteStepsFromDecay(decayNum), activeSteps: pattern.activeSteps, startIdx: cellIdx + spanSteps, totalSteps });
    triggerOfflineSynthVoice(ctx, dest, presetId, noteToFrequency(noteVal, referencePitchHz), baseTime + balanco + (microPct / 100) * singleStepSec * 0.5, Math.max(0.05, effSteps * singleStepSec * 0.95), 0.85, melismaGlides);
  }
}
