/**
 * Utilitaire Mono-Compatible Pan & Soft Clamp (< 50 lignes).
 */
import { normalizePanForTone } from '../../hooks/audio-sync/audioParamsCache';

export interface MonoCompatiblePanResult {
  uiPan: number;
  acousticPan: number;
  panCompensationDb: number;
}

export function applyMonoCompatiblePan(rawPan: number | undefined | null): MonoCompatiblePanResult {
  const uiPan = normalizePanForTone(rawPan);
  const acousticPan = uiPan * 0.72;
  const panCompensationDb = Math.abs(uiPan) * 1.6;
  return { uiPan, acousticPan, panCompensationDb };
}
