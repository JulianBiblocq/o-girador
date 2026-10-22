/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Conteneur d'accordéons pour réglages et galerie Signes du Mestre (< 80 lignes).
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FolderOpen } from 'lucide-react';
import { CordelOptions } from '../../../utils/cordelEffect';
import { CloudRhythmSignal } from '../../../types';
import { MobileSignalLightAccordion } from './MobileSignalLightAccordion';
import { MobileSignalFramingAccordion } from './MobileSignalFramingAccordion';
import { MobileMestreSignalGallery } from './MobileMestreSignalGallery';
import { PhotoLabPresetsBar } from './PhotoLabPresetsBar';
import { tMobile } from '../../../i18n/mobileTranslations';

interface Props {
  options: CordelOptions;
  onUpdateOptions: (patch: Partial<CordelOptions>) => void;
  onSelectSignal: (signal: CloudRhythmSignal) => void;
  onCopyStyle: (options: CordelOptions) => void;
  selectedSignalId?: string | null;
  signalsCount?: number;
  lang: 'fr' | 'pt';
}

export const MobileSignalSettingsAccordion: React.FC<Props> = ({
  options, onUpdateOptions, onSelectSignal, onCopyStyle, selectedSignalId, signalsCount = 0, lang,
}) => {
  const [openSection, setOpenSection] = useState<'light' | 'framing' | 'gallery' | null>('light');

  const toggleSection = (s: 'light' | 'framing' | 'gallery') => {
    setOpenSection((prev) => (prev === s ? null : s));
  };

  const handlePickSignal = (sig: CloudRhythmSignal) => {
    onSelectSignal(sig);
    setOpenSection(null); // Replie la galerie pour voir l'aperçu héro géant
  };

  return (
    <div className="flex flex-col gap-2 w-full text-xs font-mono select-none">
      <PhotoLabPresetsBar
        currentOptions={options}
        onApplyOptions={onCopyStyle}
        lang={lang}
      />
      <MobileSignalLightAccordion
        isOpen={openSection === 'light'}
        onToggle={() => toggleSection('light')}
        options={options}
        onUpdate={onUpdateOptions}
        lang={lang}
      />
      <MobileSignalFramingAccordion
        isOpen={openSection === 'framing'}
        onToggle={() => toggleSection('framing')}
        options={options}
        onUpdate={onUpdateOptions}
        lang={lang}
      />

      {/* Accordéon 3 : Galerie des Signes */}
      <div className="bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-border)] overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('gallery')}
          className="w-full p-2 flex items-center justify-between bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] font-cactus font-bold text-xs uppercase cursor-pointer"
        >
          <span className="flex items-center gap-1.5 truncate">
            <FolderOpen size={14} className="text-[#8b2a1a] shrink-0" />
            <span className="truncate">{tMobile(lang, 'signalGallery')} {signalsCount > 0 ? `(${signalsCount})` : ''}</span>
          </span>
          {openSection === 'gallery' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {openSection === 'gallery' && (
          <div className="p-2 border-t border-[var(--cordel-border)]/30 max-h-72 overflow-y-auto custom-scrollbar">
            <MobileMestreSignalGallery
              onSelectSignal={handlePickSignal}
              onCopyStyle={onCopyStyle}
              selectedSignalId={selectedSignalId}
              lang={lang}
            />
          </div>
        )}
      </div>
    </div>
  );
};
