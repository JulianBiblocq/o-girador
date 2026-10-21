/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useSequencer } from '../../contexts/SequencerContext';
import { useAudio } from '../../contexts/AudioContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { MobileTopHeader } from './MobileTopHeader';
import { MobilePercControls } from './MobilePercControls';
import { MobilePercCenterBar } from './MobilePercCenterBar';
import { CircleSequencer } from '../CircleSequencer';
import { AoVivoOverlayInner } from '../AoVivo/AoVivoOverlayInner';
import { MobileSectionLooper } from './MobileSectionLooper';
import { MobilePercTransport } from './MobilePercTransport';
import { MobileSongPickerModal } from './MobileSongPickerModal';
import { MobileMenuSheet } from './MobileMenuSheet';
import { MobileLetraDrawer } from './MobileLetraDrawer';
import { SpeedTrainerModal } from '../SpeedTrainerModal';

interface Props {
  isPlaying: boolean; isLoading: boolean; onTogglePlay: (opts?: any) => void; onStop: () => void;
  masterEQ: { low: number; mid: number; high: number }; setMasterEQ: (eq: { low: number; mid: number; high: number }) => void;
  cloudPresets: any[]; localPresets: any[]; onPresetChange: (val: string) => void; activePreset: string;
  onToggleStudio: () => void; onOpenPaperWorkshop?: (tab?: 'sheets' | 'scanner' | 'reserve') => void;
  isDarkMode?: boolean; onToggleDarkMode?: () => void; onOpenLyricsVideo?: () => void;
}

export const MobilePercussionMode: React.FC<Props> = (props) => {
  const { lang, setLang, bpm, setBpm, metadata } = useSequencer();
  const audio = useAudio();
  const tracks = useSequencerStore((s) => s.tracks);
  const loopMode = useSequencerStore((s) => s.loopMode ?? 'infinite');
  const setLoopMode = useSequencerStore((s) => s.setLoopMode);
  const isLoopExitRequested = useSequencerStore((s) => s.isLoopExitRequested);
  const requestLoopExit = useSequencerStore((s) => s.requestLoopExit);
  const isSpeedTrainerOpen = useSequencerStore((s) => s.isSpeedTrainerOpen);
  const openSpeedTrainerModal = useSequencerStore((s) => s.openSpeedTrainerModal);
  const isLetraActive = useSequencerStore((s) => s.isLetraActive);
  const toggleLetraActive = useSequencerStore((s) => s.toggleLetraActive);

  const [primaryTrackId, setPrimaryTrackId] = useState<number | null>(null);
  const [referenceTrackId, setReferenceTrackId] = useState<number | null>(null);
  const [isAoVivoActive, setIsAoVivoActive] = useState(true);
  const [isLetraDrawerOpen, setIsLetraDrawerOpen] = useState(false);
  const [isSongPickerOpen, setIsSongPickerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (primaryTrackId && tracks.some((t) => t.id === primaryTrackId)) return;
    const searchParams = new URLSearchParams(window.location.search);
    const roleParam = searchParams.get('role') || searchParams.get('playAlongTrackId');
    const cached = localStorage.getItem('sequenciador_perc_primary_track');
    const eligibleTracks = tracks.filter((t) => {
      const inst = instrumentsConfig[t.instrumentIdx];
      return inst && inst.type !== 'voice' && inst.id !== 'puxador' && inst.id !== 'coro' && inst.id !== 'apito' && inst.id !== 'toada';
    });

    const matched = eligibleTracks.find((t) => String(t.id) === roleParam) ||
      eligibleTracks.find((t) => String(t.id) === cached) || eligibleTracks[0];
    if (matched) setPrimaryTrackId(matched.id);
  }, [tracks, primaryTrackId]);

  useEffect(() => {
    if (isAoVivoActive && primaryTrackId) {
      useSequencerStore.getState().setActiveAoVivoTrackId(primaryTrackId);
    }
  }, [isAoVivoActive, primaryTrackId]);

  const visibleTrackIds = [primaryTrackId, ...(referenceTrackId ? [referenceTrackId] : [])].filter(Boolean) as number[];

  return (
    <div className="w-full h-dvh flex flex-col bg-[#121212] text-[var(--cordel-text)] overflow-hidden select-none font-sans relative">
      <MobileTopHeader
        songTitle={metadata?.toada || props.activePreset}
        onOpenSongPicker={() => setIsSongPickerOpen(true)}
        onOpenMenu={() => setIsMenuOpen(true)}
        lang={lang}
      />

      <MobilePercControls
        primaryTrackId={primaryTrackId}
        setPrimaryTrackId={setPrimaryTrackId}
        referenceTrackId={referenceTrackId}
        setReferenceTrackId={setReferenceTrackId}
        isLetraActive={isLetraActive}
        lang={lang}
      />

      <MobilePercCenterBar
        isAoVivoActive={isAoVivoActive}
        onToggleAoVivo={() => setIsAoVivoActive((v) => !v)}
        isLetraActive={isLetraActive}
        onToggleLetra={toggleLetraActive}
        onOpenLetraDrawer={() => setIsLetraDrawerOpen(true)}
        lang={lang}
      />

      <div className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden">
        <CircleSequencer visibleTrackIds={visibleTrackIds} isPlaying={props.isPlaying} isLetraActive={isLetraActive} />
        {isAoVivoActive && primaryTrackId && <AoVivoOverlayInner activeAoVivoTrackId={primaryTrackId} />}
      </div>

      <MobileSectionLooper isPlaying={props.isPlaying} onNavigateMeasure={(m) => audio.handleTimelineNavigate(m, 0, 16)} />

      <MobilePercTransport
        isPlaying={props.isPlaying} isLoading={props.isLoading} onTogglePlay={props.onTogglePlay} onStop={props.onStop}
        bpm={bpm} onChangeBpm={(delta) => setBpm(Math.max(40, Math.min(240, bpm + delta)))}
        onResetBpm={() => setBpm(useSequencerStore.getState().measureBpms?.[0] || 90)}
        loopMode={loopMode} onChangeLoopMode={setLoopMode} isLoopExitRequested={isLoopExitRequested}
        onRequestLoopExit={requestLoopExit} onOpenSpeedTrainer={openSpeedTrainerModal}
      />

      {isLetraDrawerOpen && <MobileLetraDrawer onClose={() => setIsLetraDrawerOpen(false)} lang={lang} />}
      <MobileSongPickerModal isOpen={isSongPickerOpen} onClose={() => setIsSongPickerOpen(false)} localPresets={props.localPresets} cloudPresets={props.cloudPresets} activePreset={props.activePreset} onPresetChange={props.onPresetChange} lang={lang} />
      <MobileMenuSheet isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} masterEQ={props.masterEQ} setMasterEQ={props.setMasterEQ} onOpenPaperWorkshop={props.onOpenPaperWorkshop} lang={lang} onToggleLang={() => setLang(lang === 'pt' ? 'fr' : 'pt')} isDarkMode={props.isDarkMode ?? true} onToggleDarkMode={props.onToggleDarkMode ?? (() => {})} onToggleStudio={props.onToggleStudio} />
      {isSpeedTrainerOpen && <SpeedTrainerModal changeViewMode={props.onToggleStudio} />}
    </div>
  );
};
