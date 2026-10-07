import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Edit3, Zap } from 'lucide-react';
import { Pattern } from '../../types';
import { ASSETS_BASE_URL, isDarkText, getVisualStrokeSymbol, NEWTON_NOTE_COLORS } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { audioEngine } from '../../hooks/useAudioSync';
import { getTone } from '../../ToneLoader';

interface TimelinePatternMiniCardProps {
  pattern: Pattern;
  track: any;
  inst: any;
  measureIdx: number;
  lang: string;
  isLeftHanded: boolean;
  onEditPattern: () => void;
  onMakeUniqueAndEdit: () => void;
}

export const TimelinePatternMiniCard: React.FC<TimelinePatternMiniCardProps> = ({
  pattern,
  track,
  inst,
  measureIdx,
  lang,
  isLeftHanded,
  onEditPattern,
  onMakeUniqueAndEdit,
}) => {
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [currentPreviewStep, setCurrentPreviewStep] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const isVoice = Boolean(
    inst?.type === 'voice' ||
    track?.type === 'voice' ||
    String(track?.id) === 'puxador' ||
    String(track?.id) === 'coro' ||
    inst?.id === 'puxador' ||
    inst?.id === 'coro'
  );

  const stopPreview = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlayingPreview(false);
    setCurrentPreviewStep(null);
    if (isVoice && track?.id) {
      try {
        audioEngine?.releaseVoicesForTrack(track.id);
      } catch (_) {}
    }
  }, [isVoice, track?.id]);

  const playStep = useCallback((stepIdx: number, stepDurationSec: number) => {
    const stepVal = pattern.activeSteps?.[stepIdx];
    if (stepVal === 0 || stepVal === '' || stepVal === undefined || stepVal === '0') return;

    const vol = typeof pattern.volumes?.[stepIdx] === 'number'
      ? (pattern.volumes[stepIdx] as number) / 100
      : 0.8;
    const decay = typeof pattern.decays?.[stepIdx] === 'number'
      ? (pattern.decays[stepIdx] as number) / 100
      : 1.0;

    if (isVoice) {
      const note = pattern.notes?.[stepIdx] || 'C4';
      try {
        audioEngine?.triggerVoiceAttackRelease(
          note,
          stepDurationSec * 0.9,
          undefined,
          vol,
          track.id
        );
      } catch (_) {}
    } else {
      const symbol = String(stepVal);
      try {
        const Tone = getTone();
        const now = Tone ? Tone.now() : 0;
        audioEngine?.playNote(track.id, symbol, now, vol, decay);
      } catch (_) {}
    }
  }, [pattern, isVoice, track?.id]);

  const startPreview = useCallback(() => {
    // Déverrouiller le contexte audio si nécessaire
    if (!useAudioStore.getState().isAudioUnlocked) {
      useAudioStore.getState().unlockAudio();
    }
    const Tone = getTone();
    if (Tone?.context && Tone.context.state !== 'running') {
      try { Tone.context.resume(); } catch (_) {}
      try { Tone.start(); } catch (_) {}
    }

    stopPreview();

    const state = useSequencerStore.getState();
    const bpm = (state.measureBpms && state.measureBpms[measureIdx] > 0)
      ? state.measureBpms[measureIdx]
      : (state.bpm || 100);

    const totalSteps = pattern.steps || 16;
    const stepDurationSec = 15 / bpm;
    const stepDurationMs = Math.max(30, stepDurationSec * 1000);

    setIsPlayingPreview(true);
    setCurrentPreviewStep(0);
    playStep(0, stepDurationSec);

    let currentStep = 0;
    timerRef.current = window.setInterval(() => {
      currentStep = (currentStep + 1) % totalSteps;
      setCurrentPreviewStep(currentStep);
      playStep(currentStep, stepDurationSec);
    }, stepDurationMs);
  }, [measureIdx, pattern, playStep, stopPreview]);

  const togglePreview = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlayingPreview) {
      stopPreview();
    } else {
      startPreview();
    }
  }, [isPlayingPreview, startPreview, stopPreview]);

  // Nettoyage strict au démontage ou fermeture du menu
  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, [stopPreview]);

  const totalSteps = pattern.steps || 16;
  const patternName = pattern.name || (lang === 'fr' ? 'Motif' : 'Padrão');

  return (
    <div className="flex flex-col gap-1.5 p-1.5 mb-1 bg-[#fbf8f0] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] rounded-none">
      {/* ── En-tête : Icône + Nom du motif + Longueur + Bouton [ ▶ ] ── */}
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {inst?.iconImg ? (
            <img
              src={`${ASSETS_BASE_URL}${inst.iconImg}`}
              alt={inst.name || 'Instrument'}
              className="w-4 h-4 object-contain shrink-0"
            />
          ) : (
            <span className="text-xs shrink-0 select-none">
              {isVoice ? (inst?.id === 'coro' ? '👥' : '🎙️') : '🥁'}
            </span>
          )}
          <div className="flex flex-col min-w-0 flex-1 leading-tight">
            <span
              className="font-bold text-[11px] font-cactus truncate text-[#1a1a1a]"
              title={patternName}
            >
              {patternName}
            </span>
            <span className="text-[9px] font-sans opacity-60 font-semibold leading-none">
              {totalSteps} {lang === 'fr' ? 'pas' : 'passos'}
            </span>
          </div>
        </div>

        {/* Bouton de pré-écoute solo [ ▶ ] / [ ■ ] */}
        <button
          type="button"
          onClick={togglePreview}
          className={`w-6 h-6 rounded-none border border-[#1a1a1a] flex items-center justify-center font-bold text-xs shadow-[1px_1px_0px_#1a1a1a] cursor-pointer transition-colors shrink-0 ${
            isPlayingPreview
              ? 'bg-[#8b2a1a] text-[#f4ecd8] hover:bg-[#a03020]'
              : 'bg-[#ffd369] text-[#1a1a1a] hover:bg-[#ffe082]'
          }`}
          title={
            isPlayingPreview
              ? (lang === 'fr' ? 'Arrêter la pré-écoute' : 'Parar pré-escuta')
              : (lang === 'fr' ? 'Pré-écoute solo' : 'Pré-escuta solo')
          }
        >
          {isPlayingPreview ? (
            <Square size={10} className="fill-current" />
          ) : (
            <Play size={10} className="fill-current translate-x-0.5" />
          )}
        </button>
      </div>

      {/* ── Mini-ruban rythmique horizontal (Visualiseur) ── */}
      <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-0.5 bg-[#1a1a1a]/5 border border-[#1a1a1a]/20">
        <div className="flex items-center gap-[1px] min-w-full">
          {Array.from({ length: totalSteps }).map((_, stepIdx) => {
            const val = pattern.activeSteps?.[stepIdx];
            const isActive = val !== 0 && val !== '' && val !== undefined && val !== '0';
            const isDownbeat = stepIdx > 0 && stepIdx % 4 === 0;
            const isCurrentStep = currentPreviewStep === stepIdx;

            if (!isActive) {
              return (
                <div
                  key={stepIdx}
                  className={`h-4 min-w-[11px] flex-1 flex items-center justify-center font-sans text-[7px] text-[#1a1a1a]/30 select-none ${
                    isDownbeat ? 'border-l border-[#1a1a1a]/30 pl-[1px]' : ''
                  } ${isCurrentStep ? 'bg-[#ffd369]/40 ring-1 ring-[#1a1a1a]' : ''}`}
                >
                  ·
                </div>
              );
            }

            if (isVoice) {
              const note = pattern.notes?.[stepIdx] || '';
              const noteLetter = note ? note.charAt(0).toUpperCase() : '';
              const noteColor = noteLetter ? (NEWTON_NOTE_COLORS[noteLetter] || '#8b2a1a') : '#8b2a1a';
              const lyric = pattern.lyrics?.[stepIdx] ? pattern.lyrics[stepIdx].trim().slice(0, 2) : '';

              return (
                <div
                  key={stepIdx}
                  className={`h-4 min-w-[11px] flex-1 flex items-center justify-center font-cactus font-bold text-[8px] border border-[#1a1a1a] shadow-[0.5px_0.5px_0px_#1a1a1a] select-none text-[#f4ecd8] leading-none ${
                    isDownbeat ? 'ml-0.5' : ''
                  } ${isCurrentStep ? 'ring-2 ring-[#ffd369] scale-110 z-10' : ''}`}
                  style={{ backgroundColor: noteColor }}
                  title={`${note}${lyric ? ` (${lyric})` : ''}`}
                >
                  <span className="truncate">{lyric || noteLetter || '•'}</span>
                </div>
              );
            }

            const visualSymbol = getVisualStrokeSymbol(val, isLeftHanded, inst?.id || '');
            const strokeStr = String(visualSymbol);
            const bgColor = inst?.colors?.[strokeStr] || inst?.colors?.[String(val)] || inst?.color || '#1a1a1a';
            const isDark = isDarkText(inst?.id || '', strokeStr);
            const textColor = isDark ? '#1a1a1a' : '#f4ecd8';

            return (
              <div
                key={stepIdx}
                className={`h-4 min-w-[11px] flex-1 flex items-center justify-center font-cactus font-bold text-[8px] border border-[#1a1a1a] shadow-[0.5px_0.5px_0px_#1a1a1a] select-none leading-none ${
                  isDownbeat ? 'ml-0.5' : ''
                } ${isCurrentStep ? 'ring-2 ring-[#ffd369] scale-110 z-10' : ''}`}
                style={{ backgroundColor: bgColor, color: textColor }}
                title={`${patternName} - Pas ${stepIdx + 1}: ${strokeStr}`}
              >
                {strokeStr}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Actions d'édition directe ── */}
      <div className="flex flex-col gap-0.5 pt-0.5 border-t border-[#1a1a1a]/20">
        {/* [ ✏️ Éditer ce motif ] */}
        <button
          type="button"
          onClick={() => {
            stopPreview();
            onEditPattern();
          }}
          className="w-full text-left px-1.5 py-1 font-bold flex items-center gap-1.5 transition-all hover:bg-[#1a1a1a] hover:text-[#f4ecd8] active:translate-x-0.5 cursor-pointer text-xs group"
        >
          <Edit3 size={12} className="shrink-0 text-[#8b2a1a] group-hover:text-[#ffd369]" />
          <span>{lang === 'fr' ? 'Éditer ce motif' : 'Editar este padrão'}</span>
        </button>

        {/* [ ⚡ Rendre unique & Éditer ] */}
        <button
          type="button"
          onClick={() => {
            stopPreview();
            onMakeUniqueAndEdit();
          }}
          className="w-full text-left px-1.5 py-1 font-bold flex items-center gap-1.5 transition-all hover:bg-[#1a1a1a] hover:text-[#f4ecd8] active:translate-x-0.5 cursor-pointer text-xs group"
        >
          <Zap size={12} className="shrink-0 text-[#d4af37] group-hover:text-[#ffd369]" />
          <span>{lang === 'fr' ? 'Rendre unique & Éditer' : 'Tornar único e editar'}</span>
        </button>
      </div>
    </div>
  );
};
