/**
 * O Girador - Audio Engine Vocal Synthesizer Lifecycle (< 130 lignes)
 * - Zéro allocation à froid sur un Baque 100 % percussions.
 * - `releaseAllVoices()` au `stop()` fait `releaseAll()` sans `dispose()` (graphe audio stable).
 * - `dispose()` exécuté uniquement à la suppression d'une piste vocale, au changement de timbre ou teardown moteur.
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

  public getOrCreateVoiceSynth(trackId?: string | number, instrumentChannels?: Map<string, any>): any {
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
      const tracks = useSequencerStore.getState().tracks;
      const puxTrack = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
      const coroTrack = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
      const toadaTrack = tracks.find((t) => isToadaBus(t));

      if (normalizedTrackId === 'coro' || (coroTrack && String(coroTrack.id) === normalizedTrackId)) {
        destNode = coroTrack ? ((trackInputs as any)?.[coroTrack.id] || (channels as any)?.[coroTrack.id]) : null;
      } else if (normalizedTrackId === 'puxador' || (puxTrack && String(puxTrack.id) === normalizedTrackId)) {
        destNode = puxTrack ? ((trackInputs as any)?.[puxTrack.id] || (channels as any)?.[puxTrack.id]) : null;
      }
      if (!destNode && toadaTrack) destNode = (busInputs as any)?.[toadaTrack.id] || (busChannels as any)?.[toadaTrack.id];
      if (!destNode) destNode = masterVolumeNode;
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
      if (finalDest) { try { synth.connect(finalDest as any); } catch (_) {} }
      this.voiceSynths.set(normalizedTrackId, synth);
      if (normalizedTrackId === 'default' || !this.voiceSynth) this.voiceSynth = synth;
      return synth;
    } catch (err) {
      console.error('AudioEngine: Error creating voiceSynth for track', normalizedTrackId, err);
      return null;
    }
  }

  public initVoiceSynth(presetId?: VocalPresetId, instrumentChannels?: Map<string, any>): void {
    if (!getTone()) return;
    const activeKeys = Array.from(this.voiceSynths.keys()).filter((k) => !k.startsWith('legato:'));
    if (presetId) this.currentVocalPreset = presetId;
    this.disposeAllVoices();
    for (const k of activeKeys) this.getOrCreateVoiceSynth(k, instrumentChannels);
  }

  public applyVocalPreset(presetId: VocalPresetId, instrumentChannels?: Map<string, any>): void {
    this.initVoiceSynth(presetId, instrumentChannels);
  }

  public releaseAllVoices(): void {
    const synths = new Set<any>(this.voiceSynths.values());
    if (this.voiceSynth) synths.add(this.voiceSynth);
    synths.forEach((synth) => {
      try { if (typeof synth.releaseAll === 'function') synth.releaseAll(); else synth.triggerRelease?.(); } catch (_) {}
    });
    this.voiceOverlap.clear();
  }

  public releaseVoicesForTrack(trackId: string | number): void {
    const key = String(trackId);
    for (const k of [key, `legato:${key}`]) {
      const s = this.voiceSynths.get(k);
      if (!s) continue;
      try { if (typeof s.releaseAll === 'function') s.releaseAll(); else s.triggerRelease?.(); } catch (_) {}
    }
    this.voiceOverlap.clearTrack(key);
  }

  public disposeAllVoices(): void {
    const synths = new Set<any>(this.voiceSynths.values());
    if (this.voiceSynth) synths.add(this.voiceSynth);
    synths.forEach((synth) => {
      try { if (typeof synth.releaseAll === 'function') synth.releaseAll(); else synth.triggerRelease?.(); } catch (_) {}
      try { synth.disconnect(); } catch (_) {}
      try { synth.dispose(); } catch (_) {}
    });
    this.voiceSynths.clear();
    this.voiceSynth = null;
    this.voiceOverlap.clear();
  }
}
