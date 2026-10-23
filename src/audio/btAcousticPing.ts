/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Moteur de calage acoustique par 3 bips via micro (< 135 lignes).
 */
import * as Tone from 'tone';

export interface PingResult {
  success: boolean;
  offsetMs: number;
  error?: string;
}

export async function runAcousticPingCalibration(
  onProgress?: (beepIndex: number, total: number) => void
): Promise<PingResult> {
  let stream: MediaStream | null = null;
  let micSource: MediaStreamAudioSourceNode | null = null;
  let filter: BiquadFilterNode | null = null;
  let analyser: AnalyserNode | null = null;

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      return { success: false, offsetMs: 0, error: 'Microphone non disponible' };
    }

    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });

    const rawCtx = (Tone.getContext()?.rawContext || Tone.context) as AudioContext;
    if (rawCtx.state === 'suspended') await rawCtx.resume();

    micSource = rawCtx.createMediaStreamSource(stream);
    filter = rawCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2200;
    filter.Q.value = 10;

    analyser = rawCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.05;

    micSource.connect(filter);
    filter.connect(analyser);

    const rawTrackSettings = stream.getAudioTracks()[0]?.getSettings?.() as any;
    const micLatency = typeof rawTrackSettings?.latency === 'number'
      ? rawTrackSettings.latency * 1000
      : 35;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const measuredDelays: number[] = [];
    const totalBeeps = 3;
    const intervalSec = 0.45;
    const startTime = rawCtx.currentTime + 0.15;

    for (let i = 0; i < totalBeeps; i++) {
      onProgress?.(i + 1, totalBeeps);
      const beepTime = startTime + i * intervalSec;

      // Emission du bip à 2200 Hz
      const osc = rawCtx.createOscillator();
      const gain = rawCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2200, beepTime);

      gain.gain.setValueAtTime(0, beepTime);
      gain.gain.linearRampToValueAtTime(0.85, beepTime + 0.003);
      gain.gain.setValueAtTime(0.85, beepTime + 0.015);
      gain.gain.linearRampToValueAtTime(0, beepTime + 0.018);

      osc.connect(gain);
      gain.connect(rawCtx.destination);
      osc.start(beepTime);
      osc.stop(beepTime + 0.02);

      // Ecoute de la reponse
      const listenStart = performance.now() + (beepTime - rawCtx.currentTime) * 1000;
      const listenMax = listenStart + (intervalSec - 0.05) * 1000;
      let detectedTime: number | null = null;

      while (performance.now() < listenMax) {
        if (performance.now() >= listenStart) {
          analyser.getByteFrequencyData(dataArray);
          // Recherche d'energie autour de 2200 Hz (bin ~ 25 a 44.1kHz / 512)
          const bin = Math.round((2200 / (rawCtx.sampleRate / 2)) * analyser.frequencyBinCount);
          const energy = Math.max(dataArray[bin - 1] || 0, dataArray[bin] || 0, dataArray[bin + 1] || 0);

          if (energy > 125) {
            detectedTime = rawCtx.currentTime;
            break;
          }
        }
        await new Promise((r) => setTimeout(r, 4));
      }

      if (detectedTime !== null) {
        const rawDelayMs = (detectedTime - beepTime) * 1000;
        const netDelay = Math.max(0, rawDelayMs - micLatency);
        if (netDelay <= 650) {
          measuredDelays.push(netDelay);
        }
      }

      // Attente du prochain bip
      const waitNext = listenMax - performance.now();
      if (waitNext > 0) await new Promise((r) => setTimeout(r, waitNext));
    }

    if (measuredDelays.length === 0) {
      return { success: false, offsetMs: 240, error: 'Signal non capté' };
    }

    measuredDelays.sort((a, b) => a - b);
    const median = measuredDelays[Math.floor(measuredDelays.length / 2)];
    const finalOffsetMs = Math.max(0, Math.min(600, Math.round(median)));

    return { success: true, offsetMs: finalOffsetMs };
  } catch (err: any) {
    return { success: false, offsetMs: 0, error: err?.message || 'Erreur micro' };
  } finally {
    try { micSource?.disconnect(); } catch (_) {}
    try { filter?.disconnect(); } catch (_) {}
    try { analyser?.disconnect(); } catch (_) {}
    stream?.getTracks().forEach((t) => t.stop());
  }
}
