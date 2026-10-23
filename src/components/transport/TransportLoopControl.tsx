
import React, { useRef, useState, useEffect } from 'react';
import { Repeat, ArrowRightToLine } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';

interface TransportLoopControlProps {
  isLooping: boolean;
  setIsLooping: (val: boolean) => void;
  isPlaying: boolean;
  loopMode: any;
  currentLoopIteration: number;
  isLoopBypassed: boolean;
  isLoopExitRequested: boolean;
  lang: string;
}

export const TransportLoopControl: React.FC<TransportLoopControlProps> = ({
  isLooping,
  setIsLooping,
  isPlaying,
  loopMode,
  currentLoopIteration,
  isLoopBypassed,
  isLoopExitRequested,
  lang,
}) => {
  const [showLoopMenu, setShowLoopMenu] = useState(false);
  const loopBtnRef = useRef<HTMLButtonElement>(null);
  const loopMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let prev = useSequencerStore.getState().isLoopExitRequested;
    const unsub = useSequencerStore.subscribe((state) => {
      const isRequested = state.isLoopExitRequested;
      if (isRequested === prev) return;
      prev = isRequested;
      if (loopBtnRef.current) {
        if (isRequested) {
          loopBtnRef.current.classList.add('animate-pulse', 'bg-orange-500/60', 'text-white');
          loopBtnRef.current.classList.remove('bg-[var(--cordel-wood)]', 'text-[#f4ecd8]', 'bg-[var(--cordel-bg)]', 'text-[var(--cordel-text)]');
          loopBtnRef.current.querySelector('.icon-repeat')?.classList.add('hidden');
          loopBtnRef.current.querySelector('.icon-arrow')?.classList.remove('hidden');
          loopBtnRef.current.querySelector('.loop-count')?.classList.add('hidden');
        } else {
          loopBtnRef.current.classList.remove('animate-pulse', 'bg-orange-500/60', 'text-white');
          loopBtnRef.current.querySelector('.icon-repeat')?.classList.remove('hidden');
          loopBtnRef.current.querySelector('.icon-arrow')?.classList.add('hidden');
          loopBtnRef.current.querySelector('.loop-count')?.classList.remove('hidden');
          if (useSequencerStore.getState().isLooping) {
            loopBtnRef.current.classList.add('bg-[var(--cordel-wood)]', 'text-[#f4ecd8]');
          } else {
            loopBtnRef.current.classList.add('bg-[var(--cordel-bg)]', 'text-[var(--cordel-text)]');
          }
        }
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (loopMenuRef.current && !loopMenuRef.current.contains(e.target as Node)) setShowLoopMenu(false);
    };
    if (showLoopMenu) {
      window.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showLoopMenu]);

  return (
    <div className="relative flex items-center shrink-0" ref={loopMenuRef}>
      <button
        ref={loopBtnRef}
        onClick={() => {
          const s = useSequencerStore.getState();
          if (isPlaying && isLooping && !s.isLoopExitRequested) {
            s.requestLoopExit();
          } else {
            setIsLooping(!isLooping);
            if (s.isLoopExitRequested) s.clearLoopExitRequest();
          }
        }}
        className={`w-12 h-12 sm:w-14 sm:h-14 cordel-border cordel-button flex flex-col items-center justify-center cursor-pointer transition-all relative shrink-0 ${
          isLoopBypassed ? 'bg-orange-500 text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]' : isLooping ? (isLoopExitRequested ? 'bg-orange-500/60 text-white animate-pulse' : 'bg-[var(--cordel-wood)] text-[#f4ecd8] border-[var(--cordel-border)]') : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] opacity-60 hover:opacity-100'
        }`}
        title={lang === 'fr' ? 'Activer / désactiver la boucle' : 'Ativar / desativar loop'}
      >
        <Repeat className={`w-5 h-5 sm:w-6 sm:h-6 icon-repeat ${(!isLooping || isLoopBypassed || isLoopExitRequested) ? 'hidden' : ''}`} />
        <ArrowRightToLine className={`w-5 h-5 sm:w-6 sm:h-6 icon-arrow ${(isLooping && !isLoopBypassed && !isLoopExitRequested) ? 'hidden' : ''}`} />
        <span className={`text-[8px] sm:text-[9px] font-bold mt-[-2px] loop-count ${(!isLooping || isLoopBypassed || isLoopExitRequested) ? 'hidden' : ''}`}>
          {loopMode === 'infinite' ? '∞' : Math.max(0, loopMode - currentLoopIteration + 1) + 'x'}
        </span>
      </button>

      <button
        onClick={() => setShowLoopMenu(!showLoopMenu)}
        className="w-3.5 sm:w-4 h-12 sm:h-14 cordel-border-sm cordel-button flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] ml-0.5 shrink-0"
        title={lang === 'fr' ? 'Paramètres de boucle' : 'Configurar loop'}
      >
        <span className="text-[9px] sm:text-[10px]">▼</span>
      </button>

      {showLoopMenu && (
        <div className="absolute bottom-[calc(100%+8px)] right-0 sm:left-1/2 sm:-translate-x-1/2 w-36 bg-[var(--cordel-bg)] cordel-border z-50 shadow-[4px_4px_0_rgba(0,0,0,1)] flex flex-col">
          <button
            onClick={() => { useSequencerStore.getState().setLoopMode('infinite'); setShowLoopMenu(false); }}
            className={`px-3 py-2 text-left text-sm font-bold border-b border-[var(--cordel-border)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] ${loopMode === 'infinite' ? 'bg-[var(--cordel-wood)] text-[#f4ecd8]' : 'text-[var(--cordel-text)]'}`}
          >
            {lang === 'fr' ? '∞ Infini' : '∞ Infinito'}
          </button>
          <div className="flex items-center gap-2 px-3 py-2 bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-b border-[var(--cordel-border)]">
            <input
              type="number"
              min={1}
              max={99}
              value={loopMode === 'infinite' ? 4 : loopMode}
              onChange={(e) => { const val = parseInt(e.target.value); if (!isNaN(val) && val > 0) useSequencerStore.getState().setLoopMode(val); }}
              onKeyDown={(e) => { if (e.key === 'Enter') setShowLoopMenu(false); }}
              className="w-12 text-sm font-bold border-2 border-[var(--cordel-border)] px-1 py-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] outline-none focus:bg-[var(--cordel-border)]/10"
            />
            <span className="text-xs font-bold">{lang === 'fr' ? 'fois' : 'vezes'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
