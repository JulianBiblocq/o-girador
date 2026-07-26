/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Mic, Square, Radio, Disc } from 'lucide-react';
import { useAudioStore } from '../stores/useAudioStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { vocalEngineService } from '../audio/vocalEngineService';
import { useAudio } from '../contexts/AudioContext';

export const VocalRecordingFocusOverlay: React.FC = () => {
  const isFocusMode = useAudioStore((state) => state.isFocusRecordingMode);
  const recordingStatus = useAudioStore((state) => state.recordingStatus);
  const targetPatternId = useAudioStore((state) => state.targetPatternId);
  const lang = useSequencerStore((state) => state.lang);
  const tracks = useSequencerStore((state) => state.tracks);
  const { handleStop } = useAudio();

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const statusBadgeRef = useRef<HTMLDivElement | null>(null);
  const statusTextRef = useRef<HTMLSpanElement | null>(null);
  const subTextRef = useRef<HTMLParagraphElement | null>(null);

  // Find target pattern and voice track
  const voiceTrack = targetPatternId
    ? tracks.find((t) => t.patterns.some((p) => Number(p.id) === Number(targetPatternId)))
    : null;
  const targetPattern = targetPatternId && voiceTrack
    ? voiceTrack.patterns.find((p) => Number(p.id) === Number(targetPatternId))
    : null;

  // 60 FPS / Direct DOM updates for status and animations (Zero Render Thrashing)
  useEffect(() => {
    if (!statusTextRef.current || !statusBadgeRef.current || !subTextRef.current) return;

    if (recordingStatus === 'arming') {
      statusTextRef.current.textContent = lang === 'pt' ? '🎤 CONFIGURANDO...' : '🎤 ARMEMENT MICRO...';
      subTextRef.current.textContent = lang === 'pt'
        ? 'Calibrando entrada de áudio. Aguarde...'
        : 'Calibrage de l\'entrée audio en cours...';
      statusBadgeRef.current.className = 'px-6 py-2.5 bg-[#b89f74] text-[#1a1a1a] border-2 border-[#1a1a1a] font-cactus font-bold text-xl uppercase tracking-wider rounded-sm shadow-[3px_3px_0px_#1a1a1a] flex items-center gap-3';
    } else if (recordingStatus === 'countdown') {
      statusTextRef.current.textContent = lang === 'pt' ? '🥁 PREPARE-SE...' : '🥁 DÉCOMPTE 4 TEMPS...';
      subTextRef.current.textContent = lang === 'pt'
        ? 'Escute o metrônomo e a Roda em segundo plano.'
        : 'Écoutez le métronome et la Roda en fond sonore.';
      statusBadgeRef.current.className = 'px-6 py-2.5 bg-[#d4a359] text-[#1a1a1a] border-2 border-[#1a1a1a] font-cactus font-bold text-xl uppercase tracking-wider rounded-sm shadow-[3px_3px_0px_#1a1a1a] flex items-center gap-3';
    } else if (recordingStatus === 'recording') {
      statusTextRef.current.textContent = lang === 'pt' ? '🔴 GRAVANDO VOZ...' : '🔴 ENREGISTREMENT EN COURS...';
      subTextRef.current.textContent = lang === 'pt'
        ? 'Cante seu padrão. A gravação parará automaticamente no final do loop.'
        : 'Chantez votre motif. L\'enregistrement s\'arrêtera automatiquement à la fin de la boucle.';
      statusBadgeRef.current.className = 'px-6 py-2.5 bg-[#8b2a1a] text-[#fdfaf2] border-2 border-[#1a1a1a] font-cactus font-bold text-xl uppercase tracking-wider rounded-sm shadow-[3px_3px_0px_#1a1a1a] flex items-center gap-3 animate-pulse';
    }
  }, [recordingStatus, lang]);

  // Entrance & Exit animations via Web Animations API (WAAPI - GPU Priority)
  useEffect(() => {
    if (overlayRef.current) {
      if (isFocusMode && recordingStatus !== 'inactive') {
        overlayRef.current.animate(
          [
            { opacity: 0, transform: 'scale(0.98)' },
            { opacity: 1, transform: 'scale(1)' },
          ],
          {
            duration: 180,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'both',
          }
        );
      }
    }
  }, [isFocusMode, recordingStatus]);

  if (!isFocusMode || recordingStatus === 'inactive') return null;

  const handleStopRecording = () => {
    vocalEngineService.stopRecording();
    handleStop();
    useAudioStore.getState().setIsFocusRecordingMode(false);
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#121212]/92 backdrop-blur-md text-[#fdfaf2] font-mono select-none p-6"
    >
      <div className="bg-[#ece4d0] text-[#1a1a1a] border-4 border-[#1a1a1a] shadow-[12px_12px_0px_#1a1a1a] p-8 max-w-xl w-full flex flex-col items-center gap-6 rounded-sm text-center">
        
        {/* Header */}
        <div className="flex items-center gap-2 border-b-3 border-[#1a1a1a] pb-3 w-full justify-center">
          <Disc className="w-6 h-6 text-[#8b2a1a] animate-spin" style={{ animationDuration: '3s' }} />
          <h2 className="font-cactus font-black text-2xl text-[#8b2a1a] tracking-widest uppercase">
            {lang === 'pt' ? 'MODO FOCO DE GRAVAÇÃO' : 'MODE FOCUS ENREGISTREMENT'}
          </h2>
        </div>

        {/* Target Pattern Info */}
        <div className="bg-[#e2d8be] border-2 border-[#1a1a1a] p-4 rounded-sm w-full flex flex-col gap-1 text-center">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#1a1a1a]/70">
            {lang === 'pt' ? 'Padrão Alvo :' : 'Motif Cible :'}
          </span>
          <span className="font-cactus font-black text-xl text-[#1a1a1a] truncate">
            {targetPattern ? targetPattern.name : (lang === 'pt' ? 'Voz Principal' : 'Voix Principale')}
          </span>
        </div>

        {/* Live Status Badge (Direct DOM Target) */}
        <div ref={statusBadgeRef} className="px-6 py-2.5 bg-[#b89f74] text-[#1a1a1a] border-2 border-[#1a1a1a] font-cactus font-bold text-xl uppercase tracking-wider rounded-sm shadow-[3px_3px_0px_#1a1a1a] flex items-center gap-3">
          <Radio className="w-6 h-6 shrink-0 animate-bounce" />
          <span ref={statusTextRef}>
            {lang === 'pt' ? '🎤 PREPARANDO...' : '🎤 PRÉPARATION...'}
          </span>
        </div>

        {/* Explanatory Subtext */}
        <p ref={subTextRef} className="text-xs text-[#1a1a1a]/80 leading-relaxed font-sans max-w-md">
          {lang === 'pt'
            ? 'Interface em modo isolado para dedicação total de CPU ao áudio.'
            : 'Interface en mode isolé pour déduire 100% du CPU au traitement audio.'}
        </p>

        {/* UX Prevention Warning */}
        <div className="bg-[#fef3c7] text-[#92400e] border-2 border-[#b45309] p-3 rounded-sm text-xs font-bold font-sans flex items-center gap-2 max-w-md text-left shadow-[2px_2px_0px_#b45309]">
          <span>
            {lang === 'pt'
              ? '⚠️ Grave em um ambiente silencioso. O alinhamento automático baseia-se no primeiro som detectado.'
              : '⚠️ Enregistrez dans un environnement calme. Le calage automatique se base sur le premier son détecté.'}
          </span>
        </div>

        {/* Emergency Stop Button */}
        <button
          onClick={handleStopRecording}
          className="cordel-btn mt-2 px-8 py-3 bg-[#1a1a1a] text-[#fdfaf2] font-cactus font-bold text-lg border-2 border-[#1a1a1a] shadow-[4px_4px_0px_#8b2a1a] rounded-sm flex items-center gap-3 hover:bg-[#8b2a1a] transition-all cursor-pointer"
        >
          <Square className="w-5 h-5 fill-current text-red-500" />
          <span>{lang === 'pt' ? 'INTERROMPER (STOP)' : 'ANNULER / ARRÊTER'}</span>
        </button>

      </div>
    </div>
  );
};
