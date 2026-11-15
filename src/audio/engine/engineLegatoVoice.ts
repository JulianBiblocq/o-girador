/**
 * O Girador - Monophonic Legato Voice Synth for Melisma Glides (grammarVersion: 2)
 * Maintient une enveloppe ADSR unique ouverte et glisse la fréquence sur les pas `_`.
 */

import { getTone } from '../../ToneLoader';
import { VOCAL_PRESETS } from '../vocalPresets';
import { masterVolumeNode, channels, busInputs, busChannels, trackInputs } from '../effectsChain';
import { useSequencerStore, isToadaBus } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import type { VoiceMelismaGlide } from '../../utils/musicTheory';
import type { EngineVoiceSynthManager } from './engineVoiceSynth';

export class EngineLegatoVoice {
  public static getOrCreate(mgr: EngineVoiceSynthManager, trackId?: string | number): any {
    const Tone = getTone();
    if (!Tone) return null;

    const normalizedTrackId = trackId !== undefined && trackId !== null ? String(trackId) : 'default';
    const legatoKey = `legato:${normalizedTrackId}`;
    const existing = mgr.voiceSynths.get(legatoKey);
    if (existing) return existing;

    let destNode: any = null;
    if (trackId !== undefined && trackId !== null) {
      destNode = (trackInputs && (trackInputs as any)[trackId]) || (channels && (channels as any)[trackId]);
    }
    if (!destNode) {
      const tracks = useSequencerStore.getState().tracks;
      const puxTrack = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
      const coroTrack = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
      const toadaTrack = tracks.find((t) => isToadaBus(t));
      if (normalizedTrackId === 'coro' || (coroTrack && String(coroTrack.id) === normalizedTrackId)) {
        destNode = coroTrack ? ((trackInputs as any)?.[coroTrack.id] || (channels as any)?.[coroTrack.id]) : null;
      } else if (normalizedTrackId === 'puxador' || (puxTrack && String(puxTrack.id) === normalizedTrackId)) {
        destNode = puxTrack ? ((trackInputs as any)?.[puxTrack.id] || (channels as any)?.[puxTrack.id]) : null;
      }
      if (!destNode && toadaTrack) {
        destNode = (busInputs as any)?.[toadaTrack.id] || (busChannels as any)?.[toadaTrack.id];
      }
      if (!destNode) destNode = masterVolumeNode;
    }

    try {
      const presetConfig = VOCAL_PRESETS[mgr.currentVocalPreset] || VOCAL_PRESETS.guide;
      const SynthConstructor = presetConfig.synthClass === 'FMSynth' ? Tone.FMSynth : Tone.Synth;
      const mono = new (SynthConstructor as any)(presetConfig.options);
      mono.volume.value = -6;
      mono.portamento = 0.022;
      if (destNode) {
        try { mono.connect(destNode as any); } catch (_) {}
      }
      mgr.voiceSynths.set(legatoKey, mono);
      return mono;
    } catch {
      return null;
    }
  }

  public static triggerLegatoPhrase(
    mgr: EngineVoiceSynthManager,
    trackId: string | number,
    startNote: string,
    durSec: number,
    triggerTime: number,
    vel: number,
    glides: VoiceMelismaGlide[]
  ): boolean {
    const mono = EngineLegatoVoice.getOrCreate(mgr, trackId);
    if (!mono) return false;
    try { mono.triggerRelease(triggerTime); } catch (_) {}
    mono.portamento = 0.022;
    mono.triggerAttackRelease(startNote, durSec, triggerTime, vel);
    for (const g of glides) {
      if (g.offsetSec <= 0 || g.offsetSec >= durSec) continue;
      const tGlide = triggerTime + g.offsetSec;
      if (typeof mono.setNote === 'function') {
        mono.setNote(g.note, tGlide);
      } else if (mono.frequency?.exponentialRampToValueAtTime && g.freq > 0) {
        mono.frequency.exponentialRampToValueAtTime(g.freq, tGlide + 0.022);
      }
    }
    return true;
  }
}
