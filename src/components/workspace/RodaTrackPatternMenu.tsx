import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Play, Square, Music } from 'lucide-react';
import { TrackGroup } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { useAudio } from '../../contexts/AudioContext';
import { useWindow } from '../../contexts/WindowContext';
import { resolveTrackMenuPatterns } from '../instrument-editor/buildTrackSoloMenuItems';

export { resolveTrackMenuPatterns };

export interface RodaTrackPatternMenuProps {
  track: TrackGroup;
  tracks: TrackGroup[];
  anchorPos: { top: number; left: number };
  onClose: () => void;
}

export const RodaTrackPatternMenu: React.FC<RodaTrackPatternMenuProps> = ({
  track, tracks, anchorPos, onClose,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const currentWindow = useWindow();
  const audio = useAudio();
  const lang = useSequencerStore((s) => s.lang);
  const soloPlayId = useTransportStore((s) => s.soloPatternPlayId);
  const soloVarId = useTransportStore((s) => s.soloPatternVariationId);
  const isFr = lang === 'fr';

  useEffect(() => {
    const doc = currentWindow?.document || document;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (panelRef.current && e.target && !panelRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    doc.addEventListener('mousedown', onDown);
    doc.addEventListener('touchstart', onDown);
    doc.addEventListener('keydown', onKey);
    return () => {
      doc.removeEventListener('mousedown', onDown);
      doc.removeEventListener('touchstart', onDown);
      doc.removeEventListener('keydown', onKey);
    };
  }, [onClose, currentWindow]);

  const { patterns, isVocalOrApito } = resolveTrackMenuPatterns(track, tracks);
  const portalBody = currentWindow?.document?.body || document.body;
  const maxTop = Math.max(8, Math.min(anchorPos.top, (currentWindow?.innerHeight || 800) - 320));
  const maxLeft = Math.max(8, Math.min(anchorPos.left, (currentWindow?.innerWidth || 1280) - 260));

  const toggleSolo = (patternId: number, variationId: string) => {
    const isActive = soloPlayId !== null && String(soloPlayId) === String(patternId) && (soloVarId || 'ensemble') === variationId;
    if (isActive) audio.handleStopSoloPattern?.();
    else audio.handleStartSoloPattern?.(patternId, variationId);
  };

  const activeCls = 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]';
  const varActiveCls = 'bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)]';
  const idleCls = 'bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] hover:bg-[var(--cordel-ink-dark)]/10';

  return createPortal(
    <div
      ref={panelRef} data-testid="roda-track-pattern-menu"
      style={{ position: 'fixed', top: maxTop, left: maxLeft, width: 248 }}
      onClick={(e) => e.stopPropagation()} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      className="z-[99999] bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border-2 border-[var(--cordel-ink-dark)] shadow-[4px_4px_0px_var(--cordel-ink-dark)] p-2 flex flex-col gap-1.5 text-xs font-cactus select-none max-h-[310px] overflow-y-auto"
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--cordel-ink-dark)]/75 pb-1 border-b border-[var(--cordel-ink-dark)]/30 flex items-center gap-1.5">
        <Music size={11} className="shrink-0" />
        <span className="truncate">{isFr ? 'Écouter Motif / Variation' : 'Ouvir Padrão / Variação'}</span>
      </div>
      {patterns.map((ptn, idx) => {
        const ptnLabel = ptn.name || `${isFr ? 'Motif' : 'Padrão'} ${idx + 1}`;
        const isPtnSolo = soloPlayId !== null && String(soloPlayId) === String(ptn.id);
        const isEnsemble = isPtnSolo && (soloVarId === 'ensemble' || soloVarId === null);
        const isBase = isPtnSolo && soloVarId === 'base';
        const variations = !isVocalOrApito && Array.isArray(ptn.variations) ? ptn.variations : [];

        return (
          <div key={ptn.id} className="flex flex-col gap-1 border border-[var(--cordel-ink-dark)]/30 bg-[var(--cordel-parchment-panel)] p-1.5">
            <button
              type="button" data-testid={`roda-menu-play-pattern-${ptn.id}`} onClick={() => toggleSolo(ptn.id, 'ensemble')}
              className={`w-full px-1.5 py-1 flex items-center justify-between gap-1.5 text-left font-bold border border-[var(--cordel-ink-dark)] cursor-pointer transition-colors ${isEnsemble ? activeCls : idleCls}`}
            >
              <span className="truncate">{ptnLabel}</span>
              {isEnsemble ? <Square size={11} className="fill-current shrink-0" /> : <Play size={11} className="fill-current shrink-0" />}
            </button>
            {variations.length > 0 && (
              <div className="flex flex-col gap-1 pl-2 border-l-2 border-dashed border-[var(--cordel-ink-dark)]/40 mt-0.5">
                <button
                  type="button" data-testid={`roda-menu-play-base-${ptn.id}`} onClick={() => toggleSolo(ptn.id, 'base')}
                  className={`w-full px-1.5 py-0.5 flex items-center justify-between gap-1 text-[11px] font-bold border border-[var(--cordel-ink-dark)]/60 cursor-pointer ${isBase ? activeCls : idleCls}`}
                >
                  <span className="truncate">{isFr ? 'Phrase de base' : 'Frase de base'}</span>
                  {isBase ? <Square size={10} className="fill-current shrink-0" /> : <Play size={10} className="fill-current shrink-0" />}
                </button>
                {variations.map((v) => {
                  const isVar = isPtnSolo && String(soloVarId) === String(v.id);
                  return (
                    <button
                      key={v.id} type="button" data-testid={`roda-menu-play-var-${ptn.id}-${v.id}`} onClick={() => toggleSolo(ptn.id, v.id)}
                      className={`w-full px-1.5 py-0.5 flex items-center justify-between gap-1 text-[11px] font-bold border border-[var(--cordel-ink-dark)] cursor-pointer ${isVar ? varActiveCls : idleCls}`}
                    >
                      <span className="truncate">{v.name}</span>
                      {isVar ? <Square size={10} className="fill-current shrink-0" /> : <Play size={10} className="fill-current shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>,
    portalBody
  );
};
