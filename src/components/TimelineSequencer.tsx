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
  onMuteToggle: (trackId: number) => void;
  onSoloToggle: (trackId: number) => void;
  onPatternAssignForMeasure: (trackId: number, patternId: number | null, measureIdx: number) => void;
  onNavigate: (measureIdx: number, stepIdx: number, steps: number) => void;
}

const MEASURE_W = 480;
const HEADER_W = 180;

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
  onMuteToggle,
  onSoloToggle,
  onPatternAssignForMeasure,
  onNavigate,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const maxTicksVal = maxTicks || 96;
  const tickPos = currentStepIndex >= 0 ? currentStepIndex : 0;
  const playheadX = currentMeasure * MEASURE_W + (tickPos / maxTicksVal) * MEASURE_W;

  // Total scrollable content width (excluding sticky header column)
  const totalContentW = totalMeasures * MEASURE_W;

  // Auto-scroll to keep playhead visible
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!isPlaying || currentStepIndex < 0) {
      if (currentStepIndex === -1) el.scrollLeft = 0;
      return;
    }
    const vw = el.clientWidth - HEADER_W;
    if (vw <= 0) return;
    el.scrollLeft = Math.max(0, playheadX - vw * 0.4);
  }, [currentStepIndex, currentMeasure, isPlaying, playheadX]);

  // Determine beats per measure from time signature
  const beatsPerMeasure = maxTicksVal === 72 ? 3 : maxTicksVal === 48 ? 2 : maxTicksVal === 144 ? 12 : 4;

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full h-full overflow-hidden bg-[var(--cordel-bg)] text-[var(--cordel-text)] select-none">
      <div
        ref={scrollRef}
        className="flex-grow overflow-x-auto overflow-y-auto relative custom-scrollbar"
      >
        {/* 
          We use a single wrapper with explicit width so the ruler row and
          every track row share the same coordinate space.
        */}
        <div style={{ width: `${HEADER_W + totalContentW}px`, minHeight: '100%' }} className="relative">

          {/* ══════════ RULER ROW ══════════ */}
          <div
            className="flex h-10 border-b-2 border-[var(--cordel-border)] sticky top-0 z-30 bg-[var(--cordel-bg)]"
            style={{ width: `${HEADER_W + totalContentW}px` }}
          >
            {/* Sticky corner */}
            <div
              className="sticky left-0 z-40 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex items-center px-3 font-cactus text-sm font-bold uppercase"
              style={{ width: HEADER_W, minWidth: HEADER_W }}
            >
              {lang === 'fr' ? 'Instruments' : 'Instrumentos'}
            </div>

            {/* Measure labels */}
            {Array.from({ length: totalMeasures }).map((_, mIdx) => (
              <div
                key={mIdx}
                className="border-r border-[var(--cordel-border)]/30 flex flex-col justify-between px-2 py-0.5 text-[10px] font-bold"
                style={{ width: MEASURE_W, minWidth: MEASURE_W }}
              >
                <span className="font-cactus text-xs tracking-wide">
                  {lang === 'fr' ? 'Mesure' : 'Compasso'} {mIdx + 1}
                </span>
                <div className="flex w-full opacity-50 text-[8px] pb-0.5">
                  {Array.from({ length: beatsPerMeasure }).map((_, b) => (
                    <span
                      key={b}
                      className="text-left pl-1"
                      style={{ width: `${100 / beatsPerMeasure}%` }}
                    >
                      {b + 1}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ══════════ TRACK ROWS ══════════ */}
          {tracks.map((track) => {
            const inst = instrumentsConfig[track.instrumentIdx];
            const hasSolo = tracks.some(t => t.isSolo);
            const isMutedBySolo = hasSolo && !track.isSolo;
            const canPlay = !track.isMute && !isMutedBySolo;

            return (
              <div
                key={track.id}
                className={`flex border-b border-[var(--cordel-border)]/20 h-12 transition-opacity duration-150 ${
                  !canPlay ? 'opacity-50' : ''
                }`}
                style={{ width: `${HEADER_W + totalContentW}px` }}
              >
                {/* ── Sticky track header ── */}
                <div
                  className="sticky left-0 z-20 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex items-center justify-between px-3 py-1 shadow-[2px_0_5px_rgba(0,0,0,0.15)]"
                  style={{ width: HEADER_W, minWidth: HEADER_W }}
                >
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
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => onMuteToggle(track.id)}
                      className={`w-5 h-5 flex items-center justify-center text-[9px] font-bold cordel-border-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors ${
                        track.isMute ? 'bg-red-600 text-white border-red-600' : 'bg-transparent text-[var(--cordel-text)]'
                      }`}
                      title="Mute"
                    >M</button>
                    <button
                      onClick={() => onSoloToggle(track.id)}
                      className={`w-5 h-5 flex items-center justify-center text-[9px] font-bold cordel-border-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors ${
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

                  return (
                    <div
                      key={mIdx}
                      className="h-full border-r border-[var(--cordel-border)]/20 relative cursor-pointer"
                      style={{ width: MEASURE_W, minWidth: MEASURE_W }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const ratio = Math.max(0, Math.min(1, clickX / MEASURE_W));
                        onNavigate(mIdx, Math.floor(ratio * steps), steps);
                      }}
                    >
                      {/* Pattern selector */}
                      <div
                        className="absolute top-0.5 left-0.5 z-20"
                        onClick={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                        onTouchStart={e => e.stopPropagation()}
                      >
                        <select
                          value={activePattern ? String(activePattern.id) : 'silence'}
                          onChange={e => {
                            const v = e.target.value;
                            onPatternAssignForMeasure(
                              track.id,
                              v === 'silence' ? null : Number(v),
                              mIdx,
                            );
                          }}
                          className="bg-[var(--cordel-bg)]/95 text-[var(--cordel-text)] text-[8px] font-cactus font-bold border border-[var(--cordel-border)]/50 rounded px-0.5 py-px outline-none cursor-pointer tracking-wider uppercase max-w-[90px] leading-tight"
                          style={{ fontSize: '8px', height: '16px' }}
                        >
                          <option value="silence">
                            {lang === 'fr' ? '— Silence' : '— Silêncio'}
                          </option>
                          {track.patterns.map((p, pidx) => (
                            <option key={p.id} value={String(p.id)}>
                              {p.name || `Padrão ${pidx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Cell content */}
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
                            const isCurrent =
                              isPlaying &&
                              currentMeasure === mIdx &&
                              Math.floor((tickPos / maxTicksVal) * steps) === sIdx;

                            let style: React.CSSProperties = {
                              width: `${MEASURE_W / steps}px`,
                            };
                            if (isActive) {
                              const bg = inst.colors[val as string] || '#111';
                              let fg = inst.colors.text || '#f4ecd8';
                              if (inst.id === 'gongue' && (val === 'AIG' || val === 'aig')) fg = '#000';
                              style = { ...style, backgroundColor: bg, color: fg };
                            }

                            return (
                              <div
                                key={sIdx}
                                className={`h-full border-r border-[var(--cordel-border)]/10 flex flex-col items-center justify-center text-center ${
                                  isCurrent
                                    ? 'outline outline-2 outline-amber-500 z-10 bg-[var(--cordel-text)]/15'
                                    : ''
                                }`}
                                style={style}
                              >
                                {inst.type === 'voice' ? (
                                  <div className="flex flex-col items-center justify-center leading-none px-0.5 overflow-hidden w-full h-full">
                                    <span className="text-[7px] font-bold uppercase opacity-75">
                                      {val === 'P' ? 'PUX' : val === 'C' ? 'CORO' : ''}
                                    </span>
                                    <span className="text-[8px] font-cactus font-bold truncate max-w-full">
                                      {activePattern.lyrics?.[sIdx] || ''}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-extrabold tracking-wide">
                                    {display}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* ══════════ PLAYHEAD ══════════ */}
          {isPlaying && currentStepIndex >= 0 && (
            <div
              className="absolute top-0 bottom-0 border-l-2 border-red-600 pointer-events-none z-30 shadow-[0_0_10px_rgba(220,38,38,0.7)]"
              style={{ left: `${HEADER_W + playheadX}px` }}
            />
          )}
        </div>
      </div>

      {/* Bottom legend */}
      {!isMobile && (
        <div className="h-8 border-t border-[var(--cordel-border)] flex items-center justify-center px-4 bg-[var(--cordel-bg)] text-[10px] font-bold opacity-80 uppercase tracking-widest gap-4 shrink-0">
          <span>💡 {lang === 'fr'
            ? 'Cliquer sur la timeline pour naviguer · Utiliser les menus déroulants pour changer de motif'
            : 'Clique na timeline para navegar · Use os menus para trocar de padrão'}</span>
        </div>
      )}
    </div>
  );
};
