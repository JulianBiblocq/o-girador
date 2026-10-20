/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useSequencerStore, getEffectiveMuteState, selectTracksMeta } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { instrumentsConfig } from '../data';
import { getTrackDisplayName } from '../utils/colorHelpers';
import { useAudio } from '../contexts/AudioContext';
import { computeChannelStripStyles } from './mixer/channels/channelStripStyles';
import { useChannelStripAutomation } from './mixer/channels/useChannelStripAutomation';
import { ChannelStripHeader } from './mixer/channels/ChannelStripHeader';
import { ChannelStripBody } from './mixer/channels/ChannelStripBody';
import { BaseChannelStripProps } from './mixer/channels/channelStripTypes';

export type MixerLinkedTrackProps = BaseChannelStripProps;

const MixerLinkedTrackComponent: React.FC<MixerLinkedTrackProps> = ({
  trackId,
  channelOrdinal,
  midiFaderIndex = null,
  isUnderMidiControl = false,
  onOpenDetailEditor,
  isActive = true,
  busPosition = 'none',
  linkPosition = 'none',
  isDragOver = false,
  dropIndicator = null,
  activeWagonSize = 1,
  isWagonMember = false,
  isDraggingWagon = false,
}) => {
  const { isPlaying } = useAudio();
  const track = useSequencerStore(useShallow(state => state.tracks.find(t => t.id === trackId)));
  const tracksMeta = useSequencerStore(selectTracksMeta);
  const lang = useSequencerStore(state => state.lang);
  const totalMeasures = useSequencerStore(state => state.totalMeasures);
  const isEcoMode = useSequencerStore(state => state.isEcoMode);

  const isVolActive = !!(track?.measureVols && track.measureVols.length > 0 && !track?.automationBypass?.volume);
  const isPanActive = !!(track?.measurePans && track.measurePans.length > 0 && !track?.automationBypass?.pan);
  const isRevActive = !!(track?.measureReverbSends && track.measureReverbSends.length > 0 && !track?.automationBypass?.reverb);

  const { faderHandleRef, faderTextRef, travelRangeRef, panKnobRef, reverbGaugeRef, reverbTextRef } = useChannelStripAutomation({
    track,
    isPlaying,
    isEcoMode,
    totalMeasures,
    isVolActive,
    isPanActive,
    isRevActive,
  });

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `track-${trackId}` });

  if (!track) return null;
  const inst = instrumentsConfig[track.instrumentIdx];
  if (!inst) return null;

  const displayName = getTrackDisplayName(track, tracksMeta) || inst.name;
  const isMuted = getEffectiveMuteState(tracksMeta, trackId);

  const { groupStyle, linkStyle, faderColor, faderTextColor, paddingTop, paddingBottom, style } = computeChannelStripStyles({
    track,
    tracksMeta,
    inst,
    busPosition,
    linkPosition,
    isDragOver,
    transform,
    transition,
    activeWagonSize,
    isWagonMember,
    isDraggingWagon,
  });

  const customDeleteMessage = lang === 'fr'
    ? `Supprimer définitivement la piste liée "${displayName}" et tous ses motifs ?`
    : `Excluir definitivamente a faixa vinculada "${displayName}" e todos os seus padrões?`;

  return (
    <div
      ref={setNodeRef}
      data-track-id={trackId}
      className={`flex flex-col bg-[var(--cordel-bg)] w-[115px] h-full justify-between shrink-0 text-[var(--cordel-text)] overflow-hidden relative transition-all duration-300 ${
        isMuted ? 'opacity-50 bg-black/5 dark:bg-white/5' : (track.isSolo ? 'bg-[var(--cordel-border)]/5 shadow-[0_0_15px_rgba(0,0,0,0.15)] z-25' : 'opacity-100')
      } ${busPosition === 'none' ? 'cordel-border' : ''}`}
      style={{
        ...style,
        ...groupStyle,
        paddingTop: `${paddingTop}px`,
        paddingBottom: `${12 + paddingBottom}px`,
        zIndex: isDragging ? 50 : (isDragOver ? 20 : 1),
        ['--fader-thumb-bg' as string]: faderColor,
        ['--fader-thumb-border' as string]: 'var(--cordel-border)',
      } as React.CSSProperties}
    >
      {(linkPosition !== 'none' || !track.isBusFolder) && <div style={linkStyle} className="rounded-sm" />}
      {dropIndicator === 'left' && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[var(--cordel-wood)] z-[99] pointer-events-none animate-pulse" />}
      {dropIndicator === 'right' && <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[var(--cordel-wood)] z-[99] pointer-events-none animate-pulse" />}

      <ChannelStripHeader
        track={track}
        inst={inst}
        channelOrdinal={channelOrdinal}
        midiFaderIndex={midiFaderIndex}
        isUnderMidiControl={isUnderMidiControl}
        displayName={displayName}
        onOpenDetailEditor={onOpenDetailEditor}
        attributes={attributes}
        listeners={listeners}
        customDeleteMessage={customDeleteMessage}
      />

      <ChannelStripBody
        track={track}
        inst={inst}
        lang={lang}
        isPlaying={isPlaying}
        isActive={isActive}
        isVolActive={isVolActive}
        isPanActive={isPanActive}
        isRevActive={isRevActive}
        faderColor={faderColor}
        faderTextColor={faderTextColor}
        faderHandleRef={faderHandleRef}
        faderTextRef={faderTextRef}
        travelRangeRef={travelRangeRef}
        panKnobRef={panKnobRef}
        reverbGaugeRef={reverbGaugeRef}
        reverbTextRef={reverbTextRef}
      />
    </div>
  );
};

export const MixerLinkedTrack = React.memo(MixerLinkedTrackComponent);
