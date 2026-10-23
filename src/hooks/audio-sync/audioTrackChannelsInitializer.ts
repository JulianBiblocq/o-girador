import * as Tone from 'tone';
import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { channels, meters, reverbSends, distortionSends, busChannels, masterVolumeNode } from './audioEngineNodes';
import { percentToDb } from './audioParamsCache';
import { applyMonoCompatiblePan } from '../../utils/audio/monoCompatiblePan';
import { faderPositionToDb } from '../../utils/audioMath';
import { getEffectiveVolume, getEffectiveMuteState, isToadaChild, isToadaBus } from '../../stores/useSequencerStore';
import { trackInputs, syncTrackInsertChain } from '../../audio/effectsChain';
import { AudioEngine } from '../../AudioEngine';

export function initTrackChannelsAudioNodes(
  tracks: TrackGroup[],
  isEco: boolean,
  lastAppliedBussesRef: React.MutableRefObject<Record<string, string | null>>,
  lastAppliedTracksParamsRef: React.MutableRefObject<Record<string, string>>,
  engine: AudioEngine | null
) {
  tracks.forEach((t) => {
    if (t.isBusFolder) return;
    const inst = instrumentsConfig[t.instrumentIdx];
    if (!inst) return;

    if (!channels[t.id]) {
      channels[t.id] = new Tone.Channel({ volume: 0 });
      try {
        channels[t.id].channelCount = 2;
        channels[t.id].channelCountMode = 'explicit';
      } catch (_) {}

      meters[t.id] = new Tone.Analyser({ type: 'waveform', size: 1024, channels: 2 }) as any;
      channels[t.id].connect(meters[t.id]);

      const initialRevDb = percentToDb(isEco ? 0 : (t.fxSends?.reverb ?? t.reverbVal ?? 0));
      const initialDistDb = percentToDb(t.fxSends?.distortion ?? 0);

      reverbSends[t.id] = channels[t.id].send('reverb', initialRevDb);
      distortionSends[t.id] = channels[t.id].send('distortion', initialDistDb);
    }

    const currentBusId = t.busId || null;
    let targetBusNode: any = null;
    if (currentBusId) {
      targetBusNode = busChannels[currentBusId] || (busChannels as any)[String(currentBusId)] || (busChannels as any)[Number(currentBusId)] || null;
    }
    const isVocalTrack = isToadaChild(t, tracks) || inst.type === 'voice' || inst.id === 'puxador' || inst.id === 'coro';
    if (isVocalTrack && !targetBusNode) {
      const toadaTrack = tracks.find(trk => isToadaBus(trk));
      if (toadaTrack) {
        targetBusNode = busChannels[toadaTrack.id] || (busChannels as any)[String(toadaTrack.id)] || null;
      }
    }

    channels[t.id].disconnect();
    if (targetBusNode) {
      channels[t.id].connect(targetBusNode);
    } else if (masterVolumeNode) {
      channels[t.id].connect(masterVolumeNode);
    }

    if (reverbSends[t.id]) channels[t.id].connect(reverbSends[t.id]);
    if (distortionSends[t.id]) channels[t.id].connect(distortionSends[t.id]);
    if (meters[t.id]) channels[t.id].connect(meters[t.id]);

    lastAppliedBussesRef.current[t.id] = currentBusId;

    if (!trackInputs[t.id]) {
      trackInputs[t.id] = new Tone.Gain(1.0);
    }
    syncTrackInsertChain(t.id, t);

    const gainNode = trackInputs[t.id] || channels[t.id];
    engine?.setInstrumentChannel(t.id, inst.id, gainNode);

    const isConnectedToBus = Boolean(t.busId && busChannels[t.busId]);
    const effectiveVol = isConnectedToBus ? (t.volumeVal ?? 75) : getEffectiveVolume(tracks, t.id);
    const db = faderPositionToDb(effectiveVol);
    const safeDb = Number.isFinite(db) ? db : -100;
    const { acousticPan, panCompensationDb } = applyMonoCompatiblePan(t.panVal ?? t.pan);
    const finalDb = safeDb > -90 ? safeDb + panCompensationDb : safeDb;
    const muteState = getEffectiveMuteState(tracks, t.id);

    channels[t.id].volume.value = finalDb;
    channels[t.id].pan.value = acousticPan;
    channels[t.id].mute = muteState;

    if (reverbSends[t.id]) {
      const targetRevDb = percentToDb(isEco ? 0 : (t.fxSends?.reverb ?? t.reverbVal ?? 0));
      try { reverbSends[t.id].gain.value = targetRevDb; } catch (_) {}
    }
    if (distortionSends[t.id]) {
      const targetDistDb = percentToDb(t.fxSends?.distortion ?? 0);
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
