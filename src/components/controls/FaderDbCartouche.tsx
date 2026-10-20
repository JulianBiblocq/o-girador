import React, { useRef, useEffect, useState } from 'react';
import { 
  faderPositionToDb, 
  faderPositionToDbString, 
  UNITY_GAIN_FADER_POSITION,
  dbToFaderPosition,
  parseDbInput
} from '../../utils/audioMath';

interface FaderDbCartoucheProps {
  value: number;
  defaultValue?: number;
  fontSize?: string;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  onCommitPosition: (newPos: number) => void;
  resetToUnity: (e?: React.SyntheticEvent | Event) => void;
  setTextRef: (el: HTMLSpanElement | null) => void;
}

export const FaderDbCartouche: React.FC<FaderDbCartoucheProps> = ({
  value,
  defaultValue = UNITY_GAIN_FADER_POSITION,
  fontSize,
  isEditing,
  setIsEditing,
  onCommitPosition,
  resetToUnity,
  setTextRef,
}) => {
  const cartoucheRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const lastTouchTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleCartoucheClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentVal = value ?? defaultValue;
    const currentDb = faderPositionToDb(currentVal);
    let str = '';
    if (!Number.isFinite(currentDb) || currentDb <= -60) str = '-inf';
    else if (Math.abs(currentDb) < 0.05) str = '0.0';
    else if (currentDb > 0) str = `+${currentDb.toFixed(1)}`;
    else {
      const isClean = Math.abs(Math.round(currentDb) - currentDb) < 0.08;
      str = isClean ? `${Math.round(currentDb)}` : currentDb.toFixed(1);
    }
    setInputValue(str);
    setIsEditing(true);
  };

  const commitInput = () => {
    if (!isEditing) return;
    setIsEditing(false);
    const dbVal = parseDbInput(inputValue);
    const newPos = Math.round(dbToFaderPosition(dbVal));
    onCommitPosition(newPos);
  };

  useEffect(() => {
    const el = cartoucheRef.current;
    if (!el) return;
    const handleTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const now = performance.now();
        if (now - lastTouchTimeRef.current < 300) {
          e.preventDefault();
          lastTouchTimeRef.current = 0;
          resetToUnity(e);
          setIsEditing(false);
          return;
        }
        lastTouchTimeRef.current = now;
      }
    };
    el.addEventListener('touchstart', handleTouch, { passive: false });
    return () => el.removeEventListener('touchstart', handleTouch);
  }, [resetToUnity, setIsEditing]);

  return (
    <div 
      ref={cartoucheRef}
      data-testid="fader-db-cartouche"
      onClick={!isEditing ? handleCartoucheClick : undefined}
      onDoubleClick={(e) => {
        resetToUnity(e);
        setIsEditing(false);
      }}
      title="Cliquer pour éditer, double-cliquer pour réinitialiser à 0.0 dB"
      className="shrink-0 w-12 min-w-[48px] max-w-[48px] h-[19px] flex items-center justify-center mt-0.5 px-0.5 py-[1.5px] rounded-[2px] bg-[#1a1a1a] border border-[#3d3830] shadow-xs cursor-pointer select-none overflow-hidden hover:border-[#5a5245] hover:bg-[#242424] active:scale-95 transition-all text-[#f4ecd8]"
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') commitInput();
            else if (e.key === 'Escape') setIsEditing(false);
          }}
          onBlur={commitInput}
          onDoubleClick={(e) => {
            e.stopPropagation();
            resetToUnity(e);
            setIsEditing(false);
          }}
          className="w-full h-full text-center bg-transparent border-none outline-none font-mono tabular-nums font-bold text-[10px] p-0 m-0 leading-none cursor-text select-all text-[#f4ecd8]"
          style={{ color: '#f4ecd8' }}
        />
      ) : (
        <span
          ref={setTextRef}
          className={`${fontSize || 'text-[10px]'} w-full text-center font-mono tabular-nums font-bold select-none tracking-tight leading-none truncate pointer-events-none text-[#f4ecd8]`}
          style={{ color: '#f4ecd8' }}
        >
          {faderPositionToDbString(value ?? defaultValue)}
        </span>
      )}
    </div>
  );
};
