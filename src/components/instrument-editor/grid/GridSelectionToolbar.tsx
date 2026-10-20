/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface GridSelectionToolbarProps {
  lang: string;
  selectedStepIndices: number[];
  hasClipboard: boolean;
  isMultiSelectActive: boolean;
  onCopyRelative: () => void;
  onCancelSelection: () => void;
  onPasteRelative: () => void;
  onToggleMultiSelect: () => void;
}

export const GridSelectionToolbar: React.FC<GridSelectionToolbarProps> = ({
  lang,
  selectedStepIndices,
  hasClipboard,
  isMultiSelectActive,
  onCopyRelative,
  onCancelSelection,
  onPasteRelative,
  onToggleMultiSelect
}) => {
  return (
    <div className="flex justify-between items-center bg-[#f4ecd8] border-b border-[#1a1a1a]/20 pb-1.5 mb-2 text-[10px] font-bold w-full select-none">
      <span className="text-[#666] uppercase tracking-wider">
        {lang === 'fr' ? 'Multi-sélection' : 'Multi-selection'}
      </span>
      <div className="flex gap-1.5 items-center">
        {selectedStepIndices.length > 0 && (
          <>
            <button
              onClick={onCopyRelative}
              className="px-1.5 py-0.5 bg-[#8b2a1a] text-[#f4ecd8] rounded border border-[#1a1a1a] text-[8px] cursor-pointer font-bold hover:bg-[#a63d2d] transition-colors"
            >
              {lang === 'fr' ? 'Copier' : 'Copy'} ({selectedStepIndices.length})
            </button>
            <button
              onClick={onCancelSelection}
              className="px-1.5 py-0.5 bg-[#8b2a1a] text-[#f4ecd8] rounded border border-[#1a1a1a] text-[8px] cursor-pointer font-bold hover:bg-[#a63d2d] transition-colors"
            >
              {lang === 'fr' ? 'Annuler' : 'Cancel'}
            </button>
          </>
        )}
        {hasClipboard && selectedStepIndices.length === 1 && (
          <button
            onClick={onPasteRelative}
            className="px-1.5 py-0.5 bg-[#1e824c] text-white rounded border border-[#1a1a1a] text-[8px] cursor-pointer font-bold hover:bg-[#27ae60] transition-colors"
          >
            {lang === 'fr' ? 'Coller' : 'Paste'}
          </button>
        )}
        <button
          onClick={onToggleMultiSelect}
          className={`px-1.5 py-0.5 rounded border border-[#1a1a1a] text-[9px] cursor-pointer font-bold ${
            isMultiSelectActive ? 'bg-blue-600 text-white' : 'bg-transparent text-[#1a1a1a]'
          }`}
        >
          {isMultiSelectActive 
            ? (lang === 'fr' ? 'Mode Normal' : 'Normal Mode') 
            : (lang === 'fr' ? 'Multi-sél. Off' : 'Multi-sel. Off')}
        </button>
      </div>
    </div>
  );
};
