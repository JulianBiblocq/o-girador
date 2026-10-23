import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';

interface TimelineMeasureHeaderBadgeProps {
  trackId: number; mIdx: number; patternId: number; activePatternName: string | null;
  patternsList: Array<{ id: number; name: string; vocalMode?: string }>;
  spanMeasures: number; relativeIdx: number; isToada?: boolean;
  toadaVocalBadges?: { pPtnName?: string; cPtnName?: string }; isSlave: boolean;
  isFollowingMaster: boolean; isOverridden?: boolean; isSilence?: boolean;
  isSelectedCell: boolean; isPanningActive: boolean; hasChildOverrides?: boolean;
  lang: string; instType: string; instId: string; variationsCount: number;
  measureAllowVariations: boolean;
  onPatternAssignForMeasure: (trackId: number, patternId: number | null | undefined, mIdx: number) => void;
  onPatternVariationToggleForMeasure: (trackId: number, patternId: number, mIdx: number, value: boolean) => void;
}

export const TimelineMeasureHeaderBadge: React.FC<TimelineMeasureHeaderBadgeProps> = ({
  trackId, mIdx, patternId, activePatternName, patternsList, spanMeasures, relativeIdx,
  isToada, toadaVocalBadges, isSlave, isFollowingMaster, isOverridden, isSilence,
  isSelectedCell, isPanningActive, hasChildOverrides, lang, instType, instId,
  variationsCount, measureAllowVariations, onPatternAssignForMeasure, onPatternVariationToggleForMeasure,
}) => {
  if (isToada && patternId === -1) return null;

  const selectVal = isSlave && !isOverridden ? 'follow' : (patternId !== -1 && !isSilence ? String(patternId) : 'silence');
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    useSequencerStore.getState().setActiveTimelineCell({ trackId, measureIdx: mIdx });
    const v = e.target.value;
    onPatternAssignForMeasure(trackId, v === 'follow' ? undefined : (v === 'silence' ? null : Number(v)), mIdx);
  };

  const renderSelect = () => !isToada && (
    <select
      value={selectVal}
      onFocus={() => useSequencerStore.getState().setActiveTimelineCell({ trackId, measureIdx: mIdx })}
      onChange={handleSelectChange}
      className="absolute inset-0 w-full h-full bg-transparent text-transparent border-none cursor-pointer z-10 appearance-none outline-none"
      title={lang === 'fr' ? 'Choisir un motif' : 'Escolher um padrão'}
    >
      {isSlave && <option value="follow" className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-sans font-bold">{lang === 'fr' ? 'Suivre le maître' : 'Seguir mestre'}</option>}
      <option value="silence" className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-sans font-bold">{lang === 'fr' ? '— Silence' : '— Silêncio'}</option>
      {patternsList.map((p, pidx) => (
        <option key={p.id} value={String(p.id)} className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-sans font-bold">
          {p.vocalMode === 'micro' ? '' : ''}{p.name || `${lang === 'fr' ? 'Motif' : 'Padrão'} ${pidx + 1}`}
        </option>
      ))}
    </select>
  );

  return (
    <div
      className={`absolute top-1 left-1 z-20 flex items-center gap-1 ${isPanningActive ? 'pointer-events-none opacity-65' : ''}`}
      onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
    >
      {toadaVocalBadges ? (
        <div className="flex items-center gap-1 max-w-[calc(100%-8px)] overflow-hidden whitespace-nowrap h-[20px]">
          {toadaVocalBadges.pPtnName && (
            <div className={`flex items-center gap-1 bg-[#8b2a1a]/${relativeIdx > 0 ? '15' : '20'} border ${relativeIdx > 0 ? 'border-dashed border-[#8b2a1a]/50' : 'border-[#8b2a1a]'} rounded px-1.5 py-px shadow-sm shrink-0 h-[20px]`} title={`Puxador: ${toadaVocalBadges.pPtnName}${relativeIdx > 0 ? ` [${relativeIdx + 1}/${spanMeasures}]` : ''}`}>
              <span className="text-[9px] font-cactus font-bold text-[#8b2a1a] dark:text-[#f39c12] leading-tight">P</span>
              <span className="text-[8px] font-cactus font-bold text-[var(--cordel-text)] truncate max-w-[60px] leading-tight select-none">{relativeIdx > 0 ? `[${relativeIdx + 1}/${spanMeasures}]` : toadaVocalBadges.pPtnName}</span>
            </div>
          )}
          {toadaVocalBadges.cPtnName && (
            <div className={`flex items-center gap-1 bg-[#00838f]/${relativeIdx > 0 ? '15' : '20'} border ${relativeIdx > 0 ? 'border-dashed border-[#00838f]/50' : 'border-[#00838f]'} rounded px-1.5 py-px shadow-sm shrink-0 h-[20px]`} title={`Coro: ${toadaVocalBadges.cPtnName}${relativeIdx > 0 ? ` [${relativeIdx + 1}/${spanMeasures}]` : ''}`}>
              <span className="text-[9px] font-cactus font-bold text-[#00838f] dark:text-[#4dd0e1] leading-tight">C</span>
              <span className="text-[8px] font-cactus font-bold text-[var(--cordel-text)] truncate max-w-[60px] leading-tight select-none">{relativeIdx > 0 ? `[${relativeIdx + 1}/${spanMeasures}]` : toadaVocalBadges.cPtnName}</span>
            </div>
          )}
        </div>
      ) : relativeIdx > 0 ? (
        <div className={`flex items-center gap-1 ${isSelectedCell ? 'bg-[var(--cordel-bg)] border-2 border-[#8b2a1a] shadow-[0_0_6px_rgba(139,42,26,0.5)]' : 'bg-[var(--cordel-bg)]/80 hover:bg-[var(--cordel-bg)]/95 border border-dashed border-[var(--cordel-border)]/40'} rounded px-1.5 py-px shadow-sm relative h-[20px]`} title={`${activePatternName || ''} [${relativeIdx + 1}/${spanMeasures}]`}>
          <span className="text-[9px] font-cactus font-bold tracking-wider uppercase text-[var(--cordel-text)]/80 leading-tight select-none flex items-center gap-0.5">
            <span className="opacity-60 text-[8px]"></span>
            <span>[{relativeIdx + 1}/${spanMeasures}]</span>
          </span>
          {!isToada && <span className="text-[7px] opacity-40 ml-0.5">▼</span>}
          {renderSelect()}
        </div>
      ) : (
        <div className={`flex items-center gap-1 ${isSelectedCell ? 'bg-[var(--cordel-bg)] border-2 border-[#8b2a1a] shadow-[0_0_6px_rgba(139,42,26,0.5)]' : 'bg-[var(--cordel-bg)]/80 hover:bg-[var(--cordel-bg)]/95 border border-[var(--cordel-border)]/20 hover:border-[var(--cordel-border)]/50'} rounded px-1.5 py-px shadow-sm max-w-[125px] relative h-[20px]`}>
          <span className="text-[10px] font-cactus font-bold tracking-wider uppercase truncate leading-tight select-none pr-2.5">
            {isFollowingMaster && <span className="mr-0.5 opacity-60"></span>}
            {activePatternName || (lang === 'fr' ? 'Silence' : 'Silêncio')}
            {hasChildOverrides && <span className="text-amber-500 ml-1 font-sans" title={lang === 'fr' ? 'Variation individuelle active' : 'Variação individual activa'}></span>}
          </span>
          {!isToada && <span className="text-[7px] opacity-50 absolute right-1 top-1/2 -translate-y-1/2">▼</span>}
          {renderSelect()}
        </div>
      )}

      {!isToada && patternId !== -1 && instType !== 'voice' && instId !== 'apito' && variationsCount > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPatternVariationToggleForMeasure(trackId, patternId, mIdx, !measureAllowVariations); }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className={`px-1 py-px rounded text-[10px] border transition-colors flex items-center justify-center h-[20px] ${measureAllowVariations ? 'bg-[#f1c40f] text-black border-yellow-600 shadow-[0_0_4px_rgba(241,196,15,0.6)]' : 'bg-[#2a2a2a] text-white/90 border-black/50 hover:bg-[#3a3a3a]'}`}
          title={measureAllowVariations ? (lang === 'fr' ? 'Mode Improvisation activé' : 'Modo Improvisação ativado') : (lang === 'fr' ? 'Mode Strict (sans variation)' : 'Modo Estrito (sem variação)')}
        >
          
        </button>
      )}
    </div>
  );
};
