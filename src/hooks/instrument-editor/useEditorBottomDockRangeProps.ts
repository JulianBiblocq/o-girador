import { useMemo } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';

export function useEditorBottomDockRangeProps(params: {
  effectiveEditTrackId: number;
  activePatternId: number;
  editorState: any;
  canPasteRange: boolean;
  clearStepSelection: () => void;
}) {
  const { effectiveEditTrackId, activePatternId, editorState, canPasteRange, clearStepSelection } = params;

  return useMemo(() => {
    const buildArgs = () => ({
      trackId: effectiveEditTrackId,
      patternId: activePatternId,
      variationId: editorState.selectedVariationId,
      selectedStepIndices: editorState.selectedStepIndices,
      selectedStepIdx: editorState.selectedStepIdx,
    });

    return {
      isMultiSelectActive: editorState.isMultiSelectActive,
      selectionCount: editorState.selectedStepIndices.length,
      canPasteRange,
      handleDockSelectTool: (tool: string) => {
        editorState.setIsAlternating(false);
        editorState.setActiveTool(tool);
        if (editorState.isMultiSelectActive || editorState.selectedStepIndices.length > 0) {
          editorState.setIsMultiSelectActive(false);
          editorState.setSelectedStepIndices([]);
        }
      },
      onDisableAlternating: () => editorState.setIsAlternating(false),
      onToggleMultiSelect: () => {
        editorState.setIsMultiSelectActive((prev: boolean) => {
          if (prev) editorState.setSelectedStepIndices([]);
          return !prev;
        });
      },
      onExitMultiSelect: clearStepSelection,
      onDuplicateRange: () => {
        const next = useSequencerStore.getState().duplicateEditorStepsSelection(buildArgs());
        if (next?.length) {
          editorState.setSelectedStepIdx(next[0]);
          editorState.setSelectedStepIndices(next);
          editorState.setSelectedSubIndex(null);
        }
      },
      onCopyRange: () => {
        useSequencerStore.getState().copyEditorStepsSelection(buildArgs());
        editorState.setIsMultiSelectActive(true);
      },
      onCutRange: () => {
        const anchor = useSequencerStore.getState().cutEditorStepsSelection(buildArgs());
        if (anchor !== null) {
          editorState.setIsMultiSelectActive(true);
          editorState.setSelectedStepIdx(anchor);
          editorState.setSelectedStepIndices([]);
          editorState.setSelectedSubIndex(null);
        }
      },
      onPasteRange: () => {
        const pasted = useSequencerStore.getState().pasteEditorStepsClipboard(buildArgs());
        if (pasted?.length) {
          editorState.setSelectedStepIdx(pasted[0]);
          editorState.setSelectedStepIndices(pasted);
          editorState.setSelectedSubIndex(null);
        }
      },
      onClearRange: () => {
        useSequencerStore.getState().clearEditorStepsSelection(buildArgs());
      },
    };
  }, [effectiveEditTrackId, activePatternId, editorState, canPasteRange, clearStepSelection]);
}
