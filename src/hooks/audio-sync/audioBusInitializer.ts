import * as Tone from 'tone';
import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { busInputs, busChannels, busMeters, reverbSends, distortionSends, masterVolumeNode, masterVocalInputNode } from './audioEngineNodes';
import { percentToDb } from './audioParamsCache';
import { applyMonoCompatiblePan } from '../../utils/audio/monoCompatiblePan';
import { getEffectiveVolume, getEffectiveMuteState, useSequencerStore } from '../../stores/useSequencerStore';
import { createLightweightSacAnalyser } from '../../components/controls/vuMeterMath';
import {
  syncBusInsertChain,
  ensureAuxSendNodes,
  ensureBusSendVcaNodes,
  wireBusSendVcaOutput,
  wireAuxSendsToParentOrReceive,
  syncBusSendVcaGain,
  computeBusLinearVcaGain,
  resolveImmediateBusId,
} from '../../audio/effectsChain';
import { syncBusDynamics } from '../../audio/effects/busDynamicsSync';
import { applyAuxSendLinear, applyChannelVolumeLinear, computeChannelEffectiveLinearGain } from '../../utils/audio/channelFaderLinearRamp';

export function initBusesAudioNodes(
  tracks: TrackGroup[],
  _isEco: boolean,
  lastAppliedBussesRef: React.MutableRefObject<Record<string, string | null>>,
  lastAppliedTracksParamsRef: React.MutableRefObject<Record<string, string>>
) {
  const disableFx = Boolean(useSequencerStore.getState().ecoConfig?.disableFx);
  tracks.forEach((t) => {
    if (!t.isBusFolder && !t.isLinkFolder) return;

    if (!busChannels[t.id]) {
      const channelNode = new Tone.Channel({ volume: 0 });
      try {
        channelNode.channelCount = 2;
        channelNode.channelCountMode = 'explicit';
      } catch (_) {}

      busChannels[t.id] = channelNode;
      busMeters[t.id] = createLightweightSacAnalyser();
      Tone.connect(channelNode, busMeters[t.id]!);
    }

    if (!busInputs[t.id]) {
      busInputs[t.id] = new Tone.Gain(1.0);
    }
    syncBusInsertChain(t.id, t);
    syncBusDynamics(t, disableFx, true);

    const reverb = t.fxSends?.reverb ?? t.reverbVal ?? 0;
    const distortion = t.fxSends?.distortion ?? 0;
    ensureAuxSendNodes(t.id, percentToDb(disableFx ? 0 : reverb), percentToDb(disableFx ? 0 : distortion));
    ensureBusSendVcaNodes(t.id, computeBusLinearVcaGain(t, tracks));

    const currentBusId = resolveImmediateBusId(t, tracks);
    const inst = instrumentsConfig[t.instrumentIdx];
    const isVocalBus = inst?.id === 'toada' || inst?.type === 'voice' || (t.customName || '').trim().toLowerCase() === 'toada';
    const masterTarget = (isVocalBus && masterVocalInputNode) ? masterVocalInputNode : masterVolumeNode;
    busChannels[t.id].disconnect();
    const parentBusInput = currentBusId !== null ? (busInputs[currentBusId] || busChannels[currentBusId] || null) : null;
    if (parentBusInput) {
      busChannels[t.id].connect(parentBusInput);
    } else if (masterTarget) {
      busChannels[t.id].connect(masterTarget);
    }

    if (reverbSends[t.id]) busChannels[t.id].connect(reverbSends[t.id]);
    if (distortionSends[t.id]) busChannels[t.id].connect(distortionSends[t.id]);
    if (busMeters[t.id]) Tone.connect(busChannels[t.id], busMeters[t.id]!);
    wireBusSendVcaOutput(t.id, currentBusId);
    wireAuxSendsToParentOrReceive(t.id, currentBusId);

    lastAppliedBussesRef.current[t.id] = currentBusId !== null ? String(currentBusId) : null;

    const isConnectedToParentBus = Boolean(currentBusId !== null && (busInputs[currentBusId] || busChannels[currentBusId]));
    const effectiveVol = isConnectedToParentBus ? (t.volumeVal ?? 75) : getEffectiveVolume(tracks, t.id);
    const { acousticPan } = applyMonoCompatiblePan(t.panVal ?? t.pan);
    const muteState = getEffectiveMuteState(tracks, t.id);
    const effectiveLin = computeChannelEffectiveLinearGain(effectiveVol, 0, muteState);

    applyChannelVolumeLinear(busChannels[t.id], effectiveVol, 0, muteState, 0, true);
    busChannels[t.id].pan.value = acousticPan;
    syncBusSendVcaGain(t.id, muteState ? 0 : computeBusLinearVcaGain(t, tracks), 0.01);
    applyAuxSendLinear(reverbSends[t.id], reverb, disableFx || muteState, 0, true);
    applyAuxSendLinear(distortionSends[t.id], distortion, disableFx || muteState, 0, true);

    const bypassKey = t.automationBypass ? `${!!t.automationBypass.volume}_${!!t.automationBypass.pan}_${!!t.automationBypass.reverb}` : '';
    lastAppliedTracksParamsRef.current[t.id] = `bus_${effectiveLin.toFixed(6)}_${acousticPan}_${muteState}_${reverb}_${distortion}_${disableFx}_${bypassKey}`;
  });
}
