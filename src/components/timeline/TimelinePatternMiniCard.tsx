import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Edit3, Zap } from 'lucide-react';
import { Pattern } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { audioEngine } from '../../hooks/useAudioSync';
import { getTone } from '../../ToneLoader';
import { TimelinePatternMiniCardGrid } from './TimelinePatternMiniCardGrid';
import { scheduleAudioContextAutoSuspend, safeResumeAudioContext } from '../../audio/audioContextSuspendManager';

interface TimelinePatternMiniCardProps {
  pattern: Pattern; track: any; inst: any; measureIdx: number; lang: string;
  isLeftHanded: boolean; onEditPattern: () => void; onMakeUniqueAndEdit: () => void;
}

export const TimelinePatternMiniCard: React.FC<TimelinePatternMiniCardProps> = ({
  pattern, track, inst, measureIdx, lang, isLeftHanded, onEditPattern, onMakeUniqueAndEdit,
}) => {
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [currentPreviewStep, setCurrentPreviewStep] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const isVoice = Boolean(inst?.type === 'voice' || track?.type === 'voice' || String(track?.id) === 'puxador' || String(track?.id) === 'coro' || inst?.id === 'puxador' || inst?.id === 'coro');

  const stopPreview = useCallback(() => {
    if (timerRef.current !== null) { window.clearInterval(timerRef.current); timerRef.current = null; }
    setIsPlayingPreview(false); setCurrentPreviewStep(null);
    if (isVoice && track?.id) { try { audioEngine?.releaseVoicesForTrack(track.id); } catch (_) {} }
    scheduleAudioContextAutoSuspend(500);
  }, [isVoice, track?.id]);

  const playStep = useCallback((sIdx: number, stepDurSec: number) => {
    const v = pattern.activeSteps?.[sIdx];
    if (v === 0 || v === '' || v === undefined || v === '0') return;
    const vol = typeof pattern.volumes?.[sIdx] === 'number' ? (pattern.volumes[sIdx] as number) / 100 : 0.8;
    const decay = typeof pattern.decays?.[sIdx] === 'number' ? (pattern.decays[sIdx] as number) / 100 : 1.0;
    if (isVoice) {
      try { audioEngine?.triggerVoiceAttackRelease(pattern.notes?.[sIdx] || 'C4', stepDurSec * 0.9, undefined, vol, track.id); } catch (_) {}
    } else {
      try { const Tone = getTone(); audioEngine?.playNote(track.id, String(v), Tone ? Tone.now() : 0, vol, decay); } catch (_) {}
    }
  }, [pattern, isVoice, track?.id]);

  const startPreview = useCallback(() => {
    safeResumeAudioContext();
    if (!useAudioStore.getState().isAudioUnlocked) useAudioStore.getState().unlockAudio();
    const Tone = getTone();
    if (Tone?.context && Tone.context.state !== 'running') { try { Tone.context.resume(); Tone.start(); } catch (_) {} }
    stopPreview();
    const bpm = useSequencerStore.getState().measureBpms?.[measureIdx] || useSequencerStore.getState().bpm || 100;
    const totalSteps = pattern.steps || 16, stepDurSec = 15 / bpm, stepDurMs = Math.max(30, stepDurSec * 1000);
    setIsPlayingPreview(true); setCurrentPreviewStep(0); playStep(0, stepDurSec);
    let cur = 0;
    timerRef.current = window.setInterval(() => {
      cur = (cur + 1) % totalSteps; setCurrentPreviewStep(cur); playStep(cur, stepDurSec);
    }, stepDurMs);
  }, [measureIdx, pattern, playStep, stopPreview]);

  useEffect(() => () => stopPreview(), [stopPreview]);

  return (
    <div className="bg-[#1a1a1a]/5 p-2 border border-[#1a1a1a]/30 rounded-none mb-1.5 font-cactus">
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-xs truncate max-w-[140px] text-[#1a1a1a]">{pattern.name}</span>
          <span className="text-[10px] opacity-60 font-sans font-bold">({pattern.steps || 16}p)</span>
        </div>
        <button type="button" onClick={(e) => { e.stopPropagation(); if (isPlayingPreview) stopPreview(); else startPreview(); }} className={`px-2 py-0.5 text-[10px] font-bold rounded-none flex items-center gap-1 transition-all cursor-pointer ${isPlayingPreview ? 'bg-[#b71515] text-white' : 'bg-[#1a1a1a] text-[#f4ecd8] hover:bg-black'}`}>
          {isPlayingPreview ? <Square size={10} className="fill-current" /> : <Play size={10} className="fill-current" />}
          <span>{isPlayingPreview ? (lang === 'fr' ? 'Arrêt' : 'Parar') : (lang === 'fr' ? 'Écouter' : 'Ouvir')}</span>
        </button>
      </div>

      <TimelinePatternMiniCardGrid pattern={pattern} inst={inst} isVoice={isVoice} isLeftHanded={isLeftHanded} currentPreviewStep={currentPreviewStep} />

      <div className="flex flex-col gap-1 pt-1 border-t border-[#1a1a1a]/20">
        <button type="button" onClick={onEditPattern} className="w-full text-left px-2 py-1 font-bold text-xs flex items-center gap-2 hover:bg-[#1a1a1a] hover:text-[#f4ecd8] transition-colors cursor-pointer">
          <Edit3 size={12} className="shrink-0" /><span>{lang === 'fr' ? 'Éditer ce motif' : 'Editar este padrão'}</span>
        </button>
        <button type="button" onClick={onMakeUniqueAndEdit} className="w-full text-left px-2 py-1 font-bold text-xs flex items-center gap-2 text-amber-800 hover:bg-[#1a1a1a] hover:text-[#f4ecd8] transition-colors cursor-pointer" title={lang === 'fr' ? 'Clone ce motif sur cette mesure uniquement et ouvre l’éditeur' : 'Clona este padrão apenas para este compasso e abre o editor'}>
          <Zap size={12} className="shrink-0" /><span>{lang === 'fr' ? 'Rendre unique & Éditer' : 'Tornar único & Editar'}</span>
        </button>
      </div>
    </div>
  );
};
