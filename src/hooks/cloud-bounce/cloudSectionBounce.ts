import * as Tone from 'tone';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '../../firebase/config';
import { telemetryService } from '../../services/telemetryService';
import { SavedSectionData } from '../../types';
import { CLOUD_SECTIONS_COLLECTION } from '../../cloudSections';
import { instrumentsConfig } from '../../data';
import { instrumentAudioConfigs } from '../../data/audioConfig';
import { getEffectiveVolume } from '../../stores/useSequencerStore';
import { faderPositionToDb } from '../../utils/audioMath';
import { encoderWav } from '../../utils/encodeurWav';
import { normalizeAudioBuffer } from '../../utils/audioBufferUtils';
import { scheduleSectionStrokes } from './cloudSectionScheduler';

export async function renderAndUploadSectionBounce(
  sectionId: string,
  sectionData: SavedSectionData,
  baseBpm: number
): Promise<string | null> {
  let dureeTotaleSec = 0;
  const measureStartTimes: number[] = [];
  const measureTicks: number[] = [];
  const measureBeats: number[] = [];
  const effectiveBpm = (Number.isFinite(baseBpm) && baseBpm > 20) ? baseBpm : 120;
  const numMeasures = Math.max(1, sectionData.numMeasures || 1);

  for (let i = 0; i < numMeasures; i++) {
    measureStartTimes.push(dureeTotaleSec);
    const timeSig = sectionData.timeSigs?.[i] || '4/4';
    const beats = Math.max(1, parseInt(timeSig.split('/')[0], 10) || 4);
    const beatUnit = Math.max(1, parseInt(timeSig.split('/')[1], 10) || 4);
    dureeTotaleSec += (60 / effectiveBpm) * beats;
    measureBeats.push(beats);
    measureTicks.push(beats * (96 / beatUnit));
  }
  let durationSec = (Number.isFinite(dureeTotaleSec) && dureeTotaleSec > 0) ? dureeTotaleSec + 3.0 : 4;
  durationSec = Math.max(durationSec || 0, 4);

  const audioBuffer = await Tone.Offline(async () => {
    const playersToLoad: Promise<void>[] = [];
    const masterEQ = new Tone.EQ3(0, 0, 0).toDestination();
    const masterReverb = new Tone.Reverb(2).connect(masterEQ);
    const masterDistortion = new Tone.Distortion(0.8).connect(masterEQ);
    await masterReverb.generate();

    const trackPlayers = new Map<number, Map<string, Tone.Player>>();

    for (let t = 0; t < sectionData.tracks.length; t++) {
      const track = sectionData.tracks[t];
      if (track.isMute) continue;
      const instrumentConf = instrumentsConfig[track.instrumentIdx];
      if (!instrumentConf) continue;
      const audioConfig = instrumentAudioConfigs.find(c => c.id === instrumentConf.id);
      if (!audioConfig) continue;

      const effectiveVol = track.id !== undefined ? getEffectiveVolume(sectionData.tracks, track.id) : (track.volumeVal ?? 75);
      const channelDb = faderPositionToDb(effectiveVol);
      const channel = new Tone.Channel({
        volume: Number.isFinite(channelDb) ? channelDb : -100,
        pan: track.panVal !== undefined ? track.panVal / 100 : (track.pan !== undefined ? track.pan / 100 : 0)
      }).connect(masterEQ);

      if (track.fxSends?.reverb) channel.connect(new Tone.Gain(track.fxSends.reverb / 100).connect(masterReverb));
      if (track.fxSends?.distortion) channel.connect(new Tone.Gain(track.fxSends.distortion / 100).connect(masterDistortion));
      if (track.reverbVal) channel.connect(new Tone.Gain(track.reverbVal / 100).connect(masterReverb));

      const strokePlayers = new Map<string, Tone.Player>();
      trackPlayers.set(t, strokePlayers);

      const usedStrokes = new Set<string>();
      for (let m = 0; m < numMeasures; m++) {
        for (const pattern of track.patterns) {
          if (pattern.measureAssignments?.[m]) {
            (pattern.activeSteps || []).forEach(s => { if (s && s !== 0 && s !== '0') usedStrokes.add(String(s).trim()); });
          }
        }
      }

      for (const rawStroke of usedStrokes) {
        const file = audioConfig.strokes[rawStroke];
        if (file) {
          const baseUrl = (import.meta as any).env.BASE_URL || '/';
          const cleanPath = file.startsWith('/') ? file : '/' + file;
          const fetchPath = baseUrl.endsWith('/') ? baseUrl + cleanPath.slice(1) : baseUrl + cleanPath;
          const encodedPath = fetchPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
          const player = new Tone.Player(encodedPath).connect(channel);
          strokePlayers.set(rawStroke, player);

          playersToLoad.push(new Promise<void>((resolve) => {
            const timeoutId = setTimeout(() => resolve(), 8000);
            Tone.Buffer.load(encodedPath).then(buffer => {
              clearTimeout(timeoutId);
              player.buffer = new Tone.ToneAudioBuffer(buffer);
              resolve();
            }).catch(() => { clearTimeout(timeoutId); resolve(); });
          }));
        }
      }
    }

    await Promise.all(playersToLoad);
    scheduleSectionStrokes(sectionData.tracks, numMeasures, trackPlayers, measureStartTimes, measureBeats, measureTicks, effectiveBpm);
  }, durationSec);

  const nativeBuffer = audioBuffer.get();
  if (!nativeBuffer) throw new Error("Le rendu Tone.Offline n'a généré aucun buffer valide.");
  try { normalizeAudioBuffer(nativeBuffer, -0.5); } catch (_) {}
  const webmBlob = await encoderWav(nativeBuffer);

  let audioUrl: string | null = null;
  try {
    const storageRef = ref(storage, `bounces/sections/${sectionId}.webm`);
    await uploadBytes(storageRef, webmBlob, { contentType: 'audio/webm' });
    audioUrl = await getDownloadURL(storageRef);
  } catch (uploadErr: any) {
    telemetryService.logError(uploadErr, 'useCloudAudioBounce_Section_StorageUpload');
    audioUrl = null;
  }

  try {
    const documentRef = doc(db, CLOUD_SECTIONS_COLLECTION, sectionId);
    await updateDoc(documentRef, { audioUrl });
  } catch (docErr) {
    console.warn("[Cloud Bounce] Échec mise à jour document Firestore :", docErr);
  }

  return audioUrl;
}
