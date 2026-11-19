import * as Tone from 'tone';
import { Track } from '../../types';
import { instrumentsConfig } from '../../data';
import { getEffectiveVolume, getEffectiveMuteState, getEffectiveRodaBreathingAmount, useSequencerStore } from '../../stores/useSequencerStore';
import { CONSOLE_HEADROOM_GAIN } from '../../utils/audioMath';
import { isTrackMutedByPracticeMode } from '../../utils/practiceAudioMuteGuard';
import { percentToDb } from './audioParamsCache';
import { applyMonoCompatiblePan } from '../../utils/audio/monoCompatiblePan';
import { createLightweightSacAnalyser } from '../../components/controls/vuMeterMath';
import {
  syncTrackInsertChain, ensureAuxSendNodes, ensureBusSendVcaNodes, wireBusSendVcaOutput,
  wireAuxSendsToParentOrReceive, syncBusSendVcaGain, computeBusLinearVcaGain,
  resolveImmediateBusId, connectChannelThroughRodaSubBus, syncLiveRodaSpectralSubBuses,
} from '../../audio/effectsChain';
import { safeRampPan } from '../../utils/audio/safeAudioParamRamp';
import { applyAuxSendLinear, applyChannelVolumeLinear, computeChannelEffectiveLinearGain } from '../../utils/audio/channelFaderLinearRamp';
import { busInputs, masterVocalInputNode } from './audioEngineNodes';
import { AudioEngine } from '../../AudioEngine';
import { applyInputPolarity } from '../../utils/audio/polarityGain';

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
    lastAppliedBussesRef, masterVolumeNode, audioEngine,
  } = p;
  const seqSt = useSequencerStore.getState();
  const disableFx = Boolean(seqSt.ecoConfig?.disableFx), disableEq = Boolean(seqSt.ecoConfig?.disableEq);
  const effBreathing = getEffectiveRodaBreathingAmount(seqSt);
  const familyCache = new Set<string>();

  tracks.forEach((t) => {
    if (t.isBusFolder || t.isLinkFolder) return;
    const inst = instrumentsConfig[t.instrumentIdx];
    if (!inst) return;

    const reverb = t.fxSends?.reverb ?? t.reverbVal ?? 0;
    const distortion = t.fxSends?.distortion ?? 0;

    if (!channels[t.id]) {
      channels[t.id] = new Tone.Channel({ volume: 0 });
      try { channels[t.id].channelCount = 2; channels[t.id].channelCountMode = 'explicit'; } catch (_) {}
      meters[t.id] = createLightweightSacAnalyser();
      Tone.connect(channels[t.id], meters[t.id]);
    }
    ensureAuxSendNodes(t.id, percentToDb(disableFx ? 0 : reverb), percentToDb(disableFx ? 0 : distortion));
    if (t.isLinkMaster) ensureBusSendVcaNodes(t.id, computeBusLinearVcaGain(t, tracks));
    if (!trackInputs[t.id]) {
      trackInputs[t.id] = new Tone.Gain(CONSOLE_HEADROOM_GAIN);
      syncTrackInsertChain(t.id, t);
    }
    applyInputPolarity(trackInputs[t.id], CONSOLE_HEADROOM_GAIN, Boolean(t.phaseInverted));

    const gainNode = trackInputs[t.id] || channels[t.id];
    audioEngine?.setInstrumentChannel(t.id, inst.id, gainNode);

    const targetBusId = resolveImmediateBusId(t, tracks);
    const isConnectedToBus = Boolean(targetBusId !== null && (busInputs[targetBusId] || busChannels[targetBusId]));
    const effectiveVol = isConnectedToBus ? (t.volumeVal ?? 75) : getEffectiveVolume(tracks, t.id);
    const { acousticPan, panCompensationDb } = applyMonoCompatiblePan(t.panVal ?? t.pan);
    const muteState = getEffectiveMuteState(tracks, t.id) || isTrackMutedByPracticeMode(t.id, tracks, seqSt, familyCache);
    const effectiveLin = computeChannelEffectiveLinearGain(effectiveVol, panCompensationDb, muteState);

    const lowCut = t.lowCut ?? false;
    const eqLowG = t.eqBands?.low?.g ?? 0, eqLowF = t.eqBands?.low?.f ?? 100;
    const eqMidG = t.eqBands?.mid?.g ?? 0, eqMidF = t.eqBands?.mid?.f ?? 1000, eqMidQ = t.eqBands?.mid?.q ?? 'wide';
    const eqHighG = t.eqBands?.high?.g ?? 0, eqHighF = t.eqBands?.high?.f ?? 8000;
    const bypassKey = t.automationBypass ? `${!!t.automationBypass.volume}_${!!t.automationBypass.pan}_${!!t.automationBypass.reverb}` : '';

    const channelHash = `${effectiveLin.toFixed(6)}_${acousticPan}_${muteState}_${reverb}_${distortion}_${disableFx}_${bypassKey}`;
    const eqHash = `eq_${lowCut}_${eqLowG}_${eqLowF}_${eqMidG}_${eqMidF}_${eqMidQ}_${eqHighG}_${eqHighF}`;

    if (lastAppliedTracksParamsRef.current[t.id] !== channelHash) {
      applyChannelVolumeLinear(channels[t.id], effectiveVol, panCompensationDb, muteState, 0.018);
      safeRampPan(channels[t.id].pan, acousticPan, 0.02);
      if (t.isLinkMaster) syncBusSendVcaGain(t.id, muteState ? 0 : computeBusLinearVcaGain(t, tracks), 0.018);
      applyAuxSendLinear(reverbSends[t.id], reverb, disableFx || muteState, 0.018);
      applyAuxSendLinear(distortionSends[t.id], distortion, disableFx || muteState, 0.018);
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
      const finalTarget = targetBusNode || masterTarget;
      if (finalTarget) {
        const destKey = targetBusNode && targetBusId !== null ? `bus_${targetBusId}` : 'master';
        connectChannelThroughRodaSubBus(channels[t.id], inst.id, destKey, finalTarget, tracks, effBreathing, disableEq);
      }

      if (reverbSends[t.id]) channels[t.id].connect(reverbSends[t.id]);
      if (distortionSends[t.id]) channels[t.id].connect(distortionSends[t.id]);
      if (meters[t.id]) Tone.connect(channels[t.id], meters[t.id]);
      wireAuxSendsToParentOrReceive(t.id, targetBusId);
      if (t.isLinkMaster) wireBusSendVcaOutput(t.id, targetBusId);

      lastAppliedBussesRef.current[t.id] = busKey;
    }
  });
  syncLiveRodaSpectralSubBuses(tracks, effBreathing, disableEq);
}
