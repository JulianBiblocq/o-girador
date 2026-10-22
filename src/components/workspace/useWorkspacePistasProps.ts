/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useCallback, useEffect } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useDawVisibleTracks } from '../daw/useDawVisibleTracks';
import { useDawPlayhead } from '../daw/useDawPlayhead';

const getBeatsFromTimeSig = (sig: string): number => {
  if (sig === '3/4') return 3;
  if (sig === '2/4' || sig === '6/8') return 2;
  if (sig === '12/8') return 4;
  return parseInt(sig?.split('/')[0], 10) || 4;
};

export function useWorkspacePistasProps(isActive: boolean) {
  const currentMeasure = useSequencerStore(state => (isActive ? state.currentMeasure : 0));
  const timeSig = useSequencerStore(state => state.timeSig);
  const measureTimeSigs = useSequencerStore(state => state.measureTimeSigs);
  const isLeftHanded = useSequencerStore(state => state.isLeftHanded);

  const activeTimeSig = (measureTimeSigs && measureTimeSigs[currentMeasure]) || timeSig;
  const defaultBeats = getBeatsFromTimeSig(activeTimeSig);

  const { visibleTracks } = useDawVisibleTracks();
  const visibleTrackIds = visibleTracks.map(t => t.id).join('-');
  const { registerStepRef, trackResolutionsRef } = useDawPlayhead(isActive, visibleTrackIds);

  const trackScrollRef = useRef<HTMLDivElement | null>(null);
  const pistasScrollRef = useRef<HTMLDivElement | null>(null);

  const handleTrackScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (pistasScrollRef.current) {
      pistasScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  }, []);

  const handlePistasScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (trackScrollRef.current) {
      trackScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  }, []);

  const isTracksCollapsed = useSequencerStore(state => state.isTracksCollapsed);

  useEffect(() => {
    if (!isTracksCollapsed && trackScrollRef.current && pistasScrollRef.current) {
      pistasScrollRef.current.scrollTop = trackScrollRef.current.scrollTop;
    }
  }, [isTracksCollapsed]);

  return {
    currentMeasure,
    defaultBeats,
    isLeftHanded,
    visibleTracks,
    registerStepRef,
    trackResolutionsRef,
    trackScrollRef,
    pistasScrollRef,
    handleTrackScroll,
    handlePistasScroll,
  };
}
