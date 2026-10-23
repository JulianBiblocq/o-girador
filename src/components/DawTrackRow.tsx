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
import { areDawTrackRowPropsEqual } from './daw/dawTrackRowComparator';

import type { DawTrackRowProps } from './daw/dawTrackRowTypes';
export type { DawTrackRowProps };


const DawTrackRowComponent: React.FC<DawTrackRowProps> = ({
  track, trackIdx, tracks, currentMeasure, defaultBeats, lang,
  isLeftHanded, sequencer, handleStepClick, registerStepRef, trackResolutionsRef,
}) => {
  const isLinkedSlave = !!(track.linkedToTrackId && !track.isLinkFolder && !track.isLinkMaster);
  const isChild = isLinkedSlave || isToadaChild(track, tracks);
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
    borderLeft: busColor ? `4px solid ${busColor}` : '4px solid var(--cordel-border, #1a1a1a)',
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
  const inst = effectiveTrack ? instrumentsConfig[effectiveTrack.instrumentIdx] : (isToada ? instrumentsConfig.find(i => i.id === 'puxador' || i.type === 'voice') : null);

  const { activePattern, masterActivePattern, isGhostStep } = resolveDawPattern({
    track, tracks, currentMeasure, effectiveTrack, isLinkedSlave,
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

  if (!inst) return <div className="w-full h-[52px] min-h-[52px] max-h-[52px] shrink-0" />;
  const displayName = isToada ? 'Toada' : (isChild ? `↳ ${getTrackDisplayName(track, tracks)}` : getTrackDisplayName(track, tracks));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center w-full h-[52px] min-h-[52px] max-h-[52px] justify-start shrink-0 text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] rounded-none bg-[#f4ecd8] dark:bg-[#e2d7c0] px-2 py-0.5 relative overflow-hidden z-[1] select-none"
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

export const DawTrackRow = React.memo(DawTrackRowComponent, areDawTrackRowPropsEqual);
