import { useMemo, useEffect } from 'react';
import { PaperSequenceItem } from '../../../types/paperWorkshop.types';
import { evaluateSectionDoubt, resolveWithPreservedSuffix } from '../../../utils/paper/paperSectionDoubtMatcher';
import { usePaperVigilanceStore } from '../../../stores/usePaperVigilanceStore';

/**
 * Gère la détection des doutes de sections OCR, l'enregistrement dans le store
 * de vigilance et l'extraction des tempos utilisés dans le conducteur papier.
 */
export function useSequenceDoubtsAndBpms(
  availableSections: Array<string | { id: string; name: string }>,
  sequenceItems: PaperSequenceItem[],
  onChangeSequence: (items: PaperSequenceItem[]) => void,
  globalBpm: number,
  scoreId?: string
) {
  const knownNames = useMemo(
    () => availableSections.map((s) => (typeof s === 'string' ? s : s.name)),
    [availableSections]
  );

  const doubtsMap = useMemo(() => {
    const counts: Record<string, number> = {};
    sequenceItems.forEach((it) => {
      const b = evaluateSectionDoubt(it.sectionName, knownNames).baseName;
      counts[b] = (counts[b] || 0) + 1;
    });
    return sequenceItems.map((it) => {
      const evaluated = evaluateSectionDoubt(it.sectionName, knownNames);
      return { ...evaluated, duplicateCount: counts[evaluated.baseName] || 1 };
    });
  }, [sequenceItems, knownNames]);

  useEffect(() => {
    const vigilance = usePaperVigilanceStore.getState();
    const activeScoreId = scoreId || vigilance.activeSequencerScoreId || vigilance.activePreviewScoreId || 'active_score';
    const doubts = doubtsMap
      .map((d, idx) => ({ d, idx }))
      .filter(({ d }) => d.hasDoubt)
      .map(({ d, idx }) => ({ sectionName: d.baseName, roleKey: 'sequence', stepIndex: idx, reason: 'section_doubt' as const }));
    vigilance.registerSequenceDoubts(activeScoreId, doubts);
  }, [doubtsMap, scoreId]);

  const handleResolveDoubt = (itemId: string, chosenCandidate: string, applyToAll: boolean) => {
    const itemIdx = sequenceItems.findIndex((it) => it.id === itemId);
    const targetBase = itemIdx >= 0 ? doubtsMap[itemIdx]?.baseName : '';
    const matchSec = availableSections.find(
      (s) => (typeof s === 'string' ? s : s.name).toLowerCase() === chosenCandidate.toLowerCase()
    );
    const matchedId = typeof matchSec === 'object' ? matchSec.id : undefined;

    onChangeSequence(
      sequenceItems.map((it, i) => {
        const isTarget = applyToAll ? doubtsMap[i]?.baseName === targetBase : it.id === itemId;
        return isTarget
          ? { ...it, sectionName: resolveWithPreservedSuffix(chosenCandidate, it.sectionName), sectionId: matchedId || it.sectionId }
          : it;
      })
    );
  };

  const usedBpms = useMemo(() => {
    const set = new Set<number>([globalBpm]);
    sequenceItems.forEach((it) => {
      if (it.customBpm) set.add(it.customBpm);
      if (it.targetBpmOverride) set.add(it.targetBpmOverride);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [globalBpm, sequenceItems]);

  return { doubtsMap, handleResolveDoubt, usedBpms };
}
