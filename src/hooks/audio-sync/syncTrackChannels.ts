import * as Tone from 'tone';
import { Track } from '../../types';
import { instrumentsConfig } from '../../data';
import { getEffectiveVolume, getEffectiveMuteState, useSequencerStore } from '../../stores/useSequencerStore';
import { faderPositionToDb } from '../../utils/audioMath';
import { percentToDb } from './audioParamsCache';
import { applyMonoCompatiblePan } from '../../utils/audio/monoCompatiblePan';
import {
  syncTrackInsertChain,
  ensureAuxSendNodes,
  ensureBusSendVcaNodes,
  wireBusSendVcaOutput,
  wireAuxSendsToParentOrReceive,
  syncBusSendVcaGain,
  computeBusLinearVcaGain,
  resolveImmediateBusId,
} from '../../audio/effectsChain';
import { safeRampDb, safeRampPan } from '../../utils/audio/safeAudioParamRamp';
import { busInputs, masterVocalInputNode } from './audioEngineNodes';
import { AudioEngine } from '../../AudioEngine';

export interface SyncTrackChannelsParams {
  tracks: Track[];
  isEcoMode: boolean;
  channels: Record<string | number, Tone.Channel>;
  meters: Record<string | number, any>;
  trackInputs: Record<string | number, any>;
  busChannels: Record<string | number, Tone.Channel>;
  reverbSends: Record<string | number, any>;
  distortionSends: Record<string | number, any>;
  lastAppliedTracksParamsRef: { current: Record<string | number, string> };
  lastAppliedBussesRef: { current: Record<string | number, string | number | null> };
  masterVolumeNode: any;
  audioEngine: AudioEngine | null;
}

export function syncTrackChannels(p: SyncTrackChannelsParams): void {
  const {
    tracks, channels, meters, trackInputs, busChannels,
    reverbSends, distortionSends, lastAppliedTracksParamsRef,
    lastAppliedBussesRef, masterVolumeNode, audioEngine
  } = p;
  const disableFx = Boolean(useSequencerStore.getState().ecoConfig?.disableFx);

  tracks.forEach((t) => {
    if (t.isBusFolder || t.isLinkFolder) return;
    const inst = instrumentsConfig[t.instrumentIdx];
    if (!inst) return;

    const reverb = t.fxSends?.reverb ?? t.reverbVal ?? 0;
    const distortion = t.fxSends?.distortion ?? 0;

    if (!channels[t.id]) {
      channels[t.id] = new Tone.Channel({ volume: 0 });
      try { channels[t.id].channelCount = 2; channels[t.id].channelCountMode = "explicit"; } catch (_) {}
      meters[t.id] = new Tone.Analyser({ type: "waveform", size: 1024, channels: 2 }) as any;
      channels[t.id].connect(meters[t.id]);
    }
    ensureAuxSendNodes(t.id, percentToDb(disableFx ? 0 : reverb), percentToDb(disableFx ? 0 : distortion));
    if (t.isLinkMaster) ensureBusSendVcaNodes(t.id, computeBusLinearVcaGain(t, tracks));
    if (!trackInputs[t.id]) {
      trackInputs[t.id] = new Tone.Gain(1.0);
      syncTrackInsertChain(t.id, t);
    }

    const gainNode = trackInputs[t.id] || channels[t.id];
    audioEngine?.setInstrumentChannel(t.id, inst.id, gainNode);

    const targetBusId = resolveImmediateBusId(t, tracks);
    const isConnectedToBus = Boolean(targetBusId !== null && (busInputs[targetBusId] || busChannels[targetBusId]));
    const effectiveVol = isConnectedToBus ? (t.volumeVal ?? 75) : getEffectiveVolume(tracks, t.id);
    const db = faderPositionToDb(effectiveVol);
    const safeDb = Number.isFinite(db) ? db : -100;
    const { acousticPan, panCompensationDb } = applyMonoCompatiblePan(t.panVal ?? t.pan);
    const finalDb = safeDb > -90 ? safeDb + panCompensationDb : safeDb;
    const muteState = getEffectiveMuteState(tracks, t.id);

    const lowCut = t.lowCut ?? false;
    const eqLowG = t.eqBands?.low?.g ?? 0;
    const eqLowF = t.eqBands?.low?.f ?? 100;
    const eqMidG = t.eqBands?.mid?.g ?? 0;
    const eqMidF = t.eqBands?.mid?.f ?? 1000;
    const eqMidQ = t.eqBands?.mid?.q ?? 'wide';
    const eqHighG = t.eqBands?.high?.g ?? 0;
    const eqHighF = t.eqBands?.high?.f ?? 8000;
    const bypassKey = t.automationBypass ? `${!!t.automationBypass.volume}_${!!t.automationBypass.pan}_${!!t.automationBypass.reverb}` : '';

    const channelHash = `${finalDb}_${acousticPan}_${muteState}_${reverb}_${distortion}_${disableFx}_${bypassKey}`;
    const eqHash = `eq_${lowCut}_${eqLowG}_${eqLowF}_${eqMidG}_${eqMidF}_${eqMidQ}_${eqHighG}_${eqHighF}`;

    if (lastAppliedTracksParamsRef.current[t.id] !== channelHash) {
      safeRampDb(channels[t.id].volume, finalDb, 0.02);
      safeRampPan(channels[t.id].pan, acousticPan, 0.02);
      channels[t.id].mute = muteState;
      if (t.isLinkMaster) {
        syncBusSendVcaGain(t.id, computeBusLinearVcaGain(t, tracks), 0.02);
      }
      if (reverbSends[t.id]) safeRampDb(reverbSends[t.id].gain, percentToDb(disableFx ? 0 : reverb), 0.02);
      if (distortionSends[t.id]) safeRampDb(distortionSends[t.id].gain, percentToDb(disableFx ? 0 : distortion), 0.02);
      lastAppliedTracksParamsRef.current[t.id] = channelHash;
    }

    const eqKey = `eq_${t.id}`;
    if (lastAppliedTracksParamsRef.current[eqKey] !== eqHash) {
      syncTrackInsertChain(t.id, t);
      lastAppliedTracksParamsRef.current[eqKey] = eqHash;
    }

    const targetBusNode: any = targetBusId !== null
      ? (busInputs[targetBusId] || busChannels[targetBusId] || trackInputs[targetBusId] || null)
      : null;

    const busKey = targetBusId !== null ? String(targetBusId) : null;
    if (lastAppliedBussesRef.current[t.id] !== busKey || !channels[t.id]) {
      channels[t.id].disconnect();
      const isVocalTrack = inst.type === 'voice' || inst.id === 'puxador' || inst.id === 'coro' || inst.id === 'toada';
      const masterTarget = (isVocalTrack && masterVocalInputNode) ? masterVocalInputNode : masterVolumeNode;
      if (targetBusNode) {
        channels[t.id].connect(targetBusNode);
      } else if (masterTarget) {
        channels[t.id].connect(masterTarget);
      }

      if (reverbSends[t.id]) channels[t.id].connect(reverbSends[t.id]);
      if (distortionSends[t.id]) channels[t.id].connect(distortionSends[t.id]);
      if (meters[t.id]) channels[t.id].connect(meters[t.id]);
      wireAuxSendsToParentOrReceive(t.id, targetBusId);
      if (t.isLinkMaster) wireBusSendVcaOutput(t.id, targetBusId);

      lastAppliedBussesRef.current[t.id] = busKey;
    }
  });
}
