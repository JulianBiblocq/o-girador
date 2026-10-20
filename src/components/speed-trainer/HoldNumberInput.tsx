import React, { useState, useEffect, useRef } from 'react';

export interface NumberInputProps {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  className?: string;
  ariaLabel?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  min,
  max,
  onChange,
  className = '',
  ariaLabel,
}) => {
  const [text, setText] = useState<string>(String(value));
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setText(String(value));
    }
  }, [value]);

  const commit = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) {
      setText(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, parsed));
    onChange(clamped);
    setText(String(clamped));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={ariaLabel}
      value={text}
      onFocus={(e) => {
        isFocusedRef.current = true;
        e.target.select();
      }}
      onChange={(e) => {
        const cleaned = e.target.value.replace(/[^0-9]/g, '');
        setText(cleaned);
      }}
      onBlur={(e) => {
        isFocusedRef.current = false;
        commit(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          (e.target as HTMLInputElement).blur();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const current = parseInt(text, 10) || value;
          commit(String(current + 1));
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const current = parseInt(text, 10) || value;
          commit(String(current - 1));
        }
      }}
      className={className}
    />
  );
};
