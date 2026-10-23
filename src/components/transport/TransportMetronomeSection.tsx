
import React, { useRef, useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { TransportPreRollPopup } from './TransportPreRollPopup';

interface TransportMetronomeSectionProps {
  isMetroOn: boolean;
  setIsMetroOn: (val: boolean) => void;
  preRollSettings: any;
  setPreRollSettings: (settings: any) => void;
  availableSignals: any[];
  lang: string;
  t: (key: string) => string;
}

export const TransportMetronomeSection: React.FC<TransportMetronomeSectionProps> = ({
  isMetroOn,
  setIsMetroOn,
  preRollSettings,
  setPreRollSettings,
  availableSignals,
  lang,
  t,
}) => {
  const [isPreRollPopupOpen, setIsPreRollPopupOpen] = useState(false);
  const metroContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPreRollPopupOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (metroContainerRef.current && !metroContainerRef.current.contains(e.target as Node)) {
        setIsPreRollPopupOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPreRollPopupOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPreRollPopupOpen]);

  return (
    <div className="relative flex items-center bg-[var(--cordel-bg)] h-8 rounded-none border-2 border-[#1a1a1a] dark:border-black/60 shadow-[1px_1px_0px_#1a1a1a]" ref={metroContainerRef}>
      <button
        onClick={() => setIsMetroOn(!isMetroOn)}
        className={`px-2 sm:px-2.5 font-cactus font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 h-full transition-colors cursor-pointer select-none rounded-none ${
          isMetroOn ? 'bg-[var(--cordel-wood)] text-[#f4ecd8]' : 'bg-transparent text-[var(--cordel-text)] hover:bg-[var(--cordel-text)]/5'
        }`}
        title={t('metroBtn')}
      >
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3L4 21h16L12 3z" />
          <line x1="12" y1="18" x2="16" y2="7" />
          <circle cx="15" cy="9.5" r="1.5" fill="currentColor" />
          <circle cx="12" cy="18" r="1" fill="currentColor" />
        </svg>
        <span className="select-none hidden md:inline">{lang === 'fr' ? 'Métronome' : lang === 'pt' ? 'Metrônomo' : 'Metronome'}</span>
        {preRollSettings.enabled && (
          <span className="px-1 py-0.2 bg-amber-600 text-white rounded-none text-[10px] font-sans font-bold leading-none shadow-xs">
            {preRollSettings.measuresCount}M
          </span>
        )}
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); setIsPreRollPopupOpen(!isPreRollPopupOpen); }}
        className={`px-1.5 h-full flex items-center justify-center border-l-2 border-[#1a1a1a] dark:border-black/60 hover:bg-[var(--cordel-text)]/10 cursor-pointer transition-colors rounded-none ${
          isPreRollPopupOpen ? 'bg-[var(--cordel-text)]/15 text-[var(--cordel-text)]' : 'text-[var(--cordel-text)]'
        }`}
        title={lang === 'fr' ? 'Réglages du précompte' : 'Configurações de contagem'}
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isPreRollPopupOpen ? 'rotate-180' : ''}`} />
      </button>

      {isPreRollPopupOpen && (
        <TransportPreRollPopup
          lang={lang}
          preRollSettings={preRollSettings}
          setPreRollSettings={setPreRollSettings}
          availableSignals={availableSignals}
          onClose={() => setIsPreRollPopupOpen(false)}
        />
      )}
    </div>
  );
};
