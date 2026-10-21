/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X } from 'lucide-react';
import { PresetAccordionSelector } from '../PresetAccordionSelector';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  localPresets: any[];
  cloudPresets: any[];
  activePreset: string;
  onPresetChange: (val: string) => void;
  lang: 'fr' | 'pt';
}

export const MobileSongPickerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  localPresets,
  cloudPresets,
  activePreset,
  onPresetChange,
  lang,
}) => {
  if (!isOpen) return null;

  const publicPresets = cloudPresets.filter((p) => p.visibility !== 'group' && p.visibility !== 'private');
  const privatePresets = cloudPresets.filter((p) => p.visibility === 'group' || p.visibility === 'private');

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 backdrop-blur-xs select-none">
      <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-2.5 border-b-2 border-[var(--cordel-border)] flex items-center justify-between bg-[var(--cordel-surface)]">
          <span className="font-cactus font-bold text-xs uppercase tracking-wider text-[var(--cordel-text)]">
            {lang === 'pt' ? 'Escolher uma música' : 'Choisir un morceau'}
          </span>
          <button onClick={onClose} className="p-1 text-[var(--cordel-text)] hover:text-[#b94a2c]" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>
        <div className="p-2 overflow-y-auto flex-1">
          <PresetAccordionSelector
            lang={lang}
            activePreset={activePreset}
            publicCloudPresets={publicPresets}
            privateCloudPresets={privatePresets}
            localPresets={localPresets}
            isCloudPresetsLoading={false}
            showGroupCatalogue={privatePresets.length > 0}
            groupLabel="Groupe"
            onSelectPreset={(val) => { onPresetChange(val); onClose(); }}
          />
        </div>
      </div>
    </div>
  );
};
