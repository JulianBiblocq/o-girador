import React from 'react';
import { DndContext, pointerWithin } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortablePatternCard } from './SortablePatternCard';
import { PatternUsageItem } from '../../../utils/editorPatternUsage';
import { Pattern, TrackGroup } from '../../../types';
import { resolveMasterTrackId, resolveMatchingPatternIdOnMaster } from '../../../utils/trackMasterResolver';
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
  isAllPatternsPasteable: (tId: number) => boolean;
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

  const handleSwitchToMaster = () => {
    const store = useSequencerStore.getState();
    const masterTrackId = resolveMasterTrackId(track.id, store.tracks);
    const masterTrack = store.tracks.find((t) => t.id === masterTrackId);
    const patId = masterTrack ? resolveMatchingPatternIdOnMaster(masterTrack, track, selectedPatternId) : selectedPatternId;
    store.setEditingTrackId(masterTrackId);
    if (patId) store.setSelectedPatternId(patId);
  };

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-3 md:p-5 flex flex-col gap-4 min-w-0 bg-transparent text-[#1a1a1a] relative z-10" style={{ WebkitOverflowScrolling: 'touch' }}>
      {isSlave && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#d4af37]/20 border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] text-xs font-bold text-[#1a1a1a] shrink-0 rounded-xs">
          <span className="truncate">{lang === 'fr' ? 'Piste liée (esclave). Motifs synchronisés avec la piste maître.' : 'Faixa vinculada (escrava). Padrões sincronizados.'}</span>
          <button
            type="button"
            onClick={handleSwitchToMaster}
            className="px-2.5 py-1 bg-[#f4ecd8] hover:bg-[#e2d5b8] text-[#1a1a1a] font-cactus font-bold text-xs uppercase border-2 border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] flex items-center gap-1.5 cursor-pointer ml-auto shrink-0 transition-colors"
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

        {!isSlave && (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <button onClick={onAddPattern} className="self-start bg-[#f4ecd8] text-[#1a1a1a] cordel-border-sm cordel-button px-4 py-2 font-cactus font-bold text-sm cursor-pointer hover:bg-[#1a1a1a] hover:text-[#f4ecd8] transition-colors">
              + {lang === 'fr' ? 'Ajouter un motif' : 'Adicionar padrão'}
            </button>
            {canPaste && (
              <button onClick={onPasteAsNewPattern} className="self-start bg-[#f4ecd8] text-[#1a1a1a] cordel-border-sm cordel-button px-4 py-2 font-cactus font-bold text-sm cursor-pointer hover:bg-[#1a1a1a] hover:text-[#f4ecd8] transition-colors">
                {lang === 'fr' ? 'Coller comme nouveau motif' : 'Colar como novo padrão'}
              </button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => copyAllTrackPatterns(effectiveTrack.id, inst.name)} className="bg-[#f4ecd8] text-[#1a1a1a] cordel-border-sm cordel-button px-3 py-1.5 font-cactus font-bold text-xs cursor-pointer hover:bg-[#1a1a1a] hover:text-[#f4ecd8] transition-colors" title={lang === 'fr' ? 'Copier tous les motifs' : 'Copiar todos'}>
                {lang === 'fr' ? 'Copier tous les motifs' : 'Copiar todos'}
              </button>
              {isAllPatternsPasteable(effectiveEditTrackId) && (
                <button onClick={() => pasteAllTrackPatterns(effectiveEditTrackId)} className="bg-[#d4af37] text-[#1a1a1a] cordel-border-sm cordel-button px-3 py-1.5 font-cactus font-bold text-xs cursor-pointer hover:bg-[#1a1a1a] hover:text-[#f4ecd8] transition-colors">
                  {lang === 'fr' ? `Remplacer par "${instrumentPatternsClipboard?.instrumentName}"` : `Substituir`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

EditorPatternListColumn.displayName = 'EditorPatternListColumn';
