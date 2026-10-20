import * as Tone from 'tone';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '../../firebase/config';
import { telemetryService } from '../../services/telemetryService';
import { SavedPattern, TimeSignature } from '../../types';
import { instrumentAudioConfigs } from '../../data/audioConfig';
import { encoderWav } from '../../utils/encodeurWav';
import { normalizeAudioBuffer } from '../../utils/audioBufferUtils';

const CLOUD_PATTERNS_COLLECTION = 'patterns';

export async function renderAndUploadPatternBounce(
  patternId: string,
  patternData: SavedPattern,
  bpm: number,
  timeSig: TimeSignature
): Promise<string | null> {
  const beats = parseInt(timeSig.split('/')[0], 10);
  const beatUnit = parseInt(timeSig.split('/')[1], 10);
  const maxTicks = beats * (96 / beatUnit);
  const ticksPerBeat = maxTicks / beats;

  const rawDurationSec = (patternData.steps.length / (maxTicks / ticksPerBeat)) * (60 / bpm) + 1.0;
  let durationSec = (Number.isFinite(rawDurationSec) && rawDurationSec > 0) ? rawDurationSec : 4;
  durationSec = Math.max(durationSec || 0, 4);

  const audioConfig = instrumentAudioConfigs.find(c => c.id === patternData.instrumentId);
  if (!audioConfig) throw new Error(`Configuration audio introuvable pour l'instrument: ${patternData.instrumentId}`);

  const audioBuffer = await Tone.Offline(async () => {
    const strokePlayers = new Map<string, Tone.Player>();
    const playersToLoad: Promise<void>[] = [];
    const usedStrokes = new Set(patternData.steps.filter(s => s !== 0 && s !== '0' && s !== ''));

    for (const stroke of usedStrokes) {
      const rawStroke = String(stroke).trim();
      let normStroke = rawStroke;
      if (['marcante', 'meiao', 'repique', 'caixa', 'tarol'].includes(patternData.instrumentId)) {
        if (normStroke === 't' || normStroke === 'T') normStroke = 'B';
        else if (normStroke === 'C') normStroke = 'c';
      } else if (patternData.instrumentId === 'agbe' || patternData.instrumentId === 'gongue') {
        if (normStroke === 't') normStroke = 'B';
      }

      const strokeDef = audioConfig.strokes.find(s =>
        s.caseSensitive === false ? s.symbol.toUpperCase() === normStroke.toUpperCase() : s.symbol === normStroke
      );

      if (strokeDef && strokeDef.files.length > 0) {
        const file = strokeDef.files[0];
        const baseUrl = (import.meta as any).env.BASE_URL || '/';
        const cleanPath = file.startsWith('/') ? file : '/' + file;
        const fetchPath = baseUrl.endsWith('/') ? baseUrl + cleanPath.slice(1) : baseUrl + cleanPath;
        const encodedPath = fetchPath.split('/').map(segment => encodeURIComponent(segment)).join('/');

        const player = new Tone.Player(encodedPath).toDestination();
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

    await Promise.all(playersToLoad);

    const stepCount = patternData.steps.length;
    const resArray = Array(beats).fill(stepCount / beats);
    let stepTickAccum = 0;
    const stepTickMap: number[] = [];
    for (let b = 0; b < beats; b++) {
      const res = resArray[b] || (stepCount / beats);
      const ticksPerStep = ticksPerBeat / res;
      for (let r = 0; r < res; r++) stepTickMap.push(Math.round(stepTickAccum + r * ticksPerStep));
      stepTickAccum += ticksPerBeat;
    }

    for (let step = 0; step < stepCount; step++) {
      const state = patternData.steps[step];
      if (!state || state === 0 || state === '0') continue;
      const targetKey = String(state).trim();
      const player = strokePlayers.get(targetKey);
      if (player) {
        const tickIdx = stepTickMap[step] !== undefined ? stepTickMap[step] : Math.floor((step * maxTicks) / stepCount);
        const timeSec = (tickIdx / maxTicks) * beats * (60 / bpm);
        let baseVol = patternData.volumes?.[step] ?? 80;
        const baseVolNum = Array.isArray(baseVol) ? (baseVol[0] ?? 80) : (typeof baseVol === 'number' ? baseVol : 80);
        const stepVolMultiplier = baseVolNum / 100;
        const db = 40 * Math.log10(Math.max(0.0001, stepVolMultiplier));
        player.volume.setValueAtTime(db, timeSec);
        player.start(timeSec);
      }
    }
  }, durationSec);

  const nativeBuffer = audioBuffer.get();
  if (!nativeBuffer) throw new Error("Le rendu Tone.Offline n'a généré aucun buffer valide.");
  try { normalizeAudioBuffer(nativeBuffer, -0.5); } catch (_) {}
  const webmBlob = await encoderWav(nativeBuffer);

  let audioUrl: string | null = null;
  try {
    const storageRef = ref(storage, `bounces/${patternId}.webm`);
    await uploadBytes(storageRef, webmBlob, { contentType: 'audio/webm' });
    audioUrl = await getDownloadURL(storageRef);
  } catch (uploadErr: any) {
    telemetryService.logError(uploadErr, 'useCloudAudioBounce_Pattern_StorageUpload');
    audioUrl = null;
  }

  try {
    const documentRef = doc(db, CLOUD_PATTERNS_COLLECTION, patternId);
    await updateDoc(documentRef, { audioUrl });
  } catch (docErr) {
    console.warn("[Cloud Bounce] Échec mise à jour document Firestore :", docErr);
  }

  return audioUrl;
}
