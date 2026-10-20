/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { PaperVigilanceBanner } from './paper/PaperVigilanceBanner';
import { InstrumentEditorHeader } from './instrument-editor/header/InstrumentEditorHeader';
import { EditorPatternListColumn } from './instrument-editor/patterns/EditorPatternListColumn';
import { EditorAcousticDrawers } from './instrument-editor/drawers/EditorAcousticDrawers';
import { EditorBottomDockBar } from './instrument-editor/drawers/EditorBottomDockBar';
import { EditorModalsAndMenus } from './instrument-editor/drawers/EditorModalsAndMenus';
import { useInstrumentDetailEditorModel } from '../hooks/instrument-editor/useInstrumentDetailEditorModel';

export interface InstrumentDetailEditorProps {
  trackId: number;
  onClose: () => void;
  isMobile: boolean;
  isDetached?: boolean;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
  setEditingTrackId: (id: number | null) => void;
}

const InstrumentDetailEditorComponent: React.FC<InstrumentDetailEditorProps> = (props) => {
  const model = useInstrumentDetailEditorModel(props);
  if (!model.track) return null;

  const wrapperContent = (
    <div
      data-testid="instrument-detail-editor-modal"
      data-theme="light"
      data-instrument-detail-editor={model.isVocalContext ? 'voice' : 'percussion'}
      data-voice-editor={model.isVocalContext ? 'true' : 'false'}
      className={`bg-[#ece4d0] ${model.isDetached ? 'w-full h-full' : 'cordel-border-sm w-[95vw] max-w-7xl h-[calc(100%-0.5rem)] max-h-full'} text-[#1a1a1a] flex flex-col relative overflow-hidden`}
      style={model.isDetached ? { width: '100%', height: '100%', colorScheme: 'light' } : {
        maxWidth: model.isMobile ? '100%' : '80rem',
        width: model.isMobile ? '98vw' : '95vw',
        height: model.isMobile ? 'calc(100% - 0.25rem)' : 'calc(100% - 0.5rem)',
        maxHeight: '100%',
        boxShadow: '8px 8px 0px 0px #1a1a1a',
        colorScheme: 'light',
      }}
    >
      <div className="absolute inset-0 pointer-events-none z-0 wallpaper-surface-bg opacity-15" aria-hidden="true" />
      {model.isClosing && !model.isDetached && (
        <div className="absolute inset-0 bg-[#f4ecd8]/20 backdrop-blur-[0.5px] z-20 pointer-events-auto" />
      )}

      <InstrumentEditorHeader {...model.headerProps} />
      <PaperVigilanceBanner lang={model.lang} />

      <div className="w-full flex-1 flex overflow-hidden min-h-0 relative z-10" style={{ WebkitOverflowScrolling: 'touch' }}>
        <EditorPatternListColumn {...model.patternListProps} />
        <EditorAcousticDrawers {...model.acousticDrawersProps} />
      </div>

      <EditorBottomDockBar {...model.bottomDockProps} />
      <EditorModalsAndMenus {...model.modalsAndMenusProps} />
    </div>
  );

  if (model.isDetached) {
    return (
      <div className="w-full h-full relative overflow-hidden flex flex-col bg-[#ece4d0] text-[#1a1a1a]" data-theme="light" style={{ colorScheme: 'light' }}>
        {wrapperContent}
      </div>
    );
  }

  return createPortal(
    <div
      className="fixed top-[70px] bottom-0 left-0 right-0 z-[300] flex items-center justify-center p-2 sm:p-3"
      style={{ backgroundColor: 'rgba(0,0,0,0.72)', colorScheme: 'light' }}
      data-theme="light"
      onMouseDown={model.handleMouseDown}
      onMouseUp={model.handleMouseUp}
    >
      {wrapperContent}
    </div>,
    document.body
  );
};

export const InstrumentDetailEditor = React.memo(InstrumentDetailEditorComponent, (prevProps, nextProps) => {
  return (
    prevProps.trackId === nextProps.trackId &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.isDetached === nextProps.isDetached
  );
});
