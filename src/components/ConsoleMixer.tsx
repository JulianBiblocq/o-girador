/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { i18n } from '../data';
import { SaveWorkspaceTemplateModal } from './SaveWorkspaceTemplateModal';
import { useSequencerStore, selectTracksMeta, getDisplayedMixerTracks, getAllOrderedMixerTracks } from '../stores/useSequencerStore';
import { useMixerDnd } from './mixer/useMixerDnd';
import { MixerTracksContainer } from './mixer/MixerTracksContainer';
import { MixerMasterStrip } from './mixer/MixerMasterStrip';

interface ConsoleMixerProps {
  isMobile: boolean;
  isActive?: boolean;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
  editingTrackId: number | null;
  setEditingTrackId: (id: number | null) => void;
}

const ConsoleMixerComponent: React.FC<ConsoleMixerProps> = ({
  isMobile,
  isActive = true,
  onStepTouchStart,
  editingTrackId: _editingTrackId,
  setEditingTrackId,
}) => {
  const sequencer = useSequencer();
  const audio = useAudio();
  const { lang, copiedPattern, handleCopyPattern, handlePastePattern, handleReorderMixerTracks, handleReorderTracksDnd, handleReorderPatternsDnd } = sequencer;
  const { isPlaying, masterVol, setMasterVol, masterEQ, setMasterEQ, masterCompressor, setMasterCompressor, isPresetLoading } = audio;

  const tracksMeta = useSequencerStore(selectTracksMeta);
  const displayedTracks = useMemo(() => getDisplayedMixerTracks(tracksMeta), [tracksMeta]);
  const displayedTrackIds = useMemo(() => displayedTracks.map(t => `track-${t.id}`), [displayedTracks]);
  const allOrderedTracks = useMemo(() => getAllOrderedMixerTracks(tracksMeta), [tracksMeta]);
  const mixerBankOffset = useSequencerStore(state => state.mixerBankOffset);

  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const t = (key: string) => (i18n[lang] as any)[key] || key;

  const dnd = useMixerDnd({
    tracksMeta,
    displayedTracks,
    handleReorderMixerTracks,
    handleReorderTracksDnd,
    onReorderPatternsDnd: handleReorderPatternsDnd,
  });

  const onOpenDetailEditor = React.useCallback((trackId: number) => {
    setEditingTrackId(trackId);
  }, [setEditingTrackId]);

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-hidden transition-opacity duration-200 relative ${isPresetLoading ? 'pointer-events-none opacity-80' : ''}`}
      style={{ display: isActive ? 'flex' : 'none' }}
    >
      {/* Calque de fond vectoriel trompe-l'œil Maracatu */}
      <div className="absolute inset-0 pointer-events-none z-0 wallpaper-surface-bg wallpaper-mixer-bg" aria-hidden="true" />

      <div className="flex-grow flex overflow-hidden relative z-10">
        <MixerTracksContainer
          displayedTracks={displayedTracks}
          displayedTrackIds={displayedTrackIds}
          allOrderedTracks={allOrderedTracks}
          tracksMeta={tracksMeta}
          mixerBankOffset={mixerBankOffset}
          isActive={isActive}
          lang={lang}
          copiedPattern={copiedPattern}
          handleCopyPattern={handleCopyPattern}
          handlePastePattern={handlePastePattern}
          onOpenDetailEditor={onOpenDetailEditor}
          onStepTouchStart={onStepTouchStart}
          dnd={dnd}
        />

        <MixerMasterStrip
          isMobile={isMobile}
          isActive={isActive}
          isPlaying={isPlaying}
          lang={lang}
          t={t}
          masterVol={masterVol}
          onMasterVolChange={setMasterVol}
          masterEQ={masterEQ}
          onMasterEQChange={setMasterEQ}
          masterCompressor={masterCompressor}
          onMasterCompressorChange={setMasterCompressor}
          onOpenSaveTemplate={() => setIsSaveTemplateModalOpen(true)}
        />
      </div>

      <SaveWorkspaceTemplateModal
        isOpen={isSaveTemplateModalOpen}
        onClose={() => setIsSaveTemplateModalOpen(false)}
        lang={lang}
      />
    </div>
  );
};

export const ConsoleMixer = React.memo(ConsoleMixerComponent);
