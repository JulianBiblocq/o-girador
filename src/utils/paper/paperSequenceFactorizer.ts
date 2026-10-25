/**
 * Factorisation et réorganisation d'une séquence de sections (< 50 lignes).
 */
import { PaperSequenceItem } from '../../types/paperWorkshop.types';

export function factorizeSequence(seq: string[]): PaperSequenceItem[] {
  const res: PaperSequenceItem[] = [];
  let cur = '';
  let count = 0;

  seq.forEach((s) => {
    if (s === cur) {
      count++;
    } else {
      if (cur) {
        res.push({
          id: `seq-${res.length}-${Date.now()}-${Math.random()}`,
          sectionName: cur,
          repeatCount: count,
        });
      }
      cur = s;
      count = 1;
    }
  });

  if (cur) {
    res.push({
      id: `seq-${res.length}-${Date.now()}-${Math.random()}`,
      sectionName: cur,
      repeatCount: count,
    });
  }

  return res;
}

export function reorderSequenceItem(
  items: PaperSequenceItem[],
  idx: number,
  dir: -1 | 1
): PaperSequenceItem[] {
  const nextIdx = idx + dir;
  if (nextIdx < 0 || nextIdx >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(idx, 1);
  next.splice(nextIdx, 0, moved);
  return next;
}
