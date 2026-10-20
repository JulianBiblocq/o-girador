import React, { useRef, useCallback, useEffect } from 'react';

export interface HoldButtonProps {
  onAction: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  title?: string;
}

export const HoldButton: React.FC<HoldButtonProps> = ({
  onAction,
  disabled = false,
  className = '',
  children,
  title,
}) => {
  const actionRef = useRef(onAction);
  actionRef.current = onAction;

  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current !== null) {
      window.clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || disabledRef.current) return;
    e.preventDefault();
    stop();
    actionRef.current();

    let count = 0;
    timerRef.current = window.setTimeout(() => {
      const runInterval = () => {
        if (disabledRef.current) {
          stop();
          return;
        }
        count++;
        actionRef.current();
        const nextSpeed = count > 12 ? 40 : count > 5 ? 75 : 130;
        intervalRef.current = window.setTimeout(runInterval, nextSpeed);
      };
      runInterval();
    }, 320);
  }, [stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (!disabled) actionRef.current();
        }
      }}
      style={{ touchAction: 'none' }}
      className={className}
    >
      {children}
    </button>
  );
};
