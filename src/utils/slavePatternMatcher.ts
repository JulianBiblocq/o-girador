/**
 * Comparateurs et appariement de motifs Maître -> Esclave (< 70 lignes).
 */
import { Pattern, TrackGroup } from '../types';

function countOverlap(a?: boolean[], b?: boolean[]): number {
  if (!a || !b) return 0;
  return a.reduce((acc, val, i) => (val && b[i] ? acc + 1 : acc), 0);
}

export function boolArraysEqual(a?: boolean[], b?: boolean[]): boolean {
  const lenA = a?.length || 0;
  const lenB = b?.length || 0;
  if (lenA !== lenB) return false;
  for (let i = 0; i < lenA; i++) {
    if (Boolean(a![i]) !== Boolean(b![i])) return false;
  }
  return true;
}

export function numArraysEqual(a?: number[], b?: number[]): boolean {
  if (!a && !b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function findMatchingSlavePattern(
  mPtn: Pattern,
  slave: TrackGroup,
  master: TrackGroup,
  mIdx?: number
): Pattern | undefined {
  const slavePatterns = slave.patterns || [];
  const byId = slavePatterns.find((s) => String(s.id) === String(mPtn.id));
  if (byId) return byId;

  const norm = mPtn.name?.trim().toLowerCase();
  const byName = norm ? slavePatterns.find((s) => s.name?.trim().toLowerCase() === norm) : undefined;
  if (byName) {
    const otherWithBetterOverlap = (master.patterns || []).find((other) => {
      if (String(other.id) === String(mPtn.id)) return false;
      const ovOther = countOverlap(byName.measureAssignments, other.measureAssignments);
      const ovCur = countOverlap(byName.measureAssignments, mPtn.measureAssignments);
      return ovOther > ovCur && ovOther > 0;
    });
    if (!otherWithBetterOverlap) return byName;
  }

  if (mIdx !== undefined && slavePatterns.length === (master.patterns || []).length && slavePatterns[mIdx]) {
    const cand = slavePatterns[mIdx];
    const claimedElsewhere = (master.patterns || []).some(
      (other, oIdx) =>
        oIdx !== mIdx &&
        (String(other.id) === String(cand.id) || other.name?.trim().toLowerCase() === cand.name?.trim().toLowerCase())
    );
    if (!claimedElsewhere) return cand;
  }
  return undefined;
}
