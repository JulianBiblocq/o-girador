import * as Tone from 'tone';
import { Track } from '../../types';
import { getEffectiveVolume, getEffectiveMuteState, useSequencerStore } from '../../stores/useSequencerStore';
import { faderPositionToDb } from '../../utils/audioMath';
import { percentToDb } from './audioParamsCache';
import { applyMonoCompatiblePan } from '../../utils/audio/monoCompatiblePan';
import { busInputs } from './audioEngineNodes';
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
import { safeRampDb, safeRampPan } from '../../utils/audio/safeAudioParamRamp';

export interface SyncBusChannelsParams {
  tracks: Track[];
  isEcoMode: boolean;
  busChannels: Record<string | number, Tone.Channel>;
  busMeters: Record<string | number, any>;
  reverbSends: Record<string | number, any>;
  distortionSends: Record<string | number, any>;
  lastAppliedTracksParamsRef: { current: Record<string | number, string> };
  lastAppliedBussesRef: { current: Record<string | number, string | number | null> };
  masterVolumeNode: any;
}

export function syncBusChannels(p: SyncBusChannelsParams): void {
  const {
    tracks, busChannels, busMeters, reverbSends, distortionSends,
    lastAppliedTracksParamsRef, lastAppliedBussesRef, masterVolumeNode
  } = p;
  const disableFx = Boolean(useSequencerStore.getState().ecoConfig?.disableFx);

  tracks.forEach((t) => {
    if (!t.isBusFolder && !t.isLinkFolder) return;

    if (!busChannels[t.id]) {
      const channelNode = new Tone.Channel({ volume: 0 });
      try {
        channelNode.channelCount = 2;
        channelNode.channelCountMode = "explicit";
      } catch (_) {}

      busChannels[t.id] = channelNode;
      busMeters[t.id] = new Tone.Analyser({ type: "waveform", size: 1024, channels: 2 }) as any;
      channelNode.connect(busMeters[t.id]);
    }

    if (!busInputs[t.id]) {
      busInputs[t.id] = new Tone.Gain(1.0);
      syncBusInsertChain(t.id, t);
    }

    const currentBusId = resolveImmediateBusId(t, tracks);
    const isConnectedToParentBus = Boolean(currentBusId !== null && (busInputs[currentBusId] || busChannels[currentBusId]));
    const effectiveVol = isConnectedToParentBus ? (t.volumeVal ?? 75) : getEffectiveVolume(tracks, t.id);
    const db = faderPositionToDb(effectiveVol);
    const safeDb = Number.isFinite(db) ? db : -100;
    const { acousticPan } = applyMonoCompatiblePan(t.panVal ?? t.pan);
    const reverb = t.fxSends?.reverb ?? 0;
    const distortion = t.fxSends?.distortion ?? 0;
    const muteState = getEffectiveMuteState(tracks, t.id);

    ensureAuxSendNodes(t.id, percentToDb(disableFx ? 0 : reverb), percentToDb(disableFx ? 0 : distortion));
    ensureBusSendVcaNodes(t.id, computeBusLinearVcaGain(t, tracks));

    const lowCut = t.lowCut ?? false;
    const eqLowG = t.eqBands?.low?.g ?? 0;
    const eqLowF = t.eqBands?.low?.f ?? 100;
    const eqMidG = t.eqBands?.mid?.g ?? 0;
    const eqMidF = t.eqBands?.mid?.f ?? 1000;
    const eqMidQ = t.eqBands?.mid?.q ?? 'wide';
    const eqHighG = t.eqBands?.high?.g ?? 0;
    const eqHighF = t.eqBands?.high?.f ?? 8000;

    const bypassKey = t.automationBypass ? `${!!t.automationBypass.volume}_${!!t.automationBypass.pan}_${!!t.automationBypass.reverb}` : '';
    const busChannelHash = `bus_${safeDb}_${acousticPan}_${muteState}_${reverb}_${distortion}_${disableFx}_${bypassKey}`;
    const busEqHash = `eq_bus_${lowCut}_${eqLowG}_${eqLowF}_${eqMidG}_${eqMidF}_${eqMidQ}_${eqHighG}_${eqHighF}`;

    if (lastAppliedTracksParamsRef.current[t.id] !== busChannelHash) {
      safeRampDb(busChannels[t.id].volume, safeDb, 0.02);
      safeRampPan(busChannels[t.id].pan, acousticPan, 0.02);
      busChannels[t.id].mute = muteState;
      syncBusSendVcaGain(t.id, computeBusLinearVcaGain(t, tracks), 0.02);

      const targetRevDb = percentToDb(disableFx ? 0 : reverb);
      const targetDistDb = percentToDb(disableFx ? 0 : distortion);
      if (reverbSends[t.id]) safeRampDb(reverbSends[t.id].gain, targetRevDb, 0.02);
      if (distortionSends[t.id]) safeRampDb(distortionSends[t.id].gain, targetDistDb, 0.02);

      lastAppliedTracksParamsRef.current[t.id] = busChannelHash;
    }

    const busEqKey = `eq_bus_${t.id}`;
    if (lastAppliedTracksParamsRef.current[busEqKey] !== busEqHash) {
      syncBusInsertChain(t.id, t);
      lastAppliedTracksParamsRef.current[busEqKey] = busEqHash;
    }

    const busKey = currentBusId !== null ? String(currentBusId) : null;
    if (lastAppliedBussesRef.current[t.id] !== busKey) {
      busChannels[t.id].disconnect();

      const parentBusInput = currentBusId !== null ? (busInputs[currentBusId] || busChannels[currentBusId] || null) : null;
      if (parentBusInput) {
        busChannels[t.id].connect(parentBusInput);
      } else if (masterVolumeNode) {
        busChannels[t.id].connect(masterVolumeNode);
      }

      if (reverbSends[t.id]) busChannels[t.id].connect(reverbSends[t.id]);
      if (distortionSends[t.id]) busChannels[t.id].connect(distortionSends[t.id]);
      if (busMeters[t.id]) busChannels[t.id].connect(busMeters[t.id]);
      wireBusSendVcaOutput(t.id, currentBusId);
      wireAuxSendsToParentOrReceive(t.id, currentBusId);

      lastAppliedBussesRef.current[t.id] = busKey;
    }
  });
}
