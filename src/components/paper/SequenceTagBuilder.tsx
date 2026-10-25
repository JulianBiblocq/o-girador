/**
 * Palette d'etiquettes et sequenceur conducteur avec detection et resolution des doutes (< 140 lignes).
 */
import React, { useMemo, useEffect } from 'react';
import { DndContext, closestCenter, DragOverlay, useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { PaperSequenceItem } from '../../types/paperWorkshop.types';
import { GripVertical, Camera } from 'lucide-react';
import { SequencePaletteItem } from './dnd/SequencePaletteItem';
import { SequenceTagItem } from './dnd/SequenceTagItem';
import { useSequenceTagDnd } from './dnd/useSequenceTagDnd';
import { resolveNextSectionBpm } from '../../utils/paper/paperSequenceBpmInterpolator';
import { reorderSequenceItem } from '../../utils/paper/paperSequenceFactorizer';
import { evaluateSectionDoubt, resolveWithPreservedSuffix } from '../../utils/paper/paperSectionDoubtMatcher';
import { usePaperVigilanceStore } from '../../stores/usePaperVigilanceStore';

export { factorizeSequence } from '../../utils/paper/paperSequenceFactorizer';

interface Props {
  availableSections: Array<string | { id: string; name: string }>;
  sequenceItems: PaperSequenceItem[];
  onChangeSequence: (items: PaperSequenceItem[]) => void;
  onRescanSequence?: () => void;
  globalBpm?: number;
  scoreId?: string;
  lang: 'fr' | 'pt';
}

export const SequenceTagBuilder: React.FC<Props> = ({
  availableSections, sequenceItems, onChangeSequence, onRescanSequence, globalBpm = 96, scoreId, lang,
}) => {
  const isFr = lang === 'fr';
  const { sensors, activeDrag, overIndex, handleDragStart, handleDragOver, handleDragEnd, handleDragCancel } = useSequenceTagDnd(sequenceItems, onChangeSequence);
  const { setNodeRef: setDropzoneRef, isOver: isContainerOver } = useDroppable({ id: 'sequence-container-dropzone' });

  const knownNames = useMemo(() => availableSections.map((s) => (typeof s === 'string' ? s : s.name)), [availableSections]);

  const doubtsMap = useMemo(() => {
    const counts: Record<string, number> = {};
    sequenceItems.forEach((it) => {
      const b = evaluateSectionDoubt(it.sectionName, knownNames).baseName;
      counts[b] = (counts[b] || 0) + 1;
    });
    return sequenceItems.map((it) => ({
      ...evaluateSectionDoubt(it.sectionName, knownNames), duplicateCount: counts[evaluateSectionDoubt(it.sectionName, knownNames).baseName] || 1,
    }));
  }, [sequenceItems, knownNames]);

  useEffect(() => {
    const vigilance = usePaperVigilanceStore.getState();
    const activeScoreId = scoreId || vigilance.activeSequencerScoreId || vigilance.activePreviewScoreId || 'active_score';
    const doubts = doubtsMap.map((d, idx) => ({ d, idx })).filter(({ d }) => d.hasDoubt)
      .map(({ d, idx }) => ({ sectionName: d.baseName, roleKey: 'sequence', stepIndex: idx, reason: 'section_doubt' as const }));
    vigilance.registerSequenceDoubts(activeScoreId, doubts);
  }, [doubtsMap, scoreId]);

  const handleResolveDoubt = (itemId: string, chosenCandidate: string, applyToAll: boolean) => {
    const itemIdx = sequenceItems.findIndex((it) => it.id === itemId);
    const targetBase = itemIdx >= 0 ? doubtsMap[itemIdx]?.baseName : '';
    const matchSec = availableSections.find((s) => (typeof s === 'string' ? s : s.name).toLowerCase() === chosenCandidate.toLowerCase());
    const matchedId = typeof matchSec === 'object' ? matchSec.id : undefined;

    onChangeSequence(sequenceItems.map((it, i) => {
      const isTarget = applyToAll ? doubtsMap[i]?.baseName === targetBase : it.id === itemId;
      return isTarget ? { ...it, sectionName: resolveWithPreservedSuffix(chosenCandidate, it.sectionName), sectionId: matchedId || it.sectionId } : it;
    }));
  };

  const usedBpms = useMemo(() => {
    const set = new Set<number>([globalBpm]);
    sequenceItems.forEach((it) => { if (it.customBpm) set.add(it.customBpm); if (it.targetBpmOverride) set.add(it.targetBpmOverride); });
    return Array.from(set).sort((a, b) => a - b);
  }, [globalBpm, sequenceItems]);

  const addTag = (sec: string | { id: string; name: string }) => {
    const secName = typeof sec === 'string' ? sec : sec.name, secId = typeof sec === 'string' ? undefined : sec.id;
    onChangeSequence([...sequenceItems, { id: `tag-${Date.now()}-${Math.random()}`, sectionName: secName, repeatCount: 1, ...(secId ? { sectionId: secId } : {}) } as any]);
  };

  const updateRepeat = (id: string, delta: number) => onChangeSequence(sequenceItems.map((it) => (it.id === id ? { ...it, repeatCount: Math.max(1, Math.min(32, it.repeatCount + delta)) } : it)));
  const updateTempo = (id: string, updates: Partial<PaperSequenceItem>) => onChangeSequence(sequenceItems.map((it) => (it.id === id ? { ...it, ...updates } : it)));
  const moveItem = (idx: number, dir: -1 | 1) => onChangeSequence(reorderSequenceItem(sequenceItems, idx, dir));
  const totalMeasures = sequenceItems.reduce((acc, it) => acc + it.repeatCount, 0);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      <div className="flex flex-col gap-2 font-sans text-xs">
        <div className="p-2 bg-black/5 dark:bg-black/20 border border-black/30">
          <span className="font-cactus font-extrabold uppercase text-[10px] text-[#f59e0b] block mb-1">
            {isFr ? "1. Palette d'étiquettes (cliquez ou glissez dans la séquence) :" : '1. Paleta de etiquetas (clique ou arraste) :'}
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-[115px] overflow-y-auto pb-2">
            {availableSections.map((sec) => (
              <SequencePaletteItem key={typeof sec === 'string' ? sec : sec.id || sec.name} sec={sec} onAdd={addTag} />
            ))}
          </div>
        </div>

        <div data-paper-sequence-builder="true" className="p-2.5 bg-[#fdfbf7] dark:bg-[#fdfbf7] border-2 border-[#1a1a1a] min-h-[95px] flex flex-col justify-between shadow-[2px_2px_0px_#1a1a1a]">
          <div className="flex justify-between items-center border-b border-[#1a1a1a]/20 pb-1 mb-1.5 gap-2 flex-wrap">
            <span className="font-cactus font-bold uppercase text-[11px] !text-[#1a1a1a]">
              {isFr ? '2. Séquence assemblée' : '2. Sequência montada'} ({totalMeasures} {isFr ? 'mesures' : 'compassos'})
            </span>
            <div className="flex items-center gap-2">
              {onRescanSequence && (
                <button
                  type="button" onClick={onRescanSequence} title={isFr ? 'Rescanner la séquence' : 'Reescanear sequência'}
                  className="px-1.5 py-0.5 bg-[#f4ecd8] hover:bg-[#e2d5b8] text-[#1a1a1a] font-bold border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] text-[10px] cursor-pointer flex items-center gap-1 font-cactus uppercase transition-colors"
                >
                  <Camera size={11} className="text-[#1a1a1a] shrink-0" />
                  <span>{isFr ? 'Rescanner la séquence' : 'Reescanear sequência'}</span>
                </button>
              )}
              {sequenceItems.length > 0 && (
                <button type="button" onClick={() => onChangeSequence([])} className="text-[10px] text-[#8b2a1a] hover:underline font-bold cursor-pointer">
                  {isFr ? 'Tout effacer' : 'Limpar tudo'}
                </button>
              )}
            </div>
          </div>

          <div
            ref={setDropzoneRef}
            className={`flex flex-wrap gap-1.5 min-h-[50px] max-h-[145px] overflow-y-auto p-1 rounded-xs transition-colors ${
              isContainerOver && activeDrag ? 'bg-[#9a3412]/5 ring-2 ring-dashed ring-[#9a3412]' : ''
            }`}
          >
            <SortableContext items={sequenceItems.map((it) => it.id)} strategy={rectSortingStrategy}>
              {sequenceItems.map((item, idx) => (
                <SequenceTagItem
                  key={item.id} item={item} index={idx} totalCount={sequenceItems.length}
                  globalBpm={globalBpm} nextSectionBpm={resolveNextSectionBpm(sequenceItems, idx, globalBpm)}
                  usedBpms={usedBpms} doubtInfo={doubtsMap[idx]} onResolveDoubt={handleResolveDoubt}
                  onUpdateRepeat={updateRepeat} onUpdateTempo={updateTempo}
                  onRemove={(id) => onChangeSequence(sequenceItems.filter((it) => it.id !== id))}
                  onMove={moveItem} isDropTargetBefore={Boolean(activeDrag && overIndex === idx)} lang={lang}
                />
              ))}
            </SortableContext>
            {activeDrag && (overIndex === sequenceItems.length || sequenceItems.length === 0) && (
              <div className="border-2 border-dashed border-[#9a3412] bg-[#9a3412]/15 text-[#9a3412] font-cactus font-bold text-xs px-2.5 py-1 rounded-xs flex items-center justify-center animate-pulse">
                + {activeDrag.secName}
              </div>
            )}
            {sequenceItems.length === 0 && !activeDrag && (
              <div className="text-[#1a1a1a]/50 italic text-center w-full py-3 text-[11px]">
                {isFr ? 'Cliquez ou glissez une étiquette ici pour bâtir le conducteur' : 'Clique ou arraste uma etiqueta aqui'}
              </div>
            )}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeDrag ? (
          <div className="px-2.5 py-1 bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[4px_4px_0px_#000] rotate-2 opacity-95 text-xs font-cactus font-bold text-[#1a1a1a] flex items-center gap-1.5 pointer-events-none">
            <GripVertical size={13} className="text-[#1a1a1a]" />
            <span>{activeDrag.secName}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
