import React, { useCallback, useState, useRef } from 'react';
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
  onStepVolumeChange: (patternId: number, stepIdx: number | number[], val: number) => void;
  onStepDecayChange: (patternId: number, stepIdx: number | number[], val: number) => void;
  onStepMicrotimingChange: (patternId: number, stepIdx: number | number[], val: number) => void;
  isSwingOn: boolean;
  isPlaying: boolean;
  currentStepIndex: number;
  currentMeasure: number;
  maxTicks: number;
  totalMeasures: number;
  isMobile: boolean;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
  onCopyPattern?: (pattern: any) => void;
  onPastePattern?: (patternId: number) => void;
  canPaste?: boolean;
  isRecordingVocal?: boolean;
  recordingVocalPatternId?: number | null;
  recordedPatternIds?: number[];
  onStartVocalRecording?: (patternId: number) => void;
  onStopVocalRecording?: () => void;
  onVocalModeChange?: (patternId: number, mode: 'synth' | 'micro') => void;
  onDeleteVocalRecording?: (patternId: number) => void;
  onVocalLatencyChange?: (patternId: number, latencyMs: number) => void;
  audioDevices?: MediaDeviceInfo[];
  selectedAudioDeviceId?: string;
  onAudioDeviceChange?: (deviceId: string) => void;
  onImportVocalFile?: (patternId: number, file: File) => void;
  isVocalGuideEnabled?: boolean;
  onVocalGuideToggle?: (enabled: boolean) => void;
}

/* ── Stroke legend definitions ─────────────────────────────── */

interface StrokeDef {
  symbol: string;
  label: string;
  shortcut: string;
  colorKey: string;
}

function getStrokesForInstrument(instId: string, instType: string, lang: string): StrokeDef[] {
  const isFr = lang === 'fr';
  if (instId === 'caixa') {
    return [
      { symbol: 'D/d', label: isFr ? 'Main Droite' : 'Mão Direita', shortcut: 'D / d', colorKey: 'D' },
      { symbol: 'E/e', label: isFr ? 'Main Gauche' : 'Mão Esquerda', shortcut: 'E / e', colorKey: 'E' },
      { symbol: 'rd', label: isFr ? 'Roulement court D' : 'Rufada Direita', shortcut: 'R → rd', colorKey: 'rd' },
      { symbol: 'Re', label: isFr ? 'Roulement court G' : 'Rufada Esquerda', shortcut: 'Z / z', colorKey: 'Re' },
      { symbol: 'x', label: isFr ? 'Cerclage' : 'Toque no aro', shortcut: 'X → x', colorKey: 'x' },
      { symbol: 'f', label: 'Fla', shortcut: 'F → f', colorKey: 'f' },
      { symbol: 'T/t', label: isFr ? 'Tremblement' : 'Tremor', shortcut: 'T / t', colorKey: 'T' },
    ];
  }
  if (instId === 'marcante' || instId === 'meiao' || instId === 'repique') {
    return [
      { symbol: 'D/d', label: isFr ? 'Main Droite' : 'Mão Direita', shortcut: 'D / d', colorKey: 'D' },
      { symbol: 'E/e', label: isFr ? 'Main Gauche' : 'Mão Esquerda', shortcut: 'E / e', colorKey: 'E' },
      { symbol: 'T/t', label: isFr ? 'Tremblement' : 'Tremor', shortcut: 'T / t', colorKey: 'T' },
      { symbol: 'x', label: isFr ? 'Cerclage' : 'Toque no aro', shortcut: 'X → x', colorKey: 'x' },
      { symbol: 'i', label: 'Iguarassu', shortcut: 'I → i', colorKey: 'i' },
    ];
  }
  if (instType === 'gongue') {
    return [
      { symbol: 'G/g', label: 'Grave', shortcut: 'G / g', colorKey: 'GRV' },
      { symbol: 'A/a', label: isFr ? 'Aigu' : 'Agudo', shortcut: 'A / a', colorKey: 'AIG' },
      { symbol: 'T/t', label: isFr ? 'Tremblement' : 'Tremor', shortcut: 'T / t', colorKey: 'T' },
    ];
  }
  if (instId === 'agbe') {
    return [
      { symbol: 'E/e', label: isFr ? 'Gauche' : 'Esquerda', shortcut: 'E / e', colorKey: 'E' },
      { symbol: 'D/d', label: isFr ? 'Droite' : 'Direita', shortcut: 'D / d', colorKey: 'D' },
      { symbol: 'T/t', label: isFr ? 'Tremblement' : 'Tremor', shortcut: 'T / t', colorKey: 'T' },
      { symbol: 's', label: isFr ? 'Saut' : 'Salto', shortcut: 'S → s', colorKey: 's' },
    ];
  }
  if (instId === 'mineiro') {
    return [
      { symbol: 'P/p', label: isFr ? 'Haut' : 'Push (Cima)', shortcut: 'P / p', colorKey: 'P' },
      { symbol: 'T/t', label: isFr ? 'Bas' : 'Pull (Baixo)', shortcut: 'T / t', colorKey: 'T' },
    ];
  }
  if (instType === 'voice') {
    return [
      { symbol: 'P', label: 'Puxador', shortcut: 'Click top', colorKey: 'P' },
      { symbol: 'C', label: isFr ? 'Chœur' : 'Coro', shortcut: 'Click top', colorKey: 'C' },
    ];
  }
  return [];
}

/* ── Step options ───────────────────────────────────────────── */
const STEP_OPTIONS = [4, 8, 12, 16, 24, 32];

/* ── Cycle step values helper on mobile ────────────────────────── */
export function getNextStepValue(instId: string, instType: string, currentVal: string | number): string | number {
  const norm = typeof currentVal === 'string' ? currentVal.trim() : currentVal;
  
  if (instId === 'mineiro') {
    if (norm === 0 || norm === '0' || !norm) return 'p';
    if (norm === 'p') return 'P';
    if (norm === 'P') return 't';
    if (norm === 't') return 'T';
    return 0;
  }
  if (instId === 'agbe') {
    if (norm === 0 || norm === '0' || !norm) return 'e';
    if (norm === 'g' || norm === 'e') return 'E';
    if (norm === 'G' || norm === 'E') return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'D') return 't';
    if (norm === 'b' || norm === 't') return 's';
    return 0;
  }
  if (instType === 'gongue') {
    if (norm === 0 || norm === '0' || !norm) return 'grv';
    if (norm === 'grv') return 'GRV';
    if (norm === 'GRV') return 'aig';
    if (norm === 'aig') return 'AIG';
    if (norm === 'AIG') return 't';
    if (norm === 'b' || norm === 't') return 0;
    return 0;
  }
  if (instId === 'caixa') {
    if (norm === 0 || norm === '0' || !norm) return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'D') return 'e';
    if (norm === 'g' || norm === 'e') return 'E';
    if (norm === 'G' || norm === 'E') return 'rd';
    if (norm === 'rd') return 'Re';
    if (norm === 'rg' || norm === 'Re' || norm === 're') return 'x';
    if (norm === 'x') return 'f';
    if (norm === 'f') return 't';
    if (norm === 'b' || norm === 't') return 0;
    return 0;
  }
  if (instId === 'marcante' || instId === 'meiao' || instId === 'repique') {
    if (norm === 0 || norm === '0' || !norm) return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'D') return 'e';
    if (norm === 'g' || norm === 'e') return 'E';
    if (norm === 'G' || norm === 'E') return 't';
    if (norm === 'b' || norm === 't') return 'x';
    if (norm === 'x') return 'i';
    return 0;
  }
  // default
  if (norm === 0 || norm === '0' || !norm) return 'd';
  if (norm === 'd') return 'D';
  if (norm === 'D') return 'e';
  if (norm === 'g' || norm === 'e') return 'E';
  return 0;
}

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
  isMobile,
  onStepTouchStart,
  onCopyPattern,
  onPastePattern,
  canPaste,
  isRecordingVocal = false,
  recordingVocalPatternId = null,
  recordedPatternIds = [],
  onStartVocalRecording,
  onStopVocalRecording,
  onVocalModeChange,
  onDeleteVocalRecording,
  onVocalLatencyChange,
  audioDevices = [],
  selectedAudioDeviceId = '',
  onAudioDeviceChange,
  onImportVocalFile,
  isVocalGuideEnabled = true,
  onVocalGuideToggle,
}) => {
  const inst = instrumentsConfig[track.instrumentIdx];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = (key: string) => (i18n[lang] as any)[key] || key;

  const vocalT = (key: string) => {
    const dictionary: any = {
      fr: {
        vocalMode: 'Mode Vocal',
        synthMode: 'Synthétiseur',
        microMode: 'Microphone (Enregistrement)',
        recordVocal: '🎤 Enregistrer mon chant',
        recording: '🔴 Enregistrement en cours...',
        stopRecord: '⏹ Arrêter',
        deleteRecord: 'Supprimer',
        hasRecord: 'Chant enregistré (Local)',
        noRecordYet: 'Aucun enregistrement vocal pour ce motif.',
        reRecord: '🎤 Ré-enregistrer',
      },
      pt: {
        vocalMode: 'Modo Vocal',
        synthMode: 'Sintetizador',
        microMode: 'Microfone (Gravação)',
        recordVocal: '🎤 Gravar meu canto',
        recording: '🔴 Gravando...',
        stopRecord: '⏹ Parar',
        deleteRecord: 'Excluir',
        hasRecord: 'Canto gravado (Local)',
        noRecordYet: 'Nenhuma gravação vocal para este padrão.',
        reRecord: '🎤 Gravar novamente',
      }
    };
    return dictionary[lang]?.[key] || key;
  };

  const [selectedStepIdx, setSelectedStepIdx] = useState<number | null>(null);
  const [selectedStepIndices, setSelectedStepIndices] = useState<number[]>([]);
  const [selectedPatternId, setSelectedPatternId] = useState<number | null>(track.selectedPatternId);
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [dragStartIdx, setDragStartIdx] = useState<number | null>(null);
  const [mouseDownOnBackdrop, setMouseDownOnBackdrop] = useState(false);

  const isMouseDownRef = React.useRef(false);
  const paintValueRef = React.useRef<string | number>(0);

  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      isMouseDownRef.current = false;
      setIsDragSelecting(false);
      setDragStartIdx(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  React.useEffect(() => {
    setSelectedPatternId(track.selectedPatternId);
    setSelectedStepIdx(null);
    setSelectedStepIndices([]);
  }, [track.id, track.selectedPatternId]);

  const strokes = getStrokesForInstrument(inst.id, inst.type, lang);
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const handleStart = (e: React.MouseEvent | React.TouchEvent, patternId: number, stepIdx: number, currentVal: string | number) => {
    if ('shiftKey' in e && e.shiftKey) return;
    if (onStepTouchStart) {
      if (e.type === 'touchstart') {
        onStepTouchStart(e, patternId, stepIdx, inst.id, currentVal, (newVal) => {
          onStepValueChange(patternId, stepIdx, newVal);
        });
      } else {
        if ('button' in e && e.button !== 0) return;
        onStepTouchStart(e, patternId, stepIdx, inst.id, currentVal, (newVal) => {
          onStepValueChange(patternId, stepIdx, newVal);
        });
      }
    }
  };

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
          maxWidth: isMobile ? '100%' : '1600px',
          width: isMobile ? '95vw' : '98vw',
          maxHeight: isMobile ? '94vh' : '96vh',
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
        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>

          {/* ─── Main scrollable content ─── */}
          <div className="flex-1 md:overflow-y-auto p-3 md:p-5 flex flex-col gap-6" style={{ minWidth: 0, WebkitOverflowScrolling: 'touch' }}>

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

                    {/* Copy/Paste buttons */}
                    <div className="flex gap-1 ml-4">
                      <button
                        onClick={() => onCopyPattern && onCopyPattern(ptn)}
                        className="px-1.5 py-0.5 bg-[#eaddcf] text-[10px] font-bold cordel-border-sm hover:bg-[#1a1a1a] hover:text-[#f4ecd8] cursor-pointer"
                        title={lang === 'fr' ? 'Copier le motif' : 'Copiar o padrão'}
                      >
                        📋 {lang === 'fr' ? 'Copier' : 'Copiar'}
                      </button>
                      <button
                        onClick={() => onPastePattern && onPastePattern(ptn.id)}
                        disabled={!canPaste}
                        className={`px-1.5 py-0.5 text-[10px] font-bold cordel-border-sm cursor-pointer ${
                          canPaste 
                            ? 'bg-[#eaddcf] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                        }`}
                        title={lang === 'fr' ? 'Coller le motif copié' : 'Colar o padrão copiado'}
                      >
                        📥 {lang === 'fr' ? 'Coller' : 'Colar'}
                      </button>
                    </div>

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

                  {/* Vocal recording controls (only for voice instruments) */}
                  {inst.type === 'voice' && (
                    <div className="bg-[#ece4d0] border border-[#1a1a1a]/25 cordel-border-sm p-3 mb-2 flex flex-col md:flex-row items-start md:items-center gap-4 text-[#1a1a1a] shrink-0">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold uppercase">{vocalT('vocalMode')} :</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => onVocalModeChange && onVocalModeChange(ptn.id, 'synth')}
                            className={`px-3 py-1 font-bold text-xs cordel-border-sm cursor-pointer transition-colors ${
                              ptn.vocalMode !== 'micro'
                                ? 'bg-[#1a1a1a] text-[#f4ecd8]'
                                : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
                            }`}
                          >
                            🎹 {vocalT('synthMode')}
                          </button>
                          <button
                            onClick={() => onVocalModeChange && onVocalModeChange(ptn.id, 'micro')}
                            className={`px-3 py-1 font-bold text-xs cordel-border-sm cursor-pointer transition-colors ${
                              ptn.vocalMode === 'micro'
                                ? 'bg-[#1a1a1a] text-[#f4ecd8]'
                                : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
                            }`}
                          >
                            🎤 {vocalT('microMode')}
                          </button>
                        </div>
                      </div>

                      {ptn.vocalMode === 'micro' && (
                        <div className="flex flex-col gap-2 flex-grow w-full border-t md:border-t-0 md:border-l border-[#1a1a1a]/20 pt-3 md:pt-0 md:pl-4">
                          
                          {/* Microphone selection dropdown */}
                          <div className="flex flex-col gap-1 w-full border-b border-[#1a1a1a]/10 pb-2 mb-1">
                            <label className="text-[10px] font-bold opacity-80 flex items-center gap-1">
                              🎙️ {lang === 'fr' ? "Carte son / Entrée micro :" : "Placa de som / Entrada de microfone :"}
                            </label>
                            <select
                              value={selectedAudioDeviceId}
                              onChange={(e) => onAudioDeviceChange && onAudioDeviceChange(e.target.value)}
                              className="text-xs bg-[#f4ecd8] cordel-border-sm p-1 outline-none text-[#1a1a1a] w-full max-w-xs font-semibold cursor-pointer"
                            >
                              {audioDevices.length === 0 ? (
                                <option value="">{lang === 'fr' ? "Périphérique par défaut" : "Dispositivo padrão"}</option>
                              ) : (
                                audioDevices.map((dev) => (
                                  <option key={dev.deviceId} value={dev.deviceId}>
                                    {dev.label || `${lang === 'fr' ? 'Micro' : 'Microfone'} (${dev.deviceId.slice(0, 5)})`}
                                  </option>
                                ))
                              )}
                            </select>
                          </div>

                          {/* Melodic guide option */}
                          <div className="flex items-center gap-2 w-full mb-1">
                            <input
                              type="checkbox"
                              id={`vocal-guide-toggle-${ptn.id}`}
                              checked={isVocalGuideEnabled}
                              onChange={(e) => onVocalGuideToggle && onVocalGuideToggle(e.target.checked)}
                              className="accent-green-700 cursor-pointer w-3.5 h-3.5"
                            />
                            <label
                              htmlFor={`vocal-guide-toggle-${ptn.id}`}
                              className="text-[10px] font-bold opacity-80 cursor-pointer select-none"
                            >
                              🎵 {lang === 'fr' 
                                ? "Jouer le guide mélodique (synthétiseur) pendant l'enregistrement" 
                                : "Tocar guia melódico (sintetizador) durante a gravação"}
                            </label>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 w-full">
                            {isRecordingVocal && recordingVocalPatternId === ptn.id ? (
                              <button
                                onClick={() => onStopVocalRecording && onStopVocalRecording()}
                                className="px-4 py-2 bg-[#8b2a1a] text-[#f4ecd8] font-bold text-xs cordel-border-sm cursor-pointer animate-pulse flex items-center gap-1.5"
                              >
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
                                {vocalT('recording')}
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => onStartVocalRecording && onStartVocalRecording(ptn.id)}
                                  className="px-4 py-2 bg-green-700 text-[#f4ecd8] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-green-800 transition-colors flex items-center gap-1.5"
                                >
                                  🎤 {recordedPatternIds.includes(ptn.id) ? vocalT('reRecord') : vocalT('recordVocal')}
                                </button>

                                <button
                                  onClick={() => fileInputRef.current?.click()}
                                  className="px-4 py-2 bg-[#b89f74] text-[#1a1a1a] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[#a68e64] transition-colors flex items-center gap-1.5 font-semibold"
                                  title={lang === 'fr' ? "Importer un fichier audio existant" : "Importar um arquivo de áudio existente"}
                                >
                                  📥 {lang === 'fr' ? 'Importer' : 'Importar'}
                                </button>
                                <input
                                  type="file"
                                  accept="audio/*"
                                  ref={fileInputRef}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file && onImportVocalFile) {
                                      onImportVocalFile(ptn.id, file);
                                    }
                                  }}
                                  className="hidden"
                                />
                              </div>
                            )}

                            {recordedPatternIds.includes(ptn.id) ? (
                              <div className="flex items-center gap-3 ml-auto flex-wrap">
                                <span className="text-xs font-bold text-green-800 flex items-center gap-1">
                                  ✅ {vocalT('hasRecord')}
                                </span>
                                <button
                                  onClick={() => onDeleteVocalRecording && onDeleteVocalRecording(ptn.id)}
                                  className="px-2 py-1 text-[#8b2a1a] font-bold text-[11px] cordel-border-sm cursor-pointer hover:bg-[#8b2a1a] hover:text-[#f4ecd8] transition-colors"
                                >
                                  {vocalT('deleteRecord')}
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-[#666] italic ml-auto">
                                {vocalT('noRecordYet')}
                              </span>
                            )}
                          </div>

                          {/* Latency adjustment slider */}
                          {recordedPatternIds.includes(ptn.id) && (
                            <div className="flex flex-col gap-1 w-full border-t border-[#1a1a1a]/10 pt-2 mt-1">
                              <div className="flex justify-between text-[10px] font-bold">
                                <span>⏱️ {lang === 'fr' ? "Calage temporel (Compensation de la latence)" : "Ajuste de atraso (Compensação de latência)"}</span>
                                <span>{ptn.vocalLatency > 0 ? '+' : ''}{ptn.vocalLatency || 0} ms</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] font-bold opacity-60 shrink-0">-300 ms</span>
                                <input
                                  type="range"
                                  min="-300"
                                  max="800"
                                  step="5"
                                  value={ptn.vocalLatency || 0}
                                  onChange={(e) => onVocalLatencyChange && onVocalLatencyChange(ptn.id, parseInt(e.target.value) || 0)}
                                  className="flex-grow accent-green-700 cursor-pointer h-1 bg-[#1a1a1a]/10"
                                />
                                <span className="text-[8px] font-bold opacity-60 shrink-0">800 ms</span>
                              </div>
                              <span className="text-[8px] text-[#666] font-medium leading-normal">
                                {lang === 'fr' 
                                  ? "Décale le début de la voix vers la gauche (plus tôt) pour compenser le retard du micro, du smartphone ou du Bluetooth."
                                  : "Desloca o início da voz para a esquerda (mais cedo) para compensar o atraso do microfone, celular ou Bluetooth."}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step grid */}
                  {inst.type === 'voice' ? (
                    /* ──── Voice step grid ──── */
                    <div
                      className="step-boxes flex flex-wrap gap-y-4 gap-x-6"
                      id={`detail-voice-${track.id}-${ptn.id}`}
                    >
                      {(() => {
                        const groups = [];
                        for (let g = 0; g < ptn.steps; g += 4) {
                          groups.push(Array.from({ length: Math.min(4, ptn.steps - g) }, (_, idx) => g + idx));
                        }
                        return groups.map((group, groupIdx) => (
                          <div key={groupIdx} className="flex gap-4 p-1.5 bg-[#ece4d0]/40 border border-[#1a1a1a]/10 rounded-sm shrink-0">
                            {group.map((i) => {
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
                              const shiftPx = (totalShift / 50) * 8; // Max 8px shift

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
                        ));
                      })()}
                    </div>
                  ) : (
                    /* ──── Instrument step grid ──── */
                    <div
                      className="step-boxes flex flex-wrap gap-y-4 gap-x-6"
                      id={`detail-steps-${track.id}-${ptn.id}`}
                    >
                      {(() => {
                        const groups = [];
                        for (let g = 0; g < ptn.steps; g += 4) {
                          groups.push(Array.from({ length: Math.min(4, ptn.steps - g) }, (_, idx) => g + idx));
                        }
                        return groups.map((group, groupIdx) => (
                          <div key={groupIdx} className="flex gap-4 p-1.5 bg-[#ece4d0]/40 border border-[#1a1a1a]/10 rounded-sm shrink-0">
                            {group.map((i) => {
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

                              // Calculate total micro-timing shift (manual + global swing)
                              const manualMicro = ptn.microtimings?.[i] ?? 0;
                              const swingOffset = getStepSwingPercent(i, ptn.steps);
                              const totalShift = manualMicro + swingOffset;
                              const shiftPx = (totalShift / 50) * 8; // Max 8px shift

                              return (
                                <div key={i} className="relative flex flex-col items-center" style={{ width: '36px' }}>
                                  {/* Axis vertical centerline (0%) behind steps */}
                                  <div className="absolute top-[12px] bottom-[15px] left-1/2 w-0 border-l border-dashed border-[#1a1a1a]/30 -translate-x-1/2 pointer-events-none z-0" />

                                  <div className="text-[8px] text-[#999] font-bold mb-0.5 z-10 relative">{i + 1}</div>
                                  <input
                                    type="text"
                                    maxLength={inst.id === 'caixa' ? 2 : 1}
                                    value={displayVal}
                                    readOnly={isTouchDevice}
                                    inputMode={isTouchDevice ? 'none' : undefined}
                                    onFocus={(e) => {
                                      if (!isTouchDevice) {
                                        e.target.select();
                                      }
                                      setSelectedPatternId(ptn.id);
                                    }}
                                    onMouseDown={(e) => {
                                      if (e.button !== 0) return;
                                      setSelectedPatternId(ptn.id);

                                      // 1. Alt Key Paint Editing
                                      if (e.altKey) {
                                        isMouseDownRef.current = true;
                                        const nextVal = getNextStepValue(inst.id, inst.type, val);
                                        paintValueRef.current = nextVal;
                                        onStepValueChange(ptn.id, i, String(nextVal));
                                        return;
                                      }

                                      // 2. Shift + Clic (Selection Range)
                                      if (e.shiftKey) {
                                        e.preventDefault();
                                        if (selectedStepIdx !== null) {
                                          const start = Math.min(selectedStepIdx, i);
                                          const end = Math.max(selectedStepIdx, i);
                                          const rangeIndices = Array.from({ length: end - start + 1 }, (_, k) => start + k);
                                          setSelectedStepIndices(rangeIndices);
                                        } else {
                                          setSelectedStepIdx(i);
                                          setSelectedStepIndices([i]);
                                        }
                                        return;
                                      }

                                      // 3. Ctrl/Cmd + Clic (Toggle individual step selection)
                                      if (e.ctrlKey || e.metaKey) {
                                        e.preventDefault();
                                        setSelectedStepIndices(prev => {
                                          if (prev.includes(i)) {
                                            const next = prev.filter(idx => idx !== i);
                                            if (next.length > 0) {
                                              setSelectedStepIdx(next[next.length - 1]);
                                            } else {
                                              setSelectedStepIdx(null);
                                            }
                                            return next;
                                          } else {
                                            setSelectedStepIdx(i);
                                            return [...prev, i];
                                          }
                                        });
                                        return;
                                      }

                                      // 4. Normal click -> Start Drag selection
                                      setIsDragSelecting(true);
                                      setDragStartIdx(i);
                                      setSelectedStepIdx(i);
                                      setSelectedStepIndices([i]);
                                      handleStart(e, ptn.id, i, val);
                                    }}
                                    onMouseEnter={() => {
                                      if (isMouseDownRef.current) {
                                        onStepValueChange(ptn.id, i, String(paintValueRef.current));
                                      }
                                      if (isDragSelecting && dragStartIdx !== null) {
                                        const start = Math.min(dragStartIdx, i);
                                        const end = Math.max(dragStartIdx, i);
                                        const rangeIndices = Array.from({ length: end - start + 1 }, (_, k) => start + k);
                                        setSelectedStepIndices(rangeIndices);
                                        setSelectedStepIdx(i);
                                      }
                                    }}
                                    onTouchStart={(e) => {
                                      setSelectedPatternId(ptn.id);
                                      setSelectedStepIdx(i);
                                      setSelectedStepIndices([i]);
                                      handleStart(e, ptn.id, i, val);
                                    }}
                                    onChange={(e) => onStepValueChange(ptn.id, i, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Tab' || e.key === 'Enter') e.preventDefault();
                                      
                                      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
                                      if ((isCtrlOrMeta && e.key.toLowerCase() === 'c') || e.key.toLowerCase() === 'c') {
                                        e.preventDefault();
                                        onCopyPattern && onCopyPattern(ptn);
                                        return;
                                      }
                                      if ((isCtrlOrMeta && e.key.toLowerCase() === 'v') || e.key.toLowerCase() === 'v') {
                                        e.preventDefault();
                                        if (canPaste) {
                                          onPastePattern && onPastePattern(ptn.id);
                                        }
                                        return;
                                      }
                                      if (e.key === 'Delete' || e.key === 'Backspace') {
                                        e.preventDefault();
                                        onStepValueChange(ptn.id, i, '0');
                                        if (e.key === 'Backspace') {
                                          const inputEl = e.currentTarget as HTMLInputElement;
                                          onStepKeyDown(ptn.id, i, e.key, '', inputEl);
                                        }
                                        return;
                                      }

                                      const inputEl = e.currentTarget as HTMLInputElement;
                                      onStepKeyDown(ptn.id, i, e.key, inputEl.value, inputEl);
                                    }}
                                    className={`text-center text-sm font-bold cordel-border-sm outline-none p-0 box-border z-10 relative transition-all duration-200 ${
                                      isCurrentStep
                                        ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#8b2a1a] scale-110 shadow-[0_0_8px_rgba(139,42,26,0.6)]'
                                        : val === 0
                                          ? 'bg-[#f4ecd8] text-[#1a1a1a] focus:border-[#8b2a1a]'
                                          : ''
                                    } ${
                                      selectedStepIdx === i
                                        ? 'outline outline-2 outline-[#8b2a1a] shadow-[0_0_8px_rgba(139,42,26,0.6)] scale-110 z-20'
                                        : selectedStepIndices.includes(i)
                                          ? 'outline outline-2 outline-[#8b2a1a]/50 shadow-[0_0_6px_rgba(139,42,26,0.3)] scale-105 z-15'
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
                              );
                            })}
                          </div>
                        ));
                      })()}
                    </div>
                  )}

                  {/* Step Sculptor Panel for this pattern */}
                  {selectedPatternId === ptn.id && selectedStepIdx !== null && (
                    <div className="bg-[#ece4d0] cordel-border-sm p-3 mt-3 flex flex-col gap-2 shrink-0">
                      <div className="flex items-center justify-between text-xs border-b border-[#1a1a1a]/20 pb-1.5 text-[#1a1a1a]">
                        <span className="font-bold">
                          🎛️ {lang === 'fr' ? 'Sculpteur' : 'Escultor'} — {
                            selectedStepIndices.length > 1
                              ? (lang === 'fr' ? `${selectedStepIndices.length} pas sélectionnés` : `${selectedStepIndices.length} passos selecionados`)
                              : (lang === 'fr' ? `Pas ${selectedStepIdx + 1}` : `Passo ${selectedStepIdx + 1}`)
                          }
                          {selectedStepIndices.length <= 1 && (() => {
                            const stepVal = ptn.activeSteps[selectedStepIdx];
                            return ` (${stepVal === 0 ? (lang === 'fr' ? 'Silence' : 'Silêncio') : `${lang === 'fr' ? 'Coup' : 'Golpe'}: ${stepVal}`})`;
                          })()}
                        </span>
                        <button 
                          onClick={() => {
                            const targets = selectedStepIndices.length > 0 ? selectedStepIndices : [selectedStepIdx];
                            onStepVolumeChange(ptn.id, targets, 80);
                            onStepDecayChange(ptn.id, targets, 100);
                            onStepMicrotimingChange(ptn.id, targets, 0);
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
                            <span>{ptn.volumes?.[selectedStepIdx] ?? 80}%</span>
                          </div>
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            value={ptn.volumes?.[selectedStepIdx] ?? 80}
                            onChange={(e) => onStepVolumeChange(ptn.id, selectedStepIndices.length > 0 ? selectedStepIndices : [selectedStepIdx], parseInt(e.target.value))}
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
                            onChange={(e) => onStepDecayChange(ptn.id, selectedStepIndices.length > 0 ? selectedStepIndices : [selectedStepIdx], parseInt(e.target.value))}
                            className="w-full accent-amber-500 cursor-pointer h-2 bg-[#1a1a1a]/10"
                          />
                        </div>

                        {/* Micro-timing slider */}
                        <div className="flex flex-col gap-0.5">
                          {(() => {
                            const manualVal = ptn.microtimings?.[selectedStepIdx] ?? 0;
                            const swingOffset = getStepSwingPercent(selectedStepIdx, ptn.steps);
                            const totalVal = manualVal + swingOffset;
                            const clampedTotalVal = Math.max(-50, Math.min(50, totalVal));

                            return (
                              <>
                                <div className="flex justify-between text-[10px] font-bold">
                                  <span>⏱️ Micro-timing ({lang === 'fr' ? 'Décalage' : 'Desvio'})</span>
                                  <span>
                                    {totalVal > 0 ? `+${totalVal}` : totalVal}%
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 relative h-6">
                                  <span className="text-[8px] font-bold opacity-60 shrink-0">-50%</span>
                                  <div className="flex-grow h-2 relative flex items-center">
                                    {/* Background track with a center notch */}
                                    <div className="absolute inset-x-0 h-1 bg-[#1a1a1a]/15 rounded" />
                                    <div className="absolute left-1/2 -translate-x-1/2 w-[2px] h-3 bg-[#1a1a1a]/40 z-10" />
                                    
                                    {/* Bi-directional Blue track representing offset from center */}
                                    {totalVal !== 0 && (() => {
                                      const widthPercent = Math.min(50, Math.abs(totalVal)); // half-width is 50%
                                      return (
                                        <div
                                          className="absolute h-1 bg-[#2980b9]"
                                          style={{
                                            left: totalVal > 0 ? '50%' : 'auto',
                                            right: totalVal < 0 ? '50%' : 'auto',
                                            width: `${widthPercent}%`
                                          }}
                                        />
                                      );
                                    })()}

                                    <input
                                      type="range"
                                      min="-50"
                                      max="50"
                                      value={clampedTotalVal}
                                      onChange={(e) => {
                                        const newTotal = parseInt(e.target.value);
                                        const newManual = newTotal - swingOffset;
                                        const clampedManual = Math.max(-50, Math.min(50, newManual));
                                        onStepMicrotimingChange(
                                          ptn.id,
                                          selectedStepIndices.length > 0 ? selectedStepIndices : [selectedStepIdx],
                                          clampedManual
                                        );
                                      }}
                                      className="absolute inset-x-0 w-full h-4 opacity-100 cursor-pointer slider-transparent-track"
                                    />
                                  </div>
                                  <span className="text-[8px] font-bold opacity-60 shrink-0">+50%</span>
                                </div>
                              </>
                            );
                          })()}
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
            className="border-t-[3px] md:border-t-0 md:border-l-[3px] border-[#1a1a1a] bg-[#ece4d0] p-4 shrink-0 flex flex-col gap-4 w-full md:w-[240px] md:overflow-y-auto"
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
