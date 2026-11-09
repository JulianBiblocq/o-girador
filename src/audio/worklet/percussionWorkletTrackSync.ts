/**
 * O Girador - Synchronisation Différentielle des Pistes vers AudioWorklet (< 125 lignes)
 * - SSOT Accordage (`EngineTuning`) et Mute (`getEffectiveMuteState` sans dépendance à `track.volume`).
 * - Filtrage différentiel strict par slot (`Math.abs(delta) > 1e-5`) : 0 spam IPC à 60 Hz.
 */

import { instrumentsConfig } from '../../data';
import { InstrumentAudioConfig } from '../../data/audioConfig';
import { getEffectiveMuteState } from '../../stores/useSequencerStore';
import { TrackGroup } from '../../types';
import { EngineTuning } from '../engine/engineTuning';
import { MAX_WORKLET_OUTPUTS, UpdateTrackSlotMessage } from './percussionWorkletTypes';
import { WorkletMessagePortLike } from './percussionWorkletSampleBridge';
import { PercussionWorkletSlotRouter } from './percussionWorkletSlotRouter';

export class PercussionWorkletTrackSync {
  private readonly lastTrackId = new Int32Array(MAX_WORKLET_OUTPUTS).fill(-1);
  private readonly lastMuted = new Int8Array(MAX_WORKLET_OUTPUTS).fill(-1);
  private readonly lastPitchRatio = new Float32Array(MAX_WORKLET_OUTPUTS).fill(-1);
  private readonly lastDecayNorm = new Float32Array(MAX_WORKLET_OUTPUTS).fill(-1);
  private readonly trackUnisonDelaySec = new Map<number, number>();
  private readonly trackInstrumentId = new Map<number, string>();

  public resetDiffCache(): void {
    this.lastTrackId.fill(-1);
    this.lastMuted.fill(-1);
    this.lastPitchRatio.fill(-1);
    this.lastDecayNorm.fill(-1);
  }

  public invalidateSlot(slot: number): void {
    if (slot >= 0 && slot < MAX_WORKLET_OUTPUTS) {
      this.lastTrackId[slot] = -1;
      this.lastMuted[slot] = -1;
      this.lastPitchRatio[slot] = -1;
      this.lastDecayNorm[slot] = -1;
    }
  }

  public syncTracks(
    port: WorkletMessagePortLike | null,
    tracks: TrackGroup[],
    slotRouter: PercussionWorkletSlotRouter,
    configMap: Map<string, InstrumentAudioConfig>
  ): void {
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if (!track || track.isBusFolder || track.isLinkFolder) continue;

      const trackId = Number(track.id);
      if (!Number.isFinite(trackId)) continue;

      const inst = instrumentsConfig[track.instrumentIdx];
      const instrumentId = inst ? inst.id : '';
      this.trackInstrumentId.set(trackId, instrumentId);
      this.trackUnisonDelaySec.set(
        trackId,
        EngineTuning.calculateUnisonMicroDelaySec(track, instrumentId)
      );

      const slot = slotRouter.getTrackSlot(trackId);
      if (slot <= 0 || slot >= MAX_WORKLET_OUTPUTS) continue;

      const config = instrumentId ? configMap.get(instrumentId) : undefined;
      const basePitch = config ? EngineTuning.calculatePitch(instrumentId, config, track) : 1.0;
      const detune = instrumentId ? EngineTuning.calculateMicroDetuneMultiplier(instrumentId, trackId) : 1.0;
      const pitchRatio = basePitch * detune;

      const rawDecay = track.trackDecay !== undefined ? track.trackDecay : 1.0;
      const decayNorm = rawDecay <= 0 ? 1.0 : (rawDecay > 1 ? rawDecay / 100 : rawDecay);
      const isMuted = getEffectiveMuteState(tracks, trackId);
      const mutedFlag = isMuted ? 1 : 0;

      const hasChanged =
        this.lastTrackId[slot] !== trackId ||
        this.lastMuted[slot] !== mutedFlag ||
        Math.abs(this.lastPitchRatio[slot] - pitchRatio) > 1e-5 ||
        Math.abs(this.lastDecayNorm[slot] - decayNorm) > 1e-5;

      if (hasChanged && port) {
        this.lastTrackId[slot] = trackId;
        this.lastMuted[slot] = mutedFlag;
        this.lastPitchRatio[slot] = pitchRatio;
        this.lastDecayNorm[slot] = decayNorm;

        const msg: UpdateTrackSlotMessage = {
          type: 'UPDATE_TRACK_SLOT',
          slot,
          trackId,
          isMuted,
          pitchRatio,
          decayNorm,
        };
        try {
          port.postMessage(msg);
        } catch (_) {}
      }
    }
  }

  public getTrackUnisonDelaySec(trackId: number | string): number {
    return this.trackUnisonDelaySec.get(Number(trackId)) ?? 0;
  }

  public getTrackInstrumentId(trackId: number | string): string {
    return this.trackInstrumentId.get(Number(trackId)) ?? '';
  }

  public dispose(): void {
    this.resetDiffCache();
    this.trackUnisonDelaySec.clear();
    this.trackInstrumentId.clear();
  }
}
