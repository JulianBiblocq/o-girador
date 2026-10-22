/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Bandeau conducteur mobile avec résolution macro-section hiérarchique (< 145 lignes).
 */
import React, { useEffect, useRef } from 'react';
import { Bell, BookOpen } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { useShallow } from 'zustand/react/shallow';
import { subscribeToTick, unsubscribeFromTick } from '../../audio/visualTickBuffer';
import { instrumentsConfig } from '../../data';
import { resolveTopLevelSectionForMeasure } from '../../utils/sections/resolveTopLevelSectionForMeasure';

interface Props {
  isLetraOpen: boolean;
  onToggleLetra: () => void;
  lang?: 'fr' | 'pt';
}

export const MobileCondensedConductor: React.FC<Props> = ({ isLetraOpen, onToggleLetra, lang: propLang }) => {
  const beatRefs = [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)];
  const isMetroOn = useTransportStore((s) => s.isMetroOn);
  const setIsMetroOn = useTransportStore((s) => s.setIsMetroOn);

  const { lang: sLang, currentMeasure, totalMeasures, loopMode, currentLoopIteration, songSections, songMarkers, measureSignals, mestreSignals, tracks } =
    useSequencerStore(
      useShallow((s) => ({
        lang: s.lang, currentMeasure: s.currentMeasure, totalMeasures: s.totalMeasures,
        loopMode: s.loopMode ?? 'infinite', currentLoopIteration: s.currentLoopIteration ?? 1,
        songSections: s.songSections || [], songMarkers: s.songMarkers || [],
        measureSignals: s.measureSignals || [], mestreSignals: s.mestreSignals || [],
        tracks: s.tracks || [],
      }))
    );
  const lang = sLang || propLang || 'pt';

  useEffect(() => {
    let lastBeat = -1;
    const handleTick = (detail: any) => {
      const beat = (detail.isPreRoll && typeof detail.preRollBeat === 'number')
        ? detail.preRollBeat : Math.min(3, Math.max(0, Math.floor((detail.ratio ?? 0) * 4)));
      if (beat === lastBeat) return;
      lastBeat = beat;
      beatRefs.forEach((ref, idx) => {
        const el = ref.current;
        if (!el) return;
        el.style.backgroundColor = idx === beat ? '#b94a2c' : 'var(--cordel-card-btn-bg)';
        el.style.color = idx === beat ? '#f4ecd8' : 'var(--cordel-card-btn-text)';
      });
    };
    subscribeToTick(handleTick);
    return () => unsubscribeFromTick(handleTick);
  }, []);

  const topSection = resolveTopLevelSectionForMeasure(songSections, songMarkers, currentMeasure);
  const activeSignalId = measureSignals[currentMeasure];
  const activeSignal = activeSignalId ? mestreSignals.find((sig) => sig.id === activeSignalId) : null;
  const signalImg = activeSignal ? (activeSignal.image || activeSignal.imageUrl || activeSignal.frames?.[0]) : null;

  const puxTrack = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
  const coroTrack = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
  const puxPattern = puxTrack?.patterns?.find((p) => p.measureAssignments?.[currentMeasure]);
  const coroPattern = coroTrack?.patterns?.find((p) => p.measureAssignments?.[currentMeasure]);

  const puxLyrics = puxPattern?.lyrics?.filter((l) => l && l.trim() && l.trim() !== '-').join(' ') || '';
  const coroLyrics = coroPattern?.lyrics?.filter((l) => l && l.trim() && l.trim() !== '-').join(' ') || '';

  return (
    <div className="w-full bg-[var(--cordel-surface)] px-2 py-1.5 flex flex-col gap-1 border-b-2 border-[var(--cordel-border)] shrink-0 select-none relative z-30">
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1 shrink-0">
          {[1, 2, 3, 4].map((num, idx) => (
            <span
              key={num}
              ref={beatRefs[idx]}
              className="w-5 h-5 flex items-center justify-center font-mono font-bold text-[10px] border border-[var(--cordel-border)] transition-none"
              style={{ backgroundColor: 'var(--cordel-card-btn-bg)', color: 'var(--cordel-card-btn-text)' }}
            >
              {num}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-cactus font-bold text-xs uppercase text-[#8b2a1a] truncate">
            {topSection ? topSection.name : `M${currentMeasure + 1}`}
          </span>
          <span className="font-mono text-[9px] text-[var(--cordel-text-muted)] whitespace-nowrap">
            M{currentMeasure + 1}/{totalMeasures} • {loopMode === 'infinite' ? '∞' : `${currentLoopIteration}/${loopMode}`}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsMetroOn(!isMetroOn)}
            className={`px-1.5 py-0.5 border font-cactus font-bold uppercase text-[9px] cursor-pointer flex items-center gap-1 ${
              isMetroOn ? 'bg-[#b94a2c] text-[#f4ecd8] border-black' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]'
            }`}
            title={lang === 'pt' ? 'Guia sonoro nos tempos' : 'Repère sonore sur les temps'}
          >
            <Bell size={11} />
            <span>{lang === 'pt' ? 'Guia' : 'Repère'}</span>
          </button>
          <button
            onClick={onToggleLetra}
            className={`px-1.5 py-0.5 border font-cactus font-bold uppercase text-[9px] cursor-pointer flex items-center gap-1 ${
              isLetraOpen ? 'bg-[#b94a2c] text-[#f4ecd8] border-black' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]'
            }`}
          >
            <BookOpen size={11} />
            <span>Letra</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-[var(--cordel-card-btn-bg)] p-1.5 border-2 border-[var(--cordel-border)] min-h-[84px] shadow-[2px_2px_0px_#000]">
        <div className="w-20 h-20 border-2 border-[var(--cordel-border)] shrink-0 flex items-center justify-center bg-[var(--cordel-surface)] overflow-hidden shadow-[1px_1px_0px_#000]">
          {signalImg ? (
            <img src={signalImg} alt={activeSignal?.name || 'Sinal'} className="w-full h-full object-cover" />
          ) : (
            <svg viewBox="0 0 32 32" className="w-10 h-10 text-[var(--cordel-text)] opacity-60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
              <path d="M16 4 L28 16 L16 28 L4 16 Z" />
              <path d="M16 9 L23 16 L16 23 L9 16 Z" />
              <path d="M16 13 L16 19 M13 16 L19 16" strokeWidth="2.5" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 overflow-hidden">
          <span className="font-cactus font-bold text-xs uppercase text-[#8b2a1a] truncate">
            {activeSignal?.name || topSection?.name || (lang === 'pt' ? 'CONDUTOR' : 'CONDUCTEUR')}
          </span>
          {puxLyrics && <span className="text-[#c25e38] text-xs font-bold truncate leading-tight">{puxLyrics}</span>}
          {coroLyrics && <span className="text-[#2a9d8f] text-xs font-bold truncate leading-tight">[{coroLyrics}]</span>}
          {!puxLyrics && !coroLyrics && (
            <span className="text-[var(--cordel-text-muted)] italic text-[11px] truncate">
              {topSection ? topSection.name : '—'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
