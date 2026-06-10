import React, { useState, useRef, useEffect } from 'react';
import { TrackGroup, Language } from '../types';
import { i18n, instrumentsConfig, ASSETS_BASE_URL } from '../data';
import { PanKnob } from './PanKnob';
import { getNextStepValue } from './InstrumentDetailEditor';

interface VerticalTrackMixerProps {
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
  onReverbChange: (val: number) => void;
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
  currentMeasure: number;
  maxTicks: number;
  timeSig: string;
  totalMeasures: number;
  onSelectPattern: (patternId: number) => void;
  onPatternAssign: (patternId: number, measureIdx: number, val: boolean) => void;
  onAddPattern: () => void;
  onDeletePattern: (patternId: number) => void;
  onOpenDetailEditor: () => void;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
  onCopyPattern?: (pattern: any) => void;
  onPastePattern?: (trackId: number, patternId: number) => void;
  canPaste?: boolean;
}

export const VerticalTrackMixer: React.FC<VerticalTrackMixerProps> = ({
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
  onReverbChange,
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
  currentMeasure,
  maxTicks,
  timeSig,
  totalMeasures,
  onSelectPattern,
  onPatternAssign,
  onAddPattern,
  onDeletePattern,
  onOpenDetailEditor,
  onStepTouchStart,
  onCopyPattern,
  onPastePattern,
  canPaste,
}) => {
  const [instDropdownOpen, setInstDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isMouseDownRef = useRef(false);
  const paintValueRef = useRef<string | number>(0);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isMouseDownRef.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const inst = instrumentsConfig[track.instrumentIdx];
  const t = (key: string) => (i18n[lang] as any)[key] || key;

  const activePattern = track.patterns.find(p => p.id === track.selectedPatternId) || track.patterns[0];

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
      className="flex flex-col bg-[var(--cordel-bg)] cordel-border w-[340px] shrink-0 text-[var(--cordel-text)] overflow-hidden relative pb-4 transition-colors"
      style={{ zIndex: instDropdownOpen ? 30 : 1 }}
    >
      <div 
        className="relative p-3 pb-1 flex justify-between border-b-[3px] border-[var(--cordel-border)]"
        style={{ zIndex: instDropdownOpen ? 40 : 10 }}
      >
        <div className="flex gap-2 items-center">
          <div className="flex flex-col gap-1">
            <button onClick={onMoveUp} disabled={index === 0} className="w-6 h-6 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button flex items-center justify-center font-bold text-xs hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] disabled:opacity-30 disabled:cursor-not-allowed">▲</button>
            <button onClick={onMoveDown} disabled={index === totalTracks - 1} className="w-6 h-6 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button flex items-center justify-center font-bold text-xs hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] disabled:opacity-30 disabled:cursor-not-allowed">▼</button>
          </div>
          
          <div className="relative flex items-center gap-1.5" ref={dropdownRef}>
            <div onClick={() => setInstDropdownOpen(!instDropdownOpen)} className="flex items-center gap-2 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button px-2 py-1 cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors">
              <img src={`${ASSETS_BASE_URL}${inst.iconImg}`} alt={inst.name} className="w-6 h-6 object-contain" />
              <span className="font-cactus font-bold text-sm">{index + 1}. {inst.name}</span>
            </div>
            
            <button
              onClick={onOpenDetailEditor}
              className="w-8 h-8 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button font-bold flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors"
              title="Éditeur détaillé"
            >
              ✏️
            </button>

            {instDropdownOpen && (
              <div className="absolute top-10 left-0 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border shadow-2xl min-w-[200px] max-h-[300px] overflow-y-auto z-[99]">
                {instrumentsConfig.map((opt, oIdx) => (
                  <div key={oIdx} onClick={() => { onInstrumentChange(oIdx); setInstDropdownOpen(false); }} className="flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-[var(--cordel-border)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]">
                    <img src={`${ASSETS_BASE_URL}${opt.iconImg}`} alt={opt.name} className="w-6 h-6 object-contain" />
                    <span className="font-cactus font-bold">{opt.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button onClick={onDelete} className="w-8 h-8 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm cordel-button font-bold flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]">✕</button>
      </div>

      {/* Editor Section */}
      <div className="relative z-10 flex-1 p-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar border-b-[3px] border-[var(--cordel-border)]">
        
        {/* Padrões Grid */}
        <div className="bg-[var(--cordel-bg)] p-2 cordel-border-sm flex flex-col gap-2">
          <div className="flex justify-between items-center border-b-2 border-[var(--cordel-border)] pb-1 mb-1">
            <span className="font-cactus font-bold text-sm">Padrões</span>
            <div className="flex gap-1">
              <button
                onClick={() => onCopyPattern && onCopyPattern(activePattern)}
                className="px-1.5 py-0.5 bg-[#eaddcf] text-[10px] font-bold cordel-border-sm hover:bg-[#1a1a1a] hover:text-[#f4ecd8] cursor-pointer"
                title="Copier le motif actif"
              >
                📋 Copier
              </button>
              <button
                onClick={() => onPastePattern && onPastePattern(track.id, activePattern.id)}
                disabled={!canPaste}
                className={`px-1.5 py-0.5 text-[10px] font-bold cordel-border-sm cursor-pointer ${
                  canPaste 
                    ? 'bg-[#eaddcf] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                }`}
                title="Coller le motif copié"
              >
                📥 Coller
              </button>
            </div>
            <button onClick={onAddPattern} className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] px-2 py-0.5 cordel-border-sm cordel-button text-[10px] font-bold hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]">+ Padrão</button>
          </div>
          
          <div className="flex flex-col gap-2">
            {track.patterns.map((ptn, idx) => {
              const activeMeasures = ptn.measureAssignments
                .map((assigned, mIdx) => assigned ? mIdx + 1 : null)
                .filter(m => m !== null);
              
              const assignedText = activeMeasures.length > 0 
                ? activeMeasures.join(', ')
                : (lang === 'pt' ? 'Sem compasso' : 'Aucune mesure');

              return (
                <div key={ptn.id} className="flex flex-col gap-1 pb-1 last:pb-0 border-b border-[var(--cordel-border)]/20 last:border-b-0">
                  <div className="flex items-center gap-2">
                    <input type="radio" checked={track.selectedPatternId === ptn.id} onChange={() => onSelectPattern(ptn.id)} className="w-4 h-4 accent-[var(--cordel-border)]" />
                    <span className={`font-cactus font-bold cursor-pointer ${track.selectedPatternId === ptn.id ? 'text-[var(--cordel-text)] text-sm' : 'text-[var(--cordel-text)]/60 text-xs'}`} onClick={() => onSelectPattern(ptn.id)}>
                      Padrão {idx + 1} <span className="font-sans font-normal opacity-70">({ptn.steps} pas)</span>
                    </span>
                    {track.patterns.length > 1 && (
                      <button onClick={() => onDeletePattern(ptn.id)} className="text-[#8b2a1a] ml-auto text-xs px-1 font-bold hover:underline">✕</button>
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--cordel-text)]/70 pl-6 leading-tight">
                    M: {assignedText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Steps Editor */}
        <div className="bg-[var(--cordel-bg)] p-2 cordel-border-sm flex flex-col gap-2">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-xs">{t('stepsNum')}</span>
            <input type="number" min="2" max="32" value={activePattern.steps} onChange={(e) => onStepsChange(activePattern.id, parseInt(e.target.value) || 4)} className="w-12 bg-transparent border-b-2 border-[var(--cordel-border)] text-center font-bold font-cactus outline-none text-[var(--cordel-text)]" />
          </div>          <div className="flex gap-2 items-start w-full">
            {inst.type === 'voice' ? (
              <div className="grid grid-cols-4 gap-1.5 w-full step-boxes">
                {Array.from({ length: activePattern.steps }).map((_, i) => {
                  const state = activePattern.activeSteps[i];
                  const isActive = state !== 0;
                  const isPux = state === 'P';
                  const syl = activePattern.lyrics?.[i] || '';
                  const note = activePattern.notes?.[i] || '';
                  const typeText = isActive ? (isPux ? 'PUX' : 'CORO') : '---';
                  const typeClass = isActive ? '' : 'bg-transparent text-[var(--cordel-text)]/40';
                  const typeStyle = isActive ? { backgroundColor: isPux ? inst.colors['P'] : inst.colors['C'], color: '#1a1a1a' } : {};

                  return (
                    <div key={i} className={`v-card flex flex-col bg-[var(--cordel-bg)] cordel-border-sm overflow-hidden ${currentStep === i ? 'border-[#8b2a1a]' : 'border-[var(--cordel-border)]'}`}>
                      <div onClick={() => onVoiceTypeToggle(activePattern.id, i)} className={`text-[9px] font-bold text-center py-0.5 cursor-pointer select-none uppercase ${typeClass}`} style={typeStyle}>{typeText}</div>
                      <input type="text" value={syl} onChange={(e) => onVoiceSylChange(activePattern.id, i, e.target.value)} placeholder="-" className="v-syl w-full text-center text-xs font-bold py-1 bg-transparent border-b border-[var(--cordel-border)]/30 text-[var(--cordel-text)] outline-none" onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'syl'); } else if (['ArrowRight','ArrowLeft','Enter'].includes(e.key)) handleVoiceNav(e.target as HTMLInputElement, e.key, 'syl'); }} />
                      <input type="text" value={note} onChange={(e) => onVoiceNoteChange(activePattern.id, i, e.target.value)} onBlur={(e) => onVoiceNoteBlur(activePattern.id, i, e.target.value)} placeholder="C4" className="v-note w-full text-center text-[10px] py-1 bg-transparent text-[var(--cordel-text)] uppercase outline-none" onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'note'); } else if (['ArrowRight','ArrowLeft','Enter'].includes(e.key)) handleVoiceNav(e.target as HTMLInputElement, e.key, 'note'); }} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid gap-y-2 gap-x-1 w-full justify-start step-boxes" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr)) 8px repeat(4, minmax(0, 1fr))' }}>
                {Array.from({ length: activePattern.steps }).reduce((acc: React.ReactNode[], _, i) => {
                  if (i > 0 && i % 4 === 0 && i % 8 !== 0) acc.push(<div key={`spacer-${i}`} />);
                  const val = activePattern.activeSteps[i];
                  let displayVal = val === 0 ? '' : String(val);
                  if (val !== 0 && inst.type === 'gongue') {
                    if (val === 'GRV') displayVal = 'G'; else if (val === 'grv') displayVal = 'g'; else if (val === 'AIG') displayVal = 'A'; else if (val === 'aig') displayVal = 'a';
                  }

                  let isBeatBound = false;
                  if (timeSig === '6/8' || timeSig === '12/8') { if ((i + 1) % 3 === 0) isBeatBound = true; }
                  else if (timeSig === '3/4') { if ((i + 1) % 2 === 0) isBeatBound = true; }
                  else { if ((i + 1) % 4 === 0) isBeatBound = true; }

                  const isActive = val !== 0;
                  const stepColor = isActive ? (inst.colors[val as any] || 'var(--cordel-text)') : 'transparent';
                  const textColor = isActive ? (inst.colors.text || 'var(--cordel-bg)') : 'var(--cordel-text)';

                  acc.push(
                    <input
                      key={i}
                      type="text"
                      maxLength={inst.id === 'caixa' ? 2 : 1}
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
                        const isCtrlOrMeta = e.ctrlKey || e.metaKey;
                        if ((isCtrlOrMeta && e.key.toLowerCase() === 'c') || e.key.toLowerCase() === 'c') {
                          e.preventDefault();
                          onCopyPattern && onCopyPattern(activePattern);
                          return;
                        }
                        if ((isCtrlOrMeta && e.key.toLowerCase() === 'v') || e.key.toLowerCase() === 'v') {
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
                        onStepKeyDown(activePattern.id, i, e.key, displayVal, e.target as HTMLInputElement);
                      }}
                      style={{ backgroundColor: isActive ? stepColor : undefined, color: isActive ? textColor : undefined }}
                      className={`w-6 h-6 text-center text-xs font-bold font-sans cordel-border-sm outline-none transition-colors border-[2px] ${currentStep === i ? 'border-[#f1c40f] scale-110 shadow-[0_0_8px_#f1c40f] z-10 relative' : 'border-[var(--cordel-border)]'} ${!isActive ? 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]' : ''} ${isBeatBound ? 'mr-1' : ''}`}
                    />
                  );
                  return acc;
                }, [] as React.ReactNode[])}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fader & Mute/Solo Section (Bottom) */}
      <div className="relative z-10 p-4 pt-4 flex justify-between items-end h-[200px] gap-2">
        {/* Buttons Column */}
        <div className="flex flex-col gap-2 justify-end h-full pb-1">
          <PanKnob value={track.panVal || 0} onChange={onPanChange} label="Pan" />
          <div className="h-1" />
          <button onClick={onMuteToggle} className={`w-9 h-9 cordel-border-sm cordel-button font-bold text-xs flex items-center justify-center transition-all ${track.isMute ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'}`}>M</button>
          <button onClick={onSoloToggle} className={`w-9 h-9 cordel-border-sm cordel-button font-bold text-xs flex items-center justify-center transition-all ${track.isSolo ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'}`}>S</button>
        </div>

        {/* Volume Fader Column */}
        <div className="flex flex-col items-center gap-1.5 h-full">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">Volume</span>
          <div className="h-[145px] flex justify-center items-center relative w-12">
            {/* Fader Slot */}
            <div className="absolute top-0 bottom-0 w-1.5 bg-[var(--cordel-border)] rounded-none border-x border-[var(--cordel-bg)] pointer-events-none"></div>
            <input
              type="range"
              min="0"
              max="100"
              orient="vertical"
              value={track.volumeVal}
              onChange={(e) => onVolumeChange(parseInt(e.target.value))}
              className="vertical-fader z-10 h-[130px] w-8 cursor-pointer"
            />
          </div>
          <span className="text-[10px] font-bold text-[var(--cordel-text)]">{track.volumeVal}</span>
        </div>

        {/* Reverb Fader Column */}
        <div className="flex flex-col items-center gap-1.5 h-full">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">Reverb</span>
          <div className="h-[145px] flex justify-center items-center relative w-12">
            {/* Fader Slot */}
            <div className="absolute top-0 bottom-0 w-1.5 bg-[var(--cordel-border)] rounded-none border-x border-[var(--cordel-bg)] pointer-events-none"></div>
            <input
              type="range"
              min="0"
              max="100"
              orient="vertical"
              value={track.reverbVal || 0}
              onChange={(e) => onReverbChange(parseInt(e.target.value))}
              className="vertical-fader z-10 h-[130px] w-8 cursor-pointer"
            />
          </div>
          <span className="text-[10px] font-bold text-[var(--cordel-text)]">{track.reverbVal || 0}</span>
        </div>

        {/* LED Meter */}
        <div className="flex flex-col items-center gap-1.5 h-full">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">Meter</span>
          <div className="w-3 h-[145px] bg-[var(--cordel-bg)] cordel-border-sm relative overflow-hidden">
            <div
              id={`meter-bar-${track.id}`}
              className="meter-vertical absolute bottom-0 left-0 right-0 bg-[var(--cordel-border)] w-full transition-all duration-[0.05s]"
              style={{ height: '0%' }}
            />
          </div>
          <div className="h-[15px]" />
        </div>
      </div>
    </div>
  );
};
