/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useRef, useEffect, lazy, Suspense } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensors,
  useSensor,
  DragEndEvent,
  TouchSensor,
  pointerWithin,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TrackMixer } from './TrackMixer';
import { i18n, instrumentsConfig, ASSETS_BASE_URL } from '../data';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { meters } from '../hooks/useAudioSync';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { Pattern } from '../types';

const trackListCache = new Map<string, { id: number; isHidden: boolean; isSolo: boolean; isMute: boolean }>();
const getCachedTrack = (id: number, isHidden: boolean, isSolo: boolean, isMute: boolean) => {
  const key = `${id}_${isHidden}_${isSolo}_${isMute}`;
  let obj = trackListCache.get(key);
  if (!obj) {
    obj = { id, isHidden, isSolo, isMute };
    trackListCache.set(key, obj);
  }
  return obj;
};

interface MixerProps {
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
  isActive?: boolean;
  setEditingTrackId: (id: number | null) => void;
}

const MixerComponent: React.FC<MixerProps> = ({
  onStepTouchStart,
  isActive = true,
  setEditingTrackId,
}) => {
  const sequencer = useSequencer();

  const {
    lang,
  } = sequencer;

  const [isTracksCollapsed, setIsTracksCollapsed] = React.useState(true);

  // Zustand actions and states
  const handleReorderTracksDnd = useSequencerStore(state => state.handleReorderTracksDnd);
  
  const trackList = useSequencerStore(
    useShallow(state =>
      state.tracks
        .filter(t => !t.linkedToTrackId && (!t.isBusFolder || t.isLinkFolder))
        .map(t => getCachedTrack(t.id, t.isHidden, t.isSolo, t.isMute))
    )
  );

  const trackIdsNumbers = trackList.map(t => t.id);
  const trackIds = useMemo(() => trackIdsNumbers.map(id => `track-${id}`), [trackIdsNumbers]);

  const t = (key: string) => (i18n[lang] as any)[key] || key;
  
  const onOpenDetailEditor = React.useCallback((id: number) => {
    setEditingTrackId(id);
  }, [setEditingTrackId]);

  const [addDropOpen, setAddDropOpen] = useState(false);
  const addDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (addDropRef.current && !addDropRef.current.contains(e.target as Node)) {
        setAddDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        const activeTrackId = parseInt(activeId.replace('track-', ''), 10);
        const overTrackId = parseInt(overId.replace('track-', ''), 10);
        handleReorderTracksDnd(activeTrackId, overTrackId);
      }
    }
  };

  return (
    <div
      id="left-panel"
      className="w-[400px] min-w-[400px] h-full bg-gradient-to-b from-[#1c1815] to-[#120e0c] border-r-2 border-[#eaddcf] flex flex-col p-5 box-border z-10 transition-all duration-300 overflow-hidden"
    >
      <div className="border-b border-[#333] pb-2.5 mb-4 shrink-0 w-full flex items-center gap-2">
        <div className="relative flex-1" ref={addDropRef}>
          <button
            onClick={() => setAddDropOpen(!addDropOpen)}
            className="w-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-button px-3 py-2 text-xs font-bold font-cactus uppercase transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
          >
            ➕ {t('addInst')}
          </button>
          {addDropOpen && (
            <div className="absolute top-10 left-0 w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] shadow-[4px_4px_0_var(--cordel-border)] max-h-none z-[100]">
              {instrumentsConfig.map((inst, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    sequencer.handleAddTrackInstrument(idx, useSequencerStore.getState().currentMeasure);
                    setAddDropOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 text-xs font-bold text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] border-b border-[var(--cordel-border)] cursor-pointer"
                >
                  <img
                    src={`${ASSETS_BASE_URL}${inst.iconImg}`}
                    alt={inst.name}
                    className="w-5 h-5 object-contain filter invert opacity-80"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span>{inst.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setIsTracksCollapsed(!isTracksCollapsed)}
          className="bg-transparent border border-[#444] px-3 py-2 text-sm font-extrabold cursor-pointer text-[#eaddcf] hover:bg-[#eaddcf] hover:text-black transition-colors"
          title={isTracksCollapsed ? "Déplier les pas" : "Replier les pas"}
        >
          {isTracksCollapsed ? '▼' : '▲'}
        </button>
      </div>

      <div id="mixer-section" className="flex-grow overflow-y-auto pr-1">
        <div id="tracks-mixer-container" className="flex flex-col gap-3">
          <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
            <SortableContext items={trackIds} strategy={verticalListSortingStrategy}>
              {trackIdsNumbers.map((trackId, idx) => (
                <TrackMixer
                  key={trackId}
                  trackId={trackId}
                  index={idx}
                  totalTracks={trackIdsNumbers.length}
                  isCollapsed={isTracksCollapsed}
                  onOpenDetailEditor={onOpenDetailEditor}
                  onStepTouchStart={onStepTouchStart}
                  isActive={isActive}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
};

export const Mixer = React.memo(MixerComponent);
