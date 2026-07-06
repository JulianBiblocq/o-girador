import React from 'react';
import { TimelineStep } from './TimelineStep';

interface TimelineMeasureProps {
  mIdx: number;
  trackId: number;
  trackIdx: number;
  instrumentIdx: number;
  currentMeasureW: number;
  patternId: number;
  patternIdx: number;
  steps: number;
  beatResolutions?: number[];
  sectionColor: string;
  isSectionStart: boolean;
  isSectionEnd: boolean;
  loopStatus: 'inside-active' | 'outside-active' | 'none';
  isPanningActive: boolean;
  instId: string;
  instType: string;
  lang: string;
  activePatternName: string | null;
  patternsList: Array<{ id: number; name: string; vocalMode?: string }>;
  signalDropdownOpen: number | null;
  onPatternAssignForMeasure: (trackId: number, patternId: number | null, mIdx: number) => void;
  onPatternVariationToggleForMeasure: (trackId: number, patternId: number, mIdx: number, value: boolean) => void;
  measureAllowVariations: boolean;
  variationsCount: number;
  isMacro: boolean;
  isMinZoom: boolean;
  instColors: Record<string, string>;
  instMixerBg: string;
  activePatternActiveSteps?: any[];
  onGridPointerDown: (e: React.PointerEvent) => void;
  onMeasureClick: (mIdx: number, steps: number, clickX: number) => void;
}

const TimelineMeasureComponent: React.FC<TimelineMeasureProps> = ({
  mIdx,
  trackId,
  trackIdx,
  instrumentIdx,
  currentMeasureW,
  patternId,
  patternIdx,
  steps,
  beatResolutions,
  sectionColor,
  isSectionStart,
  isSectionEnd,
  loopStatus,
  isPanningActive,
  instId,
  instType,
  lang,
  activePatternName,
  patternsList,
  signalDropdownOpen,
  onPatternAssignForMeasure,
  onPatternVariationToggleForMeasure,
  measureAllowVariations,
  variationsCount,
  isMacro,
  isMinZoom,
  instColors,
  instMixerBg,
  activePatternActiveSteps,
  onGridPointerDown,
  onMeasureClick,
}) => {

  const handleCellClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanningActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    onMeasureClick(mIdx, steps, clickX);
  };

  const loopBgClass = loopStatus === 'inside-active' 
    ? 'bg-blue-600/[0.03]' 
    : loopStatus === 'outside-active' 
      ? 'bg-black/10 dark:bg-black/30 opacity-70' 
      : '';

  return (
    <div
      className={`h-full cursor-pointer border-r shrink-0 ${
        (mIdx + 1) % 4 === 0
          ? 'border-r-2 border-r-blue-500/40 dark:border-r-blue-400/40 shadow-[1px_0_0_0_rgba(59,130,246,0.15)]'
          : 'border-r-[var(--cordel-border)]/20'
      } ${loopBgClass} ${
        sectionColor ? 'cell-section-tint' : ''
      } ${
        isSectionStart ? 'cell-section-start' : ''
      } ${
        isSectionEnd ? 'cell-section-end' : ''
      }`}
      style={{ 
        width: currentMeasureW, 
        minWidth: currentMeasureW,
        ...({ '--section-color': sectionColor } as React.CSSProperties)
      }}
      onClick={handleCellClick}
    >
      {/* Detailed View */}
      {!isMacro && (
        <div className="cell-detailed w-full h-full relative">
          <div 
            className={`absolute top-1 left-1 z-20 flex items-center gap-1 ${isPanningActive ? 'pointer-events-none opacity-65' : ''}`}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-1 bg-[var(--cordel-bg)]/80 hover:bg-[var(--cordel-bg)]/95 border border-[var(--cordel-border)]/20 hover:border-[var(--cordel-border)]/50 rounded px-1.5 py-px shadow-sm max-w-[125px] relative h-[20px]">
              <span className="text-[10px] font-cactus font-bold tracking-wider uppercase truncate leading-tight select-none pr-2.5">
                {activePatternName || (lang === 'fr' ? 'Silence' : 'Silêncio')}
              </span>
              <span className="text-[7px] opacity-50 absolute right-1 top-1/2 -translate-y-1/2">▼</span>
              
              <select
                value={patternId !== -1 ? String(patternId) : 'silence'}
                onChange={e => {
                  const v = e.target.value;
                  onPatternAssignForMeasure(
                    trackId,
                    v === 'silence' ? null : Number(v),
                    mIdx,
                  );
                }}
                className="absolute inset-0 w-full h-full bg-transparent text-transparent border-none cursor-pointer z-10 appearance-none outline-none"
                title={lang === 'fr' ? 'Choisir un motif' : 'Escolher um padrão'}
              >
                <option value="silence" className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-sans font-bold">
                  {lang === 'fr' ? '— Silence' : '— Silêncio'}
                </option>
                {patternsList.map((p, pidx) => (
                  <option key={p.id} value={String(p.id)} className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-sans font-bold">
                    {p.vocalMode === 'micro' ? '🎙️ ' : ''}{p.name || `${lang === 'fr' ? 'Motif' : 'Padrão'} ${pidx + 1}`}
                  </option>
                ))}
              </select>
            </div>

            {patternId !== -1 && instType !== 'voice' && instId !== 'apito' && variationsCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPatternVariationToggleForMeasure(trackId, patternId, mIdx, !measureAllowVariations);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className={`px-1 py-px rounded text-[10px] border transition-colors flex items-center justify-center h-[20px] ${
                  measureAllowVariations 
                    ? 'bg-[#f1c40f] text-black border-yellow-600 shadow-[0_0_4px_rgba(241,196,15,0.6)]' 
                    : 'bg-[#2a2a2a] text-white/90 border-black/50 hover:bg-[#3a3a3a]'
                }`}
                title={
                  measureAllowVariations 
                    ? (lang === 'fr' ? 'Mode Improvisation activé' : 'Modo Improvisação ativado')
                    : (lang === 'fr' ? 'Mode Strict (sans variation)' : 'Modo Estrito (sem variação)')
                }
              >
                🎲
              </button>
            )}
          </div>

          {patternId !== -1 && instType === 'voice' && (
            <div className="absolute bottom-1.5 right-1.5 bg-[#27ae60] text-white border border-black/20 font-sans font-bold text-[8px] px-1 py-px rounded-sm z-20 pointer-events-none select-none flex items-center gap-0.5 shadow-sm">
              🎙️ MIC
            </div>
          )}

          {patternId === -1 ? (
            <div
              className="w-full h-full opacity-15"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, var(--cordel-text) 0, var(--cordel-text) 1px, transparent 0, transparent 50%)',
                backgroundSize: '10px 10px',
              }}
            />
          ) : (
            <div 
              className="flex h-full w-full"
              onPointerDown={onGridPointerDown}
              onClick={(e) => e.stopPropagation()}
            >
              {Array.from({ length: steps }).map((_, sIdx) => (
                <TimelineStep
                  key={sIdx}
                  trackId={trackId}
                  patternId={patternId}
                  measureIdx={mIdx}
                  stepIdx={sIdx}
                  stepsCount={steps}
                  trackIdx={trackIdx}
                  patternIdx={patternIdx}
                  instrumentIdx={instrumentIdx}
                  beatResolutions={beatResolutions}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Macro View */}
      {isMacro && (
        <div className="cell-macro w-full h-full p-1">
          {patternId === -1 ? (
            <div
              className="w-full h-full opacity-[0.05] border border-dashed border-[var(--cordel-border)]/30 rounded"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, var(--cordel-text) 0, var(--cordel-text) 1px, transparent 0, transparent 50%)',
                backgroundSize: '8px 8px',
              }}
            />
          ) : (
            <div
              className={`macro-pattern-block w-full h-full flex ${
                isMinZoom ? 'flex-row justify-center items-center p-1' : 'flex-col justify-between p-1.5'
              } border rounded-sm transition-all`}
              style={{
                backgroundColor: `${instMixerBg}cc`,
                borderColor: `${instColors['D'] || instColors['E'] || 'var(--cordel-border)'}40`,
                borderLeftWidth: '3px',
                borderLeftColor: instColors['D'] || instColors['E'] || 'var(--cordel-border)',
              }}
              title={`${activePatternName || (lang === 'fr' ? 'Motif' : 'Padrão')} (${instColors['text']})`}
            >
              {!isMinZoom && (
                <span className="font-cactus text-[9px] font-bold truncate tracking-wider uppercase text-[var(--cordel-text)] leading-none">
                  {activePatternName}
                </span>
              )}

              <div className="flex items-center opacity-90 overflow-hidden w-full h-full pb-0.5">
                {isMinZoom ? (
                  <div className="flex flex-wrap gap-[2px] justify-center w-full">
                    {activePatternActiveSteps?.map((val: any, sIdx: number) => {
                      const isActive = val !== 0 && val !== '';
                      if (!isActive) return null;
                      const bg = instColors[val as string] || '#111';
                      return (
                        <span
                          key={sIdx}
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: bg }}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const TimelineMeasure = React.memo(TimelineMeasureComponent, (prev, next) => {
  return prev.mIdx === next.mIdx &&
         prev.trackId === next.trackId &&
         prev.trackIdx === next.trackIdx &&
         prev.instrumentIdx === next.instrumentIdx &&
         prev.currentMeasureW === next.currentMeasureW &&
         prev.patternId === next.patternId &&
         prev.patternIdx === next.patternIdx &&
         prev.steps === next.steps &&
         prev.sectionColor === next.sectionColor &&
         prev.isSectionStart === next.isSectionStart &&
         prev.isSectionEnd === next.isSectionEnd &&
         prev.loopStatus === next.loopStatus &&
         prev.isPanningActive === next.isPanningActive &&
         prev.lang === next.lang &&
         prev.activePatternName === next.activePatternName &&
         prev.measureAllowVariations === next.measureAllowVariations &&
         prev.signalDropdownOpen === next.signalDropdownOpen &&
         prev.isMacro === next.isMacro &&
         prev.isMinZoom === next.isMinZoom &&
         prev.activePatternActiveSteps === next.activePatternActiveSteps;
});
