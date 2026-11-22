/**
 * Réconciliation du collage de banque de motifs sur une piste Esclave (< 90 lignes).
 */
import { Pattern, TrackGroup } from '../../types';
import { normalizePatternStepsForTarget } from '../../utils/patternPasteNormalizer';
import { getNextPatternName } from '../../utils/patternNaming';
import { cloneMasterPatternForSlave } from '../../utils/slavePatternCloneHelper';

export function pasteIntoSlaveTrackReconciled(
  slave: TrackGroup,
  master: TrackGroup,
  clipPatterns: Pattern[],
  targetType: string | undefined,
  applyTimeline: boolean,
  totalMeasures: number,
  lang: string
): { patterns: Pattern[]; patternOverrides?: Record<number, number | null>; selectedPatternId: number } {
  const masterPatterns = master.patterns || [];
  const usedClipIdx = new Set<number>();
  const nextOverrides = slave.patternOverrides ? { ...slave.patternOverrides } : undefined;

  const reconciled: Pattern[] = masterPatterns.map((mPtn, mIdx) => {
    let cIdx = clipPatterns.findIndex((cp, i) => !usedClipIdx.has(i) && String(cp.id) === String(mPtn.id));
    if (cIdx === -1 && mPtn.name) {
      const norm = mPtn.name.trim().toLowerCase();
      cIdx = clipPatterns.findIndex((cp, i) => !usedClipIdx.has(i) && cp.name?.trim().toLowerCase() === norm);
    }
    if (cIdx === -1 && mIdx < clipPatterns.length && !usedClipIdx.has(mIdx)) {
      cIdx = mIdx;
    }

    const mAssigns = mPtn.measureAssignments || [];
    const totalLen = Math.max(totalMeasures, mAssigns.length);

    if (cIdx !== -1) {
      usedClipIdx.add(cIdx);
      const srcClip = clipPatterns[cIdx];
      const cloned: Pattern = normalizePatternStepsForTarget(JSON.parse(JSON.stringify(srcClip)), targetType);
      const clipAssigns = Array.isArray(cloned.measureAssignments) ? cloned.measureAssignments : [];
      const hasClipActives = applyTimeline && clipAssigns.some(Boolean);
      const finalAssigns = Array.from({ length: totalLen }, (_, m) => {
        if (hasClipActives) {
          const active = Boolean(clipAssigns[m]);
          if (active && nextOverrides && nextOverrides[m] === null) delete nextOverrides[m];
          return active;
        }
        if (nextOverrides && nextOverrides[m] === null) return false;
        if (nextOverrides && nextOverrides[m] !== undefined) return String(nextOverrides[m]) === String(mPtn.id);
        return Boolean(mAssigns[m]);
      });

      return {
        ...cloned,
        id: mPtn.id,
        name: mPtn.name,
        steps: cloned.steps || mPtn.steps,
        measureAssignments: finalAssigns,
      };
    }

    const existing = (slave.patterns || []).find((sp) => String(sp.id) === String(mPtn.id));
    const fallbackAssigns = Array.from({ length: totalLen }, (_, m) =>
      nextOverrides && nextOverrides[m] === null ? false : Boolean(mAssigns[m])
    );
    return existing
      ? { ...existing, id: mPtn.id, name: mPtn.name, measureAssignments: fallbackAssigns }
      : cloneMasterPatternForSlave(mPtn, slave, fallbackAssigns);
  });

  clipPatterns.forEach((extra, idx) => {
    if (usedClipIdx.has(idx)) return;
    const clonedExtra: Pattern = normalizePatternStepsForTarget(JSON.parse(JSON.stringify(extra)), targetType);
    clonedExtra.id = Date.now() + Math.floor(Math.random() * 100000) + idx;
    clonedExtra.name = getNextPatternName(reconciled, extra.name, lang);
    const assigns = applyTimeline && clonedExtra.measureAssignments ? [...clonedExtra.measureAssignments] : [];
    while (assigns.length < totalMeasures) assigns.push(false);
    clonedExtra.measureAssignments = assigns.slice(0, totalMeasures);
    reconciled.push(clonedExtra);
  });

  return {
    patterns: reconciled,
    patternOverrides: nextOverrides,
    selectedPatternId: reconciled[0]?.id || slave.selectedPatternId || 0,
  };
}
