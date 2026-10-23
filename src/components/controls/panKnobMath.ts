/**
 * Fonctions de calcul mathématique pour le bouton de panoramique (< 40 lignes).
 */

export function calculatePanFromDelta(
  startY: number,
  startX: number,
  currentY: number,
  currentX: number,
  startValue: number
): number {
  const diffY = startY - currentY;
  const diffX = currentX - startX;
  const diff = Math.abs(diffY) >= Math.abs(diffX) ? diffY : diffX;
  let val = startValue + (diff / 140) * 200;
  val = Math.max(-100, Math.min(100, Math.round(val)));
  if (Math.abs(val) <= 2) val = 0;
  return val;
}

export function formatPanTitle(val: number): string {
  if (val === 0) return 'Pan: Centro';
  return `Pan: ${val > 0 ? 'D' + val : 'E' + Math.abs(val)}`;
}

export interface UsePanKnobInteractionProps {
  trackId?: number;
  value: number;
  defaultValue?: number;
  onChange: (val: number) => void;
  panKnobRef?: React.RefObject<SVGGElement | null>;
}

