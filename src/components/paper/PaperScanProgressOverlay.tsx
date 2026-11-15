/**
 * Overlay plein écran centré avec barre de progression Cordel pour le scan (< 90 lignes).
 * Vocabulaire artisanal de lecture optique du manuscrit. Rendu en portail z-[100035].
 */
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Scan } from 'lucide-react';
import { usePortalRoot } from '../../contexts/WindowContext';

interface Props {
  isOpen: boolean;
  lang: 'fr' | 'pt';
  onComplete?: () => void;
}

export const PaperScanProgressOverlay: React.FC<Props> = ({ isOpen, lang, onComplete }) => {
  const portalRoot = usePortalRoot();
  const [mounted, setMounted] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(10);
  const wasOpenRef = useRef<boolean>(false);
  const isFr = lang === 'fr';

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

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

  if (!mounted || !portalRoot) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100035] bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-6 select-none font-sans">
      <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border-strong)] shadow-[8px_8px_0px_var(--cordel-shadow-color)] p-6 max-w-sm w-full flex flex-col items-center gap-3">
        <Scan size={36} className="text-[var(--cordel-accent)] animate-pulse" />
        <div className="flex flex-col items-center gap-0.5 text-center">
          <h3 className="font-cactus font-bold text-lg uppercase tracking-wider text-[var(--cordel-accent)]">
            {isFr ? 'Scan en cours...' : 'Escaneamento em curso...'}
          </h3>
          <p className="text-xs text-[var(--cordel-text)] opacity-80 font-medium">
            {isFr ? 'Lecture et découpage des mesures...' : 'Leitura e recorte dos compassos...'}
          </p>
        </div>
        <div className="w-full h-3.5 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] rounded-none overflow-hidden p-0.5 mt-1">
          <div
            className="h-full bg-[var(--cordel-accent)] origin-left transition-transform duration-200"
            style={{ transform: `scaleX(${Math.max(0, Math.min(100, progress)) / 100})` }}
          />
        </div>
        <span className="font-mono text-xs font-bold text-[var(--cordel-text)]">
          {Math.round(progress)}%
        </span>
      </div>
    </div>,
    portalRoot
  );
};
