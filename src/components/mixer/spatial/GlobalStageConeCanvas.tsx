/**
 * GlobalStageConeCanvas.tsx — Cône 140° bidirectionnel « La Place » (Maîtres ◆, Esclaves ↳, Fils SVG & Pan Permanent) (< 132 lignes).
 */
import React, { useMemo, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { formatPanCartouche } from '../../controls/panKnobMath';
import {
  repelDraggedPawnFromNeighbors,
  resolveRestVisualPositions,
  stagePointPxToMixParams,
} from '../../../utils/stagePlaceBidirectionalMath';
import { GlobalStageLinksSvg } from './GlobalStageLinksSvg';
import type { GlobalStagePawnItem } from './globalStagePawnModel';

interface GlobalStageConeCanvasProps {
  pawns: readonly GlobalStagePawnItem[];
  widthPx: number;
  heightPx: number;
  isFr: boolean;
  onDragStart: () => void;
  onUpdatePawnMix: (pawn: GlobalStagePawnItem, nextPan: number, nextFaderDb: number, nextFaderPos: number, isFinal: boolean) => void;
}

const MIN_VITAL_SEP_PX = 40;

export const GlobalStageConeCanvas: React.FC<GlobalStageConeCanvasProps> = ({
  pawns, widthPx: W, heightPx: H, isFr, onDragStart, onUpdatePawnMix,
}) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const dragIdRef = useRef<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const lang = isFr ? 'fr' : 'pt';

  const visualPawns = useMemo(
    () => resolveRestVisualPositions(pawns, MIN_VITAL_SEP_PX, W, H),
    [pawns, W, H]
  );

  const computeDragTarget = (e: React.PointerEvent<HTMLDivElement>, pawn: GlobalStagePawnItem) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    const rawX = ((e.clientX - rect.left) / rect.width) * W;
    const rawY = ((e.clientY - rect.top) / rect.height) * H;
    const neighbors = visualPawns.filter((p) => p.id !== pawn.id).map((p) => ({ pxX: p.visualX, pxY: p.visualY }));
    const repelled = repelDraggedPawnFromNeighbors(rawX, rawY, neighbors, MIN_VITAL_SEP_PX, W, H);
    return stagePointPxToMixParams(repelled.pxX, repelled.pxY, W, H, {
      lockPan: pawn.lockPan, lockedPanVal: pawn.panVal, lockVol: pawn.lockVol, lockedFaderDb: pawn.faderDb,
    });
  };

  const handleDown = (e: React.PointerEvent<HTMLDivElement>, pawn: GlobalStagePawnItem) => {
    e.preventDefault(); e.stopPropagation();
    dragIdRef.current = pawn.id; setActiveId(pawn.id);
    onDragStart();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  };

  const handleMove = (e: React.PointerEvent<HTMLDivElement>, pawn: GlobalStagePawnItem) => {
    if (dragIdRef.current !== pawn.id) return;
    const next = computeDragTarget(e, pawn);
    if (next) onUpdatePawnMix(pawn, next.panVal, next.faderDb, next.faderPos, false);
  };

  const handleUp = (e: React.PointerEvent<HTMLDivElement>, pawn: GlobalStagePawnItem) => {
    if (dragIdRef.current !== pawn.id) return;
    dragIdRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
    const next = computeDragTarget(e, pawn);
    if (next) onUpdatePawnMix(pawn, next.panVal, next.faderDb, next.faderPos, true);
  };

  const activePawn = activeId ? visualPawns.find((p) => p.id === activeId) : null;

  return (
    <div
      ref={boxRef} data-testid="global-stage-cone-canvas"
      style={{ width: `${W}px`, height: `${H}px` }}
      className="relative bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-3 border-[var(--cordel-border-strong)] shadow-[4px_4px_0_var(--cordel-shadow-color)] overflow-hidden select-none touch-none mx-auto"
    >
      <GlobalStageLinksSvg visualPawns={visualPawns} activeId={activeId} widthPx={W} heightPx={H} lang={lang} />

      {activePawn && (
        <div data-testid="global-stage-readout" className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-2.5 py-1 border-2 border-[var(--cordel-ink-dark)] bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] font-mono text-[11px] font-bold shadow-[2px_2px_0_var(--cordel-ink-dark)] pointer-events-none whitespace-nowrap">
          {activePawn.fullLabel} • {formatPanCartouche(activePawn.panVal, lang)} • {activePawn.faderDb >= 0 ? `+${activePawn.faderDb.toFixed(1)}` : activePawn.faderDb.toFixed(1)} dB
        </div>
      )}

      {visualPawns.map((p) => {
        const isCur = activeId === p.id;
        const isLeaderOrMaster = p.roleKind === 'master' || p.roleKind === 'squad-leader';
        const panStr = formatPanCartouche(p.panVal, lang);
        return (
          <div
            key={p.id} data-testid={`global-stage-pawn-${p.id}`}
            onPointerEnter={() => setActiveId(p.id)}
            onPointerLeave={() => { if (!dragIdRef.current) setActiveId(null); }}
            onPointerDown={(e) => handleDown(e, p)} onPointerMove={(e) => handleMove(e, p)}
            onPointerUp={(e) => handleUp(e, p)} onPointerCancel={(e) => handleUp(e, p)}
            style={{ left: `${(p.visualX / W) * 100}%`, top: `${(p.visualY / H) * 100}%`, transform: 'translate(-50%, -50%)' }}
            className={`absolute w-11 h-11 rounded-full border-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none shadow-[2px_2px_0_var(--cordel-shadow-color)] ${
              p.isMuted ? 'opacity-40' : ''
            } ${isLeaderOrMaster ? 'ring-2 ring-[var(--cordel-wood)]' : ''} ${
              isCur ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-ink-dark)] z-25' : 'bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border-[var(--cordel-ink-dark)] z-20'
            }`}
          >
            {p.roleKind === 'master' && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1 py-px bg-[var(--cordel-ink-dark)] text-[var(--cordel-parchment-bg)] font-mono text-[7px] font-black leading-none flex items-center gap-0.5 pointer-events-none">
                <svg className="w-1.5 h-1.5" viewBox="0 0 8 8"><polygon points="4,0.4 7.6,4 4,7.6 0.4,4" fill="currentColor" /></svg>
                <span>M</span>
              </span>
            )}
            {p.roleKind === 'slave' && p.masterShortCode && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1 py-px bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border border-[var(--cordel-ink-dark)] font-mono text-[6.5px] font-black leading-none pointer-events-none">
                {p.masterShortCode}
              </span>
            )}
            <img src={p.iconUrl} alt="" className="w-3.5 h-3.5 object-contain pointer-events-none" />
            <span className="font-mono text-[7.5px] font-black leading-none mt-0.5 truncate max-w-[38px]">{p.shortLabel}</span>
            <span data-testid={`pawn-pan-pill-${p.id}`} className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1 py-px bg-[var(--cordel-ink-dark)] text-[var(--cordel-parchment-bg)] font-mono text-[7px] font-black leading-none pointer-events-none whitespace-nowrap">
              {panStr}
            </span>
            {(p.lockVol || p.lockPan) && <Lock size={8} className="absolute -top-1 -right-1 text-[var(--cordel-wood)] bg-[var(--cordel-parchment-bg)] rounded-full" />}
          </div>
        );
      })}

      <div style={{ left: '50%', top: '100%', transform: 'translate(-50%, -50%)' }} className="absolute px-3 py-1 pb-3 rounded-full border-2 border-[var(--cordel-wood)] bg-[var(--cordel-paper-surface)] text-[var(--cordel-paper-ink)] text-[9px] font-cactus font-black uppercase tracking-widest pointer-events-none z-10">
        {isFr ? 'Mestre • Écoute' : 'Mestre • Escuta'}
      </div>
    </div>
  );
};
