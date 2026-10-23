/**
 * O Girador - Audio Engine Vocal Synthesizer Lifecycle
 */

import { getTone } from '../../ToneLoader';
import { VocalPresetId, VOCAL_PRESETS } from '../vocalPresets';
import { masterVolumeNode, channels, busInputs, busChannels, trackInputs } from '../effectsChain';
import { useSequencerStore, isToadaBus } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { VoiceOverlapTracker } from '../voiceNoteGuard';

export class EngineVoiceSynthManager {
  public voiceSynths = new Map<string, any>();
  public voiceSynth: any = null;
  public currentVocalPreset: VocalPresetId = 'guide';
  public voiceOverlap = new VoiceOverlapTracker();

  public getOrCreateVoiceSynth(
    trackId?: string | number,
    instrumentChannels?: Map<string, any>
  ): any {
    const Tone = getTone();
    if (!Tone) return null;

    const normalizedTrackId = trackId !== undefined && trackId !== null ? String(trackId) : 'default';
    const existingSynth = this.voiceSynths.get(normalizedTrackId);
    if (existingSynth) return existingSynth;

    let destNode: any = null;
    if (trackId !== undefined && trackId !== null) {
      destNode = (instrumentChannels && instrumentChannels.get(normalizedTrackId)) ||
        (trackInputs && (trackInputs as any)[trackId]) ||
        (channels && (channels as any)[trackId]);
    }

    if (!destNode) {
      const store = useSequencerStore.getState();
      const tracks = store.tracks;
      const puxTrack = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
      const coroTrack = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
      const toadaTrack = tracks.find(t => isToadaBus(t));

      if (normalizedTrackId === 'coro' || (coroTrack && String(coroTrack.id) === normalizedTrackId)) {
        destNode = coroTrack ? ((trackInputs && (trackInputs as any)[coroTrack.id]) || (channels && (channels as any)[coroTrack.id])) : null;
      } else if (normalizedTrackId === 'puxador' || (puxTrack && String(puxTrack.id) === normalizedTrackId)) {
        destNode = puxTrack ? ((trackInputs && (trackInputs as any)[puxTrack.id]) || (channels && (channels as any)[puxTrack.id])) : null;
      }

      if (!destNode && toadaTrack) {
        destNode = (busInputs && (busInputs as any)[toadaTrack.id]) || (busChannels && (busChannels as any)[toadaTrack.id]);
      }

      if (!destNode) {
        destNode = masterVolumeNode;
      }
    }

    try {
      const presetConfig = VOCAL_PRESETS[this.currentVocalPreset] || VOCAL_PRESETS.guide;
      const SynthConstructor = presetConfig.synthClass === 'FMSynth' ? Tone.FMSynth : Tone.Synth;
      const synth = new Tone.PolySynth(SynthConstructor as any, {
        maxPolyphony: 32,
        options: presetConfig.options,
        ...presetConfig.options,
      } as any);
      synth.maxPolyphony = 32;
      synth.volume.value = -6;

      const finalDest = destNode || masterVolumeNode;
      if (finalDest) {
        try { synth.connect(finalDest as any); } catch (_) {}
      }
      this.voiceSynths.set(normalizedTrackId, synth);
      if (normalizedTrackId === 'default' || !this.voiceSynth) {
        this.voiceSynth = synth;
      }
      return synth;
    } catch (err) {
      console.error('AudioEngine: Error creating voiceSynth for track', normalizedTrackId, err);
      return null;
    }
  }

  public initVoiceSynth(presetId?: VocalPresetId, instrumentChannels?: Map<string, any>): void {
    const Tone = getTone();
    if (!Tone) return;

    if (presetId) {
      this.currentVocalPreset = presetId;
    }

    this.voiceSynths.forEach((synth) => {
      try { synth.releaseAll(); } catch (_) {}
      try { synth.disconnect(); } catch (_) {}
      try { synth.dispose(); } catch (_) {}
    });
    this.voiceSynths.clear();

    if (this.voiceSynth) {
      try { this.voiceSynth.releaseAll(); } catch (_) {}
      try { this.voiceSynth.disconnect(); } catch (_) {}
      try { this.voiceSynth.dispose(); } catch (_) {}
      this.voiceSynth = null;
    }

    this.getOrCreateVoiceSynth('default', instrumentChannels);
  }

  public applyVocalPreset(presetId: VocalPresetId, instrumentChannels?: Map<string, any>): void {
    this.initVoiceSynth(presetId, instrumentChannels);
  }

  public releaseAllVoices(): void {
    const synths = new Set<any>(this.voiceSynths.values());
    if (this.voiceSynth) synths.add(this.voiceSynth);
    synths.forEach((synth) => {
      try { synth.releaseAll(); } catch (_) {}
      try { synth.disconnect(); } catch (_) {}
      try { synth.dispose(); } catch (_) {}
    });
    this.voiceSynths.clear();
    this.voiceSynth = null;
    this.voiceOverlap.clear();
  }

  public releaseVoicesForTrack(trackId: string | number): void {
    const key = String(trackId);
    const synth = this.voiceSynths.get(key);
    if (!synth) return;
    try { synth.releaseAll(); } catch (_) {}
    try { synth.disconnect(); } catch (_) {}
    try { synth.dispose(); } catch (_) {}
    this.voiceSynths.delete(key);
    if (this.voiceSynth === synth) this.voiceSynth = null;
    this.voiceOverlap.clearTrack(key);
  }
}
