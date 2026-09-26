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
import { useAudioStore } from '../stores/useAudioStore';

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
  targetMeasureIdx?: number | null;
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
  targetMeasureIdx,
  onSave,
  onCancel,
}) => {
  // Détermination robuste de la mesure effective M (Directive C)
  // Résolution définitive du bug "MESURE 52" : targetMeasureIdx prioritaire sur tout
  const storeTargetMeasure = useAudioStore.getState().targetMeasureIdx;
  const effectiveMeasure = (targetMeasureIdx !== undefined && targetMeasureIdx !== null && targetMeasureIdx >= 0)
    ? targetMeasureIdx
    : (storeTargetMeasure !== null && storeTargetMeasure !== undefined && storeTargetMeasure >= 0)
      ? storeTargetMeasure
      : 0;

  const anchorBpm = (measureBpms && measureBpms[effectiveMeasure % (measureBpms.length || 1)] > 0)
    ? measureBpms[effectiveMeasure % (measureBpms.length || 1)]
    : bpm;
  const targetSig = (measureTimeSigs && measureTimeSigs[effectiveMeasure % (measureTimeSigs.length || 1)]) || '4/4';
  const beatsCount = getBeatsPerMeasure(targetSig);
  const isCompound = targetSig === '6/8' || targetSig === '9/8' || targetSig === '12/8';
  const beatDurationSec = isCompound ? (90 / anchorBpm) : (60 / anchorBpm);
  const patternMeasures = Math.max(
    1,
    pattern.measureAssignments?.filter(Boolean).length || 1
  );

  // Exact duration of preceding measure M - 1 at its own BPM (or runway preRoll if M=0)
  const mPrev = Math.max(0, effectiveMeasure - 1);
  const prevBpm = (measureBpms && measureBpms[mPrev % (measureBpms.length || 1)] > 0)
    ? measureBpms[mPrev % (measureBpms.length || 1)]
    : anchorBpm;
  const prevSig = (measureTimeSigs && measureTimeSigs[mPrev % (measureTimeSigs.length || 1)]) || '4/4';
  const prevBeats = getBeatsPerMeasure(prevSig);
  const isCompoundPrev = prevSig === '6/8' || prevSig === '9/8' || prevSig === '12/8';
  const prevBeatDuration = isCompoundPrev ? (90 / prevBpm) : (60 / prevBpm);

  // 🛡️ RUNWAY GUARANTEE: Ne JAMAIS placer temps1Px à 0.
  // Conserver strictement un dégagement d'au moins une mesure à gauche (Directive 1)
  const t_temps1 = effectiveMeasure >= 1 
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

  // Musical measure cycle duration for loop playback
  const measureCycleDurationSec = patternMeasures * beatsCount * beatDurationSec;

  // Total board width calculation (partagé par tous les canvas pour alignement géométrique parfait)
  const totalBoardWidth = Math.max(temps1Px + Math.ceil(audioBuffer.duration * PIXELS_PER_SECOND) + 400, 1600);
  const canvasHeight = 144;

  // 🛡️ Mémorisation de l'état initial de boucle pour restauration scrupuleuse
  const savedLoopStateRef = useRef<{
    isLooping: boolean;
    loopStartMeasure: number | null;
    loopEndMeasure: number | null;
    isLoopRegionActive: boolean;
  } | null>(null);

  // Refs for 60 FPS DOM direct mutations (Zero Render Thrashing - Commandement 1)
  const staticGridCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const nudgeValueLabelRef = useRef<HTMLSpanElement>(null);
  const anacrusisBadgeRef = useRef<HTMLSpanElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const trimOverlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const activePlayersRef = useRef<Tone.Player[]>([]);
  const isPlayingPreviewRef = useRef(false);
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
  // Le sample importé s'initialise à waveX calé sur Temps 1 (Directive 1).
  // Si le motif possédait déjà une anacrouse enregistrée, repositionner l'onde fidèlement.
  const getInitialBaseWaveX = () => {
    if (pattern.vocalClip && pattern.vocalClip.anacrusisSec !== undefined) {
      return temps1Px - (pattern.vocalClip.anacrusisSec * PIXELS_PER_SECOND) - (defaultTrimStart * PIXELS_PER_SECOND);
    }
    // Ancrage géométrique par défaut à l'import : début absolu du canvas / piste d'élan [0, temps1Px]
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
  // Formule saine et unifiée : anacrusisSec = max(0, t_temps1 - (waveBaseXSec + trimStartSec)) (Directive C.1)
  const updateLiveTimingBadges = useCallback((_totalX?: number) => {
    const waveBaseXSec = waveBaseXRef.current / PIXELS_PER_SECOND;
    const anacrusisSec = Math.max(0, t_temps1 - (waveBaseXSec + trimStartSecRef.current));
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
  }, [t_temps1, beatDurationSec]);

  // Initialisation badge au montage
  useEffect(() => {
    updateLiveTimingBadges(currentTotalWaveXRef.current);
  }, [updateLiveTimingBadges]);

  // 1. Static Background Grid & Synthesizer Notes Layer (Directives A & B)
  // Dessiné UNE SEULE FOIS sur calque fixe : fond papier, lignes de subdivision, repères T1-T4, syllabes et notes
  useEffect(() => {
    if (!staticGridCanvasRef.current) return;
    const canvas = staticGridCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const width = totalBoardWidth;
    const height = canvasHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Fond papier Cordel (#f4ecd8)
    ctx.fillStyle = '#f4ecd8';
    ctx.fillRect(0, 0, width, height);

    const yCenter = height / 2; // y = 72px

    // Ligne d'axe médian discrète
    ctx.strokeStyle = 'rgba(139, 42, 26, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, yCenter);
    ctx.lineTo(width, yCenter);
    ctx.stroke();

    // 1. Grille & pastilles de la mesure précédente (Runway) : de 0 à temps1Px
    const stepsCountPrev = isCompoundPrev ? 12 : 16;
    const stepPxPrev = temps1Px / stepsCountPrev;
    ctx.lineWidth = 1;
    for (let s = 0; s < stepsCountPrev; s++) {
      const xPos = s * stepPxPrev;
      const isBeatPrev = (s % (isCompoundPrev ? 3 : 4) === 0);
      ctx.strokeStyle = isBeatPrev ? 'rgba(42, 93, 78, 0.25)' : 'rgba(26, 26, 26, 0.1)';
      ctx.lineWidth = isBeatPrev ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(xPos, 0);
      ctx.lineTo(xPos, height);
      ctx.stroke();

      if (pattern.preRollActiveSteps && pattern.preRollActiveSteps[s]) {
        ctx.fillStyle = '#2a5d4e';
        ctx.beginPath();
        ctx.arc(xPos + stepPxPrev / 2, yCenter, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        ctx.stroke();

        const preSyl = pattern.preRollLyrics?.[s];
        if (preSyl) {
          ctx.font = 'bold 11px monospace, sans-serif';
          ctx.fillStyle = '#2a5d4e';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(preSyl, xPos + stepPxPrev / 2, yCenter - 8);
        }
      }
    }

    // 2. Grille & partition vocale de la mesure M : à partir de temps1Px
    const syllables: string[] = (pattern as any).syllables || pattern.lyrics || [];
    const notes: string[] = pattern.notes || [];
    const activeSteps = pattern.activeSteps || [];
    const stepsCountM = pattern.steps || (isCompound ? 12 : 16);
    const measureMDurationSec = beatsCount * beatDurationSec;
    const stepPxM = (measureMDurationSec * PIXELS_PER_SECOND) / stepsCountM;

    for (let m = 0; m < patternMeasures; m++) {
      const mStartPx = temps1Px + m * (measureMDurationSec * PIXELS_PER_SECOND);

      // --- Tracé des lignes de pas et repères T1, T2, T3, T4 (Directive B) ---
      for (let s = 0; s < stepsCountM; s++) {
        const xPos = mStartPx + s * stepPxM;
        if (xPos > width) break;
        const beatStepInterval = isCompound ? 3 : 4;
        const isBeat = (s % beatStepInterval === 0);
        const beatNum = Math.floor(s / beatStepInterval) + 1;

        if (isBeat) {
          // Trait vertical renforcé (Directive B.1 : #8b2a1a, opacité 40%, largeur 2px)
          ctx.strokeStyle = 'rgba(139, 42, 26, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(xPos, 0);
          ctx.lineTo(xPos, height);
          ctx.stroke();

          // Repère textuel en haut de colonne : T1, T2, T3, T4 (Directive B.1)
          ctx.fillStyle = '#8b2a1a';
          ctx.fillRect(xPos, 0, 22, 14);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px monospace, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`T${beatNum}`, xPos + 11, 7);
        } else {
          // Subdivisions : lignes fines discrètes (Directive B.2)
          ctx.strokeStyle = 'rgba(26, 26, 26, 0.12)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(xPos, 14);
          ctx.lineTo(xPos, height);
          ctx.stroke();
        }
      }

      // --- Rendu intelligent des Attaques, Syllabes et Tenues (Directive A) ---
      for (let s = 0; s < stepsCountM; s++) {
        const stepVal = activeSteps[s];
        const isActive = stepVal !== undefined && stepVal !== null && stepVal !== 0 && stepVal !== '0';
        if (!isActive) continue;

        const syl = (syllables[s] || '').trim();
        const note = (notes[s] || '').trim();

        // 🛡️ SÉCURITÉ DE CODE OBLIGATOIRE : Vérification explicite de s > 0 avant d'accéder à s - 1
        const prevVal = s > 0 ? activeSteps[s - 1] : 0;
        const prevIsActive = s > 0 && prevVal !== undefined && prevVal !== null && prevVal !== 0 && prevVal !== '0';
        const prevNote = s > 0 ? (notes[s - 1] || '').trim() : '';

        // Détection de la tenue (Sustain "-")
        const isSustain = s > 0 && prevIsActive && (
          syl === '-' || syl === '—' || syl === '--' ||
          (syl === '' && note && note === prevNote)
        );

        // Si c'est une tenue, elle est couverte par la barre de liaison de l'attaque précédente
        if (isSustain) continue;

        // C'est une VRAIE ATTAQUE !
        // Détecter jusqu'où s'étend la tenue consécutive (Directive A.2)
        let sustainEndStep = s;
        for (let next = s + 1; next < stepsCountM; next++) {
          const nVal = activeSteps[next];
          const nActive = nVal !== undefined && nVal !== null && nVal !== 0 && nVal !== '0';
          const nSyl = (syllables[next] || '').trim();
          const nNote = (notes[next] || '').trim();
          const nIsSustain = nActive && (
            nSyl === '-' || nSyl === '—' || nSyl === '--' ||
            (nSyl === '' && nNote && nNote === note)
          );
          if (nIsSustain) {
            sustainEndStep = next;
          } else {
            break;
          }
        }

        const xCenter = mStartPx + s * stepPxM + stepPxM / 2;

        // 1. Barre horizontale de liaison reliant l'attaque à la fin de la tenue (Directive A.2)
        if (sustainEndStep > s) {
          const xEndCenter = mStartPx + sustainEndStep * stepPxM + stepPxM / 2;
          ctx.strokeStyle = '#8b2a1a';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(xCenter, yCenter);
          ctx.lineTo(xEndCenter, yCenter);
          ctx.stroke();

          // Encoche de fin de tenue
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(xEndCenter, yCenter - 4);
          ctx.lineTo(xEndCenter, yCenter + 4);
          ctx.stroke();
        }

        // 2. Pastille pleine de l'attaque (#8b2a1a) (Directive A.1)
        ctx.fillStyle = '#8b2a1a';
        ctx.beginPath();
        ctx.arc(xCenter, yCenter, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f4ecd8';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 3. Texte de la syllabe au-dessus de la pastille en gras 12px (Directive A.1)
        const displaySyl = syl && syl !== '-' && syl !== '—' && syl !== '--' ? syl : '';
        if (displaySyl) {
          ctx.font = 'bold 12px monospace, sans-serif';
          ctx.fillStyle = '#8b2a1a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(displaySyl, xCenter, yCenter - 10);
        }

        // 4. Hauteur de note sous la pastille (Directive A.3)
        if (note) {
          ctx.font = 'bold 9px monospace, sans-serif';
          ctx.fillStyle = 'rgba(26, 26, 26, 0.75)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(note, xCenter, yCenter + 10);
        }
      }
    }
  }, [beatsCount, beatDurationSec, isCompound, isCompoundPrev, pattern, patternMeasures, temps1Px, totalBoardWidth]);

  // 2. Waveform Peaks Render avec Normalisation Dynamique & DPR Scaling (Directive A)
  // Transparent pour laisser transparaître le calque statique
  useEffect(() => {
    if (!audioBuffer || !waveformCanvasRef.current) return;

    const canvas = waveformCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const bufferPxWidth = Math.ceil(audioBuffer.duration * PIXELS_PER_SECOND);
    const height = canvasHeight;

    canvas.width = Math.round(bufferPxWidth * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${bufferPxWidth}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Extract peaks once if not already cached in ref
    if (!cachedPeaksRef.current) {
      cachedPeaksRef.current = extractPeaks(audioBuffer, bufferPxWidth);
    }

    const peaks = cachedPeaksRef.current;
    const numPoints = peaks.length / 2;

    // Normalisation visuelle dynamique : calcul du pic crête maximal
    let maxGlobalPeak = 0.001;
    for (let i = 0; i < numPoints; i++) {
      const absMin = Math.abs(peaks[i * 2]);
      const absMax = Math.abs(peaks[i * 2 + 1]);
      if (absMin > maxGlobalPeak) maxGlobalPeak = absMin;
      if (absMax > maxGlobalPeak) maxGlobalPeak = absMax;
    }

    const targetOccupancy = 0.75; // 75% de la hauteur utile
    const usefulHalfHeight = (height / 2) * targetOccupancy;
    const dynamicAmp = usefulHalfHeight / maxGlobalPeak;
    const amp = Math.min(dynamicAmp, (height / 2) * 50);

    // Effacer (fond transparent pour laisser transparaître le calque statique)
    ctx.clearRect(0, 0, bufferPxWidth, height);

    // Ligne centrale de l'onde
    ctx.strokeStyle = 'rgba(139, 42, 26, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(bufferPxWidth, height / 2);
    ctx.stroke();

    // Crêtes de l'onde en Rouge Argile Cordel (#8b2a1a)
    ctx.fillStyle = '#8b2a1a';
    for (let i = 0; i < numPoints; i++) {
      const min = peaks[i * 2];
      const max = peaks[i * 2 + 1];
      const x = i;
      const y = height / 2 + min * amp;
      const h = Math.max(1.5, (max - min) * amp);
      ctx.fillRect(x, y, 1.5, h);
    }
  }, [audioBuffer]);

  // 3. Draw Trim overlay solidaire de l'audioBuffer sur trimOverlayCanvas (Directive C.2)
  useEffect(() => {
    if (!trimOverlayCanvasRef.current || !audioBuffer) return;

    const canvas = trimOverlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const bufferPxWidth = Math.ceil(audioBuffer.duration * PIXELS_PER_SECOND);
    const height = canvasHeight;

    canvas.width = Math.round(bufferPxWidth * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${bufferPxWidth}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, bufferPxWidth, height);

    const startPx = trimStartSec * PIXELS_PER_SECOND;
    const endPx = trimEndSec * PIXELS_PER_SECOND;

    // Teinte sombre Cordel pour les zones rognées
    ctx.fillStyle = 'rgba(26, 26, 26, 0.55)';
    ctx.fillRect(0, 0, startPx, height);
    if (endPx < bufferPxWidth) {
      ctx.fillRect(endPx, 0, bufferPxWidth - endPx, height);
    }

    // Ligne Trim Début (Vert)
    ctx.strokeStyle = '#2a5d4e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(startPx, 0);
    ctx.lineTo(startPx, height);
    ctx.stroke();

    // Étiquette Poignée Trim Début
    ctx.fillStyle = '#2a5d4e';
    ctx.fillRect(startPx, 0, 68, 16);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('TRIM DÉBUT', startPx + 4, 11);

    // Ligne Trim Fin (Rouge sombre)
    ctx.strokeStyle = '#8b2a1a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(endPx, 0);
    ctx.lineTo(endPx, height);
    ctx.stroke();

    // Étiquette Poignée Trim Fin
    const labelEndWidth = 58;
    const labelEndX = Math.max(0, endPx - labelEndWidth);
    ctx.fillStyle = '#8b2a1a';
    ctx.fillRect(labelEndX, 0, labelEndWidth, 16);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('TRIM FIN', labelEndX + 5, 11);

    updateLiveTimingBadges(currentTotalWaveXRef.current);
  }, [audioBuffer, trimStartSec, trimEndSec, updateLiveTimingBadges]);

  // 4. Pré-écoute synchronisée avec la Roda (Formule unifiée & loop calée sur effectiveMeasure - Directives B & C)
  const stopLocalPreview = useCallback(() => {
    isPlayingPreviewRef.current = false;
    if (previewLoopTimeoutRef.current) {
      clearTimeout(previewLoopTimeoutRef.current);
      previewLoopTimeoutRef.current = null;
    }
    activePlayersRef.current.forEach((p) => {
      try {
        p.stop();
        p.dispose();
      } catch (_) {}
    });
    activePlayersRef.current = [];
  }, []);

  const scheduleVocalIteration = useCallback((iterationTime: number) => {
    if (!isPlayingPreviewRef.current) return;

    const tStart = trimStartSecRef.current;
    const tEnd = trimEndSecRef.current;
    const duration = Math.max(0.05, tEnd - tStart);

    const player = new Tone.Player(audioBuffer);
    player.volume.value = 0;
    player.toDestination();

    const rawCtx = (Tone.getContext().rawContext || Tone.context) as AudioContext;
    const now = (rawCtx ? rawCtx.currentTime : Tone.context.currentTime);

    if (iterationTime >= now) {
      player.start(iterationTime, tStart, duration);
    } else {
      const pastSec = now - iterationTime;
      if (pastSec < duration) {
        player.start(now, tStart + pastSec, duration - pastSec);
      }
    }
    activePlayersRef.current.push(player);

    if (activePlayersRef.current.length > 3) {
      const old = activePlayersRef.current.shift();
      try { old?.dispose(); } catch (_) {}
    }

    // Programmer l'itération suivante calée sur l'horloge Web Audio (zéro dérive)
    const nextIterationTime = iterationTime + measureCycleDurationSec;
    const msUntilNext = (nextIterationTime - now - 0.1) * 1000;

    previewLoopTimeoutRef.current = setTimeout(() => {
      if (isPlayingPreviewRef.current) {
        scheduleVocalIteration(nextIterationTime);
      }
    }, Math.max(20, msUntilNext));
  }, [audioBuffer, measureCycleDurationSec]);

  const handleTogglePreview = async () => {
    if (isPlayingPreview) {
      setIsPlayingPreview(false);
      isPlayingPreviewRef.current = false;
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
        await Tone.start();
      } catch (_) {}

      // Mémoriser l'état initial de boucle
      const currentSeq = useSequencerStore.getState();
      savedLoopStateRef.current = {
        isLooping: currentSeq.isLooping,
        loopStartMeasure: currentSeq.loopStartMeasure,
        loopEndMeasure: currentSeq.loopEndMeasure,
        isLoopRegionActive: currentSeq.isLoopRegionActive,
      };

      const mLoopStart = effectiveMeasure;
      const mLoopEnd = effectiveMeasure;

      // Définir les bornes de boucle sur la fenêtre utile [effectiveMeasure, effectiveMeasure + 1] (Directive C)
      useSequencerStore.setState({
        isLooping: true,
        isLoopRegionActive: true,
        loopStartMeasure: mLoopStart,
        loopEndMeasure: mLoopEnd,
      });

      // Synchronisation matérielle avec délai de prévenance leadTime
      const waveBaseXSec = waveBaseXRef.current / PIXELS_PER_SECOND;
      const anacrusisSec = Math.max(0, t_temps1 - (waveBaseXSec + trimStartSecRef.current));
      const deltaSec = anacrusisSec - (nudgeMsRef.current / 1000);
      const leadTime = Math.max(0.06, deltaSec + 0.05);

      const rawCtx = (Tone.getContext().rawContext || Tone.context) as AudioContext;
      const now = (rawCtx ? rawCtx.currentTime : Tone.context.currentTime);
      const bateriaStartTime = now + leadTime;
      const vocalStartTime = bateriaStartTime - deltaSec;

      setIsPlayingPreview(true);
      isPlayingPreviewRef.current = true;

      // Démarrage de la Roda calée sur bateriaStartTime
      await handleTogglePlay({
        skipPreRoll: true,
        targetMeasure: mLoopStart,
        scheduledStartTime: bateriaStartTime,
      });

      scheduleVocalIteration(vocalStartTime);
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

  // 5. Drag & Drop robuste à 60 FPS (Commandements 1, 2, 3)
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

  // 6. Fine Nudge Slider (-300ms to +300ms) with 60 FPS DOM Manipulation
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

  // 7. Validation via OfflineAudioContext with 10ms/30ms anti-pop fades
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

      // Calcul sain de l'anacrouse basée sur le point Trim Début sous Temps 1 (Directive C.1)
      const waveBaseXSec = waveBaseXRef.current / PIXELS_PER_SECOND;
      const anacrusisSec = Math.max(0, t_temps1 - (waveBaseXSec + trimStartSec));
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

          {/* TEMPS 1 Fixed Guide Line Badge (Directive C) */}
          <div
            style={{ left: `${temps1Px}px` }}
            className="absolute top-0 bottom-0 flex items-center -translate-x-1/2 z-30 pointer-events-none"
          >
            <div className="px-2.5 py-0.5 bg-[#dc2626] text-white text-[9px] font-black uppercase tracking-wider border border-[#1a1a1a] shadow-[0_0_8px_rgba(220,38,38,0.8)]">
              TEMPS 1 / CHANT (MESURE {effectiveMeasure + 1})
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
              width: `${totalBoardWidth}px`,
              height: '1px',
              pointerEvents: 'none',
            }}
          />

          {/* Calque statique d'arrière-plan (Grille de pas + T1-T4 + syllabes et notes) (Directives A & B) */}
          <canvas
            ref={staticGridCanvasRef}
            className="absolute top-0 bottom-0 left-0 pointer-events-none z-0"
            height={144}
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
            className="absolute top-0 bottom-0 left-0 z-10 pointer-events-none"
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
