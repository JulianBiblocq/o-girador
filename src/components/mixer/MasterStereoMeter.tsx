import React from 'react';
import { STUDIO_VU_GRADIENT_VERTICAL, STUDIO_METER_TICKS } from '../controls/vuMeterMath';

interface MasterStereoMeterProps {
  lang?: string;
  dbTextRef: React.RefObject<HTMLDivElement | null>;
  vuMeterLeftRef: React.RefObject<HTMLDivElement | null>;
  vuMeterRightRef: React.RefObject<HTMLDivElement | null>;
  peakLeftRef?: React.RefObject<HTMLDivElement | null>;
  peakRightRef?: React.RefObject<HTMLDivElement | null>;
  clipLeftRef?: React.RefObject<HTMLDivElement | null>;
  clipRightRef?: React.RefObject<HTMLDivElement | null>;
  onClearClip?: () => void;
}

export const MasterStereoMeter: React.FC<MasterStereoMeterProps> = ({
  lang = 'pt',
  dbTextRef,
  vuMeterLeftRef,
  vuMeterRightRef,
  peakLeftRef,
  peakRightRef,
  clipLeftRef,
  clipRightRef,
  onClearClip,
}) => {
  const peakTooltip =
    lang === 'fr'
      ? 'Crête max atteinte (cliquer pour réinitialiser)'
      : 'Pico máx. atingido (clicar para reiniciar)';

  return (
    <div className="flex flex-col items-center h-full justify-between pb-1 select-none shrink-0">
      <div
        ref={dbTextRef}
        onClick={onClearClip}
        title={peakTooltip}
        className="text-[11px] font-mono font-bold tabular-nums min-w-[54px] py-0.5 px-1.5 text-center rounded-[2px] border border-[var(--cordel-border)]/50 bg-black/15 dark:bg-black/35 text-[var(--cordel-text)] mb-1 tracking-tighter shrink-0 cursor-pointer transition-colors"
      >
        — dB
      </div>

      <div className="flex gap-1.5 h-full flex-grow items-stretch py-0.5">
        {/* Canal Gauche (L) */}
        <div className="w-4 h-full bg-[var(--vu-track-bg)] border border-[var(--cordel-border)] relative overflow-hidden rounded-[1px] flex flex-col">
          <div
            ref={clipLeftRef}
            onClick={onClearClip}
            title={peakTooltip}
            className="w-full h-[4px] shrink-0 border-b border-[var(--cordel-border)]/40 cursor-pointer z-20"
            style={{ backgroundColor: 'var(--vu-level-clip)', opacity: 0.2 }}
          />
          <div className="relative flex-1 w-full overflow-hidden bg-[var(--vu-track-bg)]">
            <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ background: STUDIO_VU_GRADIENT_VERTICAL }} />
            <div
              ref={vuMeterLeftRef}
              className="absolute inset-0 bg-[var(--vu-track-bg)] w-full h-full pointer-events-none will-change-transform"
              style={{ transformOrigin: 'top', transform: 'scaleY(1)', transition: 'none' }}
            />
            <div
              ref={peakLeftRef}
              className="absolute inset-0 w-full h-full pointer-events-none will-change-transform z-10"
              style={{ opacity: 0, transform: 'translate3d(0, 100%, 0)' }}
            >
              <div className="w-full h-[2px] bg-[var(--cordel-parchment-bg)] shadow-[0_0_2px_rgba(0,0,0,0.9)]" />
            </div>
          </div>
        </div>

        {/* Repères dBFS positionnés aux hauteurs exactes de dbToStudioMeterNorm(db) */}
        <div className="relative w-5 mt-[4px] flex-1 text-[9px] font-mono font-bold text-[var(--cordel-text)]/80 leading-none select-none">
          {STUDIO_METER_TICKS.map((tick) => (
            <span
              key={tick.db}
              className="absolute left-0 right-0 text-center"
              style={{
                bottom: `${tick.norm * 100}%`,
                transform: tick.db === 0 ? 'translateY(100%)' : 'translateY(50%)',
              }}
            >
              {tick.label}
            </span>
          ))}
        </div>

        {/* Canal Droit (R) */}
        <div className="w-4 h-full bg-[var(--vu-track-bg)] border border-[var(--cordel-border)] relative overflow-hidden rounded-[1px] flex flex-col">
          <div
            ref={clipRightRef}
            onClick={onClearClip}
            title={peakTooltip}
            className="w-full h-[4px] shrink-0 border-b border-[var(--cordel-border)]/40 cursor-pointer z-20"
            style={{ backgroundColor: 'var(--vu-level-clip)', opacity: 0.2 }}
          />
          <div className="relative flex-1 w-full overflow-hidden bg-[var(--vu-track-bg)]">
            <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ background: STUDIO_VU_GRADIENT_VERTICAL }} />
            <div
              ref={vuMeterRightRef}
              className="absolute inset-0 bg-[var(--vu-track-bg)] w-full h-full pointer-events-none will-change-transform"
              style={{ transformOrigin: 'top', transform: 'scaleY(1)', transition: 'none' }}
            />
            <div
              ref={peakRightRef}
              className="absolute inset-0 w-full h-full pointer-events-none will-change-transform z-10"
              style={{ opacity: 0, transform: 'translate3d(0, 100%, 0)' }}
            >
              <div className="w-full h-[2px] bg-[var(--cordel-parchment-bg)] shadow-[0_0_2px_rgba(0,0,0,0.9)]" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between w-full px-1 text-[10px] font-mono font-extrabold text-[var(--cordel-text)] opacity-90 mt-1 shrink-0">
        <span>L</span>
        <span>R</span>
      </div>
    </div>
  );
};
