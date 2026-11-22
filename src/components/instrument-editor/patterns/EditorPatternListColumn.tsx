import React from 'react';
import { DndContext, pointerWithin } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortablePatternCard } from './SortablePatternCard';
import { EditorPatternListFooter } from './EditorPatternListFooter';
import { PatternUsageItem } from '../../../utils/editorPatternUsage';
import { Pattern, TrackGroup } from '../../../types';
import { resolveMasterTrack, resolveMasterTrackId, resolveMatchingPatternIdOnMaster } from '../../../utils/trackMasterResolver';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { Pencil } from 'lucide-react';

export interface EditorPatternListColumnProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isSlave: boolean;
  lang: 'fr' | 'pt';
  sensors: any;
  handleDragEnd: (event: any) => void;
  patternIds: number[];
  displayedPatterns: Pattern[];
  selectedPatternId?: number;
  track: TrackGroup;
  cardProps: any;
  getPatternUsage: (id: number, t: TrackGroup, metas: any[], l: 'fr' | 'pt') => PatternUsageItem[];
  tracksMeta: any[];
  onAddPattern: () => void;
  canPaste: boolean;
  onPasteAsNewPattern: () => void;
  copyAllTrackPatterns: (tId: number, name: string) => void;
  pasteAllTrackPatterns: (tId: number) => void;
  isAllPatternsPasteable?: boolean | ((tId: number) => boolean);
  instrumentPatternsClipboard: any;
  effectiveTrack: TrackGroup;
  inst: any;
  effectiveEditTrackId: number;
}

export const EditorPatternListColumn: React.FC<EditorPatternListColumnProps> = React.memo((props) => {
  const {
    containerRef, isSlave, lang, sensors, handleDragEnd, patternIds,
    displayedPatterns, selectedPatternId, track, cardProps, getPatternUsage,
    tracksMeta, onAddPattern, canPaste, onPasteAsNewPattern, copyAllTrackPatterns,
    pasteAllTrackPatterns, isAllPatternsPasteable, instrumentPatternsClipboard,
    effectiveTrack, inst, effectiveEditTrackId,
  } = props;

  const hasCopiedPattern = useSequencerStore((s) => Boolean(s.copiedPattern && s.copiedPattern.steps > 0));
  const copiedInstId = useSequencerStore((s) => s.copiedPattern?.sourceInstId || '');

  const handleSwitchToMaster = () => {
    const store = useSequencerStore.getState();
    const masterTrack = resolveMasterTrack(track.id, store.tracks);
    const masterTrackId = masterTrack?.id ?? resolveMasterTrackId(track.id, store.tracks);
    const patId = masterTrack ? resolveMatchingPatternIdOnMaster(masterTrack, track, selectedPatternId) : selectedPatternId;
    store.setEditingTrackId(masterTrackId);
    if (patId) store.setSelectedPatternId(patId);
  };

  const hasBankClip = Boolean(instrumentPatternsClipboard?.patterns?.length);
  const canPasteAll = typeof isAllPatternsPasteable === 'function'
    ? Boolean(isAllPatternsPasteable(effectiveEditTrackId))
    : Boolean(isAllPatternsPasteable);

  return (
    <div ref={containerRef} data-tour-id="editor-step-grid" className="flex-1 overflow-y-auto p-3 md:p-5 flex flex-col gap-4 min-w-0 bg-transparent text-[var(--cordel-ink-dark)] relative z-10" style={{ WebkitOverflowScrolling: 'touch' }}>
      {isSlave && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[var(--cordel-gold)]/20 border-2 border-[var(--cordel-ink-dark)] shadow-[2px_2px_0px_var(--cordel-ink-dark)] text-xs font-bold text-[var(--cordel-ink-dark)] shrink-0 rounded-xs">
          <span className="truncate">{lang === 'fr' ? 'Piste liée (esclave). Motifs synchronisés avec la piste maître.' : 'Faixa vinculada (escrava). Padrões sincronizados.'}</span>
          <button
            type="button"
            onClick={handleSwitchToMaster}
            className="px-2.5 py-1 bg-[var(--cordel-parchment-bg)] hover:bg-[var(--cordel-parchment-surface)] text-[var(--cordel-ink-dark)] font-cactus font-bold text-xs uppercase border-2 border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)] flex items-center gap-1.5 cursor-pointer ml-auto shrink-0 transition-colors"
          >
            <Pencil size={12} className="shrink-0" />
            <span>{lang === 'fr' ? 'Éditer sur la piste Maître' : 'Editar na faixa Mestre'}</span>
          </button>
        </div>
      )}

      <div className={`flex flex-col gap-6 ${isSlave ? 'opacity-55 pointer-events-none select-none' : ''}`}>
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
          <SortableContext items={patternIds} strategy={verticalListSortingStrategy}>
            {displayedPatterns.map((ptn, ptnIdx) => (
              <SortablePatternCard
                key={ptn.id} ptn={ptn} ptnIdx={ptnIdx}
                isSelected={(selectedPatternId ?? track.selectedPatternId ?? displayedPatterns[0]?.id) === ptn.id}
                usage={getPatternUsage(ptn.id, track, tracksMeta, lang)} {...cardProps}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <EditorPatternListFooter
        isSlave={isSlave}
        lang={lang}
        onAddPattern={onAddPattern}
        canPaste={canPaste}
        hasCopiedPattern={hasCopiedPattern}
        copiedInstId={copiedInstId}
        onPasteAsNewPattern={onPasteAsNewPattern}
        copyAllTrackPatterns={copyAllTrackPatterns}
        pasteAllTrackPatterns={pasteAllTrackPatterns}
        canPasteAll={canPasteAll}
        hasBankClip={hasBankClip}
        instrumentPatternsClipboard={instrumentPatternsClipboard}
        effectiveTrackId={effectiveTrack.id}
        effectiveEditTrackId={effectiveEditTrackId}
        instName={inst.name}
      />
    </div>
  );
});

EditorPatternListColumn.displayName = 'EditorPatternListColumn';
