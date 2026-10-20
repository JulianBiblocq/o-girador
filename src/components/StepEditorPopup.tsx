/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTimelineEditStore } from '../stores/useTimelineEditStore';
import { useSequencer } from '../contexts/SequencerContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { instrumentsConfig } from '../data';
import { useStepEditorShortcuts } from './daw/useStepEditorShortcuts';
import { useStepEditorAction } from './daw/useStepEditorAction';
import { StepEditorSplitHeader } from './daw/StepEditorSplitHeader';
import { StepEditorStrokeGrid } from './daw/StepEditorStrokeGrid';

export const StepEditorPopup: React.FC = () => {
  const popupRef = useRef<HTMLDivElement>(null);
  const sequencer = useSequencer();
  
  const {
    activeStepKey, anchorRect, allowedStrokes, currentVal,
    trackId, patternId, measureIdx, stepIdx, closeEditor
  } = useTimelineEditStore();

  const tracks = useSequencerStore(state => state.tracks);
  const track = tracks.find(t => t.id === trackId);
  const pattern = track?.patterns.find(p => p.id === patternId);
  
  const liveCurrentVal = (pattern && stepIdx !== null && pattern.steps[stepIdx] !== undefined) 
    ? pattern.steps[stepIdx] 
    : currentVal;

  const inst = track ? instrumentsConfig[track.instrumentIdx] : null;
  const isLeftHanded = useSequencerStore(state => state.isLeftHanded) || false;
  const lang = useSequencerStore(state => state.lang);

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isSplitMode, setIsSplitMode] = useState<boolean>(false);
  const [editingHalf, setEditingHalf] = useState<0 | 1>(0);
  const subIndex = useTimelineEditStore(s => s.subIndex);

  useEffect(() => {
    setIsExpanded(false);
    setIsSplitMode(Array.isArray(liveCurrentVal));
    setEditingHalf(subIndex !== null ? subIndex : 0);
  }, [activeStepKey]);

  const { loadingStroke, handleSelectStroke, forcedStrokes, activeStrokesForTrack } = useStepEditorAction({
    trackId, patternId, stepIdx, isSplitMode, liveCurrentVal,
    editingHalf, setEditingHalf, closeEditor, inst, setIsExpanded
  });

  const choicesToShow = allowedStrokes.filter(stroke => {
    if (isExpanded) return true;
    const forced = forcedStrokes[`${trackId}:${stroke}`];
    const isActive = forced !== undefined ? forced : activeStrokesForTrack.some(s => s.toLowerCase() === String(stroke).toLowerCase());
    if (Array.isArray(liveCurrentVal)) {
      if (String(liveCurrentVal[0]) === String(stroke) || String(liveCurrentVal[1]) === String(stroke)) return true;
    } else if (String(liveCurrentVal) === String(stroke)) {
      return true;
    }
    return isActive;
  });

  useStepEditorShortcuts({
    activeStepKey, trackId, patternId, stepIdx, allowedStrokes, popupRef, closeEditor,
    handleSelectStroke, handleSilence: () => handleSelectStroke(0)
  });

  if (!activeStepKey || !anchorRect || trackId === null || patternId === null || measureIdx === null || stepIdx === null) {
    return null;
  }

  const popupWidth = 140;
  const top = anchorRect.bottom + window.scrollY + 6;
  const idealX = (anchorRect.left + window.scrollX) * 0.7 + (window.innerWidth / 2 - popupWidth / 2) * 0.3;
  const left = Math.max(10, Math.min(window.innerWidth - popupWidth - 10, idealX));

  return ReactDOM.createPortal(
    <div
      ref={popupRef}
      className="fixed z-50 border-black border-2 shadow-[2px_2px_0px_rgba(0,0,0,1)] rounded-none bg-[#f4ecd8] p-2 flex flex-col gap-1.5 w-[140px] font-cactus"
      style={{ top: `${top}px`, left: `${left}px` }}
    >
      <StepEditorSplitHeader
        isSplitMode={isSplitMode}
        lang={lang}
        onToggleSplit={() => {
          if (isSplitMode) {
            setIsSplitMode(false);
            sequencer.handleTrackStepValueChange(trackId, patternId, stepIdx, Array.isArray(liveCurrentVal) ? liveCurrentVal[0] : liveCurrentVal);
          } else {
            setIsSplitMode(true);
            const defaultStroke = allowedStrokes[0];
            sequencer.handleTrackStepValueChange(trackId, patternId, stepIdx, [liveCurrentVal || defaultStroke, defaultStroke]);
          }
        }}
        editingHalf={editingHalf}
        onSelectHalf={setEditingHalf}
        liveCurrentVal={liveCurrentVal}
        inst={inst}
        isLeftHanded={isLeftHanded}
        allowedStrokes={allowedStrokes}
      />
      <StepEditorStrokeGrid
        choicesToShow={choicesToShow}
        isSplitMode={isSplitMode}
        liveCurrentVal={liveCurrentVal}
        editingHalf={editingHalf}
        loadingStroke={loadingStroke}
        inst={inst}
        isLeftHanded={isLeftHanded}
        allowedStrokesCount={allowedStrokes.length}
        isExpanded={isExpanded}
        onExpand={() => setIsExpanded(true)}
        onSelectStroke={handleSelectStroke}
        lang={lang}
      />
    </div>,
    document.body
  );
};
