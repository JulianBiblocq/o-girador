/**
 * O Girador - Synchronisation Différentielle des Pistes & Escouades Spatiales vers AudioWorklet (< 140 lignes)
 * - SSOT Accordage (`EngineTuning`), Tempérament de Section, Escouades Spatiales `(x, y)` et Mute.
 */
import { instrumentsConfig } from '../../data';
import { InstrumentAudioConfig } from '../../data/audioConfig';
import { getEffectiveMuteState, getEffectiveSkinChorusAmount, useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { TrackGroup } from '../../types';
import { isAutomationBypassed } from '../../utils/automationBypassHelper';
import { hasActiveTrackAutomation } from '../../utils/automationDetectHelper';
import { isTrackMutedByPracticeMode } from '../../utils/practiceAudioMuteGuard';
import { EngineTuning } from '../engine/engineTuning';
import { computeSectionTemperamentMap, NEUTRAL_SECTION_TEMPERAMENT } from '../groove/sectionTemperament';
import { computeAlfaiaHighBpmDecayNorm } from '../groove/strokeHumanizationDsp';
import { resolveTrackSectionSpatialProfile, SectionSpatialProfile } from '../spatial/sectionSpatialAcoustics';
import { MAX_WORKLET_OUTPUTS, MAX_WORKLET_PLAYERS_PER_SLOT, UpdateTrackSlotMessage } from './percussionWorkletTypes';
import { WorkletMessagePortLike } from './percussionWorkletSampleBridge';
import { PercussionWorkletSlotRouter } from './percussionWorkletSlotRouter';

export class PercussionWorkletTrackSync {
  private readonly lastTrackId = new Int32Array(MAX_WORKLET_OUTPUTS).fill(-1);
  private readonly lastMuted = new Int8Array(MAX_WORKLET_OUTPUTS).fill(-1);
  private readonly lastPitchRatio = new Float32Array(MAX_WORKLET_OUTPUTS).fill(-1);
  private readonly lastDecayNorm = new Float32Array(MAX_WORKLET_OUTPUTS).fill(-1);
  private readonly lastSpatialHash: string[] = new Array(MAX_WORKLET_OUTPUTS).fill('');
  private readonly trackUnisonDelaySec = new Map<number, number>();
  private readonly trackBalancoAdherence = new Map<number, number>();
  private readonly trackPartnerRank = new Map<number, number>();
  private readonly trackPitchRatio = new Map<number, number>();
  private readonly trackInstrumentId = new Map<number, string>();
  private readonly trackSpatialProfile = new Map<number, SectionSpatialProfile>();

  public resetDiffCache(): void {
    this.lastTrackId.fill(-1); this.lastMuted.fill(-1);
    this.lastPitchRatio.fill(-1); this.lastDecayNorm.fill(-1);
    this.lastSpatialHash.fill('');
  }

  public invalidateSlot(slot: number): void {
    if (slot >= 0 && slot < MAX_WORKLET_OUTPUTS) {
      this.lastTrackId[slot] = -1; this.lastMuted[slot] = -1;
      this.lastPitchRatio[slot] = -1; this.lastDecayNorm[slot] = -1;
      this.lastSpatialHash[slot] = '';
    }
  }

  public syncTracks(
    port: WorkletMessagePortLike | null, tracks: TrackGroup[],
    slotRouter: PercussionWorkletSlotRouter, configMap: Map<string, InstrumentAudioConfig>, liveBpm?: number
  ): void {
    const soloPatternPlayId = useTransportStore.getState().soloPatternPlayId;
    const seqState = useSequencerStore.getState();
    const effBpm = liveBpm && liveBpm > 0 ? liveBpm : (seqState.bpm || 100);
    const chorusAmount = getEffectiveSkinChorusAmount(seqState);
    const isStrictAudioEco = Boolean(seqState.ecoConfig?.disableFx);
    const familyCache = new Set<string>();
    const temperamentMap = computeSectionTemperamentMap(tracks);

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if (!track || track.isBusFolder || track.isLinkFolder) continue;
      const trackId = Number(track.id);
      if (!Number.isFinite(trackId)) continue;

      const inst = instrumentsConfig[track.instrumentIdx];
      const instrumentId = inst ? inst.id : '';
      this.trackInstrumentId.set(trackId, instrumentId);
      const temp = temperamentMap.get(trackId) ?? NEUTRAL_SECTION_TEMPERAMENT;
      this.trackUnisonDelaySec.set(trackId, temp.attackSpreadSec);
      this.trackBalancoAdherence.set(trackId, temp.balancoAdherence);
      this.trackPartnerRank.set(trackId, temp.rank);

      const hasPanAuto = !isAutomationBypassed(track, 'pan', seqState.globalAutomationBypass) && hasActiveTrackAutomation(track, 'pan');
      const spatial = resolveTrackSectionSpatialProfile(track, instrumentId, isStrictAudioEco, hasPanAuto ? 0 : (track.panVal ?? track.pan ?? 0));
      this.trackSpatialProfile.set(trackId, spatial);

      const config = instrumentId ? configMap.get(instrumentId) : undefined;
      const pitchRatio = config ? EngineTuning.calculatePitch(instrumentId, config, track, undefined, tracks, chorusAmount) : 1.0;
      this.trackPitchRatio.set(trackId, pitchRatio);

      const slot = slotRouter.getTrackSlot(trackId);
      if (slot <= 0 || slot >= MAX_WORKLET_OUTPUTS) continue;

      const decayNorm = computeAlfaiaHighBpmDecayNorm(instrumentId, track.trackDecay, effBpm);
      const isPracticeMuted = soloPatternPlayId !== null ? false : isTrackMutedByPracticeMode(trackId, tracks, seqState, familyCache);
      const isMuted = (soloPatternPlayId !== null ? false : getEffectiveMuteState(tracks, trackId)) || isPracticeMuted;
      const mutedFlag = isMuted ? 1 : 0;

      const gainL: number[] = new Array(MAX_WORKLET_PLAYERS_PER_SLOT).fill(1);
      const gainR: number[] = new Array(MAX_WORKLET_PLAYERS_PER_SLOT).fill(1);
      const pitchMul: number[] = new Array(MAX_WORKLET_PLAYERS_PER_SLOT).fill(1);
      for (let k = 0; k < spatial.players.length && k < MAX_WORKLET_PLAYERS_PER_SLOT; k++) {
        gainL[k] = spatial.players[k].gainL;
        gainR[k] = spatial.players[k].gainR;
        pitchMul[k] = spatial.players[k].pitchMul;
      }
      const spHash = spatial.isNeutralSolo ? 'solo' : `${spatial.synthesizedCount}:${gainL.map((v) => v.toFixed(4)).join(',')}:${gainR.map((v) => v.toFixed(4)).join(',')}:${pitchMul.map((v) => v.toFixed(4)).join(',')}`;

      if (
        this.lastTrackId[slot] !== trackId || this.lastMuted[slot] !== mutedFlag ||
        Math.abs(this.lastPitchRatio[slot] - pitchRatio) > 1e-5 ||
        Math.abs(this.lastDecayNorm[slot] - decayNorm) > 1e-5 ||
        this.lastSpatialHash[slot] !== spHash
      ) {
        this.lastTrackId[slot] = trackId; this.lastMuted[slot] = mutedFlag;
        this.lastPitchRatio[slot] = pitchRatio; this.lastDecayNorm[slot] = decayNorm;
        this.lastSpatialHash[slot] = spHash;
        if (port) {
          const msg: UpdateTrackSlotMessage = { type: 'UPDATE_TRACK_SLOT', slot, trackId, isMuted, pitchRatio, decayNorm, playerGainL: gainL, playerGainR: gainR, playerPitchMul: pitchMul };
          try { port.postMessage(msg); } catch (_) {}
        }
      }
    }
  }

  public getTrackUnisonDelaySec(trackId: number | string): number { return this.trackUnisonDelaySec.get(Number(trackId)) ?? 0; }
  public getTrackBalancoAdherence(trackId: number | string): number { return this.trackBalancoAdherence.get(Number(trackId)) ?? 1.0; }
  public getTrackPartnerRank(trackId: number | string): number { return this.trackPartnerRank.get(Number(trackId)) ?? 0; }
  public getTrackPitchRatio(trackId: number | string): number { return this.trackPitchRatio.get(Number(trackId)) ?? 1.0; }
  public getTrackInstrumentId(trackId: number | string): string { return this.trackInstrumentId.get(Number(trackId)) ?? ''; }
  public getTrackSpatialProfile(trackId: number | string): SectionSpatialProfile | undefined { return this.trackSpatialProfile.get(Number(trackId)); }

  public releaseTrack(trackId: number | string): void {
    const numId = Number(trackId);
    this.trackUnisonDelaySec.delete(numId); this.trackBalancoAdherence.delete(numId); this.trackPartnerRank.delete(numId);
    this.trackPitchRatio.delete(numId); this.trackInstrumentId.delete(numId);
    this.trackSpatialProfile.delete(numId);
  }

  public dispose(): void {
    this.resetDiffCache();
    this.trackUnisonDelaySec.clear(); this.trackBalancoAdherence.clear(); this.trackPartnerRank.clear();
    this.trackPitchRatio.clear(); this.trackInstrumentId.clear();
    this.trackSpatialProfile.clear();
  }
}
