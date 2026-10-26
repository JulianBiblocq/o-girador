import React from 'react';
import { Timer } from 'lucide-react';
import { CameraTimerSec } from './useCameraTimerCountdown';

interface Props {
  timerSec: CameraTimerSec;
  onSelectTimer: (sec: CameraTimerSec) => void;
  disabled?: boolean;
  className?: string;
}

export const CameraTimerSelector: React.FC<Props> = ({
  timerSec,
  onSelectTimer,
  disabled = false,
  className = '',
}) => {
  const options: CameraTimerSec[] = [0, 3, 5];

  return (
    <div
      className={`inline-flex items-center gap-1 bg-black/60 backdrop-blur-xs px-2 py-1 rounded-xs border border-white/20 text-white select-none ${className}`}
    >
      <Timer size={13} className="text-[#ffd369] shrink-0" />
      <div className="flex items-center gap-1">
        {options.map((sec) => {
          const isSelected = timerSec === sec;
          return (
            <button
              key={sec}
              type="button"
              disabled={disabled}
              onClick={() => onSelectTimer(sec)}
              className={`px-1.5 py-0.5 font-mono text-[10px] font-bold rounded-xs cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-[#8b2a1a] text-white font-extrabold border border-white/40 shadow-xs'
                  : 'text-white/80 hover:bg-white/20'
              }`}
              title={`Retardateur ${sec}s`}
            >
              {sec}s
            </button>
          );
        })}
      </div>
    </div>
  );
};
