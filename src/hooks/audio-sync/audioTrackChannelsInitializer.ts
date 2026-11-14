import * as Tone from 'tone';
import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { channels, meters, reverbSends, distortionSends, busInputs, busChannels, masterVolumeNode, masterVocalInputNode } from './audioEngineNodes';
import { percentToDb } from './audioParamsCache';
import { applyMonoCompatiblePan } from '../../utils/audio/monoCompatiblePan';
import { CONSOLE_HEADROOM_GAIN } from '../../utils/audioMath';
import { getEffectiveVolume, getEffectiveMuteState, useSequencerStore } from '../../stores/useSequencerStore';
import { createLightweightSacAnalyser } from '../../components/controls/vuMeterMath';
import {
  trackInputs,
  syncTrackInsertChain,
  ensureAuxSendNodes,
  ensureBusSendVcaNodes,
  wireBusSendVcaOutput,
  wireAuxSendsToParentOrReceive,
  syncBusSendVcaGain,
  computeBusLinearVcaGain,
  resolveImmediateBusId,
} from '../../audio/effectsChain';
import { AudioEngine } from '../../AudioEngine';
import { applyInputPolarity } from '../../utils/audio/polarityGain';
import { applyAuxSendLinear, applyChannelVolumeLinear, computeChannelEffectiveLinearGain } from '../../utils/audio/channelFaderLinearRamp';

export function initTrackChannelsAudioNodes(
  tracks: TrackGroup[],
  _isEco: boolean,
  lastAppliedBussesRef: React.MutableRefObject<Record<string, string | null>>,
  lastAppliedTracksParamsRef: React.MutableRefObject<Record<string, string>>,
  engine: AudioEngine | null
) {
  const disableFx = Boolean(useSequencerStore.getState().ecoConfig?.disableFx);
  tracks.forEach((t) => {
    if (t.isBusFolder || t.isLinkFolder) return;
    const inst = instrumentsConfig[t.instrumentIdx];
    if (!inst) return;

    const initialRevDb = percentToDb(disableFx ? 0 : (t.fxSends?.reverb ?? t.reverbVal ?? 0));
    const initialDistDb = percentToDb(disableFx ? 0 : (t.fxSends?.distortion ?? 0));

    if (!channels[t.id]) {
      channels[t.id] = new Tone.Channel({ volume: 0 });
      try {
        channels[t.id].channelCount = 2;
        channels[t.id].channelCountMode = 'explicit';
      } catch (_) {}

      meters[t.id] = createLightweightSacAnalyser();
      Tone.connect(channels[t.id], meters[t.id]);
    }
    ensureAuxSendNodes(t.id, initialRevDb, initialDistDb);

    const targetBusId = resolveImmediateBusId(t, tracks);
    const targetBusNode: any = targetBusId !== null
      ? (busInputs[targetBusId] || busChannels[targetBusId] || trackInputs[targetBusId] || null)
      : null;

    if (t.isLinkMaster) {
      ensureBusSendVcaNodes(t.id, computeBusLinearVcaGain(t, tracks));
      wireBusSendVcaOutput(t.id, targetBusId);
    }

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
    if (meters[t.id]) Tone.connect(channels[t.id], meters[t.id]);
    wireAuxSendsToParentOrReceive(t.id, targetBusId);

    lastAppliedBussesRef.current[t.id] = targetBusId !== null ? String(targetBusId) : null;

    if (!trackInputs[t.id]) {
      trackInputs[t.id] = new Tone.Gain(CONSOLE_HEADROOM_GAIN);
    }
    applyInputPolarity(trackInputs[t.id], CONSOLE_HEADROOM_GAIN, Boolean(t.phaseInverted), true);
    syncTrackInsertChain(t.id, t);

    const gainNode = trackInputs[t.id] || channels[t.id];
    engine?.setInstrumentChannel(t.id, inst.id, gainNode);

    const isConnectedToBus = Boolean(targetBusId !== null && (busInputs[targetBusId] || busChannels[targetBusId]));
    const effectiveVol = isConnectedToBus ? (t.volumeVal ?? 75) : getEffectiveVolume(tracks, t.id);
    const { acousticPan, panCompensationDb } = applyMonoCompatiblePan(t.panVal ?? t.pan);
    const muteState = getEffectiveMuteState(tracks, t.id);
    const effectiveLin = computeChannelEffectiveLinearGain(effectiveVol, panCompensationDb, muteState);
    const reverb = t.fxSends?.reverb ?? t.reverbVal ?? 0;
    const distortion = t.fxSends?.distortion ?? 0;

    applyChannelVolumeLinear(channels[t.id], effectiveVol, panCompensationDb, muteState, 0, true);
    channels[t.id].pan.value = acousticPan;
    if (t.isLinkMaster) {
      syncBusSendVcaGain(t.id, muteState ? 0 : computeBusLinearVcaGain(t, tracks), 0.01);
    }

    applyAuxSendLinear(reverbSends[t.id], reverb, disableFx || muteState, 0, true);
    applyAuxSendLinear(distortionSends[t.id], distortion, disableFx || muteState, 0, true);

    const bypassKey = t.automationBypass ? `${!!t.automationBypass.volume}_${!!t.automationBypass.pan}_${!!t.automationBypass.reverb}` : '';
    lastAppliedTracksParamsRef.current[t.id] = `${effectiveLin.toFixed(6)}_${acousticPan}_${muteState}_${reverb}_${distortion}_${disableFx}_${bypassKey}`;
  });
}
