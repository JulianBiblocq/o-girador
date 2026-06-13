import React, { useState, useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { Eye, EyeOff } from 'lucide-react';
import { TrackGroup, Language, Pattern } from '../types';
import { i18n, instrumentsConfig, ASSETS_BASE_URL, isDarkText } from '../data';
import { PanKnob } from './PanKnob';
import { getNextStepValue } from './InstrumentDetailEditor';

interface TrackMixerProps {
  lang: Language;
  track: TrackGroup;
  index: number;
  totalTracks: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onInstrumentChange: (instIdx: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  onHideToggle: () => void;
  onDelete: () => void;
  onVolumeChange: (val: number) => void;
  onPanChange: (val: number) => void;
  onStepsChange: (patternId: number, steps: number) => void;
  onStepValueChange: (patternId: number, stepIdx: number, val: string) => void;
  onStepKeyDown: (patternId: number, stepIdx: number, key: string, currentVal: string, targetEl: HTMLInputElement) => void;
  onVoiceTypeToggle: (patternId: number, stepIdx: number) => void;
  onVoiceSylChange: (patternId: number, stepIdx: number, val: string) => void;
  onVoiceNoteChange: (patternId: number, stepIdx: number, val: string) => void;
  onVoiceNoteBlur: (patternId: number, stepIdx: number, val: string) => void;
  isPlaying: boolean;
  currentStepIndex: number;
  maxTicks: number;
  timeSig: string;
  totalMeasures: number;
  onSelectPattern: (patternId: number) => void;
  onPatternAssign: (patternId: number, measureIdx: number, val: boolean) => void;
  onAddPattern: () => void;
  onDeletePattern: (patternId: number) => void;
  onReorderPatterns?: (patternId: number, direction: 'up' | 'down') => void;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
    onCopyPattern?: (pattern: Pattern) => void;
  onPastePattern?: (trackId: number, patternId: number) => void;
  canPaste?: boolean;
  meter?: any;
  soloPatternPlayId?: number | null;
}

const TrackMixerComponent: React.FC<TrackMixerProps> = ({
  lang,
  track,
  index,
  totalTracks,
  onMoveUp,
  onMoveDown,
  onInstrumentChange,
  onMuteToggle,
  onSoloToggle,
  onHideToggle,
  onDelete,
  onVolumeChange,
  onPanChange,
  onStepsChange,
  onStepValueChange,
  onStepKeyDown,
  onVoiceTypeToggle,
  onVoiceSylChange,
  onVoiceNoteChange,
  onVoiceNoteBlur,
  isPlaying,
  currentStepIndex,
  maxTicks,
  timeSig,
  totalMeasures,
  onSelectPattern,
  onPatternAssign,
  onAddPattern,
  onDeletePattern,
  onReorderPatterns,
  onStepTouchStart,
  onCopyPattern,
  onPastePattern,
  canPaste,
  meter,
  soloPatternPlayId,
}) => {
  const [instDropdownOpen, setInstDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isMouseDownRef = useRef(false);
  const paintValueRef = useRef<string | number>(0);

  const vuMeterRef = useRef<HTMLDivElement>(null);
  const [liveMeasure, setLiveMeasure] = useState<number>(-1);
  const lastMeasureRef = useRef<number>(-1);
  const lastRatioRef = useRef<number>(-1);
  const lastVuStepRef = useRef<number>(-1);

  const liveActivePatternId = (() => {
    if (liveMeasure >= 0) {
      if (soloPatternPlayId !== undefined && soloPatternPlayId !== null) {
        const hasSoloPattern = track.patterns.some(p => p.id === soloPatternPlayId);
        if (hasSoloPattern) return soloPatternPlayId;
      }
      const assignedPattern = track.patterns.find(p => p.measureAssignments[liveMeasure]);
      return assignedPattern ? assignedPattern.id : track.selectedPatternId;
    }
    return track.selectedPatternId;
  })();

  const activePattern = track.patterns.find(p => p.id === liveActivePatternId) || track.patterns[0];

  const activateElement = (el: HTMLElement) => {
    const type = el.getAttribute('data-step-type');
    if (type === 'voice') {
      el.classList.remove('border-[#1a1a1a]');
      el.classList.add('border-[#8b2a1a]');
    } else if (type === 'sampler') {
      el.classList.remove('bg-[#f4ecd8]', 'text-[#1a1a1a]');
      el.classList.add('bg-[#1a1a1a]', 'text-[#f4ecd8]', 'border-[#1a1a1a]', 'scale-105');
      el.style.backgroundColor = '';
      el.style.borderColor = '';
      el.style.color = '';
    }
  };

  const deactivateElement = (el: HTMLElement) => {
    const type = el.getAttribute('data-step-type');
    if (type === 'voice') {
      el.classList.remove('border-[#8b2a1a]');
      el.classList.add('border-[#1a1a1a]');
    } else if (type === 'sampler') {
      el.classList.remove('bg-[#1a1a1a]', 'text-[#f4ecd8]', 'border-[#1a1a1a]', 'scale-105');
      const isValZero = el.getAttribute('data-val-zero') === 'true';
      if (isValZero) {
        el.classList.add('bg-[#f4ecd8]', 'text-[#1a1a1a]');
      } else {
        el.style.backgroundColor = el.getAttribute('data-bg-color') || '';
        el.style.borderColor = el.getAttribute('data-border-color') || '';
        el.style.color = el.getAttribute('data-text-color') || '';
      }
    }
  };

  // Event-based VU meters do not need a requestAnimationFrame loop, they are animated directly in handleTick

  const inst = instrumentsConfig[track.instrumentIdx];
  const t = (key: string) => (i18n[lang] as any)[key] || key;

  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const handleStart = (e: React.MouseEvent | React.TouchEvent, stepIdx: number, currentVal: string | number) => {
    if ('shiftKey' in e && e.shiftKey) return;
    if (onStepTouchStart) {
      if (e.type === 'touchstart') {
        onStepTouchStart(e, activePattern.id, stepIdx, inst.id, currentVal, (newVal) => {
          onStepValueChange(activePattern.id, stepIdx, newVal);
        });
      } else {
        if ('button' in e && e.button !== 0) return;
        onStepTouchStart(e, activePattern.id, stepIdx, inst.id, currentVal, (newVal) => {
          onStepValueChange(activePattern.id, stepIdx, newVal);
        });
      }
    }
  };

  useEffect(() => {
    function clickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setInstDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const currentStep = (isPlaying && currentStepIndex >= 0)
    ? Math.floor((currentStepIndex / maxTicks) * activePattern.steps)
    : -1;

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isMouseDownRef.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Listen to CustomEvent 'baquemix-tick' to highlight step cells dynamically (Bypass React)
  useEffect(() => {
    let activeElements: HTMLElement[] = [];

    const handleTick = (e: Event) => {
      const customEvent = e as CustomEvent<{ step: number; measure: number; maxTicks: number; ratio?: number; time?: number }>;
      const { step, measure, maxTicks, ratio = step / maxTicks } = customEvent.detail;
      
      if (step < 0) {
        if (lastMeasureRef.current !== -1) {
          lastMeasureRef.current = -1;
          setLiveMeasure(-1);
        }
        lastRatioRef.current = -1;
        lastVuStepRef.current = -1;
        activeElements.forEach(el => {
          deactivateElement(el);
        });
        activeElements = [];
        if (vuMeterRef.current) {
          vuMeterRef.current.style.transition = 'none';
          vuMeterRef.current.style.width = '0%';
        }
        return;
      }

      lastRatioRef.current = ratio;

      if (measure !== lastMeasureRef.current) {
        lastMeasureRef.current = measure;
        setLiveMeasure(prev => (prev !== measure ? measure : prev));
      }

      // Resolve the live active pattern dynamically inside the tick listener to avoid stale closure issues
      const getLivePatternForMeasure = (m: number) => {
        if (soloPatternPlayId !== undefined && soloPatternPlayId !== null) {
          const hasSoloPattern = track.patterns.some(p => p.id === soloPatternPlayId);
          if (hasSoloPattern) {
            return track.patterns.find(p => p.id === soloPatternPlayId);
          }
        }
        return track.patterns.find(p => p.measureAssignments[m]);
      };

      const currentLivePattern = getLivePatternForMeasure(measure);

      if (!currentLivePattern) {
        // Deactivate old active elements and keep VU meter at 0%
        activeElements.forEach(el => {
          deactivateElement(el);
        });
        activeElements = [];
        lastVuStepRef.current = -1;
        return;
      }

      // Calculate track-specific step index using the ratio sent by the audio engine
      const stepsCount = currentLivePattern.steps;
      const targetStep = Math.floor(ratio * stepsCount);

      // Edge trigger VU fader width update on step transitions
      if (targetStep !== lastVuStepRef.current) {
        lastVuStepRef.current = targetStep;
        if (!track.isMute) {
          const val = currentLivePattern.activeSteps[targetStep];
          const isHit = val !== undefined && val !== 0 && val !== '0' && val !== '';
          if (isHit && vuMeterRef.current) {
            vuMeterRef.current.style.transition = 'none';
            vuMeterRef.current.style.width = '100%';
            void vuMeterRef.current.offsetHeight; // force reflow
            requestAnimationFrame(() => {
              if (vuMeterRef.current) {
                vuMeterRef.current.style.transition = 'width 1.5s ease-out';
                vuMeterRef.current.style.width = '0%';
              }
            });
          }
        }
      }

      // Check if target step has changed to avoid redundant DOM queries
      const currentActiveIndex = activeElements.length > 0 ? Number(activeElements[0].getAttribute('data-step-index')) : -1;
      if (targetStep === currentActiveIndex) {
        return;
      }

      // Deactivate old active elements
      activeElements.forEach(el => {
        deactivateElement(el);
      });
      activeElements = [];

      // Find and activate the new active elements for this track
      const activeStepElements = document.querySelectorAll(
        `[data-track-id="${track.id}"][data-step-index="${targetStep}"]`
      );

      activeStepElements.forEach(el => {
        const htmlEl = el as HTMLElement;
        activateElement(htmlEl);
        activeElements.push(htmlEl);
      });
    };

    window.addEventListener('baquemix-tick', handleTick);
    return () => {
      window.removeEventListener('baquemix-tick', handleTick);
      activeElements.forEach(el => {
        deactivateElement(el);
      });
    };
  }, [track, soloPatternPlayId]);

  // Post-render highlight to prevent visual flicker during pattern transitions
  useEffect(() => {
    if (lastRatioRef.current >= 0) {
      const stepsCount = activePattern.steps;
      const targetStep = Math.floor(lastRatioRef.current * stepsCount);
      const activeStepElements = document.querySelectorAll(
        `[data-track-id="${track.id}"][data-step-index="${targetStep}"]`
      );
      activeStepElements.forEach(el => {
        activateElement(el as HTMLElement);
      });
    }
  });

  // Synchronize the visually active pattern selection index in parent state during playback
  useEffect(() => {
    if (isPlaying && liveMeasure >= 0) {
      const livePattern = (() => {
        if (soloPatternPlayId !== undefined && soloPatternPlayId !== null) {
          const hasSoloPattern = track.patterns.some(p => p.id === soloPatternPlayId);
          if (hasSoloPattern) {
            return track.patterns.find(p => p.id === soloPatternPlayId) || track.patterns[0];
          }
        }
        return track.patterns.find(p => p.measureAssignments[liveMeasure]) || track.patterns[0];
      })();

      if (livePattern && livePattern.id !== track.selectedPatternId) {
        onSelectPattern(livePattern.id);
      }
    }
  }, [liveMeasure, isPlaying, track.patterns, track.selectedPatternId, soloPatternPlayId, onSelectPattern]);

  const handleVoiceNav = (el: HTMLInputElement, key: string, type: 'syl' | 'note') => {
    if (key === 'Tab') return;
    const parentContainer = el.closest('.step-boxes');
    if (!parentContainer) return;

    const cards = Array.from(parentContainer.querySelectorAll('.v-card'));
    const currentCard = el.closest('.v-card');
    if (!currentCard) return;

    const idx = cards.indexOf(currentCard);

    if ((key === 'ArrowRight' || key === 'Enter') && idx < cards.length - 1) {
      const nextCard = cards[idx + 1] as HTMLElement;
      const input = nextCard.querySelector(type === 'syl' ? '.v-syl' : '.v-note') as HTMLInputElement;
      input?.focus();
      input?.select();
    } else if (key === 'ArrowLeft' && idx > 0) {
      const prevCard = cards[idx - 1] as HTMLElement;
      const input = prevCard.querySelector(type === 'syl' ? '.v-syl' : '.v-note') as HTMLInputElement;
      input?.focus();
      input?.select();
    }
  };

  return (
    <div
      className={`relative bg-[#f4ecd8] cordel-border p-4 mb-4 select-none flex flex-col text-[#1a1a1a] ${instDropdownOpen ? 'z-50' : 'z-10'}`}
      style={{
        zIndex: instDropdownOpen ? 9999 : 10,
        '--cordel-bg': '#f4ecd8',
        '--cordel-text': '#1a1a1a',
        '--cordel-border': '#1a1a1a',
        '--fader-thumb-bg': '#8b2a1a',
        '--fader-thumb-border': '#1a1a1a',
      } as React.CSSProperties}
    >

      <div className={`flex justify-between items-center mb-2 relative ${instDropdownOpen ? 'z-[9999]' : 'z-[2]'}`}>
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-[2px] mr-2">
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              className="bg-[#f4ecd8] text-[#1a1a1a] cordel-border-sm cordel-button text-[8px] px-1.5 py-[2px] cursor-pointer hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ▲
            </button>
            <button
              onClick={onMoveDown}
              disabled={index === totalTracks - 1}
              className="bg-[#f4ecd8] text-[#1a1a1a] cordel-border-sm cordel-button text-[8px] px-1.5 py-[2px] cursor-pointer hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ▼
            </button>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setInstDropdownOpen(!instDropdownOpen)}
              className="flex items-center gap-2 cordel-border-sm cordel-button px-2 py-1 text-xs cursor-pointer transition-colors"
              style={{ backgroundColor: inst.mixerBg, color: inst.colors.text }}
            >
              <img
                src={`${ASSETS_BASE_URL}${inst.iconImg}`}
                alt={inst.name}
                className="w-4 h-4 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="font-cactus font-bold">
                {index + 1}. {inst.name}
              </span>
              <span className="text-[8px]">▼</span>
            </button>

            {instDropdownOpen && (
              <div className="absolute top-7 left-0 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-shadow min-w-[180px] max-h-[220px] overflow-y-auto z-[99]">
                {instrumentsConfig.map((opt, oIdx) => (
                  <div
                    key={oIdx}
                    onClick={() => {
                      onInstrumentChange(oIdx);
                      setInstDropdownOpen(false);
                    }}
                    className="flex items-center gap-3.5 px-3 py-2 cursor-pointer text-xs font-bold border-b border-[var(--cordel-border)]/30 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
                  >
                    <img
                      src={`${ASSETS_BASE_URL}${opt.iconImg}`}
                      alt={opt.name}
                      className="w-5 h-5 object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span>{opt.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-1.5">
          <button
            onClick={onMuteToggle}
            className={`w-6 h-6 cordel-border-sm cordel-button text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center ${
              track.isMute ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
            }`}
          >
            M
          </button>
          <button
            onClick={onSoloToggle}
            className={`w-6 h-6 cordel-border-sm cordel-button text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center ${
              track.isSolo ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
            }`}
          >
            S
          </button>
          <button
            onClick={onHideToggle}
            className={`w-6 h-6 cordel-border-sm cordel-button text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center ${
              track.isHidden ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
            }`}
            title="Ocultar pista"
          >
            {track.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onDelete}
            className="w-6 h-6 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm cordel-button hover:bg-[#1a1a1a] text-[10px] font-bold cursor-pointer transition-colors flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2 relative z-[2]">
        <PanKnob value={track.panVal || 0} onChange={onPanChange} label="Pan" />
        <div className="flex-grow flex flex-col gap-1 justify-center h-full min-w-0">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#1a1a1a]/60">Volume</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="100"
              value={track.volumeVal}
              onChange={(e) => onVolumeChange(parseInt(e.target.value))}
              className="flex-grow h-2 bg-[#1a1a1a] border border-[#1a1a1a] rounded-none outline-none cursor-pointer accent-[#8b2a1a]"
            />
            <div className="w-[35px] h-2 bg-[#1a1a1a] relative overflow-hidden cordel-border-sm shrink-0">
              <div
                ref={vuMeterRef}
                id={`meter-bar-${track.id}`}
                className="h-full bg-[#f4ecd8] w-0"
                style={{ transition: 'width 0.7s ease-out' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* PATTERNS MANAGEMENT */}
      <div className="bg-[#f4ecd8] cordel-border-sm p-2 mb-2 relative z-[2] text-xs">
        <div className="flex justify-between items-center mb-1.5 border-b-[2px] border-[#1a1a1a] pb-1">
          <span className="font-cactus font-bold uppercase">{t('patterns')}:</span>
        </div>
        {/* Patterns Summary (No checkboxes) */}
        <div className="flex flex-col gap-1 w-full max-h-[90px] overflow-y-auto custom-scrollbar">
          {track.patterns.map((ptn, idx) => (
            <div key={ptn.id} className="flex items-center justify-between border-b border-[#1a1a1a]/20 pb-1 last:border-0 last:pb-0 min-h-6 h-auto py-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <input
                  type="radio"
                  checked={liveActivePatternId === ptn.id}
                  onChange={() => onSelectPattern(ptn.id)}
                  className="w-3 h-3 accent-[#1a1a1a] flex-shrink-0 cursor-pointer"
                />
                <span 
                  className={`text-[10px] font-cactus font-bold cursor-pointer truncate ${liveActivePatternId === ptn.id ? 'text-[#1a1a1a]' : 'text-[#666]'}`}
                  onClick={() => onSelectPattern(ptn.id)}
                >
                  {ptn.name ? ptn.name : `${t('patterns').slice(0,-1)} ${idx + 1}`}
                </span>
              </div>
              
              {onReorderPatterns && track.patterns.length > 1 && (
                <div className="flex gap-0.5 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); onReorderPatterns(ptn.id, 'up'); }}
                    disabled={idx === 0}
                    className={`px-1 py-px text-[8px] font-bold border border-[#1a1a1a]/20 rounded-sm leading-none flex items-center justify-center h-4 w-4 ${
                      idx === 0
                        ? 'text-gray-400 cursor-not-allowed opacity-50 border-gray-200'
                        : 'text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] cursor-pointer'
                    }`}
                    title={lang === 'fr' ? 'Monter' : 'Subir'}
                  >
                    ▲
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onReorderPatterns(ptn.id, 'down'); }}
                    disabled={idx === track.patterns.length - 1}
                    className={`px-1 py-px text-[8px] font-bold border border-[#1a1a1a]/20 rounded-sm leading-none flex items-center justify-center h-4 w-4 ${
                      idx === track.patterns.length - 1
                        ? 'text-gray-400 cursor-not-allowed opacity-50 border-gray-200'
                        : 'text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] cursor-pointer'
                    }`}
                    title={lang === 'fr' ? 'Descendre' : 'Descer'}
                  >
                    ▼
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>


      <div className="flex gap-2 items-start mt-2 border-t-[2px] border-[#1a1a1a] pt-2 relative z-[2] w-full">
        {isTouchDevice || window.innerWidth <= 768 ? (
          /* ── MOBILE TOUCH LAYOUT: Horizontal Scrollable List ── */
          inst.type === 'voice' ? (
            <div className="step-boxes flex overflow-x-auto gap-2 py-1 w-full shrink-0 custom-scrollbar select-none" id={`voice-boxes-${track.id}`}>
              {Array.from({ length: activePattern.steps }).map((_, i) => {
                const state = activePattern.activeSteps[i];
                const isActive = state !== 0;
                const isPux = state === 'P';
                const syl = activePattern.lyrics?.[i] || '';
                const note = activePattern.notes?.[i] || '';

                const typeText = isActive ? (isPux ? 'PUX' : 'CORO') : '---';
                const typeClass = isActive ? '' : 'bg-transparent text-[#666] cursor-default';
                const typeStyle = isActive ? { backgroundColor: isPux ? inst.colors['P'] : inst.colors['C'], color: '#1a1a1a' } : {};

                return (
                  <div
                    key={i}
                    className={`v-card flex flex-col w-12 shrink-0 bg-[#f4ecd8] cordel-border-sm overflow-hidden ${
                      currentStep === i ? 'border-[#8b2a1a]' : 'border-[#1a1a1a]'
                    }`}
                    data-track-id={track.id}
                    data-step-index={i}
                    data-step-type="voice"
                  >
                    <div
                      onClick={() => onVoiceTypeToggle(activePattern.id, i)}
                      className={`text-[9px] font-bold text-center py-0.5 cursor-pointer select-none uppercase ${typeClass}`}
                      style={typeStyle}
                    >
                      {typeText}
                    </div>
                    
                    <input
                      type="text"
                      value={syl}
                      onChange={(e) => onVoiceSylChange(activePattern.id, i, e.target.value)}
                      placeholder="-"
                      className="v-syl w-full text-center text-xs font-bold py-1 bg-transparent border-0 border-b border-[#1a1a1a]/30 text-[#1a1a1a] focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'syl');
                        } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Enter') {
                          handleVoiceNav(e.target as HTMLInputElement, e.key, 'syl');
                        }
                      }}
                    />

                    <input
                      type="text"
                      value={note}
                      onChange={(e) => onVoiceNoteChange(activePattern.id, i, e.target.value)}
                      onBlur={(e) => onVoiceNoteBlur(activePattern.id, i, e.target.value)}
                      placeholder="Ex:C4"
                      className="v-note w-full text-center text-[10px] py-1 bg-transparent border-0 text-[#1a1a1a] uppercase focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'note');
                        } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Enter') {
                          handleVoiceNav(e.target as HTMLInputElement, e.key, 'note');
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="step-boxes flex overflow-x-auto gap-2 py-1 w-full shrink-0 custom-scrollbar select-none" id={`step-boxes-${track.id}`}>
              {Array.from({ length: activePattern.steps }).map((_, i) => {
                const val = activePattern.activeSteps[i];
                let displayVal = val === 0 ? '' : String(val);

                if (val !== 0 && inst.type === 'gongue') {
                  if (val === 'GRV') displayVal = 'G';
                  else if (val === 'grv') displayVal = 'g';
                  else if (val === 'AIG') displayVal = 'A';
                  else if (val === 'aig') displayVal = 'a';
                }

                let colorStyle: React.CSSProperties = {};
                if (val !== 0 && val !== '') {
                  const bgColor = inst.colors[val] || '#111';
                  let txtColor = inst.colors.text || '#fff';
                  if (isDarkText(inst.id, String(val))) {
                    txtColor = '#1a1a1a';
                  }
                  colorStyle = {
                    backgroundColor: bgColor,
                    borderColor: bgColor,
                    color: txtColor,
                  };
                }

                return (
                  <div key={i} className="relative flex flex-col items-center justify-center shrink-0 w-[38px]">
                    <div className="text-[#666] text-[8px] mb-0.5 w-full text-center font-bold">{i + 1}</div>
                    <input
                      type="text"
                      maxLength={['caixa', 'tarol'].includes(inst.id) ? 2 : 1}
                      value={displayVal}
                      readOnly={isTouchDevice}
                      inputMode={isTouchDevice ? 'none' : undefined}
                      onFocus={(e) => {
                        if (!isTouchDevice) {
                          e.target.select();
                        }
                      }}
                      onMouseDown={(e) => {
                        if (e.button !== 0) return;
                        if (e.shiftKey) {
                          isMouseDownRef.current = true;
                          const nextVal = getNextStepValue(inst.id, inst.type, val);
                          paintValueRef.current = nextVal;
                          onStepValueChange(activePattern.id, i, String(nextVal));
                        } else {
                          handleStart(e, i, val);
                        }
                      }}
                      onMouseEnter={() => {
                        if (isMouseDownRef.current) {
                          onStepValueChange(activePattern.id, i, String(paintValueRef.current));
                        }
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        handleStart(e, i, val);
                      }}
                      onChange={(e) => onStepValueChange(activePattern.id, i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' || e.key === 'Enter') e.preventDefault();
                        
                        const isCtrlOrMeta = e.ctrlKey || e.metaKey;
                        if (isCtrlOrMeta && e.key.toLowerCase() === 'c') {
                          e.preventDefault();
                          onCopyPattern && onCopyPattern(activePattern);
                          return;
                        }
                        if (isCtrlOrMeta && e.key.toLowerCase() === 'v') {
                          e.preventDefault();
                          if (canPaste) {
                            onPastePattern && onPastePattern(track.id, activePattern.id);
                          }
                          return;
                        }
                        if (e.key === 'Delete' || e.key === 'Backspace') {
                          e.preventDefault();
                          onStepValueChange(activePattern.id, i, '0');
                          if (e.key === 'Backspace') {
                            const inputEl = e.currentTarget as HTMLInputElement;
                            onStepKeyDown(activePattern.id, i, e.key, '', inputEl);
                          }
                          return;
                        }

                        const inputEl = e.currentTarget as HTMLInputElement;
                        onStepKeyDown(activePattern.id, i, e.key, inputEl.value, inputEl);
                      }}
                      className={`w-[38px] h-[38px] text-center text-sm font-bold cordel-border-sm outline-none p-0 box-border focus:border-[#8b2a1a] transition-all duration-200 ${
                        currentStep === i ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a] scale-105' : (val === 0 ? 'bg-[#f4ecd8] text-[#1a1a1a]' : '')
                      }`}
                      style={currentStep === i ? {} : colorStyle}
                      data-track-id={track.id}
                      data-step-index={i}
                      data-step-type="sampler"
                      data-val-zero={val === 0}
                      data-bg-color={colorStyle.backgroundColor || ''}
                      data-border-color={colorStyle.borderColor || ''}
                      data-text-color={colorStyle.color || ''}
                    />
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* ── DESKTOP GRID LAYOUT: Double Rows ── */
          inst.type === 'voice' ? (
            <div className="grid grid-cols-4 gap-1.5 w-full flex-grow step-boxes" id={`voice-boxes-${track.id}`}>
              {Array.from({ length: activePattern.steps }).map((_, i) => {
                const state = activePattern.activeSteps[i];
                const isActive = state !== 0;
                const isPux = state === 'P';
                const syl = activePattern.lyrics?.[i] || '';
                const note = activePattern.notes?.[i] || '';

                const typeText = isActive ? (isPux ? 'PUX' : 'CORO') : '---';
                const typeClass = isActive ? '' : 'bg-transparent text-[#666] cursor-default';
                const typeStyle = isActive ? { backgroundColor: isPux ? inst.colors['P'] : inst.colors['C'], color: '#1a1a1a' } : {};

                return (
                  <div
                    key={i}
                    className={`v-card flex flex-col w-12 bg-[#f4ecd8] cordel-border-sm overflow-hidden ${
                      currentStep === i ? 'border-[#8b2a1a]' : 'border-[#1a1a1a]'
                    }`}
                    data-track-id={track.id}
                    data-step-index={i}
                    data-step-type="voice"
                  >
                    <div
                      onClick={() => onVoiceTypeToggle(activePattern.id, i)}
                      className={`text-[9px] font-bold text-center py-0.5 cursor-pointer select-none uppercase ${typeClass}`}
                      style={typeStyle}
                    >
                      {typeText}
                    </div>
                    
                    <input
                      type="text"
                      value={syl}
                      onChange={(e) => onVoiceSylChange(activePattern.id, i, e.target.value)}
                      placeholder="-"
                      className="v-syl w-full text-center text-xs font-bold py-1 bg-transparent border-0 border-b border-[#1a1a1a]/30 text-[#1a1a1a] focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'syl');
                        } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Enter') {
                          handleVoiceNav(e.target as HTMLInputElement, e.key, 'syl');
                        }
                      }}
                    />

                    <input
                      type="text"
                      value={note}
                      onChange={(e) => onVoiceNoteChange(activePattern.id, i, e.target.value)}
                      onBlur={(e) => onVoiceNoteBlur(activePattern.id, i, e.target.value)}
                      placeholder="Ex:C4"
                      className="v-note w-full text-center text-[10px] py-1 bg-transparent border-0 text-[#1a1a1a] uppercase focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'note');
                        } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Enter') {
                          handleVoiceNav(e.target as HTMLInputElement, e.key, 'note');
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="step-boxes grid gap-y-2 gap-x-1 w-full flex-grow items-center justify-start" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr)) 12px repeat(4, minmax(0, 1fr))' }} id={`step-boxes-${track.id}`}>
              {Array.from({ length: activePattern.steps }).reduce((acc: React.ReactNode[], _, i) => {
                if (i > 0 && i % 4 === 0 && i % 8 !== 0) {
                  acc.push(<div key={`spacer-${i}`} />);
                }

                const val = activePattern.activeSteps[i];
                let displayVal = val === 0 ? '' : String(val);

                if (val !== 0 && inst.type === 'gongue') {
                  if (val === 'GRV') displayVal = 'G';
                  else if (val === 'grv') displayVal = 'g';
                  else if (val === 'AIG') displayVal = 'A';
                  else if (val === 'aig') displayVal = 'a';
                }

                let extraStyle = '';
                let isBeatBound = false;
                if (timeSig === '6/8' || timeSig === '12/8') {
                  if ((i + 1) % 3 === 0) isBeatBound = true;
                } else if (timeSig === '3/4') {
                  const stepDiv = activePattern.steps === 12 ? 4 : Math.floor(activePattern.steps / 3);
                  if ((i + 1) % (stepDiv || 4) === 0) isBeatBound = true;
                } else {
                  const stepDiv = Math.floor(activePattern.steps / (timeSig === '4/4' ? 4 : 2));
                  if ((i + 1) % (stepDiv || 4) === 0) isBeatBound = true;
                }

                if (isBeatBound && i !== activePattern.steps - 1) {
                  extraStyle = 'margin-right: 10px;';
                }

                let colorStyle: React.CSSProperties = {};
                if (val !== 0 && val !== '') {
                  const bgColor = inst.colors[val] || '#111';
                  let txtColor = inst.colors.text || '#fff';
                  if (isDarkText(inst.id, String(val))) {
                    txtColor = '#1a1a1a';
                  }
                  colorStyle = {
                    backgroundColor: bgColor,
                    borderColor: bgColor,
                    color: txtColor,
                  };
                }

                acc.push(
                  <div key={i} className="relative flex flex-col items-center justify-center w-full">
                    <div className="text-[#666] text-[8px] mb-0.5 w-full text-center font-bold">{i + 1}</div>
                    <input
                      type="text"
                      maxLength={['caixa', 'tarol'].includes(inst.id) ? 2 : 1}
                      value={displayVal}
                      readOnly={isTouchDevice}
                      inputMode={isTouchDevice ? 'none' : undefined}
                      onFocus={(e) => {
                        if (!isTouchDevice) {
                          e.target.select();
                        }
                      }}
                      onMouseDown={(e) => {
                        if (e.button !== 0) return;
                        if (e.shiftKey) {
                          isMouseDownRef.current = true;
                          const nextVal = getNextStepValue(inst.id, inst.type, val);
                          paintValueRef.current = nextVal;
                          onStepValueChange(activePattern.id, i, String(nextVal));
                        } else {
                          handleStart(e, i, val);
                        }
                      }}
                      onMouseEnter={() => {
                        if (isMouseDownRef.current) {
                          onStepValueChange(activePattern.id, i, String(paintValueRef.current));
                        }
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        handleStart(e, i, val);
                      }}
                      onChange={(e) => onStepValueChange(activePattern.id, i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' || e.key === 'Enter') e.preventDefault();
                        
                        const isCtrlOrMeta = e.ctrlKey || e.metaKey;
                        if (isCtrlOrMeta && e.key.toLowerCase() === 'c') {
                          e.preventDefault();
                          onCopyPattern && onCopyPattern(activePattern);
                          return;
                        }
                        if (isCtrlOrMeta && e.key.toLowerCase() === 'v') {
                          e.preventDefault();
                          if (canPaste) {
                            onPastePattern && onPastePattern(track.id, activePattern.id);
                          }
                          return;
                        }
                        if (e.key === 'Delete' || e.key === 'Backspace') {
                          e.preventDefault();
                          onStepValueChange(activePattern.id, i, '0');
                          if (e.key === 'Backspace') {
                            const inputEl = e.currentTarget as HTMLInputElement;
                            onStepKeyDown(activePattern.id, i, e.key, '', inputEl);
                          }
                          return;
                        }

                        const inputEl = e.currentTarget as HTMLInputElement;
                        onStepKeyDown(activePattern.id, i, e.key, inputEl.value, inputEl);
                      }}
                      className={`w-full aspect-square text-center text-sm font-bold cordel-border-sm outline-none p-0 box-border focus:border-[#8b2a1a] transition-all duration-200 ${
                        currentStep === i ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a] scale-105' : (val === 0 ? 'bg-[#f4ecd8] text-[#1a1a1a]' : '')
                      }`}
                      style={currentStep === i ? {} : colorStyle}
                      data-track-id={track.id}
                      data-step-index={i}
                      data-step-type="sampler"
                      data-val-zero={val === 0}
                      data-bg-color={colorStyle.backgroundColor || ''}
                      data-border-color={colorStyle.borderColor || ''}
                      data-text-color={colorStyle.color || ''}
                    />
                  </div>
                );
                return acc;
              }, [] as React.ReactNode[])}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export const TrackMixer = React.memo(TrackMixerComponent, (prevProps, nextProps) => {
  const prevActivePattern = prevProps.track.patterns.find(p => p.id === prevProps.track.selectedPatternId) || prevProps.track.patterns[0];
  const nextActivePattern = nextProps.track.patterns.find(p => p.id === nextProps.track.selectedPatternId) || nextProps.track.patterns[0];
  
  const prevStep = (prevProps.isPlaying && prevProps.currentStepIndex >= 0)
    ? Math.floor((prevProps.currentStepIndex / prevProps.maxTicks) * prevActivePattern.steps)
    : -1;
  const nextStep = (nextProps.isPlaying && nextProps.currentStepIndex >= 0)
    ? Math.floor((nextProps.currentStepIndex / nextProps.maxTicks) * nextActivePattern.steps)
    : -1;

  if (prevStep !== nextStep) {
    return false;
  }

  const keys = Object.keys(prevProps) as Array<keyof TrackMixerProps>;
  for (const key of keys) {
    if (typeof prevProps[key] === 'function') {
      continue;
    }
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }
  return true;
});
