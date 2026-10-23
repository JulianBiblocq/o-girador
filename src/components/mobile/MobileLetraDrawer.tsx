
import React, { useEffect, useRef, useState } from 'react';
import { X, BookOpen, Info } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { subscribeToTick, unsubscribeFromTick } from '../../audio/visualTickBuffer';
import { instrumentsConfig } from '../../data';
import { MobileSongInfoTab } from './MobileSongInfoTab';

interface Props {
  onClose: () => void;
  lang?: 'fr' | 'pt';
  initialTab?: 'lyrics' | 'info';
}

export const MobileLetraDrawer: React.FC<Props> = ({ onClose, lang = 'pt', initialTab = 'lyrics' }) => {
  const [activeTab, setActiveTab] = useState<'lyrics' | 'info'>(initialTab);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMeasureRef = useRef<number>(-1);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

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
    <div className="absolute inset-0 z-30 bg-[var(--cordel-bg)] text-[var(--cordel-text)] flex flex-col overflow-hidden select-none border-t border-[var(--cordel-border)]">
      <div className="h-10 px-2 bg-[var(--cordel-surface)] border-b border-[var(--cordel-border)] flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-1 min-w-0">
          <button
            onClick={() => setActiveTab('lyrics')}
            className={`px-2 py-1 font-cactus font-bold text-xs uppercase flex items-center gap-1 border transition-colors cursor-pointer truncate ${
              activeTab === 'lyrics'
                ? 'bg-[#b94a2c] text-[#f4ecd8] border-black shadow-xs'
                : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)] hover:border-[#b94a2c]'
            }`}
          >
            <BookOpen size={12} className="shrink-0" />
            <span className="truncate">{lang === 'pt' ? 'Letra da Toada' : 'Paroles (Letra)'}</span>
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`px-2 py-1 font-cactus font-bold text-xs uppercase flex items-center gap-1 border transition-colors cursor-pointer truncate ${
              activeTab === 'info'
                ? 'bg-[#b94a2c] text-[#f4ecd8] border-black shadow-xs'
                : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)] hover:border-[#b94a2c]'
            }`}
          >
            <Info size={12} className="shrink-0" />
            <span className="truncate">{lang === 'pt' ? 'Infos & Vídeo' : 'Infos & Vidéo'}</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="px-2 py-1 bg-[#b94a2c] text-[#f4ecd8] font-cactus font-bold text-xs uppercase cordel-border-sm flex items-center gap-1 active:translate-y-0.5 cursor-pointer shrink-0"
        >
          <X size={13} />
          <span>{lang === 'pt' ? 'Faders' : 'Fermer'}</span>
        </button>
      </div>

      {activeTab === 'lyrics' ? (
        <div ref={containerRef} className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar">
          {measureRows.length > 0 ? (
            measureRows.map((row) => (
              <div
                key={row.measure}
                data-measure-row={row.measure}
                className="px-2 py-1.5 border-l-4 border-transparent transition-colors flex flex-col gap-0.5 rounded-xs"
              >
                <span className="font-mono text-[9px] text-[var(--cordel-text-muted)]">M{row.measure + 1}</span>
                {row.pux && <div className="text-sm font-bold text-[#c25e38] font-sans leading-snug">{row.pux}</div>}
                {row.coro && <div className="text-sm font-bold text-[#2563eb] dark:text-[#60a5fa] font-sans leading-snug">[{row.coro}]</div>}
              </div>
            ))
          ) : globalLetras ? (
            <pre className="whitespace-pre-wrap font-sans text-xs text-[var(--cordel-text)] leading-relaxed opacity-90 p-2">
              {globalLetras}
            </pre>
          ) : (
            <div className="text-center italic text-[var(--cordel-text-muted)] text-xs py-8 font-sans">
              {lang === 'pt' ? 'Nenhuma letra disponível para este arranjo.' : 'Aucune parole disponible pour ce morceau.'}
            </div>
          )}
        </div>
      ) : (
        <MobileSongInfoTab lang={lang} />
      )}
    </div>
  );
};
