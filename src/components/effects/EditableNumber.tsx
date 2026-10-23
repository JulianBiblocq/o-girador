
import React, { useState } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';

interface EditableNumberProps {
  value: number;
  suffix?: string;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
  className?: string;
}

export const EditableNumber: React.FC<EditableNumberProps> = ({
  value,
  suffix = '',
  min = 0,
  max = 100,
  onChange,
  className = '',
}) => {
  const lang = useSequencerStore((state) => state.lang);
  const [isEditing, setIsEditing] = useState(false);
  const [tempVal, setTempVal] = useState(String(value));

  if (isEditing) {
    return (
      <input
        type="number"
        value={tempVal}
        autoFocus
        onChange={(e) => setTempVal(e.target.value)}
        onBlur={() => {
          const num = parseInt(tempVal, 10);
          if (!isNaN(num)) onChange(Math.max(min, Math.min(max, num)));
          setIsEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') setIsEditing(false);
        }}
        className={`w-12 text-right bg-[#eaddcf] border border-[#1a1a1a] text-[#1a1a1a] outline-none text-[10px] p-0 rounded-sm shadow-inner font-bold ${className}`}
      />
    );
  }

  return (
    <span
      onClick={() => {
        setTempVal(String(value));
        setIsEditing(true);
      }}
      className={`cursor-pointer hover:underline decoration-dashed underline-offset-2 ${className}`}
      title={lang === 'fr' ? 'Cliquer pour modifier' : 'Clique para editar'}
    >
      {value > 0 && min < 0 ? `+${value}` : value}
      {suffix}
    </span>
  );
};
