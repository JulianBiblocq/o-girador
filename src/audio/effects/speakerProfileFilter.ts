/**
 * speakerProfileFilter.ts
 * Étage de correction d'écoute locale post-`masterPostLimiterTap` (< 120 lignes) :
 * - Placé strictement APRÈS `masterPostLimiterTap` (jamais inclus dans l'enregistrement WAV ni les presets).
 * - Persisté uniquement dans `localStorage` (`ogirador_speaker_profile`).
 * - 4 profils : `'headphones'`, `'usb_bt_speaker'` (coupe-bas `55 Hz` + mono-blend), `'rehearsal_room'`, `'vocal_focus'`.
 */
import * as Tone from 'tone';
import type { SpeakerProfileId } from './studioFxPresets';
import { safeRampTo } from '../../utils/audio/safeAudioParamRamp';

const STORAGE_KEY = 'ogirador_speaker_profile';

interface SpeakerProfileTarget {
  hpfHz: number;
  lowShelfDb: number;
  midPeakDb: number;
  highShelfDb: number;
  stereoGain: number;
  monoGain: number;
}

export const SPEAKER_PROFILE_TARGETS: Record<SpeakerProfileId, SpeakerProfileTarget> = {
  headphones: { hpfHz: 20, lowShelfDb: 0, midPeakDb: 0, highShelfDb: 0, stereoGain: 1.0, monoGain: 0.0 },
  usb_bt_speaker: { hpfHz: 55, lowShelfDb: 1.8, midPeakDb: 1.0, highShelfDb: 0, stereoGain: 0.35, monoGain: 0.65 },
  rehearsal_room: { hpfHz: 42, lowShelfDb: -2.0, midPeakDb: 0.8, highShelfDb: -1.5, stereoGain: 0.85, monoGain: 0.15 },
  vocal_focus: { hpfHz: 65, lowShelfDb: -2.5, midPeakDb: 2.8, highShelfDb: 0.5, stereoGain: 1.0, monoGain: 0.0 },
};

interface ActiveSpeakerStage {
  hpf: BiquadFilterNode;
  lowShelf: BiquadFilterNode;
  midPeak: BiquadFilterNode;
  highShelf: BiquadFilterNode;
  stereoBranch: GainNode;
  monoSum: GainNode;
  monoBranch: GainNode;
  outputToneGain: Tone.Gain;
}

let activeStage: ActiveSpeakerStage | null = null;

export function getStoredSpeakerProfile(): SpeakerProfileId {
  try {
    const val = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (val === 'headphones' || val === 'usb_bt_speaker' || val === 'rehearsal_room' || val === 'vocal_focus') {
      return val;
    }
  } catch { /* ignore */ }
  return 'headphones';
}

export function initSpeakerProfileStage(sourceNode: any, initialProfile?: SpeakerProfileId): Tone.Gain {
  disposeSpeakerProfileStage();
  const rawCtx = (Tone.getContext().rawContext || Tone.context.rawContext || Tone.context) as AudioContext;
  const profile = initialProfile ?? getStoredSpeakerProfile();
  const t = SPEAKER_PROFILE_TARGETS[profile] ?? SPEAKER_PROFILE_TARGETS.headphones;

  const hpf = rawCtx.createBiquadFilter();
  hpf.type = 'highpass'; hpf.frequency.value = t.hpfHz; hpf.Q.value = Math.SQRT1_2;
  const lowShelf = rawCtx.createBiquadFilter();
  lowShelf.type = 'lowshelf'; lowShelf.frequency.value = 125; lowShelf.gain.value = t.lowShelfDb;
  const midPeak = rawCtx.createBiquadFilter();
  midPeak.type = 'peaking'; midPeak.frequency.value = 2700; midPeak.Q.value = 0.85; midPeak.gain.value = t.midPeakDb;
  const highShelf = rawCtx.createBiquadFilter();
  highShelf.type = 'highshelf'; highShelf.frequency.value = 8500; highShelf.gain.value = t.highShelfDb;

  const stereoBranch = rawCtx.createGain();
  stereoBranch.gain.value = t.stereoGain;
  const monoSum = rawCtx.createGain();
  monoSum.gain.value = 1;
  try { monoSum.channelCount = 1; monoSum.channelCountMode = 'explicit'; } catch { /* ignore */ }
  const monoBranch = rawCtx.createGain();
  monoBranch.gain.value = t.monoGain;

  const outputToneGain = new Tone.Gain(1);
  Tone.connect(sourceNode, hpf);
  hpf.connect(lowShelf); lowShelf.connect(midPeak); midPeak.connect(highShelf);
  highShelf.connect(stereoBranch);
  highShelf.connect(monoSum); monoSum.connect(monoBranch);
  Tone.connect(stereoBranch, outputToneGain);
  Tone.connect(monoBranch, outputToneGain);

  activeStage = { hpf, lowShelf, midPeak, highShelf, stereoBranch, monoSum, monoBranch, outputToneGain };
  return outputToneGain;
}

export function applySpeakerProfile(profileId: SpeakerProfileId): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, profileId);
  } catch { /* ignore */ }
  if (!activeStage) return;
  const t = SPEAKER_PROFILE_TARGETS[profileId] ?? SPEAKER_PROFILE_TARGETS.headphones;
  safeRampTo(activeStage.hpf.frequency, t.hpfHz, 0.025);
  safeRampTo(activeStage.lowShelf.gain, t.lowShelfDb, 0.025);
  safeRampTo(activeStage.midPeak.gain, t.midPeakDb, 0.025);
  safeRampTo(activeStage.highShelf.gain, t.highShelfDb, 0.025);
  safeRampTo(activeStage.stereoBranch.gain, t.stereoGain, 0.025);
  safeRampTo(activeStage.monoBranch.gain, t.monoGain, 0.025);
}

export function disposeSpeakerProfileStage(): void {
  if (!activeStage) return;
  const s = activeStage;
  activeStage = null;
  try {
    s.hpf.disconnect(); s.lowShelf.disconnect(); s.midPeak.disconnect(); s.highShelf.disconnect();
    s.stereoBranch.disconnect(); s.monoSum.disconnect(); s.monoBranch.disconnect(); s.outputToneGain.dispose();
  } catch { /* ignore */ }
}
