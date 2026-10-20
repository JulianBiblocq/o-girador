/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { InstrumentAddPickerPopover } from '../InstrumentAddPickerPopover';
import { InstrumentHeaderContextMenu } from '../InstrumentHeaderContextMenu';
import { CordelContextMenu, CordelMenuItem } from '../../ui/CordelContextMenu';
import { EditorCloudLoadModal, EditorCloudLoadModalProps } from './EditorCloudLoadModal';
import { EditorCloudSaveModal, EditorCloudSaveModalProps } from './EditorCloudSaveModal';
import { Pattern } from '../../../types';

export interface EditorModalsAndMenusProps {
  loadModalProps: EditorCloudLoadModalProps;
  saveModalProps: EditorCloudSaveModalProps;
  toastMessage: string | null;
  contextMenuPos: { trackId: number; x: number; y: number } | null;
  handleCloseContextMenu: () => void;
  isAddPickerOpen: boolean;
  addPickerAnchorRect: DOMRect | null;
  handleAddInstrumentFromRibbon: (instrumentIdx: number) => void;
  handleCloseAddPicker: () => void;
  patternCardContextMenu: { pattern: Pattern; x: number; y: number } | null;
  getPatternCardMenuItems: (ptn: Pattern) => CordelMenuItem[];
  setPatternCardContextMenu: (val: { pattern: Pattern; x: number; y: number } | null) => void;
  lang: string;
}

export const EditorModalsAndMenus: React.FC<EditorModalsAndMenusProps> = React.memo((props) => {
  const {
    loadModalProps, saveModalProps, toastMessage, contextMenuPos, handleCloseContextMenu,
    isAddPickerOpen, addPickerAnchorRect, handleAddInstrumentFromRibbon, handleCloseAddPicker,
    patternCardContextMenu, getPatternCardMenuItems, setPatternCardContextMenu, lang,
  } = props;

  return (
    <>
      <EditorCloudLoadModal {...loadModalProps} />
      <EditorCloudSaveModal {...saveModalProps} />

      {toastMessage && (
        <div className="fixed bottom-8 right-8 bg-[#8b2a1a] text-[#f4ecd8] font-cactus font-bold text-lg px-6 py-3 rounded-sm shadow-[4px_4px_0px_rgba(0,0,0,1)] z-[100] animate-bounce">
          {toastMessage}
        </div>
      )}

      {contextMenuPos && (
        <InstrumentHeaderContextMenu
          trackId={contextMenuPos.trackId}
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          onClose={handleCloseContextMenu}
        />
      )}

      {isAddPickerOpen && (
        <InstrumentAddPickerPopover
          anchorRect={addPickerAnchorRect}
          onSelectInstrument={handleAddInstrumentFromRibbon}
          onClose={handleCloseAddPicker}
        />
      )}

      {patternCardContextMenu && (
        <CordelContextMenu
          x={patternCardContextMenu.x}
          y={patternCardContextMenu.y}
          title={patternCardContextMenu.pattern.name || (lang === 'fr' ? 'Motif' : 'Padrão')}
          items={getPatternCardMenuItems(patternCardContextMenu.pattern)}
          onClose={() => setPatternCardContextMenu(null)}
        />
      )}
    </>
  );
});

EditorModalsAndMenus.displayName = 'EditorModalsAndMenus';
