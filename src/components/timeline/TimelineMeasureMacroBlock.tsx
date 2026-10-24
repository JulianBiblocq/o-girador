import React from 'react';
import { Link, ChevronDown } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getToadaDualWaveStyle } from './TimelineMeasureToadaDualWave';

interface TimelineMeasureMacroBlockProps {
  trackId: number; mIdx: number; patternId: number; spanMeasures: number; relativeIdx: number;
  isToada?: boolean; isToadaComposite?: boolean; toadaVocalBadges?: { pPtnName?: string; cPtnName?: string };
  isSelectedCell: boolean; isMinZoom: boolean; isPanningActive: boolean;
  instColors: Record<string, string>; instMixerBg: string; activePatternName: string | null;
  activePatternActiveSteps?: any[]; patternsList: Array<{ id: number; name: string; vocalMode?: string }>;
  lang: string;
  onPatternAssignForMeasure: (trackId: number, patternId: number | null | undefined, mIdx: number) => void;
  onOpenPatternPicker?: (trackId: number, measureIdx: number, rect: DOMRect) => void;
}

export const TimelineMeasureMacroBlock: React.FC<TimelineMeasureMacroBlockProps> = ({
  trackId, mIdx, patternId, spanMeasures, relativeIdx, isToada, isToadaComposite, toadaVocalBadges,
  isSelectedCell, isMinZoom, isPanningActive, instColors, instMixerBg, activePatternName,
  activePatternActiveSteps, patternsList, lang, onPatternAssignForMeasure, onOpenPatternPicker,
}) => {
  const handleAssign = (val: string) => {
    useSequencerStore.getState().setActiveTimelineCell({ trackId, measureIdx: mIdx });
    onPatternAssignForMeasure(trackId, val === 'silence' ? null : Number(val), mIdx);
  };

  const renderSelect = () => !isToada && !isMinZoom && (
    <select
      value={patternId !== -1 ? String(patternId) : 'silence'}
      onFocus={() => useSequencerStore.getState().setActiveTimelineCell({ trackId, measureIdx: mIdx })}
      onChange={(e) => handleAssign(e.target.value)}
      onDoubleClick={(e) => {
        e.preventDefault(); e.stopPropagation();
        if (isPanningActive || isToada) return;
        onOpenPatternPicker?.(trackId, mIdx, (e.currentTarget.closest('.macro-pattern-block') || e.currentTarget).getBoundingClientRect());
      }}
      className="absolute right-0 top-0 bottom-0 w-6 bg-transparent text-transparent border-none cursor-pointer z-10 appearance-none outline-none"
      title={lang === 'fr' ? 'Choisir un motif' : 'Escolher um padrão'}
    >
      <option value="silence" className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-sans font-bold">{lang === 'fr' ? '— Silence' : '— Silêncio'}</option>
      {patternsList.map((p, pidx) => (
        <option key={p.id} value={String(p.id)} className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-sans font-bold">{p.vocalMode === 'micro' ? '[MIC] ' : ''}{p.name || `${lang === 'fr' ? 'Motif' : 'Padrão'} ${pidx + 1}`}</option>
      ))}
    </select>
  );

  if (patternId === -1) {
    return (
      <div className="relative w-full h-full group">
        <div className="w-full h-full opacity-[0.05] group-hover:opacity-10 border border-dashed border-[var(--cordel-border)]/30 rounded transition-opacity" style={{ backgroundImage: 'repeating-linear-gradient(45deg, var(--cordel-text) 0, var(--cordel-text) 1px, transparent 0, transparent 50%)', backgroundSize: '8px 8px' }} />
        {renderSelect()}
      </div>
    );
  }

  const borderCol = instColors?.['D'] || instColors?.['E'] || 'var(--cordel-border)';
  const blockStyle = isToada
    ? getToadaDualWaveStyle(isToadaComposite, toadaVocalBadges)
    : {
        backgroundColor: `${instMixerBg || '#1a1a1a'}cc`,
        borderColor: `${borderCol}40`,
        borderLeftWidth: relativeIdx > 0 ? '1px' : '3px',
        borderLeftStyle: relativeIdx > 0 ? ('dashed' as const) : ('solid' as const),
        borderLeftColor: relativeIdx > 0 ? `${borderCol}60` : borderCol,
      };

  return (
    <div
      className={`macro-pattern-block w-full h-full flex ${isMinZoom ? 'flex-row justify-center items-center p-1' : 'flex-col justify-center p-1.5'} border rounded-sm transition-all relative overflow-hidden ${isSelectedCell ? 'ring-2 ring-inset ring-[#8b2a1a] !border-[#8b2a1a] shadow-[0_0_8px_rgba(139,42,26,0.3)]' : ''}`}
      onDoubleClick={(e) => { e.stopPropagation(); if (isPanningActive || isToada) return; onOpenPatternPicker?.(trackId, mIdx, e.currentTarget.getBoundingClientRect()); }}
      style={blockStyle}
    >
      {!isMinZoom && (
        <>
          {toadaVocalBadges ? (
            <div className="flex items-center gap-1 overflow-hidden truncate max-w-full whitespace-nowrap">
              {toadaVocalBadges.pPtnName && (
                <span className="font-cactus text-[8px] font-bold text-[#8b2a1a] dark:text-[#f39c12] truncate max-w-[48px] flex items-center gap-0.5">
                  <span>[P]</span>{relativeIdx > 0 ? <span className="flex items-center gap-0.5"><Link size={9} className="opacity-70" /><span>[{relativeIdx + 1}/{spanMeasures}]</span></span> : <span className="truncate">{toadaVocalBadges.pPtnName}</span>}
                </span>
              )}
              {toadaVocalBadges.pPtnName && toadaVocalBadges.cPtnName && <span className="text-[7px] text-[var(--cordel-text)]/50 shrink-0 select-none">·</span>}
              {toadaVocalBadges.cPtnName && (
                <span className="font-cactus text-[8px] font-bold text-[#00838f] dark:text-[#4dd0e1] truncate max-w-[48px] flex items-center gap-0.5">
                  <span>[C]</span>{relativeIdx > 0 ? <span className="flex items-center gap-0.5"><Link size={9} className="opacity-70" /><span>[{relativeIdx + 1}/{spanMeasures}]</span></span> : <span className="truncate">{toadaVocalBadges.cPtnName}</span>}
                </span>
              )}
            </div>
          ) : (
            <span className="font-cactus text-[9px] font-bold truncate tracking-wider uppercase text-[var(--cordel-text)] pr-3 flex items-center gap-0.5">
              {relativeIdx > 0 && <Link size={9} className="opacity-70" />}
              <span>{relativeIdx > 0 ? `[${relativeIdx + 1}/${spanMeasures}]` : activePatternName}</span>
            </span>
          )}
          {!isToada && <span className="opacity-40 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center"><ChevronDown size={8} /></span>}
          {renderSelect()}
        </>
      )}
      {isMinZoom && (
        <div className="flex items-center opacity-90 overflow-hidden w-full h-full pb-0.5">
          <div className="flex flex-wrap gap-[2px] justify-center w-full">
            {activePatternActiveSteps?.map((val: any, sIdx: number) => {
              if (val === 0 || val === '') return null;
              return <span key={sIdx} className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: instColors?.[val as string] || '#111' }} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
};
