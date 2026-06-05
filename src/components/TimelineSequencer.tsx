/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { TrackGroup, Language, TimeSignature } from '../types';
import { ASSETS_BASE_URL, instrumentsConfig, getMaxTicks, getMarkers } from '../data';

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
  measureTimeSigs: TimeSignature[];
  measureBpms: number[];
  measureBpmTransitions: ('immediate' | 'ramp')[];
  measureVols: number[];
  measureVolTransitions: ('immediate' | 'ramp')[];
  onMeasureTimeSigChange: (measureIdx: number, val: TimeSignature) => void;
  onMeasureBpmChange: (measureIdx: number, val: number) => void;
  onMeasureTransitionChange: (measureIdx: number, val: 'immediate' | 'ramp') => void;
  onMeasureVolChange: (measureIdx: number, val: number) => void;
  onMeasureVolTransitionChange: (measureIdx: number, val: 'immediate' | 'ramp') => void;
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
  measureTimeSigs,
  measureBpms,
  measureBpmTransitions,
  measureVols,
  measureVolTransitions,
  onMeasureTimeSigChange,
  onMeasureBpmChange,
  onMeasureTransitionChange,
  onMeasureVolChange,
  onMeasureVolTransitionChange,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);

  const currentMeasureSig = measureTimeSigs[currentMeasure] || '4/4';
  const currentMeasureTicks = getMaxTicks(currentMeasureSig);
  const tickPos = currentStepIndex >= 0 ? currentStepIndex : 0;
  const playheadX = currentMeasure * MEASURE_W + (tickPos / currentMeasureTicks) * MEASURE_W;

  // Total scrollable content width (excluding sticky header column)
  const totalContentW = totalMeasures * MEASURE_W;

  // 1. Mouse wheel horizontal scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // 2. Drag-scroll global handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !scrollRef.current) return;
      const x = e.pageX - scrollRef.current.offsetLeft;
      const walk = (x - startX.current) * 1.5; // Défilement avec multiplicateur
      scrollRef.current.scrollLeft = startScrollLeft.current - walk;
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Clic gauche uniquement
    isDragging.current = true;
    startX.current = e.pageX - (scrollRef.current?.offsetLeft || 0);
    startScrollLeft.current = scrollRef.current?.scrollLeft || 0;
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  };

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
            className="flex h-16 border-b-2 border-[var(--cordel-border)] sticky top-0 z-30 bg-[var(--cordel-bg)] cursor-grab active:cursor-grabbing select-none"
            style={{ width: `${HEADER_W + totalContentW}px` }}
            onMouseDown={handleMouseDown}
          >
            {/* Sticky corner */}
            <div
              className="sticky left-0 z-40 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex items-center px-3 font-cactus text-sm font-bold uppercase"
              style={{ width: HEADER_W, minWidth: HEADER_W }}
            >
              {lang === 'fr' ? 'Instruments' : 'Instrumentos'}
            </div>

            {/* Measure labels */}
            {Array.from({ length: totalMeasures }).map((_, mIdx) => {
              const mTimeSig = measureTimeSigs[mIdx] || '4/4';
              const mBpm = measureBpms[mIdx] || 100;
              const mTransition = measureBpmTransitions[mIdx] || 'immediate';
              const mVol = measureVols[mIdx] !== undefined ? measureVols[mIdx] : 100;
              const mVolTransition = measureVolTransitions[mIdx] || 'immediate';
              const localBeats = mTimeSig === '3/4' || mTimeSig === '6/8' ? 3 : mTimeSig === '2/4' ? 2 : mTimeSig === '12/8' ? 12 : 4;

              return (
                <div
                  key={mIdx}
                  className="border-r border-[var(--cordel-border)]/30 flex flex-col justify-between px-2 py-1 text-[10px] font-bold"
                  style={{ width: MEASURE_W, minWidth: MEASURE_W }}
                >
                  <div className="flex items-center justify-between w-full mt-0.5 gap-2">
                    <span className="font-cactus text-xs tracking-wide">
                      {lang === 'fr' ? 'Mesure' : 'Compasso'} {mIdx + 1}
                    </span>

                    <div 
                      className="flex items-center gap-1.5"
                      onClick={e => e.stopPropagation()}
                      onMouseDown={e => e.stopPropagation()}
                      onTouchStart={e => e.stopPropagation()}
                    >
                      {/* Signature rythmique */}
                      <select
                        value={mTimeSig}
                        onChange={e => onMeasureTimeSigChange(mIdx, e.target.value as TimeSignature)}
                        className="bg-[var(--cordel-bg)] text-[9px] font-cactus font-bold border border-[var(--cordel-border)]/50 rounded px-0.5 py-px outline-none cursor-pointer"
                        style={{ height: '18px' }}
                      >
                        <option value="4/4">4/4</option>
                        <option value="3/4">3/4</option>
                        <option value="2/4">2/4</option>
                        <option value="6/8">6/8</option>
                        <option value="12/8">12/8</option>
                      </select>

                      {/* BPM Input */}
                      <div className="flex items-center gap-0.5">
                        <span className="text-[8px] opacity-75">BPM:</span>
                        <input
                          type="number"
                          min={40}
                          max={240}
                          value={mBpm}
                          onChange={e => onMeasureBpmChange(mIdx, Math.round(Number(e.target.value)))}
                          className="w-10 bg-[var(--cordel-bg)] text-[9px] font-bold border border-[var(--cordel-border)]/50 rounded px-0.5 py-px text-center outline-none"
                          style={{ height: '18px' }}
                        />
                      </div>

                      {/* Transition Toggle */}
                      <button
                        onClick={() => onMeasureTransitionChange(mIdx, mTransition === 'immediate' ? 'ramp' : 'immediate')}
                        className={`px-1 py-px text-[9px] font-extrabold border rounded transition-colors cursor-pointer flex items-center justify-center`}
                        style={{ height: '18px', minWidth: '18px' }}
                        title={
                          mTransition === 'ramp'
                            ? (lang === 'fr' ? 'Transition progressive (Rampe)' : 'Transição progressiva (Rampa)')
                            : (lang === 'fr' ? 'Transition immédiate' : 'Transição imediata')
                        }
                      >
                        {mTransition === 'ramp' ? (
                          <span className="text-amber-600 dark:text-amber-500 font-black">↗</span>
                        ) : (
                          <span className="opacity-60">→</span>
                        )}
                      </button>

                      {/* Vol Input */}
                      <div className="flex items-center gap-0.5 ml-1.5 border-l border-[var(--cordel-border)]/20 pl-1.5">
                        <span className="text-[8px] opacity-75 font-cactus">VOL:</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={mVol}
                          onChange={e => onMeasureVolChange(mIdx, Math.max(0, Math.min(100, Math.round(Number(e.target.value)))))}
                          className="w-8 bg-[var(--cordel-bg)] text-[9px] font-bold border border-[var(--cordel-border)]/50 rounded px-0.5 py-px text-center outline-none"
                          style={{ height: '18px' }}
                        />
                        <span className="text-[8px] opacity-75">%</span>
                      </div>

                      {/* Vol Transition Toggle */}
                      <button
                        onClick={() => onMeasureVolTransitionChange(mIdx, mVolTransition === 'immediate' ? 'ramp' : 'immediate')}
                        className={`px-1 py-px text-[9px] font-extrabold border rounded transition-colors cursor-pointer flex items-center justify-center`}
                        style={{ height: '18px', minWidth: '18px' }}
                        title={
                          mVolTransition === 'ramp'
                            ? (lang === 'fr' ? 'Transition progressive (Fade)' : 'Transição progressiva (Fade)')
                            : (lang === 'fr' ? 'Transition immédiate' : 'Transição imediata')
                        }
                      >
                        {mVolTransition === 'ramp' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-black">↗</span>
                        ) : (
                          <span className="opacity-60">→</span>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex w-full opacity-50 text-[8px] pb-0.5">
                    {Array.from({ length: localBeats }).map((_, b) => (
                      <span
                        key={b}
                        className="text-left pl-1 border-l border-[var(--cordel-border)]/10"
                        style={{ width: `${100 / localBeats}%` }}
                      >
                        {b + 1}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
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
                className={`flex border-b border-[var(--cordel-border)]/20 h-16 transition-opacity duration-150 ${
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
                      className="w-8 h-8 object-contain filter invert-[var(--cordel-invert)] dark:invert-0"
                    />
                    <span className="font-cactus text-sm font-bold truncate text-[var(--cordel-text)] tracking-wider">
                      {inst.name}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => onMuteToggle(track.id)}
                      className={`w-6 h-6 flex items-center justify-center text-[11px] font-bold cordel-border-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors ${
                        track.isMute ? 'bg-red-600 text-white border-red-600' : 'bg-transparent text-[var(--cordel-text)]'
                      }`}
                      title="Mute"
                    >M</button>
                    <button
                      onClick={() => onSoloToggle(track.id)}
                      className={`w-6 h-6 flex items-center justify-center text-[11px] font-bold cordel-border-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors ${
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
                        className="absolute top-1 left-1 z-20"
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
                          className="bg-[var(--cordel-bg)]/95 text-[var(--cordel-text)] text-[10px] font-cactus font-bold border border-[var(--cordel-border)]/50 rounded px-1 py-px outline-none cursor-pointer tracking-wider uppercase max-w-[125px] leading-tight"
                          style={{ fontSize: '10px', height: '22px' }}
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
                            const mMaxTicks = getMaxTicks(measureTimeSigs[mIdx] || '4/4');
                            const isCurrent =
                              isPlaying &&
                              currentMeasure === mIdx &&
                              Math.floor((tickPos / mMaxTicks) * steps) === sIdx;

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
            ? 'Cliquer-glisser sur la règle ou utiliser la molette pour défiler · Cliquer sur la timeline pour naviguer'
            : 'Clique e arraste na régua ou use o scroll para navegar · Clique na timeline para navegar'}</span>
        </div>
      )}
    </div>
  );
};
