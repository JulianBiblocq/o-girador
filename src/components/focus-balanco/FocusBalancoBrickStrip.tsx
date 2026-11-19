import React, { useEffect, useRef, useState } from 'react';
import { FocusBrickStepModel, FocusMeasureStepsModel } from './focusBalancoTypes';
import {
  resolveBeatsPerStripRow,
  shouldUseTwoRowBrickStrip,
  TWO_ROW_STRIP_MAX_WIDTH_PX,
} from './focusBalancoLayoutMath';
import { FocusBalancoStepCell } from './FocusBalancoStepCell';

interface FocusBalancoBrickStripProps {
  model: FocusMeasureStepsModel;
  compact?: boolean;
  stripWidthRef: React.MutableRefObject<number>;
  isTwoRowRef: React.MutableRefObject<boolean>;
  brickRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  tensionRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  flashRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  offsetLabelRefs: React.MutableRefObject<(HTMLSpanElement | null)[]>;
  playheadRef: React.RefObject<HTMLDivElement | null>;
}

export const FocusBalancoBrickStrip: React.FC<FocusBalancoBrickStripProps> = ({
  model, compact = false, stripWidthRef, isTwoRowRef, brickRefs, tensionRefs, flashRefs, offsetLabelRefs, playheadRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 0
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      stripWidthRef.current = w;
      if (w > 0) {
        setMeasuredWidth((prev) => {
          const prevNarrow = prev > 0 && prev < TWO_ROW_STRIP_MAX_WIDTH_PX;
          const nextNarrow = w < TWO_ROW_STRIP_MAX_WIDTH_PX;
          return prevNarrow === nextNarrow ? prev : w;
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [stripWidthRef]);

  const B = Math.max(1, model.beatsCount);
  const isTwoRow = shouldUseTwoRowBrickStrip(B, compact, measuredWidth);
  isTwoRowRef.current = isTwoRow;

  const beats: FocusBrickStepModel[][] = Array.from({ length: B }, () => []);
  for (const st of model.steps) {
    if (st.beatIdx >= 0 && st.beatIdx < B) beats[st.beatIdx].push(st);
  }
  const beatsPerRow = resolveBeatsPerStripRow(B, isTwoRow);
  const rows: (FocusBrickStepModel[] | null)[][] = isTwoRow
    ? [
        Array.from({ length: beatsPerRow }, (_, c) => beats[c] ?? null),
        Array.from({ length: beatsPerRow }, (_, c) => beats[beatsPerRow + c] ?? null),
      ]
    : [beats];

  return (
    <div
      ref={containerRef}
      data-testid="focus-balanco-brick-strip"
      data-two-row={isTwoRow ? 'true' : 'false'}
      className="relative w-full border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] overflow-hidden select-none shadow-[inset_0_0_0_1px_var(--cordel-shadow-color)]"
    >
      <div
        ref={playheadRef}
        className={`absolute top-0 left-0 ${isTwoRow ? 'h-1/2' : 'h-full'} w-[2px] bg-[var(--cordel-wood)] z-30 pointer-events-none will-change-transform`}
        style={{ transform: 'translate3d(0px, 0%, 0)', opacity: 0.4 }}
      >
        <span className="absolute -left-[2.5px] top-[1px] w-[7px] h-[7px] rotate-45 bg-[var(--cordel-wood)] border border-[var(--cordel-ink-dark)]" />
      </div>

      <div className={isTwoRow ? 'grid grid-rows-2 w-full relative z-10' : 'w-full relative z-10'}>
        {rows.map((rowBeats, rowIdx) => (
          <div
            key={rowIdx}
            data-testid={`focus-balanco-strip-row-${rowIdx}`}
            className={`grid w-full overflow-visible ${rowIdx > 0 ? 'border-t border-[var(--cordel-ink-dark)]/45' : ''}`}
            style={{ gridTemplateColumns: `repeat(${beatsPerRow}, minmax(0, 1fr))` }}
          >
            {rowBeats.map((beatSteps, colIdx) => {
              if (!beatSteps) {
                return (
                  <div
                    key={`empty-${colIdx}`}
                    aria-hidden="true"
                    className="border-l-2 border-[var(--cordel-ink-dark)]/35 bg-[var(--cordel-parchment-panel)]/65"
                  />
                );
              }
              const subCount = Math.max(1, beatSteps.length);
              return (
                <div
                  key={`beat-${rowIdx}-${colIdx}`}
                  className="grid w-full overflow-visible"
                  style={{ gridTemplateColumns: `repeat(${subCount}, minmax(0, 1fr))` }}
                >
                  {beatSteps.map((st) => (
                    <FocusBalancoStepCell
                      key={st.stepIdx}
                      step={st}
                      compact={compact || isTwoRow}
                      isRowStart={colIdx === 0 && st.subIdx === 0}
                      socketStrokeColor={model.socketStrokeColor}
                      brickRefs={brickRefs}
                      tensionRefs={tensionRefs}
                      flashRefs={flashRefs}
                      offsetLabelRefs={offsetLabelRefs}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
