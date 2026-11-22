/**
 * SectionStageConeCanvas.tsx — Mini-cône 120° interactif « La Place » (clamping polaire identique au Wizard) (< 125 lignes).
 */
import React, { useRef, useState } from 'react';
import type { SectionPlayerPlacement } from '../../../types';
import { clampPositionToCone, CONE_MAX_RAD, CONE_MIN_RAD } from '../../wizard/wizardStageGeometry';
import { formatPlayerAcousticReadout } from '../../../utils/sectionStagePresets';

interface SectionStageConeCanvasProps {
  players: SectionPlayerPlacement[];
  trackPanVal: number;
  isFr: boolean;
  onDragStart: () => void;
  onMovePlayer: (playerIdx: number, x: number, y: number) => void;
}

const STAGE_W = 248;
const STAGE_H = 184;
const CONE_LEN = 310;

export const SectionStageConeCanvas: React.FC<SectionStageConeCanvasProps> = ({
  players,
  trackPanVal,
  isFr,
  onDragStart,
  onMovePlayer,
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragIdxRef = useRef<number | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    dragIdxRef.current = idx;
    setActiveIdx(idx);
    onDragStart();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>, idx: number) => {
    if (dragIdxRef.current !== idx || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const clamped = clampPositionToCone(e.clientX, e.clientY, rect);
    onMovePlayer(idx, Math.round(clamped.x * 10) / 10, Math.round(clamped.y * 10) / 10);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>, idx: number) => {
    if (dragIdxRef.current !== idx) return;
    dragIdxRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
  };

  const activePlayer = activeIdx !== null ? players[activeIdx] : null;

  return (
    <div
      ref={stageRef}
      data-testid="section-stage-cone-canvas"
      style={{ width: `${STAGE_W}px`, height: `${STAGE_H}px` }}
      className="relative bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border-strong)] rounded-xs overflow-hidden select-none touch-none shrink-0"
    >
      <svg className="absolute inset-0 pointer-events-none text-[var(--cordel-text)]" width={STAGE_W} height={STAGE_H}>
        <line x1={STAGE_W / 2} y1={STAGE_H} x2={STAGE_W / 2} y2={0} stroke="currentColor" strokeWidth="1" strokeOpacity="0.2" strokeDasharray="3 3" />
        <line x1={STAGE_W / 2} y1={STAGE_H} x2={STAGE_W / 2 + CONE_LEN * Math.cos(CONE_MAX_RAD)} y2={STAGE_H - CONE_LEN * Math.sin(CONE_MAX_RAD)} stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.32" />
        <line x1={STAGE_W / 2} y1={STAGE_H} x2={STAGE_W / 2 + CONE_LEN * Math.cos(CONE_MIN_RAD)} y2={STAGE_H - CONE_LEN * Math.sin(CONE_MIN_RAD)} stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.32" />
        {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
          const r = STAGE_H * ratio;
          const x1 = STAGE_W / 2 + r * Math.cos(CONE_MIN_RAD);
          const y1 = STAGE_H - r * Math.sin(CONE_MIN_RAD);
          const x2 = STAGE_W / 2 + r * Math.cos(CONE_MAX_RAD);
          const y2 = STAGE_H - r * Math.sin(CONE_MAX_RAD);
          return (
            <path
              key={ratio}
              d={`M ${x1} ${y1} A ${r} ${r} 0 0 0 ${x2} ${y2}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={ratio === 1.0 ? '1.6' : '1'}
              strokeOpacity={ratio === 1.0 ? '0.4' : '0.18'}
              strokeDasharray={ratio === 1.0 ? '0' : '3 3'}
            />
          );
        })}
      </svg>

      {activePlayer && activeIdx !== null && (
        <div
          data-testid="section-player-readout-tooltip"
          className="absolute top-1.5 left-1/2 -translate-x-1/2 z-30 px-2 py-0.5 rounded-xs border border-[var(--cordel-border-strong)] bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] font-mono text-[10px] font-bold shadow-xs pointer-events-none whitespace-nowrap"
        >
          #{activeIdx + 1} • {formatPlayerAcousticReadout(activePlayer.x, activePlayer.y, trackPanVal, activePlayer.volumeVal, activePlayer.panVal)}
        </div>
      )}

      {players.map((p, idx) => {
        const readout = formatPlayerAcousticReadout(p.x, p.y, trackPanVal, p.volumeVal, p.panVal);
        const isCurrent = activeIdx === idx;
        return (
          <div
            key={p.id || idx}
            data-testid={`section-stage-pion-${idx + 1}`}
            title={`#${idx + 1} (${readout})`}
            onPointerEnter={() => setActiveIdx(idx)}
            onPointerLeave={() => { if (dragIdxRef.current === null) setActiveIdx(null); }}
            onPointerDown={(e) => handlePointerDown(e, idx)}
            onPointerMove={(e) => handlePointerMove(e, idx)}
            onPointerUp={(e) => handlePointerUp(e, idx)}
            onPointerCancel={(e) => handlePointerUp(e, idx)}
            style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}
            className={`absolute w-7 h-7 rounded-full border-2 flex items-center justify-center font-mono text-[11px] font-black cursor-grab active:cursor-grabbing select-none touch-none z-20 shadow-[1px_1px_0_var(--cordel-shadow-color)] ${
              isCurrent
                ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)] z-25'
                : 'bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border-[var(--cordel-ink-dark)]'
            }`}
          >
            {idx + 1}
          </div>
        );
      })}

      <div
        style={{ left: '50%', top: '100%', transform: 'translate(-50%, -50%)' }}
        className="absolute px-2 py-0.5 pb-2.5 rounded-full border-2 border-[var(--cordel-wood)] bg-[var(--cordel-paper-surface)] text-[var(--cordel-paper-ink)] text-[8px] font-cactus font-bold uppercase tracking-wider pointer-events-none select-none z-10"
      >
        {isFr ? 'Mestre' : 'Mestre'}
      </div>
    </div>
  );
};
