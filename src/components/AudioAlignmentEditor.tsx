/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { Play, Square, Save, RotateCcw, Scissors, Music, MoveHorizontal, Maximize2, ZoomIn, ZoomOut, Check } from 'lucide-react';
import { Pattern, VocalClipMeta } from '../types/store.types';
import { useAudio } from '../contexts/AudioContext';
import { extractPeaks, renderTrimmedVocalBuffer, audioBufferToWav } from '../utils/audioBufferUtils';
import { getBeatsPerMeasure } from '../utils/measureHelpers';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudioStore } from '../stores/useAudioStore';

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
  initialSampleBpm?: number;
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
  initialSampleBpm,
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

  const lang = useSequencerStore(state => state.lang);

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

  // Échelle temporelle dynamique (Directive B.1 : 50 px/s à 300 px/s)
  const [pixelsPerSecond, setPixelsPerSecond] = useState<number>(200);

  // 🛡️ RUNWAY GUARANTEE: Ne JAMAIS placer temps1Px à 0.
  // Conserver strictement un dégagement d'au moins une mesure à gauche (Directive 1)
  const t_temps1 = effectiveMeasure >= 1 
    ? (prevBeats * prevBeatDuration) 
    : (preRollDurationSec > 0 ? preRollDurationSec : beatsCount * beatDurationSec);
  const temps1Px = t_temps1 * pixelsPerSecond;

  // Initial trim, nudge and source sample BPM states
  const defaultTrimStart = isImported ? 0 : (initialTrimStartSec !== undefined ? initialTrimStartSec : 0);
  const defaultTrimEnd = isImported ? audioBuffer.duration : (initialTrimEndSec !== undefined ? initialTrimEndSec : audioBuffer.duration);
  const defaultNudgeMs = isImported ? 0 : (initialNudgeMs ?? 0);
  const defaultSampleBpm = initialSampleBpm ?? pattern.vocalClip?.sampleBpm ?? pattern.vocalClip?.baseBpm ?? anchorBpm;

  const [trimStartSec, setTrimStartSec] = useState(defaultTrimStart);
  const [trimEndSec, setTrimEndSec] = useState(defaultTrimEnd);
  const [sampleBpm, setSampleBpm] = useState<number>(defaultSampleBpm);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Musical measure cycle duration for loop playback
  const measureCycleDurationSec = patternMeasures * beatsCount * beatDurationSec;

  // Largeur totale calculée dynamiquement selon pixelsPerSecond
  const bufferPxWidth = Math.ceil(audioBuffer.duration * pixelsPerSecond);
  const totalBoardWidth = Math.max(temps1Px + bufferPxWidth + 600, 1600);
  const canvasHeight = 144;

  // 🛡️ Mémorisation de l'état initial de boucle pour restauration scrupuleuse
  const savedLoopStateRef = useRef<{
    isLooping: boolean;
    loopStartMeasure: number | null;
    loopEndMeasure: number | null;
    isLoopRegionActive: boolean;
  } | null>(null);

  // Refs for 60 FPS DOM direct mutations (Zero Render Thrashing - Commandement 1)
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const staticGridCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const nudgeValueLabelRef = useRef<HTMLSpanElement>(null);
  const anacrusisBadgeRef = useRef<HTMLSpanElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const trimOverlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const activePlayersRef = useRef<Tone.Player[]>([]);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isPlayingPreviewRef = useRef(false);
  const previewLoopTimeoutRef = useRef<any>(null);

  // Cached Peaks extracted ONCE per resolution (Zero Layout Thrashing & Waveform Persistence)
  const cachedPeaksRef = useRef<Float32Array | null>(null);
  const cachedPeaksWidthRef = useRef<number>(0);

  // Refs for live state values during preview loops
  const nudgeMsRef = useRef(defaultNudgeMs);
  const trimStartSecRef = useRef(trimStartSec);
  const trimEndSecRef = useRef(trimEndSec);
  const sampleBpmRef = useRef(sampleBpm);

  useEffect(() => {
    sampleBpmRef.current = sampleBpm;
  }, [sampleBpm]);

  // Refs for interactive Trim drag handles
  const isDraggingTrimRef = useRef<'start' | 'end' | null>(null);
  const trimDragStartXRef = useRef(0);
  const trimDragStartSecRef = useRef(0);

  useEffect(() => {
    trimStartSecRef.current = trimStartSec;
  }, [trimStartSec]);

  useEffect(() => {
    trimEndSecRef.current = trimEndSec;
  }, [trimEndSec]);

  // Détection de la présence réelle de notes ou de syllabes sur la mesure M-1
  const hasPreRollSyllables = Boolean(
    (pattern.preRollActiveSteps && pattern.preRollActiveSteps.some(Boolean)) ||
    (pattern.preRollLyrics && pattern.preRollLyrics.some((s) => s && s.trim().length > 0)) ||
    (pattern.preRollNotes && pattern.preRollNotes.some((n) => n && n.trim().length > 0))
  );

  // Positionnement initial :
  // Le sample importé s'initialise inconditionnellement à waveBaseX = 0 (début de la piste d'élan).
  // Si le motif possédait déjà un décalage ou une anacrouse enregistrée (réouverture hors-import), repositionner l'onde fidèlement.
  const getInitialBaseWaveX = (pps: number) => {
    if (!isImported && pattern.vocalClip) {
      if (pattern.vocalClip.startOffsetSec !== undefined) {
        return (t_temps1 * pps) + (pattern.vocalClip.startOffsetSec * pps) - (defaultTrimStart * pps);
      }
      if (pattern.vocalClip.anacrusisSec !== undefined) {
        return (t_temps1 * pps) - (pattern.vocalClip.anacrusisSec * pps) - (defaultTrimStart * pps);
      }
    }
    // Ancrage géométrique inconditionnel pour tout import audio : 0 (piste d'élan [0, temps1Px])
    return 0;
  };

  const waveBaseXRef = useRef<number>(getInitialBaseWaveX(200));
  // Mémorisation de la position temporelle en secondes pour préservation absolue lors du zoom
  const waveBaseXSecRef = useRef<number>(getInitialBaseWaveX(200) / 200);
  const currentTotalWaveXRef = useRef<number>(
    waveBaseXRef.current + (defaultNudgeMs / 1000) * 200
  );

  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartBaseXRef = useRef(0);

  const { handleTogglePlay, handleStop } = useAudio();

  // Calcul signé universel du décalage par rapport au Temps 1 :
  // Déplacement vers la gauche : départ avant T1 (startOffsetSec < 0, anacrouse)
  // Déplacement vers la droite : départ après T1 (startOffsetSec > 0, départ différé / syncope)
  const calculateStartOffsetSec = useCallback((baseX: number, trimStart: number) => {
    const waveBaseXSec = baseX / pixelsPerSecond;
    const attackPosSec = waveBaseXSec + trimStart;
    return attackPosSec - t_temps1;
  }, [t_temps1, pixelsPerSecond]);

  // Mise à jour synchrone des badges de calage temporel (Zero Render Thrashing)
  const updateLiveTimingBadges = useCallback((_totalX?: number) => {
    const startOffsetSec = calculateStartOffsetSec(waveBaseXRef.current, trimStartSecRef.current);
    let offsetMs = Math.round(startOffsetSec * 1000);
    if (Math.abs(offsetMs) <= 1) {
      offsetMs = 0;
    }

    if (anacrusisBadgeRef.current) {
      if (offsetMs < 0) {
        anacrusisBadgeRef.current.textContent = lang === 'fr'
          ? `ANACROUSE : ${Math.abs(offsetMs)} MS (AVANT TEMPS 1)`
          : `ANACRUSE : ${Math.abs(offsetMs)} MS (ANTES DO TEMPO 1)`;
        anacrusisBadgeRef.current.style.color = '#2a5d4e';
      } else if (offsetMs > 0) {
        anacrusisBadgeRef.current.textContent = lang === 'fr'
          ? `DÉPART DIFFÉRÉ : +${offsetMs} MS (APRÈS TEMPS 1)`
          : `PARTIDA ATRASADA : +${offsetMs} MS (APÓS TEMPO 1)`;
        anacrusisBadgeRef.current.style.color = '#8b2a1a';
      } else {
        anacrusisBadgeRef.current.textContent = lang === 'fr' ? 'TEMPS 1 CALÉ (0 MS)' : 'TEMPO 1 ALINHADO (0 MS)';
        anacrusisBadgeRef.current.style.color = '#1a1a1a';
      }
    }
  }, [calculateStartOffsetSec, lang]);

  // Initialisation badge et translation GPU immédiate au montage
  useEffect(() => {
    if (waveformContainerRef.current) {
      waveformContainerRef.current.style.transform = `translate3d(${currentTotalWaveXRef.current}px, 0, 0)`;
    }
    updateLiveTimingBadges(currentTotalWaveXRef.current);
  }, [updateLiveTimingBadges]);

  // Synchronisation temporelle stricte lors d'une variation de zoom (pixelsPerSecond)
  useEffect(() => {
    const newBaseX = waveBaseXSecRef.current * pixelsPerSecond;
    waveBaseXRef.current = newBaseX;
    const totalX = newBaseX + (nudgeMsRef.current / 1000) * pixelsPerSecond;
    currentTotalWaveXRef.current = totalX;
    if (waveformContainerRef.current) {
      waveformContainerRef.current.style.transform = `translate3d(${totalX}px, 0, 0)`;
    }
    updateLiveTimingBadges(totalX);
  }, [pixelsPerSecond, updateLiveTimingBadges]);

  // Synchronisation stricte si l'audioBuffer ou isImported change
  useEffect(() => {
    const initX = getInitialBaseWaveX(pixelsPerSecond);
    waveBaseXRef.current = initX;
    waveBaseXSecRef.current = initX / pixelsPerSecond;
    const totalX = initX + (defaultNudgeMs / 1000) * pixelsPerSecond;
    currentTotalWaveXRef.current = totalX;
    if (waveformContainerRef.current) {
      waveformContainerRef.current.style.transform = `translate3d(${totalX}px, 0, 0)`;
    }
    updateLiveTimingBadges(totalX);
  }, [audioBuffer, isImported, pixelsPerSecond, updateLiveTimingBadges]);

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
    const stepPxM = (measureMDurationSec * pixelsPerSecond) / stepsCountM;

    for (let m = 0; m < patternMeasures; m++) {
      const mStartPx = temps1Px + m * (measureMDurationSec * pixelsPerSecond);

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
  }, [beatsCount, beatDurationSec, isCompound, isCompoundPrev, pattern, patternMeasures, temps1Px, totalBoardWidth, pixelsPerSecond]);

  // 2. Waveform Peaks Render avec Normalisation Dynamique & DPR Scaling (Directive A)
  // Transparent pour laisser transparaître le calque statique
  useEffect(() => {
    if (!audioBuffer || !waveformCanvasRef.current) return;

    const canvas = waveformCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const currentBufferPxWidth = Math.ceil(audioBuffer.duration * pixelsPerSecond);
    const height = canvasHeight;

    canvas.width = Math.round(currentBufferPxWidth * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${currentBufferPxWidth}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Extract peaks once or when pixel width changes
    if (!cachedPeaksRef.current || cachedPeaksWidthRef.current !== currentBufferPxWidth) {
      cachedPeaksRef.current = extractPeaks(audioBuffer, currentBufferPxWidth);
      cachedPeaksWidthRef.current = currentBufferPxWidth;
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
    ctx.clearRect(0, 0, currentBufferPxWidth, height);

    // Ligne centrale de l'onde
    ctx.strokeStyle = 'rgba(139, 42, 26, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(currentBufferPxWidth, height / 2);
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
  }, [audioBuffer, pixelsPerSecond]);

  // 3. Draw Trim overlay solidaire de l'audioBuffer sur trimOverlayCanvas (Directive C.2)
  useEffect(() => {
    if (!trimOverlayCanvasRef.current || !audioBuffer) return;

    const canvas = trimOverlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const currentBufferPxWidth = Math.ceil(audioBuffer.duration * pixelsPerSecond);
    const height = canvasHeight;

    canvas.width = Math.round(currentBufferPxWidth * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${currentBufferPxWidth}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, currentBufferPxWidth, height);

    const startPx = trimStartSec * pixelsPerSecond;
    const endPx = trimEndSec * pixelsPerSecond;

    // Teinte sombre Cordel pour les zones rognées
    ctx.fillStyle = 'rgba(26, 26, 26, 0.55)';
    ctx.fillRect(0, 0, startPx, height);
    if (endPx < currentBufferPxWidth) {
      ctx.fillRect(endPx, 0, currentBufferPxWidth - endPx, height);
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
  }, [audioBuffer, trimStartSec, trimEndSec, pixelsPerSecond, updateLiveTimingBadges]);

  // 4. Pré-écoute synchronisée avec la Roda (Formule unifiée & loop calée sur effectiveMeasure - Directives B & C)
  // 🛡️ Kill-Switch impératif sur la pré-écoute (Directive 2.C)
  const killSwitch = useCallback(() => {
    isPlayingPreviewRef.current = false;
    setIsPlayingPreview(false);
    if (previewLoopTimeoutRef.current) {
      clearTimeout(previewLoopTimeoutRef.current);
      previewLoopTimeoutRef.current = null;
    }
    activePlayersRef.current.forEach((p) => {
      try {
        p.stop();
        p.disconnect();
        p.dispose();
      } catch (_) {}
    });
    activePlayersRef.current = [];
    if (previewSourceRef.current) {
      try {
        previewSourceRef.current.stop();
        previewSourceRef.current.disconnect();
      } catch (_) {}
      previewSourceRef.current = null;
    }
    try {
      Tone.Transport.stop();
      Tone.Transport.cancel();
    } catch (_) {}
    handleStop();
  }, [handleStop]);

  const scheduleVocalIteration = useCallback((iterationTime: number) => {
    if (!isPlayingPreviewRef.current) return;

    const tStart = trimStartSecRef.current;
    const tEnd = trimEndSecRef.current;
    const duration = Math.max(0.05, tEnd - tStart);

    const sBpm = sampleBpmRef.current > 0 ? sampleBpmRef.current : anchorBpm;
    const rate = sBpm > 0 ? (anchorBpm / sBpm) : 1.0;
    const isPure = Math.abs(rate - 1.0) < 0.001;

    let player: Tone.Player | Tone.GrainPlayer;
    if (isPure) {
      const directPlayer = new Tone.Player(audioBuffer);
      directPlayer.playbackRate = 1.0;
      directPlayer.fadeIn = 0.01;
      directPlayer.fadeOut = 0.03;
      directPlayer.loop = false;
      player = directPlayer;
    } else {
      const grainPlayer = new Tone.GrainPlayer(audioBuffer);
      grainPlayer.grainSize = 0.09;
      grainPlayer.overlap = 0.04;
      grainPlayer.playbackRate = rate;
      grainPlayer.loop = false;
      player = grainPlayer;
    }

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
    activePlayersRef.current.push(player as any);

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
      killSwitch();

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
      const startOffsetSec = calculateStartOffsetSec(waveBaseXRef.current, trimStartSecRef.current);
      const totalOffsetSec = startOffsetSec + (nudgeMsRef.current / 1000);
      const leadTime = totalOffsetSec < 0 ? Math.max(0.06, Math.abs(totalOffsetSec) + 0.05) : 0.06;

      const rawCtx = (Tone.getContext().rawContext || Tone.context) as AudioContext;
      const now = (rawCtx ? rawCtx.currentTime : Tone.context.currentTime);
      const bateriaStartTime = now + leadTime;
      const vocalStartTime = bateriaStartTime + totalOffsetSec;

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
      killSwitch();
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
  }, [killSwitch]);

  // 5. Drag & Drop robuste de la forme d'onde à 60 FPS (Commandements 1, 2, 3)
  const handleWaveformPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartBaseXRef.current = waveBaseXRef.current;
  };

  const handleWaveformPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartXRef.current;
    let newBaseX = dragStartBaseXRef.current + deltaX;

    // Snap magnétique subtil au Temps 1 (rayon de 4 pixels pour calage aisé sans contrainte)
    const attackX = newBaseX + (trimStartSecRef.current * pixelsPerSecond);
    if (Math.abs(attackX - temps1Px) < 4) {
      newBaseX = temps1Px - (trimStartSecRef.current * pixelsPerSecond);
    }

    waveBaseXRef.current = newBaseX;
    waveBaseXSecRef.current = newBaseX / pixelsPerSecond;
    const totalX = newBaseX + (nudgeMsRef.current / 1000) * pixelsPerSecond;
    currentTotalWaveXRef.current = totalX;

    // Zero Render Thrashing & Zero Layout Thrashing (Mutation GPU directe)
    if (waveformContainerRef.current) {
      waveformContainerRef.current.style.transform = `translate3d(${totalX}px, 0, 0)`;
    }
    updateLiveTimingBadges(totalX);
  };

  const handleWaveformPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
      isDraggingRef.current = false;
    }
  };

  // 5b. Capture de pointeur sur les poignées de Trim Début et Trim Fin (Consigne 2)
  const handleTrimPointerDown = (e: React.PointerEvent<HTMLDivElement>, type: 'start' | 'end') => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
    isDraggingTrimRef.current = type;
    trimDragStartXRef.current = e.clientX;
    trimDragStartSecRef.current = type === 'start' ? trimStartSecRef.current : trimEndSecRef.current;
  };

  const handleTrimPointerMove = (e: React.PointerEvent<HTMLDivElement>, type: 'start' | 'end') => {
    if (isDraggingTrimRef.current !== type) return;
    e.stopPropagation();
    const deltaX = e.clientX - trimDragStartXRef.current;
    const deltaSec = deltaX / pixelsPerSecond;
    const newSec = trimDragStartSecRef.current + deltaSec;

    if (type === 'start') {
      const clamped = Math.max(0, Math.min(trimEndSecRef.current - 0.05, newSec));
      setTrimStartSec(clamped);
      trimStartSecRef.current = clamped;
    } else {
      const clamped = Math.min(audioBuffer.duration, Math.max(trimStartSecRef.current + 0.05, newSec));
      setTrimEndSec(clamped);
      trimEndSecRef.current = clamped;
    }
    updateLiveTimingBadges(currentTotalWaveXRef.current);
  };

  const handleTrimPointerUp = (e: React.PointerEvent<HTMLDivElement>, type: 'start' | 'end') => {
    if (isDraggingTrimRef.current === type) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
      isDraggingTrimRef.current = null;
    }
  };

  // 5c. Défilement horizontal naturel à la molette / trackpad (Directive A)
  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return;
    if (!e.ctrlKey) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        scrollContainerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  // 5d. Contrôles de Zoom Temporel & « Vue d'ensemble » (Directive B)
  const handleFitToWindow = () => {
    if (!scrollContainerRef.current) return;
    const viewportWidth = scrollContainerRef.current.clientWidth || 900;
    const waveStartSec = Math.max(0, waveBaseXSecRef.current);
    const measureMDurationSec = beatsCount * beatDurationSec;
    const totalTimelineDurationSec = Math.max(
      t_temps1 + patternMeasures * measureMDurationSec,
      waveStartSec + audioBuffer.duration,
      audioBuffer.duration,
      4
    ) + 0.5;

    const idealPps = Math.max(50, Math.min(300, Math.floor((viewportWidth - 80) / totalTimelineDurationSec)));
    setPixelsPerSecond(idealPps);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
  };

  const handleResetZoom1x = () => {
    setPixelsPerSecond(200);
  };

  const handleZoomIn = () => {
    setPixelsPerSecond((prev) => Math.min(300, prev + 25));
  };

  const handleZoomOut = () => {
    setPixelsPerSecond((prev) => Math.max(50, prev - 25));
  };

  // 6. Fine Nudge Slider (-300ms to +300ms) with 60 FPS DOM Manipulation
  const handleNudgeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    nudgeMsRef.current = val;

    const totalX = waveBaseXRef.current + (val / 1000) * pixelsPerSecond;
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
    killSwitch();

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

      // Calcul assaini du décalage signé par rapport au Temps 1
      const startOffsetSec = calculateStartOffsetSec(waveBaseXRef.current, trimStartSec);
      const anacrusisSec = startOffsetSec < 0 ? Math.abs(startOffsetSec) : 0;
      const anacrusisBeats = anacrusisSec / beatDurationSec;

      // Découplage absolu : sampleBpm est le tempo d'origine du fichier audio (pré-rempli avec anchorBpm)
      // Rétrocompatibilité : baseBpm est synchronisé avec sampleBpm
      const validatedSampleBpm = (typeof sampleBpm === 'number' && sampleBpm > 20 && Number.isFinite(sampleBpm))
        ? Math.round(sampleBpm * 10) / 10
        : anchorBpm;

      const meta: VocalClipMeta = {
        patternId: pattern.id,
        sampleBpm: validatedSampleBpm,
        baseBpm: validatedSampleBpm,
        trimStartSec: 0,
        trimEndSec: cleanBuffer.duration,
        nudgeMs: nudgeMsRef.current,
        anacrusisBeats,
        anacrusisSec,
        startOffsetSec,
        // Backward compatibility
        offsetStart: 0,
        startTimeDelay: nudgeMsRef.current / 1000,
        bpmSync: true,
        offsetEnd: cleanBuffer.duration,
        updatedAt: Date.now(),
      };

      onSave(cleanBuffer, wavBlob, meta);
    } catch (err) {
      console.error('Erreur lors du rendu du buffer vocal :', err);
      setIsProcessing(false);
    }
  };

  const bufferDuration = audioBuffer.duration;

  return (
    <div className="flex flex-col gap-4 select-none font-mono">
      {/* Barre d'outils supérieure : Infos, Anacrouse & Zoom Temporel (Directives B.1, B.2, B.3) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-[#8b2a1a]" />
          <span className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">
            {lang === 'fr' ? 'Alignement Vocal : ' : 'Alinhamento Vocal : '}<span className="text-[#8b2a1a]">{pattern.name}</span>
          </span>
          <span
            ref={anacrusisBadgeRef}
            className="px-2 py-0.5 bg-[#ece4d0] border border-[#1a1a1a] text-[10px] font-black uppercase font-mono tracking-wider shadow-[1px_1px_0px_#1a1a1a]"
            style={{ color: '#1a1a1a' }}
          >
            {lang === 'fr' ? 'TEMPS 1 CALÉ (0 MS)' : 'TEMPO 1 ALINHADO (0 MS)'}
          </span>
        </div>

        {/* Contrôles BPM Source du Sample (Directive 2) */}
        <div className="flex items-center gap-1.5 bg-[#ece4d0] border-2 border-[#1a1a1a] px-2.5 py-1 rounded-sm shadow-[2px_2px_0px_#1a1a1a]">
          <label htmlFor="sample-bpm-input" className="text-[10px] font-black text-[#1a1a1a]/80 uppercase tracking-wider select-none">
            {lang === 'fr' ? 'BPM du sample :' : 'BPM da amostra :'}
          </label>
          <input
            id="sample-bpm-input"
            type="number"
            min="20"
            max="300"
            step="1"
            value={sampleBpm}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) {
                setSampleBpm(Math.max(20, Math.min(300, val)));
              }
            }}
            className="w-14 px-1 py-0.5 text-center text-xs font-mono font-bold bg-[#fdfaf2] text-[#1a1a1a] border border-[#1a1a1a] rounded-sm focus:outline-none focus:ring-1 focus:ring-[#8b2a1a]"
            title={lang === 'fr' ? "Tempo source de la prise audio (DAW externe ou métronome)" : "Andamento de origem do áudio (DAW externa ou metrônomo)"}
          />
          <span className="text-[10px] font-bold text-[#1a1a1a]/60 select-none">BPM</span>
          {sampleBpm > 0 && Math.abs((anchorBpm / sampleBpm) - 1.0) >= 0.001 && (
            <span
              className="text-[9px] font-black px-1.5 py-0.5 bg-[#8b2a1a] text-white rounded-xs border border-[#1a1a1a] tracking-tight shadow-[1px_1px_0px_#1a1a1a]"
              title={lang === 'fr' ? `Ratio de time-stretching calculé : x${(anchorBpm / sampleBpm).toFixed(2)}` : `Proporção de time-stretch calculada : x${(anchorBpm / sampleBpm).toFixed(2)}`}
            >
              x{(anchorBpm / sampleBpm).toFixed(2)}
            </span>
          )}
        </div>

        {/* Contrôles de Zoom Temporel & Adaptation écran */}
        <div className="flex items-center gap-1.5 bg-[#ece4d0] border-2 border-[#1a1a1a] px-2 py-1 rounded-sm shadow-[2px_2px_0px_#1a1a1a]">
          <span className="text-[10px] font-black text-[#1a1a1a]/70 uppercase mr-1">Zoom :</span>
          
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={pixelsPerSecond <= 50}
            className="p-1 bg-[#f4ecd8] hover:bg-[#8b2a1a] hover:text-white disabled:opacity-40 border border-[#1a1a1a] rounded-sm transition-colors cursor-pointer"
            title={lang === 'fr' ? "Zoom arrière (-25 px/s)" : "Diminuir zoom (-25 px/s)"}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-[10px] font-mono font-bold text-[#1a1a1a] min-w-[54px] text-center">
            {pixelsPerSecond} px/s
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={pixelsPerSecond >= 300}
            className="p-1 bg-[#f4ecd8] hover:bg-[#8b2a1a] hover:text-white disabled:opacity-40 border border-[#1a1a1a] rounded-sm transition-colors cursor-pointer"
            title={lang === 'fr' ? "Zoom avant (+25 px/s)" : "Aumentar zoom (+25 px/s)"}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleResetZoom1x}
            className={`px-1.5 py-0.5 text-[9px] font-black uppercase border border-[#1a1a1a] rounded-sm transition-colors cursor-pointer ${
              pixelsPerSecond === 200
                ? 'bg-[#1a1a1a] text-[#fdfaf2]'
                : 'bg-[#f4ecd8] hover:bg-[#8b2a1a] hover:text-white'
            }`}
            title={lang === 'fr' ? "Réinitialiser l'échelle à 100% (200 px/s standard)" : "Redefinir escala para 100% (200 px/s padrão)"}
          >
            1:1
          </button>

          <button
            type="button"
            onClick={handleFitToWindow}
            className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase bg-[#2a5d4e] text-white hover:bg-[#1a1a1a] border border-[#1a1a1a] rounded-sm transition-colors cursor-pointer shadow-[1px_1px_0px_#1a1a1a]"
            title={lang === 'fr' ? "Adapter toute la forme d'onde et les repères à la largeur de l'écran" : "Ajustar toda a forma de onda e marcadores à largura da tela"}
          >
            <Maximize2 className="w-3 h-3" />
            {lang === 'fr' ? 'Adapter à l\'écran' : 'Ajustar à tela'}
          </button>
        </div>
      </div>

      {/* Visual Alignment Board avec Viewport Défilable (Directive A.1) */}
      <div className="relative border-4 border-[#1a1a1a] bg-[#e2d8be] rounded-sm overflow-hidden shadow-[4px_4px_0px_#1a1a1a] flex flex-col">
        {/* Conteneur défilable externe scrollbar-thin (Directive A.1) */}
        <div
          ref={scrollContainerRef}
          className="w-full overflow-x-auto overflow-y-hidden relative select-none scrollbar-thin scrollbar-thumb-[#8b2a1a]/40 scrollbar-track-[#e2d8be]"
          onWheel={handleWheelScroll}
        >
          {/* Inner Board Wrapper (largeur totale = totalBoardWidth) */}
          <div
            style={{ width: `${totalBoardWidth}px` }}
            className="relative flex flex-col"
          >
            {/* Header Ruler: TEMPS 1 / PREMIÈRE NOTE — Rigoureusement solidaire du défilement (Consigne 1) */}
            <div className="h-7 bg-[#d7cbaf] border-b-2 border-[#1a1a1a] relative flex items-center px-3 pointer-events-none">
              <span className="text-[10px] font-bold text-[#1a1a1a]/80 uppercase tracking-wider">
                {lang === 'fr' ? "Glisser l'onde centrale pour caler le chant — Glisser les poignées DÉBUT/FIN pour rogner" : "Arraste a onda central para alinhar o canto — Arraste as alças INÍCIO/FIM para cortar"}
              </span>

              {/* TEMPS 1 Fixed Guide Line Badge (Solidaire du défilement horizontal) */}
              <div
                style={{ left: `${temps1Px}px` }}
                className="absolute top-0 bottom-0 flex items-center -translate-x-1/2 z-30 pointer-events-none"
              >
                <div className="px-2.5 py-0.5 bg-[#dc2626] text-white text-[9px] font-black uppercase tracking-wider border border-[#1a1a1a] shadow-[0_0_8px_rgba(220,38,38,0.8)] whitespace-nowrap">
                  {lang === 'fr' ? `TEMPS 1 / CHANT (MESURE ${effectiveMeasure + 1})` : `TEMPO 1 / CANTO (COMPASSO ${effectiveMeasure + 1})`}
                </div>
              </div>
            </div>

            {/* Zone Waveform Viewport (hauteur 144px) */}
            <div className="relative h-36 select-none">
              {/* 1. Calque statique d'arrière-plan (Grille de pas + T1-T4 + syllabes et notes) */}
              <canvas
                ref={staticGridCanvasRef}
                className="absolute top-0 bottom-0 left-0 pointer-events-none z-0"
                height={144}
              />

              {/* 2. Ligne verticale TEMPS 1 (Ligne rouge vive 2.5px) */}
              <div
                style={{ left: `${temps1Px}px` }}
                className="absolute top-0 bottom-0 w-[2.5px] bg-[#dc2626] z-20 pointer-events-none shadow-[0_0_12px_rgba(220,38,38,0.9)]"
              />

              {/* 3. Floating Waveform Canvas Layer (Translates with Drag + Nudge via GPU transform) */}
              <div
                ref={waveformContainerRef}
                style={{
                  transform: `translate3d(${currentTotalWaveXRef.current}px, 0, 0)`,
                  willChange: 'transform',
                  width: `${bufferPxWidth}px`,
                }}
                className="absolute top-0 bottom-0 left-0 z-10"
              >
                {/* Waveform body layer : clic maintenu déplace l'onde (Directive A.2) */}
                <div
                  className="h-full w-full cursor-grab active:cursor-grabbing select-none"
                  style={{ touchAction: 'none' }}
                  onPointerDown={handleWaveformPointerDown}
                  onPointerMove={handleWaveformPointerMove}
                  onPointerUp={handleWaveformPointerUp}
                  onPointerCancel={handleWaveformPointerUp}
                  title={lang === 'fr' ? "Cliquer et glisser pour caler le chant sur la timeline" : "Clique e arraste para alinhar o canto na linha do tempo"}
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

                {/* Poignée interactive : TRIM DÉBUT (Vert) avec capture de pointeur (Consigne 2) */}
                <div
                  style={{
                    left: `${trimStartSec * pixelsPerSecond}px`,
                    touchAction: 'none',
                  }}
                  className="absolute top-0 bottom-0 -translate-x-1/2 w-6 z-30 cursor-ew-resize flex flex-col items-center group"
                  onPointerDown={(e) => handleTrimPointerDown(e, 'start')}
                  onPointerMove={(e) => handleTrimPointerMove(e, 'start')}
                  onPointerUp={(e) => handleTrimPointerUp(e, 'start')}
                  onPointerCancel={(e) => handleTrimPointerUp(e, 'start')}
                  title={lang === 'fr' ? `Trim Début : ${trimStartSec.toFixed(3)}s (Glisser pour ajuster le début)` : `Trim Início : ${trimStartSec.toFixed(3)}s (Arraste para ajustar o início)`}
                >
                  <div className="w-[3px] h-full bg-[#2a5d4e] group-hover:bg-[#34d399] shadow-[0_0_6px_rgba(42,93,78,0.8)]" />
                  <div className="absolute top-0 px-1 py-0.5 bg-[#2a5d4e] text-white text-[8px] font-black uppercase font-mono tracking-tighter whitespace-nowrap border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] group-hover:scale-110 transition-transform pointer-events-none">
                    {lang === 'fr' ? 'DÉBUT' : 'INÍCIO'}
                  </div>
                </div>

                {/* Poignée interactive : TRIM FIN (Rouge) avec capture de pointeur (Consigne 2) */}
                <div
                  style={{
                    left: `${trimEndSec * pixelsPerSecond}px`,
                    touchAction: 'none',
                  }}
                  className="absolute top-0 bottom-0 -translate-x-1/2 w-6 z-30 cursor-ew-resize flex flex-col items-center group"
                  onPointerDown={(e) => handleTrimPointerDown(e, 'end')}
                  onPointerMove={(e) => handleTrimPointerMove(e, 'end')}
                  onPointerUp={(e) => handleTrimPointerUp(e, 'end')}
                  onPointerCancel={(e) => handleTrimPointerUp(e, 'end')}
                  title={lang === 'fr' ? `Trim Fin : ${trimEndSec.toFixed(3)}s (Glisser pour ajuster la fin)` : `Trim Fim : ${trimEndSec.toFixed(3)}s (Arraste para ajustar o fim)`}
                >
                  <div className="w-[3px] h-full bg-[#8b2a1a] group-hover:bg-[#ef4444] shadow-[0_0_6px_rgba(139,42,26,0.8)]" />
                  <div className="absolute top-0 px-1 py-0.5 bg-[#8b2a1a] text-white text-[8px] font-black uppercase font-mono tracking-tighter whitespace-nowrap border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] group-hover:scale-110 transition-transform pointer-events-none">
                    {lang === 'fr' ? 'FIN' : 'FIM'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Trim Sliders (Trim Start & Trim End) */}
      <div className="bg-[#f4ecd8] border-2 border-[#1a1a1a] p-4 rounded-sm flex flex-col gap-3 shadow-[2px_2px_0px_#1a1a1a]">
        <div className="flex items-center justify-between text-xs font-bold text-[#1a1a1a]">
          <span className="flex items-center gap-1.5 uppercase text-[#2a5d4e]">
            <Scissors className="w-4 h-4 text-[#2a5d4e]" />
            {lang === 'fr' ? 'Rognage Audio (Trim Start / Trim End)' : 'Ajuste de Trim (Trim Início / Trim Fim)'}
          </span>
          <span className="text-[10px] text-[#1a1a1a]/60">
            {lang === 'fr' ? "L'anacrouse respire à gauche de la ligne rouge Temps 1." : "A anacruse respira à esquerda da linha vermelha Tempo 1."}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Trim Start */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-[#2a5d4e]">{lang === 'fr' ? 'Trim Début :' : 'Trim Início :'}</span>
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
              <span className="text-[#8b2a1a]">{lang === 'fr' ? 'Trim Fin :' : 'Trim Fim :'}</span>
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
              {lang === 'fr' ? 'Calage Fin de Latence (Nudge -300ms à +300ms) & Déplacement' : 'Ajuste Fino de Latência (Nudge -300ms a +300ms) & Deslocamento'}
            </span>
            <span className="text-[10px] text-[#1a1a1a]/60">
              {lang === 'fr' ? "Glissez directement l'onde sur le visualiseur ou affinez au millième de seconde avec le curseur." : "Arraste diretamente a onda no visualizador ou ajuste ao milésimo de segundo com o cursor."}
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
              title={lang === 'fr' ? "Réinitialiser le Nudge à 0 ms" : "Redefinir Nudge para 0 ms"}
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
              {lang === 'fr' ? 'Arrêter Écoute' : 'Parar Reprodução'}
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              {lang === 'fr' ? 'Écouter avec la Roda' : 'Ouvir com a Roda'}
            </>
          )}
        </button>

        <div className="flex gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={() => {
              killSwitch();
              onCancel();
            }}
            disabled={isProcessing}
            className="px-5 py-2.5 text-xs font-bold border-2 border-[#1a1a1a] bg-[#ece4d0] hover:bg-[#1a1a1a] hover:text-[#ece4d0] transition-colors cursor-pointer rounded-sm shadow-[3px_3px_0px_#1a1a1a]"
          >
            {lang === 'fr' ? 'Annuler' : 'Cancelar'}
          </button>
          <button
            onClick={handleValidate}
            disabled={isProcessing}
            className="px-5 py-2.5 text-xs font-bold bg-[#8b2a1a] text-[#fdfaf2] border-2 border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#ece4d0] transition-colors cursor-pointer rounded-sm shadow-[3px_3px_0px_#1a1a1a] flex items-center gap-2"
          >
            {isProcessing ? (
              <span>{lang === 'fr' ? 'Rendu en cours...' : 'Processando...'}</span>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                {lang === 'fr' ? '✓ Valider le chant' : '✓ Confirmar o canto'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
