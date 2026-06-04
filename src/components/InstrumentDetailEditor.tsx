import React, { useCallback, useState } from 'react';
import { TrackGroup, Language } from '../types';
import { i18n, instrumentsConfig, ASSETS_BASE_URL } from '../data';

interface InstrumentDetailEditorProps {
  lang: Language;
  track: TrackGroup;
  onClose: () => void;
  onStepValueChange: (patternId: number, stepIdx: number, val: string) => void;
  onStepKeyDown: (patternId: number, stepIdx: number, key: string, currentVal: string, targetEl: HTMLInputElement) => void;
  onStepsChange: (patternId: number, steps: number) => void;
  onVoiceTypeToggle: (patternId: number, stepIdx: number) => void;
  onVoiceSylChange: (patternId: number, stepIdx: number, val: string) => void;
  onVoiceNoteChange: (patternId: number, stepIdx: number, val: string) => void;
  onVoiceNoteBlur: (patternId: number, stepIdx: number, val: string) => void;
  onAddPattern: () => void;
  onDeletePattern: (patternId: number) => void;
  onSelectPattern: (patternId: number) => void;
  onPatternAssign: (patternId: number, measureIdx: number, val: boolean) => void;
  onVolumeChange: (val: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  onStepVolumeChange: (patternId: number, stepIdx: number, val: number) => void;
  onStepDecayChange: (patternId: number, stepIdx: number, val: number) => void;
  onStepMicrotimingChange: (patternId: number, stepIdx: number, val: number) => void;
  isSwingOn: boolean;
  isPlaying: boolean;
  currentStepIndex: number;
  currentMeasure: number;
  maxTicks: number;
  totalMeasures: number;
}

/* ── Stroke legend definitions ─────────────────────────────── */

interface StrokeDef {
  symbol: string;
  label: string;
  shortcut: string;
  colorKey: string;
}

function getStrokesForInstrument(instId: string, instType: string): StrokeDef[] {
  if (instId === 'caixa') {
    return [
      { symbol: 'D/d', label: 'Mão Direita', shortcut: 'D / d', colorKey: 'D' },
      { symbol: 'G/g', label: 'Mão Esquerda', shortcut: 'G / g', colorKey: 'G' },
      { symbol: 'rd', label: 'Rufada Direita', shortcut: 'R → rd', colorKey: 'rd' },
      { symbol: 'rg', label: 'Rufada Esquerda', shortcut: 'E → rg', colorKey: 'rf' },
      { symbol: 'x', label: 'Cerclage', shortcut: 'X → x', colorKey: 'x' },
      { symbol: 'f', label: 'Fla', shortcut: 'F → f', colorKey: 'f' },
      { symbol: 'b', label: 'Barulho', shortcut: 'B → b', colorKey: 'b' },
    ];
  }
  if (instId === 'marcante' || instId === 'meiao' || instId === 'repique') {
    return [
      { symbol: 'D/d', label: 'Mão Direita', shortcut: 'D / d', colorKey: 'D' },
      { symbol: 'G/g', label: 'Mão Esquerda', shortcut: 'G / g', colorKey: 'G' },
      { symbol: 'b', label: 'Barulho', shortcut: 'B → b', colorKey: 'b' },
      { symbol: 'x', label: 'Cerclage', shortcut: 'X → x', colorKey: 'x' },
      { symbol: 'i', label: 'Iguarassu', shortcut: 'I → i', colorKey: 'i' },
    ];
  }
  if (instType === 'gongue') {
    return [
      { symbol: 'G/g', label: 'Grave', shortcut: 'G / g', colorKey: 'GRV' },
      { symbol: 'A/a', label: 'Aigu', shortcut: 'A / a', colorKey: 'AIG' },
      { symbol: 'b', label: 'Barulho', shortcut: 'B → b', colorKey: 'b' },
    ];
  }
  if (instId === 'agbe') {
    return [
      { symbol: 'G/g', label: 'Esquerda', shortcut: 'G / g', colorKey: 'G' },
      { symbol: 'D/d', label: 'Direita', shortcut: 'D / d', colorKey: 'D' },
      { symbol: 'b', label: 'Barulho', shortcut: 'B → b', colorKey: 'b' },
      { symbol: 's', label: 'Saut', shortcut: 'S → s', colorKey: 's' },
    ];
  }
  if (instId === 'mineiro') {
    return [
      { symbol: 'P/p', label: 'Push (Cima)', shortcut: 'P / p', colorKey: 'P' },
      { symbol: 'T/t', label: 'Pull (Baixo)', shortcut: 'T / t', colorKey: 'T' },
    ];
  }
  if (instType === 'voice') {
    return [
      { symbol: 'P', label: 'Puxador', shortcut: 'Click top', colorKey: 'P' },
      { symbol: 'C', label: 'Coro', shortcut: 'Click top', colorKey: 'C' },
    ];
  }
  return [];
}

/* ── Step options ───────────────────────────────────────────── */
const STEP_OPTIONS = [4, 8, 12, 16, 24, 32];

/* ── Component ─────────────────────────────────────────────── */

export const InstrumentDetailEditor: React.FC<InstrumentDetailEditorProps> = ({
  lang,
  track,
  onClose,
  onStepValueChange,
  onStepKeyDown,
  onStepsChange,
  onVoiceTypeToggle,
  onVoiceSylChange,
  onVoiceNoteChange,
  onVoiceNoteBlur,
  onAddPattern,
  onDeletePattern,
  onSelectPattern,
  onPatternAssign,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  onStepVolumeChange,
  onStepDecayChange,
  onStepMicrotimingChange,
  isSwingOn,
  isPlaying,
  currentStepIndex,
  currentMeasure,
  maxTicks,
  totalMeasures,
}) => {
  const inst = instrumentsConfig[track.instrumentIdx];
  const t = (key: string) => (i18n[lang] as any)[key] || key;

  const [selectedStepIdx, setSelectedStepIdx] = useState<number | null>(null);
  const [selectedPatternId, setSelectedPatternId] = useState<number | null>(null);
  const [mouseDownOnBackdrop, setMouseDownOnBackdrop] = useState(false);

  const strokes = getStrokesForInstrument(inst.id, inst.type);

  /* Voice input navigation helper */
  const handleVoiceNav = useCallback((el: HTMLInputElement, key: string, type: 'syl' | 'note') => {
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
  }, []);

  /* Compute current playing step for a given pattern */
  const getCurrentStep = (patternSteps: number) => {
    if (!isPlaying || currentStepIndex < 0) return -1;
    return Math.floor((currentStepIndex / maxTicks) * patternSteps);
  };

  /* Compute global swing offset for a step index */
  const getStepSwingPercent = (stepIdx: number, steps: number) => {
    if (!isSwingOn) return 0;
    const posInBeat = ((stepIdx / (steps / 4)) % 1) * 4;
    const posInGroup = Math.round(posInBeat) % 4;
    if (posInGroup === 0) return 5;
    if (posInGroup === 1) return 15;
    if (posInGroup === 2) return 2;
    if (posInGroup === 3) return -10;
    return 0;
  };

  /* Gongue display value mapping */
  const getDisplayVal = (val: string | number): string => {
    if (val === 0) return '';
    if (inst.type === 'gongue') {
      if (val === 'GRV') return 'G';
      if (val === 'grv') return 'g';
      if (val === 'AIG') return 'A';
      if (val === 'aig') return 'a';
    }
    return String(val);
  };

  /* Secure backdrop clicks by validating where mousedown started */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setMouseDownOnBackdrop(true);
    } else {
      setMouseDownOnBackdrop(false);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && mouseDownOnBackdrop) {
      onClose();
    }
    setMouseDownOnBackdrop(false);
  };

  /* Close on Escape */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.72)' }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <div
        className="bg-[#f4ecd8] cordel-border-sm text-[#1a1a1a] flex flex-col relative overflow-hidden"
        style={{
          maxWidth: '1200px',
          width: '95vw',
          maxHeight: '80vh',
          boxShadow: '8px 8px 0px 0px #1a1a1a',
        }}
      >

        {/* ═══════════════════ HEADER BAR ═══════════════════ */}
        <div
          className="flex items-center gap-3 px-5 py-3 border-b-[3px] border-[#1a1a1a] shrink-0"
          style={{ backgroundColor: inst.mixerBg, color: inst.colors.text }}
        >
          {/* Instrument icon + name */}
          <img
            src={`${ASSETS_BASE_URL}${inst.iconImg}`}
            alt={inst.name}
            className="w-8 h-8 object-contain"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <span className="font-cactus font-bold text-lg tracking-wide mr-auto">
            {inst.name}
          </span>

          {/* Volume slider */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase opacity-70">Vol</span>
            <input
              type="range"
              min="0"
              max="100"
              value={track.volumeVal}
              onChange={(e) => onVolumeChange(parseInt(e.target.value))}
              className="w-24 h-2 bg-[#1a1a1a] border border-[#f4ecd8] rounded-none outline-none cursor-pointer accent-[#f4ecd8]"
            />
            <span className="text-[11px] font-bold w-7 text-right">{track.volumeVal}</span>
          </div>

          {/* Mute */}
          <button
            onClick={onMuteToggle}
            className={`w-8 h-8 cordel-border-sm cordel-button text-xs font-bold cursor-pointer transition-all flex items-center justify-center ${
              track.isMute
                ? 'bg-[#8b2a1a] text-[#f4ecd8]'
                : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
            }`}
          >
            M
          </button>

          {/* Solo */}
          <button
            onClick={onSoloToggle}
            className={`w-8 h-8 cordel-border-sm cordel-button text-xs font-bold cursor-pointer transition-all flex items-center justify-center ${
              track.isSolo
                ? 'bg-[#1a1a1a] text-[#f4ecd8]'
                : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
            }`}
          >
            S
          </button>


          {/* Close */}
          <button
            onClick={onClose}
            className="w-8 h-8 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm cordel-button font-bold text-sm flex items-center justify-center hover:bg-[#1a1a1a] cursor-pointer transition-colors ml-2"
          >
            ✕
          </button>
        </div>

        {/* ═══════════════════ BODY: Content + Legend sidebar ═══════════════════ */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* ─── Main scrollable content ─── */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6" style={{ minWidth: 0 }}>

            {track.patterns.map((ptn, ptnIdx) => {
              const isSelected = track.selectedPatternId === ptn.id;
              const currentStep = getCurrentStep(ptn.steps);
              const isCurrentPlaying = isPlaying && ptn.measureAssignments[currentMeasure];

              return (
                <div
                  key={ptn.id}
                  className={`cordel-border-sm p-4 flex flex-col gap-3 transition-colors ${
                    isSelected ? 'bg-[#f4ecd8]' : 'bg-[#ece4d0]'
                  }`}
                  style={{
                    boxShadow: isCurrentPlaying ? '4px 4px 0px 0px #8b2a1a' : (isSelected ? '4px 4px 0px 0px #1a1a1a' : '2px 2px 0px 0px #bbb'),
                    borderColor: isCurrentPlaying ? '#8b2a1a' : (isSelected ? '#1a1a1a' : '#999'),
                    borderWidth: isCurrentPlaying ? '3px' : '2px',
                  }}
                >
                  {/* Pattern header */}
                  <div className="flex items-center gap-3 border-b-[2px] border-[#1a1a1a] pb-2">
                    <input
                      type="radio"
                      checked={isSelected}
                      onChange={() => onSelectPattern(ptn.id)}
                      className="w-4 h-4 accent-[#1a1a1a] cursor-pointer"
                    />
                    <span
                      className={`font-cactus font-bold cursor-pointer ${
                        isSelected ? 'text-[#1a1a1a] text-base' : 'text-[#666] text-sm'
                      }`}
                      onClick={() => onSelectPattern(ptn.id)}
                    >
                      {lang === 'fr' ? 'Motif' : 'Padrão'} {ptnIdx + 1}
                      {ptn.name ? ` — ${ptn.name}` : ''}
                    </span>

                    {isCurrentPlaying && (
                      <span className="bg-[#8b2a1a] text-[#f4ecd8] text-[9px] uppercase px-1.5 py-0.5 cordel-border-sm font-bold flex items-center gap-1 animate-pulse select-none">
                        ▶ {lang === 'fr' ? 'Actif' : 'Ativo'}
                      </span>
                    )}

                    {/* Steps selector */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="text-[11px] font-bold uppercase">{t('stepsNum')}</span>
                      <select
                        value={ptn.steps}
                        onChange={(e) => onStepsChange(ptn.id, parseInt(e.target.value))}
                        className="bg-[#f4ecd8] text-[#1a1a1a] cordel-border-sm px-2 py-0.5 text-xs font-bold cursor-pointer outline-none font-cactus"
                      >
                        {STEP_OPTIONS.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>

                    {/* Delete pattern */}
                    {track.patterns.length > 1 && (
                      <button
                        onClick={() => onDeletePattern(ptn.id)}
                        className="text-[#8b2a1a] font-bold text-xs px-2 py-1 cordel-border-sm cordel-button hover:bg-[#8b2a1a] hover:text-[#f4ecd8] transition-colors cursor-pointer"
                      >
                        ✕ {lang === 'fr' ? 'Suppr.' : 'Excluir'}
                      </button>
                    )}
                  </div>

                  {/* Measure assignments */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase text-[#666]">
                      {lang === 'fr' ? 'Mesures' : 'Compassos'}:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: totalMeasures }).map((_, mIdx) => {
                        const isChecked = ptn.measureAssignments[mIdx] || false;
                        const isCurrent = isPlaying && currentMeasure === mIdx;
                        return (
                          <label
                            key={mIdx}
                            className="flex flex-col items-center cursor-pointer group"
                            title={`${lang === 'fr' ? 'Mesure' : 'Compasso'} ${mIdx + 1}`}
                          >
                            <span className={`text-[9px] font-bold ${
                              isCurrent ? 'text-[#8b2a1a]' : isChecked ? 'text-[#1a1a1a]' : 'text-[#999]'
                            }`}>
                              {mIdx + 1}
                            </span>
                            <div
                              className={`w-5 h-5 cordel-border-sm flex items-center justify-center transition-colors ${
                                isChecked
                                  ? 'bg-[#1a1a1a]'
                                  : 'bg-[#f4ecd8]'
                              } ${isCurrent ? 'border-[#8b2a1a]' : ''} group-hover:bg-[#1a1a1a]`}
                            >
                              {isChecked && <span className="text-[#f4ecd8] text-[10px] font-bold leading-none">×</span>}
                            </div>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={isChecked}
                              onChange={(e) => onPatternAssign(ptn.id, mIdx, e.target.checked)}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step grid */}
                  {inst.type === 'voice' ? (
                    /* ──── Voice step grid ──── */
                    <div
                      className="step-boxes flex flex-wrap gap-y-4 gap-x-4"
                      id={`detail-voice-${track.id}-${ptn.id}`}
                    >
                      {Array.from({ length: ptn.steps }).map((_, i) => {
                        const state = ptn.activeSteps[i];
                        const isActive = state !== 0;
                        const isPux = state === 'P';
                        const syl = ptn.lyrics?.[i] || '';
                        const note = ptn.notes?.[i] || '';
                        const typeText = isActive ? (isPux ? 'PUX' : 'CORO') : '---';
                        const typeClass = isActive ? '' : 'bg-transparent text-[#666]';
                        const typeStyle = isActive
                          ? { backgroundColor: isPux ? inst.colors['P'] : inst.colors['C'], color: '#1a1a1a' }
                          : {};

                        const isCurrentStep = currentStep === i;

                        // Calculate total micro-timing shift (manual + global swing)
                        const manualMicro = ptn.microtimings?.[i] ?? 0;
                        const swingOffset = getStepSwingPercent(i, ptn.steps);
                        const totalShift = manualMicro + swingOffset;
                        const shiftPx = (totalShift / 50) * 12; // Max 12px shift

                        return (
                          <div key={i} className="relative" style={{ width: '56px' }}>
                            {/* Axis vertical centerline (0%) behind steps */}
                            <div className="absolute top-[20px] bottom-[10px] left-1/2 w-0 border-l border-dashed border-[#1a1a1a]/30 -translate-x-1/2 pointer-events-none z-0" />
                            
                            <div
                              className={`v-card flex flex-col bg-[#f4ecd8] cordel-border-sm overflow-hidden z-10 relative transition-transform duration-100 ${
                                isCurrentStep ? 'border-[#8b2a1a] shadow-[0_0_8px_rgba(139,42,26,0.5)]' : 'border-[#1a1a1a]'
                              }`}
                              style={{
                                width: '56px',
                                transform: `translateX(${shiftPx}px)`,
                              }}
                            >
                              {/* Step number */}
                              <div className="text-[8px] text-[#999] text-center font-bold bg-[#ece4d0] leading-tight py-0.5">
                                {i + 1}
                              </div>

                              {/* PUX / CORO toggle */}
                              <div
                                onClick={() => onVoiceTypeToggle(ptn.id, i)}
                                className={`text-[9px] font-bold text-center py-0.5 cursor-pointer select-none uppercase ${typeClass}`}
                                style={typeStyle}
                              >
                                {typeText}
                              </div>

                              {/* Syllable input */}
                              <input
                                type="text"
                                value={syl}
                                onChange={(e) => onVoiceSylChange(ptn.id, i, e.target.value)}
                                placeholder="-"
                                className="v-syl w-full text-center text-xs font-bold py-1 bg-transparent border-0 border-b border-[#1a1a1a]/30 text-[#1a1a1a] outline-none"
                                onFocus={() => {
                                  setSelectedStepIdx(i);
                                  setSelectedPatternId(ptn.id);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Tab') {
                                    e.preventDefault();
                                    handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'syl');
                                  } else if (['ArrowRight', 'ArrowLeft', 'Enter'].includes(e.key)) {
                                    handleVoiceNav(e.target as HTMLInputElement, e.key, 'syl');
                                  }
                                }}
                              />

                              {/* Note input */}
                              <input
                                type="text"
                                value={note}
                                onChange={(e) => onVoiceNoteChange(ptn.id, i, e.target.value)}
                                onBlur={(e) => onVoiceNoteBlur(ptn.id, i, e.target.value)}
                                placeholder="C4"
                                className="v-note w-full text-center text-[10px] py-1 bg-transparent border-0 text-[#1a1a1a] uppercase outline-none"
                                onFocus={() => {
                                  setSelectedStepIdx(i);
                                  setSelectedPatternId(ptn.id);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Tab') {
                                    e.preventDefault();
                                    handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'note');
                                  } else if (['ArrowRight', 'ArrowLeft', 'Enter'].includes(e.key)) {
                                    handleVoiceNav(e.target as HTMLInputElement, e.key, 'note');
                                  }
                                }}
                              />
                              {/* Sculpting micro-bars */}
                              <div className="w-full flex flex-col gap-[2px] p-[2px] bg-[#ece4d0] border-t border-[#1a1a1a]/20 shrink-0">
                                <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
                                  <div className="h-[2px] bg-green-600 rounded-none transition-all" style={{ width: `${ptn.volumes?.[i] ?? 100}%` }} />
                                </div>
                                <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
                                  <div className="h-[2px] bg-amber-500 rounded-none transition-all" style={{ width: `${ptn.decays?.[i] ?? 100}%` }} />
                                </div>
                                <div className="h-[3px] bg-[#1a1a1a]/15 w-full relative overflow-hidden">
                                  <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#1a1a1a]/30" />
                                  {totalShift !== 0 && (
                                    <div
                                      className="absolute top-0 bottom-0 bg-[#2980b9] transition-all"
                                      style={{
                                        left: totalShift > 0 ? '50%' : 'auto',
                                        right: totalShift < 0 ? '50%' : 'auto',
                                        width: `${Math.min(50, (Math.abs(totalShift) / 50) * 50)}%`
                                      }}
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* ──── Instrument step grid ──── */
                    <div
                      className="step-boxes flex flex-wrap gap-y-4 gap-x-6"
                      id={`detail-steps-${track.id}-${ptn.id}`}
                    >
                      {Array.from({ length: ptn.steps }).map((_, i) => {
                        const val = ptn.activeSteps[i];
                        const displayVal = getDisplayVal(val);
                        const isActive = val !== 0 && val !== '';
                        const isCurrentStep = currentStep === i;

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

                        /* Beat boundary spacing */
                        const isBeatStart = i > 0 && i % 4 === 0;

                        // Calculate total micro-timing shift (manual + global swing)
                        const manualMicro = ptn.microtimings?.[i] ?? 0;
                        const swingOffset = getStepSwingPercent(i, ptn.steps);
                        const totalShift = manualMicro + swingOffset;
                        const shiftPx = (totalShift / 50) * 12; // Max 12px shift

                        return (
                          <React.Fragment key={i}>
                            {isBeatStart && (
                              <div className="w-1.5 shrink-0" />
                            )}
                            <div className="relative flex flex-col items-center" style={{ width: '36px' }}>
                              {/* Axis vertical centerline (0%) behind steps */}
                              <div className="absolute top-[12px] bottom-[15px] left-1/2 w-0 border-l border-dashed border-[#1a1a1a]/30 -translate-x-1/2 pointer-events-none z-0" />

                              <div className="text-[8px] text-[#999] font-bold mb-0.5 z-10 relative">{i + 1}</div>
                              <input
                                type="text"
                                maxLength={inst.id === 'caixa' ? 2 : 1}
                                value={displayVal}
                                onFocus={(e) => {
                                  e.target.select();
                                  setSelectedStepIdx(i);
                                  setSelectedPatternId(ptn.id);
                                }}
                                onChange={(e) => onStepValueChange(ptn.id, i, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Tab' || e.key === 'Enter') e.preventDefault();
                                  const inputEl = e.currentTarget as HTMLInputElement;
                                  onStepKeyDown(ptn.id, i, e.key, inputEl.value, inputEl);
                                }}
                                className={`text-center text-sm font-bold cordel-border-sm outline-none p-0 box-border z-10 relative transition-all duration-200 ${
                                  isCurrentStep
                                    ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#8b2a1a] scale-110 shadow-[0_0_8px_rgba(139,42,26,0.6)]'
                                    : val === 0
                                      ? 'bg-[#f4ecd8] text-[#1a1a1a] focus:border-[#8b2a1a]'
                                      : ''
                                }`}
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  transform: `translateX(${shiftPx}px)`,
                                  ...(isCurrentStep ? {} : colorStyle),
                                }}
                              />
                              {/* Sculpting micro-bars */}
                              <div className="w-full flex flex-col gap-[2px] mt-1 z-10 relative">
                                {/* Volume bar (Green) */}
                                <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
                                  <div className="h-full bg-green-600 transition-all" style={{ width: `${ptn.volumes?.[i] ?? 100}%` }} />
                                </div>
                                {/* Decay bar (Amber) */}
                                <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
                                  <div className="h-full bg-amber-500 transition-all" style={{ width: `${ptn.decays?.[i] ?? 100}%` }} />
                                </div>
                                {/* Micro-timing bar (Blue bi-directional) */}
                                <div className="h-[3px] bg-[#1a1a1a]/15 w-full relative overflow-hidden">
                                  <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#1a1a1a]/30" />
                                  {totalShift !== 0 && (
                                    <div
                                      className="absolute top-0 bottom-0 bg-[#2980b9] transition-all"
                                      style={{
                                        left: totalShift > 0 ? '50%' : 'auto',
                                        right: totalShift < 0 ? '50%' : 'auto',
                                        width: `${Math.min(50, (Math.abs(totalShift) / 50) * 50)}%`
                                      }}
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}

                  {/* Step Sculptor Panel for this pattern */}
                  {selectedPatternId === ptn.id && selectedStepIdx !== null && (
                    <div className="bg-[#ece4d0] cordel-border-sm p-3 mt-3 flex flex-col gap-2 shrink-0">
                      <div className="flex items-center justify-between text-xs border-b border-[#1a1a1a]/20 pb-1.5 text-[#1a1a1a]">
                        <span className="font-bold">
                          🎛️ {lang === 'fr' ? 'Sculpteur' : 'Escultor'} — {lang === 'fr' ? 'Pas' : 'Passo'} {selectedStepIdx + 1}
                          {(() => {
                            const stepVal = ptn.activeSteps[selectedStepIdx];
                            return ` (${stepVal === 0 ? (lang === 'fr' ? 'Silence' : 'Silêncio') : `${lang === 'fr' ? 'Coup' : 'Golpe'}: ${stepVal}`})`;
                          })()}
                        </span>
                        <button 
                          onClick={() => {
                            onStepVolumeChange(ptn.id, selectedStepIdx, 100);
                            onStepDecayChange(ptn.id, selectedStepIdx, 100);
                            onStepMicrotimingChange(ptn.id, selectedStepIdx, 0);
                          }}
                          className="text-[#8b2a1a] font-bold text-[10px] uppercase hover:underline cursor-pointer"
                        >
                          {lang === 'fr' ? 'Réinitialiser' : 'Resetar'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[#1a1a1a]">
                        {/* Volume slider */}
                        <div className="flex flex-col gap-0.5">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span>🔊 Volume</span>
                            <span>{ptn.volumes?.[selectedStepIdx] ?? 100}%</span>
                          </div>
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            value={ptn.volumes?.[selectedStepIdx] ?? 100}
                            onChange={(e) => onStepVolumeChange(ptn.id, selectedStepIdx, parseInt(e.target.value))}
                            className="w-full accent-green-600 cursor-pointer h-2 bg-[#1a1a1a]/10"
                          />
                        </div>

                        {/* Decay slider */}
                        <div className="flex flex-col gap-0.5">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span>⏳ {lang === 'fr' ? 'Résonance' : 'Ressonância'} (Decay)</span>
                            <span>{ptn.decays?.[selectedStepIdx] ?? 100}%</span>
                          </div>
                          <input 
                            type="range"
                            min="10"
                            max="100"
                            value={ptn.decays?.[selectedStepIdx] ?? 100}
                            onChange={(e) => onStepDecayChange(ptn.id, selectedStepIdx, parseInt(e.target.value))}
                            className="w-full accent-amber-500 cursor-pointer h-2 bg-[#1a1a1a]/10"
                          />
                        </div>

                        {/* Micro-timing slider */}
                        <div className="flex flex-col gap-0.5">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span>⏱️ Micro-timing ({lang === 'fr' ? 'Décalage' : 'Desvio'})</span>
                            <span>
                              {ptn.microtimings?.[selectedStepIdx] !== undefined
                                ? (ptn.microtimings[selectedStepIdx] > 0 ? `+${ptn.microtimings[selectedStepIdx]}` : ptn.microtimings[selectedStepIdx])
                                : 0}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2 relative h-6">
                            <span className="text-[8px] font-bold opacity-60 shrink-0">-50%</span>
                            <div className="flex-grow h-2 relative flex items-center">
                              {/* Background track with a center notch */}
                              <div className="absolute inset-x-0 h-1 bg-[#1a1a1a]/15 rounded" />
                              <div className="absolute left-1/2 -translate-x-1/2 w-[2px] h-3 bg-[#1a1a1a]/40 z-10" />
                              
                              {/* Bi-directional Blue track representing offset from center */}
                              {(() => {
                                const val = ptn.microtimings?.[selectedStepIdx] ?? 0;
                                if (val !== 0) {
                                  const widthPercent = Math.min(50, Math.abs(val)); // half-width is 50%
                                  return (
                                    <div
                                      className="absolute h-1 bg-[#2980b9]"
                                      style={{
                                        left: val > 0 ? '50%' : 'auto',
                                        right: val < 0 ? '50%' : 'auto',
                                        width: `${widthPercent}%`
                                      }}
                                    />
                                  );
                                }
                                return null;
                              })()}

                              <input
                                type="range"
                                min="-50"
                                max="50"
                                value={ptn.microtimings?.[selectedStepIdx] ?? 0}
                                onChange={(e) => onStepMicrotimingChange(ptn.id, selectedStepIdx, parseInt(e.target.value))}
                                className="absolute inset-x-0 w-full h-4 opacity-100 cursor-pointer slider-transparent-track"
                              />
                            </div>
                            <span className="text-[8px] font-bold opacity-60 shrink-0">+50%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            );
          })}

          {/* Add pattern button */}
          <button
            onClick={onAddPattern}
            className="self-start bg-[#f4ecd8] text-[#1a1a1a] cordel-border-sm cordel-button px-4 py-2 font-cactus font-bold text-sm cursor-pointer hover:bg-[#1a1a1a] hover:text-[#f4ecd8] transition-colors"
          >
            + {lang === 'fr' ? 'Ajouter un motif' : 'Adicionar padrão'}
          </button>
        </div>

          {/* ─── Right sidebar: Stroke legend ─── */}
          <div
            className="border-l-[3px] border-[#1a1a1a] bg-[#ece4d0] p-4 shrink-0 overflow-y-auto flex flex-col gap-4"
            style={{ width: '240px' }}
          >
            {/* Legend title */}
            <div className="border-b-[2px] border-[#1a1a1a] pb-2">
              <h3 className="font-cactus font-bold text-sm uppercase tracking-wide">
                {t('legend')}
              </h3>
              <p className="text-[10px] text-[#666] mt-0.5">{inst.name}</p>
            </div>

            {/* Gold rule */}
            {inst.type !== 'voice' && (
              <div className="bg-[#f4ecd8] cordel-border-sm p-2.5 text-[10px] text-[#1a1a1a]">
                <p className="font-bold mb-1">💡 {lang === 'fr' ? "Règle d'or" : 'Regra de ouro'}:</p>
                <p>• {lang === 'fr' ? 'Majuscule = Coup Fort' : 'Maiúscula = Golpe Forte'}</p>
                <p>• {lang === 'fr' ? 'Minusc. = Coup Faible' : 'Minúscula = Golpe Fraco'}</p>
              </div>
            )}

            {/* Sculpting Legend */}
            <div className="bg-[#f4ecd8] cordel-border-sm p-2.5 text-[10px] flex flex-col gap-1.5 text-[#1a1a1a]">
              <p className="font-bold">🎛️ {lang === 'fr' ? 'Sculpture du son' : 'Escultura do som'}:</p>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-1 bg-green-600 shrink-0" />
                <span>{lang === 'fr' ? 'Volume du pas (0-100%)' : 'Volume do passo (0-100%)'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-1 bg-amber-500 shrink-0" />
                <span>{lang === 'fr' ? 'Résonance/Decay (10-100%)' : 'Ressonância/Decay (10-100%)'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-1.5 bg-[#2980b9] shrink-0" />
                <span>
                  {lang === 'fr'
                    ? 'Micro-timing (Gauche: Avance, Droite: Retard)'
                    : 'Micro-timing (Esquerda: Avanço, Direita: Atraso)'}
                </span>
              </div>
              <p className="text-[9px] text-[#666] mt-0.5 leading-tight">
                {lang === 'fr' 
                  ? 'Cliquez sur un pas pour afficher ses curseurs sous le motif.' 
                  : 'Clique em um passo para exibir seus controles sob o padrão.'}
              </p>
            </div>

            {/* Voice-specific instructions */}
            {inst.type === 'voice' && (
              <div className="bg-[#f4ecd8] cordel-border-sm p-2.5 text-[10px] flex flex-col gap-1">
                <p className="font-bold">🎤 {lang === 'fr' ? 'Voix / Chœur' : 'Voz / Coro'}</p>
                <p>{lang === 'fr'
                  ? 'Cliquez en haut de la case (PUX/CORO) pour changer qui chante.'
                  : 'Clique no topo da caixa (PUX/CORO) para alterar quem canta.'
                }</p>
                <p>{lang === 'fr'
                  ? 'Puxador: Orange (Aigu). Chœur: Cyan (Grave).'
                  : 'Puxador: Laranja (Agudo). Coro: Ciano (Grave).'
                }</p>
              </div>
            )}

            {/* Stroke list */}
            <div className="flex flex-col gap-2">
              {strokes.map((stroke, sIdx) => {
                const bgColor = inst.colors[stroke.colorKey] || '#666';
                const txtColor = inst.colors.text || '#f4ecd8';

                return (
                  <div key={sIdx} className="flex items-center gap-2.5">
                    {/* Color swatch with symbol */}
                    <div
                      className="flex items-center justify-center cordel-border-sm font-bold text-xs shrink-0"
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: bgColor,
                        color: txtColor,
                        borderColor: '#1a1a1a',
                      }}
                    >
                      {stroke.symbol.length <= 2 ? stroke.symbol : stroke.symbol.charAt(0)}
                    </div>

                    {/* Label + shortcut */}
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-bold text-[#1a1a1a] leading-tight">{stroke.label}</span>
                      <span className="text-[9px] text-[#666] leading-tight">
                        {lang === 'fr' ? 'Touche' : 'Tecla'}: {stroke.shortcut}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Keyboard navigation tips */}
            <div className="bg-[#f4ecd8] cordel-border-sm p-2.5 text-[10px] mt-auto flex flex-col gap-1">
              <p className="font-bold">⌨️ {lang === 'fr' ? 'Astuces' : 'Dicas'}:</p>
              <p>{lang === 'fr'
                ? 'Espace pour avancer et laisser un silence.'
                : 'Espaço para avançar e deixar um silêncio.'
              }</p>
              <p>{lang === 'fr'
                ? 'Flèches (←/→) pour naviguer.'
                : 'Setas (←/→) para navegar.'
              }</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
