/**
 * Hook de sélection multiple et suppression groupée des mesures dans l'en-tête (< 115 lignes).
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { deleteMeasuresBatchState } from '../../stores/helpers/measureBatchDeleteHelper';
import { formatMeasureRanges } from '../../utils/formatMeasures';

interface Params {
  totalMeasures: number;
  lang: 'fr' | 'pt';
  confirmAsync: (msg: string) => Promise<boolean>;
  onSeekToMeasure?: (mIdx: number) => void;
}

export function useTimelineHeaderSelection({ totalMeasures, lang, confirmAsync, onSeekToMeasure }: Params) {
  const [selectedHeaderMeasures, setSelectedHeaderMeasures] = useState<number[]>([]);
  const [anchorHeaderMeasure, setAnchorHeaderMeasure] = useState<number | null>(null);
  const isConfirmingRef = useRef(false);

  const clearHeaderSelection = useCallback(() => {
    setSelectedHeaderMeasures([]);
    setAnchorHeaderMeasure(null);
  }, []);

  const handleHeaderMeasureClick = useCallback((mIdx: number, e: React.MouseEvent) => {
    const store = useSequencerStore.getState();
    store.clearTimelineSelection();
    store.clearAutomationSelection();

    if (e.shiftKey && anchorHeaderMeasure !== null) {
      const start = Math.min(anchorHeaderMeasure, mIdx);
      const end = Math.max(anchorHeaderMeasure, mIdx);
      setSelectedHeaderMeasures(Array.from({ length: end - start + 1 }, (_, i) => start + i));
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedHeaderMeasures((prev) =>
        prev.includes(mIdx) ? prev.filter((i) => i !== mIdx) : [...prev, mIdx]
      );
      setAnchorHeaderMeasure(mIdx);
    } else {
      setSelectedHeaderMeasures([mIdx]);
      setAnchorHeaderMeasure(mIdx);
      onSeekToMeasure?.(mIdx);
    }
  }, [anchorHeaderMeasure, onSeekToMeasure]);

  const handleDeleteMeasuresPrompt = useCallback(async (targetMIdx?: number) => {
    const isMulti = targetMIdx === undefined || (selectedHeaderMeasures.length > 1 && selectedHeaderMeasures.includes(targetMIdx));
    let targets = isMulti ? [...selectedHeaderMeasures] : [targetMIdx];
    if (targets.length === 0) return;

    const currentTotal = useSequencerStore.getState().totalMeasures;
    if (targets.length >= currentTotal) {
      targets = targets.filter((i) => i !== currentTotal - 1);
      if (targets.length === 0) return;
    }

    const sortedTargets = [...new Set(targets)].sort((a, b) => a - b);
    const count = sortedTargets.length;
    const rangeLabel = formatMeasureRanges(sortedTargets.map((i) => i + 1), lang);

    const msg = count > 1
      ? (lang === 'fr'
          ? `Voulez-vous vraiment supprimer ces ${count} mesures (${rangeLabel}) ?`
          : `Deseja realmente excluir estes ${count} compassos (${rangeLabel})?`)
      : (lang === 'fr'
          ? `Supprimer la mesure ${sortedTargets[0] + 1} ?`
          : `Excluir o compasso ${sortedTargets[0] + 1}?`);

    try {
      isConfirmingRef.current = true;
      const ok = await confirmAsync(msg);
      if (!ok) return;

      useSequencerStore.getState().pushUndoState();
      useSequencerStore.setState((s) => deleteMeasuresBatchState(s, sortedTargets));
      clearHeaderSelection();
    } finally {
      isConfirmingRef.current = false;
    }
  }, [selectedHeaderMeasures, lang, confirmAsync, clearHeaderSelection]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedHeaderMeasures.length === 0) return;
      if (e.key === 'Escape') { clearHeaderSelection(); return; }
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;
      if (useSequencerStore.getState().selectedTimelineCells?.length) return;

      e.preventDefault();
      handleDeleteMeasuresPrompt();
    };

    const handlePointerDownOutside = (e: PointerEvent) => {
      if (isConfirmingRef.current) return;
      const target = e.target as HTMLElement;
      if (target.closest('.timeline-ruler-header-measure, .ruler-measure-header, [data-measure-header]')) return;
      clearHeaderSelection();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDownOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDownOutside);
    };
  }, [selectedHeaderMeasures.length, clearHeaderSelection, handleDeleteMeasuresPrompt]);

  return {
    selectedHeaderMeasures,
    anchorHeaderMeasure,
    handleHeaderMeasureClick,
    handleDeleteMeasuresPrompt,
    clearHeaderSelection,
  };
}
