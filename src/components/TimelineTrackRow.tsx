import React, { useContext } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudio } from '../contexts/AudioContext';
import { instrumentsConfig, isDarkText, ASSETS_BASE_URL, getMaxTicks } from '../data';
import { CompactPatternRenderer } from './CompactPatternRenderer';
import { TimelineUIContext } from '../contexts/TimelineUIContext';

interface TimelineTrackRowProps {
  trackId: number;
}

function getDisplayVal(val: string | number) {
  if (val === 0 || val === '0' || !val) return '';
  return String(val);
}

const TimelineTrackRowComponent: React.FC<TimelineTrackRowProps> = ({ trackId }) => {
  // 1. Contextes UI (injectés par TimelineSequencer pour éviter les props)
  const uiContext = useContext(TimelineUIContext);
  const [editingMeasureIdx, setEditingMeasureIdx] = React.useState<number | null>(null);

  // 2. Audio Context (Supprimé pour préserver le React.memo)

  // 3. Zustand Selectors (Granulaires)
  const track = useSequencerStore(state => state.tracks.find(t => t.id === trackId));
  const trackIndex = useSequencerStore(state => state.tracks.findIndex(t => t.id === trackId));
  const hasSolo = useSequencerStore(state => state.tracks.some(t => t.isSolo));
  
  const totalMeasures = useSequencerStore(state => state.totalMeasures);
  const songSections = useSequencerStore(state => state.songSections);
  const measureTimeSigs = useSequencerStore(state => state.measureTimeSigs);
  const loopStartMeasure = useSequencerStore(state => state.loopStartMeasure);
  const loopEndMeasure = useSequencerStore(state => state.loopEndMeasure);
  const isLoopRegionActive = useSequencerStore(state => state.isLoopRegionActive);

  // Actions Zustand
  const onMuteToggle = useSequencerStore(state => state.handleTrackMuteToggle);
  const onSoloToggle = useSequencerStore(state => state.handleTrackSoloToggle);
  const onPatternAssignForMeasure = useSequencerStore(state => state.handleTimelinePatternAssign);
  const onPatternVariationToggleForMeasure = useSequencerStore(state => state.handleTimelinePatternVariationToggle);

  if (!uiContext) return null;
  const { MEASURE_W, HEADER_W, totalContentW, isMobile, isMacro, isMinZoom, isPanningActive, lang } = uiContext;

  if (!track) return null;

  const inst = instrumentsConfig[track.instrumentIdx];
  if (!inst) return null;
  const isMutedBySolo = hasSolo && !track.isSolo;
  const canPlay = track.isSolo || (!track.isMute && !isMutedBySolo);

  return (
    <div
      className={`flex border-b border-[var(--cordel-border)]/20 h-12 transition-opacity duration-150 ${
        !canPlay ? 'opacity-50' : ''
      }`}
      style={{ 
        width: `${HEADER_W + totalContentW}px`,
        contain: 'strict',
      }}
    >
      {/* ── Sticky track header ── */}
      <div
        className={`sticky left-0 z-35 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex items-center justify-between py-1 shadow-[2px_0_5px_rgba(0,0,0,0.15)] ${
          isMobile ? 'px-1' : 'px-3'
        }`}
        style={{ width: HEADER_W, minWidth: HEADER_W }}
      >
        <div className={`flex items-center min-w-0 flex-grow ${isMobile ? 'gap-0.5' : 'gap-2'}`}>
          {isMobile ? (
            <span className="font-mono text-[10px] text-[var(--cordel-text)]/60 shrink-0">
              #{trackIndex + 1}
            </span>
          ) : null}
          <img
            src={`${ASSETS_BASE_URL}${inst.iconImg}`}
            alt={inst.name}
            className={`track-header-icon object-contain filter invert-[var(--cordel-invert)] dark:invert-0 shrink-0 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`}
          />
          {!isMobile ? (
            <span className="track-header-name font-cactus text-sm font-bold truncate text-[var(--cordel-text)] tracking-wider">
              {inst.name}
            </span>
          ) : null}
        </div>
        <div className={`track-header-controls flex shrink-0 ${isMobile || isMacro ? 'flex-col gap-0.5' : 'flex-row gap-1'}`}>
          <button
            onClick={() => onMuteToggle(track.id)}
            className={`flex items-center justify-center font-bold cordel-border-sm cursor-pointer transition-colors ${
              isMobile ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[11px]'
            } ${
              (track.isMute && !track.isSolo) ? 'bg-red-600 text-white border-red-600' : 'bg-transparent text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
            }`}
            title="Mute"
          >M</button>
          <button
            onClick={() => onSoloToggle(track.id)}
            className={`flex items-center justify-center font-bold cordel-border-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors ${
              isMobile ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[11px]'
            } ${
              track.isSolo ? 'bg-amber-500 text-black border-amber-500' : 'bg-transparent text-[var(--cordel-text)]'
            }`}
            title="Solo"
          >S</button>
        </div>
      </div>

      {/* ── Measure cells ── */}
      {Array.from({ length: totalMeasures }).map((_, mIdx) => {
        const activePattern = track.patterns.find(p => p.measureAssignments[mIdx]);
        const steps = activePattern ? activePattern.steps : 16;

        // Find if there is a section covering this measure
        const measureSection = songSections.find(s => mIdx >= s.startMeasure && mIdx <= s.endMeasure);
        const isSectionStart = measureSection && mIdx === measureSection.startMeasure;
        const isSectionEnd = measureSection && mIdx === measureSection.endMeasure;
        const sectionColor = measureSection?.color || '';

        return (
          <div
            key={mIdx}
            className={`h-full relative cursor-pointer border-r ${
              (mIdx + 1) % 4 === 0
                ? 'border-r-2 border-r-blue-500/40 dark:border-r-blue-400/40 shadow-[1px_0_0_0_rgba(59,130,246,0.15)]'
                : 'border-r-[var(--cordel-border)]/20'
            } ${
              loopStartMeasure !== null && loopEndMeasure !== null
                ? (mIdx >= loopStartMeasure && mIdx <= loopEndMeasure ? (isLoopRegionActive ? 'bg-blue-600/[0.03]' : '') : (isLoopRegionActive ? 'bg-black/10 dark:bg-black/30 opacity-70' : ''))
                : ''
            } ${
              measureSection ? 'cell-section-tint' : ''
            } ${
              isSectionStart ? 'cell-section-start' : ''
            } ${
              isSectionEnd ? 'cell-section-end' : ''
            }`}
            style={{ 
              width: MEASURE_W, 
              minWidth: MEASURE_W,
              ...({ '--section-color': sectionColor } as React.CSSProperties)
            }}
            onClick={(e) => {
              if (isPanningActive) return; // Prevent navigations when panning
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, clickX / MEASURE_W));
              const stepIdx = Math.floor(ratio * steps);
              window.dispatchEvent(
                new CustomEvent('o-girador-timeline-nav', {
                  detail: { mIdx, sIdx: stepIdx }
                })
              );
            }}
          >
            {/* Cell content (Detailed View) */}
            {!isMacro && (
              <div className="cell-detailed w-full h-full relative">
              {/* Pattern selector */}
              {editingMeasureIdx === mIdx ? (
                <div
                  className={`absolute top-1 left-1 z-20 ${isPanningActive ? 'pointer-events-none opacity-65' : ''}`}
                  onClick={e => e.stopPropagation()}
                  onMouseDown={e => e.stopPropagation()}
                  onTouchStart={e => e.stopPropagation()}
                >
                  <select
                    value={activePattern ? String(activePattern.id) : 'silence'}
                    autoFocus
                    onChange={e => {
                      const v = e.target.value;
                      onPatternAssignForMeasure(
                        track.id,
                        v === 'silence' ? null : Number(v),
                        mIdx,
                      );
                      setEditingMeasureIdx(null);
                    }}
                    onBlur={() => setEditingMeasureIdx(null)}
                    className="bg-[var(--cordel-bg)]/95 text-[var(--cordel-text)] text-[10px] font-cactus font-bold border border-[var(--cordel-border)]/50 rounded px-1 py-px outline-none cursor-pointer tracking-wider uppercase max-w-[125px] leading-tight"
                    style={{ fontSize: '10px', height: '22px' }}
                  >
                    <option value="silence">
                      {lang === 'fr' ? '— Silence' : '— Silêncio'}
                    </option>
                    {track.patterns.map((p, pidx) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.vocalMode === 'micro' ? '🎙️ ' : ''}{p.name || `${lang === 'fr' ? 'Motif' : 'Padrão'} ${pidx + 1}`}
                      </option>
                    ))}
                  </select>
                  
                  {/* Dice Toggle for Variations */}
                  {activePattern && inst.type !== 'voice' && inst.id !== 'apito' && (activePattern.variations?.length || 0) > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const isAllowed = activePattern.measureAllowVariations?.[mIdx] || false;
                        onPatternVariationToggleForMeasure(track.id, activePattern.id, mIdx, !isAllowed);
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className={`ml-1 px-1 py-0.5 rounded text-[10px] border transition-colors ${
                        activePattern.measureAllowVariations?.[mIdx] 
                          ? 'bg-[#f1c40f] text-black border-yellow-600 shadow-[0_0_4px_rgba(241,196,15,0.6)]' 
                          : 'bg-[#2a2a2a] text-white/90 border-black/50 hover:bg-[#3a3a3a] shadow-sm'
                      }`}
                      title={
                        activePattern.measureAllowVariations?.[mIdx] 
                          ? (lang === 'fr' ? 'Mode Improvisation activé' : 'Modo Improvisação ativado')
                          : (lang === 'fr' ? 'Mode Strict (sans variation)' : 'Modo Estrito (sem variação)')
                      }
                    >
                      🎲
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className="absolute top-1 left-1 z-20 flex items-center gap-1 cursor-pointer bg-[var(--cordel-bg)]/80 hover:bg-[var(--cordel-bg)]/95 border border-[var(--cordel-border)]/20 hover:border-[var(--cordel-border)]/50 rounded px-1.5 py-px shadow-sm max-w-[125px]"
                  onClick={e => {
                    e.stopPropagation();
                    setEditingMeasureIdx(mIdx);
                  }}
                >
                  <span className="text-[10px] font-cactus font-bold tracking-wider uppercase truncate leading-tight select-none">
                    {activePattern ? (activePattern.name || `${lang === 'fr' ? 'Motif' : 'Padrão'}`) : (lang === 'fr' ? 'Silence' : 'Silêncio')}
                  </span>
                  {activePattern && inst.type !== 'voice' && inst.id !== 'apito' && (activePattern.variations?.length || 0) > 0 && (
                    <span className={`text-[9px] ${activePattern.measureAllowVariations?.[mIdx] ? 'text-yellow-600' : 'text-[var(--cordel-text)]/40'}`}>
                      🎲
                    </span>
                  )}
                </div>
              )}

              {activePattern && activePattern.vocalMode === 'micro' && (
                <div className="absolute bottom-1.5 right-1.5 bg-[#27ae60] text-white border border-black/20 font-sans font-bold text-[8px] px-1 py-px rounded-sm z-20 pointer-events-none select-none flex items-center gap-0.5 shadow-sm">
                  🎙️ MIC
                </div>
              )}

              {!activePattern ? (
                /* Silence hatching */
                <div
                  className="w-full h-full opacity-15"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(45deg, var(--cordel-text) 0, var(--cordel-text) 1px, transparent 0, transparent 50%)',
                    backgroundSize: '10px 10px',
                  }}
                />
              ) : (
                /* Steps grid */
                <div className="flex h-full w-full">
                  {Array.from({ length: steps }).map((_, sIdx) => {
                    const val = activePattern.activeSteps[sIdx];
                    const display = getDisplayVal(val);
                    const isActive = val !== 0 && val !== '';
                    const timeSigStr = measureTimeSigs[mIdx] || '4/4';
                    const mMaxTicks = getMaxTicks(timeSigStr);
                    
                    const defaultBeats = parseInt(timeSigStr.split('/')[0], 10);
                    const beatRes = activePattern.beatResolutions || Array(defaultBeats).fill(Math.floor(steps / defaultBeats) || 4);
                    let stepWidth = MEASURE_W / steps;
                    let accumulated = 0;
                    let accumulatedTicks = 0;
                    const ticksPerBeat = mMaxTicks / defaultBeats;
                    let currentTickIdx = 0;
                    let currentStepRes = 4;
                    for (let b = 0; b < beatRes.length; b++) {
                      if (sIdx >= accumulated && sIdx < accumulated + beatRes[b]) {
                        stepWidth = (MEASURE_W / defaultBeats) / beatRes[b];
                        const stepInBeat = sIdx - accumulated;
                        currentTickIdx = Math.round(accumulatedTicks + stepInBeat * (ticksPerBeat / beatRes[b]));
                        currentStepRes = beatRes[b];
                        break;
                      }
                      accumulated += beatRes[b];
                      accumulatedTicks += ticksPerBeat;
                    }

                    let style: React.CSSProperties = {
                      width: `${stepWidth}px`,
                    };

                    if (isActive) {
                      const bg = inst.colors[val as string] || '#111';
                      let fg = inst.colors.text || '#f4ecd8';
                      if (isDarkText(inst.id, String(val))) {
                        fg = '#1a1a1a';
                      }
                      style = { ...style, backgroundColor: bg, color: fg };
                    }

                    return (
                      <div
                        key={sIdx}
                        className="h-full border-r border-[var(--cordel-border)]/10 flex flex-col items-center justify-center text-center"
                        style={style}
                      >
                        {inst.type === 'voice' ? (
                          <div className="flex flex-col items-center justify-center leading-none px-0.5 overflow-hidden w-full h-full">
                            <span className="text-[9px] font-bold uppercase opacity-75">
                              {val === 'P' ? 'PUX' : val === 'C' ? 'CORO' : ''}
                            </span>
                            <span className="text-[11px] font-cactus font-bold truncate max-w-full">
                              {activePattern.lyrics?.[sIdx] || ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[13px] font-extrabold tracking-wide">
                            {display}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            )}

            {/* Cell content (Macro View) */}
            {isMacro && (
              <div className="cell-macro w-full h-full p-1">
              {!activePattern ? (
                /* Faded silence hatched block */
                <div
                  className="w-full h-full opacity-[0.05] border border-dashed border-[var(--cordel-border)]/30 rounded"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(45deg, var(--cordel-text) 0, var(--cordel-text) 1px, transparent 0, transparent 50%)',
                    backgroundSize: '8px 8px',
                  }}
                />
              ) : (
                /* Merged continuous visual block */
                <div
                  className={`macro-pattern-block w-full h-full flex ${
                    isMinZoom ? 'flex-row justify-center items-center p-1' : 'flex-col justify-between p-1.5'
                  } border rounded-sm transition-all`}
                  style={{
                    backgroundColor: `${inst.mixerBg}cc`, // semi-transparent instrument background
                    borderColor: `${inst.colors['D'] || inst.colors['E'] || 'var(--cordel-border)'}40`,
                    borderLeftWidth: '3px',
                    borderLeftColor: inst.colors['D'] || inst.colors['E'] || 'var(--cordel-border)',
                  }}
                  title={`${activePattern.name || (lang === 'fr' ? 'Motif' : 'Padrão')} (${inst.name})`}
                >
                  {/* Pattern Name */}
                  {!isMinZoom && (
                    <span className="font-cactus text-[9px] font-bold truncate tracking-wider uppercase text-[var(--cordel-text)] leading-none">
                      {activePattern.vocalMode === 'micro' ? '🎙️ ' : ''}
                      {activePattern.name || `${lang === 'fr' ? 'Motif' : 'Padrão'}`}
                    </span>
                  )}

                  {/* Mini-beats density dots or Compact geometric shapes */}
                  <div className={`flex items-center opacity-90 overflow-hidden w-full h-full pb-0.5`}>
                    {isMinZoom ? (
                      <div className="flex flex-wrap gap-[2px] justify-center w-full">
                        {activePattern.activeSteps.map((val, sIdx) => {
                          const isActive = val !== 0 && val !== '';
                          if (!isActive) return null;
                          const bg = inst.colors[val as string] || '#111';
                          return (
                            <span
                              key={sIdx}
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: bg }}
                              title={String(val)}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <CompactPatternRenderer
                        pattern={activePattern}
                        inst={inst}
                        isLeftHanded={false}
                        isEditable={false}
                        isFluid={true}
                        className="h-full"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const TimelineTrackRow = React.memo(TimelineTrackRowComponent);
