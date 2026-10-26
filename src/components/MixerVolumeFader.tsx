
import React, { useRef, useState } from 'react';
import { faderPositionToDbString, sanitizeFaderPosition, UNITY_GAIN_FADER_POSITION } from '../utils/audioMath';
import { FaderTrackArea } from './controls/FaderTrackArea';
import { FaderDbCartouche } from './controls/FaderDbCartouche';
import { useMixerVolumeFaderSync } from './controls/useMixerVolumeFaderSync';

interface MixerVolumeFaderProps {
  trackId?: number;
  value: number; // 0 to 100 (75 = 0.0 dB Unity Gain)
  onChange: (val: number) => void;
  onAudioDrag?: (val: number) => void;
  defaultValue?: number;
  faderColor?: string;
  textColor?: string;
  height?: number;
  thumbWidth?: number;
  thumbHeight?: number;
  fontSize?: string;
  isMaster?: boolean;
  faderHandleRef?: React.RefObject<HTMLDivElement | null>;
  valueTextRefProp?: React.RefObject<HTMLSpanElement | null>;
  travelRangeRef?: React.MutableRefObject<number>;
  hasVolAuto?: boolean;
  isVolActive?: boolean;
  onToggleVolBypass?: () => void;
}

export const MixerVolumeFader: React.FC<MixerVolumeFaderProps> = ({
  trackId, value, onChange, onAudioDrag, defaultValue = UNITY_GAIN_FADER_POSITION,
  faderColor, textColor: _textColor = 'var(--cordel-text)', height, thumbWidth, thumbHeight,
  fontSize, isMaster = false, faderHandleRef, valueTextRefProp, travelRangeRef,
  hasVolAuto, isVolActive, onToggleVolBypass,
}) => {
  const resolvedFaderColor = faderColor || (isMaster ? 'var(--master-fader-thumb)' : 'var(--cordel-gold)');
  const visualThumbRef = useRef<HTMLDivElement>(null);
  const valueTextRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isEditing, setIsEditing] = useState(false);

  const setThumbRef = (el: HTMLDivElement | null) => {
    (visualThumbRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    if (faderHandleRef) (faderHandleRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };

  const setTextRef = (el: HTMLSpanElement | null) => {
    (valueTextRef as React.MutableRefObject<HTMLSpanElement | null>).current = el;
    if (valueTextRefProp) (valueTextRefProp as React.MutableRefObject<HTMLSpanElement | null>).current = el;
  };

  const resolvedThumbHeight = thumbHeight || 20;
  const resolvedThumbWidth = thumbWidth || (isMaster ? 44 : 32);
  const clampedPosition = sanitizeFaderPosition(value ?? defaultValue);

  if (travelRangeRef) travelRangeRef.current = 100;

  const {
    railRef,
    updateAudioNode,
    resetToUnity,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useMixerVolumeFaderSync({
    trackId, value, defaultValue, onChange, onAudioDrag, isMaster,
    visualThumbRef, valueTextRef, isEditing, setIsEditing
  });

  const handleCommitPosition = (newPos: number) => {
    const safePos = sanitizeFaderPosition(newPos);
    if (visualThumbRef.current) visualThumbRef.current.style.bottom = `${safePos}%`;
    if (valueTextRef.current) valueTextRef.current.textContent = faderPositionToDbString(safePos);
    updateAudioNode(safePos);
    onChange(safePos);
  };

  return (
    <div 
      ref={containerRef}
      className="flex flex-col justify-between items-center relative w-full select-none h-full touch-none"
      style={{ 
        height: height !== undefined ? `${height}px` : '100%',
        minHeight: height !== undefined ? `${height}px` : '60px'
      }}
    >
      <FaderTrackArea
        railRef={railRef}
        resolvedThumbWidth={resolvedThumbWidth}
        resolvedThumbHeight={resolvedThumbHeight}
        setThumbRef={setThumbRef}
        resolvedFaderColor={resolvedFaderColor}
        isMaster={isMaster}
        clampedPosition={clampedPosition}
        handlePointerDown={handlePointerDown}
        handlePointerMove={handlePointerMove}
        handlePointerUp={handlePointerUp}
        resetToUnity={resetToUnity}
      />
      <div className="flex items-center justify-center gap-1 w-full mt-0.5 shrink-0">
        <FaderDbCartouche
          value={clampedPosition}
          defaultValue={defaultValue}
          fontSize={fontSize}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          onCommitPosition={handleCommitPosition}
          resetToUnity={resetToUnity}
          setTextRef={setTextRef}
        />
        {hasVolAuto && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVolBypass?.();
            }}
            className={`w-[18px] h-[19px] shrink-0 rounded-[2px] flex items-center justify-center font-bold text-[9px] cursor-pointer transition-all ${
              isVolActive
                ? 'bg-[var(--cordel-wood)] text-[var(--cordel-parchment-bg)] border border-[var(--cordel-border)]'
                : 'opacity-45 line-through bg-black/40 text-gray-400 border border-dashed border-gray-600'
            }`}
            title={isVolActive ? 'Automation Volume active (Clic: débrayer)' : 'Automation Volume débrayée (Clic: réactiver)'}
          >
            A
          </button>
        )}
      </div>
    </div>
  );
};
