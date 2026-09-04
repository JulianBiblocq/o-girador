/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useMemo, useState } from 'react';
import { GripVertical } from 'lucide-react';
import { useSequencerStore, isLinearDAWVisibleTrack, isToadaBus, isToadaChild } from '../stores/useSequencerStore';
import { useAudioStore } from '../stores/useAudioStore';
import { instrumentsConfig, ASSETS_BASE_URL, getVisualStrokeSymbol, NEWTON_NOTE_COLORS, isDarkText } from '../data';
import { getNextStepValue } from '../utils/instrumentStrokes';
import { subscribeToTick, unsubscribeFromTick } from '../hooks/useAudioSync';
import { getBusNoteColor, getContrastColor, getTrackDisplayName } from '../utils/colorHelpers';
import { XiloChisel } from './XiloIcons';
import { CompassoSelector } from './CompassoSelector';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { useWindow } from '../contexts/WindowContext';
import { getTone } from '../ToneLoader';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}

interface DawLinearSequencerProps {
  isActive: boolean;
  mestreSignals: any[];
  onStepTouchStart?: any;
}

export const DawLinearSequencer: React.FC<DawLinearSequencerProps> = ({
  isActive,
  onStepTouchStart,
}) => {
  const sequencer = useSequencer();
  const audio = useAudio();
  const lang = useSequencerStore(state => state.lang);
  const isLeftHanded = useSequencerStore(state => state.isLeftHanded);
  const currentMeasure = useSequencerStore(state => state.currentMeasure);
  const tracks = useSequencerStore(state => state.tracks);
  const timeSig = useSequencerStore(state => state.timeSig);

  const getBeatsFromTimeSig = (sig: string): number => {
    if (sig === '3/4') return 3;
    if (sig === '2/4' || sig === '6/8') return 2;
    if (sig === '12/8') return 4;
    return parseInt(sig?.split('/')[0], 10) || 4;
  };

  const defaultBeats = getBeatsFromTimeSig(timeSig);

  // For instrument selection dropdown
  const [dropdownOpenTrackId, setDropdownOpenTrackId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Replier automatiquement toutes les pistes de liens du séquenceur lors du montage (entrée sur la page)
  useEffect(() => {
    useSequencerStore.getState().setTracks(prev =>
      prev.map(t => t.isLinkFolder ? { ...t, isSequencerFolded: true } : t)
    );
  }, []);

  const currentWindow = useWindow();

  // Handle click outside for dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpenTrackId(null);
      }
    }

    if (dropdownOpenTrackId !== null) {
      currentWindow.document.addEventListener('mousedown', handleClickOutside);
      currentWindow.document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      currentWindow.document.removeEventListener('mousedown', handleClickOutside);
      currentWindow.document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [dropdownOpenTrackId, currentWindow]);

  // Filter visible tracks to show on the DAW grid (matching left Mixer panel list)
  const visibleTracks = useMemo(() => {
    const list: any[] = [];
    tracks.forEach(t => {
      if (isLinearDAWVisibleTrack(t, tracks)) {
        list.push(t);
        if (isToadaBus(t) && !t.isSequencerFolded) {
          const puxTrack = tracks.find(child => instrumentsConfig[child.instrumentIdx]?.id === 'puxador');
          const coroTrack = tracks.find(child => instrumentsConfig[child.instrumentIdx]?.id === 'coro');
          if (puxTrack) list.push(puxTrack);
          if (coroTrack) list.push(coroTrack);
        }
        if (t.isLinkMaster) {
          const parentBus = tracks.find(p => String(p.id) === String(t.linkedToTrackId) && p.isLinkFolder);
          if (parentBus && !parentBus.isSequencerFolded) {
            const slaves = tracks.filter(child => 
              String(child.linkedToTrackId) === String(parentBus.id) && 
              !child.isLinkFolder && 
              !child.isLinkMaster
            );
            list.push(...slaves);
          }
        }

      }
    });
    return list;
  }, [tracks]);

  // Keep track of DOM elements for playhead updates (Zero Render Thrashing)
  // Double indexation ref structure: cellRefs.current[trackId][stepIdx] = HTMLElement
  const cellRefs = useRef<Record<string, Record<number, HTMLElement>>>({});
  const lastActiveStepsRef = useRef<Record<string, number>>({});
  // Stable resolutions mapping for audio tick playhead highlighting without layout thrashing
  const trackResolutionsRef = useRef<Record<string, { beats: number; resArray: number[]; totalSteps: number }>>({});

  // Compute stable visible track IDs string for hook dependency
  const visibleTrackIds = useMemo(() => {
    return visibleTracks.map(t => t.id).join('-');
  }, [visibleTracks]);

  // Register cell DOM elements with cleanup of orphaned refs
  const registerStepRef = (trackId: number | string, stepIdx: number, el: HTMLButtonElement | null) => {
    const tKey = String(trackId);
    if (el) {
      if (!cellRefs.current[tKey]) {
        cellRefs.current[tKey] = {};
      }
      cellRefs.current[tKey][stepIdx] = el;
    } else {
      if (cellRefs.current[tKey]) {
        delete cellRefs.current[tKey][stepIdx];
        if (Object.keys(cellRefs.current[tKey]).length === 0) {
          delete cellRefs.current[tKey];
        }
      }
    }
  };

  // High-performance playhead ticks listener bypassing React render cycle (Zero Render Thrashing & Zero Layout Thrashing)
  useEffect(() => {
    if (!isActive) {
      Object.keys(cellRefs.current).forEach((tId) => {
        const lastIdx = lastActiveStepsRef.current[tId];
        if (lastIdx !== undefined && lastIdx !== -1) {
          const steps = cellRefs.current[tId];
          if (steps?.[lastIdx]) {
            const el = steps[lastIdx];
            el.classList.remove('playhead-active');
            el.classList.remove('!border-[#b23b25]', '!bg-[#b23b25]/20', 'shadow-[0_0_8px_#b23b25]');
          }
        }
      });
      lastActiveStepsRef.current = {};
      return;
    }

    const handleTick = (detail: { step: number; ratio?: number; time?: number }) => {
      const { step, ratio = 0 } = detail;

      // 1. GESTION DU STOP (step < 0) - Nettoyage complet des cases actives
      if (step < 0) {
        Object.keys(cellRefs.current).forEach((tId) => {
          const lastIdx = lastActiveStepsRef.current[tId];
          if (lastIdx !== undefined && lastIdx !== -1) {
            const steps = cellRefs.current[tId];
            if (steps?.[lastIdx]) {
              const el = steps[lastIdx];
              el.classList.remove('playhead-active');
              el.classList.remove('!border-[#b23b25]', '!bg-[#b23b25]/20', 'shadow-[0_0_8px_#b23b25]');
            }
          }
        });
        lastActiveStepsRef.current = {};
        return;
      }

      Object.keys(cellRefs.current).forEach((tId) => {
        const steps = cellRefs.current[tId];
        if (!steps) return;

        const trackRes = trackResolutionsRef.current[tId];
        let targetStep = 0;
        if (trackRes && trackRes.beats > 0) {
          const { beats, resArray, totalSteps } = trackRes;
          const currentBeat = Math.min(beats - 1, Math.max(0, Math.floor(ratio * beats)));
          const beatProgress = Math.min(0.9999, Math.max(0, (ratio * beats) - currentBeat));
          const res = resArray[currentBeat] || 4;
          const stepInBeat = Math.min(res - 1, Math.max(0, Math.floor(beatProgress * res)));

          let accumulated = 0;
          for (let b = 0; b < currentBeat; b++) {
            accumulated += (resArray[b] || 4);
          }
          targetStep = Math.min(totalSteps - 1, accumulated + stepInBeat);
        } else {
          targetStep = Math.floor(ratio * 16);
        }

        const lastStep = lastActiveStepsRef.current[tId] ?? -1;
        if (targetStep === lastStep) return;

        // 1. Remove playhead indicator from previous active step
        if (lastStep !== -1 && steps[lastStep]) {
          const prevEl = steps[lastStep];
          prevEl.classList.remove('playhead-active');
          prevEl.classList.remove('!border-[#b23b25]', '!bg-[#b23b25]/20', 'shadow-[0_0_8px_#b23b25]');
        }

        // 2. Add playhead indicator to the new active step
        if (steps[targetStep]) {
          const newEl = steps[targetStep];
          newEl.classList.add('playhead-active');
          newEl.classList.add('!border-[#b23b25]', '!bg-[#b23b25]/20', 'shadow-[0_0_8px_#b23b25]');
        }

        lastActiveStepsRef.current[tId] = targetStep;
      });
    };

    subscribeToTick(handleTick);
    return () => {
      unsubscribeFromTick(handleTick);
      Object.keys(cellRefs.current).forEach((tId) => {
        const lastIdx = lastActiveStepsRef.current[tId];
        if (lastIdx !== undefined && lastIdx !== -1) {
          const steps = cellRefs.current[tId];
          if (steps?.[lastIdx]) {
            const el = steps[lastIdx];
            el.classList.remove('playhead-active');
            el.classList.remove('!border-[#b23b25]', '!bg-[#b23b25]/20', 'shadow-[0_0_8px_#b23b25]');
          }
        }
      });
      lastActiveStepsRef.current = {};
    };
  }, [isActive, visibleTrackIds]);

  // Handle clicking step cells to open InstrumentDetailEditor directly (avoids shared pattern confusion)
  const handleStepClick = (e: React.MouseEvent, trackId: number, activePattern: any, inst: any, stepIdx: number, currentVal: any) => {
    e.stopPropagation();
    
    // Étape 1 (React Bypass Mobile) : Bloquer l'édition des pas pendant la lecture sur mobile
    const isMobileDevice = (typeof window !== 'undefined' && window.innerWidth <= 768);
    if (audio.isPlaying && isMobileDevice) {
      return;
    }
    
    // NOUVEAU COMPORTEMENT: On ouvre toujours l'éditeur détaillé pour éviter 
    // la confusion sur les patterns partagés.
    useSequencerStore.getState().setEditingTrackId(trackId);
  };

  // Helper names formatting
  const getPluralName = (name: string) => {
    if (name.includes('Alfaia')) return 'Alfaias';
    if (name === 'Caixa') return 'Caixas';
    if (name === 'Tarol') return 'Tarols';
    if (name === 'Agbê') return 'Agbês';
    if (name === 'Mineiro') return 'Mineiros';
    if (name === 'Gonguê') return 'Gonguês';
    return name + 's';
  };

  return (
    <div
      className="flex-grow flex flex-col justify-start bg-gradient-to-b from-[#1c1815] to-[#120e0c] select-none w-full h-full overflow-x-auto overflow-y-auto custom-scrollbar"
      style={{
        display: isActive ? 'flex' : 'none',
      }}
    >
      {/* Scrollable Container enforcing combined inline tracks scroll */}
      <div className="min-w-[1240px] p-5 flex flex-col justify-start h-full">
        
        <div className="flex items-center w-full h-auto pb-2.5 shrink-0 border-b border-[#333] mb-4 select-none justify-start">
          {/* Left Spacer matching Left Instrument Mixer section width (360px) */}
          <div className="w-[360px] min-w-[360px] shrink-0 flex items-center gap-3">
            <button
              onClick={() => useSequencerStore.getState().toggleTracksCollapsed()}
              className="bg-transparent border border-[#444] px-3 py-2 text-sm font-extrabold cursor-pointer text-[#eaddcf] hover:bg-[#eaddcf] hover:text-black transition-colors flex-shrink-0 flex items-center justify-center"
              title={lang === 'fr' ? 'Replier le séquenceur' : 'Recolher sequenciador'}
            >
              ▲
            </button>
            <CompassoSelector className="flex-grow max-w-[240px]" />
          </div>

          {/* Right Ruler steps timeline headers aligned to beats */}
          <div className="flex items-center justify-between flex-grow pl-4 select-none">
            <div className="flex w-full items-center gap-1.5 text-[#1a1a1a] font-cactus font-bold text-[10px] md:text-xs">
              {Array.from({ length: defaultBeats }).map((_, beatIdx) => {
                const isEvenBeat = beatIdx % 2 === 0;
                const emptyStepBg = isEvenBeat ? '#f4ecd8' : '#d2c5b1';
                return (
                  <div
                    key={beatIdx}
                    className="flex-1 text-center py-1 rounded"
                    style={{
                      backgroundColor: emptyStepBg,
                    }}
                  >
                    T{beatIdx + 1}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Scrollable DAW Tracks list */}
        <div className="flex flex-col gap-0 flex-grow">
          {visibleTracks.map((track, trackIdx) => {
            const isToada = isToadaBus(track);

            // Find active vocal track children
            const activeChildTrack = (() => {
              if (!isToada) return null;
              const pux = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
              const coro = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
              const globalSelectedId = useAudioStore.getState().selectedVocalPatternId;
              if (globalSelectedId) {
                if (pux && pux.patterns.some(p => p.id === globalSelectedId)) return pux;
                if (coro && coro.patterns.some(p => p.id === globalSelectedId)) return coro;
              }
              const coroPtn = coro?.patterns.find(p => p.measureAssignments[currentMeasure]);
              if (coroPtn) return coro;
              const puxPtn = pux?.patterns.find(p => p.measureAssignments[currentMeasure]);
              if (puxPtn) return pux;
              return coro || pux || null;
            })();

            const effectiveTrack = isToada ? (activeChildTrack || track) : track;
            const inst = effectiveTrack ? instrumentsConfig[effectiveTrack.instrumentIdx] : null;

            if (!inst) return null;

            const override = track.patternOverrides?.[currentMeasure];
            const hasExplicitVariation = override !== undefined && override !== null;

            const isLinkedSlave = track.linkedToTrackId && !track.isLinkFolder && !track.isLinkMaster;
            const parentBus = isLinkedSlave
              ? tracks.find(p => String(p.id) === String(track.linkedToTrackId) && p.isLinkFolder)
              : null;

            let activePattern = null;
            if (isLinkedSlave && parentBus) {
              if (override === null) {
                activePattern = null;
              } else if (override !== undefined) {
                activePattern = parentBus.patterns.find(p => p.id === override) || null;
              } else {
                activePattern = parentBus.patterns.find(p => p.measureAssignments?.[currentMeasure]) || parentBus.patterns[0] || null;
              }
            } else {
              if (override === null) {
                activePattern = null;
              } else if (override !== undefined) {
                activePattern = effectiveTrack.patterns?.find(p => p.id === override) || null;
              } else {
                activePattern = effectiveTrack.patterns?.find(p => p.measureAssignments?.[currentMeasure]) || effectiveTrack.patterns?.[0] || null;
              }
            }

            const isToadaChildTrack = isToadaChild(track, tracks);
            const isChild = isLinkedSlave || isToadaChildTrack;

            // Ghost track detection
            const isGhostStep = isLinkedSlave && !hasExplicitVariation;

            const masterTrack = isGhostStep 
              ? tracks.find(t => String(t.linkedToTrackId) === String(track.linkedToTrackId) && t.isLinkMaster)
              : null;
            const masterActivePattern = masterTrack
              ? (masterTrack.patterns?.find(p => p.measureAssignments?.[currentMeasure]) || masterTrack.patterns?.[0])
              : null;

            const displayName = isToada
              ? 'Toada'
              : (isChild ? `↳ ${getTrackDisplayName(track, tracks)}` : getTrackDisplayName(track, tracks));

            const isDropdownOpen = dropdownOpenTrackId === track.id;

            return (
              <div
                key={track.id}
                className={`flex items-center w-full h-auto min-h-[116px] xl:h-[76px] xl:min-h-[76px] justify-start shrink-0 text-[#1a1a1a] border-b-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] rounded-none bg-[#f4ecd8] px-3 py-1 relative ${
                  isDropdownOpen ? 'overflow-visible z-[60]' : 'overflow-hidden z-[1]'
                }`}
                style={{
                  zIndex: isDropdownOpen ? 60 : 1,
                }}
              >
                {/* A. Left Side: Integrated Instrument Mixer Controls (w-[360px] fixed width) */}
                <div 
                  className={`flex items-center justify-between gap-2 w-[360px] min-w-[360px] h-[76px] min-h-[76px] shrink-0 border-r border-[#1a1a1a]/20 pr-3 relative ${
                    isDropdownOpen ? 'z-[60]' : 'z-[2]'
                  } ${
                    isChild ? 'pl-8' : 'pl-3'
                  }`}
                  ref={isDropdownOpen ? dropdownRef : undefined}
                >
                  <div className="flex items-center gap-2">
                    {/* Sortable drag grip (pure aesthetic in DAW view but maintains Mixer visual layout) */}
                    <div className="mr-2 transition-colors p-1 touch-none flex-shrink-0 text-[#1a1a1a]/40">
                      <GripVertical size={16} />
                    </div>

                    {/* Instrument Button (Now opens Editor) */}
                    <div className="relative flex items-center">
                      <button
                        onClick={() => {
                          if (track.isBusFolder && !isToada && !track.isLinkFolder) {
                            useSequencerStore.getState().handleToggleSequencerFoldBus(String(track.id));
                            return;
                          }
                          const targetTrack = isToada
                            ? (activeChildTrack || tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador') || track)
                            : track;
                          useSequencerStore.getState().setEditingTrackId(targetTrack.id);
                        }}
                        className="flex items-center justify-between gap-1.5 cordel-border-sm cordel-button px-1.5 py-0.5 text-[10px] cursor-pointer transition-colors w-[180px] sm:w-[190px]"
                        style={{ backgroundColor: inst.mixerBg, color: inst.colors.text }}
                        title={lang === 'pt' ? 'Editar instrumento' : 'Éditer l\'instrument'}
                      >
                        <img
                          src={`${ASSETS_BASE_URL}${inst.iconImg}`}
                          alt={inst.name}
                          className="w-4 h-4 object-contain flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <span className="font-cactus font-bold text-center leading-normal flex-1 truncate">
                          {trackIdx + 1}. {displayName}
                        </span>
                        {(!track.isBusFolder || isToada || track.isLinkFolder) && (
                          <span className="flex-shrink-0 opacity-70"><XiloChisel size={11} /></span>
                        )}
                      </button>

                      {/* Instrument Selector Dropdown popup */}
                      {isDropdownOpen && (
                        <div className="absolute top-9 left-0 bg-[#f4ecd8] text-[#1a1a1a] cordel-border cordel-shadow min-w-[180px] max-h-[220px] overflow-y-auto z-[9999]">
                          <div
                            onClick={() => {
                              useSequencerStore.getState().handleTrackDelete(track.id);
                              setDropdownOpenTrackId(null);
                            }}
                            className="flex items-center gap-3.5 px-3 py-2 cursor-pointer text-xs font-bold text-[#8b2a1a] border-b border-black/10 hover:bg-[#8b2a1a] hover:text-[#f4ecd8]"
                          >
                            <span className="w-5 text-center">🗑️</span>
                            <span>{lang === 'fr' ? 'Supprimer la piste' : 'Excluir pista'}</span>
                          </div>
                          {instrumentsConfig.map((opt, oIdx) => (
                            <div
                              key={opt.id}
                              onClick={() => {
                                useSequencerStore.getState().handleTrackInstrumentIdxChange(track.id, oIdx);
                                setDropdownOpenTrackId(null);
                              }}
                              className="flex items-center gap-3.5 px-3 py-2 cursor-pointer text-xs font-bold border-b border-black/10 hover:bg-black hover:text-[#f4ecd8]"
                            >
                              <img
                                src={`${ASSETS_BASE_URL}${opt.iconImg}`}
                                alt={opt.name}
                                className="w-5 h-5 object-contain"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                              <span>{opt.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Dropdown Toggle Icon */}
                    <button
                      onClick={() => setDropdownOpenTrackId(isDropdownOpen ? null : track.id)}
                      className="ml-1 flex items-center justify-center w-6 h-6 cordel-border-sm cordel-button text-[10px] cursor-pointer transition-colors bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]"
                      title={lang === 'pt' ? 'Mudar instrumento' : 'Changer d\'instrument'}
                    >
                      ▼
                    </button>

                    {(track.isLinkMaster || isToada) && (
                      <button
                        onClick={() => {
                          if (isToada) {
                            useSequencerStore.getState().handleToggleSequencerFoldBus(String(track.id));
                          } else if (track.isLinkMaster && track.linkedToTrackId) {
                            const parentBus = tracks.find(p => String(p.id) === String(track.linkedToTrackId) && p.isLinkFolder);
                            if (parentBus) {
                              useSequencerStore.getState().handleToggleSequencerFoldBus(String(parentBus.id));
                            }
                          }
                        }}
                        className="ml-1 p-0.5 hover:bg-black/10 rounded cursor-pointer text-[10px] font-bold shrink-0 flex items-center justify-center w-6 h-6 cordel-border-sm cordel-button text-black"
                        title={(() => {
                          const isCollapsed = isToada
                            ? track.isSequencerFolded
                            : (tracks.find(p => String(p.id) === String(track.linkedToTrackId) && p.isLinkFolder)?.isSequencerFolded ?? false);
                          return isCollapsed ? (lang === 'fr' ? 'Déplier' : 'Desdobrar') : (lang === 'fr' ? 'Plier' : 'Dobrar');
                        })()}
                      >
                        {(() => {
                          const isCollapsed = isToada
                            ? track.isSequencerFolded
                            : (tracks.find(p => String(p.id) === String(track.linkedToTrackId) && p.isLinkFolder)?.isSequencerFolded ?? false);
                          return isCollapsed ? '▶' : '▼';
                        })()}
                      </button>
                    )}
                  </div>

                </div>

                {/* B. Right Side: Dynamic Step Buttons grouped by beats */}
                {(() => {
                  const patternForSteps = isGhostStep ? masterActivePattern : activePattern;
                  const stepsCount = patternForSteps?.steps ?? 16;
                  const beatRes = patternForSteps?.beatResolutions || Array(defaultBeats).fill(4);

                  // Keep trackResolutionsRef updated synchronously during render (Zero Layout Thrashing)
                  trackResolutionsRef.current[String(track.id)] = {
                    beats: defaultBeats,
                    resArray: beatRes,
                    totalSteps: stepsCount,
                  };

                  // Compute step index groups per beat
                  const beatGroups: number[][] = [];
                  let accumulated = 0;
                  for (let b = 0; b < defaultBeats; b++) {
                    const res = beatRes[b] ?? 4;
                    const group: number[] = [];
                    for (let i = 0; i < res; i++) {
                      if (accumulated + i < stepsCount) {
                        group.push(accumulated + i);
                      }
                    }
                    beatGroups.push(group);
                    accumulated += res;
                  }

                  return (
                    <div className="flex items-center flex-grow pl-4 h-full">
                      <div className="flex w-full h-full items-center gap-1.5 select-none">
                        {beatGroups.map((group, beatIdx) => {
                          const isEvenBeat = beatIdx % 2 === 0;
                          const emptyStepBg = isEvenBeat ? '#f4ecd8' : '#d2c5b1';
                          const isTriplet = group.length === 3;
                          const isSextuplet = group.length === 6;

                          return (
                            <div
                              key={beatIdx}
                              className={`flex flex-1 h-full items-center py-1 px-1 rounded ${
                                isTriplet ? 'justify-between gap-1' : isSextuplet ? 'gap-0.5' : 'gap-1'
                              }`}
                              style={{ 
                                backgroundColor: emptyStepBg,
                                ...(group.length === 0 && {
                                  backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.1) 0, rgba(0,0,0,0.1) 4px, transparent 4px, transparent 20px)',
                                  backgroundSize: '100% 100%'
                                })
                              }}
                            >
                              {group.map((stepIdx, indexInGroup) => {
                                const val = isGhostStep
                                  ? (masterActivePattern?.activeSteps?.[stepIdx] ?? 0)
                                  : (activePattern?.activeSteps?.[stepIdx] ?? 0);
                                const isActiveCell = val !== 0 && val !== '';
                                const isVoice = inst.type === 'voice' || inst.id === 'toada';

                                const note = isVoice 
                                  ? (isGhostStep 
                                      ? (masterActivePattern?.notes?.[stepIdx] || '')
                                      : (activePattern?.notes?.[stepIdx] || ''))
                                  : '';

                                const visualVal = getVisualStrokeSymbol(Array.isArray(val) ? val[0] : val, isLeftHanded, inst.id);
                                
                                const syl = isGhostStep
                                  ? (masterActivePattern?.lyrics?.[stepIdx] || (val !== 0 && val !== '' ? String(val) : ''))
                                  : (activePattern?.lyrics?.[stepIdx] || (val !== 0 && val !== '' ? String(val) : ''));
                                
                                let displayVal = isVoice ? syl : (visualVal === 0 ? '' : (Array.isArray(val) ? val.map(v => getVisualStrokeSymbol(v, isLeftHanded, inst.id)).join('') : String(visualVal)));

                                let bgColor = emptyStepBg;
                                let txtColor = 'rgba(26, 26, 26, 0.4)';
                                let borderStyle = '2px solid rgba(26, 26, 26, 0.2)';
                                let isSplit = false;

                                let leftBg = emptyStepBg;
                                let leftTxt = 'transparent';
                                let leftSym = '';

                                let rightBg = emptyStepBg;
                                let rightTxt = 'transparent';
                                let rightSym = '';

                                let masterBg = emptyStepBg;
                                let masterTxt = txtColor;
                                let masterSym = displayVal;

                                if (isActiveCell) {
                                  if (isVoice) {
                                    const voiceInst = instrumentsConfig.find(c => c.id === (val === 'P' ? 'puxador' : 'coro')) || inst;
                                    masterBg = voiceInst.color || '#f4ecd8';
                                    masterTxt = '#1a1a1a';
                                  } else {
                                    const primaryVal = String(visualVal);
                                    masterBg = inst.colors?.[primaryVal] || inst.color || '#111';
                                    masterTxt = inst.colors?.text || '#f4ecd8';
                                    if (isDarkText(inst.id, primaryVal)) {
                                      masterTxt = '#1a1a1a';
                                    }
                                  }
                                }

                                // ── RESOLVE TRACK LINKING AND VARIATIONS (RODA STYLE) ──
                                const children = tracks.filter(t => String(t.linkedToTrackId) === String(track.id) && !t.isBusFolder);
                                const isLinkedGroup = children.length > 0;

                                if (isLinkedGroup) {
                                  const childActiveEvents: Array<{
                                    bgColor: string;
                                    txtColor: string;
                                    displayVal: string;
                                    visualVal: string | number;
                                  }> = [];

                                  children.forEach(c => {
                                    const override = c.patternOverrides?.[currentMeasure];
                                    let cPattern = null;
                                    if (override === null) {
                                      cPattern = null;
                                    } else if (override !== undefined) {
                                      cPattern = track.patterns?.find((p: any) => p.id === override);
                                    } else if (activePattern) {
                                      cPattern = c.patterns?.find((p: any) => p.id === activePattern.id);
                                      if (!cPattern) {
                                        const idx = effectiveTrack.patterns?.indexOf(activePattern) ?? -1;
                                        if (idx !== -1 && c.patterns) {
                                          cPattern = c.patterns[idx];
                                        }
                                      }
                                    }

                                    const cVal = cPattern?.activeSteps?.[stepIdx] ?? 0;
                                    if (cVal !== 0 && cVal !== '') {
                                      const cInst = instrumentsConfig[c.instrumentIdx];
                                      if (cInst) {
                                        const cVisualVal = getVisualStrokeSymbol(cVal, isLeftHanded, cInst.id);
                                        if (cVisualVal !== 0) {
                                          const cBgColor = cInst.colors?.[cVisualVal as string] || cInst.color || '#111';
                                          let cTxtColor = cInst.colors?.text || '#f4ecd8';
                                          if (isDarkText(cInst.id, cVisualVal as string)) {
                                            cTxtColor = '#1a1a1a';
                                          }
                                          childActiveEvents.push({
                                            bgColor: cBgColor,
                                            txtColor: cTxtColor,
                                            displayVal: String(cVisualVal),
                                            visualVal: cVisualVal,
                                          });
                                        }
                                      }
                                    }
                                  });

                                  const masterVisualVal = isActiveCell ? visualVal : 0;
                                  const hasMasterEvent = masterVisualVal !== 0;
                                  const activeChildrenCount = childActiveEvents.length;

                                  let isUnisson = false;
                                  if (hasMasterEvent && activeChildrenCount > 0) {
                                    isUnisson = childActiveEvents.every(evt => evt.visualVal === masterVisualVal);
                                  }

                                  if (isUnisson) {
                                    isSplit = false;
                                    bgColor = getBusNoteColor(String(track.id), String(masterVisualVal), tracks, instrumentsConfig);
                                    txtColor = getContrastColor(bgColor);
                                    borderStyle = '2px solid #1a1a1a';
                                    displayVal = String(masterVisualVal);
                                  } else {
                                    const groupHasEvent = hasMasterEvent || activeChildrenCount > 0;
                                    if (groupHasEvent) {
                                      isSplit = true;
                                      borderStyle = '2px solid #1a1a1a';

                                      if (hasMasterEvent) {
                                        leftBg = masterBg;
                                        leftTxt = masterTxt;
                                        leftSym = masterSym;
                                      } else {
                                        leftBg = emptyStepBg;
                                        leftTxt = 'transparent';
                                        leftSym = '';
                                      }

                                      if (activeChildrenCount > 0) {
                                        rightBg = childActiveEvents[0].bgColor;
                                        rightTxt = childActiveEvents[0].txtColor;
                                        rightSym = childActiveEvents[0].displayVal;
                                      } else {
                                        rightBg = emptyStepBg;
                                        rightTxt = 'transparent';
                                        rightSym = '';
                                      }
                                    } else {
                                      isSplit = false;
                                      bgColor = emptyStepBg;
                                      txtColor = 'rgba(26, 26, 26, 0.4)';
                                      borderStyle = '2px solid rgba(26, 26, 26, 0.2)';
                                    }
                                  }
                                } else {
                                  // Normal, unlinked track
                                  if (Array.isArray(val) && val.length === 2) {
                                    isSplit = true;
                                    borderStyle = '2px solid #1a1a1a';
                                    bgColor = emptyStepBg;

                                    const leftVal = getVisualStrokeSymbol(val[0], isLeftHanded, inst.id);
                                    leftBg = inst.colors?.[String(leftVal)] || inst.color || '#111';
                                    leftTxt = isDarkText(inst.id, String(leftVal)) ? '#1a1a1a' : (inst.colors?.text || '#f4ecd8');
                                    leftSym = leftVal === 0 ? '' : String(leftVal);
                                    if (leftVal === 0 || leftVal === '') { leftBg = emptyStepBg; leftTxt = 'transparent'; }

                                    const rightVal = getVisualStrokeSymbol(val[1], isLeftHanded, inst.id);
                                    rightBg = inst.colors?.[String(rightVal)] || inst.color || '#111';
                                    rightTxt = isDarkText(inst.id, String(rightVal)) ? '#1a1a1a' : (inst.colors?.text || '#f4ecd8');
                                    rightSym = rightVal === 0 ? '' : String(rightVal);
                                    if (rightVal === 0 || rightVal === '') { rightBg = emptyStepBg; rightTxt = 'transparent'; }
                                  } else {
                                    isSplit = false;
                                    if (isActiveCell) {
                                      bgColor = masterBg;
                                      txtColor = masterTxt;
                                      borderStyle = '2px solid #1a1a1a';
                                    } else {
                                      bgColor = emptyStepBg;
                                      txtColor = 'rgba(26, 26, 26, 0.4)';
                                      borderStyle = '2px solid rgba(26, 26, 26, 0.2)';
                                    }
                                  }
                                }

                                if (isSplit) {
                                  return (
                                    <div key={stepIdx} className="flex items-center justify-center h-full flex-1">
                                      <button
                                        ref={(el) => registerStepRef(track.id, stepIdx, el)}
                                        data-step-index={stepIdx}
                                        onClick={(e) => handleStepClick(e, effectiveTrack.id, activePattern, inst, stepIdx, val)}
                                        className={`sequencer-step relative flex items-center justify-center cursor-pointer select-none transition-all duration-75 ease-out flex-1 h-10 md:h-11 overflow-hidden outline-none ${
                                          isTriplet ? 'max-w-[56px]' : isSextuplet ? 'max-w-[34px]' : 'max-w-[48px]'
                                        }`}
                                        style={{
                                          border: (isTriplet || isSextuplet) ? 'none' : borderStyle,
                                          borderRadius: (isTriplet || isSextuplet) ? '0' : '2px',
                                          boxShadow: (!isTriplet && !isSextuplet) ? '1px 1px 0px rgba(0,0,0,1)' : undefined,
                                          filter: (isTriplet || isSextuplet) ? 'drop-shadow(1px 1px 0px rgba(0,0,0,0.35))' : undefined,
                                          clipPath: isSextuplet
                                            ? (indexInGroup % 2 === 0 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'polygon(0% 0%, 100% 0%, 50% 100%)')
                                            : isTriplet
                                              ? 'polygon(50% 0%, 0% 100%, 100% 100%)'
                                              : undefined,
                                          background: `linear-gradient(135deg, ${leftBg} 48%, #000 48%, #000 52%, ${rightBg} 52%)`,
                                        }}
                                      >
                                        {/* Left-Top text (base strike) */}
                                        <span
                                          className="absolute top-0.5 left-1 text-xs md:text-sm font-bold z-10"
                                          style={{ color: leftTxt }}
                                        >
                                          {leftSym}
                                        </span>

                                        {/* Right-Bottom text (variation strike) */}
                                        <span
                                          className="absolute bottom-0.5 right-1 text-xs md:text-sm font-bold z-10"
                                          style={{ color: rightTxt }}
                                        >
                                          {rightSym}
                                        </span>
                                      </button>
                                    </div>
                                  );
                                }

                                return (
                                  <div key={stepIdx} className="flex items-center justify-center h-full flex-1">
                                    <button
                                      ref={(el) => registerStepRef(track.id, stepIdx, el)}
                                      data-step-index={stepIdx}
                                      data-step-type={isVoice ? 'voice' : 'sampler'}
                                      onClick={(e) => handleStepClick(e, effectiveTrack.id, activePattern, inst, stepIdx, val)}
                                      className={`sequencer-step relative flex items-center justify-center cursor-pointer select-none transition-all duration-75 ease-out flex-1 h-10 md:h-11 outline-none ${
                                        isTriplet ? 'max-w-[56px]' : isSextuplet ? 'max-w-[34px]' : 'max-w-[48px]'
                                      } ${isActiveCell ? 'is-active scale-100' : 'hover:bg-black/5'} ${
                                        isVoice 
                                          ? 'text-[9px] md:text-[11px] font-sans normal-case leading-tight text-center break-words overflow-hidden px-0.5' 
                                          : isSextuplet
                                            ? 'text-xs md:text-sm font-bold'
                                            : 'text-base md:text-lg font-bold'
                                      }`}
                                      style={{
                                        backgroundColor: (isTriplet || isSextuplet)
                                          ? (isActiveCell ? bgColor : 'rgba(26, 26, 26, 0.12)')
                                          : (isActiveCell ? bgColor : 'transparent'),
                                        color: txtColor,
                                        border: (isTriplet || isSextuplet) ? 'none' : borderStyle,
                                        borderRadius: (isTriplet || isSextuplet) ? '0' : '2px',
                                        boxShadow: (!isTriplet && !isSextuplet && isActiveCell) ? '1px 1px 0px rgba(0,0,0,1)' : undefined,
                                        filter: (isTriplet || isSextuplet) ? 'drop-shadow(1px 1px 0px rgba(0,0,0,0.35))' : undefined,
                                        clipPath: isSextuplet 
                                          ? (indexInGroup % 2 === 0 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'polygon(0% 0%, 100% 0%, 50% 100%)')
                                          : isTriplet ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
                                        opacity: isGhostStep ? 0.35 : 1,
                                      }}
                                    >
                                      <span className={isSextuplet ? (indexInGroup % 2 === 0 ? 'translate-y-1' : '-translate-y-1') : isTriplet ? 'translate-y-1' : ''}>
                                        {displayVal}
                                      </span>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
