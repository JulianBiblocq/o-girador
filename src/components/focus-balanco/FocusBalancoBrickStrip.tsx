import React, { useEffect, useRef } from 'react';
import { FocusMeasureStepsModel } from './focusBalancoTypes';

interface FocusBalancoBrickStripProps {
  model: FocusMeasureStepsModel;
  compact?: boolean;
  stripWidthRef: React.MutableRefObject<number>;
  brickRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  tensionRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  flashRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  offsetLabelRefs: React.MutableRefObject<(HTMLSpanElement | null)[]>;
  playheadRef: React.RefObject<HTMLDivElement | null>;
}

export const FocusBalancoBrickStrip: React.FC<FocusBalancoBrickStripProps> = ({
  model, compact = false, stripWidthRef, brickRefs, tensionRefs, flashRefs, offsetLabelRefs, playheadRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const N = Math.max(1, model.stepCount);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      if (entries[0]) stripWidthRef.current = entries[0].contentRect.width;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [stripWidthRef]);

  return (
    <div
      ref={containerRef}
      data-testid="focus-balanco-brick-strip"
      className="relative w-full border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] overflow-hidden select-none shadow-[inset_0_0_0_1px_var(--cordel-shadow-color)]"
    >
      <div
        ref={playheadRef}
        className="absolute top-0 bottom-0 left-0 w-[2px] bg-[var(--cordel-wood)] z-30 pointer-events-none will-change-transform"
        style={{ transform: 'translate3d(0px, 0, 0)', opacity: 0.4 }}
      >
        <span className="absolute -left-[3px] top-0 w-2 h-2 rotate-45 bg-[var(--cordel-wood)] border border-[var(--cordel-ink-dark)]" />
      </div>

      <div
        className="grid w-full relative z-10"
        style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}
      >
        {model.steps.map((st, idx) => {
          const isEvenBeat = st.beatIdx % 2 === 1;
          const beatDivider = st.stepIdx > 0 && st.isBeatStart
            ? 'border-l-2 border-[var(--cordel-ink-dark)]/40'
            : 'border-l border-[var(--cordel-ink-dark)]/12';
          const laneTone = isEvenBeat ? 'bg-[var(--cordel-parchment-panel)]' : 'bg-[var(--cordel-parchment-bg)]';
          const initPct = Math.round(st.nominalBalancoPct + st.manualMicroPct);
          const initTxt = Math.abs(initPct) < 1 ? '•' : (initPct > 0 ? `+${initPct}%` : `${initPct}%`);

          return (
            <div
              key={st.stepIdx}
              className={`relative flex flex-col items-center justify-center ${compact ? 'pt-3 pb-1.5 min-h-[46px]' : 'pt-5 pb-1.5 min-h-[62px]'} ${laneTone} ${st.stepIdx > 0 ? beatDivider : ''}`}
            >
              {st.isBeatStart && (
                <span className="absolute top-1 left-1.5 px-1 py-[1px] rounded-xs bg-[var(--cordel-ink-dark)]/12 text-[8.5px] font-cactus font-black text-[var(--cordel-ink-dark)] leading-none pointer-events-none">
                  {st.beatIdx + 1}
                </span>
              )}

              <div className="relative w-full h-[28px] flex items-center justify-center overflow-visible">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-[var(--cordel-ink-dark)]/22 pointer-events-none" />
                <div
                  className={`absolute left-1/2 -translate-x-1/2 pointer-events-none ${
                    st.isBeatStart ? 'h-4 w-[1.5px] bg-[var(--cordel-ink-dark)]/45' : 'h-2.5 w-[1px] bg-[var(--cordel-ink-dark)]/22'
                  }`}
                />

                {!st.isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--cordel-ink-dark)]/25 relative z-10 pointer-events-none" />
                )}

                {st.isActive && (
                  <>
                    <div
                      className="absolute inset-x-[10%] h-[26px] rounded-[1px] pointer-events-none"
                      style={{
                        border: `1.5px dashed ${model.socketStrokeColor}`,
                        backgroundColor: 'var(--cordel-parchment-surface)',
                        opacity: 0.9,
                      }}
                    />

                    <div
                      ref={(el) => { tensionRefs.current[idx] = el; }}
                      className="absolute left-1/2 top-1/2 h-[3px] w-[1px] origin-left z-15 pointer-events-none will-change-transform"
                      style={{ backgroundColor: model.socketStrokeColor, opacity: 0, transform: 'translate3d(0px, -50%, 0) scaleX(0)' }}
                    />

                    <div
                      ref={(el) => { brickRefs.current[idx] = el; }}
                      data-testid={`focus-balanco-brick-${idx}`}
                      className={`xilo-wood-stamp-cell absolute inset-x-[13%] h-[22px] z-20 flex items-center justify-center font-mono font-black text-[10px] border border-[var(--cordel-ink-dark)] shadow-[1.5px_1.5px_0px_var(--cordel-ink-dark)] will-change-transform overflow-hidden ${st.isVariationStep ? 'ring-1 ring-[var(--cordel-gold)]' : ''}`}
                      style={{
                        backgroundColor: st.isSplit ? 'transparent' : st.fillColor,
                        color: st.textColor,
                        transform: 'translate3d(0px, 0px, 0)',
                      }}
                    >
                      {st.isSplit ? (
                        <div className="grid grid-cols-2 w-full h-full">
                          <span className="flex items-center justify-center h-full text-[8.5px] leading-none border-r border-[var(--cordel-ink-dark)]/40" style={{ backgroundColor: st.fillColor, color: st.textColor }}>
                            {st.displaySymbol}
                          </span>
                          <span className="flex items-center justify-center h-full text-[8.5px] leading-none" style={{ backgroundColor: st.rightFillColor, color: st.rightTextColor }}>
                            {st.rightSymbol}
                          </span>
                        </div>
                      ) : (
                        <span className="leading-none">{st.displaySymbol}</span>
                      )}
                      <div
                        ref={(el) => { flashRefs.current[idx] = el; }}
                        className="absolute inset-0 bg-[var(--cordel-parchment-bg)] pointer-events-none"
                        style={{ opacity: 0 }}
                      />
                    </div>
                  </>
                )}
              </div>

              {!compact && (
                <span
                  ref={(el) => { offsetLabelRefs.current[idx] = el; }}
                  className={`mt-0.5 text-[8.5px] font-mono font-bold leading-none tabular-nums ${st.isActive ? 'text-[var(--cordel-ink-dark)]/85' : 'text-[var(--cordel-ink-dark)]/30'}`}
                >
                  {st.isActive ? initTxt : '·'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
