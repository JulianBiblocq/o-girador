import React from 'react';
import { FocusBrickStepModel } from './focusBalancoTypes';

interface FocusBalancoStepCellProps {
  step: FocusBrickStepModel;
  compact: boolean;
  isRowStart: boolean;
  socketStrokeColor: string;
  brickRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  tensionRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  flashRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  offsetLabelRefs: React.MutableRefObject<(HTMLSpanElement | null)[]>;
}

export const FocusBalancoStepCell: React.FC<FocusBalancoStepCellProps> = ({
  step, compact, isRowStart, socketStrokeColor, brickRefs, tensionRefs, flashRefs, offsetLabelRefs,
}) => {
  const idx = step.stepIdx;
  const isEvenBeat = step.beatIdx % 2 === 1;
  const laneTone = isEvenBeat ? 'bg-[var(--cordel-parchment-panel)]' : 'bg-[var(--cordel-parchment-bg)]';
  const leftBorder = isRowStart
    ? ''
    : step.isBeatStart
      ? 'border-l-2 border-[var(--cordel-ink-dark)]/40'
      : 'border-l border-[var(--cordel-ink-dark)]/14';
  const initPct = Math.round(step.nominalBalancoPct + step.manualMicroPct);
  const initTxt = Math.abs(initPct) < 1 ? '•' : (initPct > 0 ? `+${initPct}%` : `${initPct}%`);

  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-visible ${compact ? 'pt-3 pb-1 min-h-[46px]' : 'pt-5 pb-1.5 min-h-[62px]'} ${laneTone} ${leftBorder}`}
    >
      {step.isBeatStart && (
        <span className={`absolute ${compact ? 'top-0.5 left-1 text-[8px]' : 'top-1 left-1.5 text-[8.5px]'} px-1 py-[1px] rounded-xs bg-[var(--cordel-ink-dark)]/12 font-cactus font-black text-[var(--cordel-ink-dark)] leading-none pointer-events-none`}>
          {step.beatIdx + 1}
        </span>
      )}

      <div className={`relative w-full ${compact ? 'h-[24px]' : 'h-[28px]'} flex items-center justify-center overflow-visible`}>
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-[var(--cordel-ink-dark)]/22 pointer-events-none" />
        <div
          className={`absolute left-1/2 -translate-x-1/2 pointer-events-none ${
            step.isBeatStart ? 'h-4 w-[1.5px] bg-[var(--cordel-ink-dark)]/45' : 'h-2.5 w-[1px] bg-[var(--cordel-ink-dark)]/22'
          }`}
        />

        {!step.isActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--cordel-ink-dark)]/25 relative z-10 pointer-events-none" />
        )}

        {step.isActive && (
          <>
            <div
              className={`absolute inset-x-[10%] ${compact ? 'h-[22px]' : 'h-[26px]'} rounded-[1px] pointer-events-none`}
              style={{
                border: `1.5px dashed ${socketStrokeColor}`,
                backgroundColor: 'var(--cordel-parchment-surface)',
                opacity: 0.9,
              }}
            />

            <div
              ref={(el) => { tensionRefs.current[idx] = el; }}
              className="absolute left-1/2 top-1/2 h-[3px] w-[1px] origin-left z-15 pointer-events-none will-change-transform"
              style={{ backgroundColor: socketStrokeColor, opacity: 0, transform: 'translate3d(0px, -50%, 0) scaleX(0)' }}
            />

            <div
              ref={(el) => { brickRefs.current[idx] = el; }}
              data-testid={`focus-balanco-brick-${idx}`}
              className={`xilo-wood-stamp-cell absolute inset-x-[13%] ${compact ? 'h-[19px] text-[9.5px]' : 'h-[22px] text-[10px]'} z-20 flex items-center justify-center font-mono font-black border border-[var(--cordel-ink-dark)] shadow-[1.5px_1.5px_0px_var(--cordel-ink-dark)] will-change-transform overflow-hidden ${step.isVariationStep ? 'ring-1 ring-[var(--cordel-gold)]' : ''}`}
              style={{
                backgroundColor: step.isSplit ? 'transparent' : step.fillColor,
                color: step.textColor,
                transform: 'translate3d(0px, 0px, 0)',
              }}
            >
              {step.isSplit ? (
                <div className="grid grid-cols-2 w-full h-full">
                  <span className="flex items-center justify-center h-full text-[8px] leading-none border-r border-[var(--cordel-ink-dark)]/40" style={{ backgroundColor: step.fillColor, color: step.textColor }}>
                    {step.displaySymbol}
                  </span>
                  <span className="flex items-center justify-center h-full text-[8px] leading-none" style={{ backgroundColor: step.rightFillColor, color: step.rightTextColor }}>
                    {step.rightSymbol}
                  </span>
                </div>
              ) : (
                <span className="leading-none">{step.displaySymbol}</span>
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

      <span
        ref={(el) => { offsetLabelRefs.current[idx] = el; }}
        className={`mt-0.5 ${compact ? 'text-[8px]' : 'text-[8.5px]'} font-mono font-bold leading-none tabular-nums ${step.isActive ? 'text-[var(--cordel-ink-dark)]/85' : 'text-[var(--cordel-ink-dark)]/30'}`}
      >
        {step.isActive ? initTxt : '·'}
      </span>
    </div>
  );
};
