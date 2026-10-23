
import React, { useState } from 'react';
import { Save, Check } from 'lucide-react';

interface LocalSectionProps {
  localPresets: string[];
  lang: 'pt' | 'fr';
  isItemActive: (val: string, name: string) => boolean;
  onItemClick: (val: string) => void;
}

export const PresetAccordionLocalSection: React.FC<LocalSectionProps> = ({
  localPresets,
  lang,
  isItemActive,
  onItemClick,
}) => {
  const [isLocalOpen, setIsLocalOpen] = useState(false);

  if (localPresets.length === 0) return null;

  return (
    <div className="flex flex-col cordel-border-sm bg-[var(--cordel-bg)] overflow-hidden">
      <button
        type="button"
        onClick={() => setIsLocalOpen((prev) => !prev)}
        className="flex items-center justify-between px-2.5 py-1.5 bg-[var(--cordel-bg)] hover:bg-[var(--cordel-text)]/10 text-[var(--cordel-text)] font-cactus font-bold text-xs transition-colors cursor-pointer select-none text-left w-full"
      >
        <span className="flex items-center gap-1.5 truncate">
          <Save size={13} className="shrink-0 text-[#d99b26]" />
          <span className="truncate">{lang === 'pt' ? 'Meus Presets' : 'Mes Presets'}</span>
          <span className="text-[10px] opacity-60 font-sans">({localPresets.length})</span>
        </span>
        <span className="text-[9px] opacity-70 ml-1">{isLocalOpen ? '▼' : '►'}</span>
      </button>
      {isLocalOpen && (
        <div className="flex flex-col gap-1 p-1.5 pt-0 max-h-48 overflow-y-auto border-t border-[var(--cordel-border)]/20">
          {localPresets.map((name) => (
            <button
              key={`local:${name}`}
              type="button"
              title={name}
              onClick={() => onItemClick(`local:${name}`)}
              className={`w-full text-left px-2.5 py-1.5 text-xs font-cactus font-bold flex items-center justify-between gap-1 transition-colors cursor-pointer cordel-border-sm min-w-0 ${
                isItemActive(`local:${name}`, name)
                  ? 'bg-[var(--cordel-wood)] text-[#f4ecd8] border-[var(--cordel-wood)]'
                  : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
              }`}
            >
              <span className="flex items-center gap-1.5 min-w-0 flex-1">
                <Save size={11} className="shrink-0 opacity-70" />
                <span className="truncate">{name}</span>
              </span>
              {isItemActive(`local:${name}`, name) && <Check size={12} className="shrink-0 ml-1" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
