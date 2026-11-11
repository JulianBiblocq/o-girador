/**
 * BusDynamicsModal.tsx — Modale Experte PC de Dynamique de Bus (`React.lazy`, portail `z-[100020]`, < 125 lignes).
 * Sélecteurs Zustand atomiques par `trackId` + auto-fermeture si le bus disparaît ou si Mobile / Pratique s'active.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import { instrumentsConfig } from '../../../data';
import { detectBusArchetypeForGroup } from '../../../audio/effects/busCompressorArchetypes';
import type { BusCompressorPresetArchetypeId } from '../../../audio/effects/busCompressorTypes';
import { useBusDynamicsUiStore } from '../../../stores/busDynamicsUiStore';
import {
  getAllOrderedMixerTracks,
  selectTracksHierarchyMeta,
  useSequencerStore,
  type TrackMeta,
} from '../../../stores/useSequencerStore';
import { getBusColor } from '../../../utils/colorHelpers';
import { BusDynamicsArchetypeCards } from './BusDynamicsArchetypeCards';
import { BusDynamicsHeader } from './BusDynamicsHeader';
import { BusDynamicsKnobsGrid } from './BusDynamicsKnobsGrid';
import { BusDynamicsMetersPanel } from './BusDynamicsMetersPanel';
import { BusDynamicsPresetBar } from './BusDynamicsPresetBar';
import { resolveEffectiveBusCompressor } from './busDynamicsKnobLogic';
import { getBusDynamicsModalStrings } from './busDynamicsModalI18n';

interface BusDynamicsModalProps {
  trackId: number;
  lang: string;
  isPlaying: boolean;
  isMobile: boolean;
  isPracticeMode: boolean;
}

function formatBusIdentityTitle(track: { id: number | string; customName?: string; isLinkFolder?: boolean }, ordered: TrackMeta[]): string {
  const rawName = (track.customName || '').trim();
  if (rawName.toLowerCase() === 'toada' || String(track.id) === 'toada') return 'TOADA';
  const idx = ordered.findIndex((t) => t.id === track.id);
  const numStr = String(idx >= 0 ? idx + 1 : 1).padStart(2, '0');
  const label = (rawName || (track.isLinkFolder ? 'ALFAIAS' : '')).toUpperCase();
  if (!label || label === 'BUS') return `BUS ${numStr}`;
  return label.startsWith('BUS ') ? label : `BUS ${numStr} — ${label}`;
}

export const BusDynamicsModal: React.FC<BusDynamicsModalProps> = ({
  trackId, lang, isPlaying, isMobile, isPracticeMode,
}) => {
  const closeBusDynamics = useBusDynamicsUiStore((st) => st.closeBusDynamics);
  const busTrack = useSequencerStore(useShallow(useCallback((st) => st.tracks.find((t) => t.id === trackId), [trackId])));
  const tracksMeta = useSequencerStore(selectTracksHierarchyMeta);
  const disableFx = useSequencerStore((st) => Boolean(st.ecoConfig?.disableFx));
  const [activeUserPresetId, setActiveUserPresetId] = useState<string | null>(null);

  useEffect(() => { setActiveUserPresetId(null); }, [trackId]);

  const isValidBus = Boolean(busTrack && (busTrack.isBusFolder || busTrack.isLinkFolder));
  useEffect(() => {
    if (!isValidBus || isMobile || isPracticeMode) closeBusDynamics();
  }, [isValidBus, isMobile, isPracticeMode, closeBusDynamics]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') closeBusDynamics();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeBusDynamics]);

  const orderedTracks = useMemo(() => getAllOrderedMixerTracks(tracksMeta), [tracksMeta]);

  if (!busTrack || !isValidBus || isMobile || isPracticeMode) return null;

  const s = getBusDynamicsModalStrings(lang);
  const settings = resolveEffectiveBusCompressor(busTrack, tracksMeta);
  const naturalArchetype = detectBusArchetypeForGroup(busTrack, tracksMeta);
  const busTitle = formatBusIdentityTitle(busTrack, orderedTracks);
  const busColor = getBusColor(String(busTrack.id), tracksMeta, instrumentsConfig);

  const handleSelectArchetype = (arch: BusCompressorPresetArchetypeId) => {
    setActiveUserPresetId(null);
    useSequencerStore.getState().applyBusCompressorArchetype(trackId, arch);
  };

  const modalNode = (
    <div
      data-testid="bus-dynamics-modal-backdrop"
      onClick={closeBusDynamics}
      className="fixed inset-0 z-[100020] bg-black/65 pt-14 pb-3 px-4 flex items-center justify-center overflow-y-auto"
    >
      <div
        data-testid="bus-dynamics-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[780px] bg-[var(--cordel-master-bg)] text-[var(--cordel-text)] border-[3px] border-[var(--cordel-border)] shadow-[6px_6px_0px_var(--cordel-ink-dark)] rounded-none flex flex-col overflow-hidden"
      >
        <BusDynamicsHeader
          busTitle={busTitle}
          busColor={busColor}
          enabled={settings.enabled}
          phaseInverted={Boolean(busTrack.phaseInverted)}
          disableFx={disableFx}
          s={s}
          onTogglePower={() => useSequencerStore.getState().toggleBusCompressor(trackId)}
          onTogglePolarity={() => useSequencerStore.getState().toggleTrackPhaseInvert(trackId)}
          onResetArchetype={() => handleSelectArchetype(naturalArchetype)}
          onClose={closeBusDynamics}
        />

        <div className="p-3.5 flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-150px)]">
          <BusDynamicsPresetBar
            trackId={trackId}
            settings={settings}
            naturalArchetype={naturalArchetype}
            activeUserPresetId={activeUserPresetId}
            onActiveUserPresetChange={setActiveUserPresetId}
            onSelectArchetype={handleSelectArchetype}
            s={s}
          />
          <BusDynamicsArchetypeCards activeArchetype={settings.archetype} onSelectArchetype={handleSelectArchetype} s={s} />
          <BusDynamicsMetersPanel trackId={trackId} isPlaying={isPlaying} disableFx={disableFx} settings={settings} s={s} />
          <BusDynamicsKnobsGrid
            trackId={trackId}
            settings={settings}
            naturalArchetype={naturalArchetype}
            onUserTweak={() => setActiveUserPresetId(null)}
            s={s}
          />
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};

