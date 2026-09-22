/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Pattern, TrackGroup } from '../types';
import { useSequencerStore, isLinearDAWVisibleTrack, isToadaBus } from '../stores/useSequencerStore';
import { instrumentsConfig } from '../data';
import { subscribeToTick, unsubscribeFromTick } from '../hooks/useAudioSync';
import { CompassoSelector } from './CompassoSelector';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { useWindow } from '../contexts/WindowContext';
import { getTone } from '../ToneLoader';
import { DawTrackRow } from './DawTrackRow';

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
  const currentMeasure = useSequencerStore(state => isActive ? state.currentMeasure : 0);
  const tracks = useSequencerStore(state => state.tracks);
  const timeSig = useSequencerStore(state => state.timeSig);
  const rodaTrackOrder = useSequencerStore(state => state.rodaTrackOrder);
  const handleReorderRodaTracks = useSequencerStore(state => state.handleReorderRodaTracks);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeId = String(active.id);
      const overId = String(over.id);
      if (activeId.startsWith('track-') && overId.startsWith('track-')) {
        const activeTrackId = Number(activeId.replace('track-', ''));
        const overTrackId = Number(overId.replace('track-', ''));
        handleReorderRodaTracks(activeTrackId, overTrackId);
      }
    }
  };

  const getBeatsFromTimeSig = (sig: string): number => {
    if (sig === '3/4') return 3;
    if (sig === '2/4' || sig === '6/8') return 2;
    if (sig === '12/8') return 4;
    return parseInt(sig?.split('/')[0], 10) || 4;
  };

  const defaultBeats = getBeatsFromTimeSig(timeSig);

  // Replier automatiquement toutes les pistes de liens du séquenceur lors du montage (entrée sur la page)
  useEffect(() => {
    useSequencerStore.getState().setTracks(prev =>
      prev.map(t => t.isLinkFolder ? { ...t, isSequencerFolded: true } : t)
    );
  }, []);

  const currentWindow = useWindow();

  // Filter visible tracks to show on the DAW grid (matching left Mixer panel list & sorted by rodaTrackOrder)
  const visibleTracks = useMemo(() => {
    const topLevelList: TrackGroup[] = [];
    tracks.forEach(t => {
      if (isLinearDAWVisibleTrack(t, tracks)) {
        topLevelList.push(t);
      }
    });

    if (rodaTrackOrder && rodaTrackOrder.length > 0) {
      const orderMap = new Map(rodaTrackOrder.map((id, index) => [id, index]));
      topLevelList.sort((a, b) => {
        const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
        const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
        return idxA - idxB;
      });
    }

    const finalList: TrackGroup[] = [];
    topLevelList.forEach(t => {
      finalList.push(t);
      if (isToadaBus(t) && !t.isSequencerFolded) {
        const puxTrack = tracks.find(child => instrumentsConfig[child.instrumentIdx]?.id === 'puxador');
        const coroTrack = tracks.find(child => instrumentsConfig[child.instrumentIdx]?.id === 'coro');
        if (puxTrack) finalList.push(puxTrack);
        if (coroTrack) finalList.push(coroTrack);
      }
      if (t.isLinkMaster) {
        const parentBus = tracks.find(p => String(p.id) === String(t.linkedToTrackId) && p.isLinkFolder);
        if (parentBus && !parentBus.isSequencerFolded) {
          const slaves = tracks.filter(child => 
            String(child.linkedToTrackId) === String(parentBus.id) && 
            !child.isLinkFolder && 
            !child.isLinkMaster
          );
          finalList.push(...slaves);
        }
      }
    });
    return finalList;
  }, [tracks, rodaTrackOrder]);

  const sortableTrackIds = useMemo(() => visibleTracks.map(t => `track-${t.id}`), [visibleTracks]);

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

      // 1. GESTION DU STOP (step < 0) OU DU PRÉCOMPTE (isPreRoll === true) - Nettoyage complet des cases actives
      if (step < 0 || (detail as any).isPreRoll) {
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

  // Mise en sommeil stricte après l'ensemble des hooks si inactif (évite de monter et calculer le DOM caché en mode timeline)
  if (!isActive) {
    return null;
  }

  return (
    <div
      className="flex-grow flex flex-col justify-start bg-gradient-to-b from-[#1c1815] to-[#120e0c] select-none w-full h-full overflow-x-auto overflow-y-auto custom-scrollbar relative"
      style={{
        display: isActive ? 'flex' : 'none',
      }}
    >
      {/* Calque de fond en filigrane gravure pour le châssis arrière du séquenceur */}
      <div
        className="absolute inset-0 pointer-events-none z-0 wallpaper-surface-bg wallpaper-surface-dark"
        style={{
          width: 'max(100%, 1240px)',
          minHeight: '100%',
          transform: 'translateZ(0)',
        }}
      />

      {/* Scrollable Container enforcing combined inline tracks scroll */}
      <div className="min-w-[1240px] p-5 flex flex-col justify-start h-full relative z-[1]">
        
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortableTrackIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-0 flex-grow">
              {visibleTracks.map((track, trackIdx) => (
                <DawTrackRow
                  key={track.id}
                  track={track}
                  trackIdx={trackIdx}
                  tracks={tracks}
                  currentMeasure={currentMeasure}
                  defaultBeats={defaultBeats}
                  lang={lang}
                  isLeftHanded={isLeftHanded}
                  sequencer={sequencer}
                  handleStepClick={handleStepClick}
                  registerStepRef={registerStepRef}
                  trackResolutionsRef={trackResolutionsRef}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};
