/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { resolveOverlaySignalAndMarker } from '../circle-sequencer/resolveOverlaySignal';
import { getBeatsPerMeasure } from '../../utils/measureHelpers';

interface Props {
  isPistasOpen: boolean;
}

export const PistasMestreSignalBadge: React.FC<Props> = ({ isPistasOpen }) => {
  const currentMeasure = useSequencerStore(s => s.currentMeasure);
  const measureSignals = useSequencerStore(s => s.measureSignals);
  const mestreSignals = useSequencerStore(s => s.mestreSignals);
  const songMarkers = useSequencerStore(s => s.songMarkers);
  const timeSig = useSequencerStore(s => s.timeSig);
  const measureTimeSigs = useSequencerStore(s => s.measureTimeSigs);

  const imgRef = useRef<HTMLImageElement>(null);
  const currentBeatRef = useRef(0);

  const { activeSig, activeMarker } = useMemo(() => {
    return resolveOverlaySignalAndMarker(
      currentMeasure, currentMeasure, false, 0, 1,
      measureSignals, undefined, mestreSignals, songMarkers
    );
  }, [currentMeasure, measureSignals, mestreSignals, songMarkers]);

  const initialSrc = (activeSig?.frames && activeSig.frames[0]) || activeSig?.image || '';
  const shortName = activeSig?.name
    ? (activeSig.name.length > 7 ? activeSig.name.replace(/conven[çc][ãa]o/i, 'C').replace(/\s+/g, ' ').trim() : activeSig.name)
    : (activeMarker?.name || '');

  // Synchronisation audio temps réel (Zero Render Thrashing) pour les trames gestuelles
  useEffect(() => {
    if (!isPistasOpen || !activeSig?.frames || activeSig.frames.length <= 1) return;
    const handleTick = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.step < 0) return;
      const localSig = (measureTimeSigs && measureTimeSigs[detail.measure]) || timeSig || '4/4';
      const bInM = getBeatsPerMeasure(localSig);
      const beat = Math.min(bInM - 1, Math.max(0, Math.floor(detail.ratio * bInM)));
      if (beat !== currentBeatRef.current) {
        currentBeatRef.current = beat;
        if (imgRef.current && activeSig.frames) {
          const idx = Math.min(activeSig.frames.length - 1, Math.floor((beat / bInM) * activeSig.frames.length));
          const src = activeSig.frames[idx] || activeSig.frames[0];
          if (src && imgRef.current.src !== src) imgRef.current.src = src;
        }
      }
    };
    window.addEventListener('sequencer-tick', handleTick);
    return () => window.removeEventListener('sequencer-tick', handleTick);
  }, [isPistasOpen, activeSig, timeSig, measureTimeSigs]);

  if (!isPistasOpen) return null;
  const hasContent = Boolean(activeSig || activeMarker);

  return (
    <div
      className={`h-[38px] min-h-[38px] max-h-[38px] rounded-none bg-[#f4ecd8] dark:bg-[#e2d7c0] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] box-border px-2 flex items-center gap-1.5 select-none shrink-0 transition-opacity duration-200 ${
        hasContent ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      title={activeSig?.name || activeMarker?.name || ''}
    >
      {initialSrc ? (
        <div className="w-6 h-6 shrink-0 rounded-none overflow-hidden bg-black/10 border border-[#1a1a1a]/40 flex items-center justify-center">
          <img ref={imgRef} src={initialSrc} alt={activeSig?.name || ''} className="w-full h-full object-contain filter contrast-125" />
        </div>
      ) : null}
      <span className="font-cactus font-bold text-xs uppercase tracking-wide text-[#1a1a1a] max-w-[70px] truncate leading-none">
        {shortName}
      </span>
    </div>
  );
};
