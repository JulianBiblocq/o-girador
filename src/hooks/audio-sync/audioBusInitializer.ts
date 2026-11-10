import * as Tone from 'tone';
import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { busInputs, busChannels, busMeters, reverbSends, distortionSends, masterVolumeNode, masterVocalInputNode } from './audioEngineNodes';
import { percentToDb } from './audioParamsCache';
import { applyMonoCompatiblePan } from '../../utils/audio/monoCompatiblePan';
import { faderPositionToDb } from '../../utils/audioMath';
import { getEffectiveVolume, getEffectiveMuteState, useSequencerStore } from '../../stores/useSequencerStore';
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
      busMeters[t.id] = new Tone.Analyser({ type: 'waveform', size: 1024, channels: 2 }) as any;
      channelNode.connect(busMeters[t.id]);
    }

    if (!busInputs[t.id]) {
      busInputs[t.id] = new Tone.Gain(1.0);
    }
    syncBusInsertChain(t.id, t);

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
    if (busMeters[t.id]) busChannels[t.id].connect(busMeters[t.id]!);
    wireBusSendVcaOutput(t.id, currentBusId);
    wireAuxSendsToParentOrReceive(t.id, currentBusId);

    lastAppliedBussesRef.current[t.id] = currentBusId !== null ? String(currentBusId) : null;

    const isConnectedToParentBus = Boolean(currentBusId !== null && (busInputs[currentBusId] || busChannels[currentBusId]));
    const effectiveVol = isConnectedToParentBus ? (t.volumeVal ?? 75) : getEffectiveVolume(tracks, t.id);
    const db = faderPositionToDb(effectiveVol);
    const safeDb = Number.isFinite(db) ? db : -100;
    const { acousticPan } = applyMonoCompatiblePan(t.panVal ?? t.pan);
    const muteState = getEffectiveMuteState(tracks, t.id);

    busChannels[t.id].volume.value = safeDb;
    busChannels[t.id].pan.value = acousticPan;
    busChannels[t.id].mute = muteState;
    syncBusSendVcaGain(t.id, computeBusLinearVcaGain(t, tracks), 0.01);

    const lowCut = t.lowCut ?? false;
    const eqLowG = t.eqBands?.low?.g ?? 0;
    const eqLowF = t.eqBands?.low?.f ?? 100;
    const eqMidG = t.eqBands?.mid?.g ?? 0;
    const eqMidF = t.eqBands?.mid?.f ?? 1000;
    const eqMidQ = t.eqBands?.mid?.q ?? 'wide';
    const eqHighG = t.eqBands?.high?.g ?? 0;
    const eqHighF = t.eqBands?.high?.f ?? 8000;

    lastAppliedTracksParamsRef.current[t.id] = `bus_${safeDb}_${acousticPan}_${muteState}_${reverb}_${distortion}_${lowCut}_${eqLowG}_${eqLowF}_${eqMidG}_${eqMidF}_${eqMidQ}_${eqHighG}_${eqHighF}`;
  });
}
