import * as Tone from 'tone';
import { loadTone } from '../../ToneLoader';
import { masterVolumeNode } from '../../audio/effects/effectsChainNodes';
import { bufferToWav } from './audioWavEncoder';
import { scheduleAudioContextAutoSuspend, safeResumeAudioContext } from '../../audio/audioContextSuspendManager';

let wavRecordingBuffersL: Float32Array[] = [];
let wavRecordingBuffersR: Float32Array[] = [];
let recorderNode: AudioWorkletNode | null = null;
let silenceGainNode: GainNode | null = null;
let recordingSampleRate = 44100;

export async function startAudioRecording(): Promise<boolean> {
  wavRecordingBuffersL = [];
  wavRecordingBuffersR = [];

  try {
    await loadTone();
    await safeResumeAudioContext();

    const rawCtx = (Tone.getContext().rawContext || Tone.context) as AudioContext;
    recordingSampleRate = rawCtx.sampleRate || 44100;

    const baseUrl = import.meta.env.BASE_URL || '/';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    const workletUrl = `${cleanBase}recorder-worklet.js`;

    try {
      await rawCtx.audioWorklet.addModule(workletUrl);
    } catch (_) {
      // Le module a potentiellement déjà été ajouté dans cette session
    }

    if (recorderNode) {
      try {
        recorderNode.port.onmessage = null;
        recorderNode.disconnect();
      } catch (_) {}
      recorderNode = null;
    }

    recorderNode = new AudioWorkletNode(rawCtx, 'recorder-worklet', {
      numberOfInputs: 1,
      numberOfOutputs: 1
    });

    recorderNode.port.onmessage = (e: MessageEvent) => {
      if (e.data && e.data.left && e.data.right) {
        wavRecordingBuffersL.push(e.data.left);
        wavRecordingBuffersR.push(e.data.right);
      }
    };

    if (masterVolumeNode) {
      try {
        (masterVolumeNode as any).connect(recorderNode);
      } catch (err) {
        console.warn('[AudioRecorder] Impossible de connecter masterVolumeNode:', err);
      }
    }

    // Nœud silencieux pour garantir que le graphe Web Audio maintient le worklet actif
    silenceGainNode = rawCtx.createGain();
    silenceGainNode.gain.value = 0;
    recorderNode.connect(silenceGainNode);
    silenceGainNode.connect(rawCtx.destination);

    return true;
  } catch (error) {
    console.error("Échec du démarrage de l'enregistrement :", error);
    stopAudioRecording();
    return false;
  }
}

export function stopAudioRecording(): void {
  if (recorderNode) {
    try {
      if (masterVolumeNode) {
        (masterVolumeNode as any).disconnect(recorderNode);
      }
    } catch (_) {}
    try {
      recorderNode.port.onmessage = null;
      recorderNode.disconnect();
    } catch (_) {}
    recorderNode = null;
  }

  if (silenceGainNode) {
    try {
      silenceGainNode.disconnect();
    } catch (_) {}
    silenceGainNode = null;
  }

  if (wavRecordingBuffersL.length > 0) {
    try {
      const wavBlob = bufferToWav(wavRecordingBuffersL, wavRecordingBuffersR, recordingSampleRate);
      const url = URL.createObjectURL(wavBlob);
      const downloadLink = document.createElement('a');
      downloadLink.download = 'O Girador_Export.wav';
      downloadLink.href = url;
      downloadLink.click();
    } catch (err) {
      console.error('[AudioRecorder] Erreur encodage WAV:', err);
    }

    wavRecordingBuffersL = [];
    wavRecordingBuffersR = [];
  }

  scheduleAudioContextAutoSuspend(500);
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopAudioRecording();
  });
}
