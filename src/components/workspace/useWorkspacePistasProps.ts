import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useLiveMeasure } from '../../hooks/useLiveMeasure';
import { useDawVisibleTracks } from '../daw/useDawVisibleTracks';
import { useDawPlayhead } from '../daw/useDawPlayhead';
import { isSlaveTrack } from '../../utils/trackMasterResolver';
import { StrokeInfoPopoverTarget } from '../pedagogy/strokeInfoTypes';

const getBeatsFromTimeSig = (sig: string): number => {
  if (sig === '3/4') return 3;
  if (sig === '2/4' || sig === '6/8') return 2;
  if (sig === '12/8') return 4;
  return parseInt(sig?.split('/')[0], 10) || 4;
};

export function useWorkspacePistasProps(isActive: boolean) {
  const currentMeasure = useLiveMeasure(isActive);
  const timeSig = useSequencerStore((state) => state.timeSig);
  const measureTimeSigs = useSequencerStore((state) => state.measureTimeSigs);
  const isLeftHanded = useSequencerStore((state) => state.isLeftHanded);
  const [pedagogyTarget, setPedagogyTarget] = useState<StrokeInfoPopoverTarget | null>(null);

  const activeTimeSig = (measureTimeSigs && measureTimeSigs[currentMeasure]) || timeSig;
  const defaultBeats = getBeatsFromTimeSig(activeTimeSig);

  const showLinkedTracksOnRoda = useSequencerStore((state) => state.showLinkedTracksOnRoda);
  const { visibleTracks: allDawTracks, tracks: rawAllTracks } = useDawVisibleTracks();
  const visibleTracks = useMemo(
    () => (showLinkedTracksOnRoda ? allDawTracks : allDawTracks.filter((t) => !isSlaveTrack(t, rawAllTracks))),
    [allDawTracks, rawAllTracks, showLinkedTracksOnRoda]
  );
  const visibleTrackIds = visibleTracks.map((t) => t.id).join('-');
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

  const isTracksCollapsed = useSequencerStore((state) => state.isTracksCollapsed);

  useEffect(() => {
    if (isTracksCollapsed || !isActive) {
      setPedagogyTarget(null);
    } else if (trackScrollRef.current && pistasScrollRef.current) {
      pistasScrollRef.current.scrollTop = trackScrollRef.current.scrollTop;
    }
  }, [isTracksCollapsed, isActive]);

  const onPedagogicalStepClick = useCallback((target: StrokeInfoPopoverTarget | null) => {
    setPedagogyTarget(target);
  }, []);

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
    pedagogyTarget,
    onPedagogicalStepClick,
  };
}
