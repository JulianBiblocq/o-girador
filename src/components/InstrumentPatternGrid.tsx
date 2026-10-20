/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { InstrumentPatternGridProps } from './instrument-editor/grid/gridTypes';
import { GridSelectionToolbar } from './instrument-editor/grid/GridSelectionToolbar';
import { VoiceGridLayout } from './instrument-editor/grid/VoiceGridLayout';
import { PercussionGridLayout } from './instrument-editor/grid/PercussionGridLayout';
import { VoiceStepContextMenuModal } from './instrument-editor/grid/VoiceStepContextMenuModal';
import { getGridScopedStyles } from './instrument-editor/grid/gridStyles';
import { useGridOrchestrator } from '../hooks/instrument-editor/useGridOrchestrator';

export { VoiceStepCell, type VoiceStepCellProps } from './instrument-editor/grid/VoiceStepCell';
export { PercussionStepCell } from './instrument-editor/grid/PercussionStepCell';
export { SCISSORS_CURSOR, GLUE_CURSOR } from './instrument-editor/grid/gridConstants';
export type { InstrumentPatternGridProps };

const InstrumentPatternGridComponent: React.FC<InstrumentPatternGridProps> = (props) => {
  const o = useGridOrchestrator(props);
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  return (
    <div
      ref={o.gridRef}
      className="w-full flex flex-col gap-2"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('.step-cell, .voice-step-cell, [data-step-type="voice"], [data-step-index]')) {
          return;
        }
        if (!e.shiftKey) useSequencerStore.getState().setSelectedStepRange(null);
      }}
    >
      <style>{getGridScopedStyles(props.activeTool)}</style>

      {isTouchDevice && (
        <GridSelectionToolbar
          lang={o.lang}
          selectedStepIndices={props.selectedStepIndices}
          hasClipboard={o.hasClipboard}
          isMultiSelectActive={props.isMultiSelectActive}
          onCopyRelative={o.onCopyRelative}
          onCancelSelection={() => props.setSelectedStepIndices([])}
          onPasteRelative={o.onPasteRelative}
          onToggleMultiSelect={() => {
            props.setIsMultiSelectActive(!props.isMultiSelectActive);
            props.setSelectedStepIndices([]);
          }}
        />
      )}

      {props.instrument.type === 'voice' ? (
        <VoiceGridLayout
          trackId={props.trackId}
          pattern={props.pattern}
          timeSig={o.timeSig}
          lang={o.lang}
          isTupletEditMode={props.isTupletEditMode}
          selectedPatternId={props.selectedPatternId}
          selectedStepIdx={props.selectedStepIdx}
          selectedStepIsPreRoll={props.selectedStepIsPreRoll}
          selectedStepRange={o.selectedStepRange}
          isMultiSelectActive={props.isMultiSelectActive}
          preRollLengthComputed={o.preRollLengthComputed}
          swingOffsets={o.swingOffsets}
          isStepInRange={o.isStepInRange}
          handlePatternBeatResolutionChange={o.handlePatternBeatResolutionChange}
          handleSetPatternAllBeatsResolution={o.handleSetPatternAllBeatsResolution}
          handleDeletePatternMeasure={o.handleDeletePatternMeasure}
          handleVoiceStepClear={o.handleVoiceStepClear}
          handleVoicePreRollStepClear={o.handleVoicePreRollStepClear}
          handleVoiceTouchStart={o.handleVoiceTouchStart}
          handleVoiceMouseDown={o.handleVoiceMouseDown}
          handleVoiceMouseEnter={o.handleVoiceMouseEnter}
          handleVoicePreRollMouseDown={o.handleVoicePreRollMouseDown}
          handleVoiceContextMenu={o.handleVoiceContextMenu}
          handleVoiceTypeToggle={o.handleVoiceTypeToggle}
          handleVoiceSylChange={o.handleVoiceSylChange}
          handleVoicePreRollSylChange={o.handleVoicePreRollSylChange}
          handleVoiceNoteChange={o.handleVoiceNoteChange}
          handleVoiceNoteBlur={o.handleVoiceNoteBlur}
          handleVoicePreRollNoteBlur={o.handleVoicePreRollNoteBlur}
          handleVoiceFocusStep={o.handleVoiceFocusStep}
          handleSelectStepForSculpt={o.handleSelectStepForSculpt}
          handleVoiceNav={o.handleVoiceNav}
          focusVoiceStep={o.focusVoiceStep}
          handleTrackStepsChange={o.handleTrackStepsChange}
          handleGridTouchMove={o.handleGridTouchMove}
          handleGridTouchEnd={o.handleGridTouchEnd}
        />
      ) : (
        <PercussionGridLayout
          trackId={props.trackId}
          pattern={props.pattern}
          instrument={props.instrument}
          isTupletEditMode={props.isTupletEditMode}
          selectedStepIndices={props.selectedStepIndices}
          selectedStepIdx={props.selectedStepIdx}
          selectedSubIndex={o.selectedSubIndex}
          activeTool={props.activeTool}
          isMultiSelectActive={props.isMultiSelectActive}
          swingOffsets={o.swingOffsets}
          activeVigilanceFocus={o.activeVigilanceFocus}
          handlePatternBeatResolutionChange={o.handlePatternBeatResolutionChange}
          handleGridTouchMove={o.handleGridTouchMove}
          handleGridTouchEnd={o.handleGridTouchEnd}
          handleCellTouchMove={o.handleCellTouchMove}
          handleCellTouchEnd={o.handleCellTouchEnd}
          handleCellMouseDown={o.handleCellMouseDown}
          handleCellMouseEnter={o.handleCellMouseEnter}
          handleCellTouchStart={o.handleCellTouchStart}
          handleCellContextMenu={o.handleCellContextMenu}
          handleCellChange={o.handleCellChange}
          handleCellKeyDown={o.handleCellKeyDown}
          handleSelectStepForSculpt={o.handleSelectStepForSculpt}
        />
      )}

      <VoiceStepContextMenuModal
        contextMenu={o.contextMenu}
        onClose={() => o.setContextMenu(null)}
        trackId={props.trackId}
        patternId={props.pattern.id}
        lang={o.lang}
        onClearStep={o.handleVoiceStepClear}
      />
    </div>
  );
};

export const InstrumentPatternGrid = React.memo(InstrumentPatternGridComponent);
