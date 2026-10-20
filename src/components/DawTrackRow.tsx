/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TrackGroup } from '../types';
import { isToadaBus, isToadaChild } from '../stores/useSequencerStore';
import { useAudioStore } from '../stores/useAudioStore';
import { instrumentsConfig } from '../data';
import { getBusColor, getTopParentBusId, getTrackDisplayName } from '../utils/colorHelpers';
import { DawTrackRowHeader } from './daw/DawTrackRowHeader';
import { DawStepGrid } from './daw/DawStepGrid';
import { resolveDawPattern, computeBeatGroups } from './daw/dawStepMath';

export interface DawTrackRowProps {
  track: TrackGroup;
  trackIdx: number;
  tracks: TrackGroup[];
  currentMeasure: number;
  defaultBeats: number;
  lang: string;
  isLeftHanded: boolean;
  sequencer: any;
  handleStepClick: (e: React.MouseEvent, trackId: number, activePattern: any, inst: any, stepIdx: number, currentVal: any) => void;
  registerStepRef: (trackId: number | string, stepIdx: number, el: HTMLButtonElement | null) => void;
  trackResolutionsRef: React.MutableRefObject<Record<string, { beats: number; resArray: number[]; totalSteps: number }>>;
}

export const DawTrackRow: React.FC<DawTrackRowProps> = ({
  track,
  trackIdx,
  tracks,
  currentMeasure,
  defaultBeats,
  lang,
  isLeftHanded,
  sequencer,
  handleStepClick,
  registerStepRef,
  trackResolutionsRef,
}) => {
  const isLinkedSlave = !!(track.linkedToTrackId && !track.isLinkFolder && !track.isLinkMaster);
  const isToadaChildTrack = isToadaChild(track, tracks);
  const isChild = isLinkedSlave || isToadaChildTrack;
  const isToada = isToadaBus(track);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `track-${track.id}`,
    disabled: isChild,
  });

  const topBusId = useMemo(() => {
    return getTopParentBusId(track, tracks) ||
      (track.linkedToTrackId ? String(track.linkedToTrackId) : (track.isLinkMaster ? String(track.id) : null));
  }, [track, tracks]);

  const busColor = useMemo(() => (topBusId ? getBusColor(topBusId, tracks, instrumentsConfig) : null), [topBusId, tracks]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.75 : 1,
    borderLeft: busColor ? `5px solid ${busColor}` : '2px solid #1a1a1a',
  };

  const activeChildTrack = useMemo(() => {
    if (!isToada) return null;
    const pux = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
    const coro = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
    const globalSelectedId = useAudioStore.getState().selectedVocalPatternId;
    if (globalSelectedId) {
      if (pux && pux.patterns.some(p => p.id === globalSelectedId)) return pux;
      if (coro && coro.patterns.some(p => p.id === globalSelectedId)) return coro;
    }
    return coro?.patterns?.find(p => p.measureAssignments?.[currentMeasure]) ? coro :
           pux?.patterns?.find(p => p.measureAssignments?.[currentMeasure]) ? pux : (coro || pux || null);
  }, [isToada, tracks, currentMeasure]);

  const effectiveTrack = isToada ? (activeChildTrack || track) : track;
  const inst = effectiveTrack ? instrumentsConfig[effectiveTrack.instrumentIdx] : null;

  const { activePattern, masterActivePattern, isGhostStep } = resolveDawPattern({
    track,
    tracks,
    currentMeasure,
    effectiveTrack,
    isLinkedSlave,
  });

  const patternForSteps = isGhostStep ? masterActivePattern : activePattern;
  const stepsCount = patternForSteps?.steps ?? 16;
  const beatRes = patternForSteps?.beatResolutions || Array(defaultBeats).fill(4);
  const { effectiveBeats, beatGroups } = computeBeatGroups(stepsCount, defaultBeats, beatRes);

  trackResolutionsRef.current[String(track.id)] = {
    beats: effectiveBeats,
    resArray: beatRes,
    totalSteps: stepsCount,
  };

  if (!inst) return null;

  const displayName = isToada ? 'Toada' : (isChild ? `↳ ${getTrackDisplayName(track, tracks)}` : getTrackDisplayName(track, tracks));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center w-full h-auto min-h-[116px] xl:h-[76px] xl:min-h-[76px] justify-start shrink-0 text-[#1a1a1a] border-b-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] rounded-none bg-[#f4ecd8] px-3 py-1 relative overflow-hidden z-[1]"
    >
      <DawTrackRowHeader
        track={track}
        trackIdx={trackIdx}
        displayName={displayName}
        inst={inst}
        isChild={isChild}
        lang={lang}
        listeners={listeners}
        attributes={attributes}
        activeChildTrack={activeChildTrack}
        tracks={tracks}
        sequencer={sequencer}
      />

      <DawStepGrid
        beatGroups={beatGroups}
        track={track}
        effectiveTrack={effectiveTrack}
        inst={inst}
        activePattern={activePattern}
        masterActivePattern={masterActivePattern}
        isGhostStep={isGhostStep}
        isLeftHanded={isLeftHanded}
        tracks={tracks}
        currentMeasure={currentMeasure}
        sequencer={sequencer}
        handleStepClick={handleStepClick}
        registerStepRef={registerStepRef}
      />
    </div>
  );
};
