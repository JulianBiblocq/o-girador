/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { TrackGroup } from '../../types';
import { isToadaBus, isToadaChild } from '../../stores/useSequencerStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { instrumentsConfig } from '../../data';
import { DawStepGrid } from '../daw/DawStepGrid';
import { resolveDawPattern, computeBeatGroups } from '../daw/dawStepMath';

interface WorkspacePistasRowProps {
  track: TrackGroup;
  tracks: TrackGroup[];
  currentMeasure: number;
  defaultBeats: number;
  isLeftHanded: boolean;
  sequencer: any;
  handleStepClick: (e: React.MouseEvent, trackId: number, activePattern: any, inst: any, stepIdx: number, currentVal: any) => void;
  registerStepRef: (trackId: number | string, stepIdx: number, el: HTMLButtonElement | null) => void;
  trackResolutionsRef: React.MutableRefObject<Record<string, { beats: number; resArray: number[]; totalSteps: number }>>;
}

export const WorkspacePistasRow: React.FC<WorkspacePistasRowProps> = ({
  track,
  tracks,
  currentMeasure,
  defaultBeats,
  isLeftHanded,
  sequencer,
  handleStepClick,
  registerStepRef,
  trackResolutionsRef,
}) => {
  const isLinkedSlave = Boolean(track.linkedToTrackId && !track.isLinkFolder && !track.isLinkMaster);
  const isToada = isToadaBus(track);

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

  if (!inst) return null;

  return (
    <div className="flex items-center w-full h-[53px] min-h-[53px] max-h-[53px] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] px-1.5 py-0.5 relative overflow-hidden bg-[#f4ecd8] dark:bg-[#e2d7c0] text-[#1a1a1a] shrink-0 select-none">
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
