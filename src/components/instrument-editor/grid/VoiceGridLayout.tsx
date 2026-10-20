/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { VocalGrooveNudgeControl } from '../../voice/VocalGrooveNudgeControl';
import { VoiceAnacrusisSection } from '../../voice/VoiceAnacrusisSection';
import { VoicePatternGridSection } from '../VoicePatternGridSection';
import { PatternMeasureHeaderBar } from './PatternMeasureHeaderBar';
import { VoiceKaraokePreview } from './VoiceKaraokePreview';
import { VoiceGridLayoutProps } from './voiceGridLayoutTypes';

export type { VoiceGridLayoutProps };

export const VoiceGridLayout: React.FC<VoiceGridLayoutProps> = (p) => {
  return (
    <div className="flex flex-col w-full gap-2">
      <VocalGrooveNudgeControl trackId={p.trackId} pattern={p.pattern} lang={p.lang} />

      <VoiceAnacrusisSection
        pattern={p.pattern}
        trackId={p.trackId}
        lang={p.lang}
        selectedPatternId={p.selectedPatternId}
        selectedStepIdx={p.selectedStepIdx}
        selectedStepIsPreRoll={p.selectedStepIsPreRoll}
        selectedStepRange={p.selectedStepRange}
        preRollLengthComputed={p.preRollLengthComputed}
        isStepInRange={p.isStepInRange}
        handleVoicePreRollStepClear={p.handleVoicePreRollStepClear}
        handleVoicePreRollMouseDown={p.handleVoicePreRollMouseDown}
        handleVoiceContextMenu={p.handleVoiceContextMenu}
        handleVoicePreRollSylChange={p.handleVoicePreRollSylChange}
        handleVoiceNoteChange={p.handleVoiceNoteChange}
        handleVoicePreRollNoteBlur={p.handleVoicePreRollNoteBlur}
        handleVoiceFocusStep={p.handleVoiceFocusStep}
        handleVoiceNav={p.handleVoiceNav}
        focusVoiceStep={p.focusVoiceStep}
      />

      <PatternMeasureHeaderBar
        steps={p.pattern.steps}
        patternId={p.pattern.id}
        trackId={p.trackId}
        lang={p.lang}
        onStepsChange={p.handleTrackStepsChange}
      />

      <div
        className="main-measure-section flex flex-col gap-3 w-full"
        id={`detail-voice-${p.trackId}-${p.pattern.id}`}
        onTouchMove={p.handleGridTouchMove}
        onTouchEnd={p.handleGridTouchEnd}
      >
        <VoicePatternGridSection
          trackId={p.trackId}
          pattern={p.pattern}
          timeSig={p.timeSig}
          lang={p.lang}
          isTupletEditMode={p.isTupletEditMode}
          selectedPatternId={p.selectedPatternId}
          selectedStepIdx={p.selectedStepIdx}
          selectedStepIsPreRoll={p.selectedStepIsPreRoll}
          selectedStepRange={p.selectedStepRange}
          isMultiSelectActive={p.isMultiSelectActive}
          preRollLengthComputed={p.preRollLengthComputed}
          swingOffsets={p.swingOffsets}
          isStepInRange={p.isStepInRange}
          handlePatternBeatResolutionChange={p.handlePatternBeatResolutionChange}
          handleSetPatternAllBeatsResolution={p.handleSetPatternAllBeatsResolution}
          handleDeletePatternMeasure={p.handleDeletePatternMeasure}
          handleVoiceStepClear={p.handleVoiceStepClear}
          handleVoiceTouchStart={p.handleVoiceTouchStart}
          handleVoiceMouseDown={p.handleVoiceMouseDown}
          handleVoiceMouseEnter={p.handleVoiceMouseEnter}
          handleVoiceTypeToggle={p.handleVoiceTypeToggle}
          handleVoiceSylChange={p.handleVoiceSylChange}
          handleVoiceNoteChange={p.handleVoiceNoteChange}
          handleVoiceNoteBlur={p.handleVoiceNoteBlur}
          handleVoiceFocusStep={p.handleVoiceFocusStep}
          handleVoiceContextMenu={p.handleVoiceContextMenu}
          handleSelectStepForSculpt={p.handleSelectStepForSculpt}
          handleVoiceNav={p.handleVoiceNav}
          focusVoiceStep={p.focusVoiceStep}
        />

        <VoiceKaraokePreview pattern={p.pattern} lang={p.lang} />
      </div>
    </div>
  );
};
