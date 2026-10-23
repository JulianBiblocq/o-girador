import * as Tone from 'tone';
import { Track } from '../../types';
import { getEffectiveVolume, getEffectiveMuteState } from '../../stores/useSequencerStore';
import { faderPositionToDb } from '../../utils/audioMath';
import { percentToDb } from './audioParamsCache';
import { applyMonoCompatiblePan } from '../../utils/audio/monoCompatiblePan';
import { busInputs } from './audioEngineNodes';
import { syncBusInsertChain } from '../../audio/effectsChain';

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
    tracks, isEcoMode, busChannels, busMeters, reverbSends, distortionSends,
    lastAppliedTracksParamsRef, lastAppliedBussesRef, masterVolumeNode
  } = p;

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

    const isConnectedToParentBus = Boolean(t.busId && (busInputs[t.busId] || busChannels[t.busId]));
    const effectiveVol = isConnectedToParentBus ? (t.volumeVal ?? 75) : getEffectiveVolume(tracks, t.id);
    const db = faderPositionToDb(effectiveVol);
    const safeDb = Number.isFinite(db) ? db : -100;
    const { acousticPan } = applyMonoCompatiblePan(t.panVal ?? t.pan);
    const reverb = t.fxSends?.reverb ?? 0;
    const distortion = t.fxSends?.distortion ?? 0;
    const muteState = getEffectiveMuteState(tracks, t.id);

    const lowCut = t.lowCut ?? false;
    const eqLowG = t.eqBands?.low?.g ?? 0;
    const eqLowF = t.eqBands?.low?.f ?? 100;
    const eqMidG = t.eqBands?.mid?.g ?? 0;
    const eqMidF = t.eqBands?.mid?.f ?? 1000;
    const eqMidQ = t.eqBands?.mid?.q ?? 'wide';
    const eqHighG = t.eqBands?.high?.g ?? 0;
    const eqHighF = t.eqBands?.high?.f ?? 8000;

    const paramHash = `bus_${safeDb}_${acousticPan}_${muteState}_${reverb}_${distortion}_${lowCut}_${eqLowG}_${eqLowF}_${eqMidG}_${eqMidF}_${eqMidQ}_${eqHighG}_${eqHighF}`;

    if (lastAppliedTracksParamsRef.current[t.id] !== paramHash) {
      busChannels[t.id].volume.value = safeDb;
      busChannels[t.id].pan.value = acousticPan;
      busChannels[t.id].mute = muteState;

      if (!reverbSends[t.id]) {
        reverbSends[t.id] = busChannels[t.id].send("reverb", percentToDb(isEcoMode ? 0 : reverb));
      }
      if (!distortionSends[t.id]) {
        distortionSends[t.id] = busChannels[t.id].send("distortion", percentToDb(distortion));
      }

      const targetRevDb = percentToDb(isEcoMode ? 0 : reverb);
      const targetDistDb = percentToDb(distortion);
      if (reverbSends[t.id]) {
        try { reverbSends[t.id].gain.value = targetRevDb; } catch (_) {}
      }
      if (distortionSends[t.id]) {
        try { distortionSends[t.id].gain.value = targetDistDb; } catch (_) {}
      }

      syncBusInsertChain(t.id, t);
      lastAppliedTracksParamsRef.current[t.id] = paramHash;
    }

    const currentBusId = t.busId || null;
    if (lastAppliedBussesRef.current[t.id] !== currentBusId) {
      busChannels[t.id].disconnect();

      const parentBusInput = currentBusId ? (busInputs[currentBusId] || busChannels[currentBusId] || null) : null;
      if (parentBusInput) {
        busChannels[t.id].connect(parentBusInput);
      } else if (masterVolumeNode) {
        busChannels[t.id].connect(masterVolumeNode);
      }

      if (reverbSends[t.id]) busChannels[t.id].connect(reverbSends[t.id]);
      if (distortionSends[t.id]) busChannels[t.id].connect(distortionSends[t.id]);
      if (busMeters[t.id]) busChannels[t.id].connect(busMeters[t.id]);

      lastAppliedBussesRef.current[t.id] = currentBusId;
    }
  });
}
