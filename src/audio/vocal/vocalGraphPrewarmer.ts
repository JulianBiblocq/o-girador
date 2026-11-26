/**
 * vocalGraphPrewarmer.ts — Pré-instanciation sobre du graphe vocal avant `Play` (< 90 lignes) :
 * - `0 RAM` si le morceau est un Baque 100 % percussions (aucune piste vocale active).
 * - Pré-instancie `VocalPlayerPool` (+ module Haas M/S Coro hors Éco) et `PolySynth` / `LegatoVoice`
 *   uniquement pour les pistes vocales réellement présentes dans le morceau.
 */
import { AudioEngine } from '../../AudioEngine';
import { instrumentsConfig } from '../../data';
import { useAudioStore } from '../../stores/useAudioStore';
import { isToadaBus } from '../../stores/useSequencerStore';
import { Track } from '../../types';
import { EngineLegatoVoice } from '../engine/engineLegatoVoice';
import { resolveVocalOutputNode } from './vocalOutputNode';
import { VocalPlayerPool } from './vocalPlayerPool';

function collectConcreteVoiceTracks(tracks: Track[], out: Track[] = []): Track[] {
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    if (!t) continue;
    if (Array.isArray((t as any).subTracks) && (t as any).subTracks.length > 0) {
      collectConcreteVoiceTracks((t as any).subTracks, out);
    }
    if (t.isBusFolder || t.isLinkFolder || isToadaBus(t)) continue;
    const inst = instrumentsConfig[t.instrumentIdx];
    if (inst?.type === 'voice') out.push(t);
  }
  return out;
}

export function prewarmVocalGraphForTracks(tracks: Track[], engine: AudioEngine | null): void {
  if (!tracks || tracks.length === 0) return;
  const voiceTracks = collectConcreteVoiceTracks(tracks);
  if (voiceTracks.length === 0) return;

  const audioState = useAudioStore.getState();
  const vocalBuffers = audioState.vocalBuffers || {};
  const vocalMode = audioState.vocalMode;

  for (let i = 0; i < voiceTracks.length; i++) {
    const track = voiceTracks[i];
    const inst = instrumentsConfig[track.instrumentIdx];
    const isCoro = inst?.id === 'coro';
    const outputNode = resolveVocalOutputNode(track.id, isCoro);
    let needsPolySynth = false;
    let needsLegatoSynth = false;

    for (const pat of track.patterns || []) {
      if (!pat) continue;
      const canonicalKey = `${track.id}_${pat.id}`;
      const buf =
        vocalBuffers[canonicalKey] ||
        vocalBuffers[pat.id] ||
        (pat.vocalClip?.id ? vocalBuffers[`${track.id}_${pat.vocalClip.id}`] || vocalBuffers[pat.vocalClip.id] : undefined);
      if (buf) {
        VocalPlayerPool.getOrCreate(canonicalKey, buf, outputNode, isCoro, track.id, true);
      }

      const hasActiveNotes = Boolean(
        !pat.ignoreMelodyPitch &&
        pat.notes?.some((n: any, idx: number) => Boolean(n && String(n).trim() && pat.activeSteps?.[idx] && pat.activeSteps[idx] !== '0'))
      );
      if (hasActiveNotes && (vocalMode === 'synth' || vocalMode === 'both' || !buf)) {
        needsPolySynth = true;
        if (pat.lyrics?.some((l: any) => typeof l === 'string' && l.trim() === '_')) {
          needsLegatoSynth = true;
        }
      }
    }

    if (engine && needsPolySynth) {
      engine.getOrCreateVoiceSynth(track.id);
      if (needsLegatoSynth) {
        const mgr = (engine as any).voiceSynthManager;
        if (mgr) EngineLegatoVoice.getOrCreate(mgr, track.id);
      }
    }
  }
}
