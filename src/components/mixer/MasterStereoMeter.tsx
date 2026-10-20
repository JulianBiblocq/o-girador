import React from 'react';

interface MasterStereoMeterProps {
  vuMeterLeftRef: React.RefObject<HTMLDivElement | null>;
  vuMeterRightRef: React.RefObject<HTMLDivElement | null>;
  labelColorClass?: string;
  containerHeightClass?: string;
}

export const MasterStereoMeter: React.FC<MasterStereoMeterProps> = ({
  vuMeterLeftRef,
  vuMeterRightRef,
  labelColorClass = 'text-[var(--cordel-text)]/60',
  containerHeightClass = '',
}) => {
  return (
    <div className={`flex flex-col items-center gap-1 shrink-0 w-8 ${containerHeightClass}`}>
      <span className={`text-[9px] font-bold uppercase tracking-wider ${labelColorClass} shrink-0`}>Meter</span>
      <div className="w-8 flex-grow flex-1 bg-[var(--cordel-bg)] border border-[var(--master-border)]/40 relative overflow-hidden flex gap-[2px] p-[1.5px] min-h-0">
        <div
          className="flex-1 h-full relative overflow-hidden pointer-events-none"
          style={{ background: 'linear-gradient(to top, #3b8c82 0%, #3b8c82 65%, #d99b26 80%, #c25e38 95%)' }}
        >
          <div
            ref={vuMeterLeftRef}
            className="meter-vertical absolute inset-0 bg-[var(--cordel-bg)] w-full h-full pointer-events-none"
            style={{ transform: 'scaleY(1)', transformOrigin: 'top', transition: 'none' }}
          />
        </div>
        <div
          className="flex-1 h-full relative overflow-hidden pointer-events-none"
          style={{ background: 'linear-gradient(to top, #3b8c82 0%, #3b8c82 65%, #d99b26 80%, #c25e38 95%)' }}
        >
          <div
            ref={vuMeterRightRef}
            className="meter-vertical absolute inset-0 bg-[var(--cordel-bg)] w-full h-full pointer-events-none"
            style={{ transform: 'scaleY(1)', transformOrigin: 'top', transition: 'none' }}
          />
        </div>
      </div>
    </div>
  );
};
