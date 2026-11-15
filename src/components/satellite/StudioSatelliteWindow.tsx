/**
 * StudioSatelliteWindow.tsx — Hôte unique de l'Écran 2 (Mixage · Édition · A Oficina) (< 125 lignes).
 */
import React, { Suspense, useCallback, useEffect } from 'react';
import { WindowPortal } from '../WindowPortal';
import { ErrorBoundary } from '../ErrorBoundary';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useDesktopWorkspaceStore } from '../../stores/useDesktopWorkspaceStore';
import { useSatelliteKeyboardBridge } from '../../hooks/useSatelliteKeyboardBridge';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import { notifyToast } from '../../utils/toastHelper';
import { ensureEditableTrackSelected, handleSatelliteClosedByOS, switchSatelliteMode } from '../../utils/satelliteCoordinator';
import { StudioSatelliteHeader } from './StudioSatelliteHeader';
import { SatelliteToastBanner } from './SatelliteToastBanner';

const ConsoleMixer = lazyWithRetry(() => import('../ConsoleMixer').then((m) => ({ default: m.ConsoleMixer })), 'ConsoleMixer');
const InstrumentDetailEditor = lazyWithRetry(() => import('../InstrumentDetailEditor').then((m) => ({ default: m.InstrumentDetailEditor })), 'InstrumentDetailEditor');
const SettingsPage = lazyWithRetry(() => import('../SettingsPage').then((m) => ({ default: m.SettingsPage })), 'SettingsPage');

interface StudioSatelliteInnerProps {
  mestreSignals: any[];
  refreshMestreSignals?: () => void | Promise<void>;
  handleStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent, patternId: number, stepIdx: number,
    instId: string, currentVal: any, onSelect: any, trackId: number, isSplit?: boolean
  ) => void;
}

const StudioSatelliteInner: React.FC<StudioSatelliteInnerProps> = ({ mestreSignals, refreshMestreSignals, handleStepTouchStart }) => {
  useSatelliteKeyboardBridge();
  const satelliteMode = useDesktopWorkspaceStore((s) => s.satelliteMode);
  const editingTrackId = useSequencerStore((s) => s.editingTrackId);
  const setEditingTrackId = useSequencerStore((s) => s.setEditingTrackId);
  const hasValidTrack = useSequencerStore((s) => editingTrackId !== null && s.tracks.some((t) => t.id === editingTrackId));
  const firstTrackId = useSequencerStore((s) => s.tracks[0]?.id ?? null);

  useEffect(() => {
    if (satelliteMode === 'editor' && !hasValidTrack) ensureEditableTrackSelected();
  }, [satelliteMode, hasValidTrack, firstTrackId]);

  const handleMixerOpenDetail = useCallback((id: number | null) => {
    setEditingTrackId(id);
    if (id !== null) switchSatelliteMode('editor');
  }, [setEditingTrackId]);

  const resolvedTrackId = hasValidTrack ? editingTrackId : firstTrackId;

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-[var(--cordel-bg)] text-[var(--cordel-text)]">
      <StudioSatelliteHeader />
      <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden relative">
        <ErrorBoundary>
          <Suspense fallback={null}>
            {satelliteMode === 'mixer' && (
              <ConsoleMixer isMobile={false} isActive={true} onStepTouchStart={handleStepTouchStart as any} editingTrackId={editingTrackId} setEditingTrackId={handleMixerOpenDetail} />
            )}
            {satelliteMode === 'editor' && resolvedTrackId !== null && (
              <InstrumentDetailEditor
                key={resolvedTrackId} trackId={resolvedTrackId} onClose={() => {}} isMobile={false} isDetached={true} isSatelliteEmbedded={true}
                onStepTouchStart={(e, pId, sIdx, iId, cur, onSel) => handleStepTouchStart?.(e, pId, sIdx, iId, cur, onSel, resolvedTrackId)}
                setEditingTrackId={setEditingTrackId}
              />
            )}
            {satelliteMode === 'oficina' && (
              <SettingsPage embedded={true} mestreSignals={mestreSignals} refreshMestreSignals={refreshMestreSignals} />
            )}
          </Suspense>
        </ErrorBoundary>
      </div>
      <SatelliteToastBanner />
    </div>
  );
};

export const StudioSatelliteWindow: React.FC<StudioSatelliteInnerProps & { isMobile?: boolean }> = ({
  isMobile = false, mestreSignals, refreshMestreSignals, handleStepTouchStart,
}) => {
  const isSatelliteOpen = useDesktopWorkspaceStore((s) => s.isSatelliteOpen);
  const satelliteMode = useDesktopWorkspaceStore((s) => s.satelliteMode);
  const satelliteBounds = useDesktopWorkspaceStore((s) => s.satelliteBounds);
  const setSatelliteBounds = useDesktopWorkspaceStore((s) => s.setSatelliteBounds);
  const setSatelliteState = useDesktopWorkspaceStore((s) => s.setSatelliteState);
  const isPracticeMode = useSequencerStore((s) => Boolean(s.isPracticeMode));
  const lang = useSequencerStore((s) => s.lang);

  if (isMobile || isPracticeMode || !isSatelliteOpen) return null;

  const modeLabel = satelliteMode === 'mixer' ? (lang === 'pt' ? 'Mixagem' : 'Mixage')
    : satelliteMode === 'editor' ? (lang === 'pt' ? 'Edição' : 'Édition') : 'A Oficina';

  return (
    <WindowPortal
      title={`Sequenciador · ${modeLabel}`}
      savedBounds={satelliteBounds}
      onBoundsCaptured={setSatelliteBounds}
      onBlocked={() => {
        setSatelliteState({ isSatelliteOpen: false });
        notifyToast(lang === 'pt' ? 'Autorize pop-ups para abrir a Tela 2.' : "Autorisez les pop-ups pour ouvrir l'Écran 2.", 'error');
      }}
      onClosedByOS={handleSatelliteClosedByOS}
    >
      <StudioSatelliteInner mestreSignals={mestreSignals} refreshMestreSignals={refreshMestreSignals} handleStepTouchStart={handleStepTouchStart} />
    </WindowPortal>
  );
};
