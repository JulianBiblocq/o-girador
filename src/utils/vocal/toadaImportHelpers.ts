/**
 * toadaImportHelpers.ts
 * Utilitaires d'assistance pour l'import de packs Toada (< 60 lignes).
 */
import { instrumentsConfig } from '../../data';
import type { TrackGroup, Pattern } from '../../types/store.types';

export function isBlankPattern(p?: Pattern): boolean {
  if (!p) return true;
  const hasNotes = p.notes?.some((n) => n && n !== '' && n !== '───');
  const hasActive = p.activeSteps?.some((s) => s && s !== 0 && s !== '───');
  return !hasNotes && !hasActive && !p.vocalClip && p.vocalMode !== 'micro';
}

export function getOrCreateTrack(tracks: TrackGroup[], role: 'puxador' | 'coro'): TrackGroup {
  const found = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === role);
  if (found) return found;
  const idx = instrumentsConfig.findIndex((i) => i.id === role);
  const maxId = Math.max(100, ...tracks.map((t) => Number(t.id) || 0));
  return {
    id: maxId + (role === 'puxador' ? 1 : 2),
    instrumentIdx: idx !== -1 ? idx : (role === 'puxador' ? 10 : 11),
    patterns: [],
    isMute: false,
    isSolo: false,
    isHidden: false,
    volumeVal: 80,
    selectedPatternId: 0,
    reverbVal: 0,
    panVal: 0,
    pan: 0,
    tuning: 0,
    fxSends: { reverb: 0, distortion: 0 },
  };
}

export function resolveImportedT1OffsetSec(
  p: any,
  variant: any,
  trimStartSec: number,
  hasAnacrusis: boolean,
  anacrusisDurationSec: number,
  effectiveBpm: number,
  audioBuffer: AudioBuffer,
  isStepActiveFn: (s: any) => boolean
): number {
  const rawStartOffset = p.startOffsetSec ?? variant?.startOffsetSec;
  const rawT1 = p.t1OffsetSec ?? variant?.t1OffsetSec;
  let t1OffsetSec = rawT1 !== undefined && (Number(rawT1) !== 0 || rawStartOffset === undefined)
    ? Number(rawT1)
    : (rawStartOffset !== undefined ? (trimStartSec - Number(rawStartOffset)) : (hasAnacrusis ? (trimStartSec + anacrusisDurationSec) : trimStartSec));

  if (!hasAnacrusis && Math.abs(t1OffsetSec - trimStartSec) < 0.02 && audioBuffer) {
    const mainSteps: any[] = p.mainSteps || [];
    const firstActiveIdx = mainSteps.findIndex(isStepActiveFn);
    if (firstActiveIdx > 0 && firstActiveIdx < 16) {
      const expectedRestSec = firstActiveIdx * (60 / Math.max(30, effectiveBpm) / 4);
      if (expectedRestSec >= 0.30) {
        const ch = audioBuffer.getChannelData(0), sr = audioBuffer.sampleRate;
        const startSample = Math.max(0, Math.floor(trimStartSec * sr));
        const winSamples = Math.max(1, Math.floor(0.025 * sr));
        let peakRms = 0;
        const rmsList: Array<{ sec: number; rms: number }> = [];
        for (let s = startSample; s + winSamples <= ch.length; s += winSamples) {
          let sumSq = 0;
          for (let k = 0; k < winSamples; k++) sumSq += ch[s + k] * ch[s + k];
          const rms = Math.sqrt(sumSq / winSamples);
          if (rms > peakRms) peakRms = rms;
          rmsList.push({ sec: (s - startSample) / sr, rms });
        }
        const thresh = Math.max(0.012, peakRms * 0.16);
        const firstOnset = rmsList.find((w) => w.rms >= thresh)?.sec ?? expectedRestSec;
        if (firstOnset < expectedRestSec - 0.22) {
          t1OffsetSec = Number((trimStartSec - (expectedRestSec - firstOnset)).toFixed(6));
        }
      }
    }
  }
  return t1OffsetSec;
}
