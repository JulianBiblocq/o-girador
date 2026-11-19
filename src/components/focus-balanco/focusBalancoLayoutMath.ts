import { BalancoMorphPhase } from '../../audio/groove/liveBalancoMorph';

export const TWO_ROW_STRIP_MAX_WIDTH_PX = 560;

export function computeRelativeMorphPercent(scale: number): number {
  if (!Number.isFinite(scale)) return 100;
  return Math.round(Math.max(0, Math.min(1, scale)) * 100);
}

export function resolveFocusCycleButtonLabel(
  phase: BalancoMorphPhase,
  lang: string,
  compact: boolean
): string {
  const isPt = lang === 'pt';
  switch (phase) {
    case 'waiting-play':
      return isPt ? 'INICIANDO...' : 'DÉMARRAGE...';
    case 'anchor':
      return '100% BALANÇO';
    case 'ramp-down':
      return '100% -> 0%';
    case 'hold-zero':
      return isPt ? '0% RETO' : '0% DROIT';
    case 'ramp-up':
      return '0% -> 100%';
    case 'idle':
    default:
      if (compact) return '100% -> 0% -> 100%';
      return isPt ? 'ANIMAÇÃO: 100% -> 0% -> 100%' : 'ANIMATION : 100% -> 0% -> 100%';
  }
}

export function shouldUseTwoRowBrickStrip(
  beatsCount: number,
  compact: boolean,
  containerWidthPx: number
): boolean {
  if (beatsCount < 3) return false;
  if (compact) return true;
  return containerWidthPx > 0 && containerWidthPx < TWO_ROW_STRIP_MAX_WIDTH_PX;
}

export function resolveBeatsPerStripRow(beatsCount: number, isTwoRow: boolean): number {
  const safeBeats = Math.max(1, beatsCount);
  if (!isTwoRow || safeBeats < 3) return safeBeats;
  return Math.max(2, Math.ceil(safeBeats / 2));
}

export function computeStepCellWidthPx(
  totalWidth: number,
  beatsCount: number,
  beatSubCount: number,
  isTwoRow: boolean
): number {
  if (totalWidth <= 0) return 0;
  const beatsPerRow = resolveBeatsPerStripRow(beatsCount, isTwoRow);
  return totalWidth / (beatsPerRow * Math.max(1, beatSubCount));
}

export function computeFocusPlayheadTransform(
  playheadRatio: number,
  totalWidth: number,
  beatsCount: number,
  isTwoRow: boolean
): { xPx: number; rowIdx: 0 | 1 } {
  const r = Number.isFinite(playheadRatio) ? (((playheadRatio % 1) + 1) % 1) : 0;
  if (!isTwoRow || beatsCount < 3) {
    return { xPx: r * totalWidth, rowIdx: 0 };
  }
  const beatsPerRow = resolveBeatsPerStripRow(beatsCount, true);
  const beatFloat = r * beatsCount;
  if (beatFloat < beatsPerRow) {
    return { xPx: (beatFloat / beatsPerRow) * totalWidth, rowIdx: 0 };
  }
  return { xPx: ((beatFloat - beatsPerRow) / beatsPerRow) * totalWidth, rowIdx: 1 };
}
