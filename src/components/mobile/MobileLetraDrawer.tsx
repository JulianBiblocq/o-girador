/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { X, Mic } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { subscribeToTick, unsubscribeFromTick } from '../../audio/visualTickBuffer';
import { instrumentsConfig } from '../../data';

interface Props {
  onClose: () => void;
  lang?: 'fr' | 'pt';
}

export const MobileLetraDrawer: React.FC<Props> = ({ onClose, lang = 'pt' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMeasureRef = useRef<number>(-1);

  const tracks = useSequencerStore((s) => s.tracks);
  const totalMeasures = useSequencerStore((s) => s.totalMeasures || 1);
  const globalLetras = useSequencerStore((s) => s.letras);

  useEffect(() => {
    const handleTick = () => {
      const curM = useSequencerStore.getState().currentMeasure;
      if (curM === lastMeasureRef.current) return;
      lastMeasureRef.current = curM;
      const rows = containerRef.current?.querySelectorAll<HTMLElement>('[data-measure-row]');
      rows?.forEach((row) => {
        const m = parseInt(row.getAttribute('data-measure-row') || '-1', 10);
        if (m === curM) {
          row.style.borderLeftColor = '#b94a2c';
          row.style.backgroundColor = '#b94a2c22';
        } else {
          row.style.borderLeftColor = 'transparent';
          row.style.backgroundColor = 'transparent';
        }
      });
    };
    subscribeToTick(handleTick);
    return () => unsubscribeFromTick(handleTick);
  }, []);

  const puxTrack = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
  const coroTrack = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');

  const measureRows: Array<{ measure: number; pux: string; coro: string }> = [];
  for (let m = 0; m < totalMeasures; m++) {
    const pPat = puxTrack?.patterns?.find((p) => p.measureAssignments?.[m]);
    const cPat = coroTrack?.patterns?.find((p) => p.measureAssignments?.[m]);
    const pText = pPat?.lyrics?.filter((l) => l && l.trim() && l.trim() !== '-').join(' ') || '';
    const cText = cPat?.lyrics?.filter((l) => l && l.trim() && l.trim() !== '-').join(' ') || '';
    if (pText || cText) measureRows.push({ measure: m, pux: pText, coro: cText });
  }

  return (
    <div className="absolute inset-0 z-30 bg-[#121212] flex flex-col overflow-hidden select-none border-t border-[var(--cordel-border)]">
      <div className="h-10 px-3 bg-[#1a1a1a] border-b border-[var(--cordel-border)] flex items-center justify-between shrink-0">
        <span className="font-cactus font-bold text-xs uppercase tracking-wider text-[var(--cordel-text)] flex items-center gap-1.5">
          <Mic size={14} className="text-[#b94a2c]" />
          <span>{lang === 'pt' ? 'Letra da Toada' : 'Paroles de la Toada'}</span>
        </span>
        <button
          onClick={onClose}
          className="px-2 py-1 bg-[#b94a2c] text-[#f4ecd8] font-cactus font-bold text-xs uppercase cordel-border-sm flex items-center gap-1 active:translate-y-0.5"
        >
          <X size={13} />
          <span>{lang === 'pt' ? 'Faders' : 'Retour aux Faders'}</span>
        </button>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar">
        {measureRows.length > 0 ? (
          measureRows.map((row) => (
            <div
              key={row.measure}
              data-measure-row={row.measure}
              className="px-2 py-1.5 border-l-4 border-transparent transition-colors flex flex-col gap-0.5 rounded-xs"
            >
              <span className="font-mono text-[9px] text-[#f4ecd8]/40">M{row.measure + 1}</span>
              {row.pux && <div className="text-sm font-bold text-[#c25e38] font-sans leading-snug">{row.pux}</div>}
              {row.coro && <div className="text-sm font-bold text-[#1e40af] font-sans leading-snug">[{row.coro}]</div>}
            </div>
          ))
        ) : globalLetras ? (
          <pre className="whitespace-pre-wrap font-sans text-xs text-[var(--cordel-text)] leading-relaxed opacity-90 p-2">
            {globalLetras}
          </pre>
        ) : (
          <div className="text-center italic opacity-60 text-xs py-8 font-sans">
            {lang === 'pt' ? 'Nenhuma letra disponível para este arranjo.' : 'Aucune parole disponible pour ce morceau.'}
          </div>
        )}
      </div>
    </div>
  );
};
