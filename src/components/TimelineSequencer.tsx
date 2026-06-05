/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { TrackGroup, Language } from '../types';
import { ASSETS_BASE_URL, instrumentsConfig } from '../data';

interface TimelineSequencerProps {
  lang: Language;
  tracks: TrackGroup[];
  isPlaying: boolean;
  currentStepIndex: number;
  currentMeasure: number;
  maxTicks: number;
  totalMeasures: number;
  isMobile: boolean;
  onStepValueChange: (trackId: number, patternId: number, stepIdx: number, val: string) => void;
  onMuteToggle: (trackId: number) => void;
  onSoloToggle: (trackId: number) => void;
}

const MEASURE_WIDTH = 480; // 480px width per measure is divisible by 4, 8, 12, 16, 24, 32

/* ── Cycle step values helper on mobile ────────────────────────── */
function getNextStepValue(instId: string, instType: string, currentVal: string | number): string | number {
  const norm = typeof currentVal === 'string' ? currentVal.trim() : currentVal;
  
  if (instId === 'mineiro') {
    if (norm === 0 || norm === '0' || !norm) return 'p';
    if (norm === 'p') return 'P';
    if (norm === 'P') return 't';
    if (norm === 't') return 'T';
    return 0;
  }
  if (instId === 'agbe') {
    if (norm === 0 || norm === '0' || !norm) return 'g';
    if (norm === 'g') return 'G';
    if (norm === 'G') return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'D') return 'b';
    if (norm === 'b') return 's';
    return 0;
  }
  if (instType === 'gongue') {
    if (norm === 0 || norm === '0' || !norm) return 'grv';
    if (norm === 'grv') return 'GRV';
    if (norm === 'GRV') return 'aig';
    if (norm === 'aig') return 'AIG';
    if (norm === 'AIG') return 'b';
    return 0;
  }
  if (instId === 'caixa') {
    if (norm === 0 || norm === '0' || !norm) return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'D') return 'g';
    if (norm === 'g') return 'G';
    if (norm === 'G') return 'rd';
    if (norm === 'rd') return 'rg';
    if (norm === 'rg') return 'x';
    if (norm === 'x') return 'f';
    if (norm === 'f') return 'b';
    return 0;
  }
  if (instId === 'marcante' || instId === 'meiao' || instId === 'repique') {
    if (norm === 0 || norm === '0' || !norm) return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'D') return 'g';
    if (norm === 'g') return 'G';
    if (norm === 'G') return 'b';
    if (norm === 'b') return 'x';
    if (norm === 'x') return 'i';
    return 0;
  }
  // default
  if (norm === 0 || norm === '0' || !norm) return 'd';
  if (norm === 'd') return 'D';
  if (norm === 'D') return 'g';
  if (norm === 'g') return 'G';
  return 0;
}

function getDisplayVal(val: string | number) {
  if (val === 0 || val === '0' || !val) return '';
  return String(val);
}

export const TimelineSequencer: React.FC<TimelineSequencerProps> = ({
  lang,
  tracks,
  isPlaying,
  currentStepIndex,
  currentMeasure,
  maxTicks,
  totalMeasures,
  isMobile,
  onStepValueChange,
  onMuteToggle,
  onSoloToggle,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const maxTicksVal = maxTicks || 96;
  
  // Calculate horizontal position of playhead
  const currentTickPos = currentStepIndex >= 0 ? currentStepIndex : 0;
  const playheadX = currentMeasure * MEASURE_WIDTH + (currentTickPos / maxTicksVal) * MEASURE_WIDTH;

  // Auto-scroll timeline to keep playhead aligned at 40% of the viewport width
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    if (!isPlaying || currentStepIndex < 0) {
      if (currentStepIndex === -1) {
        el.scrollLeft = 0;
      }
      return;
    }

    const viewportWidth = el.clientWidth - 180; // excluding the sticky left track header (180px)
    if (viewportWidth <= 0) return;

    const playheadOffset = viewportWidth * 0.4; // Fixed playhead at 40% of viewport width
    const targetScrollLeft = playheadX - playheadOffset;

    el.scrollLeft = Math.max(0, targetScrollLeft);
  }, [currentStepIndex, currentMeasure, isPlaying, playheadX]);

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full h-full overflow-hidden bg-[var(--cordel-bg)] text-[var(--cordel-text)] select-none">
      <div 
        ref={scrollContainerRef}
        className="flex-grow flex flex-col overflow-x-auto overflow-y-auto relative custom-scrollbar"
      >
        {/* Ruler Row */}
        <div className="flex h-10 border-b-2 border-[var(--cordel-border)] sticky top-0 z-30 bg-[var(--cordel-bg)] shrink-0">
          {/* Sticky top-left corner */}
          <div className="w-[180px] shrink-0 sticky left-0 z-40 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex items-center px-3 font-cactus text-sm font-bold uppercase">
            {lang === 'fr' ? 'Instruments' : 'Instrumentos'}
          </div>
          {/* Horizontal Ruler markings */}
          <div className="flex relative h-full" style={{ width: `${totalMeasures * MEASURE_WIDTH}px` }}>
            {Array.from({ length: totalMeasures }).map((_, mIdx) => (
              <div
                key={mIdx}
                className="absolute top-0 bottom-0 border-r border-[var(--cordel-border)]/30 flex flex-col justify-between px-2 py-0.5 text-[10px] font-bold"
                style={{
                  left: `${mIdx * MEASURE_WIDTH}px`,
                  width: `${MEASURE_WIDTH}px`,
                }}
              >
                <span className="font-cactus text-xs tracking-wide">
                  {lang === 'fr' ? 'Mesure' : 'Compasso'} {mIdx + 1}
                </span>
                <div className="flex justify-between opacity-50 select-none text-[8px] px-1 pb-0.5">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tracks Rows */}
        <div className="flex flex-col relative" style={{ minWidth: `${180 + totalMeasures * MEASURE_WIDTH}px` }}>
          {tracks.map((track) => {
            const inst = instrumentsConfig[track.instrumentIdx];
            const hasSolo = tracks.some(t => t.isSolo);
            const isMutedBySolo = hasSolo && !track.isSolo;
            const canPlay = !track.isMute && !isMutedBySolo;

            return (
              <div 
                key={track.id} 
                className={`flex border-b border-[var(--cordel-border)]/20 hover:bg-[var(--cordel-border)]/5 group/row shrink-0 h-12 transition-opacity duration-150 ${
                  !canPlay ? 'opacity-50' : ''
                }`}
              >
                {/* Sticky Track Header */}
                <div className="w-[180px] shrink-0 sticky left-0 z-20 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex items-center justify-between px-3 py-1 box-border shadow-[2px_0_5px_rgba(0,0,0,0.15)]">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={`${ASSETS_BASE_URL}${inst.iconImg}`}
                      alt={inst.name}
                      className="w-6 h-6 object-contain filter invert-[var(--cordel-invert)] dark:invert-0"
                    />
                    <span className="font-cactus text-xs font-bold truncate text-[var(--cordel-text)] tracking-wider">
                      {inst.name}
                    </span>
                  </div>
                  
                  {/* Mute/Solo buttons */}
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => onMuteToggle(track.id)}
                      className={`w-5 h-5 flex items-center justify-center text-[9px] font-bold cordel-border-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors ${
                        track.isMute
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-transparent text-[var(--cordel-text)]'
                      }`}
                      title="Mute"
                    >
                      M
                    </button>
                    <button
                      onClick={() => onSoloToggle(track.id)}
                      className={`w-5 h-5 flex items-center justify-center text-[9px] font-bold cordel-border-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors ${
                        track.isSolo
                          ? 'bg-amber-500 text-black border-amber-500'
                          : 'bg-transparent text-[var(--cordel-text)]'
                      }`}
                      title="Solo"
                    >
                      S
                    </button>
                  </div>
                </div>

                {/* Steps Horizontal Row */}
                <div className="flex relative h-full">
                  {Array.from({ length: totalMeasures }).map((_, mIdx) => {
                    const activePattern = track.patterns.find(p => p.measureAssignments[mIdx]);
                    const steps = activePattern ? activePattern.steps : (track.patterns[0]?.steps || 16);
                    
                    return (
                      <div
                        key={mIdx}
                        className="absolute top-0 bottom-0 border-r-2 border-[var(--cordel-border)]/20 flex bg-[#ece4d0]/5 relative"
                        style={{
                          left: `${mIdx * MEASURE_WIDTH}px`,
                          width: `${MEASURE_WIDTH}px`,
                        }}
                      >
                        {activePattern && (
                          <div className="absolute top-0.5 left-1 px-1.5 py-0.5 bg-[var(--cordel-bg)]/90 text-[var(--cordel-text)] text-[7px] font-extrabold border border-[var(--cordel-border)]/35 rounded-sm pointer-events-none select-none z-10 tracking-wider uppercase leading-none">
                            {activePattern.name}
                          </div>
                        )}
                        {!activePattern ? (
                          /* Non-assigned silence indicator style */
                          <div 
                            className="w-full h-full opacity-20 flex items-center justify-center select-none"
                            style={{
                              backgroundImage: 'repeating-linear-gradient(45deg, var(--cordel-text) 0, var(--cordel-text) 1px, transparent 0, transparent 50%)',
                              backgroundSize: '10px 10px',
                            }}
                          >
                            <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">
                              {lang === 'fr' ? 'Silence' : 'Silêncio'}
                            </span>
                          </div>
                        ) : (
                          /* Active Steps */
                          Array.from({ length: steps }).map((_, stepIdx) => {
                            const val = activePattern.activeSteps[stepIdx];
                            const displayVal = getDisplayVal(val);
                            const isActive = val !== 0 && val !== '';
                            
                            const isCurrentStep = isPlaying && 
                              currentMeasure === mIdx && 
                              Math.floor((currentTickPos / maxTicksVal) * steps) === stepIdx;

                            let colorStyle: React.CSSProperties = {};
                            if (isActive) {
                              const bgColor = inst.colors[val as string] || '#111';
                              let txtColor = inst.colors.text || '#f4ecd8';
                              if (inst.id === 'gongue' && (val === 'AIG' || val === 'aig')) {
                                txtColor = '#000';
                              }
                              colorStyle = {
                                backgroundColor: bgColor,
                                borderColor: bgColor,
                                color: txtColor,
                              };
                            }

                            return (
                              <div
                                key={stepIdx}
                                onClick={() => {
                                  const nextVal = getNextStepValue(inst.id, inst.type, val);
                                  onStepValueChange(track.id, activePattern.id, stepIdx, String(nextVal));
                                }}
                                className={`h-full border-r border-[var(--cordel-border)]/10 flex flex-col items-center justify-center cursor-pointer select-none transition-all ${
                                  isCurrentStep
                                    ? 'bg-[var(--cordel-text)]/20 shadow-[inset_0_0_8px_rgba(139,42,26,0.35)] outline-2 outline-amber-600 z-10'
                                    : ''
                                } hover:bg-[var(--cordel-border)]/15`}
                                style={{
                                  width: `${MEASURE_WIDTH / steps}px`,
                                  ...colorStyle,
                                }}
                              >
                                {inst.type === 'voice' ? (
                                  <div className="flex flex-col items-center justify-center leading-none text-center px-0.5 overflow-hidden w-full h-full">
                                    <span className="text-[7px] font-bold uppercase tracking-wider opacity-75">
                                      {val === 'P' ? 'PUX' : val === 'C' ? 'CORO' : ''}
                                    </span>
                                    <span className="text-[9px] font-cactus font-bold truncate max-w-full leading-tight">
                                      {activePattern.lyrics?.[stepIdx] || ''}
                                    </span>
                                    {activePattern.notes?.[stepIdx] && (
                                      <span className="text-[7px] font-bold opacity-60 leading-none mt-0.5">
                                        {activePattern.notes[stepIdx]}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-extrabold tracking-wide">
                                    {displayVal}
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Red Playhead line overlay */}
          {isPlaying && currentStepIndex >= 0 && (
            <div
              className="absolute top-0 bottom-0 border-l-2 border-red-600 pointer-events-none z-30 shadow-[0_0_10px_rgba(220,38,38,0.7)]"
              style={{
                left: `${180 + playheadX}px`, // 180px left offset to account for the track header column width
              }}
            />
          )}
        </div>
      </div>
      
      {/* Legend guide bar at bottom (only desktop) */}
      {!isMobile && (
        <div className="h-8 border-t border-[var(--cordel-border)] flex items-center justify-center px-4 bg-[var(--cordel-bg)] text-[10px] font-bold opacity-80 uppercase tracking-widest gap-4 shrink-0">
          <span>💡 {lang === 'fr' ? 'Clic gauche pour modifier cycliquement les pas' : 'Clique esquerdo para modificar ciclicamente os passos'}</span>
        </div>
      )}
    </div>
  );
};
