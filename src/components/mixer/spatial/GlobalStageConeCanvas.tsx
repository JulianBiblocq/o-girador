/**
 * GlobalStageConeCanvas.tsx — Cône 140° bidirectionnel « La Place » (Bulle d'Espace Vital + Arc 0 dB) (< 138 lignes).
 */
import React, { useMemo, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { CONE_MAX_RAD, CONE_MIN_RAD } from '../../wizard/wizardStageGeometry';
import {
  dbToStageRadiusNorm, repelDraggedPawnFromNeighbors, resolveRestVisualPositions,
  STAGE_ZERO_DB_RADIUS_NORM, stagePointPxToMixParams,
} from '../../../utils/stagePlaceBidirectionalMath';
import type { GlobalStagePawnItem } from './globalStagePawnModel';

interface GlobalStageConeCanvasProps {
  pawns: readonly GlobalStagePawnItem[];
  widthPx: number;
  heightPx: number;
  isFr: boolean;
  onDragStart: () => void;
  onUpdatePawnMix: (pawn: GlobalStagePawnItem, nextPan: number, nextFaderDb: number, nextFaderPos: number, isFinal: boolean) => void;
}

const MIN_VITAL_SEP_PX = 38;
const DB_ARCS = [6, 0, -6, -12, -18] as const;

export const GlobalStageConeCanvas: React.FC<GlobalStageConeCanvasProps> = ({
  pawns, widthPx: W, heightPx: H, isFr, onDragStart, onUpdatePawnMix,
}) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const dragIdRef = useRef<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

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
  const coneLen = Math.max(W, H) * 1.35;

  return (
    <div
      ref={boxRef} data-testid="global-stage-cone-canvas"
      style={{ width: `${W}px`, height: `${H}px` }}
      className="relative bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-3 border-[var(--cordel-border-strong)] shadow-[4px_4px_0_var(--cordel-shadow-color)] overflow-hidden select-none touch-none mx-auto"
    >
      <svg className="absolute inset-0 pointer-events-none text-[var(--cordel-text)]" width={W} height={H}>
        <line x1={W / 2} y1={H} x2={W / 2} y2={0} stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.2" strokeDasharray="4 4" />
        <line x1={W / 2} y1={H} x2={W / 2 + coneLen * Math.cos(CONE_MAX_RAD)} y2={H - coneLen * Math.sin(CONE_MAX_RAD)} stroke="currentColor" strokeWidth="1.8" strokeOpacity="0.34" />
        <line x1={W / 2} y1={H} x2={W / 2 + coneLen * Math.cos(CONE_MIN_RAD)} y2={H - coneLen * Math.sin(CONE_MIN_RAD)} stroke="currentColor" strokeWidth="1.8" strokeOpacity="0.34" />
        {DB_ARCS.map((db) => {
          const rNorm = db === 0 ? STAGE_ZERO_DB_RADIUS_NORM : dbToStageRadiusNorm(db);
          const r = H * rNorm, isZero = db === 0;
          const x1 = W / 2 + r * Math.cos(CONE_MIN_RAD), y1 = H - r * Math.sin(CONE_MIN_RAD);
          const x2 = W / 2 + r * Math.cos(CONE_MAX_RAD), y2 = H - r * Math.sin(CONE_MAX_RAD);
          return (
            <g key={db}>
              <path d={`M ${x1} ${y1} A ${r} ${r} 0 0 0 ${x2} ${y2}`} fill="none" stroke={isZero ? 'var(--cordel-wood)' : 'currentColor'} strokeWidth={isZero ? '2' : '1'} strokeOpacity={isZero ? '0.65' : '0.2'} strokeDasharray={isZero ? '0' : '3 3'} />
              <text x={W / 2 + 6} y={Math.max(12, H - r - 3)} fill={isZero ? 'var(--cordel-wood)' : 'currentColor'} fontSize="9" fontWeight="bold" opacity={isZero ? '0.9' : '0.45'}>{db > 0 ? `+${db}` : db} dB</text>
            </g>
          );
        })}
      </svg>

      {activePawn && (
        <div data-testid="global-stage-readout" className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-2.5 py-1 border-2 border-[var(--cordel-ink-dark)] bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] font-mono text-[11px] font-bold shadow-[2px_2px_0_var(--cordel-ink-dark)] pointer-events-none whitespace-nowrap">
          {activePawn.fullLabel} • {activePawn.panVal === 0 ? 'C' : activePawn.panVal < 0 ? `E${Math.abs(activePawn.panVal)}` : `D${activePawn.panVal}`} • {activePawn.faderDb >= 0 ? `+${activePawn.faderDb.toFixed(1)}` : activePawn.faderDb.toFixed(1)} dB
        </div>
      )}

      {visualPawns.map((p) => {
        const isCur = activeId === p.id;
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
            } ${isCur ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-ink-dark)] z-25' : 'bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border-[var(--cordel-ink-dark)] z-20'}`}
          >
            <img src={p.iconUrl} alt="" className="w-4 h-4 object-contain pointer-events-none" />
            <span className="font-mono text-[8px] font-black leading-none mt-0.5 truncate max-w-[38px]">{p.shortLabel}</span>
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
