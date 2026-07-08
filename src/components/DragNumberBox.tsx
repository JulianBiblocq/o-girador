import React, { useRef, useEffect } from 'react';

interface DragNumberBoxProps {
  label: string;
  value: number; // 0 to 100
  onChange: (val: number) => void;
  onAudioDrag?: (val: number) => void;
  className?: string;
  disabled?: boolean;
}

const DragNumberBoxComponent: React.FC<DragNumberBoxProps> = ({ 
  label, 
  value, 
  onChange, 
  onAudioDrag,
  className = '', 
  disabled = false 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const valueSpanRef = useRef<HTMLSpanElement>(null);
  const startYRef = useRef<number>(0);
  const startValRef = useRef<number>(0);
  const currentValRef = useRef<number>(value);
  const isDraggingRef = useRef<boolean>(false);

  const onAudioDragRef = useRef(onAudioDrag);
  onAudioDragRef.current = onAudioDrag;

  useEffect(() => {
    currentValRef.current = value;
    if (valueSpanRef.current && !isDraggingRef.current) {
      valueSpanRef.current.textContent = disabled ? '—' : `${value}%`;
    }
  }, [value, disabled]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    containerRef.current?.setPointerCapture(e.pointerId);
    startYRef.current = e.clientY;
    startValRef.current = currentValRef.current;
    isDraggingRef.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !isDraggingRef.current || !containerRef.current?.hasPointerCapture(e.pointerId)) return;
    const dy = startYRef.current - e.clientY; // Dragging up increases value
    // Scale: 1.5px drag = 1% value change
    const delta = Math.round(dy / 1.5);
    const newVal = Math.max(0, Math.min(100, startValRef.current + delta));
    currentValRef.current = newVal;
    if (valueSpanRef.current) {
      valueSpanRef.current.textContent = `${newVal}%`;
    }
    if (onAudioDragRef.current) {
      onAudioDragRef.current(newVal);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (containerRef.current?.hasPointerCapture(e.pointerId)) {
      containerRef.current.releasePointerCapture(e.pointerId);
      isDraggingRef.current = false;
      onChange(currentValRef.current);
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`flex items-center justify-between px-2 py-0.5 text-[9px] font-bold select-none border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] shadow-[1px_1px_0_var(--cordel-border)] transition-all ${
        disabled 
          ? 'opacity-35 cursor-not-allowed' 
          : 'cursor-row-resize active:translate-y-[0.5px] active:shadow-none'
      } ${className}`}
    >
      <span className="uppercase opacity-60 tracking-wider font-sans">{label}</span>
      <span ref={valueSpanRef} className="font-mono font-bold text-[10px] ml-1">
        {disabled ? '—' : `${value}%`}
      </span>
    </div>
  );
};

export const DragNumberBox = React.memo(DragNumberBoxComponent);

