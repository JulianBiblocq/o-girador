import * as Tone from 'tone';
import { Track } from '../../types';
import { instrumentsConfig } from '../../data';
import { getEffectiveVolume, getEffectiveMuteState, isToadaChild, isToadaBus } from '../../stores/useSequencerStore';
import { faderPositionToDb } from '../../utils/audioMath';
import { percentToDb } from './audioParamsCache';
import { applyMonoCompatiblePan } from '../../utils/audio/monoCompatiblePan';
import { syncTrackInsertChain } from '../../audio/effectsChain';
import { busInputs } from './audioEngineNodes';
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
    tracks, isEcoMode, channels, meters, trackInputs, busChannels,
    reverbSends, distortionSends, lastAppliedTracksParamsRef,
    lastAppliedBussesRef, masterVolumeNode, audioEngine
  } = p;

  tracks.forEach((t) => {
    if (t.isBusFolder || t.isLinkFolder) return;
    const inst = instrumentsConfig[t.instrumentIdx];
    if (!inst) return;

    if (!channels[t.id]) {
      channels[t.id] = new Tone.Channel({ volume: 0 });
      try {
        channels[t.id].channelCount = 2;
        channels[t.id].channelCountMode = "explicit";
      } catch (_) {}
      meters[t.id] = new Tone.Analyser({ type: "waveform", size: 1024, channels: 2 }) as any;
      channels[t.id].connect(meters[t.id]);

      const initialRevDb = percentToDb(isEcoMode ? 0 : (t.fxSends?.reverb ?? t.reverbVal ?? 0));
      const initialDistDb = percentToDb(t.fxSends?.distortion ?? 0);
      reverbSends[t.id] = channels[t.id].send("reverb", initialRevDb);
      distortionSends[t.id] = channels[t.id].send("distortion", initialDistDb);
    }

    if (!trackInputs[t.id]) {
      trackInputs[t.id] = new Tone.Gain(1.0);
      syncTrackInsertChain(t.id, t);
    }

    const gainNode = trackInputs[t.id] || channels[t.id];
    audioEngine?.setInstrumentChannel(t.id, inst.id, gainNode);

    const targetBusId = t.busId || (t.linkedToTrackId ? t.linkedToTrackId : null);
    const isConnectedToBus = Boolean(targetBusId && (busInputs[targetBusId] || busChannels[targetBusId]));
    const effectiveVol = isConnectedToBus ? (t.volumeVal ?? 75) : getEffectiveVolume(tracks, t.id);
    const db = faderPositionToDb(effectiveVol);
    const safeDb = Number.isFinite(db) ? db : -100;
    const { acousticPan, panCompensationDb } = applyMonoCompatiblePan(t.panVal ?? t.pan);
    const finalDb = safeDb > -90 ? safeDb + panCompensationDb : safeDb;
    const reverb = t.fxSends?.reverb ?? t.reverbVal ?? 0;
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

    const paramHash = `${finalDb}_${acousticPan}_${muteState}_${reverb}_${distortion}_${lowCut}_${eqLowG}_${eqLowF}_${eqMidG}_${eqMidF}_${eqMidQ}_${eqHighG}_${eqHighF}`;

    if (lastAppliedTracksParamsRef.current[t.id] !== paramHash) {
      channels[t.id].volume.value = finalDb;
      channels[t.id].pan.value = acousticPan;
      channels[t.id].mute = muteState;

      if (reverbSends[t.id]) {
        try { reverbSends[t.id].gain.value = percentToDb(isEcoMode ? 0 : reverb); } catch (_) {}
      }
      if (distortionSends[t.id]) {
        try { distortionSends[t.id].gain.value = percentToDb(distortion); } catch (_) {}
      }

      syncTrackInsertChain(t.id, t);
      lastAppliedTracksParamsRef.current[t.id] = paramHash;
    }

    let targetBusNode: any = (targetBusId && String(targetBusId) !== String(t.id))
      ? (busInputs[targetBusId] || busChannels[targetBusId] || trackInputs[targetBusId] || null)
      : null;
    const isVocalTrack = isToadaChild(t, tracks) || inst.type === 'voice' || inst.id === 'puxador' || inst.id === 'coro';
    if (isVocalTrack && !targetBusNode) {
      const toadaTrack = tracks.find(trk => isToadaBus(trk));
      if (toadaTrack) targetBusNode = busInputs[toadaTrack.id] || busChannels[toadaTrack.id] || null;
    }

    const busKey = targetBusId ? String(targetBusId) : null;
    if (lastAppliedBussesRef.current[t.id] !== busKey || !channels[t.id]) {
      channels[t.id].disconnect();
      if (targetBusNode) {
        channels[t.id].connect(targetBusNode);
      } else if (masterVolumeNode) {
        channels[t.id].connect(masterVolumeNode);
      }

      if (reverbSends[t.id]) channels[t.id].connect(reverbSends[t.id]);
      if (distortionSends[t.id]) channels[t.id].connect(distortionSends[t.id]);
      if (meters[t.id]) channels[t.id].connect(meters[t.id]);

      lastAppliedBussesRef.current[t.id] = busKey;
    }
  });
}
