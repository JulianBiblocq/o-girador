/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import type * as ToneType from 'tone';
import { loadTone, getTone } from '../ToneLoader';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}
import { TrackGroup, Pattern, Language, HitTrigger, HitTriggerPool, TimeSignature, SongSection, SongMarker, CloudRhythmSignal } from '../types';
import { instrumentsConfig, getMarkers, ASSETS_BASE_URL, isDarkText, getVisualStrokeSymbol, i18n } from '../data';
import { getNextStepValue } from '../utils/instrumentStrokes';
import { useSequencerStore, isSequencerVisibleTrack, isToadaBus, getEffectiveMuteState } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { useTransportStore } from '../stores/useTransportStore';
import { useAudioStore } from '../stores/useAudioStore';
import { subscribeToTick, unsubscribeFromTick, audioEngine } from '../hooks/useAudioSync';
import { getExpandedMeasures, getBeatsPerMeasure } from '../utils/measureHelpers';
import { getBusColor, getBusNoteColor } from '../utils/colorHelpers';
import { usePerformanceStore } from '../stores/usePerformanceStore';

interface CircleSequencerProps {
  isActive?: boolean;
  lang?: Language;
  isLeftHanded?: boolean;
  tracks?: TrackGroup[];
  isPlaying?: boolean;

  currentMeasure?: number;
  maxTicks?: number;
  timeSig?: TimeSignature;
  onTogglePlay?: () => void;
  onStepChange?: (trackId: number, patternId: number, stepIdx: number, newState: string | number | [string, string], lyric?: string, note?: string) => void;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number | [string, string],
    onSelect: (val: string | number | [string, string], merge?: boolean) => void,
    trackId: number,
    isSplit?: boolean
  ) => void;
  langPromptVoiceText?: string;
  isMetroOn?: boolean;
  activeCircleIdByInst?: { [instIdx: number]: number | null };
  totalMeasures?: number;
  activePatternIdByTrack?: Record<number, number | null>;
  hitTriggersRef?: React.MutableRefObject<HitTriggerPool>;
  bpm?: number;
  measureBpms?: number[];
  measureVols?: number[];
  isMobile?: boolean;
  onNavigateMeasure?: (measureIdx: number) => void;
  activeSignal?: { id: string; name: string; image: string } | null;
  soloPatternPlayId?: number | null;
  measureSignals?: (string | null)[];
  rhythmSignals?: { id: string; name: string; image: string }[];
  mestreSignals?: CloudRhythmSignal[];
  songSections?: SongSection[];
  songMarkers?: SongMarker[];
  circleId?: number;
  measureIndex?: number;
  trackId?: number;
  rodaTrackOrder?: number[];
}

const EMPTY_ARRAY: any[] = [];

export const sortTracksByRodaOrder = (tracksList: TrackGroup[], rodaTrackOrder?: number[]): TrackGroup[] => {
  if (!rodaTrackOrder || rodaTrackOrder.length === 0) return tracksList;
  const orderMap = new Map(rodaTrackOrder.map((id, index) => [id, index]));
  return [...tracksList].sort((a, b) => {
    const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
    const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
    return idxA - idxB;
  });
};

/**
 * Rendu Canvas 2D de la traînée de gouache vocale (style brosse Cordel)
 * avec filaments latéraux et pointe biseautée d'estompe de souffle.
 */
export const drawGouacheRibbon = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  thetaStart: number,
  thetaEnd: number,
  thetaFilamentEnd: number,
  color: string,
  dScale: number
) => {
  if (thetaEnd <= thetaStart) return;

  const mainWidth = 9 * dScale;
  const filWidth = 1.5 * dScale;
  const filOffset = 4 * dScale;

  // 1. Micro-filaments latéraux (effet brosse sèche Cordel)
  if (thetaFilamentEnd > thetaStart) {
    ctx.save();
    ctx.lineWidth = filWidth;
    ctx.lineCap = 'butt';
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.45;

    // Filament intérieur (rayon - 4px)
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1, radius - filOffset), thetaStart, thetaFilamentEnd, false);
    ctx.stroke();

    // Filament extérieur (rayon + 4px)
    ctx.beginPath();
    ctx.arc(cx, cy, radius + filOffset, thetaStart, thetaFilamentEnd, false);
    ctx.stroke();

    ctx.restore();
  }

  // 2. Arc principal épais avec biseau d'estompe sur les derniers 15%
  const totalAngle = thetaEnd - thetaStart;
  const taperAngleSpan = totalAngle * 0.15;
  const taperStartAngle = thetaEnd - taperAngleSpan;

  // 2a. Corps principal (85% initiaux)
  ctx.save();
  ctx.lineWidth = mainWidth;
  ctx.lineCap = 'butt';
  ctx.strokeStyle = color;
  ctx.globalAlpha = 1.0;

  if (taperStartAngle > thetaStart) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, thetaStart, taperStartAngle, false);
    ctx.stroke();
  }

  // 2b. Biseau d'estompe (derniers 15% : amincissement progressif et fondu alpha vers 0)
  const steps = 8;
  const subSpan = taperAngleSpan / steps;
  for (let s = 0; s < steps; s++) {
    const a0 = taperStartAngle + s * subSpan;
    const a1 = a0 + subSpan;
    const progress = (s + 0.5) / steps;
    const factor = Math.max(0, 1 - progress);

    ctx.lineWidth = Math.max(0.5, mainWidth * factor);
    ctx.globalAlpha = factor;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, a0, a1, false);
    ctx.stroke();
  }

  ctx.restore();
};

const isTracksStructureEqual = (prev: TrackGroup[], next: TrackGroup[]) => {
  if (prev === next) return true;
  if (!prev || !next) return false;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    const p = prev[i];
    const n = next[i];
    if (p.id !== n.id ||
        p.instrumentIdx !== n.instrumentIdx ||
        p.isHidden !== n.isHidden ||
        p.isMute !== n.isMute ||
        p.isSolo !== n.isSolo ||
        p.radius !== n.radius) {
      return false;
    }
    if (p.patterns.length !== n.patterns.length) return false;
    for (let j = 0; j < p.patterns.length; j++) {
      const pp = p.patterns[j];
      const np = n.patterns[j];
      if (pp.id !== np.id || pp.steps !== np.steps) return false;
      if (pp.measureAssignments.length !== np.measureAssignments.length) return false;
      for (let m = 0; m < pp.measureAssignments.length; m++) {
        if (pp.measureAssignments[m] !== np.measureAssignments[m]) return false;
      }
    }
  }
  return true;
};

function useTracksWithCustomEquality(isActive: boolean): TrackGroup[] {
  const [tracks, setTracks] = useState<TrackGroup[]>(() => {
    if (!isActive) return EMPTY_ARRAY;
    return useSequencerStore.getState().tracks;
  });

  const lastTracksRef = useRef<TrackGroup[]>(tracks);

  useEffect(() => {
    if (!isActive) {
      if (lastTracksRef.current !== EMPTY_ARRAY) {
        lastTracksRef.current = EMPTY_ARRAY;
        setTracks(EMPTY_ARRAY);
      }
      return;
    }

    const handleStoreChange = (state: any) => {
      const nextTracks = state.tracks;
      if (!isTracksStructureEqual(lastTracksRef.current, nextTracks)) {
        lastTracksRef.current = nextTracks;
        setTracks(nextTracks);
      }
    };

    handleStoreChange(useSequencerStore.getState());

    const unsubscribe = useSequencerStore.subscribe(handleStoreChange);
    return unsubscribe;
  }, [isActive]);

  return tracks;
}

const MIN_RADIUS = 180;
const MAX_RADIUS = 495;

const getTrackRadius = (visibleIdx: number, totalTracks: number) => {
  if (totalTracks <= 0) return 0;
  if (totalTracks === 1) return (MIN_RADIUS + MAX_RADIUS) / 2;
  if (totalTracks === 2) {
    // spacing equivalent to position 2 and 4 out of 5 tracks
    // gap = (495 - 180) / 4 = 78.75
    // pos 2: 180 + 78.75 = 258.75
    // pos 4: 180 + 3 * 78.75 = 416.25
    return visibleIdx === 0 ? 258.75 : 416.25;
  }
  const gap = (MAX_RADIUS - MIN_RADIUS) / (totalTracks - 1);
  return MIN_RADIUS + visibleIdx * gap;
};

export const resolvePatternForMeasure = (
  tObj: TrackGroup | undefined,
  mIdx: number,
  sPlayId: number | null | undefined
): Pattern | null => {
  if (!tObj) return null;
  if (sPlayId !== undefined && sPlayId !== null) {
    return tObj.patterns.find(p => p.id === sPlayId) || null;
  }
  const overrideId = tObj.patternOverrides?.[mIdx];
  if (overrideId !== undefined) {
    return overrideId !== null ? (tObj.patterns.find(p => p.id === overrideId) || null) : null;
  }
  return tObj.patterns.find(p => p.measureAssignments[mIdx]) || null;
};

/**
 * Structure d'une syllabe découpée selon la règle des espaces de fin
 */
interface SyllableItem {
  step: number;
  cleanText: string;
  hasSpace: boolean;
  note?: string;
}

/**
 * Structure d'un mot complet reconstitué
 */
interface WordItem {
  syllables: SyllableItem[];
  fullWord: string;
  startStep: number;
  endStep: number;
}

/**
 * Cache de mémoïsation pour éviter toute allocation Garbage Collector dans la boucle d'animation à 60 FPS
 */
const patternWordsCache = new Map<string, WordItem[]>();

function getPatternWords(pattern: Pattern | undefined | null, isAnacrusis: boolean): WordItem[] {
  if (!pattern) return [];
  const lyrics = isAnacrusis ? pattern.preRollLyrics : pattern.lyrics;
  const activeSteps = isAnacrusis ? pattern.preRollActiveSteps : pattern.activeSteps;
  const notes = isAnacrusis ? pattern.preRollNotes : pattern.notes;
  const stepsCount = isAnacrusis ? 16 : (pattern.steps || 16);

  if (!lyrics || !activeSteps) return [];

  const cacheKey = `${pattern.id}_${isAnacrusis ? 'pre' : 'main'}_${lyrics.join('|')}_${stepsCount}`;
  const cached = patternWordsCache.get(cacheKey);
  if (cached) return cached;

  if (patternWordsCache.size > 100) {
    patternWordsCache.clear();
  }

  const words: WordItem[] = [];
  let currentSyllables: SyllableItem[] = [];

  for (let s = 0; s < stepsCount; s++) {
    const isActive = activeSteps[s] !== undefined && activeSteps[s] !== null && activeSteps[s] !== 0 && activeSteps[s] !== '0';
    const rawText = lyrics[s];
    if (isActive && rawText && typeof rawText === 'string' && rawText.trim() !== '' && rawText.trim() !== '-') {
      const hasSpace = rawText.endsWith(' ') || rawText.endsWith('  ');
      const cleanText = rawText.trim().replace(/-$/, '');
      const note = notes?.[s]?.trim();

      currentSyllables.push({ step: s, cleanText, hasSpace, note });

      if (hasSpace || s === stepsCount - 1) {
        words.push({
          syllables: [...currentSyllables],
          fullWord: currentSyllables.map(item => item.cleanText).join(''),
          startStep: currentSyllables[0].step,
          endStep: s
        });
        currentSyllables = [];
      }
    }
  }

  if (currentSyllables.length > 0) {
    words.push({
      syllables: [...currentSyllables],
      fullWord: currentSyllables.map(item => item.cleanText).join(''),
      startStep: currentSyllables[0].step,
      endStep: currentSyllables[currentSyllables.length - 1].step
    });
  }

  patternWordsCache.set(cacheKey, words);
  return words;
}

/**
 * Tracé Canvas 2D haute performance de la Letra « Ao Vivo » au centre de la Roda
 * Isole les styles graphiques avec ctx.save() / ctx.restore(), évite le thrashing DOM
 * et applique les couleurs du cordel : Puxador (#c25e38) et Coro (#1e40af).
 */
export const drawCenterKaraoke = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  live: { step: number; measure: number; maxTicks: number; ratio: number; isPreRoll?: boolean },
  tracks: TrackGroup[],
  rawTracks: TrackGroup[],
  totalMeasures: number,
  isLoopRegionActive?: boolean,
  loopStartMeasure?: number | null,
  loopEndMeasure?: number | null,
  soloPlayId?: number | null,
  dynamicScale: number = 1
) => {
  ctx.save();
  try {
    const measureIdx = live.step >= 0 ? live.measure : 0;
    const currentStep = live.step >= 0 ? live.step : 0;

    // 1. Résolution des pistes et motifs vocaux
    const puxTrack = rawTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
    const coroTrack = rawTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');

    const puxPattern = resolvePatternForMeasure(puxTrack, measureIdx, soloPlayId);
    const coroPattern = resolvePatternForMeasure(coroTrack, measureIdx, soloPlayId);

    // Détection de la mesure suivante pour anacrouse
    let nextMeasureIdx: number;
    if (isLoopRegionActive && loopEndMeasure !== null && loopEndMeasure !== undefined && measureIdx === loopEndMeasure) {
      nextMeasureIdx = (loopStartMeasure !== null && loopStartMeasure !== undefined) ? loopStartMeasure : 0;
    } else {
      nextMeasureIdx = (measureIdx + 1) % totalMeasures;
    }

    // 2. Détection de l'anacrouse anticipée (pas 12 à 15) ou pré-roll
    let isAnacrusis = Boolean(live.isPreRoll);
    let activePattern: Pattern | null | undefined = undefined;
    let activeRole: 'puxador' | 'coro' | 'none' = 'none';

    if (isAnacrusis) {
      const nextPuxPre = puxPattern?.preRollActiveSteps;
      const nextCoroPre = coroPattern?.preRollActiveSteps;
      const hasPuxPre = Boolean(nextPuxPre && Object.values(nextPuxPre).some(v => v && v !== 0 && v !== '0'));
      const hasCoroPre = Boolean(nextCoroPre && Object.values(nextCoroPre).some(v => v && v !== 0 && v !== '0'));
      if (hasPuxPre) {
        activeRole = 'puxador';
        activePattern = puxPattern;
      } else if (hasCoroPre) {
        activeRole = 'coro';
        activePattern = coroPattern;
      }
    } else if (currentStep >= 12) {
      // Fenêtre de fin de mesure : vérifier si une anacrouse existe sur la mesure suivante
      const nextPuxPattern = resolvePatternForMeasure(puxTrack, nextMeasureIdx, soloPlayId);
      const nextCoroPattern = resolvePatternForMeasure(coroTrack, nextMeasureIdx, soloPlayId);
      const nextPuxPre = nextPuxPattern?.preRollActiveSteps?.[currentStep];
      const nextCoroPre = nextCoroPattern?.preRollActiveSteps?.[currentStep];
      const hasNextPuxPre = Boolean(nextPuxPre && nextPuxPre !== 0 && nextPuxPre !== '0');
      const hasNextCoroPre = Boolean(nextCoroPre && nextCoroPre !== 0 && nextCoroPre !== '0');

      if (hasNextPuxPre || hasNextCoroPre) {
        isAnacrusis = true;
        if (hasNextPuxPre) {
          activeRole = 'puxador';
          activePattern = nextPuxPattern;
        } else {
          activeRole = 'coro';
          activePattern = nextCoroPattern;
        }
      }
    }

    if (!isAnacrusis) {
      const puxHasNotes = Boolean(puxPattern?.activeSteps && Object.values(puxPattern.activeSteps).some(v => v && v !== 0 && v !== '0'));
      const coroHasNotes = Boolean(coroPattern?.activeSteps && Object.values(coroPattern.activeSteps).some(v => v && v !== 0 && v !== '0'));

      if (puxHasNotes && coroHasNotes) {
        // Départage précis selon la frappe au pas physique courant
        const puxHitNow = Boolean(puxPattern?.activeSteps?.[currentStep] && puxPattern.activeSteps[currentStep] !== 0);
        const coroHitNow = Boolean(coroPattern?.activeSteps?.[currentStep] && coroPattern.activeSteps[currentStep] !== 0);
        if (puxHitNow && !coroHitNow) {
          activeRole = 'puxador';
          activePattern = puxPattern;
        } else if (coroHitNow && !puxHitNow) {
          activeRole = 'coro';
          activePattern = coroPattern;
        } else {
          activeRole = 'puxador';
          activePattern = puxPattern;
        }
      } else if (puxHasNotes) {
        activeRole = 'puxador';
        activePattern = puxPattern;
      } else if (coroHasNotes) {
        activeRole = 'coro';
        activePattern = coroPattern;
      }
    }

    // 🛡️ Mesure purement instrumentale : ne tracer aucun texte parasite au centre
    if (!activePattern || activeRole === 'none') {
      return;
    }

    const words = getPatternWords(activePattern, isAnacrusis);
    if (words.length === 0) {
      return;
    }

    // 3. Définir la palette de couleur selon le rôle
    let roleColor = '#c25e38'; // Puxador Terracotta par défaut
    let roleLabel = 'PUXADOR';
    if (activeRole === 'coro') {
      roleColor = '#1e40af'; // Bleu cobalt
      roleLabel = 'CORO';
    }

    if (isAnacrusis) {
      roleLabel = 'ANACROUSE ➔ T1';
    }

    // 4. Dessin du disque central parchemin Cordel
    const diskRadius = 135 * dynamicScale;
    ctx.beginPath();
    ctx.arc(centerX, centerY, diskRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#f4ecd8';
    ctx.fill();
    ctx.lineWidth = 3.5 * dynamicScale;
    ctx.strokeStyle = '#1a1a1a';
    ctx.stroke();

    // Anneau intérieur fin décoratif Cordel
    ctx.beginPath();
    ctx.arc(centerX, centerY, diskRadius - 8 * dynamicScale, 0, Math.PI * 2);
    ctx.lineWidth = 1 * dynamicScale;
    ctx.strokeStyle = '#8b2a1a';
    ctx.stroke();

    // 5. Badge du rôle (Puxador / Coro / Anacrouse)
    const badgeW = (roleLabel.length > 10 ? 150 : 110) * dynamicScale;
    const badgeH = 22 * dynamicScale;
    const badgeX = centerX - badgeW / 2;
    const badgeY = centerY - 92 * dynamicScale;

    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(badgeX, badgeY, badgeW, badgeH, 6 * dynamicScale);
    } else {
      ctx.rect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.fillStyle = roleColor;
    ctx.fill();
    ctx.lineWidth = 1.5 * dynamicScale;
    ctx.strokeStyle = '#1a1a1a';
    ctx.stroke();

    ctx.font = `900 ${Math.floor(10 * dynamicScale)}px "Outfit", "Inter", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(roleLabel, centerX, badgeY + badgeH / 2 + 0.5);

    // 6. Calage strict du mot et de la syllabe sur le pas physique courant
    let activeWord: WordItem | null = null;
    let activeSyllableIndex: number = -1;

    // A. Recherche d'une frappe exacte sur ce pas
    for (const word of words) {
      const sylIdx = word.syllables.findIndex(syl => syl.step === currentStep);
      if (sylIdx !== -1) {
        activeWord = word;
        activeSyllableIndex = sylIdx;
        break;
      }
    }

    // B. Si pas de frappe exacte au pas courant, chercher le mot en cours de tenue
    if (!activeWord) {
      for (let i = words.length - 1; i >= 0; i--) {
        if (words[i].startStep <= currentStep) {
          activeWord = words[i];
          // Pas de frappe exacte sur ce pas précis : aucune syllabe en éclat
          activeSyllableIndex = -1;
          break;
        }
      }
    }

    // C. Si aucun mot n'a encore été attaqué, afficher le premier mot en attente
    if (!activeWord && words.length > 0) {
      activeWord = words[0];
      activeSyllableIndex = -1;
    }

    // 7. Rendu horizontal du mot entier au centre de la Roda
    if (activeWord) {
      const fontSize = Math.floor(Math.min(38, Math.max(20, 160 / Math.max(4, activeWord.fullWord.length))) * dynamicScale);
      ctx.font = `900 ${fontSize}px "Outfit", "Inter", sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';

      // Calcul des largeurs de chaque syllabe pour le centrage horizontal parfait
      const sylWidths = activeWord.syllables.map(s => ctx.measureText(s.cleanText).width);
      const totalWordWidth = sylWidths.reduce((a, b) => a + b, 0);
      let curX = centerX - totalWordWidth / 2;
      const wordY = centerY - 6 * dynamicScale;

      let activeNote: string | undefined = undefined;

      for (let i = 0; i < activeWord.syllables.length; i++) {
        const syl = activeWord.syllables[i];
        const w = sylWidths[i];
        const isHitNow = (i === activeSyllableIndex);

        if (isHitNow) {
          activeNote = syl.note;
          // Syllabe active : 100% opacité + éclat coloré
          ctx.globalAlpha = 1.0;
          ctx.shadowColor = roleColor;
          ctx.shadowBlur = 14 * dynamicScale;
          ctx.fillStyle = roleColor;
          ctx.fillText(syl.cleanText, curX, wordY);
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
        } else {
          // Reste du mot : 40% d'opacité en encre noire cordel
          ctx.globalAlpha = 0.40;
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
          ctx.fillStyle = '#1a1a1a';
          ctx.fillText(syl.cleanText, curX, wordY);
        }

        curX += w;
      }

      ctx.globalAlpha = 1.0;

      // Note musicale sous la syllabe active si présente
      if (activeNote) {
        ctx.font = `bold ${Math.floor(11 * dynamicScale)}px "Outfit", "Inter", sans-serif`;
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'center';
        ctx.fillText(activeNote, centerX, centerY + 24 * dynamicScale);
      }
    }

    // 8. Ligne de contexte inférieure : affichage de la phrase complète de la mesure
    if (words.length > 0) {
      const contextY = centerY + 62 * dynamicScale;
      ctx.font = `bold ${Math.floor(10.5 * dynamicScale)}px "Outfit", "Inter", sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      const wordWidths = words.map(w => ctx.measureText(w.fullWord).width);
      const spacing = 8 * dynamicScale;
      const totalPhraseWidth = wordWidths.reduce((a, b) => a + b, 0) + (words.length - 1) * spacing;

      let lineX = centerX - totalPhraseWidth / 2;

      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const wWidth = wordWidths[i];
        const isCurrentWord = (w === activeWord);

        if (isCurrentWord) {
          ctx.globalAlpha = 1.0;
          ctx.fillStyle = roleColor;
          ctx.fillText(w.fullWord, lineX + wWidth / 2, contextY);

          // Point indicateur sous le mot actif
          ctx.beginPath();
          ctx.arc(lineX + wWidth / 2, contextY + 11 * dynamicScale, 2.2 * dynamicScale, 0, Math.PI * 2);
          ctx.fillStyle = roleColor;
          ctx.fill();
        } else {
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = '#1a1a1a';
          ctx.fillText(w.fullWord, lineX + wWidth / 2, contextY);
        }

        lineX += wWidth + spacing;
      }

      ctx.globalAlpha = 1.0;
    }
  } finally {
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }
};

const CircleSequencerComponent: React.FC<CircleSequencerProps> = (props) => {
  const { isActive = true } = props;
  const sequencer = useSequencer();
  const audio = useAudio();

  // Extract identity props even if unused to maintain interface consistency
  const { circleId, measureIndex, trackId } = props;

  const isMobile = props.isMobile !== undefined ? props.isMobile : false;

  const lang = props.lang !== undefined ? props.lang : sequencer.lang;
  const isLeftHanded = props.isLeftHanded !== undefined ? props.isLeftHanded : sequencer.isLeftHanded;
  const tracksFromStore = useTracksWithCustomEquality(isActive);
  const rawTracks = props.tracks !== undefined ? props.tracks : tracksFromStore;
  const tracks = rawTracks.filter(t => isSequencerVisibleTrack(t, rawTracks));
  const totalMeasuresFromStore = useSequencerStore(state => state.totalMeasures);
  const totalMeasures = props.totalMeasures !== undefined ? props.totalMeasures : totalMeasuresFromStore;
  const bpm = props.bpm !== undefined ? props.bpm : sequencer.bpm;
  const measureBpms = props.measureBpms !== undefined ? props.measureBpms : sequencer.measureBpms;
  const measureVols = props.measureVols !== undefined ? props.measureVols : sequencer.measureVols;
  const measureSignals = props.measureSignals !== undefined ? props.measureSignals : (sequencer.measureSignals || []);
  const songSectionsFromStore = useSequencerStore(state => state.songSections);
  const songSections = props.songSections !== undefined ? props.songSections : (songSectionsFromStore || []);
  const songMarkersFromStore = useSequencerStore(state => state.songMarkers);
  const songMarkers = props.songMarkers !== undefined ? props.songMarkers : (songMarkersFromStore || []);
  const storeRodaTrackOrder = useSequencerStore(state => state.rodaTrackOrder);
  const rodaTrackOrder = props.rodaTrackOrder !== undefined ? props.rodaTrackOrder : storeRodaTrackOrder;
  const isLoopRegionActive = useSequencerStore(state => state.isLoopRegionActive);
  const loopStartMeasure = useSequencerStore(state => state.loopStartMeasure);
  const loopEndMeasure = useSequencerStore(state => state.loopEndMeasure);

  const isPlaying = props.isPlaying !== undefined ? props.isPlaying : audio.isPlaying;
  const globalCurrentMeasure = useSequencerStore(state => isActive ? state.currentMeasure : 0);
  const currentExpandedMeasureIdx = useSequencerStore(state => state.currentExpandedMeasureIdx);
  const measureTimeSigs = useSequencerStore(state => state.measureTimeSigs);
  const currentMeasure = props.currentMeasure !== undefined ? props.currentMeasure : globalCurrentMeasure;
  const storeIsMetroOn = useTransportStore(state => state.isMetroOn);
  const storeSoloPatternPlayId = useTransportStore(state => state.soloPatternPlayId);
  const isMetroOn = props.isMetroOn !== undefined ? props.isMetroOn : storeIsMetroOn;
  const soloPatternPlayId = props.soloPatternPlayId !== undefined ? props.soloPatternPlayId : storeSoloPatternPlayId;
  const hitTriggersRef = props.hitTriggersRef !== undefined ? props.hitTriggersRef : audio.hitTriggersRef;

  const metadata = sequencer.metadata;
  const rhythmSignals = props.rhythmSignals !== undefined ? props.rhythmSignals : (metadata?.rhythmSignals || []);
  const mestreSignals = props.mestreSignals !== undefined ? props.mestreSignals : [];

  const maxTicks = props.maxTicks !== undefined ? props.maxTicks : audio.maxTicksRef.current;
  const timeSig = props.timeSig !== undefined ? props.timeSig : (measureTimeSigs[currentMeasure] || sequencer.timeSig);

  const onTogglePlay = props.onTogglePlay !== undefined ? props.onTogglePlay : audio.handleTogglePlay;
  const onNavigateMeasure = props.onNavigateMeasure !== undefined ? props.onNavigateMeasure : ((mIdx: number) => audio.handleTimelineNavigate(mIdx, 0, 16));
  const onStepChange = props.onStepChange !== undefined ? props.onStepChange : sequencer.handleStepValueSelectAndToggle;
  const onStepTouchStart = props.onStepTouchStart;

  const t = (key: string) => (i18n[lang] as any)[key] || key;
  const langPromptVoiceText = props.langPromptVoiceText !== undefined ? props.langPromptVoiceText : t('promptVoice');

  // Compute activePatternIdByTrack
  const activePatternIdByTrack = props.activePatternIdByTrack !== undefined ? props.activePatternIdByTrack : (() => {
    const result: { [trackId: number]: number | null } = {};
    (tracks || []).forEach(track => {
      if (soloPatternPlayId !== null && soloPatternPlayId !== undefined) {
        const hasSoloPattern = track.patterns.some(p => p.id === soloPatternPlayId);
        result[track.id] = hasSoloPattern ? soloPatternPlayId : null;
      } else {
        const activePattern = track.patterns.find(p => p.measureAssignments[currentMeasure]);
        result[track.id] = activePattern ? activePattern.id : null;
      }
    });
    return result;
  })();

  const activeCircleIdByInst = props.activeCircleIdByInst !== undefined ? props.activeCircleIdByInst : (() => {
    const result: { [instIdx: number]: number | null } = {};
    (tracks || []).forEach(track => {
      const pId = activePatternIdByTrack[track.id];
      result[track.instrumentIdx] = pId;
    });
    return result;
  })();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const measureDisplayRef = useRef<HTMLSpanElement>(null);
  const centerOverlayRef = useRef<HTMLDivElement>(null);
  const centerAfficheurRef = useRef<HTMLDivElement>(null);
  const centerOverlayImgRef = useRef<HTMLImageElement>(null);
  const centerOverlayTintRef = useRef<HTMLDivElement>(null);
  const centerOverlayTextRef = useRef<HTMLSpanElement>(null);

  const lastOverlayTextRef = useRef<string>('');
  const frozenStickAngleRef = useRef<number>(-Math.PI / 2);
  const lastOverlayStateRef = useRef({
    opacity: '',
    bgColor: '',
    imgDisplay: '',
    imgSrc: '',
    tintDisplay: '',
    color: '',
    textShadow: '',
    fontSize: '',
  });

  const [isCenterShaking, setIsCenterShaking] = useState(false);
  const isLetraActive = useSequencerStore(state => state.isLetraActive);
  const toggleLetraActive = useSequencerStore(state => state.toggleLetraActive);
  const vocalMode = useAudioStore(state => state.vocalMode);
  const setVocalMode = useAudioStore(state => state.setVocalMode);
  const [pendingTargetMeasure, setPendingTargetMeasure] = useState<number | null>(null);
  const pendingTargetMeasureRef = useRef<number | null>(null);
  const [pendingTargetExpandedIndex, setPendingTargetExpandedIndex] = useState<number | null>(null);
  const pendingTargetExpandedIndexRef = useRef<number | null>(null);

  useEffect(() => {
    setPendingTargetMeasure(null);
    pendingTargetMeasureRef.current = null;
    setPendingTargetExpandedIndex(null);
    pendingTargetExpandedIndexRef.current = null;
  }, [currentMeasure]);

  const expandedRef = useRef<any[]>([]);

  useEffect(() => {
    expandedRef.current = getExpandedMeasures(totalMeasures, songSections);
  }, [totalMeasures, songSections]);

  const livePlaybackRef = useRef<{
    step: number;
    measure: number;
    maxTicks: number;
    ratio: number;
    iteration: number;
    time: number;
    measureStartTime?: number;
    measureDuration?: number;
    isPreRoll?: boolean;
  }>({
    step: -1,
    measure: 0,
    maxTicks: 96,
    ratio: 0,
    iteration: 1,
    time: 0,
    isPreRoll: false,
  });

  if (!tracks) return null;

  const updateOverlay = (
    expandedMeasureIdx: number,
    baseMeasureIdx: number,
    currentBeat: number = 0,
    isPreRoll: boolean = false,
    preRollMeasureIndex: number = 0,
    preRollTotalMeasures: number = 1
  ) => {
    const container = centerOverlayRef.current;
    if (!container) return;

    // Si la Letra est active sur la Roda, masquer l'overlay DOM pour libérer le Canvas 2D
    if (stateRef.current.isLetraActive) {
      if (lastOverlayStateRef.current.opacity !== '0') {
        container.style.opacity = '0';
        lastOverlayStateRef.current.opacity = '0';
      }
      return;
    }

    const {
      measureSignals: currentMeasureSignals,
      rhythmSignals: currentRhythmSignals,
      mestreSignals: currentMestreSignals,
      songMarkers: currentSongMarkers,
      measureTimeSigs: currentMeasureTimeSigs,
      timeSig: defaultTimeSig
    } = stateRef.current;

    // 1. Resolve active signal
    let sigId: string | null = null;
    if (isPreRoll) {
      if (baseMeasureIdx === 0) {
        const preRoll = useTransportStore.getState().preRollSettings;
        if (preRollTotalMeasures === 2) {
          sigId = preRollMeasureIndex === 0
            ? (preRoll.startSignalMeasure1Id || null)
            : (preRoll.startSignalMeasure2Id || null);
        } else {
          sigId = preRoll.startSignalMeasure2Id || preRoll.startSignalMeasure1Id || null;
        }
      } else {
        // En cours de morceau (M > 0) : animer le signal de la mesure précédente M-1 s'il existe
        const prevM = baseMeasureIdx - 1;
        sigId = currentMeasureSignals?.[prevM] || null;
      }
    } else {
      sigId = currentMeasureSignals?.[expandedMeasureIdx] || null;
    }

    let activeSig: { name: string; image: string; frames?: string[]; beatsCount?: number; mirrorHorizontal?: boolean } | null = null;
    if (sigId) {
      const cloudSig = currentMestreSignals?.find(s => s.id === sigId);
      if (cloudSig) {
        const resolvedCloudImage = (cloudSig.frames && cloudSig.frames[0] && cloudSig.frames[0].startsWith('data:'))
          ? cloudSig.frames[0]
          : (cloudSig.image && cloudSig.image.startsWith('data:'))
            ? cloudSig.image
            : (cloudSig.imageUrl && cloudSig.imageUrl.startsWith('data:'))
              ? cloudSig.imageUrl
              : (cloudSig.image || cloudSig.imageUrl || '');

        activeSig = {
          name: cloudSig.name,
          image: resolvedCloudImage,
          frames: cloudSig.frames,
          beatsCount: cloudSig.beatsCount,
          mirrorHorizontal: cloudSig.mirrorHorizontal,
        };
      } else {
        const localSig = currentRhythmSignals?.find(s => s.id === sigId) as any;
        if (localSig) {
          const resolvedLocalImage = (localSig.frames && localSig.frames[0] && localSig.frames[0].startsWith('data:'))
            ? localSig.frames[0]
            : (localSig.image && localSig.image.startsWith('data:'))
              ? localSig.image
              : (localSig.image || '');

          activeSig = {
            name: localSig.name,
            image: resolvedLocalImage,
            frames: localSig.frames,
            beatsCount: localSig.beatsCount,
            mirrorHorizontal: localSig.mirrorHorizontal,
          };
        } else if (sigId.includes('pictures/') || sigId.includes('Pictures/')) {
          const isSam = sigId.includes('logo-samambaia');
          activeSig = {
            name: isSam ? 'Signe Luanda' : 'Signe Trovão',
            image: sigId.startsWith('/') ? sigId : `/${sigId.replace('pictures/', 'Pictures/')}`
          };
        }
      }
    }

    // 2. Resolve active marker (last crossed marker) - ignoré en précompte
    let activeMarker: SongMarker | null = null;
    if (!isPreRoll && currentSongMarkers && currentSongMarkers.length > 0) {
      for (const marker of currentSongMarkers) {
        if (marker.measure <= baseMeasureIdx) {
          if (!activeMarker || marker.measure > activeMarker.measure) {
            activeMarker = marker;
          }
        }
      }
    }

    const afficheurEl = centerAfficheurRef.current;
    const imgEl = centerOverlayImgRef.current;
    const tintEl = centerOverlayTintRef.current;
    const textEl = centerOverlayTextRef.current;

    if (!afficheurEl || !imgEl || !tintEl || !textEl) return;

    const cache = lastOverlayStateRef.current;

    if (activeSig) {
      // Résolution de la trame : si beatsCount === 1 (ou trame unique), afficher l'image fixe en continu sans division de frame
      let targetSrc = activeSig.image;
      if (activeSig.beatsCount !== 1 && activeSig.frames && activeSig.frames.length > 1) {
        const localSig = (currentMeasureTimeSigs && currentMeasureTimeSigs[baseMeasureIdx]) || defaultTimeSig || '4/4';
        const beatsInM = getBeatsPerMeasure(localSig);
        const totalFrames = activeSig.frames.length;
        const frameIdx = Math.min(totalFrames - 1, Math.floor((currentBeat / beatsInM) * totalFrames));
        targetSrc = activeSig.frames[frameIdx] || activeSig.frames[0] || activeSig.image;
      } else if (activeSig.frames && activeSig.frames.length > 0) {
        targetSrc = activeSig.frames[0] || activeSig.image;
      }

      if (cache.imgSrc !== targetSrc) {
        imgEl.src = targetSrc;
        cache.imgSrc = targetSrc;
      }
      if (imgEl.alt !== activeSig.name) {
        imgEl.alt = activeSig.name;
      }
      if (cache.imgDisplay !== 'block') {
        imgEl.style.display = 'block';
        cache.imgDisplay = 'block';
      }
      if (cache.tintDisplay !== 'block') {
        tintEl.style.display = 'block';
        cache.tintDisplay = 'block';
      }
      if (cache.bgColor !== 'transparent') {
        afficheurEl.style.backgroundColor = 'transparent';
        cache.bgColor = 'transparent';
      }

      if (lastOverlayTextRef.current !== activeSig.name) {
        textEl.innerText = activeSig.name;
        lastOverlayTextRef.current = activeSig.name;
      }
      if (cache.color !== '#ffffff') {
        textEl.style.color = '#ffffff';
        cache.color = '#ffffff';
      }
      if (cache.textShadow !== '0 1px 3px rgba(0,0,0,0.9)') {
        textEl.style.textShadow = '0 1px 3px rgba(0,0,0,0.9)';
        cache.textShadow = '0 1px 3px rgba(0,0,0,0.9)';
      }

      // Font size adaptation based on length (using CSS variables for clean updates)
      const len = activeSig.name.length;
      let sizeVal = 'clamp(7px, 1.1vw, 9px)';
      if (len <= 6) sizeVal = 'clamp(9px, 1.8vw, 16px)';
      else if (len <= 12) sizeVal = 'clamp(8px, 1.4vw, 12px)';

      if (cache.fontSize !== sizeVal) {
        textEl.style.setProperty('--dynamic-font-size', sizeVal);
        cache.fontSize = sizeVal;
      }

      if (cache.opacity !== '0.85') {
        container.style.opacity = '0.85';
        cache.opacity = '0.85';
      }
    } else if (isPreRoll) {
      // ⏱️ Décompte chiffré dynamique neutre (1, 2, 3, 4...)
      if (cache.imgDisplay !== 'none') {
        imgEl.style.display = 'none';
        cache.imgDisplay = 'none';
      }
      if (cache.tintDisplay !== 'none') {
        tintEl.style.display = 'none';
        cache.tintDisplay = 'none';
      }
      const countNum = String(currentBeat + 1);
      if (lastOverlayTextRef.current !== countNum) {
        textEl.innerText = countNum;
        lastOverlayTextRef.current = countNum;
      }
      if (cache.bgColor !== 'var(--cordel-wood)') {
        afficheurEl.style.backgroundColor = 'var(--cordel-wood)';
        cache.bgColor = 'var(--cordel-wood)';
      }
      if (cache.color !== '#f4ecd8') {
        textEl.style.color = '#f4ecd8';
        cache.color = '#f4ecd8';
      }
      if (cache.textShadow !== 'none') {
        textEl.style.textShadow = 'none';
        cache.textShadow = 'none';
      }
      const sizeVal = 'clamp(24px, 4.5vw, 38px)';
      if (cache.fontSize !== sizeVal) {
        textEl.style.setProperty('--dynamic-font-size', sizeVal);
        cache.fontSize = sizeVal;
      }
      if (cache.opacity !== '0.90') {
        container.style.opacity = '0.90';
        cache.opacity = '0.90';
      }
    } else if (activeMarker) {
      if (cache.imgDisplay !== 'none') {
        imgEl.style.display = 'none';
        cache.imgDisplay = 'none';
      }
      if (cache.tintDisplay !== 'none') {
        tintEl.style.display = 'none';
        cache.tintDisplay = 'none';
      }
      
      const targetBgColor = activeMarker.color || '#f19066';
      if (cache.bgColor !== targetBgColor) {
        afficheurEl.style.backgroundColor = targetBgColor;
        cache.bgColor = targetBgColor;
      }

      if (lastOverlayTextRef.current !== activeMarker.name) {
        textEl.innerText = activeMarker.name;
        lastOverlayTextRef.current = activeMarker.name;
      }
      if (cache.color !== '#1a1a1a') {
        textEl.style.color = '#1a1a1a';
        cache.color = '#1a1a1a';
      }
      if (cache.textShadow !== 'none') {
        textEl.style.textShadow = 'none';
        cache.textShadow = 'none';
      }

      // Font size adaptation based on longest line (keeping legible font 13-15px)
      const lines = activeMarker.name.split('\n');
      const maxLineLen = Math.max(...lines.map(l => l.trim().length));
      let sizeVal = 'clamp(12px, 1.6vw, 14px)';
      if (maxLineLen <= 6 && lines.length <= 2) sizeVal = 'clamp(13px, 2.0vw, 16px)';
      else if (maxLineLen <= 10 && lines.length <= 2) sizeVal = 'clamp(12px, 1.8vw, 15px)';
      else if (maxLineLen <= 14) sizeVal = 'clamp(11px, 1.6vw, 13px)';
      else sizeVal = 'clamp(10px, 1.3vw, 12px)';

      if (cache.fontSize !== sizeVal) {
        textEl.style.setProperty('--dynamic-font-size', sizeVal);
        cache.fontSize = sizeVal;
      }

      if (cache.opacity !== '0.85') {
        container.style.opacity = '0.85';
        cache.opacity = '0.85';
      }
    } else {
      if (cache.imgDisplay !== 'none') {
        imgEl.style.display = 'none';
        cache.imgDisplay = 'none';
      }
      if (cache.tintDisplay !== 'none') {
        tintEl.style.display = 'none';
        cache.tintDisplay = 'none';
      }
      if (lastOverlayTextRef.current !== '') {
        textEl.innerText = '';
        lastOverlayTextRef.current = '';
      }
      if (cache.textShadow !== 'none') {
        textEl.style.textShadow = 'none';
        cache.textShadow = 'none';
      }
      if (cache.bgColor !== 'transparent') {
        afficheurEl.style.backgroundColor = 'transparent';
        cache.bgColor = 'transparent';
      }
      if (cache.opacity !== '0') {
        container.style.opacity = '0';
        cache.opacity = '0';
      }
    }
  };

  useEffect(() => {
    if (!isActive) return;

    const handleTick = (detail: {
      step: number;
      measure: number;
      maxTicks: number;
      ratio?: number;
      time?: number;
      iteration?: number;
      measureStartTime?: number;
      measureDuration?: number;
      isPreRoll?: boolean;
      preRollBeat?: number;
      preRollMeasureIndex?: number;
      preRollTotalMeasures?: number;
      isPaused?: boolean;
      isNavigation?: boolean;
    }) => {
      const { step, measure, maxTicks, ratio = step / maxTicks, time = 0, iteration = 1, measureStartTime, measureDuration, isPaused, isNavigation } = detail as any;

      if (isPaused) {
        if (isNavigation) {
          livePlaybackRef.current = {
            step: 0,
            measure,
            maxTicks,
            ratio: 0,
            iteration,
            time: 0,
            measureStartTime: 0,
            measureDuration: 0,
            isPreRoll: false,
          };
          frozenStickAngleRef.current = -Math.PI / 2;
          const expanded = expandedRef.current;
          const activeRepIndex = expanded.findIndex(item => item.baseMeasure === measure && item.iteration === iteration);
          const displayMeasure = activeRepIndex !== -1 ? activeRepIndex + 1 : measure + 1;
          const displayTotal = expanded.length > 0 ? expanded.length : totalMeasures;
          if (measureDisplayRef.current) {
            measureDisplayRef.current.innerText = `${displayMeasure} / ${displayTotal}`;
          }
          updateOverlay(displayMeasure - 1, measure, 0, false);
        }
        return;
      }

      if (step < 0) {
        livePlaybackRef.current = {
          step: -1,
          measure: 0,
          maxTicks,
          ratio: 0,
          iteration: 1,
          time: 0,
          measureStartTime: 0,
          measureDuration: 0,
          isPreRoll: false,
        };
        frozenStickAngleRef.current = -Math.PI / 2;
        const expanded = expandedRef.current;
        const displayTotal = expanded.length > 0 ? expanded.length : totalMeasures;
        if (measureDisplayRef.current) {
          measureDisplayRef.current.innerText = `1 / ${displayTotal}`;
        }
        updateOverlay(0, 0);
        return;
      }

      const currentLive = livePlaybackRef.current;
      const isNewMeasure = currentLive.measure !== measure || currentLive.step < 0 || !currentLive.measureStartTime;
      const updatedStartTime = isNewMeasure ? (measureStartTime || currentLive.measureStartTime) : (currentLive.measureStartTime || measureStartTime);

      livePlaybackRef.current = {
        step,
        measure,
        maxTicks,
        ratio,
        iteration,
        time,
        measureStartTime: updatedStartTime,
        measureDuration: measureDuration ?? currentLive.measureDuration,
        isPreRoll: Boolean(detail.isPreRoll),
      };

      const expanded = expandedRef.current;
      let displayMeasure = 1;
      const displayTotal = expanded.length > 0 ? expanded.length : totalMeasures;
 
      if (pendingTargetExpandedIndexRef.current !== null) {
        displayMeasure = pendingTargetExpandedIndexRef.current + 1;
      } else {
        const activeRepIndex = expanded.findIndex(item => item.baseMeasure === measure && item.iteration === iteration);
        displayMeasure = activeRepIndex !== -1 ? activeRepIndex + 1 : measure + 1;
      }

      const localTimeSig = (measureTimeSigs && measureTimeSigs[measure]) || timeSig || '4/4';
      const beatsPerMeasure = getBeatsPerMeasure(localTimeSig);
      const currentBeat = Math.min(beatsPerMeasure - 1, Math.max(0, Math.floor(ratio * beatsPerMeasure)));

      if (detail.isPreRoll) {
        if (measureDisplayRef.current) {
          measureDisplayRef.current.innerText = lang === 'fr' ? 'PRÉCOMPTE' : 'PRÉ-ROLL';
        }
        updateOverlay(
          displayMeasure - 1,
          measure,
          detail.preRollBeat !== undefined ? detail.preRollBeat : currentBeat,
          true,
          detail.preRollMeasureIndex ?? 0,
          detail.preRollTotalMeasures ?? 1
        );
      } else {
        if (measureDisplayRef.current) {
          measureDisplayRef.current.innerText = `${displayMeasure} / ${displayTotal}`;
        }
        updateOverlay(displayMeasure - 1, measure, currentBeat, false);
      }
    };
 
    const handleMeasureQueued = (e: Event) => {
      const customEvent = e as CustomEvent<{ measure: number; iteration?: number }>;
      const { measure, iteration = 1 } = customEvent.detail;
      if (measureDisplayRef.current) {
        const expanded = expandedRef.current;
        let displayMeasure = 1;
        const displayTotal = expanded.length > 0 ? expanded.length : totalMeasures;
 
        if (pendingTargetExpandedIndexRef.current !== null) {
          displayMeasure = pendingTargetExpandedIndexRef.current + 1;
        } else {
          const activeRepIndex = expanded.findIndex(item => item.baseMeasure === measure && item.iteration === iteration);
          displayMeasure = activeRepIndex !== -1 ? activeRepIndex + 1 : measure + 1;
        }
        measureDisplayRef.current.innerText = `${displayMeasure} / ${displayTotal}`;
      }
    };
 
    subscribeToTick(handleTick);
    window.addEventListener('o-girador-measure-queued', handleMeasureQueued);
    return () => {
      unsubscribeFromTick(handleTick);
      window.removeEventListener('o-girador-measure-queued', handleMeasureQueued);
    };
  }, [totalMeasures, songSections, isActive]);
 
  useEffect(() => {
    let expandedIdx = currentExpandedMeasureIdx;
    let baseIdx = currentMeasure;
    if (isPlaying) {
      const live = livePlaybackRef.current;
      baseIdx = live.measure;
      const expanded = expandedRef.current;
      const activeRepIndex = expanded.findIndex(item => item.baseMeasure === live.measure && item.iteration === (live.iteration || 1));
      if (activeRepIndex !== -1) {
        expandedIdx = activeRepIndex;
      }
    } else {
      const expanded = expandedRef.current;
      if (expanded && expanded[currentExpandedMeasureIdx]) {
        baseIdx = expanded[currentExpandedMeasureIdx].baseMeasure;
      }
    }
    updateOverlay(expandedIdx, baseIdx);
  }, [currentExpandedMeasureIdx, currentMeasure, isPlaying, measureSignals, rhythmSignals, mestreSignals, songSections, songMarkers]);

  useEffect(() => {
    let timerId: any = null;
    const handleApitoShake = () => {
      if (timerId) clearTimeout(timerId);
      setIsCenterShaking(true);
      timerId = setTimeout(() => {
        setIsCenterShaking(false);
      }, 300);
    };

    window.addEventListener('o-girador-apito-shake', handleApitoShake);
    return () => {
      window.removeEventListener('o-girador-apito-shake', handleApitoShake);
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  const getLiveActivePatternId = (track: TrackGroup): number | null => {
    const live = livePlaybackRef.current;
    const state = stateRef.current;
    const measureIdx = (live && live.step >= 0) ? live.measure : state.currentMeasure;

    const isToada = isToadaBus(track);

    if (isToada) {
      const pux = state.rawTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
      const coro = state.rawTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
      
      const soloPlayId = state.soloPatternPlayId;
      if (soloPlayId !== undefined && soloPlayId !== null) {
        if (pux && pux.patterns.some(p => p.id === soloPlayId)) return soloPlayId;
        if (coro && coro.patterns.some(p => p.id === soloPlayId)) return soloPlayId;
        return null;
      }

      if (coro) {
        for (let i = 0; i < coro.patterns.length; i++) {
          if (coro.patterns[i].measureAssignments[measureIdx]) {
            return coro.patterns[i].id;
          }
        }
      }
      if (pux) {
        for (let i = 0; i < pux.patterns.length; i++) {
          if (pux.patterns[i].measureAssignments[measureIdx]) {
            return pux.patterns[i].id;
          }
        }
      }
      return null;
    }

    const soloPlayId = state.soloPatternPlayId;
    
    const isLinkedChild = track.linkedToTrackId && !track.isLinkFolder;
    let sourceTrack = track;
    if (isLinkedChild) {
      const master = state.rawTracks.find((t: any) => String(t.id) === String(track.linkedToTrackId));
      if (master) sourceTrack = master;
    }

    if (soloPlayId !== undefined && soloPlayId !== null) {
      for (let i = 0; i < sourceTrack.patterns.length; i++) {
        if (sourceTrack.patterns[i].id === soloPlayId) {
          return soloPlayId;
        }
      }
      return null;
    }

    if (isLinkedChild) {
      const override = track.isLinkMaster ? undefined : track.patternOverrides?.[measureIdx];
      if (override === null) return null;
      if (override !== undefined) return override;
    }

    for (let i = 0; i < sourceTrack.patterns.length; i++) {
      if (sourceTrack.patterns[i].measureAssignments[measureIdx]) {
        return sourceTrack.patterns[i].id;
      }
    }
    return null;
  };

  // Use refs in the animation loop to avoid stale closure issues
  const stateRef = useRef({
    tracks,
    rawTracks,
    rodaTrackOrder,
    isPlaying,
    currentMeasure,
    maxTicks,
    timeSig,
    lang,
    isMetroOn,
    activeCircleIdByInst,
    totalMeasures,
    isLoopRegionActive,
    loopStartMeasure,
    loopEndMeasure,
    activePatternIdByTrack,
    hitTriggersRef,
    bpm,
    measureBpms,
    measureVols,
    isMobile,
    soloPatternPlayId,
    measureSignals,
    rhythmSignals,
    mestreSignals,
    songSections,
    isLeftHanded,
    songMarkers,
    measureTimeSigs,
    isLetraActive,
    vocalMode,
  });

  useEffect(() => {
    stateRef.current = {
      tracks,
      rawTracks,
      rodaTrackOrder,
      isPlaying,
      currentMeasure,
      maxTicks,
      timeSig,
      lang,
      isMetroOn,
      activeCircleIdByInst,
      totalMeasures,
      isLoopRegionActive,
      loopStartMeasure,
      loopEndMeasure,
      activePatternIdByTrack,
      hitTriggersRef,
      bpm,
      measureBpms,
      measureVols,
      isMobile,
      soloPatternPlayId,
      measureSignals,
      rhythmSignals,
      mestreSignals,
      songSections,
      isLeftHanded,
      songMarkers,
      measureTimeSigs,
      isLetraActive,
      vocalMode,
    };
  }, [tracks, rawTracks, rodaTrackOrder, isPlaying, currentMeasure, maxTicks, timeSig, lang, isMetroOn, activeCircleIdByInst, totalMeasures, isLoopRegionActive, loopStartMeasure, loopEndMeasure, activePatternIdByTrack, hitTriggersRef, bpm, measureBpms, measureVols, isMobile, soloPatternPlayId, measureSignals, rhythmSignals, mestreSignals, songSections, songMarkers, isLeftHanded, measureTimeSigs, isLetraActive, vocalMode]);

  useEffect(() => {
    if (props.tracks !== undefined) return;
    
    // Keep filtered tracks in stateRef up to date imperatively
    stateRef.current.tracks = useSequencerStore.getState().tracks.filter(t => isSequencerVisibleTrack(t, useSequencerStore.getState().tracks));
    stateRef.current.rawTracks = useSequencerStore.getState().tracks;
    stateRef.current.rodaTrackOrder = useSequencerStore.getState().rodaTrackOrder;
    stateRef.current.isLoopRegionActive = useSequencerStore.getState().isLoopRegionActive;
    stateRef.current.loopStartMeasure = useSequencerStore.getState().loopStartMeasure;
    stateRef.current.loopEndMeasure = useSequencerStore.getState().loopEndMeasure;
    
    const unsubscribe = useSequencerStore.subscribe(
      (state) => {
        stateRef.current.tracks = state.tracks.filter(t => isSequencerVisibleTrack(t, state.tracks));
        stateRef.current.rawTracks = state.tracks;
        stateRef.current.rodaTrackOrder = state.rodaTrackOrder;
        stateRef.current.isLoopRegionActive = state.isLoopRegionActive;
        stateRef.current.loopStartMeasure = state.loopStartMeasure;
        stateRef.current.loopEndMeasure = state.loopEndMeasure;
      }
    );
    return unsubscribe;
  }, [props.tracks]);

  // Handle click on canvas via Pointer Events (no touch latency)
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Translate click to real coordinate system of size 1200 x 1200
    const mouseX = (e.clientX - rect.left) * (1200 / rect.width);
    const mouseY = (e.clientY - rect.top) * (1200 / rect.height);

    const centerX = 600;
    const centerY = 600;
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Toggle Play when clicking center area
    if (distance < 55) {
      const toneInst = safeGetTone();
      if (toneInst && toneInst.context && toneInst.context.state !== 'running') {
        try { toneInst.context.resume(); } catch (_) {}
      }
      if (audio.isLoading) return;
      onTogglePlay();
      return;
    }

    // Étape 1 (React Bypass Mobile) : Bloquer l'édition tactile des pas pendant la lecture sur mobile
    const isCurrentlyPlaying = stateRef.current.isPlaying;
    const isCurrentlyMobile = stateRef.current.isMobile || (typeof window !== 'undefined' && window.innerWidth <= 768);
    if (isCurrentlyPlaying && isCurrentlyMobile) {
      return;
    }

    const currentTracks = stateRef.current.tracks;
    const currentRawTracks = stateRef.current.rawTracks;
    const currentRodaOrder = stateRef.current.rodaTrackOrder;

    const sortedCurrentTracks = sortTracksByRodaOrder(currentTracks, currentRodaOrder);

    const activeVisibleTracksToDraw = sortedCurrentTracks.filter(t => {
      if (t.isHidden) return false;
      if (!isSequencerVisibleTrack(t, currentTracks)) return false;
      if (instrumentsConfig[t.instrumentIdx]?.id === 'apito') return false;

      return !getEffectiveMuteState(currentRawTracks, t.id);
    });

    activeVisibleTracksToDraw.forEach((track, visibleIdx) => {
      const isToada = isToadaBus(track);
      let activePattern: Pattern | null | undefined = null;
      let ownerTrack = track;
      
      const activePatternId = getLiveActivePatternId(track);
      if (activePatternId === null) return;
      
      if (isToada) {
        const pux = currentTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
        const coro = currentTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
        
        if (pux) {
          activePattern = pux.patterns.find(p => p.id === activePatternId);
          if (activePattern) ownerTrack = pux;
        }
        if (!activePattern && coro) {
          activePattern = coro.patterns.find(p => p.id === activePatternId);
          if (activePattern) ownerTrack = coro;
        }
      } else {
        activePattern = track.patterns.find(p => p.id === activePatternId);
      }
      
      if (!activePattern) return;
      const inst = instrumentsConfig[ownerTrack.instrumentIdx];
      if (!inst) return null;

      const tRad = getTrackRadius(visibleIdx, activeVisibleTracksToDraw.length);

      if (Math.abs(distance - tRad) < 18) {
        let clickAngle = Math.atan2(dy, dx) + Math.PI / 2;
        if (clickAngle < 0) clickAngle += Math.PI * 2;

        const stepAngleSize = (Math.PI * 2) / activePattern.steps;

        for (let i = 0; i < activePattern.steps; i++) {
          const targetAngle = i * stepAngleSize;
          let angleDiff = Math.abs(clickAngle - targetAngle);
          if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

          // Inside target step hitbox
          if (angleDiff < stepAngleSize / 2) {
            const currentVal = activePattern.activeSteps[i];

            if (inst.type === 'voice') {
              // Dialog prompt to customize vocals
              const currentNote = (activePattern.notes && activePattern.notes[i]) ? activePattern.notes[i] + ':' : '';
              const lyricPrompt = currentNote + (currentVal === 'P' ? '*' : '') + (activePattern.lyrics[i] || '');
              const typed = window.prompt(langPromptVoiceText, lyricPrompt);

              if (typed !== null) {
                const trimmed = typed.trim();
                if (trimmed === '') {
                  onStepChange(ownerTrack.id, activePattern.id, i, 0, '', '');
                } else {
                  let parsedNote = '';
                  let parsedSyllable = trimmed;

                  if (trimmed.includes(':')) {
                    const parts = trimmed.split(':');
                    parsedNote = parts[0].trim();
                    parsedSyllable = parts[1].trim();
                    if (/^[a-gA-G][#b]?$/.test(parsedNote)) {
                      parsedNote += '4';
                    }
                  }

                  let activeType = 'C';
                  if (parsedSyllable.startsWith('*')) {
                    activeType = 'P';
                    parsedSyllable = parsedSyllable.substring(1).substring(0, 15);
                  } else {
                    parsedSyllable = parsedSyllable.substring(0, 15);
                  }

                  onStepChange(ownerTrack.id, activePattern.id, i, activeType, parsedSyllable, parsedNote.toUpperCase());
                }
              }
            } else {
              if (onStepTouchStart) {
                onStepTouchStart(
                  e,
                  activePattern.id,
                  i,
                  inst.id,
                  currentVal,
                  (nextVal) => {
                    onStepChange(ownerTrack.id, activePattern.id, i, nextVal);
                  },
                  ownerTrack.id
                );
              } else {
                const visualVal = getVisualStrokeSymbol(currentVal, stateRef.current.isLeftHanded || false, inst.id);
                const primaryVisualVal = Array.isArray(visualVal) ? visualVal[0] : visualVal;
                const nextVisualVal = getNextStepValue(inst.id, inst.type, primaryVisualVal);
                const nextSemanticVal = getVisualStrokeSymbol(nextVisualVal, stateRef.current.isLeftHanded || false, inst.id);
                const primarySemanticVal = Array.isArray(nextSemanticVal) ? nextSemanticVal[0] : nextSemanticVal;
                onStepChange(ownerTrack.id, activePattern.id, i, primarySemanticVal);
              }
            }
            return;
          }
        }
      }
    });
  };

  // 🛡️ FIX (Performance): control requestAnimationFrame lifecycle based on visibility
  const visibleRef = useRef(isActive);
  const loopRunningRef = useRef(false);
  const drawLoopRef = useRef<() => void>(() => {});

  useEffect(() => {
    visibleRef.current = isActive;
    if (isActive && !loopRunningRef.current) {
      loopRunningRef.current = true;
      drawLoopRef.current();
    } else if (!isActive) {
      loopRunningRef.current = false;
    }
  }, [isActive]);

  // Canvas render animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 1200;
    bgCanvas.height = 1200;
    const bgCtx = bgCanvas.getContext('2d');
    let currentCanvasSize = 1200;
    let isBgCached = false;
    let lastTimeSig = '';
    let lastTicks = -1;

    let animId: number;
    let flashAlpha = 0;
    let stickAngle = -Math.PI / 2;
    let smoothedAngle = -Math.PI / 2;
    let targetAngle = -Math.PI / 2;
    let isFirstAngleFrame = true;
    let lastFlashBeat = -1;

    const instrumentTotals: Record<number, number> = {};
    const instrumentIndexes: Record<number, number> = {};

    interface Ripple {
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      alpha: number;
      color: string;
      speed: number;
    }
    let ripples: Ripple[] = [];

    // Cache theme colors to avoid layout reflows from calling getComputedStyle in the 60fps drawLoop
    let themeBg = '#f4ecd8';
    let themeText = '#1a1a1a';
    let themeBorder = '#1a1a1a';
    let themeWood = '#8b2a1a';

    const updateThemeColors = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      themeBg = computedStyle.getPropertyValue('--cordel-bg').trim() || '#f4ecd8';
      themeText = computedStyle.getPropertyValue('--cordel-text').trim() || '#1a1a1a';
      themeBorder = computedStyle.getPropertyValue('--cordel-border').trim() || '#1a1a1a';
      themeWood = computedStyle.getPropertyValue('--cordel-wood').trim() || '#8b2a1a';
      isBgCached = false;
    };

    updateThemeColors();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          updateThemeColors();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    let lastDrawTime = performance.now();

    const drawLoop = () => {
      if ((window as any).oGiradorDetailEditorOpen) {
        animId = requestAnimationFrame(drawLoop);
        return;
      }
      if (!visibleRef.current) {
        loopRunningRef.current = false;
        return;
      }
      const time = performance.now();
      
      const sequencerState = useSequencerStore.getState();
      const isEco = sequencerState.ecoConfig?.disableAnimations ?? sequencerState.isEcoMode;
      const storeTracks = sequencerState.tracks;
      const targetSize = isEco ? 600 : 1200;
      
      if (currentCanvasSize !== targetSize) {
        if (canvas) {
          canvas.width = targetSize;
          canvas.height = targetSize;
        }
        bgCanvas.width = targetSize;
        bgCanvas.height = targetSize;
        currentCanvasSize = targetSize;
        isBgCached = false;
      }
      
      if (isEco) {
        // Throttle to roughly 30fps to drastically save GPU on old tablets
        if (time - lastDrawTime < 33) {
          animId = requestAnimationFrame(drawLoop);
          return;
        }
      }
      lastDrawTime = time;

      const { 
        tracks, 
        rawTracks: localRawTracks,
        rodaTrackOrder: localRodaOrder,
        isPlaying: localPlaying, 
        timeSig: localTimeSig,
        isMetroOn: localMetroOn, 
        hitTriggersRef: localHitTriggers,
        isLeftHanded: localLeftHanded
      } = stateRef.current;

      const live = livePlaybackRef.current;
      const localStep = live.step;
      const localTicks = live.maxTicks || 96;

      // 2. Filtrer et ordonner les pistes actives et visibles selon rodaTrackOrder
      const sortedTracks = sortTracksByRodaOrder(tracks, localRodaOrder);
      const activeVisibleTracks = sortedTracks.filter(t => {
        if (t.isHidden) return false;
        if (!isSequencerVisibleTrack(t, tracks)) return false;
        if (instrumentsConfig[t.instrumentIdx]?.id === 'apito') return false;

        return !getEffectiveMuteState(localRawTracks, t.id);
      });

      const isHeavyEffectsDisabled = isEco || stateRef.current.isMobile || (typeof window !== 'undefined' && window.innerWidth <= 768);

      // Consume hit triggers to create ripples (désactivé sur mobile/mode éco pour préserver le GPU)
      if (localHitTriggers && localHitTriggers.current) {
        const pool = localHitTriggers.current;
        if (!isHeavyEffectsDisabled) {
          // Coût unique par trame de dessin : O(N) où N est le nombre de pistes
          const tracksMap = new Map<number | string, any>();
          const len = localRawTracks.length;
          for (let i = 0; i < len; i++) {
            const t = localRawTracks[i];
            tracksMap.set(t.id, t);
            tracksMap.set(String(t.id), t);
          }

          while (pool.readIndex !== pool.writeIndex) {
            const hit = pool.buffer[pool.readIndex];
            pool.readIndex = (pool.readIndex + 1) % pool.size;
            
            let track = tracksMap.get(hit.trackId);
            if (track && track.linkedToTrackId) {
              track = tracksMap.get(track.linkedToTrackId) || tracksMap.get(Number(track.linkedToTrackId));
            }
            if (track && !track.isHidden && !track.isMute) {
              const inst = instrumentsConfig[track.instrumentIdx];
              if (!inst) continue;
              const color = inst.colors[hit.state as any] || themeText;
              const activePatternId = getLiveActivePatternId(track);
              if (activePatternId === null) continue;
              const activePattern = track.patterns.find(p => p.id === activePatternId) || track.patterns[0];
              const angle = -Math.PI / 2 + ((hit.stepIndex / activePattern.steps) * Math.PI * 2);
              
              const visibleIdx = activeVisibleTracks.findIndex(vt => vt.id === track!.id);
              if (visibleIdx !== -1) {
                const radius = getTrackRadius(visibleIdx, activeVisibleTracks.length);
                const x = 600 + Math.cos(angle) * radius;
                const y = 600 + Math.sin(angle) * radius;

                ripples.push({
                  x, y,
                  radius: 6,
                  maxRadius: 25 + (track.volumeVal / 100) * 15,
                  alpha: 0.6 * (track.volumeVal / 100),
                  color: color,
                  speed: 1.0 + Math.random() * 0.5
                });
              }
            }
          }
        } else {
          pool.readIndex = pool.writeIndex;
        }
      }

      const centerX = 600;
      const centerY = 600;

      // Cordel style Alfaia Drum
      const drumRadius = 560;
      const rimRadius = 540;
      const innerSkinRadius = 522;

      const markers = getMarkers(localTimeSig, localTicks);
      const ticksPerBeat = localTicks / markers.length;

      ctx.clearRect(0, 0, currentCanvasSize, currentCanvasSize);
      
      ctx.save();
      if (isEco) {
        ctx.scale(0.5, 0.5);
      }

      if (lastTimeSig !== localTimeSig || lastTicks !== localTicks) {
        isBgCached = false;
        lastTimeSig = localTimeSig;
        lastTicks = localTicks;
      }

      if (!isBgCached && bgCtx) {
        bgCtx.clearRect(0, 0, currentCanvasSize, currentCanvasSize);
        bgCtx.save();
        if (isEco) {
          bgCtx.scale(0.5, 0.5);
        }

        // 1. Ropes (Cordas) - drawn with black ink style
        const numCords = 16;
        bgCtx.lineWidth = 7;
        bgCtx.strokeStyle = themeBorder;
        bgCtx.lineCap = 'round';
        bgCtx.lineJoin = 'round';

        for (let i = 0; i < numCords; i++) {
          const a1 = (i * Math.PI * 2) / numCords;
          const a2 = ((i + 0.5) * Math.PI * 2) / numCords;
          
          bgCtx.beginPath();
          bgCtx.moveTo(centerX + Math.cos(a1) * (rimRadius - 5), centerY + Math.sin(a1) * (rimRadius - 5));
          bgCtx.lineTo(centerX + Math.cos(a2) * drumRadius, centerY + Math.sin(a2) * drumRadius);
          const a3 = ((i + 1) * Math.PI * 2) / numCords;
          bgCtx.lineTo(centerX + Math.cos(a3) * (rimRadius - 5), centerY + Math.sin(a3) * (rimRadius - 5));
          bgCtx.stroke();
        }

        // 2. Wooden Rim (Aro) - flat dark wood that fits Cordel
        bgCtx.beginPath();
        bgCtx.arc(centerX, centerY, rimRadius, 0, Math.PI * 2);
        bgCtx.lineWidth = 36;
        bgCtx.strokeStyle = '#2c1e16'; // Very dark wood brown
        bgCtx.stroke();

        // Rim ink outlines
        bgCtx.beginPath();
        bgCtx.arc(centerX, centerY, rimRadius - 18, 0, Math.PI * 2);
        bgCtx.lineWidth = 4;
        bgCtx.strokeStyle = themeBorder;
        bgCtx.stroke();
        
        bgCtx.beginPath();
        bgCtx.arc(centerX, centerY, rimRadius + 18, 0, Math.PI * 2);
        bgCtx.lineWidth = 4;
        bgCtx.strokeStyle = themeBorder;
        bgCtx.stroke();

        // 3. Animal Skin (Couro) - Cream paper
        bgCtx.beginPath();
        bgCtx.arc(centerX, centerY, innerSkinRadius, 0, Math.PI * 2);
        bgCtx.fillStyle = themeBg;
        bgCtx.save();
        bgCtx.globalAlpha = 0.85;
        bgCtx.fill();
        bgCtx.restore();

        // Skin edge ink shadow
        bgCtx.beginPath();
        bgCtx.arc(centerX, centerY, innerSkinRadius, 0, Math.PI * 2);
        bgCtx.lineWidth = 5;
        bgCtx.strokeStyle = themeBorder;
        bgCtx.stroke();

        // Inner decorative ring (Cordel style dashes)
        bgCtx.beginPath();
        bgCtx.arc(centerX, centerY, innerSkinRadius - 15, 0, Math.PI * 2);
        bgCtx.lineWidth = 1.5;
        bgCtx.strokeStyle = themeBorder;
        bgCtx.setLineDash([8, 8]);
        bgCtx.stroke();
        bgCtx.setLineDash([]);

        // Render Time markers around the rim
        markers.forEach((tick, idx) => {
          const angle = -Math.PI / 2 + ((tick / localTicks) * Math.PI * 2);
          const inRad = innerSkinRadius - 35, outRad = innerSkinRadius - 20;
          bgCtx.beginPath();
          bgCtx.moveTo(centerX + Math.cos(angle) * inRad, centerY + Math.sin(angle) * inRad);
          bgCtx.lineTo(centerX + Math.cos(angle) * outRad, centerY + Math.sin(angle) * outRad);
          bgCtx.strokeStyle = themeBorder;
          bgCtx.save();
          if (tick !== 0) {
            bgCtx.globalAlpha = 0.3;
          }
          bgCtx.lineWidth = (tick === 0) ? 4 : 2;
          bgCtx.stroke();
          bgCtx.restore();

          // Draw a premium circular badge on the dark wood rim for the beat number
          const textRad = 540;
          const badgeX = centerX + Math.cos(angle) * textRad;
          const badgeY = centerY + Math.sin(angle) * textRad;

          bgCtx.beginPath();
          bgCtx.arc(badgeX, badgeY, 18, 0, Math.PI * 2);
          bgCtx.fillStyle = themeBg; // Cream skin color
          bgCtx.fill();
          bgCtx.strokeStyle = themeBorder; // Dark ink outline
          bgCtx.lineWidth = 1.5;
          bgCtx.stroke();

          // Draw the beat number inside the badge
          bgCtx.fillStyle = themeText; // Dark ink text
          bgCtx.font = 'bold 20px "Outfit", "Inter", sans-serif';
          bgCtx.textAlign = 'center';
          bgCtx.textBaseline = 'middle';
          const strVal = (idx + 1).toString();
          bgCtx.fillText(strVal, badgeX, badgeY + 1.5); // slight offset for vertical alignment
        });

        // 5b. Grid lines (lines indicating beats and subdivisions) under the sequencer tracks
        bgCtx.save();
        const isCompound = localTimeSig === '6/8' || localTimeSig === '12/8';
        
        // For compound signatures, beat is dotted quarter note = 12 ticks, subdivision is eighth note = 4 ticks.
        // For simple signatures, beat is quarter note = 24 ticks, subdivision is 16th note = 6 ticks.
        const subdivisionTickInterval = isCompound ? 4 : 6;

        for (let t = 0; t < localTicks; t += subdivisionTickInterval) {
          const angle = -Math.PI / 2 + (t / localTicks) * Math.PI * 2;
          const isMainBeat = t % ticksPerBeat === 0;

          bgCtx.beginPath();
          // Draw from the play button edge (radius 60) to the outer skin limit (radius 516)
          bgCtx.moveTo(centerX + Math.cos(angle) * 60, centerY + Math.sin(angle) * 60);
          bgCtx.lineTo(centerX + Math.cos(angle) * 516, centerY + Math.sin(angle) * 516);

          bgCtx.strokeStyle = themeBorder;
          if (isMainBeat) {
            bgCtx.globalAlpha = 0.60;
            bgCtx.lineWidth = 3.0;
            bgCtx.setLineDash([]);
          } else {
            bgCtx.globalAlpha = 0.22;
            bgCtx.lineWidth = 1.5;
            bgCtx.setLineDash([4, 4]);
          }
          bgCtx.stroke();
        }
        bgCtx.restore();

        if (isEco) {
          bgCtx.restore(); // Restore bgCtx scale
        }
        isBgCached = true;
      }

      // Temporarily restore ctx so we can draw bgCanvas at 1:1 scale
      ctx.restore();
      ctx.drawImage(bgCanvas, 0, 0);
      
      // Re-apply ctx scale for the rest of the dynamic drawing
      ctx.save();
      if (isEco) {
        ctx.scale(0.5, 0.5);
      }

      // Metronome Flash (if active)
      if (localMetroOn && flashAlpha > 0 && !isEco) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerSkinRadius, 0, Math.PI * 2);
        ctx.fillStyle = themeBorder;
        ctx.globalAlpha = flashAlpha * 0.15;
        ctx.fill();
        ctx.restore();
      }

      // Animated golden beat indicators glow
      const currentBeat = localStep >= 0 ? Math.floor(localStep / ticksPerBeat) : -1;
      
      if (localPlaying && localMetroOn && currentBeat !== -1 && currentBeat !== lastFlashBeat) {
        flashAlpha = 1.0;
        lastFlashBeat = currentBeat;
      } else if (!localPlaying) {
        lastFlashBeat = -1;
      }

      if (flashAlpha > 0) {
        flashAlpha -= 0.05;
      }

      // Rotate Drumstick indicating active play head step with real-time continuous 60 FPS 1:1 hardware clock sync
      const isCurrentlyPlaying = localPlaying || (audioEngine ? audioEngine.getIsPlaying() : false);

      // --- VERROUILLAGE DE PHASE (Phase-Lock) SUR LES TICKS AUDIO ---
      const getAudioTime = () => {
        if (audioEngine && typeof audioEngine.getCurrentTime === 'function') {
          return audioEngine.getCurrentTime();
        }
        const toneInst = safeGetTone();
        if (toneInst && toneInst.context) {
          return (toneInst.context.rawContext as AudioContext).currentTime;
        }
        return 0;
      };

      const ctxTime = getAudioTime();
      const isUltraEco = usePerformanceStore.getState().disablePlayheadRAF;

      if (live.isPreRoll) {
        // En précompte, la baguette reste strictement ancrée et immobile à 12h (pas 0)
        stickAngle = -Math.PI / 2;
        frozenStickAngleRef.current = -Math.PI / 2;
      } else if (isCurrentlyPlaying && live.step >= 0 && live.ratio !== undefined && live.time !== undefined && live.measureDuration && live.measureDuration > 0) {
        if (isUltraEco || isEco) {
          // Hard-lock absolu sur le tick (sans interpolation GPU)
          stickAngle = -Math.PI / 2 + (live.ratio * Math.PI * 2);
        } else {
          // Phase-Locked Interpolation
          const elapsedSinceTick = Math.max(0, ctxTime - live.time);
          
          // Resync Protection (Hard Sync) : 
          // Si l'horloge locale dévie trop (ex: > 100ms) par rapport au temps du tick (ex: reprise de pause),
          // on force le retour exact sur le ratio du séquenceur pour empêcher un bond de phase.
          if (elapsedSinceTick > 0.1) {
            stickAngle = -Math.PI / 2 + (live.ratio * Math.PI * 2);
          } else {
            const ratioProgression = elapsedSinceTick / live.measureDuration;
            const currentRatio = (live.ratio + ratioProgression) % 1;
            stickAngle = -Math.PI / 2 + (currentRatio * Math.PI * 2);
          }
        }
        frozenStickAngleRef.current = stickAngle;
      } else if (!isCurrentlyPlaying && live.step >= 0 && frozenStickAngleRef.current !== undefined) {
        stickAngle = frozenStickAngleRef.current;
      } else if (live.step >= 0 && live.ratio !== undefined && live.ratio >= 0) {
        stickAngle = -Math.PI / 2 + (live.ratio * Math.PI * 2);
      } else {
        stickAngle = -Math.PI / 2;
      }

      // Dynamic scale multiplier
      const maxTracks = 10;
      const countClamped = Math.min(activeVisibleTracks.length, maxTracks);
      const dynamicScale = activeVisibleTracks.length > 0 ? 1 + ((maxTracks - countClamped) * 0.08) : 1;

      // Render Ripples (Ondes de choc)
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.speed;
        r.alpha -= 0.015;
        if (r.alpha <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.globalAlpha = Math.min(1, r.alpha);
        ctx.strokeStyle = r.color;
        ctx.stroke();
        ctx.restore();
      }

      for (const key in instrumentTotals) delete instrumentTotals[key];
      for (const key in instrumentIndexes) delete instrumentIndexes[key];

      for (let i = 0; i < activeVisibleTracks.length; i++) {
        const idx = activeVisibleTracks[i].instrumentIdx;
        instrumentTotals[idx] = (instrumentTotals[idx] || 0) + 1;
      }

      // Render concentric sequencer tracks
      activeVisibleTracks.forEach((track, visibleIdx) => {
        const instIdx = track.instrumentIdx;
        const inst = instrumentsConfig[instIdx];
        
        if (instrumentTotals[instIdx] > 1) {
          instrumentIndexes[instIdx] = (instrumentIndexes[instIdx] || 0) + 1;
        }

        if (!inst || track.isHidden || inst.id === 'apito') return;

        const isMutedOut = getEffectiveMuteState(props.tracks !== undefined ? rawTracks : stateRef.current.rawTracks, track.id);
        if (isMutedOut) return;

        const activePatternId = getLiveActivePatternId(track);
        if (activePatternId === null) return;
        let activePattern: Pattern | null | undefined = null;
        let ownerTrack = track;

        const isToada = isToadaBus(track);
        if (isToada) {
          const pux = (props.tracks !== undefined ? rawTracks : stateRef.current.rawTracks).find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
          const coro = (props.tracks !== undefined ? rawTracks : stateRef.current.rawTracks).find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
          
          if (pux) {
            activePattern = pux.patterns.find(p => p.id === activePatternId);
            if (activePattern) ownerTrack = pux;
          }
          if (!activePattern && coro) {
            activePattern = coro.patterns.find(p => p.id === activePatternId);
            if (activePattern) ownerTrack = coro;
          }
        } else {
          for (let i = 0; i < track.patterns.length; i++) {
            if (track.patterns[i].id === activePatternId) {
              activePattern = track.patterns[i];
              break;
            }
          }
        }

        if (!activePattern) return;
        
        const currentInst = instrumentsConfig[ownerTrack.instrumentIdx] || inst;
        const currentInstIdx = ownerTrack.instrumentIdx;
        
         const activePlayingSteps = (props.tracks === undefined && sequencer.activeVariationsRef?.current)
          ? (sequencer.activeVariationsRef.current[track.id] || activePattern.activeSteps)
          : activePattern.activeSteps;
        let hasAnyNotes = false;
        for (let sIdx = 0; sIdx < activePlayingSteps.length; sIdx++) {
          if (activePlayingSteps[sIdx] !== 0) {
            hasAnyNotes = true;
            break;
          }
        }
        const isActiveState = hasAnyNotes;

        const busColor = track.isLinkFolder ? getBusColor(String(track.id), localRawTracks, instrumentsConfig) : null;

        ctx.save();
        ctx.globalAlpha = isActiveState ? 1.0 : 0.25;

        // Standard dashed track line
        ctx.beginPath();
        const tRad = getTrackRadius(visibleIdx, activeVisibleTracks.length);
        ctx.arc(centerX, centerY, tRad, 0, Math.PI * 2);
        ctx.strokeStyle = busColor || themeBorder;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        if (!track.isSolo) {
          ctx.save();
          ctx.globalAlpha = ctx.globalAlpha * 0.2;
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.stroke();
        }
        ctx.setLineDash([]);

        const live = livePlaybackRef.current;
        const stateVal = stateRef.current;
        const measureIdx = (live && live.step >= 0) ? live.measure : (pendingTargetMeasureRef.current !== null ? pendingTargetMeasureRef.current : stateVal.currentMeasure);
        const activeTimeSig = stateVal.measureTimeSigs ? (stateVal.measureTimeSigs[measureIdx] || stateVal.timeSig || '4/4') : (stateVal.timeSig || '4/4');
        const activeBeats = parseInt(activeTimeSig.split('/')[0], 10) || 4;

        const currentStep = (localStep >= 0) ? Math.floor((localStep / localTicks) * activePattern.steps) : -1;
        const stepCount = activePattern.steps;
        const stepAngles: number[] = [];
        
        const beatRes = activePattern.beatResolutions || Array(activeBeats).fill(4);
        const anglePerBeat = (Math.PI * 2) / activeBeats;
        
        for (let b = 0; b < activeBeats; b++) {
          const res = beatRes[b] || 4;
          const anglePerStep = anglePerBeat / res;
          const beatStartAngle = -Math.PI / 2 + (b * anglePerBeat);
          for (let s = 0; s < res; s++) {
            stepAngles.push(beatStartAngle + s * anglePerStep);
          }
        }

        const effectiveStepCount = stepAngles.length;

        // ── VOIX : TRAÎNÉE DE GOUACHE (PUXADOR / CORO) & PASTILLES ÉPURÉES ──
        const isVoiceTrack = isToada || currentInst.type === 'voice';

        if (isVoiceTrack) {
          const currentRawTracks = props.tracks !== undefined ? rawTracks : stateRef.current.rawTracks;
          const soloPlayId = stateVal.soloPatternPlayId;

          // Helper pour résoudre le motif d'une mesure (en tenant compte des overrides de motif)
          const resolvePatternForMeasure = (tObj: TrackGroup | undefined, mIdx: number, sPlayId: number | null | undefined): Pattern | null => {
            if (!tObj) return null;
            if (sPlayId !== undefined && sPlayId !== null) {
              return tObj.patterns.find(p => p.id === sPlayId) || null;
            }
            const overrideId = tObj.patternOverrides?.[mIdx];
            if (overrideId !== undefined) {
              return overrideId !== null ? (tObj.patterns.find(p => p.id === overrideId) || null) : null;
            }
            return tObj.patterns.find(p => p.measureAssignments[mIdx]) || null;
          };

          // 1. Résolution des motifs vocaux Puxador et Coro
          let puxPattern: Pattern | null = null;
          let coroPattern: Pattern | null = null;
          let puxTrackObj: TrackGroup | undefined;
          let coroTrackObj: TrackGroup | undefined;

          if (isToada) {
            puxTrackObj = currentRawTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
            coroTrackObj = currentRawTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');

            puxPattern = resolvePatternForMeasure(puxTrackObj, measureIdx, soloPlayId);
            coroPattern = resolvePatternForMeasure(coroTrackObj, measureIdx, soloPlayId);

            // Repli sur le motif actif si aucun enfant n'a d'assignation directe
            if (!puxPattern && !coroPattern && activePattern) {
              if (currentInst.id === 'coro') {
                coroPattern = activePattern;
              } else {
                puxPattern = activePattern;
              }
            }
          } else {
            if (currentInst.id === 'coro') {
              coroPattern = activePattern;
              coroTrackObj = track;
              puxTrackObj = currentRawTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
              puxPattern = resolvePatternForMeasure(puxTrackObj, measureIdx, soloPlayId);
            } else if (currentInst.id === 'puxador') {
              puxPattern = activePattern;
              puxTrackObj = track;
              coroTrackObj = currentRawTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
              coroPattern = resolvePatternForMeasure(coroTrackObj, measureIdx, soloPlayId);
            } else {
              puxPattern = activePattern;
              puxTrackObj = track;
            }
          }

          if (!puxTrackObj) {
            puxTrackObj = currentRawTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
          }
          if (!coroTrackObj) {
            coroTrackObj = currentRawTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
          }

          // Détection cyclique du motif de la mesure suivante pour anticipation de l'anacrouse sur la Roda
          const totalM = stateVal.totalMeasures || currentRawTracks[0]?.patterns[0]?.measureAssignments?.length || 1;
          const isLoopActive = Boolean(stateVal.isLoopRegionActive);
          const loopStart = stateVal.loopStartMeasure;
          const loopEnd = stateVal.loopEndMeasure;

          let nextMeasureIdx: number;
          if (isLoopActive && loopEnd !== null && loopEnd !== undefined && measureIdx === loopEnd) {
            nextMeasureIdx = (loopStart !== null && loopStart !== undefined) ? loopStart : 0;
          } else {
            nextMeasureIdx = (measureIdx + 1) % totalM;
          }

          const nextPuxPattern = resolvePatternForMeasure(puxTrackObj, nextMeasureIdx, soloPlayId);
          const nextCoroPattern = resolvePatternForMeasure(coroTrackObj, nextMeasureIdx, soloPlayId);

          // 2. Extraction des pas par voix (Puxador et Coro) avec support complet de l'anacrouse
          const puxSteps: Array<{ active: boolean; note: string; syl: string; isProlongation: boolean; isAnacrusis: boolean }> = [];
          const coroSteps: Array<{ active: boolean; note: string; syl: string; isProlongation: boolean; isAnacrusis: boolean }> = [];

          const hasSeparateVoiceTracks = Boolean(puxTrackObj || coroTrackObj);
          const puxPlayingSteps = (props.tracks === undefined && sequencer.activeVariationsRef?.current && puxTrackObj)
            ? (sequencer.activeVariationsRef.current[puxTrackObj.id] || puxPattern?.activeSteps)
            : puxPattern?.activeSteps;
          const coroPlayingSteps = (props.tracks === undefined && sequencer.activeVariationsRef?.current && coroTrackObj)
            ? (sequencer.activeVariationsRef.current[coroTrackObj.id] || coroPattern?.activeSteps)
            : coroPattern?.activeSteps;

          const isStepValActive = (val: any) => val !== 0 && val !== '0' && val !== '' && val !== undefined && val !== null && val !== '-';

          for (let i = 0; i < effectiveStepCount; i++) {
            let pActive = false;
            let pNote = '';
            let pSyl = '';
            let pAnacrusis = false;

            let cActive = false;
            let cNote = '';
            let cSyl = '';
            let cAnacrusis = false;

            if (hasSeparateVoiceTracks) {
              // Voix Puxador (mesure courante)
              if (puxPattern && puxPlayingSteps) {
                const sVal = puxPlayingSteps[i];
                if (isStepValActive(sVal)) {
                  pActive = true;
                  pNote = (puxPattern.notes?.[i] || '').trim();
                  pSyl = (puxPattern.lyrics?.[i] || '').trim();
                }
              }

              // Voix Coro (mesure courante)
              if (coroPattern && coroPlayingSteps) {
                const sVal = coroPlayingSteps[i];
                if (isStepValActive(sVal)) {
                  cActive = true;
                  cNote = (coroPattern.notes?.[i] || '').trim();
                  cSyl = (coroPattern.lyrics?.[i] || '').trim();
                }
              }

              // Anacrouse locale en Solo
              if (soloPlayId !== undefined && soloPlayId !== null) {
                if (!pActive) {
                  const preVal = puxPattern?.preRollActiveSteps?.[i];
                  if (isStepValActive(preVal)) {
                    pActive = true;
                    pNote = (puxPattern?.preRollNotes?.[i] || '').trim();
                    pSyl = (puxPattern?.preRollLyrics?.[i] || '').trim();
                    pAnacrusis = true;
                  }
                }
                if (!cActive) {
                  const preVal = coroPattern?.preRollActiveSteps?.[i];
                  if (isStepValActive(preVal)) {
                    cActive = true;
                    cNote = (coroPattern?.preRollNotes?.[i] || '').trim();
                    cSyl = (coroPattern?.preRollLyrics?.[i] || '').trim();
                    cAnacrusis = true;
                  }
                }
              } else {
                // Anacrouse entrante de la mesure suivante (Timeline / Boucle)
                // Projection sur les pas 12 à 15 si le pas est libre de notes (!pActive && !cActive)
                const isPickupWindow = i >= effectiveStepCount - 4;
                if (isPickupWindow && !pActive && !cActive) {
                  const nextPuxPre = nextPuxPattern?.preRollActiveSteps?.[i];
                  if (isStepValActive(nextPuxPre)) {
                    pActive = true;
                    pNote = (nextPuxPattern?.preRollNotes?.[i] || '').trim();
                    pSyl = (nextPuxPattern?.preRollLyrics?.[i] || '').trim();
                    pAnacrusis = true;
                  }

                  const nextCoroPre = nextCoroPattern?.preRollActiveSteps?.[i];
                  if (isStepValActive(nextCoroPre)) {
                    cActive = true;
                    cNote = (nextCoroPattern?.preRollNotes?.[i] || '').trim();
                    cSyl = (nextCoroPattern?.preRollLyrics?.[i] || '').trim();
                    cAnacrusis = true;
                  }
                }
              }
            } else {
              // Piste vocale unifiée (legacy)
              const basePat = puxPattern || coroPattern || activePattern;
              const nextBasePat = nextPuxPattern || nextCoroPattern;
              const sVal = activePlayingSteps[i];
              const sStr = String(Array.isArray(sVal) ? sVal[0] : sVal).toUpperCase();
              const isRawActive = isStepValActive(sVal);

              if (isRawActive) {
                const noteVal = (basePat?.notes?.[i] || '').trim();
                const sylVal = (basePat?.lyrics?.[i] || '').trim();
                const isCoroStep = sStr === 'C' || (currentInst.id === 'coro' && sStr !== 'P');

                if (isCoroStep) {
                  cActive = true;
                  cNote = noteVal;
                  cSyl = sylVal;
                } else {
                  pActive = true;
                  pNote = noteVal;
                  pSyl = sylVal;
                }
              } else {
                const isPickupWindow = i >= effectiveStepCount - 4;
                const preVal = basePat?.preRollActiveSteps?.[i];
                const isPreActive = isStepValActive(preVal);
                const nextPreVal = (soloPlayId === undefined || soloPlayId === null && isPickupWindow) ? nextBasePat?.preRollActiveSteps?.[i] : 0;
                const isNextPreActive = isStepValActive(nextPreVal);

                const targetPat = isPreActive ? basePat : (isNextPreActive ? nextBasePat : null);
                const activeVal = isPreActive ? preVal : (isNextPreActive ? nextPreVal : null);

                if (targetPat && activeVal) {
                  const noteVal = (targetPat.preRollNotes?.[i] || '').trim();
                  const sylVal = (targetPat.preRollLyrics?.[i] || '').trim();
                  const preStr = String(activeVal).toUpperCase();
                  const isCoroStep = preStr === 'C' || (currentInst.id === 'coro' && preStr !== 'P');

                  if (isCoroStep) {
                    cActive = true;
                    cNote = noteVal;
                    cSyl = sylVal;
                    cAnacrusis = true;
                  } else {
                    pActive = true;
                    pNote = noteVal;
                    pSyl = sylVal;
                    pAnacrusis = true;
                  }
                }
              }
            }

            const prevPActive = i > 0 && puxSteps[i - 1].active;
            const prevPNote = i > 0 ? puxSteps[i - 1].note : '';
            const isPProlongation = i > 0 && pActive && prevPActive &&
              (pNote !== '' && prevPNote !== '' ? pNote === prevPNote : true) &&
              (!pSyl || pSyl === '');

            puxSteps.push({ active: pActive, note: pNote, syl: pSyl, isProlongation: isPProlongation, isAnacrusis: pAnacrusis });

            const prevCActive = i > 0 && coroSteps[i - 1].active;
            const prevCNote = i > 0 ? coroSteps[i - 1].note : '';
            const isCProlongation = i > 0 && cActive && prevCActive &&
              (cNote !== '' && prevCNote !== '' ? cNote === prevCNote : true) &&
              (!cSyl || cSyl === '');

            coroSteps.push({ active: cActive, note: cNote, syl: cSyl, isProlongation: isCProlongation, isAnacrusis: cAnacrusis });
          }

          // 3. Calcul des blocs liés (attaque initiale + prolongations tenues)
          const getStepSpan = (sIdx: number) => {
            if (sIdx < effectiveStepCount - 1) {
              return stepAngles[sIdx + 1] - stepAngles[sIdx];
            }
            return (-Math.PI / 2 + Math.PI * 2) - stepAngles[sIdx];
          };

          // Blocs Puxador
          const puxBlocks: Array<{ startIndex: number; endIndex: number; isAnacrusis: boolean }> = [];
          let curPBlock: { startIndex: number; endIndex: number; isAnacrusis: boolean } | null = null;
          for (let i = 0; i < effectiveStepCount; i++) {
            if (puxSteps[i].active) {
              if (puxSteps[i].isProlongation && curPBlock) {
                curPBlock.endIndex = i;
              } else {
                if (curPBlock) puxBlocks.push(curPBlock);
                curPBlock = { startIndex: i, endIndex: i, isAnacrusis: puxSteps[i].isAnacrusis };
              }
            } else {
              if (curPBlock) {
                puxBlocks.push(curPBlock);
                curPBlock = null;
              }
            }
          }
          if (curPBlock) puxBlocks.push(curPBlock);

          // Raccord de boucle 15 -> 0 pour Puxador
          if (puxBlocks.length > 1 && puxBlocks[0].startIndex === 0 && puxBlocks[puxBlocks.length - 1].endIndex === effectiveStepCount - 1) {
            const step0 = puxSteps[0];
            const stepLast = puxSteps[effectiveStepCount - 1];
            if (step0.active && stepLast.active && (!step0.syl || step0.syl === '') && (step0.note !== '' && stepLast.note !== '' ? step0.note === stepLast.note : true)) {
              puxBlocks[puxBlocks.length - 1].endIndex = effectiveStepCount - 1 + puxBlocks[0].endIndex + 1;
              puxBlocks.shift();
            }
          }

          // Blocs Coro
          const coroBlocks: Array<{ startIndex: number; endIndex: number; isAnacrusis: boolean }> = [];
          let curCBlock: { startIndex: number; endIndex: number; isAnacrusis: boolean } | null = null;
          for (let i = 0; i < effectiveStepCount; i++) {
            if (coroSteps[i].active) {
              if (coroSteps[i].isProlongation && curCBlock) {
                curCBlock.endIndex = i;
              } else {
                if (curCBlock) coroBlocks.push(curCBlock);
                curCBlock = { startIndex: i, endIndex: i, isAnacrusis: coroSteps[i].isAnacrusis };
              }
            } else {
              if (curCBlock) {
                coroBlocks.push(curCBlock);
                curCBlock = null;
              }
            }
          }
          if (curCBlock) coroBlocks.push(curCBlock);

          // Raccord de boucle 15 -> 0 pour Coro
          if (coroBlocks.length > 1 && coroBlocks[0].startIndex === 0 && coroBlocks[coroBlocks.length - 1].endIndex === effectiveStepCount - 1) {
            const step0 = coroSteps[0];
            const stepLast = coroSteps[effectiveStepCount - 1];
            if (step0.active && stepLast.active && (!step0.syl || step0.syl === '') && (step0.note !== '' && stepLast.note !== '' ? step0.note === stepLast.note : true)) {
              coroBlocks[coroBlocks.length - 1].endIndex = effectiveStepCount - 1 + coroBlocks[0].endIndex + 1;
              coroBlocks.shift();
            }
          }

          // 4. Tracé Polyphonique par Calques Stricts :
          //    Calque A : Traînées de gouache Puxador (#c25e38 terracotta)
          puxBlocks.forEach(b => {
            const thetaStart = stepAngles[b.startIndex];
            const isWrapped = b.endIndex >= effectiveStepCount;
            const normEnd = isWrapped ? (b.endIndex % effectiveStepCount) : b.endIndex;
            const span = getStepSpan(normEnd);
            const baseEnd = isWrapped ? (stepAngles[normEnd] + Math.PI * 2) : stepAngles[normEnd];
            const thetaEnd = baseEnd + span * 0.88;
            const thetaFilEnd = baseEnd + span * 0.75;
            const ribbonColor = b.isAnacrusis ? 'rgba(194, 94, 56, 0.72)' : '#c25e38';
            drawGouacheRibbon(ctx, centerX, centerY, tRad, thetaStart, thetaEnd, thetaFilEnd, ribbonColor, dynamicScale);
          });

          //    Calque B : Traînées de gouache Coro (#2a9d8f ciano / bleu lagon)
          coroBlocks.forEach(b => {
            const thetaStart = stepAngles[b.startIndex];
            const isWrapped = b.endIndex >= effectiveStepCount;
            const normEnd = isWrapped ? (b.endIndex % effectiveStepCount) : b.endIndex;
            const span = getStepSpan(normEnd);
            const baseEnd = isWrapped ? (stepAngles[normEnd] + Math.PI * 2) : stepAngles[normEnd];
            const thetaEnd = baseEnd + span * 0.88;
            const thetaFilEnd = baseEnd + span * 0.75;
            const ribbonColor = b.isAnacrusis ? 'rgba(42, 157, 143, 0.72)' : '#2a9d8f';
            drawGouacheRibbon(ctx, centerX, centerY, tRad, thetaStart, thetaEnd, thetaFilEnd, ribbonColor, dynamicScale);
          });

          //    Calque C : Pastilles circulaires de frappe au premier plan (uniquement attaques avec syllabes ou notes)
          ctx.setLineDash([]);
          ctx.globalAlpha = 1.0;
          const voicePastilleRadius = 22 * dynamicScale;

          for (let i = 0; i < effectiveStepCount; i++) {
            const stepAngle = stepAngles[i];
            const x = centerX + Math.cos(stepAngle) * tRad;
            const y = centerY + Math.sin(stepAngle) * tRad;

            const pStep = puxSteps[i];
            const cStep = coroSteps[i];

            const showPux = pStep.active && !pStep.isProlongation;
            const showCoro = cStep.active && !cStep.isProlongation;

            if (!showPux && !showCoro) {
              // Prolongation sans syllabe ou silence : aucune pastille dessinée (ruban libéré)
              continue;
            }

            // Décoration Playhead au pas courant avec mise en valeur dorée sous l'aiguille
            if (!isEco && i === currentStep) {
              ctx.beginPath();
              ctx.arc(x, y, voicePastilleRadius + 5, 0, Math.PI * 2);
              ctx.strokeStyle = (pStep.isAnacrusis || cStep.isAnacrusis) ? '#f59e0b' : themeWood;
              ctx.lineWidth = (pStep.isAnacrusis || cStep.isAnacrusis) ? 3.0 : 2.5;
              ctx.stroke();
            }

            if (showPux && showCoro) {
              // Superposition simultanée : Pastille bicolore séparée
              ctx.beginPath();
              ctx.arc(x, y, voicePastilleRadius, Math.PI * 0.5, Math.PI * 1.5, false);
              ctx.closePath();
              ctx.fillStyle = pStep.isAnacrusis ? 'rgba(194, 94, 56, 0.85)' : '#c25e38';
              ctx.fill();

              ctx.beginPath();
              ctx.arc(x, y, voicePastilleRadius, Math.PI * 1.5, Math.PI * 0.5, false);
              ctx.closePath();
              ctx.fillStyle = cStep.isAnacrusis ? 'rgba(42, 157, 143, 0.85)' : '#2a9d8f';
              ctx.fill();

              ctx.beginPath();
              ctx.moveTo(x, y - voicePastilleRadius);
              ctx.lineTo(x, y + voicePastilleRadius);
              ctx.strokeStyle = themeBorder;
              ctx.lineWidth = 1.2;
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(x, y, voicePastilleRadius, 0, Math.PI * 2);
              if (pStep.isAnacrusis || cStep.isAnacrusis) {
                ctx.setLineDash([4, 2.5]);
              }
              ctx.strokeStyle = (pStep.isAnacrusis || cStep.isAnacrusis) ? '#f4ecd8' : themeBorder;
              ctx.lineWidth = 2.0;
              ctx.stroke();
              ctx.setLineDash([]); // Restauration immédiate obligatoire
              ctx.globalAlpha = 1.0;

              let pText = pStep.syl || (pStep.note ? pStep.note : 'P');
              if (pText.endsWith('-')) pText = pText.slice(0, -1);
              let cText = cStep.syl || (cStep.note ? cStep.note : 'C');
              if (cText.endsWith('-')) cText = cText.slice(0, -1);

              const fontSize = Math.max(8, Math.floor((Math.max(pText.length, cText.length) > 2 ? 10 : 13) * dynamicScale * 0.9));
              ctx.font = `900 ${fontSize}px "Outfit", "Inter", sans-serif`;
              ctx.fillStyle = '#ffffff';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              if (pText && pText !== '-') ctx.fillText(pText, x - voicePastilleRadius * 0.45, y + 1.5);
              if (cText && cText !== '-') ctx.fillText(cText, x + voicePastilleRadius * 0.45, y + 1.5);
            } else if (showPux) {
              // Pastille Puxador pleine (terracotta #c25e38)
              ctx.beginPath();
              ctx.arc(x, y, voicePastilleRadius, 0, Math.PI * 2);
              ctx.fillStyle = pStep.isAnacrusis ? 'rgba(194, 94, 56, 0.88)' : '#c25e38';
              ctx.fill();

              if (pStep.isAnacrusis) {
                ctx.setLineDash([4, 2.5]);
                ctx.strokeStyle = '#f4ecd8';
                ctx.lineWidth = 2.2;
              } else {
                ctx.strokeStyle = '#e9cca8';
                ctx.lineWidth = 2.0;
              }
              ctx.stroke();
              ctx.setLineDash([]); // Restauration immédiate obligatoire
              ctx.globalAlpha = 1.0;

              let text = pStep.syl || (pStep.note ? pStep.note : 'P');
              if (text.endsWith('-')) text = text.slice(0, -1);

              if (text && text !== '-') {
                const fontSize = Math.max(10, Math.floor((text.length > 2 ? 13 : 16) * dynamicScale * 0.9));
                ctx.font = `900 ${fontSize}px "Outfit", "Inter", sans-serif`;
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, x, y + 1.5);
              }
            } else if (showCoro) {
              // Pastille Coro pleine (bleu lagon #2a9d8f)
              ctx.beginPath();
              ctx.arc(x, y, voicePastilleRadius, 0, Math.PI * 2);
              ctx.fillStyle = cStep.isAnacrusis ? 'rgba(42, 157, 143, 0.88)' : '#2a9d8f';
              ctx.fill();

              if (cStep.isAnacrusis) {
                ctx.setLineDash([4, 2.5]);
                ctx.strokeStyle = '#f4ecd8';
                ctx.lineWidth = 2.2;
              } else {
                ctx.strokeStyle = '#b3dcd8';
                ctx.lineWidth = 2.0;
              }
              ctx.stroke();
              ctx.setLineDash([]); // Restauration immédiate obligatoire
              ctx.globalAlpha = 1.0;

              let text = cStep.syl || (cStep.note ? cStep.note : 'C');
              if (text.endsWith('-')) text = text.slice(0, -1);

              if (text && text !== '-') {
                const fontSize = Math.max(10, Math.floor((text.length > 2 ? 13 : 16) * dynamicScale * 0.9));
                ctx.font = `900 ${fontSize}px "Outfit", "Inter", sans-serif`;
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, x, y + 1.5);
              }
            }
          }
          // Overlay du nom de piste sur le pas 0
          if (!isEco) {
            const x0 = centerX + Math.cos(stepAngles[0]) * tRad;
            const y0 = centerY + Math.sin(stepAngles[0]) * tRad;
            ctx.save();
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = themeText;
            ctx.font = 'bold 10px serif';
            ctx.textAlign = 'left';
            const labelText = track.customName || currentInst.name || (isToada ? 'Toada' : 'Voix');
            ctx.fillText(labelText, x0 + 20, y0 + 3);
            ctx.restore();
          }

          ctx.setLineDash([]);
          ctx.globalAlpha = 1.0;
          ctx.restore();
          return;
        }

        for (let i = 0; i < effectiveStepCount; i++) {
          const stepAngle = stepAngles[i];
          const x = centerX + Math.cos(stepAngle) * tRad;
          const y = centerY + Math.sin(stepAngle) * tRad;

          let satellitesToDraw: Array<{
            color: string;
            text: string;
            isDark: boolean;
            childInstId: string;
            childState: string | number | [string, string];
          }> = [];

          if (track.isLinkFolder) {
            const children = (props.tracks !== undefined ? rawTracks : stateRef.current.rawTracks).filter((t: any) => 
              String(t.linkedToTrackId) === String(track.id) && 
              !t.isBusFolder &&
              !t.isLinkMaster
            );
            
            children.forEach((c: any) => {
              const override = c.patternOverrides?.[measureIdx];
              if (override !== undefined) {
                if (override !== null) {
                  const childPattern = track.patterns.find((p: any) => p.id === override);
                  if (childPattern) {
                    const childActivePlayingSteps = (props.tracks === undefined && sequencer.activeVariationsRef?.current)
                      ? (sequencer.activeVariationsRef.current[c.id] || childPattern.activeSteps)
                      : childPattern.activeSteps;
                    const childState = childActivePlayingSteps[i] || 0;
                    if (childState !== 0 && childState !== '') {
                      const childInst = instrumentsConfig[c.instrumentIdx];
                      if (childInst) {
                        const childVisualState = getVisualStrokeSymbol(childState, localLeftHanded || false, childInst.id);
                        if (childVisualState !== 0) {
                          const primaryChildVisual = Array.isArray(childVisualState) ? childVisualState[0] : childVisualState;
                          const childColor = (childInst.colors && childInst.colors[primaryChildVisual as string]) || childInst.color || '#fff';
                          const childText = String(primaryChildVisual);
                          satellitesToDraw.push({
                            color: childColor,
                            text: childText,
                            isDark: isDarkText(childInst.id, String(Array.isArray(childState) ? childState[0] : childState)),
                            childInstId: childInst.id,
                            childState: childState
                          });
                        }
                      }
                    }
                  }
                }
              }
            });
          }
          // ── RÉSOLUTION DES ÉVÉNEMENTS MASTER ET VARIATIONS ──
          const rawMasterState = activePlayingSteps[i];
          const isRas = Array.isArray(rawMasterState) && rawMasterState.length === 2;
          const masterState = isRas ? rawMasterState[0] : rawMasterState;
          const hasMasterEvent = masterState !== 0 && masterState !== '0' && masterState !== '' && masterState !== undefined && masterState !== null;
          const hasVariationEvent = satellitesToDraw.length > 0;

          if (!hasMasterEvent && !hasVariationEvent) {
            continue; // Pas d'événement au pas i
          }

          // 1. Résoudre les détails du Master
          let masterText = '';
          let masterFillColor = 'rgba(255,255,255,0.2)';
          let masterTxtColor = '#f4ecd8';
          let masterIsAccent = false;
          let masterRadiusSize = 6 * dynamicScale;

          if (hasMasterEvent) {
            const visualState = getVisualStrokeSymbol(masterState, localLeftHanded || false, currentInst.id);
            const visualStateStr = String(visualState);
            if (visualState !== 0 && visualState !== '0') {
              masterRadiusSize = 13 * dynamicScale;
              if (currentInst.type === 'voice') {
                masterRadiusSize = 22 * dynamicScale;
                masterFillColor = (track.isLinkFolder
                  ? getBusNoteColor(String(track.id), String(visualState), localRawTracks, instrumentsConfig)
                  : currentInst.color) || '#f4ecd8';
                let syl = activePattern.lyrics[i] || activePattern.preRollLyrics?.[i] || String(visualState);
                if (syl === '-') {
                  masterText = '-';
                  masterFillColor = '#ab5318'; // orange pour le silence
                  masterTxtColor = '#1a1a1a';
                } else {
                  masterText = String(syl).endsWith('-') ? String(syl).slice(0, -1) : String(syl);
                  masterTxtColor = '#000000';
                }
              } else {
                const stateStr = String(visualState);
                const primaryVisual = Array.isArray(visualState) ? visualState[0] : visualState;
                masterFillColor = track.isLinkFolder 
                  ? getBusNoteColor(String(track.id), String(primaryVisual), localRawTracks, instrumentsConfig)
                  : ((currentInst.colors && currentInst.colors[primaryVisual as string]) ? currentInst.colors[primaryVisual as string] : '#fff');
                masterIsAccent = (stateStr === stateStr.toUpperCase());
                masterRadiusSize = (masterIsAccent ? 15 : 12) * dynamicScale;

                masterText = stateStr;
                if (currentInst.id === 'mineiro') {
                  if (stateStr.toLowerCase() === 'p') masterText = '↑';
                  else if (stateStr.toLowerCase() === 't') masterText = '↓';
                } else if (currentInst.id === 'agbe') {
                  if (stateStr.toLowerCase() === 'e') masterText = '←';
                  else if (stateStr.toLowerCase() === 'd') masterText = '→';
                  else if (stateStr.toLowerCase() === 's') masterText = '↑';
                  else if (stateStr.toLowerCase() === 'v') masterText = '↓';
                }
                
                masterTxtColor = isDarkText(currentInst.id, String(masterState)) ? '#1a1a1a' : '#f4ecd8';
              }
            } else if (visualStateStr === '0' || visualStateStr === '-') {
              masterRadiusSize = (currentInst.type === 'voice' ? 22 : 12) * dynamicScale;
              masterFillColor = '#ab5318'; // orange pour le silence
              masterText = '-';
              masterTxtColor = '#1a1a1a';
            }
          }

          // 2. Décider de la forme du pas (Complet, Divisé ou Demi-cercle droit seul)
          let isSplit = false;
          let isRightHalfOnly = false;
          let leftText = '';
          let leftFillColor = 'rgba(255,255,255,0.2)';
          let leftTxtColor = '#f4ecd8';
          let leftIsAccent = false;

          let rightText = '';
          let rightFillColor = '';
          let rightTxtColor = '#f4ecd8';

          let radiusSize = 6 * dynamicScale;

          if (hasMasterEvent && hasVariationEvent) {
            // Master + Variation
            isSplit = true;
            leftText = masterText;
            leftFillColor = masterFillColor;
            leftTxtColor = masterTxtColor;
            leftIsAccent = masterIsAccent;

            const rightSat = satellitesToDraw[0];
            rightText = rightSat.text;
            rightFillColor = rightSat.color;
            rightTxtColor = rightSat.isDark ? '#1a1a1a' : '#f4ecd8';

            radiusSize = (currentInst.type === 'voice' ? 22 : (leftIsAccent ? 15 : 12)) * dynamicScale;
          } else if (!hasMasterEvent && satellitesToDraw.length >= 2) {
            // Deux variations ou plus sans Master (on utilise la première et la deuxième)
            isSplit = true;
            const leftSat = satellitesToDraw[0];
            leftText = leftSat.text;
            leftFillColor = leftSat.color;
            leftTxtColor = leftSat.isDark ? '#1a1a1a' : '#f4ecd8';
            leftIsAccent = false;

            const rightSat = satellitesToDraw[1];
            rightText = rightSat.text;
            rightFillColor = rightSat.color;
            rightTxtColor = rightSat.isDark ? '#1a1a1a' : '#f4ecd8';

            radiusSize = (currentInst.type === 'voice' ? 22 : 12) * dynamicScale;
          } else if (!hasMasterEvent && satellitesToDraw.length === 1) {
            // Une seule Variation sans Master (Demi-cercle droit uniquement)
            isRightHalfOnly = true;
            const singleSat = satellitesToDraw[0];
            rightText = singleSat.text;
            rightFillColor = singleSat.color;
            rightTxtColor = singleSat.isDark ? '#1a1a1a' : '#f4ecd8';

            radiusSize = (currentInst.type === 'voice' ? 22 : 12) * dynamicScale;
          } else {
            // Master uniquement (Cercle Complet)
            isSplit = false;
            leftText = masterText;
            leftFillColor = masterFillColor;
            leftTxtColor = masterTxtColor;
            leftIsAccent = masterIsAccent;
            radiusSize = masterRadiusSize;
          }

          // 3. Calculer la couleur de la bordure active
          let strokeColor = themeBorder;
          let strokeWidth = 2.0;
          if (hasMasterEvent) {
            const visualState = getVisualStrokeSymbol(masterState, localLeftHanded || false, currentInst.id);
            strokeColor = track.isLinkFolder 
              ? getBusNoteColor(String(track.id), String(visualState), localRawTracks, instrumentsConfig)
              : ((currentInst && currentInst.color) ? currentInst.color : themeBorder);
            strokeWidth = 2.5;
          } else if (hasVariationEvent) {
            strokeColor = themeBorder;
            strokeWidth = 2.5;
          }

          // Highlight playhead match step
          if (!isEco && i === currentStep) {
            ctx.beginPath();
            ctx.arc(x, y, radiusSize + 5, 0, Math.PI * 2);
            ctx.strokeStyle = themeWood;
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }

          // Accent ring decoration
          if (leftIsAccent) {
            ctx.beginPath();
            ctx.arc(x, y, radiusSize + 4, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // 4. Rendu graphique Canvas (Complet, Divisé ou Demi-cercle droit seul)
          if (isRightHalfOnly) {
            // Remplissage Moitié Droite uniquement
            ctx.beginPath();
            ctx.arc(x, y, radiusSize, Math.PI * 1.5, Math.PI * 0.5, false);
            ctx.closePath();
            ctx.fillStyle = rightFillColor;
            ctx.fill();

            // Bordure du demi-cercle fermé
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();

            // Dessin de la lettre décalée à droite
            if (rightText) {
              const rightFontSize = Math.max(8, Math.floor((rightText.length > 1 ? 11 : 15) * dynamicScale * 0.9));
              ctx.font = `900 ${rightFontSize}px "Outfit", "Inter", sans-serif`;
              ctx.fillStyle = rightTxtColor;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const textX = x + radiusSize * 0.4;
              const textY = y + 2;

              if (['↑', '↓', '←', '→'].includes(rightText)) {
                ctx.save();
                ctx.strokeStyle = rightTxtColor;
                ctx.lineWidth = 2.0;
                ctx.strokeText(rightText, textX, textY);
                ctx.restore();
              }
              ctx.fillText(rightText, textX, textY);
            }
          } else if (isSplit) {
            // Remplissage Moitié Gauche
            ctx.beginPath();
            ctx.arc(x, y, radiusSize, Math.PI * 0.5, Math.PI * 1.5, false);
            ctx.closePath();
            ctx.fillStyle = leftFillColor;
            ctx.fill();

            // Remplissage Moitié Droite
            ctx.beginPath();
            ctx.arc(x, y, radiusSize, Math.PI * 1.5, Math.PI * 0.5, false);
            ctx.closePath();
            ctx.fillStyle = rightFillColor;
            ctx.fill();

            // Ligne verticale médiane de séparation
            ctx.beginPath();
            ctx.moveTo(x, y - radiusSize);
            ctx.lineTo(x, y + radiusSize);
            ctx.strokeStyle = themeBorder;
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Bordure extérieure
            ctx.beginPath();
            ctx.arc(x, y, radiusSize, 0, Math.PI * 2);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();

            // Dessin des lettres décalées
            if (leftText) {
              const leftFontSize = Math.max(8, Math.floor((leftText.length > 1 ? 11 : 15) * dynamicScale * 0.9));
              ctx.font = `900 ${leftFontSize}px "Outfit", "Inter", sans-serif`;
              ctx.fillStyle = leftTxtColor;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const textX = x - radiusSize * 0.4;
              const textY = y + 2;

              if (['↑', '↓', '←', '→'].includes(leftText)) {
                ctx.save();
                ctx.strokeStyle = leftTxtColor;
                ctx.lineWidth = 2.0;
                ctx.strokeText(leftText, textX, textY);
                ctx.restore();
              }
              ctx.fillText(leftText, textX, textY);
            }

            if (rightText) {
              const rightFontSize = Math.max(8, Math.floor((rightText.length > 1 ? 11 : 15) * dynamicScale * 0.9));
              ctx.font = `900 ${rightFontSize}px "Outfit", "Inter", sans-serif`;
              ctx.fillStyle = rightTxtColor;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const textX = x + radiusSize * 0.4;
              const textY = y + 2;

              if (['↑', '↓', '←', '→'].includes(rightText)) {
                ctx.save();
                ctx.strokeStyle = rightTxtColor;
                ctx.lineWidth = 2.0;
                ctx.strokeText(rightText, textX, textY);
                ctx.restore();
              }
              ctx.fillText(rightText, textX, textY);
            }
          } else {
            // Rendu Complet Traditionnel
            ctx.beginPath();
            ctx.arc(x, y, radiusSize, 0, Math.PI * 2);
            ctx.fillStyle = leftFillColor;
            ctx.fill();

            // Bordure
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();

            // Dessin du texte au centre
            if (leftText) {
              const fontSize = Math.max(10, Math.floor((leftText.length > 1 ? 15 : 20) * dynamicScale * 0.9));
              ctx.font = `900 ${fontSize}px "Outfit", "Inter", sans-serif`;
              ctx.fillStyle = leftTxtColor;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const textY = y + 2;

              if (['↑', '↓', '←', '→'].includes(leftText)) {
                ctx.save();
                ctx.strokeStyle = leftTxtColor;
                ctx.lineWidth = 2.5;
                ctx.strokeText(leftText, x, textY);
                ctx.restore();
              }
              ctx.fillText(leftText, x, textY);
            }
          }

          // Name overlay on step 0
          if (i === 0 && !isEco) {
            ctx.save();
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = themeText;
            ctx.font = 'bold 10px serif';
            ctx.textAlign = 'left';
            const isMaster = storeTracks.some(t => String(t.linkedToTrackId) === String(track.id));
            const getPluralName = (name: string) => {
              if (name.includes('Alfaia')) return 'Alfaias';
              if (name === 'Caixa') return 'Caixas';
              if (name === 'Tarol') return 'Tarols';
              if (name === 'Agbê') return 'Agbês';
              if (name === 'Mineiro') return 'Mineiros';
              if (name === 'Gonguê') return 'Gonguês';
              return name + 's';
            };
            let labelText = track.customName
              ? (isMaster ? `🔗 ${track.customName}` : track.customName)
              : ((isMaster && currentInst) 
                  ? `🔗 ${getPluralName(currentInst.name)}` 
                  : (currentInst?.name || 'Instrument'));
            if (!track.customName && !isMaster && instrumentTotals[currentInstIdx] > 1) {
              labelText += ` ${instrumentIndexes[currentInstIdx]}`;
            }
            if (track.patterns.length > 1) {
              let patternIdx = -1;
              for (let pIdx = 0; pIdx < track.patterns.length; pIdx++) {
                if (track.patterns[pIdx].id === activePatternId) {
                  patternIdx = pIdx;
                  break;
                }
              }
              if (patternIdx !== -1) {
                labelText += ` (P${patternIdx + 1})`;
              }
            }
            ctx.fillText(labelText, x + 20, y + 3);
            ctx.restore();
          }

          // --- DRAW SECOND STROKE (RAS) ---
          if (isRas) {
             const secondState = rawMasterState[1];
             if (secondState !== 0 && secondState !== '' && secondState !== '0') {
               const anglePerStep = stepAngles ? (stepAngles[1] - stepAngles[0]) : (Math.PI * 2 / stepCount);
               const finalAngle = stepAngle + 0.5 * anglePerStep;
               const secondX = centerX + Math.cos(finalAngle) * tRad;
               const secondY = centerY + Math.sin(finalAngle) * tRad;
               
               const visualState = getVisualStrokeSymbol(secondState, localLeftHanded || false, currentInst.id);
               const primaryVisual = Array.isArray(visualState) ? visualState[0] : visualState;
               const visualStateStr = String(primaryVisual);
               
               let fillColor = ((currentInst.colors && currentInst.colors[primaryVisual as string]) ? currentInst.colors[primaryVisual as string] : '#fff');
               let txtColor = isDarkText(currentInst.id, String(Array.isArray(secondState) ? secondState[0] : secondState)) ? '#1a1a1a' : '#f4ecd8';
               let isAccent = (visualStateStr === visualStateStr.toUpperCase());
               let radiusSize = (currentInst.type === 'voice' ? 22 : (isAccent ? 13 : 10)) * dynamicScale;
               
               let text = visualStateStr;
               if (currentInst.id === 'mineiro') {
                 if (visualStateStr.toLowerCase() === 'p') text = '↑';
                 else if (visualStateStr.toLowerCase() === 't') text = '↓';
               } else if (currentInst.id === 'agbe') {
                 if (visualStateStr.toLowerCase() === 'e') text = '←';
                 else if (visualStateStr.toLowerCase() === 'd') text = '→';
                 else if (visualStateStr.toLowerCase() === 's') text = '↑';
                 else if (visualStateStr.toLowerCase() === 'v') text = '↓';
               }

               ctx.beginPath();
               ctx.arc(secondX, secondY, radiusSize, 0, Math.PI * 2);
               ctx.fillStyle = fillColor;
               ctx.fill();

               ctx.strokeStyle = themeBorder;
               ctx.lineWidth = 2.0;
               ctx.stroke();
               
               if (!isEco && i === currentStep) {
                 ctx.beginPath();
                 ctx.arc(secondX, secondY, radiusSize + 3, 0, Math.PI * 2);
                 ctx.strokeStyle = themeWood;
                 ctx.lineWidth = 1.5;
                 ctx.stroke();
               }

               if (text) {
                 const fontSize = Math.max(9, Math.floor((text.length > 1 ? 13 : 17) * dynamicScale * 0.9));
                 ctx.font = `900 ${fontSize}px "Outfit", "Inter", sans-serif`;
                 ctx.fillStyle = txtColor;
                 ctx.textAlign = 'center';
                 ctx.textBaseline = 'middle';
                 const textY = secondY + 2;

                 if (['↑', '↓', '←', '→'].includes(text)) {
                   ctx.save();
                   ctx.strokeStyle = txtColor;
                   ctx.lineWidth = 2.5;
                   ctx.strokeText(text, secondX, textY);
                   ctx.restore();
                 }
                 ctx.fillText(text, secondX, textY);
               }
             }
          }
        }
        ctx.restore();
      });

      // 3. Dessiner la baguette de Maracatu (Needle / Playhead) par-dessus les pistes pour une visibilité maximale
      const maxVisibleRadius = activeVisibleTracks.length > 0 
        ? getTrackRadius(activeVisibleTracks.length - 1, activeVisibleTracks.length) 
        : 120;
      const stickLength = maxVisibleRadius + 40;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(stickAngle);

      // Ombre portée sous la baguette (désactivée sur mobile/mode éco)
      if (!isHeavyEffectsDisabled) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }

      // Corps de la baguette (Bois étiré haute visibilité avec bordure d'encre Cordel)
      ctx.beginPath();
      ctx.moveTo(0, -3.5);
      ctx.lineTo(stickLength - 12, -2);
      ctx.lineTo(stickLength - 12, 2);
      ctx.lineTo(0, 3.5);
      ctx.closePath();
      ctx.fillStyle = themeWood;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = themeBorder;
      ctx.stroke();

      // Filet doré de finition le long de la baguette
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(stickLength - 15, 0);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Tête de la baguette (Goutte/Tête d'olive dorée haute visibilité)
      ctx.beginPath();
      ctx.ellipse(stickLength - 6, 0, 7, 4.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = themeBorder;
      ctx.stroke();

      // Pivot central (Bouton d'axe au centre de la Roda)
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fillStyle = themeWood;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = themeBorder;
      ctx.stroke();

      ctx.restore();

      // 4. Tracé Canvas 2D de la Letra au centre de la Roda si activé
      if (stateRef.current.isLetraActive) {
        drawCenterKaraoke(
          ctx,
          centerX,
          centerY,
          live,
          stateRef.current.tracks,
          stateRef.current.rawTracks,
          stateRef.current.totalMeasures,
          stateRef.current.isLoopRegionActive,
          stateRef.current.loopStartMeasure,
          stateRef.current.loopEndMeasure,
          stateRef.current.soloPatternPlayId,
          dynamicScale
        );
      }

      // Restore the ctx scale applied after drawImage
      ctx.restore();
      
      animId = requestAnimationFrame(drawLoop);
    };

    drawLoopRef.current = drawLoop;

    if (visibleRef.current) {
      loopRunningRef.current = true;
      drawLoop();
    }

    return () => {
      cancelAnimationFrame(animId);
      loopRunningRef.current = false;
      observer.disconnect();
    };
  }, []);

  const activeBpm = measureBpms[currentMeasure] || bpm;
  const activeVol = measureVols[currentMeasure] !== undefined ? measureVols[currentMeasure] : 100;

  const expanded = useMemo(() => getExpandedMeasures(totalMeasures, songSections), [totalMeasures, songSections]);
  let displayMeasure = 1;
  const displayTotal = expanded.length > 0 ? expanded.length : totalMeasures;

  if (pendingTargetExpandedIndex !== null) {
    displayMeasure = pendingTargetExpandedIndex + 1;
  } else {
    const activeMeasureForDisplay = currentMeasure;
    const activeRepIndex = expanded.findIndex(item => item.baseMeasure === activeMeasureForDisplay);
    displayMeasure = activeRepIndex !== -1 ? activeRepIndex + 1 : activeMeasureForDisplay + 1;
  }

  return (
    <div
      id="circle-sequencer-panel"
      className="flex-grow flex items-center justify-center bg-[var(--cordel-bg)] relative p-2.5 overflow-hidden w-full h-full select-none"
      style={{
        backgroundImage: `url(${ASSETS_BASE_URL}Pictures/atelier.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: isActive ? 'flex' : 'none',
      }}
    >
      {/* Dynamic Measure Information Widgets around the Roda */}
      <div className="absolute top-2 left-2 md:top-4 md:left-4 bg-[var(--cordel-bg)]/95 text-[var(--cordel-text)] cordel-border-sm p-1.5 px-2 md:p-2 md:px-3 shadow-[3px_3px_0px_var(--cordel-border)] md:shadow-[4px_4px_0px_var(--cordel-border)] flex flex-col items-center min-w-[115px] md:min-w-[150px] z-20 select-none">
        <span className="text-[8px] md:text-[9px] uppercase opacity-65 tracking-wider font-bold select-none">{lang === 'pt' ? 'Compasso' : 'Mesure'}</span>
        <div className="flex items-center justify-between w-full mt-1.5 px-1.5 gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const expanded = expandedRef.current;
              if (expanded.length === 0) {
                const activeMeasureForNavigation = pendingTargetMeasure !== null ? pendingTargetMeasure : currentMeasure;
                const prev = (activeMeasureForNavigation - 1 + totalMeasures) % totalMeasures;
                setPendingTargetMeasure(prev);
                pendingTargetMeasureRef.current = prev;
                onNavigateMeasure?.(prev);
                return;
              }

              let currentIdx = 0;
              if (pendingTargetExpandedIndexRef.current !== null) {
                currentIdx = pendingTargetExpandedIndexRef.current;
              } else {
                const activeMeasureForNavigation = currentMeasure;
                currentIdx = expanded.findIndex(item => item.baseMeasure === activeMeasureForNavigation);
                if (currentIdx === -1) currentIdx = 0;
              }

              const prevIdx = (currentIdx - 1 + expanded.length) % expanded.length;
              const prevBaseMeasure = expanded[prevIdx].baseMeasure;

              setPendingTargetExpandedIndex(prevIdx);
              pendingTargetExpandedIndexRef.current = prevIdx;
              setPendingTargetMeasure(prevBaseMeasure);
              pendingTargetMeasureRef.current = prevBaseMeasure;

              onNavigateMeasure?.(prevBaseMeasure);
            }}
            className="w-6 h-6 flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-bold text-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors rounded-sm active:scale-95"
            title={lang === 'pt' ? 'Compasso anterior' : 'Mesure précédente'}
            style={{ padding: 0 }}
          >
            &lt;
          </button>
          <span ref={measureDisplayRef} className="text-sm md:text-base font-cactus font-bold leading-none select-none flex-grow text-center">
            {displayMeasure} / {displayTotal}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const expanded = expandedRef.current;
              if (expanded.length === 0) {
                const activeMeasureForNavigation = pendingTargetMeasure !== null ? pendingTargetMeasure : currentMeasure;
                const next = (activeMeasureForNavigation + 1) % totalMeasures;
                setPendingTargetMeasure(next);
                pendingTargetMeasureRef.current = next;
                onNavigateMeasure?.(next);
                return;
              }

              let currentIdx = 0;
              if (pendingTargetExpandedIndexRef.current !== null) {
                currentIdx = pendingTargetExpandedIndexRef.current;
              } else {
                const activeMeasureForNavigation = currentMeasure;
                currentIdx = expanded.findIndex(item => item.baseMeasure === activeMeasureForNavigation);
                if (currentIdx === -1) currentIdx = 0;
              }

              const nextIdx = (currentIdx + 1) % expanded.length;
              const nextBaseMeasure = expanded[nextIdx].baseMeasure;

              setPendingTargetExpandedIndex(nextIdx);
              pendingTargetExpandedIndexRef.current = nextIdx;
              setPendingTargetMeasure(nextBaseMeasure);
              pendingTargetMeasureRef.current = nextBaseMeasure;

              onNavigateMeasure?.(nextBaseMeasure);
            }}
            className="w-6 h-6 flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-bold text-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors rounded-sm active:scale-95"
            title={lang === 'pt' ? 'Próximo compasso' : 'Mesure suivante'}
            style={{ padding: 0 }}
          >
            &gt;
          </button>
        </div>
      </div>

      <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-[var(--cordel-bg)]/95 text-[var(--cordel-text)] cordel-border-sm p-1.5 px-2.5 md:p-2 md:px-3.5 shadow-[3px_3px_0px_var(--cordel-border)] md:shadow-[4px_4px_0px_var(--cordel-border)] flex flex-col items-end min-w-[90px] md:min-w-[120px] z-20 pointer-events-none">
        <span className="text-[8px] md:text-[9px] uppercase opacity-65 tracking-wider font-bold">{lang === 'pt' ? 'Fórmula' : 'Rythme'}</span>
        <span className="text-sm md:text-lg font-cactus font-bold leading-tight">{timeSig}</span>
      </div>

      <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 bg-[var(--cordel-bg)]/95 text-[var(--cordel-text)] cordel-border-sm p-1.5 px-2.5 md:p-2 md:px-3.5 shadow-[3px_3px_0px_var(--cordel-border)] md:shadow-[4px_4px_0px_var(--cordel-border)] flex flex-col items-start min-w-[90px] md:min-w-[120px] z-20 pointer-events-none">
        <span className="text-[8px] md:text-[9px] uppercase opacity-65 tracking-wider font-bold">Tempo</span>
        <span className="text-sm md:text-lg font-cactus font-bold leading-tight">{activeBpm} <span className="text-[10px] md:text-xs font-sans font-bold">BPM</span></span>
      </div>

      <div className="absolute bottom-2 right-2 md:bottom-4 md:right-4 bg-[var(--cordel-bg)]/95 text-[var(--cordel-text)] cordel-border-sm p-1.5 px-2.5 md:p-2 md:px-3.5 shadow-[3px_3px_0px_var(--cordel-border)] md:shadow-[4px_4px_0px_var(--cordel-border)] flex flex-col items-end min-w-[90px] md:min-w-[120px] z-20 pointer-events-none">
        <span className="text-[8px] md:text-[9px] uppercase opacity-65 tracking-wider font-bold">Volume</span>
        <span className="text-sm md:text-lg font-cactus font-bold leading-tight">{activeVol}%</span>
      </div>

      <div className="flex-1 min-h-0 relative w-full h-full max-w-[800px] mx-auto flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={1200}
          height={1200}
          onPointerDown={handleCanvasPointerDown}
          className={`max-w-full max-h-full aspect-square cursor-pointer block select-none ${isPlaying ? 'pointer-events-none' : ''}`}
          style={{ touchAction: 'none' }}
          role="application"
          aria-label={lang === 'pt' ? 'Roda de maracatu — sequenciador circular' : 'Roda de maracatu — sequenciador circular'}
        />
        {/* Center overlay — displays signal or structural marker */}
        <div
          ref={centerOverlayRef}
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10"
          style={{
            opacity: 0,
            transition: 'opacity 0.6s ease',
          }}
        >
          {/* Afficheur rond */}
          <div
            id="center-afficheur"
            ref={centerAfficheurRef}
            className={`w-[20%] aspect-square rounded-full border-4 border-[var(--cordel-border)] shadow-2xl relative overflow-hidden flex items-center justify-center text-center p-1.5 md:p-2.5 select-none ${isCenterShaking ? 'shake-active' : ''}`}
            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
          >
            {/* Background image for signal */}
            <img
              id="center-overlay-img"
              ref={centerOverlayImgRef}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ display: 'none' }}
            />
            {/* Dark tint overlay for signal readability */}
            <div
              id="center-overlay-tint"
              ref={centerOverlayTintRef}
              className="absolute inset-0 bg-black/30"
              style={{ display: 'none' }}
            />
            {/* Text layer in the center */}
            <span
              id="center-overlay-text"
              ref={centerOverlayTextRef}
              className="relative z-10 font-cactus font-bold uppercase tracking-wide select-none break-words w-full text-center px-1"
              style={{ 
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                fontSize: 'var(--dynamic-font-size, clamp(12px, 1.8vw, 15px))',
                whiteSpace: 'pre-line',
                lineHeight: 1.15
              }}
            />
          </div>
        </div>
      </div>
      {/* Barre d'outils Roda : Commutateur Letra & Mode Voix / Synthé (Affiché uniquement si isLetraActive === true) */}
      {isLetraActive && (
        <div 
          className="absolute bottom-2 md:bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 md:gap-2 bg-[var(--cordel-bg)]/95 border-2 border-[var(--cordel-border)] rounded-md px-2.5 py-1 md:px-3 md:py-1.5 shadow-[3px_3px_0px_var(--cordel-border)] select-none backdrop-blur-xs"
          role="toolbar"
          aria-label={lang === 'pt' ? 'Controles vocais da Roda' : 'Contrôles vocaux de la Roda'}
        >
          {/* Bouton Toggle Letra */}
          <button
            type="button"
            onClick={toggleLetraActive}
            className={`flex items-center gap-1.5 px-2 py-0.5 md:px-2.5 md:py-1 rounded text-[11px] md:text-xs font-bold font-sans transition-all cursor-pointer border border-[var(--cordel-border)] active:scale-95 ${
              isLetraActive
                ? 'bg-[#c25e38] text-white shadow-[1px_1px_0px_var(--cordel-border)]'
                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[#e8dec5]'
            }`}
            title={lang === 'pt' ? 'Fechar Letra da Toada' : 'Fermer la Letra de la toada'}
          >
            <span className="text-xs md:text-sm">🎙️</span>
            <span>{lang === 'pt' ? 'Letra' : 'Letra'}</span>
            <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isLetraActive ? 'bg-amber-300 animate-pulse' : 'bg-stone-400'}`} />
          </button>

          <div className="w-[1px] h-3.5 md:h-4 bg-[var(--cordel-border)]/30 mx-0.5" />

          {/* Commutateur 3 positions Voix / Synthé */}
          <div className="flex items-center border border-[var(--cordel-border)] rounded overflow-hidden bg-[#e8dec5]/50">
            <button
              type="button"
              onClick={() => setVocalMode('voice')}
              className={`px-1.5 md:px-2 py-0.5 md:py-1 text-[11px] md:text-xs font-bold transition-all cursor-pointer ${
                vocalMode === 'voice'
                  ? 'bg-[var(--cordel-border)] text-[var(--cordel-bg)]'
                  : 'text-[var(--cordel-text)] hover:bg-[var(--cordel-border)]/10'
              }`}
              title={lang === 'pt' ? 'Voz gravada (sample áudio puro)' : 'Voix enregistrée (échantillon audio)'}
            >
              🎙️
            </button>
            <button
              type="button"
              onClick={() => setVocalMode('synth')}
              className={`px-1.5 md:px-2 py-0.5 md:py-1 text-[11px] md:text-xs font-bold border-l border-r border-[var(--cordel-border)] transition-all cursor-pointer ${
                vocalMode === 'synth'
                  ? 'bg-[var(--cordel-border)] text-[var(--cordel-bg)]'
                  : 'text-[var(--cordel-text)] hover:bg-[var(--cordel-border)]/10'
              }`}
              title={lang === 'pt' ? 'Sintetizador melódico (notas MIDI)' : 'Synthétiseur de notes mélodiques'}
            >
              🎹
            </button>
            <button
              type="button"
              onClick={() => setVocalMode('both')}
              className={`px-1.5 md:px-2 py-0.5 md:py-1 text-[11px] md:text-xs font-bold transition-all cursor-pointer ${
                vocalMode === 'both'
                  ? 'bg-[var(--cordel-border)] text-[var(--cordel-bg)]'
                  : 'text-[var(--cordel-text)] hover:bg-[var(--cordel-border)]/10'
              }`}
              title={lang === 'pt' ? 'Voz gravada + Sintetizador simultâneos' : 'Voix enregistrée + Synthétiseur simultanés'}
            >
              🎙️+🎹
            </button>
          </div>
        </div>
      )}

      <div 
        className="absolute top-1 md:top-4 left-1/2 -translate-x-1/2 text-[8px] md:text-[12px] font-bold tracking-widest text-center z-50 pointer-events-none select-none flex flex-col md:flex-row gap-0.5 md:gap-2 leading-tight items-center"
        style={{ color: '#f4ecd8', opacity: 0.8, textShadow: '0px 2px 4px rgba(0,0,0,0.9)' }}
      >
        <span>{lang === 'pt' ? 'Criado por Julian Biblocq' : 'Créé par Julian Biblocq'}</span>
        <span className="hidden md:inline opacity-50">|</span>
        <span>{lang === 'pt' ? 'Arte: Toni Braga' : 'Art: Toni Braga'}</span>
      </div>
    </div>
  );
};

export const CircleSequencer = React.memo(CircleSequencerComponent);

