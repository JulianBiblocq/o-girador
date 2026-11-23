/**
 * GlobalStagePlaceModal.tsx — Modale Globale « La Place » 140° (Miroir Bidirectionnel 1:1 non-destructif avec la Console) (< 120 lignes).
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Compass, X } from 'lucide-react';
import { usePortalRoot, useWindow } from '../../../contexts/WindowContext';
import { audioEngine, channels } from '../../../hooks/useAudioSync';
import { useInstrumentLabel } from '../../../stores/useNomenclatureStore';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { applyMonoCompatiblePan } from '../../../utils/audio/monoCompatiblePan';
import { safeRampDb, safeRampPan } from '../../../utils/audio/safeAudioParamRamp';
import { GlobalStageConeCanvas } from './GlobalStageConeCanvas';
import { buildGlobalStagePawns, computeUpdatedSquadPlayerFromStage, isApitoTrack, type GlobalStagePawnItem } from './globalStagePawnModel';

interface GlobalStagePlaceModalProps {
  onClose: () => void;
}

export const GlobalStagePlaceModal: React.FC<GlobalStagePlaceModalProps> = ({ onClose }) => {
  const portalRoot = usePortalRoot(), currentWindow = useWindow();
  const resolveLabel = useInstrumentLabel();
  const lastAudioSyncRef = useRef(0);
  const tracks = useSequencerStore((s) => s.tracks);
  const globalBypass = useSequencerStore((s) => s.globalAutomationBypass);
  const lang = useSequencerStore((s) => s.lang);
  const handleTrackVolumeChange = useSequencerStore((s) => s.handleTrackVolumeChange);
  const handleTrackPanChange = useSequencerStore((s) => s.handleTrackPanChange);
  const setTrackSectionPlayers = useSequencerStore((s) => s.setTrackSectionPlayers);
  const isFr = lang === 'fr';

  const stageW = Math.min(680, Math.max(320, (currentWindow?.innerWidth || 960) - 64));
  const stageH = Math.round(stageW * 0.6);

  useEffect(() => {
    const doc = currentWindow?.document || document;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    doc.addEventListener('keydown', onKey, { capture: true });
    return () => doc.removeEventListener('keydown', onKey, { capture: true });
  }, [onClose, currentWindow]);

  const pawns = useMemo(
    () => buildGlobalStagePawns(tracks, globalBypass, stageW, stageH, resolveLabel),
    [tracks, globalBypass, stageW, stageH, resolveLabel]
  );
  const hasApito = useMemo(() => tracks.some((t) => Boolean(t && isApitoTrack(t))), [tracks]);

  const handleUpdatePawnMix = (
    pawn: GlobalStagePawnItem, nextPan: number, nextFaderDb: number, nextFaderPos: number, isFinal: boolean
  ) => {
    const st = useSequencerStore.getState();
    const track = st.tracks.find((t) => t.id === pawn.trackId);
    if (!track || isApitoTrack(track)) return;

    if (pawn.playerIdx !== null) {
      const nextPlayers = computeUpdatedSquadPlayerFromStage(track, pawn.playerIdx, nextPan, nextFaderDb);
      const now = performance.now();
      if (isFinal || now - lastAudioSyncRef.current >= 25) {
        lastAudioSyncRef.current = now;
        audioEngine?.syncTracksToWorklet(st.tracks.map((t) => (t.id === track.id ? { ...t, sectionPlayers: nextPlayers } : t)));
      }
      setTrackSectionPlayers(track.id, nextPlayers);
      return;
    }

    const now = performance.now();
    if (isFinal || now - lastAudioSyncRef.current >= 25) {
      lastAudioSyncRef.current = now;
      const { acousticPan, panCompensationDb } = applyMonoCompatiblePan(nextPan);
      const ch = channels[track.id];
      if (ch?.pan && !pawn.lockPan) safeRampPan(ch.pan, acousticPan, 0.02);
      if (ch?.volume && !pawn.lockVol) safeRampDb(ch.volume, nextFaderDb + panCompensationDb, 0.02);
    }
    if (!pawn.lockPan) handleTrackPanChange(track.id, nextPan);
    if (!pawn.lockVol) handleTrackVolumeChange(track.id, nextFaderPos);
  };

  return createPortal(
    <div
      data-testid="global-stage-place-modal"
      onClick={onClose}
      className="fixed inset-0 z-[100050] flex items-center justify-center bg-[var(--cordel-ink-dark)]/80 backdrop-blur-xs p-3 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border-4 border-[var(--cordel-ink-dark)] shadow-[8px_8px_0_var(--cordel-ink-dark)] p-4 flex flex-col gap-3 max-w-full font-cactus"
      >
        <div className="flex items-center justify-between gap-3 border-b-2 border-[var(--cordel-ink-dark)] pb-2">
          <div className="flex items-center gap-2">
            <Compass size={18} className="text-[var(--cordel-wood)] shrink-0" />
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider leading-tight">
                {isFr ? 'La Place — Scène 140° & Miroir Console' : 'A Praça — Palco 140° & Espelho da Mesa'}
              </h2>
              <p className="text-[11px] opacity-75 font-sans">
                {isFr ? 'Gauche / Droite ↔ Panoramique • Avant / Arrière ↔ Fader (-18 dB .. +6 dB)' : 'Esquerda / Direita ↔ Pan • Frente / Fundo ↔ Fader (-18 dB .. +6 dB)'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center border-2 border-[var(--cordel-ink-dark)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] cursor-pointer"><X size={15} /></button>
        </div>

        <GlobalStageConeCanvas
          pawns={pawns} widthPx={stageW} heightPx={stageH} isFr={isFr} hasApito={hasApito}
          onDragStart={() => useSequencerStore.getState().pushUndoState()}
          onUpdatePawnMix={handleUpdatePawnMix}
        />
      </div>
    </div>,
    portalRoot
  );
};
