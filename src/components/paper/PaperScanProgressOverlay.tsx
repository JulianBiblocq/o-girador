/**
 * Overlay plein écran centré avec barre de progression Cordel pour le scan (< 90 lignes).
 * Zéro mention de Gemini, Vision, IA ou AI. Rendu en portail z-[9999].
 */
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Scan } from 'lucide-react';

interface Props {
  isOpen: boolean;
  lang: 'fr' | 'pt';
  onComplete?: () => void;
}

export const PaperScanProgressOverlay: React.FC<Props> = ({ isOpen, lang, onComplete }) => {
  const [mounted, setMounted] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(10);
  const wasOpenRef = useRef<boolean>(false);
  const isFr = lang === 'fr';

  useEffect(() => {
    let interval: any = null;
    let timer: any = null;

    if (isOpen) {
      wasOpenRef.current = true;
      setMounted(true);
      setProgress(12);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 92) return prev;
          const step = Math.floor(Math.random() * 6) + 3;
          return Math.min(92, prev + step);
        });
      }, 180);
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      setProgress(100);
      timer = setTimeout(() => {
        setMounted(false);
        onComplete?.();
      }, 220);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, onComplete]);

  if (!mounted) return null;

  const modalRoot = (typeof document !== 'undefined' && document.getElementById('modal-root')) || (typeof document !== 'undefined' ? document.body : null);
  if (!modalRoot) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-6 select-none font-sans">
      <div className="bg-[#f4ecd8] text-[#1a1a1a] border-4 border-[#1a1a1a] shadow-[8px_8px_0px_#000] p-6 max-w-sm w-full flex flex-col items-center gap-3">
        <Scan size={36} className="text-[#9a3412] animate-pulse" />
        <div className="flex flex-col items-center gap-0.5 text-center">
          <h3 className="font-cactus font-bold text-lg uppercase tracking-wider text-[#9a3412]">
            {isFr ? 'Scan en cours...' : 'Escaneamento em curso...'}
          </h3>
          <p className="text-xs text-[#1a1a1a]/80 font-medium">
            {isFr ? 'Lecture et découpage des mesures...' : 'Leitura e recorte dos compassos...'}
          </p>
        </div>
        <div className="w-full h-3.5 bg-[#1a1a1a] border border-[#c8963e] rounded-sm overflow-hidden p-0.5 mt-1">
          <div
            className="h-full bg-gradient-to-r from-[#9a3412] to-[#d99b26] transition-all duration-200 rounded-xs"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="font-mono text-xs font-bold text-[#1a1a1a]">
          {Math.round(progress)}%
        </span>
      </div>
    </div>,
    modalRoot
  );
};
