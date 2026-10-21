/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Mode Éditeur Mobile unifié : Scan & Fiches vierges + Signes du Mestre (< 120 lignes).
 */

import React, { useState } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencer } from '../../contexts/SequencerContext';
import { tMobile } from '../../i18n/mobileTranslations';
import { MobileTopHeader } from './MobileTopHeader';
import { MobilePaperScanTab } from './editor/MobilePaperScanTab';
import { MobileMestreSignalTab } from './editor/MobileMestreSignalTab';
import { MobileEditorFooter } from './editor/MobileEditorFooter';
import { MobileSongPickerModal } from './MobileSongPickerModal';
import { MobileMenuSheet } from './MobileMenuSheet';
import { BlankAndScanWorkshopModal } from '../paper/BlankAndScanWorkshopModal';

interface Props {
  isPlaying: boolean;
  onTogglePlay: () => void;
  activePreset: string;
  cloudPresets: any[];
  localPresets: any[];
  onPresetChange: (val: string) => void;
  onToggleStudio: () => void;
  masterEQ: { low: number; mid: number; high: number };
  setMasterEQ: (eq: { low: number; mid: number; high: number }) => void;
  onOpenPaperWorkshop?: (tab?: 'sheets' | 'scanner' | 'reserve') => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const MobileEditorMode: React.FC<Props> = (props) => {
  const lang = useSequencerStore((s) => s.lang);
  const setLang = useSequencerStore((s) => s.setLang);
  const { metadata } = useSequencer();
  const [activeTab, setActiveTab] = useState<'scan' | 'signal'>('scan');
  const [isSongPickerOpen, setIsSongPickerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBlankModalOpen, setIsBlankModalOpen] = useState(false);

  return (
    <div className="w-full h-dvh flex flex-col bg-[var(--cordel-bg)] text-[var(--cordel-text)] overflow-hidden select-none font-sans relative">
      <MobileTopHeader
        songTitle={metadata?.toada || props.activePreset}
        onOpenSongPicker={() => setIsSongPickerOpen(true)}
        onOpenMenu={() => setIsMenuOpen(true)}
        lang={lang}
      />

      {/* Barre d'onglets Édition */}
      <div className="flex border-b-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] px-2 py-1.5 gap-2 shrink-0">
        <button
          onClick={() => setActiveTab('scan')}
          className={`flex-1 py-1.5 text-xs font-cactus font-bold uppercase border-2 transition-colors cursor-pointer ${
            activeTab === 'scan'
              ? 'bg-[#8b2a1a] text-[#f4ecd8] border-black shadow-[2px_2px_0px_#000]'
              : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)] hover:bg-black/5'
          }`}
        >
          {tMobile(lang, 'scanTab')}
        </button>
        <button
          onClick={() => setActiveTab('signal')}
          className={`flex-1 py-1.5 text-xs font-cactus font-bold uppercase border-2 transition-colors cursor-pointer ${
            activeTab === 'signal'
              ? 'bg-[#8b2a1a] text-[#f4ecd8] border-black shadow-[2px_2px_0px_#000]'
              : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)] hover:bg-black/5'
          }`}
        >
          {tMobile(lang, 'signalTab')}
        </button>
      </div>

      {/* Contenu principal */}
      <main className="flex-1 min-h-0 relative overflow-y-auto">
        {activeTab === 'scan' ? (
          <MobilePaperScanTab onOpenBlankSheets={() => setIsBlankModalOpen(true)} />
        ) : (
          <MobileMestreSignalTab />
        )}
      </main>

      <MobileEditorFooter isPlaying={props.isPlaying} onTogglePlay={props.onTogglePlay} />

      <MobileSongPickerModal
        isOpen={isSongPickerOpen}
        onClose={() => setIsSongPickerOpen(false)}
        localPresets={props.localPresets}
        cloudPresets={props.cloudPresets}
        activePreset={props.activePreset}
        onPresetChange={props.onPresetChange}
        lang={lang}
      />

      <MobileMenuSheet
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        masterEQ={props.masterEQ}
        setMasterEQ={props.setMasterEQ}
        onOpenPaperWorkshop={props.onOpenPaperWorkshop}
        lang={lang}
        onToggleLang={() => setLang(lang === 'pt' ? 'fr' : 'pt')}
        isDarkMode={props.isDarkMode ?? true}
        onToggleDarkMode={props.onToggleDarkMode ?? (() => {})}
        onToggleStudio={props.onToggleStudio}
      />

      <BlankAndScanWorkshopModal
        isOpen={isBlankModalOpen}
        onClose={() => setIsBlankModalOpen(false)}
        initialTab="sheets"
      />
    </div>
  );
};
export default MobileEditorMode;
