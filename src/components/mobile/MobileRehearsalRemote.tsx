/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useSequencer } from '../../contexts/SequencerContext';
import { useAudio } from '../../contexts/AudioContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import { MusicalPhotoBoothModal } from '../signals/MusicalPhotoBoothModal';
import { CloudRhythmSignal } from '../../types';

const CircleSequencer = lazyWithRetry(() => import('../CircleSequencer').then(m => ({ default: m.CircleSequencer })), 'CircleSequencer');
import { MobileTopHeader } from './MobileTopHeader'; import { MobileStateBar } from './MobileStateBar';
import { MobileSectionPads } from './MobileSectionPads'; import { MobileFamilyMixerBar } from './MobileFamilyMixerBar';
import { MobileTransportBar } from './MobileTransportBar'; import { MobileMenuSheet } from './MobileMenuSheet';
import { MobileSongPickerModal } from './MobileSongPickerModal';

interface Props {
  isPlaying: boolean; isLoading: boolean; onTogglePlay: (opts?: any) => void; onStop: () => void;
  masterEQ: { low: number; mid: number; high: number }; setMasterEQ: (eq: { low: number; mid: number; high: number }) => void;
  cloudPresets: any[]; localPresets: any[]; onPresetChange: (val: string) => void; activePreset: string;
  onToggleStudio: () => void; onOpenPaperWorkshop: (tab?: 'sheets' | 'scanner' | 'reserve') => void;
  isDarkMode?: boolean; onToggleDarkMode?: () => void; onOpenLyricsVideo?: () => void;
}

export const MobileRehearsalRemote: React.FC<Props> = ({
  isPlaying, isLoading, onTogglePlay, onStop, masterEQ, setMasterEQ, cloudPresets, localPresets,
  onPresetChange, activePreset, onToggleStudio, onOpenPaperWorkshop, isDarkMode = true,
  onToggleDarkMode = () => {}, onOpenLyricsVideo = () => {},
}) => {
  const { lang, setLang, bpm, setBpm, metadata } = useSequencer();
  const audio = useAudio();
  const [isLocked, setIsLocked] = useState(false);
  const [isSongPickerOpen, setIsSongPickerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPhotoBoothOpen, setIsPhotoBoothOpen] = useState(false);

  const { currentMeasure, totalMeasures, loopMode, setLoopMode, isLoopExitRequested, requestLoopExit, songMarkers, songSections } =
    useSequencerStore((s) => ({
      currentMeasure: s.currentMeasure, totalMeasures: s.totalMeasures,
      loopMode: s.loopMode ?? 'infinite', setLoopMode: s.setLoopMode,
      isLoopExitRequested: s.isLoopExitRequested, requestLoopExit: s.requestLoopExit,
      songMarkers: s.songMarkers || [], songSections: s.songSections || []
    }));
  const currentIteration = (audio as any).currentLoopIteration ?? 1;

  const handleNavigateMeasure = (mIdx: number) => {
    const target = (mIdx + totalMeasures) % totalMeasures;
    audio.handleTimelineNavigate(target, 0, 16);
  };

  const handleChangeBpm = (delta: number) => {
    setBpm(Math.max(40, Math.min(240, bpm + delta)));
  };

  return (
    <div className="w-full h-dvh flex flex-col bg-[#121212] text-[var(--cordel-text)] overflow-hidden select-none font-sans relative">
      <MobileTopHeader
        songTitle={metadata?.toada || activePreset}
        onOpenSongPicker={() => setIsSongPickerOpen(true)}
        onOpenMenu={() => setIsMenuOpen(true)}
      />

      <MobileStateBar
        currentMeasure={currentMeasure}
        totalMeasures={totalMeasures}
        onNavigatePrev={() => handleNavigateMeasure(currentMeasure - 1)}
        onNavigateNext={() => handleNavigateMeasure(currentMeasure + 1)}
        loopMode={loopMode}
        currentIteration={currentIteration}
        isLocked={isLocked}
        onToggleLock={() => setIsLocked((prev) => !prev)}
      />

      <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 relative w-full h-full flex items-center justify-center">
          <React.Suspense fallback={null}>
            <CircleSequencer isMobile={true} isActive={true} />
          </React.Suspense>
        </div>
        <MobileSectionPads
          songMarkers={songMarkers}
          songSections={songSections}
          currentMeasure={currentMeasure}
          onNavigateSection={(m) => audio.handleTimelineNavigate(m, 0, 16)}
        />
      </div>

      <MobileFamilyMixerBar isLocked={isLocked} />

      <MobileTransportBar
        isPlaying={isPlaying}
        isLoading={isLoading}
        onTogglePlay={onTogglePlay}
        onStop={onStop}
        bpm={bpm}
        onChangeBpm={handleChangeBpm}
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
        onOpenPaperWorkshop={onOpenPaperWorkshop}
        onOpenPhotoBooth={() => setIsPhotoBoothOpen(true)}
        onOpenLyricsVideo={onOpenLyricsVideo}
        lang={lang}
        onToggleLang={() => setLang(lang === 'pt' ? 'fr' : 'pt')}
        isDarkMode={isDarkMode}
        onToggleDarkMode={onToggleDarkMode}
        onToggleStudio={onToggleStudio}
      />

      {isPhotoBoothOpen && (
        <MusicalPhotoBoothModal
          isOpen={isPhotoBoothOpen}
          onClose={() => setIsPhotoBoothOpen(false)}
          onSave={(sig) => {
            const list = useSequencerStore.getState().mestreSignals || [];
            const newSig: CloudRhythmSignal = { ...sig, id: `sig_${Date.now()}`, mestreId: 'local' };
            useSequencerStore.setState({ mestreSignals: [...list, newSig] });
            setIsPhotoBoothOpen(false);
          }}
          lang={lang}
        />
      )}
    </div>
  );
};
