
import React from 'react';
import { VoicePianoDock } from '../../VoicePianoDock';
import { StrokeWritingDock } from '../StrokeWritingDock';
import { Language } from '../../../types';

export interface EditorBottomDockBarProps {
  isVocalContext: boolean;
  effectiveEditTrackId: number;
  patternId: number;
  selectedStepIdx: number | null;
  setSelectedStepIdx: React.Dispatch<React.SetStateAction<number | null>>;
  selectedStepIsPreRoll: boolean;
  setSelectedStepIsPreRoll: React.Dispatch<React.SetStateAction<boolean>>;
  lang: Language;
  patternSteps: number;
  inst: any;
  isLeftHanded: boolean;
  activeTool: string;
  handleDockSelectTool: (tool: string) => void;
  isAlternating: boolean;
  onToggleAlternating: () => void;
  onOpenBottomSheet: () => void;
}

export const EditorBottomDockBar: React.FC<EditorBottomDockBarProps> = React.memo((props) => {
  const {
    isVocalContext, effectiveEditTrackId, patternId, selectedStepIdx,
    setSelectedStepIdx, selectedStepIsPreRoll, setSelectedStepIsPreRoll,
    lang, patternSteps, inst, isLeftHanded, activeTool, handleDockSelectTool,
    isAlternating, onToggleAlternating, onOpenBottomSheet,
  } = props;

  return (
    <div className="relative z-10 shrink-0">
      {isVocalContext ? (
        <VoicePianoDock
          trackId={effectiveEditTrackId}
          patternId={patternId}
          selectedStepIdx={selectedStepIdx}
          setSelectedStepIdx={setSelectedStepIdx}
          selectedStepIsPreRoll={selectedStepIsPreRoll}
          setSelectedStepIsPreRoll={setSelectedStepIsPreRoll}
          lang={lang}
          patternSteps={patternSteps}
        />
      ) : (
        <StrokeWritingDock
          trackId={effectiveEditTrackId}
          instrument={inst}
          lang={lang}
          isLeftHanded={isLeftHanded}
          activeTool={activeTool}
          onSelectTool={handleDockSelectTool}
          isAlternating={isAlternating}
          onToggleAlternating={onToggleAlternating}
          onOpenBottomSheet={onOpenBottomSheet}
        />
      )}
    </div>
  );
});

EditorBottomDockBar.displayName = 'EditorBottomDockBar';
