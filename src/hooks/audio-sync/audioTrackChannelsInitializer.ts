import * as Tone from 'tone';
import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { channels, meters, reverbSends, distortionSends, busInputs, busChannels, masterVolumeNode, masterVocalInputNode } from './audioEngineNodes';
import { percentToDb } from './audioParamsCache';
import { applyMonoCompatiblePan } from '../../utils/audio/monoCompatiblePan';
import { faderPositionToDb } from '../../utils/audioMath';
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
      trackInputs[t.id] = new Tone.Gain(1.0);
    }
    syncTrackInsertChain(t.id, t);

    const gainNode = trackInputs[t.id] || channels[t.id];
    engine?.setInstrumentChannel(t.id, inst.id, gainNode);

    const isConnectedToBus = Boolean(targetBusId !== null && (busInputs[targetBusId] || busChannels[targetBusId]));
    const effectiveVol = isConnectedToBus ? (t.volumeVal ?? 75) : getEffectiveVolume(tracks, t.id);
    const db = faderPositionToDb(effectiveVol);
    const safeDb = Number.isFinite(db) ? db : -100;
    const { acousticPan, panCompensationDb } = applyMonoCompatiblePan(t.panVal ?? t.pan);
    const finalDb = safeDb > -90 ? safeDb + panCompensationDb : safeDb;
    const muteState = getEffectiveMuteState(tracks, t.id);

    channels[t.id].volume.value = finalDb;
    channels[t.id].pan.value = acousticPan;
    channels[t.id].mute = muteState;
    if (t.isLinkMaster) {
      syncBusSendVcaGain(t.id, computeBusLinearVcaGain(t, tracks), 0.01);
    }

    if (reverbSends[t.id]) {
      const targetRevDb = percentToDb(disableFx ? 0 : (t.fxSends?.reverb ?? t.reverbVal ?? 0));
      try { reverbSends[t.id].gain.value = targetRevDb; } catch (_) {}
    }
    if (distortionSends[t.id]) {
      const targetDistDb = percentToDb(disableFx ? 0 : (t.fxSends?.distortion ?? 0));
      try { distortionSends[t.id].gain.value = targetDistDb; } catch (_) {}
    }

    const lowCut = t.lowCut ?? false;
    const eqLowG = t.eqBands?.low?.g ?? 0;
    const eqLowF = t.eqBands?.low?.f ?? 100;
    const eqMidG = t.eqBands?.mid?.g ?? 0;
    const eqMidF = t.eqBands?.mid?.f ?? 1000;
    const eqMidQ = t.eqBands?.mid?.q ?? 'wide';
    const eqHighG = t.eqBands?.high?.g ?? 0;
    const eqHighF = t.eqBands?.high?.f ?? 8000;
    const reverb = t.fxSends?.reverb ?? t.reverbVal ?? 0;
    const distortion = t.fxSends?.distortion ?? 0;
    lastAppliedTracksParamsRef.current[t.id] = `${finalDb}_${acousticPan}_${muteState}_${reverb}_${distortion}_${lowCut}_${eqLowG}_${eqLowF}_${eqMidG}_${eqMidF}_${eqMidQ}_${eqHighG}_${eqHighF}`;
  });
}
