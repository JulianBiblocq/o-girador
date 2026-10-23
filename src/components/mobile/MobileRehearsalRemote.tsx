/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useSequencer } from '../../contexts/SequencerContext';
import { useAudio } from '../../contexts/AudioContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getEffectiveBpm } from '../../utils/bpmUtils';
import { useShallow } from 'zustand/react/shallow';
import { MobileTopHeader } from './MobileTopHeader';
import { MobileCondensedConductor } from './MobileCondensedConductor';
import { MobileSectionLooper } from './MobileSectionLooper';
import { MobileFamilyPads } from './MobileFamilyPads';
import { MobileLetraDrawer } from './MobileLetraDrawer';
import { MobileTransportHero } from './MobileTransportHero';
import { MobileMenuSheet } from './MobileMenuSheet';
import { MobileSongPickerModal } from './MobileSongPickerModal';

interface Props {
  isPlaying: boolean; isLoading: boolean; onTogglePlay: (opts?: any) => void; onStop: () => void;
  masterEQ: { low: number; mid: number; high: number }; setMasterEQ: (eq: { low: number; mid: number; high: number }) => void;
  cloudPresets: any[]; localPresets: any[]; onPresetChange: (val: string) => void; activePreset: string;
  onToggleStudio: () => void; onOpenPaperWorkshop?: (tab?: 'sheets' | 'scanner' | 'reserve') => void;
  isDarkMode?: boolean; onToggleDarkMode?: () => void; onOpenLyricsVideo?: () => void;
}

export const MobileRehearsalRemote: React.FC<Props> = ({
  isPlaying, isLoading, onTogglePlay, onStop, masterEQ, setMasterEQ, cloudPresets, localPresets,
  onPresetChange, activePreset, onToggleStudio, isDarkMode = true,
  onToggleDarkMode = () => {},
}) => {
  const { setLang, bpm, setBpm, metadata } = useSequencer();
  const audio = useAudio();
  const [isSongPickerOpen, setIsSongPickerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLetraOpen, setIsLetraOpen] = useState(false);
  const [letraInitialTab, setLetraInitialTab] = useState<'lyrics' | 'info'>('lyrics');

  const { lang, loopMode, setLoopMode, isLoopExitRequested, requestLoopExit, isTouchLocked } =
    useSequencerStore(
      useShallow((s) => ({
        lang: s.lang,
        loopMode: s.loopMode ?? 'infinite',
        setLoopMode: s.setLoopMode,
        isLoopExitRequested: s.isLoopExitRequested,
        requestLoopExit: s.requestLoopExit,
        isTouchLocked: s.isTouchLocked,
      }))
    );

  const handleNavigateMeasure = (mIdx: number) => {
    audio.handleTimelineNavigate(mIdx, 0, 16);
  };

  const currentMeasure = useSequencerStore((s) => s.currentMeasure);
  const measureBpms = useSequencerStore((s) => s.measureBpms);
  const effectiveBpm = getEffectiveBpm(bpm, measureBpms, currentMeasure);

  return (
    <div className="w-full h-dvh flex flex-col bg-[var(--cordel-bg)] text-[var(--cordel-text)] overflow-hidden select-none font-sans relative">
      <MobileTopHeader
        songTitle={metadata?.toada || activePreset}
        onOpenSongPicker={() => setIsSongPickerOpen(true)}
        onOpenMenu={() => setIsMenuOpen(true)}
        lang={lang}
      />

      <MobileCondensedConductor
        isLetraOpen={isLetraOpen}
        onToggleLetra={() => {
          setLetraInitialTab('lyrics');
          setIsLetraOpen((prev) => !prev);
        }}
        onOpenSongInfo={() => {
          setLetraInitialTab('info');
          setIsLetraOpen(true);
        }}
        lang={lang}
      />

      <MobileSectionLooper
        isPlaying={isPlaying}
        onNavigateMeasure={handleNavigateMeasure}
      />

      <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
        <MobileFamilyPads isLocked={isTouchLocked} />
        {isLetraOpen && (
          <MobileLetraDrawer
            initialTab={letraInitialTab}
            onClose={() => setIsLetraOpen(false)}
            lang={lang}
          />
        )}
      </div>

      <MobileTransportHero
        isPlaying={isPlaying}
        isLoading={isLoading}
        onTogglePlay={onTogglePlay}
        onStop={onStop}
        bpm={effectiveBpm}
        onChangeBpm={(delta) => useSequencerStore.getState().applyGlobalBpmDelta(delta)}
        onResetBpm={() => useSequencerStore.getState().resetTempoToNominal()}
        loopMode={loopMode}
        onChangeLoopMode={setLoopMode}
        isLoopExitRequested={isLoopExitRequested}
        onRequestLoopExit={requestLoopExit}
      />

      <MobileSongPickerModal
        isOpen={isSongPickerOpen}
        onClose={() => setIsSongPickerOpen(false)}
        localPresets={localPresets}
        cloudPresets={cloudPresets}
        activePreset={activePreset}
        onPresetChange={onPresetChange}
        lang={lang}
      />

      <MobileMenuSheet
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        masterEQ={masterEQ}
        setMasterEQ={setMasterEQ}
        lang={lang}
        onToggleLang={() => setLang(lang === 'pt' ? 'fr' : 'pt')}
        isDarkMode={isDarkMode}
        onToggleDarkMode={onToggleDarkMode}
        onToggleStudio={onToggleStudio}
      />
    </div>
  );
};
