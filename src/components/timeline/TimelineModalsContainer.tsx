import React from 'react';
import { SongSection, SongMarker, Language } from '../../types';
import { SongSectionModal } from './SongSectionModal';
import { SectionCollisionModal } from './SectionCollisionModal';
import { SongMarkerModal } from './SongMarkerModal';
import { StepEditorPopup } from '../StepEditorPopup';
import { TimelineContextMenu } from '../TimelineContextMenu';
import { TimelineInsertMeasuresModal } from './TimelineInsertMeasuresModal';
import { TimelinePatternPickerPopover } from '../TimelinePatternPickerPopover';

export interface TimelineModalsContainerProps {
  totalMeasures: number;
  lang: Language;
  hasAccess: (role: any) => boolean;
  sectionModal: {
    isOpen: boolean;
    onClose: () => void;
    editingSection: SongSection | null;
    onCreateSection: (name: string, start: number, end: number, color: string, repeat?: number, level?: number) => void;
    onUpdateSection: (id: string, name: string, start: number, end: number, color: string, level?: number) => void;
    onSaveCloudSection?: (sec: SongSection) => void;
    onLoadCloudSection?: (at: number) => void;
  };
  stretchConflict: {
    isOpen: boolean;
    section: SongSection | null;
    targetRange: { start: number; end: number } | null;
    onInsert: () => void;
    onOverwrite: () => void;
    onCancel: () => void;
  };
  markerModal: {
    isOpen: boolean;
    onClose: () => void;
    editingMarker: SongMarker | null;
    defaultMeasure: number;
    onCreateMarker: (name: string, measure: number, color: string) => void;
    onUpdateMarker: (id: string, name: string, measure: number, color: string) => void;
  };
  insertMeasuresPrompt: {
    isOpen: boolean;
    targetIdx: number | null;
    onClose: () => void;
    onInsertMeasure?: (mIdx: number, count: number) => void;
  };
  pickerState: {
    trackId: number;
    measureIdx: number;
    rect: DOMRect;
  } | null;
  onClosePicker: () => void;
}

export const TimelineModalsContainer: React.FC<TimelineModalsContainerProps> = React.memo(({
  totalMeasures, lang, hasAccess, sectionModal, stretchConflict, markerModal,
  insertMeasuresPrompt, pickerState, onClosePicker,
}) => {
  return (
    <>
      <SongSectionModal
        isOpen={sectionModal.isOpen}
        onClose={sectionModal.onClose}
        editingSection={sectionModal.editingSection}
        totalMeasures={totalMeasures}
        lang={lang}
        onCreateSection={sectionModal.onCreateSection}
        onUpdateSection={sectionModal.onUpdateSection}
        onSaveCloudSection={sectionModal.onSaveCloudSection}
        onLoadCloudSection={sectionModal.onLoadCloudSection}
      />

      <SectionCollisionModal
        isOpen={stretchConflict.isOpen}
        section={stretchConflict.section}
        targetRange={stretchConflict.targetRange}
        lang={lang}
        onInsert={stretchConflict.onInsert}
        onOverwrite={stretchConflict.onOverwrite}
        onCancel={stretchConflict.onCancel}
      />

      <SongMarkerModal
        isOpen={markerModal.isOpen}
        onClose={markerModal.onClose}
        editingMarker={markerModal.editingMarker}
        defaultMeasure={markerModal.defaultMeasure}
        totalMeasures={totalMeasures}
        lang={lang}
        onCreateMarker={markerModal.onCreateMarker}
        onUpdateMarker={markerModal.onUpdateMarker}
      />

      <StepEditorPopup />
      <TimelineContextMenu />

      <TimelineInsertMeasuresModal
        isOpen={insertMeasuresPrompt.isOpen}
        targetIdx={insertMeasuresPrompt.targetIdx}
        totalMeasures={totalMeasures}
        lang={lang}
        hasAccess={hasAccess}
        onClose={insertMeasuresPrompt.onClose}
        onInsertMeasure={insertMeasuresPrompt.onInsertMeasure}
      />

      {pickerState && (
        <TimelinePatternPickerPopover
          trackId={pickerState.trackId}
          measureIdx={pickerState.measureIdx}
          anchorRect={pickerState.rect}
          onClose={onClosePicker}
        />
      )}
    </>
  );
});
