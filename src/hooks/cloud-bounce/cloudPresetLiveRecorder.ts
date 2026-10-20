import * as Tone from 'tone';
import { audioEngine } from '../useAudioSync';
import { PresetTimingCalculation } from './cloudPresetTimingCalculator';

export async function recordPresetLive(
  timing: PresetTimingCalculation,
  audio: any,
  lang: string,
  onProgress: (pct: number, label: string) => void
): Promise<Blob> {
  const { totalDurationSec, dureeTotaleSec, measureStartTimes, expandedMeasures } = timing;

  if (audio.isPlaying) {
    audio.handleStop();
    await new Promise(r => setTimeout(r, 100));
  } else {
    audio.handleStop();
  }

  const rawCtx = (Tone.getContext().rawContext || Tone.context) as AudioContext;
  if (rawCtx?.state !== 'running') { try { await rawCtx.resume(); } catch (_) {} }
  if (Tone.context?.state !== 'running') { try { await Tone.context.resume(); } catch (_) {} }
  if (Tone.start) { try { await Tone.start(); } catch (_) {} }
  if (audioEngine && audioEngine.bufferPool.size === 0) { try { await audioEngine.loadAllSamples(); } catch (_) {} }
  if (Tone.loaded) { try { await Tone.loaded(); } catch (_) {} }

  try {
    Tone.Transport.position = 0;
    Tone.Transport.seconds = 0;
  } catch (_) {}

  const recorder = new Tone.Recorder();
  Tone.getDestination().connect(recorder);
  recorder.start();

  await audio.handleTogglePlay({ skipPreRoll: true, targetMeasure: 0 });

  const startTime = Date.now();
  const progressInterval = setInterval(() => {
    const elapsedSec = (Date.now() - startTime) / 1000;
    const ratio = Math.min(1, elapsedSec / totalDurationSec);
    const currentPct = Math.min(85, Math.max(5, Math.round(ratio * 85)));

    let curMeasure = 0;
    for (let m = measureStartTimes.length - 1; m >= 0; m--) {
      if (elapsedSec >= measureStartTimes[m]) {
        curMeasure = m;
        break;
      }
    }

    const label = elapsedSec >= dureeTotaleSec
      ? (lang === 'pt' ? `Finalizando ressonância... (${currentPct}%)` : `Fin de résonance du mix... (${currentPct}%)`)
      : (lang === 'pt'
          ? `Gravando mix ao vivo... Compasso ${curMeasure + 1}/${expandedMeasures.length} (${currentPct}%)`
          : `Enregistrement du mix en direct... Mesure ${curMeasure + 1}/${expandedMeasures.length} (${currentPct}%)`);
    onProgress(currentPct, label);
  }, 100);

  let decayTimer: NodeJS.Timeout | null = null;
  let safetyTimer: NodeJS.Timeout | null = null;
  let sequenceEndListener: (() => void) | null = null;

  await new Promise<void>((resolve) => {
    sequenceEndListener = () => {
      if (decayTimer) return;
      decayTimer = setTimeout(() => resolve(), 2000);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('o-girador-sequence-end', sequenceEndListener, { once: true });
    }
    safetyTimer = setTimeout(() => {
      console.warn("[Cloud Bounce] Safety timeout reached before sequence end");
      resolve();
    }, (totalDurationSec + 3) * 1000);
  });

  if (safetyTimer) clearTimeout(safetyTimer);
  if (sequenceEndListener && typeof window !== 'undefined') {
    window.removeEventListener('o-girador-sequence-end', sequenceEndListener);
  }
  clearInterval(progressInterval);

  try { Tone.getDestination().disconnect(recorder); } catch (_) {}
  const audioBlob = await recorder.stop();
  try { recorder.dispose(); } catch (_) {}

  return audioBlob;
}
