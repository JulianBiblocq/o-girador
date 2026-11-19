/**
 * Mode Percussion Mobile avec Focus permanent (1 ou 2 instruments max, < 140 lignes).
 */
import React, { useState, useEffect } from 'react';
import { useSequencer } from '../../contexts/SequencerContext';
import { useAudio } from '../../contexts/AudioContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getEffectiveBpm } from '../../utils/bpmUtils';
import { getDefaultStepsForMeasure } from '../circle-sequencer/measurePatternHelpers';
import { resolveTrackAoVivoFamily } from '../AoVivo/resolveAoVivoFamily';
import { MobileTopHeader } from './MobileTopHeader';
import { MobilePercControls } from './MobilePercControls';
import { MobilePercCenterBar } from './MobilePercCenterBar';
import { CircleSequencer } from '../CircleSequencer';
import { MobileSectionLooper } from './MobileSectionLooper';
import { MobilePercTransport } from './MobilePercTransport';
import { MobileSongPickerModal } from './MobileSongPickerModal';
import { MobileMenuSheet } from './MobileMenuSheet';
import { MobileLetraDrawer } from './MobileLetraDrawer';
import { MobileFocusPopover } from './MobileFocusPopover';
import { SpeedTrainerModal } from '../SpeedTrainerModal';
import { FocusBalancoDrawer } from '../focus-balanco/FocusBalancoDrawer';

interface Props {
  isPlaying: boolean; isLoading: boolean; onTogglePlay: (opts?: any) => void; onStop: () => void;
  masterEQ: { low: number; mid: number; high: number }; setMasterEQ: (eq: { low: number; mid: number; high: number }) => void;
  cloudPresets: any[]; localPresets: any[]; onPresetChange: (val: string) => void; activePreset: string;
  onToggleStudio: () => void; onOpenPaperWorkshop?: (tab?: 'sheets' | 'scanner' | 'reserve') => void;
  isDarkMode?: boolean; onToggleDarkMode?: () => void; onOpenLyricsVideo?: () => void;
}

export const MobilePercussionMode: React.FC<Props> = (props) => {
  const { setLang, bpm, metadata } = useSequencer();
  const { userProfile } = useAuth();
  const lang = useSequencerStore((s) => s.lang);
  const audio = useAudio();
  const tracks = useSequencerStore((s) => s.tracks);
  const currentMeasure = useSequencerStore((s) => s.currentMeasure), measureBpms = useSequencerStore((s) => s.measureBpms);
  const timeSig = useSequencerStore((s) => s.timeSig), measureTimeSigs = useSequencerStore((s) => s.measureTimeSigs);
  const activeAoVivoTrackId = useSequencerStore((s) => s.activeAoVivoTrackId), setActiveAoVivoTrackId = useSequencerStore((s) => s.setActiveAoVivoTrackId);
  const focusTrackId = useSequencerStore((s) => s.focusTrackId);
  const referenceTrackId = useSequencerStore((s) => s.referenceTrackId), setReferenceTrackId = useSequencerStore((s) => s.setReferenceTrackId);
  const isRestMuted = useSequencerStore((s) => s.isRestOfEnsembleMuted), setIsRestMuted = useSequencerStore((s) => s.setIsRestOfEnsembleMuted);
  const syncFocusWithTracks = useSequencerStore((s) => s.syncFocusWithTracks);
  const loopMode = useSequencerStore((s) => s.loopMode ?? 'infinite'), setLoopMode = useSequencerStore((s) => s.setLoopMode);
  const isLoopExitRequested = useSequencerStore((s) => s.isLoopExitRequested), requestLoopExit = useSequencerStore((s) => s.requestLoopExit);
  const isSpeedTrainerOpen = useSequencerStore((s) => s.isSpeedTrainerOpen), openSpeedTrainerModal = useSequencerStore((s) => s.openSpeedTrainerModal);
  const isLetraActive = useSequencerStore((s) => s.isLetraActive), toggleLetraActive = useSequencerStore((s) => s.toggleLetraActive);

  const [isFocusPopoverOpen, setIsFocusPopoverOpen] = useState(false);
  const [isLetraDrawerOpen, setIsLetraDrawerOpen] = useState(false);
  const [isSongPickerOpen, setIsSongPickerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!useSequencerStore.getState().isFocusActive) {
      useSequencerStore.setState({ isFocusActive: true });
    }
    syncFocusWithTracks(tracks, userProfile);
  }, [tracks, userProfile, syncFocusWithTracks]);

  useEffect(() => {
    if (referenceTrackId !== null && referenceTrackId === focusTrackId) {
      setReferenceTrackId(null);
    }
  }, [referenceTrackId, focusTrackId, setReferenceTrackId]);

  const effectiveBpm = getEffectiveBpm(bpm, measureBpms, currentMeasure);
  const firstPerc = tracks.find((t) => !t.isBusFolder && !t.isLinkFolder && resolveTrackAoVivoFamily(t, tracks).family !== null);
  const effectiveFocusTrackId = focusTrackId ?? firstPerc?.id ?? tracks[0]?.id ?? null;

  const handleToggleAoVivo = () => {
    if (activeAoVivoTrackId !== null) setActiveAoVivoTrackId(null);
    else if (effectiveFocusTrackId !== null) setActiveAoVivoTrackId(effectiveFocusTrackId);
  };

  const handleToggleRestMuted = () => setIsRestMuted(!isRestMuted);
  const visibleTrackIds = [
    effectiveFocusTrackId,
    ...(referenceTrackId && referenceTrackId !== effectiveFocusTrackId ? [referenceTrackId] : []),
  ].filter((id): id is number => id !== null);

  return (
    <div className="w-full h-dvh flex flex-col bg-[var(--cordel-bg)] text-[var(--cordel-text)] overflow-hidden select-none font-sans relative">
      <MobileTopHeader songTitle={metadata?.toada || props.activePreset} onOpenSongPicker={() => setIsSongPickerOpen(true)} onOpenMenu={() => setIsMenuOpen(true)} lang={lang} />
      <MobilePercControls referenceTrackId={referenceTrackId} isRestMuted={isRestMuted} onToggleRestMuted={handleToggleRestMuted} onOpenFocusPopover={() => setIsFocusPopoverOpen(true)} lang={lang} />
      <MobilePercCenterBar
        isAoVivoActive={activeAoVivoTrackId !== null} onToggleAoVivo={handleToggleAoVivo}
        isLetraActive={isLetraActive} onToggleLetra={toggleLetraActive}
        onOpenLetraDrawer={() => setIsLetraDrawerOpen(false)}
        referenceTrackId={referenceTrackId} onSelectReferenceTrackId={setReferenceTrackId}
        primaryTrackId={effectiveFocusTrackId} lang={lang}
      />
      <MobileSectionLooper isPlaying={props.isPlaying} onNavigateMeasure={(m) => audio.handleTimelineNavigate(m, 0, getDefaultStepsForMeasure(m, timeSig, measureTimeSigs))} />
      <div className="relative flex-1 min-h-0 overflow-hidden z-10 flex items-center justify-center">
        <CircleSequencer visibleTrackIds={visibleTrackIds} isPlaying={props.isPlaying} isLetraActive={isLetraActive} isMobile={true} />
      </div>
      <FocusBalancoDrawer compact isActiveView />
      <MobilePercTransport isPlaying={props.isPlaying} isLoading={props.isLoading} onTogglePlay={props.onTogglePlay} onStop={props.onStop} onRewind={audio.handleRewind} bpm={effectiveBpm} onChangeBpm={(delta) => useSequencerStore.getState().applyGlobalBpmDelta(delta)} onResetBpm={() => useSequencerStore.getState().resetTempoToNominal()} loopMode={loopMode} onChangeLoopMode={setLoopMode} isLoopExitRequested={isLoopExitRequested} onRequestLoopExit={requestLoopExit} onOpenSpeedTrainer={openSpeedTrainerModal} />
      {isLetraDrawerOpen && <MobileLetraDrawer onClose={() => setIsLetraDrawerOpen(false)} lang={lang} />}
      <MobileSongPickerModal isOpen={isSongPickerOpen} onClose={() => setIsSongPickerOpen(false)} localPresets={props.localPresets} cloudPresets={props.cloudPresets} activePreset={props.activePreset} onPresetChange={props.onPresetChange} lang={lang} />
      <MobileMenuSheet isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} masterEQ={props.masterEQ} setMasterEQ={props.setMasterEQ} onOpenPaperWorkshop={props.onOpenPaperWorkshop} lang={lang} onToggleLang={() => setLang(lang === 'pt' ? 'fr' : 'pt')} isDarkMode={props.isDarkMode ?? true} onToggleDarkMode={props.onToggleDarkMode ?? (() => {})} onToggleStudio={props.onToggleStudio} primaryTrackId={effectiveFocusTrackId} referenceTrackId={referenceTrackId} />
      {isFocusPopoverOpen && <MobileFocusPopover isOpen={isFocusPopoverOpen} onClose={() => setIsFocusPopoverOpen(false)} referenceTrackId={referenceTrackId} onSelectReferenceTrackId={setReferenceTrackId} isRestMuted={isRestMuted} onToggleRestMuted={handleToggleRestMuted} lang={lang} />}
      {isSpeedTrainerOpen && <SpeedTrainerModal changeViewMode={props.onToggleStudio} />}
    </div>
  );
};
