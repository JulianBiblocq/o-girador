/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { Play, Square, Save, RotateCcw, Scissors, Music, MoveHorizontal } from 'lucide-react';
import { Pattern, VocalClipMeta } from '../types/store.types';
import { useAudio } from '../contexts/AudioContext';
import { extractPeaks, renderTrimmedVocalBuffer, audioBufferToWav } from '../utils/audioBufferUtils';
import { getBeatsPerMeasure } from '../utils/measureHelpers';
import { useSequencerStore } from '../stores/useSequencerStore';

const PIXELS_PER_SECOND = 200; // Timeline scale: 200px = 1 second

interface AudioAlignmentEditorProps {
  audioBuffer: AudioBuffer;
  pattern: Pattern;
  bpm: number;
  measureBpms: number[];
  measureTimeSigs: string[];
  preRollDurationSec: number;
  initialTrimStartSec?: number;
  initialTrimEndSec?: number;
  initialNudgeMs?: number;
  isImported?: boolean;
  onSave: (cleanBuffer: AudioBuffer, wavBlob: Blob, meta: VocalClipMeta) => void;
  onCancel: () => void;
}

export const AudioAlignmentEditor: React.FC<AudioAlignmentEditorProps> = ({
  audioBuffer,
  pattern,
  bpm,
  measureBpms,
  measureTimeSigs,
  preRollDurationSec,
  initialTrimStartSec,
  initialTrimEndSec,
  initialNudgeMs = 0,
  isImported = false,
  onSave,
  onCancel,
}) => {
  // Measure and pattern durations based on anchor measure BPM and time signature
  const initialMeasureIdx = pattern.measureAssignments.indexOf(true) !== -1
    ? pattern.measureAssignments.indexOf(true)
    : 0;
  const anchorBpm = (measureBpms && measureBpms[initialMeasureIdx % (measureBpms.length || 1)] > 0)
    ? measureBpms[initialMeasureIdx % (measureBpms.length || 1)]
    : bpm;
  const targetSig = (measureTimeSigs && measureTimeSigs[initialMeasureIdx % (measureTimeSigs.length || 1)]) || '4/4';
  const beatsCount = getBeatsPerMeasure(targetSig);
  const isCompound = targetSig === '6/8' || targetSig === '9/8' || targetSig === '12/8';
  const beatDurationSec = isCompound ? (90 / anchorBpm) : (60 / anchorBpm);
  const patternMeasures = Math.max(
    1,
    pattern.measureAssignments.filter(Boolean).length || 1
  );

  // Exact duration of preceding measure M - 1 at its own BPM (or runway preRoll if M=0)
  const mPrev = Math.max(0, initialMeasureIdx - 1);
  const prevBpm = (measureBpms && measureBpms[mPrev % (measureBpms.length || 1)] > 0)
    ? measureBpms[mPrev % (measureBpms.length || 1)]
    : anchorBpm;
  const prevSig = (measureTimeSigs && measureTimeSigs[mPrev % (measureTimeSigs.length || 1)]) || '4/4';
  const prevBeats = getBeatsPerMeasure(prevSig);
  const isCompoundPrev = prevSig === '6/8' || prevSig === '9/8' || prevSig === '12/8';
  const prevBeatDuration = isCompoundPrev ? (90 / prevBpm) : (60 / prevBpm);

  // 🛡️ RUNWAY GUARANTEE: Ne JAMAIS placer temps1Px à 0.
  // Conserver strictement un dégagement d'au moins une mesure à gauche (Directive 1)
  const t_temps1 = initialMeasureIdx >= 1 
    ? (prevBeats * prevBeatDuration) 
    : (preRollDurationSec > 0 ? preRollDurationSec : beatsCount * beatDurationSec);
  const temps1Px = t_temps1 * PIXELS_PER_SECOND;

  // Initial trim and nudge states
  const defaultTrimStart = initialTrimStartSec !== undefined ? initialTrimStartSec : 0;
  const defaultTrimEnd = initialTrimEndSec !== undefined ? initialTrimEndSec : audioBuffer.duration;

  const [trimStartSec, setTrimStartSec] = useState(defaultTrimStart);
  const [trimEndSec, setTrimEndSec] = useState(defaultTrimEnd);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Total loop duration for [M - 1, M]
  const loopDurationSec = (initialMeasureIdx >= 1 ? t_temps1 : 0) + (patternMeasures * beatsCount * beatDurationSec);

  // 🛡️ Mémorisation de l'état initial de boucle pour restauration scrupuleuse
  const savedLoopStateRef = useRef<{
    isLooping: boolean;
    loopStartMeasure: number | null;
    loopEndMeasure: number | null;
    isLoopRegionActive: boolean;
  } | null>(null);

  // Refs for 60 FPS DOM direct mutations (Zero Render Thrashing - Commandement 1)
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const nudgeValueLabelRef = useRef<HTMLSpanElement>(null);
  const anacrusisBadgeRef = useRef<HTMLSpanElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const trimOverlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const localPlayerRef = useRef<Tone.Player | Tone.GrainPlayer | null>(null);
  const previewLoopTimeoutRef = useRef<any>(null);

  // Cached Peaks extracted ONCE (Zero Layout Thrashing & Waveform Persistence)
  const cachedPeaksRef = useRef<Float32Array | null>(null);

  // Refs for live state values during preview loops
  const nudgeMsRef = useRef(initialNudgeMs);
  const trimStartSecRef = useRef(trimStartSec);
  const trimEndSecRef = useRef(trimEndSec);

  useEffect(() => {
    trimStartSecRef.current = trimStartSec;
  }, [trimStartSec]);

  useEffect(() => {
    trimEndSecRef.current = trimEndSec;
  }, [trimEndSec]);

  // Positionnement initial :
  // Le sample importé s'initialise à waveX = temps1Px (Directive 1).
  // Si le motif possédait déjà une anacrouse enregistrée, repositionner l'onde fidèlement.
  const getInitialBaseWaveX = () => {
    if (isImported) {
      if (pattern.vocalClip && pattern.vocalClip.anacrusisSec !== undefined) {
        return temps1Px - (pattern.vocalClip.anacrusisSec * PIXELS_PER_SECOND);
      }
      return temps1Px;
    }
    return 0;
  };

  const waveBaseXRef = useRef<number>(getInitialBaseWaveX());
  const currentTotalWaveXRef = useRef<number>(
    waveBaseXRef.current + (initialNudgeMs / 1000) * PIXELS_PER_SECOND
  );

  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartBaseXRef = useRef(0);

  const { handleTogglePlay, handleStop } = useAudio();

  // Mise à jour synchrone des badges d'anacrouse (Zero Render Thrashing)
  const updateLiveTimingBadges = useCallback((totalX: number) => {
    const t_downbeat = (temps1Px - totalX) / PIXELS_PER_SECOND;
    const anacrusisSec = Math.max(0, t_downbeat - trimStartSecRef.current);
    const anacrusisBeats = anacrusisSec / beatDurationSec;

    if (anacrusisBadgeRef.current) {
      if (anacrusisSec > 0.001) {
        anacrusisBadgeRef.current.textContent = `Anacrouse : ${(anacrusisSec * 1000).toFixed(0)} ms (${anacrusisBeats.toFixed(2)} tps)`;
        anacrusisBadgeRef.current.style.color = '#2a5d4e';
      } else {
        anacrusisBadgeRef.current.textContent = 'Anacrouse : 0 ms (Temps 1 calé)';
        anacrusisBadgeRef.current.style.color = '#8b2a1a';
      }
    }
  }, [temps1Px, beatDurationSec]);

  // Initialisation badge au montage
  useEffect(() => {
    updateLiveTimingBadges(currentTotalWaveXRef.current);
  }, [updateLiveTimingBadges]);

  // 1. One-time Peak Extraction & Canvas Waveform Render avec Normalisation Dynamique
  useEffect(() => {
    if (!audioBuffer || !waveformCanvasRef.current) return;

    const canvas = waveformCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const duration = audioBuffer.duration;
    const width = Math.max(Math.ceil(duration * PIXELS_PER_SECOND), 1600);
    const height = canvas.height;

    canvas.width = width;

    // Extract peaks once if not already cached in ref
    if (!cachedPeaksRef.current) {
      cachedPeaksRef.current = extractPeaks(audioBuffer, width);
    }

    const peaks = cachedPeaksRef.current;
    const numPoints = peaks.length / 2;

    // Normalisation visuelle dynamique (Directive B.1) :
    // Calcul de la valeur crête (peak) maximale du signal audio
    let maxGlobalPeak = 0.001;
    for (let i = 0; i < numPoints; i++) {
      const absMin = Math.abs(peaks[i * 2]);
      const absMax = Math.abs(peaks[i * 2 + 1]);
      if (absMin > maxGlobalPeak) maxGlobalPeak = absMin;
      if (absMax > maxGlobalPeak) maxGlobalPeak = absMax;
    }

    // Le tracé doit occuper 70 à 80 % de la hauteur utile (Directive B.1)
    const targetOccupancy = 0.75; // 75%
    const usefulHalfHeight = (height / 2) * targetOccupancy;
    const dynamicAmp = usefulHalfHeight / maxGlobalPeak;
    const amp = Math.min(dynamicAmp, (height / 2) * 50); // Borne anti-bruit

    // Draw Cordel aesthetic waveform: Fond papier (#f4ecd8) & Waveform Rouge Argile (#8b2a1a)
    ctx.fillStyle = '#f4ecd8';
    ctx.fillRect(0, 0, width, height);

    // Center line
    ctx.strokeStyle = 'rgba(139, 42, 26, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    ctx.fillStyle = '#8b2a1a';
    for (let i = 0; i < numPoints; i++) {
      const min = peaks[i * 2];
      const max = peaks[i * 2 + 1];
      const x = i;
      const y = height / 2 + min * amp;
      const h = Math.max(1.5, (max - min) * amp);
      ctx.fillRect(x, y, 1.5, h);
    }

    // --- STEP GRID & SYNTHESIZER NOTES RENDERING ---
    // Grille de pas de référence (16 pas / 12 pas)
    const stepsCountM = pattern.steps || (isCompound ? 12 : 16);
    const measureMDurationSec = beatsCount * beatDurationSec;
    const stepPxM = (measureMDurationSec * PIXELS_PER_SECOND) / stepsCountM;

    // Pas de la mesure précédente (Runway)
    const stepsCountPrev = isCompoundPrev ? 12 : 16;
    const stepPxPrev = temps1Px / stepsCountPrev;
    ctx.strokeStyle = 'rgba(26, 26, 26, 0.15)';
    ctx.lineWidth = 1;
    for (let s = 0; s < stepsCountPrev; s++) {
      const xPos = s * stepPxPrev;
      ctx.beginPath();
      ctx.moveTo(xPos, 0);
      ctx.lineTo(xPos, height);
      ctx.stroke();

      if (pattern.preRollActiveSteps && pattern.preRollActiveSteps[s]) {
        ctx.fillStyle = '#2a5d4e';
        ctx.beginPath();
        ctx.arc(xPos + stepPxPrev / 2, height / 2 - 30, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Pas de la mesure M
    for (let s = 0; s < stepsCountM; s++) {
      const xPos = s * stepPxM;
      if (xPos > width) break;
      ctx.strokeStyle = (s % (isCompound ? 3 : 4) === 0) ? 'rgba(139, 42, 26, 0.25)' : 'rgba(26, 26, 26, 0.12)';
      ctx.lineWidth = (s % (isCompound ? 3 : 4) === 0) ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(xPos, 0);
      ctx.lineTo(xPos, height);
      ctx.stroke();

      if (pattern.activeSteps && pattern.activeSteps[s]) {
        ctx.fillStyle = '#8b2a1a';
        ctx.beginPath();
        ctx.arc(xPos + stepPxM / 2, height / 2 - 30, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [audioBuffer, beatsCount, beatDurationSec, initialMeasureIdx, isCompound, isCompoundPrev, pattern, temps1Px]);

  // 2. Draw Trim overlay solidaire de l'audioBuffer sur trimOverlayCanvas
  useEffect(() => {
    if (!trimOverlayCanvasRef.current || !audioBuffer) return;

    const canvas = trimOverlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = Math.max(Math.ceil(audioBuffer.duration * PIXELS_PER_SECOND), 1600);
    const height = canvas.height;
    canvas.width = width;

    ctx.clearRect(0, 0, width, height);

    const startPx = trimStartSec * PIXELS_PER_SECOND;
    const endPx = trimEndSec * PIXELS_PER_SECOND;

    // Teinte sombre Cordel pour les zones rognées
    ctx.fillStyle = 'rgba(26, 26, 26, 0.55)';
    ctx.fillRect(0, 0, startPx, height);
    ctx.fillRect(endPx, 0, width - endPx, height);

    // Ligne Trim Start (Vert)
    ctx.strokeStyle = '#2a5d4e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(startPx, 0);
    ctx.lineTo(startPx, height);
    ctx.stroke();

    // Ligne Trim End (Rouge sombre)
    ctx.strokeStyle = '#8b2a1a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(endPx, 0);
    ctx.lineTo(endPx, height);
    ctx.stroke();

    updateLiveTimingBadges(currentTotalWaveXRef.current);
  }, [audioBuffer, trimStartSec, trimEndSec, updateLiveTimingBadges]);

  // 3. Pré-écoute synchronisée avec la Roda (Formule unifiée)
  const stopLocalPreview = useCallback(() => {
    if (previewLoopTimeoutRef.current) {
      clearTimeout(previewLoopTimeoutRef.current);
      previewLoopTimeoutRef.current = null;
    }
    if (localPlayerRef.current) {
      try {
        localPlayerRef.current.stop();
        localPlayerRef.current.dispose();
      } catch (_) {}
      localPlayerRef.current = null;
    }
  }, []);

  const playPreviewIteration = useCallback(() => {
    stopLocalPreview();

    const tStart = trimStartSecRef.current;
    const tEnd = trimEndSecRef.current;
    const rawNudge = nudgeMsRef.current;
    const duration = Math.max(0.05, tEnd - tStart);

    // Calcul exact de l'anacrouse basée sur la position actuelle de l'onde
    const currentWaveX = currentTotalWaveXRef.current;
    const t_downbeat = (temps1Px - currentWaveX) / PIXELS_PER_SECOND;
    const anacrusisSec = Math.max(0, t_downbeat - tStart);

    // Formule synchronisée : le déclenchement est calé sur Temps 1 (t_temps1)
    // triggerDelay = t_temps1 - anacrusisSec + (nudgeMs / 1000)
    const triggerDelay = t_temps1 - anacrusisSec + (rawNudge / 1000);

    const player = new Tone.Player(audioBuffer);
    player.volume.value = 0;
    player.toDestination();

    let actualStartOffset = tStart;
    let actualPlayDelay = triggerDelay;
    let actualDuration = duration;

    if (actualPlayDelay < 0) {
      const clipPastSec = -actualPlayDelay;
      actualStartOffset += clipPastSec;
      actualDuration = Math.max(0, actualDuration - clipPastSec);
      actualPlayDelay = 0;
    }

    if (actualStartOffset < 0) {
      actualDuration = Math.max(0, actualDuration + actualStartOffset);
      actualStartOffset = 0;
    }
    if (actualStartOffset + actualDuration > audioBuffer.duration) {
      actualDuration = Math.max(0, audioBuffer.duration - actualStartOffset);
    }

    if (actualDuration > 0 && actualStartOffset < audioBuffer.duration) {
      const now = Tone.context.currentTime;
      player.start(now + actualPlayDelay, actualStartOffset, actualDuration);
      localPlayerRef.current = player;
    }

    previewLoopTimeoutRef.current = setTimeout(() => {
      playPreviewIteration();
    }, loopDurationSec * 1000);
  }, [audioBuffer, loopDurationSec, stopLocalPreview, t_temps1, temps1Px]);

  const handleTogglePreview = async () => {
    if (isPlayingPreview) {
      setIsPlayingPreview(false);
      stopLocalPreview();
      handleStop();

      // Restauration de la boucle à la fermeture
      if (savedLoopStateRef.current) {
        useSequencerStore.setState({
          isLooping: savedLoopStateRef.current.isLooping,
          loopStartMeasure: savedLoopStateRef.current.loopStartMeasure,
          loopEndMeasure: savedLoopStateRef.current.loopEndMeasure,
          isLoopRegionActive: savedLoopStateRef.current.isLoopRegionActive,
        });
        Tone.Transport.loop = savedLoopStateRef.current.isLooping;
        savedLoopStateRef.current = null;
      }
    } else {
      try {
        if (Tone.context.state !== 'running') {
          await Tone.context.resume();
        }
        if (Tone.context.rawContext && Tone.context.rawContext.state !== 'running') {
          await (Tone.context.rawContext as AudioContext).resume();
        }
      } catch (_) {}

      // Mémoriser l'état initial de boucle
      const currentSeq = useSequencerStore.getState();
      savedLoopStateRef.current = {
        isLooping: currentSeq.isLooping,
        loopStartMeasure: currentSeq.loopStartMeasure,
        loopEndMeasure: currentSeq.loopEndMeasure,
        isLoopRegionActive: currentSeq.isLoopRegionActive,
      };

      const mLoopStart = Math.max(0, initialMeasureIdx - 1);
      const mLoopEnd = initialMeasureIdx;

      // Définir les bornes de boucle sur la fenêtre utile
      useSequencerStore.setState({
        isLooping: true,
        isLoopRegionActive: true,
        loopStartMeasure: mLoopStart,
        loopEndMeasure: mLoopEnd,
      });

      Tone.Transport.loop = true;
      Tone.Transport.position = `${mLoopStart}:0:0`;

      setIsPlayingPreview(true);

      // Démarrage de la Roda calée sur mLoopStart
      handleTogglePlay({ skipPreRoll: true, targetMeasure: mLoopStart });

      playPreviewIteration();
    }
  };

  useEffect(() => {
    return () => {
      stopLocalPreview();
      handleStop();
      if (savedLoopStateRef.current) {
        useSequencerStore.setState({
          isLooping: savedLoopStateRef.current.isLooping,
          loopStartMeasure: savedLoopStateRef.current.loopStartMeasure,
          loopEndMeasure: savedLoopStateRef.current.loopEndMeasure,
          isLoopRegionActive: savedLoopStateRef.current.isLoopRegionActive,
        });
        Tone.Transport.loop = savedLoopStateRef.current.isLooping;
      }
    };
  }, [stopLocalPreview, handleStop]);

  // 4. Drag & Drop robuste à 60 FPS (Directive 2 & Commandements 1, 2, 3)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartBaseXRef.current = waveBaseXRef.current;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartXRef.current;
    const newBaseX = dragStartBaseXRef.current + deltaX;
    waveBaseXRef.current = newBaseX;
    const totalX = newBaseX + (nudgeMsRef.current / 1000) * PIXELS_PER_SECOND;
    currentTotalWaveXRef.current = totalX;

    // Zero Render Thrashing & Zero Layout Thrashing (Mutation GPU directe)
    if (waveformContainerRef.current) {
      waveformContainerRef.current.style.transform = `translate3d(${totalX}px, 0, 0)`;
    }
    updateLiveTimingBadges(totalX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
      isDraggingRef.current = false;
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
      isDraggingRef.current = false;
    }
  };

  // 5. Fine Nudge Slider (-300ms to +300ms) with 60 FPS DOM Manipulation
  const handleNudgeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    nudgeMsRef.current = val;

    const totalX = waveBaseXRef.current + (val / 1000) * PIXELS_PER_SECOND;
    currentTotalWaveXRef.current = totalX;

    if (waveformContainerRef.current) {
      waveformContainerRef.current.style.transform = `translate3d(${totalX}px, 0, 0)`;
    }
    if (nudgeValueLabelRef.current) {
      nudgeValueLabelRef.current.textContent = `${val > 0 ? '+' : ''}${val.toFixed(0)} ms`;
    }
    updateLiveTimingBadges(totalX);
  };

  const handleResetNudge = () => {
    nudgeMsRef.current = 0;
    const totalX = waveBaseXRef.current;
    currentTotalWaveXRef.current = totalX;
    if (waveformContainerRef.current) {
      waveformContainerRef.current.style.transform = `translate3d(${totalX}px, 0, 0)`;
    }
    if (nudgeValueLabelRef.current) {
      nudgeValueLabelRef.current.textContent = '0 ms';
    }
    const input = document.getElementById('vocal-nudge-slider') as HTMLInputElement | null;
    if (input) input.value = '0';
    updateLiveTimingBadges(totalX);
  };

  // 6. Validation via OfflineAudioContext with 10ms/30ms anti-pop fades
  const handleValidate = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    stopLocalPreview();
    handleStop();

    if (savedLoopStateRef.current) {
      useSequencerStore.setState({
        isLooping: savedLoopStateRef.current.isLooping,
        loopStartMeasure: savedLoopStateRef.current.loopStartMeasure,
        loopEndMeasure: savedLoopStateRef.current.loopEndMeasure,
        isLoopRegionActive: savedLoopStateRef.current.isLoopRegionActive,
      });
      Tone.Transport.loop = savedLoopStateRef.current.isLooping;
      savedLoopStateRef.current = null;
    }

    try {
      const cleanBuffer = await renderTrimmedVocalBuffer(
        audioBuffer,
        trimStartSec,
        trimEndSec,
        0.010, // 10ms fade-in anti-craquement
        0.030  // 30ms fade-out anti-craquement
      );

      const wavBlob = audioBufferToWav(cleanBuffer);

      // Calcul de l'anacrouse réelle basée sur la position de l'onde sous Temps 1
      const currentWaveX = currentTotalWaveXRef.current;
      const t_downbeat = (temps1Px - currentWaveX) / PIXELS_PER_SECOND;
      const anacrusisSec = Math.max(0, t_downbeat - trimStartSec);
      const anacrusisBeats = anacrusisSec / beatDurationSec;

      const meta: VocalClipMeta = {
        patternId: pattern.id,
        baseBpm: anchorBpm,
        trimStartSec: 0,
        trimEndSec: cleanBuffer.duration,
        nudgeMs: nudgeMsRef.current,
        anacrusisBeats,
        anacrusisSec,
        // Backward compatibility
        offsetStart: 0,
        startTimeDelay: nudgeMsRef.current / 1000,
        bpmSync: true,
        offsetEnd: cleanBuffer.duration,
      };

      onSave(cleanBuffer, wavBlob, meta);
    } catch (err) {
      console.error('Erreur lors du rendu du buffer vocal :', err);
      setIsProcessing(false);
    }
  };

  const bufferDuration = audioBuffer.duration;

  return (
    <div className="flex flex-col gap-5 select-none font-mono">
      {/* Visual Alignment Board */}
      <div className="relative border-4 border-[#1a1a1a] bg-[#e2d8be] rounded-sm overflow-hidden h-44 shadow-[4px_4px_0px_#1a1a1a]">
        
        {/* Fixed Header Ruler: TEMPS 1 / PREMIÈRE NOTE */}
        <div className="h-8 bg-[#d7cbaf] border-b-2 border-[#1a1a1a] relative flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <Music className="w-3.5 h-3.5 text-[#8b2a1a]" />
            <span className="text-[10px] font-bold text-[#1a1a1a]/80 uppercase tracking-wider hidden sm:inline">
              Zone d'alignement ({pattern.name}) — Glisser l'onde (Drag) sur le Temps 1
            </span>
          </div>

          {/* Badge Anacrouse en temps réel (Zero Render Thrashing DOM update) */}
          <div className="flex items-center gap-2">
            <span
              ref={anacrusisBadgeRef}
              className="px-2 py-0.5 bg-[#ece4d0] border border-[#1a1a1a] text-[10px] font-black uppercase font-mono tracking-wider shadow-[1px_1px_0px_#1a1a1a]"
              style={{ color: '#2a5d4e' }}
            >
              Anacrouse : 0 ms (0.00 tps)
            </span>
          </div>

          {/* TEMPS 1 Fixed Guide Line Badge */}
          <div
            style={{ left: `${temps1Px}px` }}
            className="absolute top-0 bottom-0 flex items-center -translate-x-1/2 z-30 pointer-events-none"
          >
            <div className="px-2.5 py-0.5 bg-[#dc2626] text-white text-[9px] font-black uppercase tracking-wider border border-[#1a1a1a] shadow-[0_0_8px_rgba(220,38,38,0.8)]">
              TEMPS 1 / CHANT (MESURE ${initialMeasureIdx + 1})
            </div>
          </div>
        </div>

        {/* Scrollable Waveform Viewport avec Drag & Drop robuste (touch-action: none + setPointerCapture) */}
        <div 
          className="relative h-36 overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing select-none"
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          {/* Spacer transparent pour autoriser le défilement horizontal sur les fichiers longs */}
          <div
            style={{
              width: `${Math.max(temps1Px + Math.ceil(audioBuffer.duration * PIXELS_PER_SECOND) + 400, 1600)}px`,
              height: '1px',
              pointerEvents: 'none',
            }}
          />

          {/* Fixed Vertical TEMPS 1 Guide Line (Ligne rouge vive 2.5px) */}
          <div
            style={{ left: `${temps1Px}px` }}
            className="absolute top-0 bottom-0 w-[2.5px] bg-[#dc2626] z-20 pointer-events-none shadow-[0_0_12px_rgba(220,38,38,0.9)]"
          />

          {/* Floating Waveform Canvas Layer (Translates with Drag + Nudge via GPU transform) */}
          <div
            ref={waveformContainerRef}
            style={{
              transform: `translate3d(${currentTotalWaveXRef.current}px, 0, 0)`,
              willChange: 'transform',
            }}
            className="absolute top-0 bottom-0 left-0 z-0 pointer-events-none"
          >
            <canvas
              ref={waveformCanvasRef}
              className="h-full block pointer-events-none"
              height={144}
            />

            {/* Trim Overlay Canvas solidaire de l'audioBuffer */}
            <canvas
              ref={trimOverlayCanvasRef}
              className="absolute top-0 bottom-0 left-0 h-full pointer-events-none z-10"
              height={144}
            />
          </div>
        </div>
      </div>

      {/* Two Trim Sliders (Trim Start & Trim End) */}
      <div className="bg-[#f4ecd8] border-2 border-[#1a1a1a] p-4 rounded-sm flex flex-col gap-3 shadow-[2px_2px_0px_#1a1a1a]">
        <div className="flex items-center justify-between text-xs font-bold text-[#1a1a1a]">
          <span className="flex items-center gap-1.5 uppercase text-[#2a5d4e]">
            <Scissors className="w-4 h-4 text-[#2a5d4e]" />
            Rognage Audio (Trim Start / Trim End)
          </span>
          <span className="text-[10px] text-[#1a1a1a]/60">
            L'anacrouse respire à gauche de la ligne rouge Temps 1.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Trim Start */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-[#2a5d4e]">Trim Début :</span>
              <span className="font-mono text-[#2a5d4e]">{trimStartSec.toFixed(3)}s</span>
            </div>
            <input
              type="range"
              min="0"
              max={Math.max(0, trimEndSec - 0.05)}
              step="0.005"
              value={trimStartSec}
              onChange={(e) => setTrimStartSec(parseFloat(e.target.value))}
              className="w-full h-2 bg-[#ece4d0] rounded border border-[#1a1a1a] appearance-none cursor-pointer accent-[#2a5d4e]"
            />
          </div>

          {/* Trim End */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-[#8b2a1a]">Trim Fin :</span>
              <span className="font-mono text-[#8b2a1a]">
                {trimEndSec.toFixed(3)}s / {bufferDuration.toFixed(3)}s
              </span>
            </div>
            <input
              type="range"
              min={trimStartSec + 0.05}
              max={bufferDuration}
              step="0.005"
              value={trimEndSec}
              onChange={(e) => setTrimEndSec(parseFloat(e.target.value))}
              className="w-full h-2 bg-[#ece4d0] rounded border border-[#1a1a1a] appearance-none cursor-pointer accent-[#8b2a1a]"
            />
          </div>
        </div>
      </div>

      {/* Fine Nudge Slider (-300ms to +300ms) with Drag Hint */}
      <div className="bg-[#f4ecd8] border-2 border-[#1a1a1a] p-4 rounded-sm flex flex-col gap-3 shadow-[2px_2px_0px_#1a1a1a]">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#8b2a1a] uppercase flex items-center gap-1.5">
              <MoveHorizontal className="w-4 h-4 text-[#8b2a1a]" />
              Calage Fin de Latence (Nudge -300ms à +300ms) & Déplacement
            </span>
            <span className="text-[10px] text-[#1a1a1a]/60">
              Glissez directement l'onde sur le visualiseur ou affinez au millième de seconde avec le curseur.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              ref={nudgeValueLabelRef}
              className="text-base font-black px-3 py-0.5 bg-[#ece4d0] border-2 border-[#1a1a1a] rounded-sm text-[#1a1a1a]"
            >
              {initialNudgeMs > 0 ? `+${initialNudgeMs}` : initialNudgeMs} ms
            </span>
            <button
              onClick={handleResetNudge}
              className="p-1.5 bg-[#ece4d0] hover:bg-[#8b2a1a] hover:text-[#fdfaf2] border-2 border-[#1a1a1a] transition-colors rounded-sm cursor-pointer"
              title="Réinitialiser le Nudge à 0 ms"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <input
          id="vocal-nudge-slider"
          type="range"
          min="-300"
          max="300"
          step="1"
          defaultValue={initialNudgeMs}
          onChange={handleNudgeInput}
          className="w-full h-2.5 bg-[#ece4d0] rounded border border-[#1a1a1a] appearance-none cursor-pointer accent-[#8b2a1a]"
        />
      </div>

      {/* Preview and Validation Footer */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2 border-t-2 border-[#1a1a1a]/15">
        <button
          onClick={handleTogglePreview}
          className={`px-5 py-2.5 border-2 border-[#1a1a1a] font-bold text-xs rounded-sm cursor-pointer shadow-[3px_3px_0px_#1a1a1a] transition-all flex items-center gap-2 ${
            isPlayingPreview
              ? 'bg-[#8b2a1a] text-[#fdfaf2] hover:bg-[#1a1a1a]'
              : 'bg-[#2a5d4e] text-[#fdfaf2] hover:bg-[#1a1a1a]'
          }`}
        >
          {isPlayingPreview ? (
            <>
              <Square className="w-4 h-4 fill-current" />
              Arrêter Écoute
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              Écouter avec la Roda
            </>
          )}
        </button>

        <div className="flex gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-5 py-2.5 text-xs font-bold border-2 border-[#1a1a1a] bg-[#ece4d0] hover:bg-[#1a1a1a] hover:text-[#ece4d0] transition-colors cursor-pointer rounded-sm shadow-[3px_3px_0px_#1a1a1a]"
          >
            Annuler
          </button>
          <button
            onClick={handleValidate}
            disabled={isProcessing}
            className="px-5 py-2.5 text-xs font-bold bg-[#8b2a1a] text-[#fdfaf2] border-2 border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#ece4d0] transition-colors cursor-pointer rounded-sm shadow-[3px_3px_0px_#1a1a1a] flex items-center gap-2"
          >
            {isProcessing ? (
              <span>Rendu en cours...</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Valider le Sample
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
