/**
 * Routeur des modes distants Mobile (Percussion, Danse, Éditeur) (< 80 lignes).
 */

import React from 'react';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import { useSequencerStore } from '../../stores/useSequencerStore';

const MobileRehearsalRemote = lazyWithRetry(() => import('./MobileRehearsalRemote').then(m => ({ default: m.MobileRehearsalRemote })), 'MobileRehearsalRemote');
const MobilePercussionMode = lazyWithRetry(() => import('./MobilePercussionMode').then(m => ({ default: m.MobilePercussionMode })), 'MobilePercussionMode');
const MobileEditorMode = lazyWithRetry(() => import('./MobileEditorMode').then(m => ({ default: m.MobileEditorMode })), 'MobileEditorMode');

interface Props {
  mobileViewMode: 'danse' | 'percussion' | 'editeur' | 'complet';
  audio: any;
  cloudPresets: any[];
  localPresets: any[];
  theme: any;
  onOpenPaperWorkshop: (tab?: 'sheets' | 'scanner' | 'reserve') => void;
  onOpenLyricsVideo: () => void;
}

export const MobileRemoteRouter: React.FC<Props> = ({
  mobileViewMode, audio, cloudPresets, localPresets, theme, onOpenPaperWorkshop, onOpenLyricsVideo,
}) => {
  const onToggleStudio = () => useSequencerStore.getState().setMobileViewMode('complet');

  if (mobileViewMode === 'percussion') {
    return (
      <MobilePercussionMode
        isPlaying={audio.isPlaying} isLoading={audio.isLoading} onTogglePlay={audio.handleTogglePlay} onStop={audio.handleStop}
        masterEQ={audio.masterEQ} setMasterEQ={audio.setMasterEQ} cloudPresets={cloudPresets} localPresets={localPresets}
        onPresetChange={audio.handlePresetSelect} activePreset={audio.activePresetName} onToggleStudio={onToggleStudio}
        onOpenPaperWorkshop={onOpenPaperWorkshop} isDarkMode={theme.isDarkMode} onToggleDarkMode={theme.toggleDarkMode}
        onOpenLyricsVideo={onOpenLyricsVideo}
      />
    );
  }

  if (mobileViewMode === 'editeur') {
    return (
      <MobileEditorMode
        isPlaying={audio.isPlaying} onTogglePlay={audio.handleTogglePlay}
        masterEQ={audio.masterEQ} setMasterEQ={audio.setMasterEQ} cloudPresets={cloudPresets} localPresets={localPresets}
        onPresetChange={audio.handlePresetSelect} activePreset={audio.activePresetName} onToggleStudio={onToggleStudio}
        onOpenPaperWorkshop={onOpenPaperWorkshop} isDarkMode={theme.isDarkMode} onToggleDarkMode={theme.toggleDarkMode}
      />
    );
  }

  return (
    <MobileRehearsalRemote
      isPlaying={audio.isPlaying} isLoading={audio.isLoading} onTogglePlay={audio.handleTogglePlay} onStop={audio.handleStop}
      masterEQ={audio.masterEQ} setMasterEQ={audio.setMasterEQ} cloudPresets={cloudPresets} localPresets={localPresets}
      onPresetChange={audio.handlePresetSelect} activePreset={audio.activePresetName} onToggleStudio={onToggleStudio}
      onOpenPaperWorkshop={onOpenPaperWorkshop} isDarkMode={theme.isDarkMode} onToggleDarkMode={theme.toggleDarkMode}
      onOpenLyricsVideo={onOpenLyricsVideo}
    />
  );
};
