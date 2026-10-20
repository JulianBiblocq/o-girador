/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useCallback, useEffect } from 'react';
import { Gauge } from 'lucide-react';

interface TransportBpmControlProps {
  bpm: number;
  setBpm: React.Dispatch<React.SetStateAction<number>>;
  lang: string;
}

export const TransportBpmControl: React.FC<TransportBpmControlProps> = ({ bpm, setBpm, lang }) => {
  const bpmIntervalRef = useRef<number | null>(null);
  const bpmTimeoutRef = useRef<number | null>(null);

  const stopBpmChange = useCallback(() => {
    if (bpmTimeoutRef.current) { window.clearTimeout(bpmTimeoutRef.current); bpmTimeoutRef.current = null; }
    if (bpmIntervalRef.current) { window.clearInterval(bpmIntervalRef.current); bpmIntervalRef.current = null; }
  }, []);

  const startBpmChange = useCallback((delta: number) => {
    setBpm(prev => Math.min(240, Math.max(40, prev + delta)));
    bpmTimeoutRef.current = window.setTimeout(() => {
      bpmIntervalRef.current = window.setInterval(() => {
        setBpm(prev => Math.min(240, Math.max(40, prev + delta)));
      }, 75);
    }, 400);
  }, [setBpm]);

  useEffect(() => stopBpmChange, [stopBpmChange]);

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 bg-[var(--cordel-bg)] px-2 h-8 rounded-none border-2 border-[#1a1a1a] dark:border-black/60 shadow-[1px_1px_0px_#1a1a1a]">
      <Gauge className="w-4 h-4 text-[var(--cordel-text)] shrink-0" />
      <span className="font-cactus font-bold text-xs sm:text-sm text-[var(--cordel-text)] tabular-nums select-none">{bpm}</span>
      <span className="text-[10px] font-mono font-bold text-[var(--cordel-text)]/70 uppercase select-none">BPM</span>
      <div className="flex items-center gap-1 ml-0.5">
        <button
          onPointerDown={(e) => { e.preventDefault(); startBpmChange(-1); }}
          onPointerUp={(e) => { e.preventDefault(); stopBpmChange(); }}
          onPointerLeave={(e) => { e.preventDefault(); stopBpmChange(); }}
          onPointerCancel={(e) => { e.preventDefault(); stopBpmChange(); }}
          className="w-5 h-5 flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[#1a1a1a] dark:border-black/60 font-bold text-xs cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] rounded-none active:scale-95 transition-all select-none"
          title={lang === 'fr' ? 'Diminuer la vitesse' : 'Diminuir a velocidade'}
          style={{ padding: 0, touchAction: 'none' }}
        >
          -
        </button>
        <button
          onPointerDown={(e) => { e.preventDefault(); startBpmChange(1); }}
          onPointerUp={(e) => { e.preventDefault(); stopBpmChange(); }}
          onPointerLeave={(e) => { e.preventDefault(); stopBpmChange(); }}
          onPointerCancel={(e) => { e.preventDefault(); stopBpmChange(); }}
          className="w-5 h-5 flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[#1a1a1a] dark:border-black/60 font-bold text-xs cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] rounded-none active:scale-95 transition-all select-none"
          title={lang === 'fr' ? 'Augmenter la vitesse' : 'Aumentar a velocidade'}
          style={{ padding: 0, touchAction: 'none' }}
        >
          +
        </button>
      </div>
    </div>
  );
};
