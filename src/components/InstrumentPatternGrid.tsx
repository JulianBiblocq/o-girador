import React from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { InstrumentPatternGridProps } from './instrument-editor/grid/gridTypes';
import { PatternGridShiftToolbar } from './instrument-editor/grid/PatternGridShiftToolbar';
import { VoiceGridLayout } from './instrument-editor/grid/VoiceGridLayout';
import { PercussionGridLayout } from './instrument-editor/grid/PercussionGridLayout';
import { GridCursorStrokeBadge } from './instrument-editor/grid/GridCursorStrokeBadge';
import { VoiceStepContextMenuModal } from './instrument-editor/grid/VoiceStepContextMenuModal';
import { getGridScopedStyles } from './instrument-editor/grid/gridStyles';
import { useGridOrchestrator } from '../hooks/instrument-editor/useGridOrchestrator';
import { useGridShiftShortcuts } from '../hooks/instrument-editor/useGridShiftShortcuts';

export { VoiceStepCell, type VoiceStepCellProps } from './instrument-editor/grid/VoiceStepCell';
export { PercussionStepCell } from './instrument-editor/grid/PercussionStepCell';
export { SCISSORS_CURSOR, GLUE_CURSOR } from './instrument-editor/grid/gridConstants';
export type { InstrumentPatternGridProps };

const EMPTY_STEP_INDICES: number[] = [];

const InstrumentPatternGridComponent: React.FC<InstrumentPatternGridProps> = (props) => {
  const o = useGridOrchestrator(props);
  const percussionZoneRef = React.useRef<HTMLDivElement | null>(null);
  useGridShiftShortcuts({ trackId: props.trackId, patternId: props.pattern.id, selectedPatternId: props.selectedPatternId });
  const isActiveMainGrid = props.selectedPatternId === props.pattern.id && props.selectedVariationId === null;
  const isSelectedVoiceGrid = props.selectedPatternId === props.pattern.id;

  return (
    <div
      ref={o.gridRef}
      className="w-full flex flex-col gap-2"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('.step-cell, .voice-step-cell, [data-step-type="voice"], [data-step-index], button, input, select')) {
          return;
        }
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          useSequencerStore.getState().setSelectedStepRange(null);
        }
      }}
    >
      <style>{getGridScopedStyles(props.activeTool)}</style>

      <PatternGridShiftToolbar trackId={props.trackId} patternId={props.pattern.id} lang={o.lang} />

      {props.instrument.type === 'voice' ? (
        <VoiceGridLayout
          trackId={props.trackId}
          pattern={props.pattern}
          timeSig={o.timeSig}
          lang={o.lang}
          isTupletEditMode={props.isTupletEditMode}
          selectedPatternId={props.selectedPatternId}
          selectedStepIdx={isSelectedVoiceGrid ? props.selectedStepIdx : null}
          selectedStepIsPreRoll={isSelectedVoiceGrid ? props.selectedStepIsPreRoll : false}
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
        <>
          <PercussionGridLayout
            gridZoneRef={percussionZoneRef}
            trackId={props.trackId}
            pattern={props.pattern}
            instrument={props.instrument}
            isTupletEditMode={props.isTupletEditMode}
            selectedStepIndices={isActiveMainGrid ? props.selectedStepIndices : EMPTY_STEP_INDICES}
            selectedStepIdx={isActiveMainGrid ? props.selectedStepIdx : null}
            selectedSubIndex={isActiveMainGrid ? o.selectedSubIndex : null}
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
          <GridCursorStrokeBadge
            gridZoneRef={percussionZoneRef}
            instrument={props.instrument}
            activeTool={props.activeTool}
            isMultiSelectActive={props.isMultiSelectActive}
            isTupletEditMode={props.isTupletEditMode}
          />
        </>
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
