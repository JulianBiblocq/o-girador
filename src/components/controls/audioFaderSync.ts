import { getTone } from '@/src/ToneLoader';
import {
  channels, busChannels, reverbSends, masterVolumeNode,
  masterEQNode, masterCompressorNode, metroChannel,
  masterReverbVolumeNode, reverbNode
} from '../../hooks/useAudioSync';

export type AudioFaderTarget =
  | 'trackVolume' | 'trackPan' | 'trackReverb'
  | 'masterVolume' | 'metroVolume'
  | 'eqLow' | 'eqMid' | 'eqHigh'
  | 'compThreshold' | 'compRatio'
  | 'masterReverbVol' | 'reverbDecay';

export function safeGetTone() {
  try { return getTone(); } catch { return null; }
}

export function updateFaderLabelText(val: number, audioTarget: AudioFaderTarget | undefined, containerEl: HTMLElement | null) {
  if (!containerEl) return;
  let label = containerEl.parentElement?.querySelector('.fader-val-label');
  if (!label && containerEl.parentElement?.parentElement) {
    label = containerEl.parentElement.parentElement.querySelector('.fader-val-label');
  }
  if (!label) return;

  if (audioTarget === 'masterReverbVol' || audioTarget === 'masterVolume') {
    label.textContent = val === -40 ? 'Mute' : `${val > 0 ? '+' : ''}${val} dB`;
  } else if (audioTarget === 'trackVolume' || audioTarget === 'metroVolume') {
    label.textContent = `${Math.round(val)}%`;
  } else if (audioTarget === 'trackReverb') {
    label.textContent = `${Math.round(val)}`;
  } else if (audioTarget === 'eqLow' || audioTarget === 'eqMid' || audioTarget === 'eqHigh') {
    label.textContent = `${val > 0 ? '+' : ''}${val} dB`;
  } else if (audioTarget === 'compThreshold') {
    label.textContent = `${val} dB`;
  } else if (audioTarget === 'compRatio') {
    label.textContent = `${val.toFixed(1)}:1`;
  } else if (audioTarget === 'reverbDecay') {
    label.textContent = `${val.toFixed(1)} s`;
  }
}

export function updateAudioFaderTarget(val: number, audioTarget?: AudioFaderTarget, trackId?: number) {
  const tone = safeGetTone();
  const targetChannel = trackId !== undefined ? (channels[trackId] || (busChannels ? busChannels[trackId] : undefined)) : undefined;

  if (audioTarget === 'trackVolume' && targetChannel && tone) {
    const gain = Math.max(0.00001, val / 100);
    targetChannel.volume.rampTo(val === 0 ? -Infinity : tone.gainToDb(gain), 0.05);
  } else if (audioTarget === 'trackPan' && targetChannel) {
    targetChannel.pan.rampTo(val / 100, 0.05);
  } else if (audioTarget === 'trackReverb' && trackId !== undefined && reverbSends[trackId] && tone) {
    const gain = Math.max(0.00001, val / 100);
    const targetDb = val === 0 ? -Infinity : tone.gainToDb(gain);
    try {
      if (reverbSends[trackId].gain.units === 'decibels') reverbSends[trackId].gain.rampTo(targetDb, 0.05);
      else reverbSends[trackId].gain.rampTo(val === 0 ? 0 : gain, 0.05);
    } catch (_) {}
  } else if (audioTarget === 'masterVolume' && masterVolumeNode) {
    masterVolumeNode.gain.rampTo(tone?.dbToGain(val === -40 ? -Infinity : val) ?? 0, 0.05);
  } else if (audioTarget === 'metroVolume' && metroChannel && tone) {
    const gain = Math.max(0.00001, val / 100);
    metroChannel.volume.rampTo(val === 0 ? -Infinity : tone.gainToDb(gain), 0.05);
  } else if (audioTarget === 'eqLow' && masterEQNode) {
    masterEQNode.low.linearRampToValueAtTime(val, (tone?.now() ?? 0) + 0.05);
  } else if (audioTarget === 'eqMid' && masterEQNode) {
    masterEQNode.mid.linearRampToValueAtTime(val, (tone?.now() ?? 0) + 0.05);
  } else if (audioTarget === 'eqHigh' && masterEQNode) {
    masterEQNode.high.linearRampToValueAtTime(val, (tone?.now() ?? 0) + 0.05);
  } else if (audioTarget === 'compThreshold' && masterCompressorNode) {
    masterCompressorNode.threshold.linearRampToValueAtTime(val, (tone?.now() ?? 0) + 0.05);
  } else if (audioTarget === 'compRatio' && masterCompressorNode) {
    masterCompressorNode.ratio.linearRampToValueAtTime(val, (tone?.now() ?? 0) + 0.05);
  } else if (audioTarget === 'masterReverbVol' && masterReverbVolumeNode) {
    masterReverbVolumeNode.gain.rampTo(tone?.dbToGain(val === -40 ? -Infinity : val) ?? 0, 0.05);
  } else if (audioTarget === 'reverbDecay' && reverbNode) {
    try { reverbNode.decay = val; } catch (_) {}
  }
}
