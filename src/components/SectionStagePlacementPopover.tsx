/**
 * SectionStagePlacementPopover.tsx — Mini-Éditeur Spatial 2D « Placement du Pupitre (La Place) » (< 130 lignes).
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus, RotateCcw, Users, X } from 'lucide-react';
import { instrumentsConfig } from '../data';
import { usePortalRoot, useWindow } from '../contexts/WindowContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { DEFAULT_SOLO_PLAYER_PLACEMENT, getMaxSectionPlayers, isNeutralDefaultSectionPlayers } from '../constants/sectionEnsembleLimits';
import { buildSectionPresetLayout, resizeSectionPlayers, SectionStageLayoutPreset } from '../utils/sectionStagePresets';
import { SectionStageConeCanvas } from './mixer/spatial/SectionStageConeCanvas';

export interface SectionStagePlacementPopoverProps {
  trackId: number;
  anchorRect: DOMRect;
  onClose: () => void;
}

export const SectionStagePlacementPopover: React.FC<SectionStagePlacementPopoverProps> = ({ trackId, anchorRect, onClose }) => {
  const portalRoot = usePortalRoot(), currentWindow = useWindow();
  const panelRef = useRef<HTMLDivElement>(null);
  const track = useSequencerStore((s) => s.tracks.find((t) => t.id === trackId));
  const lang = useSequencerStore((s) => s.lang), isEcoMode = useSequencerStore((s) => s.isEcoMode);
  const setTrackSectionPlayers = useSequencerStore((s) => s.setTrackSectionPlayers);
  const isFr = lang === 'fr';

  const inst = track ? instrumentsConfig[track.instrumentIdx] : undefined;
  const instId = inst?.id || 'caixa', maxPlayers = getMaxSectionPlayers(instId, inst?.type);
  const effectivePlayers = useMemo(
    () => (track?.sectionPlayers && track.sectionPlayers.length > 0 ? track.sectionPlayers : [{ ...DEFAULT_SOLO_PLAYER_PLACEMENT }]),
    [track?.sectionPlayers]
  );
  const count = effectivePlayers.length;
  const [pos, setPos] = useState(() => ({ top: anchorRect.bottom + 6, left: anchorRect.left }));

  useLayoutEffect(() => {
    const winW = currentWindow?.innerWidth || 1280, winH = currentWindow?.innerHeight || 800;
    const pW = 276, pH = 330, pad = 8;
    const left = Math.max(pad, Math.min(anchorRect.left - pW * 0.35, winW - pW - pad));
    const top = anchorRect.bottom + 6 + pH > winH - pad ? Math.max(pad, anchorRect.top - pH - 6) : anchorRect.bottom + 6;
    setPos({ top, left });
  }, [anchorRect, currentWindow]);

  useEffect(() => {
    const doc = currentWindow?.document || document;
    const onDown = (e: MouseEvent | TouchEvent) => { if (panelRef.current && e.target && !panelRef.current.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); } };
    doc.addEventListener('mousedown', onDown); doc.addEventListener('touchstart', onDown); doc.addEventListener('keydown', onKey, { capture: true });
    return () => {
      doc.removeEventListener('mousedown', onDown); doc.removeEventListener('touchstart', onDown); doc.removeEventListener('keydown', onKey, { capture: true });
    };
  }, [onClose, currentWindow]);

  if (!track || maxPlayers <= 1) return null;

  const handleCountDelta = (delta: number) => {
    const nextN = Math.max(1, Math.min(maxPlayers, count + delta));
    if (nextN === count) return;
    useSequencerStore.getState().pushUndoState();
    setTrackSectionPlayers(trackId, resizeSectionPlayers(track.sectionPlayers, nextN, instId));
  };

  const handleApplyPreset = (preset: SectionStageLayoutPreset) => {
    useSequencerStore.getState().pushUndoState();
    const targetN = count <= 1 ? Math.min(maxPlayers, 2) : count;
    setTrackSectionPlayers(trackId, buildSectionPresetLayout(preset, targetN, instId, effectivePlayers.map((p) => p.id)));
  };

  const handleMovePlayer = (idx: number, x: number, y: number) => {
    setTrackSectionPlayers(trackId, effectivePlayers.map((p, i) => (i === idx ? { ...p, x, y } : { ...p })));
  };

  const presetBtnCls = 'px-1.5 py-1 cordel-border-sm bg-[var(--cordel-surface)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] text-[9px] font-bold uppercase cursor-pointer truncate';

  return createPortal(
    <div
      ref={panelRef} data-testid="section-stage-placement-popover"
      style={{ position: 'fixed', top: `${pos.top}px`, left: `${pos.left}px`, width: '276px' }}
      onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
      className="z-[100040] bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border-2 border-[var(--cordel-ink-dark)] shadow-[4px_4px_0px_var(--cordel-ink-dark)] p-2.5 flex flex-col gap-2 select-none font-cactus"
    >
      <div className="flex items-center justify-between gap-1.5 border-b border-[var(--cordel-ink-dark)]/25 pb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Users size={13} className="text-[var(--cordel-wood)] shrink-0" />
          <span className="text-[11px] font-bold uppercase tracking-wider truncate">
            {isFr ? 'Placement du Pupitre (La Place)' : 'Posição do Naipe (A Praça)'}
          </span>
        </div>
        <button type="button" onClick={onClose} className="w-5 h-5 flex items-center justify-center cordel-border-sm bg-[var(--cordel-surface)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] cursor-pointer shrink-0">
          <X size={11} />
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button type="button" data-testid="section-count-dec" disabled={count <= 1} onClick={() => handleCountDelta(-1)} className="w-6 h-6 cordel-border-sm flex items-center justify-center font-bold bg-[var(--cordel-surface)] text-[var(--cordel-text)] disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"><Minus size={11} /></button>
          <span data-testid="section-count-value" className="min-w-[36px] text-center font-mono text-xs font-black px-1.5 py-0.5 rounded-xs bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]">×{count}</span>
          <button type="button" data-testid="section-count-inc" disabled={count >= maxPlayers} onClick={() => handleCountDelta(1)} className="w-6 h-6 cordel-border-sm flex items-center justify-center font-bold bg-[var(--cordel-surface)] text-[var(--cordel-text)] disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"><Plus size={11} /></button>
          <span className="text-[9px] font-mono opacity-65">max ×{maxPlayers}</span>
        </div>
        {!isNeutralDefaultSectionPlayers(track.sectionPlayers) && (
          <button type="button" onClick={() => { useSequencerStore.getState().pushUndoState(); setTrackSectionPlayers(trackId, undefined); }} title={isFr ? 'Réinitialiser solo centré' : 'Redefinir solo centrado'} className="h-6 px-1.5 cordel-border-sm flex items-center gap-1 text-[9px] font-bold bg-[var(--cordel-surface)] text-[var(--cordel-text)] hover:bg-[var(--cordel-ink-dark)] hover:text-[var(--cordel-parchment-bg)] cursor-pointer">
            <RotateCcw size={10} /><span>×1</span>
          </button>
        )}
      </div>

      {isEcoMode && count > 2 && (
        <div className="text-[9px] font-sans px-1.5 py-0.5 border border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text-muted)]">
          {isFr ? 'Mode Éco actif : 2 voix synthétisées max' : 'Modo Eco ativo: máx. 2 vozes sintetizadas'}
        </div>
      )}

      <div className="flex justify-center">
        <SectionStageConeCanvas players={effectivePlayers} trackPanVal={track.panVal ?? track.pan ?? 0} isFr={isFr} onDragStart={() => useSequencerStore.getState().pushUndoState()} onMovePlayer={handleMovePlayer} />
      </div>

      <div className="grid grid-cols-3 gap-1 pt-0.5">
        <button type="button" data-testid="section-preset-arc" onClick={() => handleApplyPreset('arc')} className={presetBtnCls}>{isFr ? 'En arc' : 'Em arco'}</button>
        <button type="button" data-testid="section-preset-column" onClick={() => handleApplyPreset('column')} className={presetBtnCls}>{isFr ? 'En colonne' : 'Em coluna'}</button>
        <button type="button" data-testid="section-preset-quincunx" onClick={() => handleApplyPreset('quincunx')} className={presetBtnCls}>{isFr ? 'Quinconce rue' : 'Quincôncio'}</button>
      </div>
    </div>,
    portalRoot
  );
};
