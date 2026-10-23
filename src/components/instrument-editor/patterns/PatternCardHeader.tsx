/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { Play, Square, GripVertical } from 'lucide-react';
import { XiloChisel } from '../../XiloIcons';
import { MetricDivisionSelector } from '../MetricDivisionSelector';
import { formatMeasureRanges } from '../../../utils/formatMeasures';
import { PatternCardHeaderProps } from './patternCardTypes';

export const PatternCardHeader: React.FC<PatternCardHeaderProps> = React.memo((props) => {
  const {
    ptn, ptnIdx, isSelected, isVocalContext, totalPatternsCount, editingPatternId,
    editName, setEditingPatternId, setEditName, handleSaveName, onSelectPattern,
    onDeletePattern, onStepsChange, armedPatternId, toggleArmPattern, trackId,
    soloPatternPlayId, soloPatternVariationId, onPlaySoloPattern, onStopSoloPattern,
    usage, lang, isMobile, attributes, listeners, badgeRef, onOpenContextMenu,
  } = props;
  const cardLongPressTimerRef = useRef<any>(null);
  const cardTouchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const totalVarProb = (ptn.variations || []).filter((v) => !v.playFirstTimeOnly).reduce((acc, v) => acc + v.probability, 0);
  const baseProb = Math.max(0, 100 - totalVarProb);
  const isSoloLoop = soloPatternPlayId === ptn.id && soloPatternVariationId === 'ensemble';

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      cardTouchStartPosRef.current = { x: t.clientX, y: t.clientY };
      cardLongPressTimerRef.current = setTimeout(() => { onOpenContextMenu(ptn, t.clientX, t.clientY); cardLongPressTimerRef.current = null; }, 400);
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (cardLongPressTimerRef.current && cardTouchStartPosRef.current && e.touches.length === 1) {
      const t = e.touches[0];
      if (Math.abs(t.clientX - cardTouchStartPosRef.current.x) > 10 || Math.abs(t.clientY - cardTouchStartPosRef.current.y) > 10) {
        clearTimeout(cardLongPressTimerRef.current);
        cardLongPressTimerRef.current = null;
      }
    }
  };
  const onTouchEnd = () => {
    if (cardLongPressTimerRef.current) { clearTimeout(cardLongPressTimerRef.current); cardLongPressTimerRef.current = null; }
    cardTouchStartPosRef.current = null;
  };

  return (
    <div
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onOpenContextMenu(ptn, e.clientX, e.clientY); }}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}
      className="flex flex-wrap items-center justify-between gap-2 border-b-[2px] border-[#1a1a1a] pb-1.5 select-none"
    >
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        {totalPatternsCount > 1 && (
          <div {...attributes} {...listeners} className="flex items-center justify-center p-1 cursor-grab active:cursor-grabbing text-[#1a1a1a]/60 hover:text-[#1a1a1a] touch-none">
            <GripVertical size={16} />
          </div>
        )}
        <input type="radio" checked={isSelected} onChange={() => onSelectPattern(ptn.id)} className="w-4 h-4 accent-[#1a1a1a] cursor-pointer" />
        {editingPatternId === ptn.id ? (
          <input
            type="text" value={editName} onChange={(e) => setEditName(e.target.value)} onBlur={() => handleSaveName(ptn.id)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(ptn.id); if (e.key === 'Escape') setEditingPatternId(null); }}
            className={`${isVocalContext ? 'w-48 sm:w-60' : 'w-32'} shrink-0 font-cactus font-bold text-sm px-1.5 py-0.5 rounded border border-[#1a1a1a] bg-[#f4ecd8] outline-none text-[#1a1a1a]`}
            autoFocus onFocus={(e) => e.target.select()}
          />
        ) : (
          <span
            className={`${isVocalContext ? 'w-48 sm:w-60' : 'w-32'} shrink-0 truncate font-cactus font-bold text-sm cursor-pointer select-none px-1.5 py-0.5 rounded border border-transparent ${isSelected ? 'text-[#1a1a1a]' : 'text-[#666]'}`}
            onClick={() => onSelectPattern(ptn.id)} onDoubleClick={() => { setEditingPatternId(ptn.id); setEditName(ptn.name || ''); }}
          >
            {ptn.name || `${lang === 'fr' ? 'Motif' : 'Padrão'} ${ptnIdx + 1}`}
          </span>
        )}
        {editingPatternId !== ptn.id && isMobile && (
          <button onClick={(e) => { e.stopPropagation(); setEditingPatternId(ptn.id); setEditName(ptn.name || ''); }} className="text-xs opacity-60 hover:opacity-100 p-1 cursor-pointer flex items-center justify-center">
            <XiloChisel size={10} />
          </button>
        )}
        <span ref={badgeRef} data-active-badge={ptn.id} onClick={() => !isSelected && onSelectPattern(ptn.id)} className={isSelected ? 'bg-[#8b2a1a] text-[#f4ecd8] text-[9px] uppercase px-1.5 py-0.5 cordel-border-sm font-bold flex items-center gap-1 select-none shadow-[1px_1px_0px_#1a1a1a]' : 'text-[#666] text-[9px] uppercase px-1 py-0.5 font-semibold opacity-60 hover:opacity-100 transition-opacity select-none cursor-pointer'}>
          {isSelected ? `► ${lang === 'fr' ? 'ACTIF' : 'ATIVO'}` : (lang === 'fr' ? 'Activer' : 'Ativar')}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); isSoloLoop ? onStopSoloPattern?.() : onPlaySoloPattern?.(ptn.id, 'ensemble'); }}
          className={`p-1 rounded-sm transition-colors ${isSoloLoop ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'text-[#1a1a1a] hover:bg-[#1a1a1a]/10'}`}
          title={isSoloLoop ? (lang === 'fr' ? 'Arrêter la lecture' : 'Parar leitura') : (lang === 'fr' ? 'Écouter ce motif complet en solo' : 'Ouvir padrão em solo')}
        >
          {isSoloLoop ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>
        {!isVocalContext && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleArmPattern(trackId, ptn.id); }}
            className={`px-2 py-0.5 rounded text-[10px] font-bold cordel-border-sm transition-all cursor-pointer select-none flex items-center gap-1 ${armedPatternId === ptn.id ? 'bg-[#e67e22] text-[#1a1a1a] shadow-sm animate-pulse' : 'border border-[#1a1a1a]/40 text-[#1a1a1a]/70 hover:text-[#1a1a1a] bg-transparent'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${armedPatternId === ptn.id ? 'bg-[#8b2a1a]' : 'bg-[#1a1a1a]/40'}`} />
            <span>{armedPatternId === ptn.id ? `● ${lang === 'fr' ? 'ARMÉ' : 'ARMADO'}` : 'ARM'}</span>
          </button>
        )}
        {usage.length === 0 ? (
          <span className="shrink-0 flex items-center gap-1 text-[11px] text-[#1a1a1a]/40 italic select-none">{lang === 'fr' ? 'Non assigné' : 'Não atribuído'}</span>
        ) : (
          <div className="shrink-0 flex items-center gap-1.5 text-xs text-[#1a1a1a]/70 select-none">
            <span className="opacity-60 text-[11px]"></span>
            {usage.map((u, uIdx) => (
              <div key={uIdx} className="flex items-center gap-1">
                <span className="font-bold text-[11px] uppercase tracking-wider">{u.trackName}</span>
                <span className="font-mono text-[11px] font-bold bg-[#1a1a1a]/5 px-1 py-0.5 rounded border border-[#1a1a1a]/20">{formatMeasureRanges(u.measures, lang)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2.5 shrink-0 ml-auto">
        {!isVocalContext && (
          <div className="h-6 px-2 py-0.5 rounded-[2px] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] inline-flex items-center font-cactus font-bold text-[11px] uppercase tabular-nums select-none bg-[#f4ecd8] text-[#1a1a1a]">
            {lang === 'fr' ? 'PROBA' : 'PROB'} : {baseProb}%
          </div>
        )}
        <MetricDivisionSelector steps={ptn.steps} patternId={ptn.id} lang={lang} onChangeSteps={onStepsChange} />
        <button type="button" disabled={totalPatternsCount <= 1} onClick={(e) => { e.stopPropagation(); onDeletePattern(ptn.id); }} className={`w-5 h-5 flex items-center justify-center rounded text-xs font-bold shrink-0 transition-colors ${totalPatternsCount <= 1 ? 'opacity-20 cursor-not-allowed text-[#1a1a1a]' : 'text-[#1a1a1a]/60 hover:text-rose-700 hover:bg-rose-100/50 cursor-pointer'}`}></button>
      </div>
    </div>
  );
});
