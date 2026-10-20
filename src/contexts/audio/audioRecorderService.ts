import { loadTone } from '../../ToneLoader';
import { masterVolumeNode } from '../../hooks/useAudioSync';
import { bufferToWav } from './audioWavEncoder';

let wavRecordingBuffersL: Float32Array[] = [];
let wavRecordingBuffersR: Float32Array[] = [];
let recorderNode: AudioWorkletNode | null = null;
let isolatedRecordingContext: AudioContext | null = null;
let streamDestination: any = null;
let streamSource: MediaStreamAudioSourceNode | null = null;

export async function startAudioRecording(): Promise<boolean> {
  wavRecordingBuffersL = [];
  wavRecordingBuffersR = [];

  try {
    const Tone = await loadTone();
    if (Tone.context && Tone.context.state !== 'running') {
      try { await Tone.context.resume(); } catch (_) {}
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    try {
      isolatedRecordingContext = new AudioContextClass({ latencyHint: 'playback', sampleRate: 44100 });
    } catch (_) {
      isolatedRecordingContext = new AudioContextClass({ latencyHint: 'playback' });
    }

    const workletUrl = import.meta.env.BASE_URL + 'recorder-worklet.js';
    await isolatedRecordingContext.audioWorklet.addModule(workletUrl);

    recorderNode = new AudioWorkletNode(isolatedRecordingContext, 'recorder-worklet', {
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
      streamDestination = Tone.context.createMediaStreamDestination();
      masterVolumeNode.connect(streamDestination);
      streamSource = isolatedRecordingContext.createMediaStreamSource(streamDestination.stream);
      streamSource.connect(recorderNode as unknown as AudioNode);
    }

    recorderNode.connect(isolatedRecordingContext.destination);
    return true;
  } catch (error) {
    console.error("Échec du démarrage de l'enregistrement :", error);
    return false;
  }
}

export function stopAudioRecording(): void {
  const exportSampleRate = isolatedRecordingContext ? isolatedRecordingContext.sampleRate : 44100;

  if (recorderNode) {
    try { recorderNode.disconnect(); } catch (_) {}
    recorderNode = null;
  }
  if (masterVolumeNode && streamDestination) {
    try { masterVolumeNode.disconnect(streamDestination); } catch (_) {}
  }
  if (streamSource) {
    try { streamSource.disconnect(); } catch (_) {}
    streamSource = null;
  }
  if (isolatedRecordingContext) {
    try { isolatedRecordingContext.close(); } catch (_) {}
    isolatedRecordingContext = null;
  }
  streamDestination = null;

  if (wavRecordingBuffersL.length > 0) {
    const wavBlob = bufferToWav(wavRecordingBuffersL, wavRecordingBuffersR, exportSampleRate);
    const url = URL.createObjectURL(wavBlob);
    const downloadLink = document.createElement('a');
    downloadLink.download = 'O Girador_Export.wav';
    downloadLink.href = url;
    downloadLink.click();

    wavRecordingBuffersL = [];
    wavRecordingBuffersR = [];
  }
}
