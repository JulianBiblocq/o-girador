/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DndContext, pointerWithin, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Pattern, Language } from '../../../types';
import { SortablePatternCard } from './SortablePatternCard';
import { SortablePatternCardProps } from './patternCardTypes';
import { PatternUsageItem } from '../../../utils/editorPatternUsage';
import { canTransferPatterns } from '../../../utils/instrumentCompatibility';

export interface EditorPatternListColumnProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isSlave: boolean;
  lang: Language;
  sensors: any;
  handleDragEnd: (event: DragEndEvent) => void;
  patternIds: number[];
  displayedPatterns: Pattern[];
  selectedPatternId: number | null;
  track: any;
  cardProps: Omit<SortablePatternCardProps, 'ptn' | 'ptnIdx' | 'isSelected' | 'usage'>;
  getPatternUsage: (patternId: number, track: any, tracksMeta: any[], lang: string) => PatternUsageItem[];
  tracksMeta: any[];
  onAddPattern: () => void;
  canPaste: boolean;
  onPasteAsNewPattern: () => void;
  copyAllTrackPatterns: (trackId: number) => void;
  pasteAllTrackPatterns: (trackId: number, append?: boolean) => void;
  isAllPatternsPasteable: boolean;
  instrumentPatternsClipboard: any;
  effectiveTrack: any;
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

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-3 md:p-5 flex flex-col gap-4 min-w-0 bg-transparent text-[#1a1a1a] relative z-10" style={{ WebkitOverflowScrolling: 'touch' }}>
      {isSlave && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#d4af37]/20 border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] text-xs font-bold text-[#1a1a1a] shrink-0 select-none rounded-xs">
          <span className="text-base">🔗</span>
          <span>{lang === 'fr' ? 'Piste liée (esclave). Motifs synchronisés avec la piste maître.' : 'Faixa vinculada (escrava). Padrões sincronizados.'}</span>
        </div>
      )}

      <div className={`flex flex-col gap-6 ${isSlave ? 'opacity-55 pointer-events-none select-none' : ''}`}>
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
          <SortableContext items={patternIds} strategy={verticalListSortingStrategy}>
            {displayedPatterns.map((ptn, ptnIdx) => (
              <SortablePatternCard
                key={ptn.id}
                ptn={ptn}
                ptnIdx={ptnIdx}
                isSelected={(selectedPatternId ?? track.selectedPatternId ?? displayedPatterns[0]?.id) === ptn.id}
                usage={getPatternUsage(ptn.id, track, tracksMeta, lang)}
                {...cardProps}
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
                📥 {lang === 'fr' ? 'Coller comme nouveau motif' : 'Colar como novo padrão'}
              </button>
            )}
            <button onClick={() => copyAllTrackPatterns(effectiveEditTrackId)} className="self-start bg-[#f4ecd8] text-[#1a1a1a] cordel-border-sm cordel-button px-4 py-2 font-cactus font-bold text-sm cursor-pointer hover:bg-[#1a1a1a] hover:text-[#f4ecd8] transition-colors flex items-center gap-1.5">
              <span>📋</span><span>{lang === 'fr' ? 'Copier tous les motifs' : 'Copiar todos os padrões'}</span>
            </button>
            <button
              onClick={() => pasteAllTrackPatterns(effectiveEditTrackId, false)}
              disabled={!isAllPatternsPasteable}
              className={`self-start cordel-border-sm cordel-button px-4 py-2 font-cactus font-bold text-sm transition-colors flex items-center gap-1.5 ${isAllPatternsPasteable ? 'bg-[#f4ecd8] text-[#1a1a1a] cursor-pointer hover:bg-[#1a1a1a] hover:text-[#f4ecd8]' : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'}`}
              title={!instrumentPatternsClipboard ? (lang === 'fr' ? 'Presse-papier vide' : 'Área de transferência vazia') : !canTransferPatterns(instrumentPatternsClipboard, effectiveTrack || track) ? (lang === 'fr' ? 'Famille incompatible' : 'Família incompatível') : (lang === 'fr' ? 'Coller tous les motifs copiés (banque)' : 'Colar todos os padrões')}
            >
              <span>📥</span><span>{lang === 'fr' ? 'Coller tous les motifs' : 'Colar todos os padrões'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

EditorPatternListColumn.displayName = 'EditorPatternListColumn';
