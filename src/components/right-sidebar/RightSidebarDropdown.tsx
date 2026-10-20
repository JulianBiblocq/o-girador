/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Language } from '../../types';
import { XiloInfo, XiloScroll, XiloHand, XiloBook, XiloChat } from '../XiloIcons';

interface RightSidebarDropdownProps {
  subTab: 'toada' | 'info' | 'legendes' | 'sinais' | 'feedback';
  setSubTab: (tab: 'toada' | 'info' | 'legendes' | 'sinais' | 'feedback') => void;
  onTogglePanel: (panel: 'legend' | 'letras' | 'info' | 'feedback' | 'sinais', force?: boolean) => void;
  lang: Language;
  t: (key: string) => string;
  isMobile: boolean;
}

export const RightSidebarDropdown: React.FC<RightSidebarDropdownProps> = ({
  subTab,
  setSubTab,
  onTogglePanel,
  lang,
  t,
  isMobile,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const options = [
    { value: 'info', label: lang === 'fr' ? 'Informations' : 'Informações', Icon: XiloInfo, panel: 'info' as const },
    { value: 'toada', label: 'Toada', Icon: XiloScroll, panel: 'letras' as const },
    { value: 'sinais', label: lang === 'fr' ? 'Signes' : 'Sinais', Icon: XiloHand, panel: 'info' as const },
    { value: 'legendes', label: t('legend'), Icon: XiloBook, panel: 'legend' as const },
    { value: 'feedback', label: lang === 'fr' ? 'Note & Avis' : 'Nota & Opinião', Icon: XiloChat, panel: 'feedback' as const },
  ];
  const activeOption = options.find(o => o.value === subTab) || options[0];

  return (
    <div className="flex gap-2 items-center mb-4 shrink-0 mt-1">
      <div className="flex-grow relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full py-2 pl-3 pr-8 font-cactus font-bold text-[12px] uppercase cordel-border-sm cursor-pointer bg-[var(--cordel-bg)] text-[var(--cordel-text)] focus:outline-none flex items-center gap-2 select-none justify-between h-[36px]"
        >
          <div className="flex items-center gap-2 truncate">
            <activeOption.Icon size={14} className="shrink-0" />
            <span className="truncate">{activeOption.label}</span>
          </div>
          <span className="text-[10px] shrink-0 opacity-80">▼</span>
        </button>

        {dropdownOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--cordel-bg)] cordel-border-sm shadow-[3px_3px_0_var(--cordel-border)] z-50 flex flex-col py-1 max-h-[220px] overflow-y-auto custom-scrollbar">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setSubTab(opt.value as any);
                  onTogglePanel(opt.panel, true);
                  setDropdownOpen(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 text-[11px] font-cactus uppercase font-bold transition-colors w-full text-left cursor-pointer ${
                  subTab === opt.value
                    ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
                    : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)]/10'
                }`}
              >
                <opt.Icon size={13} className="shrink-0" />
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {isMobile && (
        <button
          onClick={() => onTogglePanel('letras')}
          className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button px-3 py-2 text-sm font-bold hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors h-full flex items-center justify-center shrink-0"
        >
          ✖
        </button>
      )}
    </div>
  );
};
