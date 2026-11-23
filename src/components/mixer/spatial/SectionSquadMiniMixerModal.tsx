/**
 * SectionSquadMiniMixerModal.tsx — Mini-Mixeur de Pupitre (`#1..#N` Fader + Pan + Cône 140°) (< 130 lignes).
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Compass, Minus, Plus, RotateCcw, Sliders, Users, X } from 'lucide-react';
import { DEFAULT_SOLO_PLAYER_PLACEMENT, getMaxSectionPlayers, isNeutralDefaultSectionPlayers } from '../../../constants/sectionEnsembleLimits';
import { usePortalRoot, useWindow } from '../../../contexts/WindowContext';
import { instrumentsConfig } from '../../../data';
import { audioEngine } from '../../../hooks/useAudioSync';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import type { SectionPlayerPlacement, TrackGroup } from '../../../types';
import { buildSectionPresetLayout, resizeSectionPlayers, SectionStageLayoutPreset } from '../../../utils/sectionStagePresets';
import { SectionSquadPlayerStrip } from './SectionSquadPlayerStrip';
import { SectionStageConeCanvas } from './SectionStageConeCanvas';

const FALLBACK_SOLO_PLAYERS: SectionPlayerPlacement[] = [{ ...DEFAULT_SOLO_PLAYER_PLACEMENT }];

export const SectionSquadMiniMixerModal: React.FC<{ trackId: number; anchorRect: DOMRect; onClose: () => void }> = ({
  trackId, anchorRect, onClose,
}) => {
  const portalRoot = usePortalRoot(), currentWindow = useWindow();
  const panelRef = useRef<HTMLDivElement>(null), lastLiveSyncRef = useRef(0);
  const [tab, setTab] = useState<'mixer' | 'cone'>('mixer');
  const selectTrack = useCallback((s: { tracks: TrackGroup[] }) => s.tracks.find((t) => t.id === trackId), [trackId]);
  const track = useSequencerStore(selectTrack);
  const lang = useSequencerStore((s) => s.lang), isStrictAudioEco = useSequencerStore((s) => Boolean(s.ecoConfig?.disableFx));
  const setTrackSectionPlayers = useSequencerStore((s) => s.setTrackSectionPlayers);
  const isFr = lang === 'fr';

  const inst = track ? instrumentsConfig[track.instrumentIdx] : undefined;
  const instId = inst?.id || 'caixa', maxPlayers = getMaxSectionPlayers(instId, inst?.type);
  const effectivePlayers = track?.sectionPlayers && track.sectionPlayers.length > 0 ? track.sectionPlayers : FALLBACK_SOLO_PLAYERS;
  const count = effectivePlayers.length, modalW = tab === 'mixer' ? Math.max(284, count * 74 + 28) : 284;
  const [pos, setPos] = useState(() => ({ top: anchorRect.bottom + 6, left: anchorRect.left }));

  useLayoutEffect(() => {
    const winW = currentWindow?.innerWidth || 1280, winH = currentWindow?.innerHeight || 800, pH = 340, pad = 8;
    const left = Math.max(pad, Math.min(anchorRect.left - modalW * 0.35, winW - modalW - pad));
    const top = anchorRect.bottom + 6 + pH > winH - pad ? Math.max(pad, anchorRect.top - pH - 6) : anchorRect.bottom + 6;
    setPos((prev) => (prev.top === top && prev.left === left ? prev : { top, left }));
  }, [anchorRect.top, anchorRect.bottom, anchorRect.left, currentWindow, modalW]);

  useEffect(() => {
    const doc = currentWindow?.document || document;
    const onDown = (e: MouseEvent | TouchEvent) => { if (panelRef.current && e.target && !panelRef.current.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); } };
    doc.addEventListener('mousedown', onDown); doc.addEventListener('touchstart', onDown); doc.addEventListener('keydown', onKey, { capture: true });
    return () => { doc.removeEventListener('mousedown', onDown); doc.removeEventListener('touchstart', onDown); doc.removeEventListener('keydown', onKey, { capture: true }); };
  }, [onClose, currentWindow]);

  if (!track || instId.toLowerCase() === 'apito' || maxPlayers <= 1) return null;

  const handleCountDelta = (delta: number) => {
    const nextN = Math.max(1, Math.min(maxPlayers, count + delta));
    if (nextN === count) return;
    useSequencerStore.getState().pushUndoState();
    setTrackSectionPlayers(trackId, resizeSectionPlayers(track.sectionPlayers, nextN, instId));
  };

  const handleApplyPreset = (preset: SectionStageLayoutPreset) => {
    useSequencerStore.getState().pushUndoState();
    setTrackSectionPlayers(trackId, buildSectionPresetLayout(preset, count <= 1 ? Math.min(maxPlayers, 2) : count, instId, effectivePlayers.map((p) => p.id), effectivePlayers));
  };

  const handleAudioDragVol = (idx: number, volPos: number) => {
    const now = performance.now();
    if (now - lastLiveSyncRef.current < 25) return;
    lastLiveSyncRef.current = now;
    const st = useSequencerStore.getState(), next = effectivePlayers.map((p, i) => (i === idx ? { ...p, volumeVal: volPos } : p));
    audioEngine?.syncTracksToWorklet(st.tracks.map((t) => (t.id === trackId ? { ...t, sectionPlayers: next } : t)));
  };

  const handleCommitVol = (idx: number, volPos: number) => {
    useSequencerStore.getState().pushUndoState();
    setTrackSectionPlayers(trackId, effectivePlayers.map((p, i) => (i === idx ? { ...p, volumeVal: volPos } : { ...p })));
  };

  const handleCommitPan = (idx: number, panVal: number) => {
    useSequencerStore.getState().pushUndoState();
    const nextX = Math.round(Math.max(4, Math.min(96, 50 + panVal * 0.5)) * 10) / 10;
    setTrackSectionPlayers(trackId, effectivePlayers.map((p, i) => (i === idx ? { ...p, panVal, x: nextX } : { ...p })));
  };

  const handleMoveConePlayer = (idx: number, x: number, y: number) => {
    setTrackSectionPlayers(trackId, effectivePlayers.map((p, i) => (i === idx ? { ...p, x, y, panVal: Math.max(-100, Math.min(100, Math.round((x - 50) * 2))) } : { ...p })));
  };

  const presetCls = 'px-1.5 py-1 cordel-border-sm bg-[var(--cordel-surface)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] text-[9px] font-bold uppercase cursor-pointer truncate';

  return createPortal(
    <div
      ref={panelRef} data-testid="section-squad-mini-mixer-modal"
      style={{ position: 'fixed', top: `${pos.top}px`, left: `${pos.left}px`, width: `${modalW}px` }}
      onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
      className="z-[100040] bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border-2 border-[var(--cordel-ink-dark)] shadow-[4px_4px_0px_var(--cordel-ink-dark)] p-2.5 flex flex-col gap-2 select-none font-cactus"
    >
      <div className="flex items-center justify-between gap-1.5 border-b border-[var(--cordel-ink-dark)]/25 pb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Users size={13} className="text-[var(--cordel-wood)] shrink-0" />
          <span className="text-[11px] font-bold uppercase tracking-wider truncate">{isFr ? 'Mini-Mixeur de Pupitre' : 'Mini-Mixer do Naipe'} — {track.customName || inst?.name}</span>
        </div>
        <button type="button" onClick={onClose} className="w-5 h-5 flex items-center justify-center cordel-border-sm bg-[var(--cordel-surface)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] cursor-pointer shrink-0"><X size={11} /></button>
      </div>

      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1">
          <button type="button" data-testid="section-count-dec" disabled={count <= 1} onClick={() => handleCountDelta(-1)} className="w-6 h-6 cordel-border-sm flex items-center justify-center font-bold bg-[var(--cordel-surface)] text-[var(--cordel-text)] disabled:opacity-35 cursor-pointer"><Minus size={11} /></button>
          <span data-testid="section-count-value" className="min-w-[34px] text-center font-mono text-xs font-black px-1.5 py-0.5 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]">×{count}</span>
          <button type="button" data-testid="section-count-inc" disabled={count >= maxPlayers} onClick={() => handleCountDelta(1)} className="w-6 h-6 cordel-border-sm flex items-center justify-center font-bold bg-[var(--cordel-surface)] text-[var(--cordel-text)] disabled:opacity-35 cursor-pointer"><Plus size={11} /></button>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setTab('mixer')} className={`h-6 px-1.5 cordel-border-sm flex items-center gap-1 text-[9px] font-bold cursor-pointer ${tab === 'mixer' ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-surface)] text-[var(--cordel-text)]'}`}><Sliders size={10} /><span>Mix</span></button>
          <button type="button" onClick={() => setTab('cone')} className={`h-6 px-1.5 cordel-border-sm flex items-center gap-1 text-[9px] font-bold cursor-pointer ${tab === 'cone' ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-surface)] text-[var(--cordel-text)]'}`}><Compass size={10} /><span>140°</span></button>
          {!isNeutralDefaultSectionPlayers(track.sectionPlayers) && (
            <button type="button" onClick={() => { useSequencerStore.getState().pushUndoState(); setTrackSectionPlayers(trackId, undefined); }} title={isFr ? 'Réinitialiser solo' : 'Redefinir solo'} className="h-6 px-1.5 cordel-border-sm flex items-center gap-0.5 text-[9px] font-bold bg-[var(--cordel-surface)] text-[var(--cordel-text)] cursor-pointer"><RotateCcw size={10} /><span>×1</span></button>
          )}
        </div>
      </div>

      {tab === 'mixer' ? (
        <div className="flex items-stretch justify-center gap-1.5 overflow-x-auto py-0.5">
          {effectivePlayers.map((p, idx) => (
            <SectionSquadPlayerStrip key={p.id || idx} player={p} playerIdx={idx} trackPanVal={track.panVal ?? track.pan ?? 0} isEcoMuted={Boolean(isStrictAudioEco && idx >= 2)} isFr={isFr} onAudioDragVol={handleAudioDragVol} onCommitVol={handleCommitVol} onCommitPan={handleCommitPan} />
          ))}
        </div>
      ) : (
        <div className="flex justify-center">
          <SectionStageConeCanvas players={effectivePlayers} trackPanVal={track.panVal ?? track.pan ?? 0} isFr={isFr} onDragStart={() => useSequencerStore.getState().pushUndoState()} onMovePlayer={handleMoveConePlayer} />
        </div>
      )}
      <div className="grid grid-cols-3 gap-1 pt-0.5">
        <button type="button" data-testid="section-preset-arc" onClick={() => handleApplyPreset('arc')} className={presetCls}>{isFr ? 'En arc' : 'Em arco'}</button>
        <button type="button" data-testid="section-preset-column" onClick={() => handleApplyPreset('column')} className={presetCls}>{isFr ? 'En colonne' : 'Em coluna'}</button>
        <button type="button" data-testid="section-preset-quincunx" onClick={() => handleApplyPreset('quincunx')} className={presetCls}>{isFr ? 'Quinconce rue' : 'Quincôncio'}</button>
      </div>
    </div>,
    portalRoot
  );
};
