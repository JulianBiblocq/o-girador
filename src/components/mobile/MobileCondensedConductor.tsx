/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Bell, BookOpen } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { useShallow } from 'zustand/react/shallow';
import { subscribeToTick, unsubscribeFromTick } from '../../audio/visualTickBuffer';
import { instrumentsConfig } from '../../data';

interface Props {
  isLetraOpen: boolean;
  onToggleLetra: () => void;
  lang?: 'fr' | 'pt';
}

export const MobileCondensedConductor: React.FC<Props> = ({ isLetraOpen, onToggleLetra, lang = 'pt' }) => {
  const beatRefs = [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)];
  const isMetroOn = useTransportStore((s) => s.isMetroOn);
  const setIsMetroOn = useTransportStore((s) => s.setIsMetroOn);

  const { currentMeasure, totalMeasures, loopMode, currentLoopIteration, songSections, measureSignals, mestreSignals, tracks } =
    useSequencerStore(
      useShallow((s) => ({
        currentMeasure: s.currentMeasure,
        totalMeasures: s.totalMeasures,
        loopMode: s.loopMode ?? 'infinite',
        currentLoopIteration: s.currentLoopIteration ?? 1,
        songSections: s.songSections || [],
        measureSignals: s.measureSignals || [],
        mestreSignals: s.mestreSignals || [],
        tracks: s.tracks || [],
      }))
    );

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
        el.style.backgroundColor = idx === beat ? '#b94a2c' : '#1a1a1a';
        el.style.color = idx === beat ? '#f4ecd8' : 'var(--cordel-text)';
      });
    };
    subscribeToTick(handleTick);
    return () => unsubscribeFromTick(handleTick);
  }, []);

  const activeSection = songSections.find((s) => s.startMeasure <= currentMeasure && currentMeasure <= s.endMeasure);
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
    <div className="w-full bg-[#121212] px-2 py-1.5 flex flex-col gap-1 border-b-2 border-[var(--cordel-border)] shrink-0 select-none">
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1 shrink-0">
          {[1, 2, 3, 4].map((num, idx) => (
            <span
              key={num}
              ref={beatRefs[idx]}
              className="w-5 h-5 flex items-center justify-center font-mono font-bold text-[10px] border border-[var(--cordel-border)] transition-none"
              style={{ backgroundColor: '#1a1a1a', color: 'var(--cordel-text)' }}
            >
              {num}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-cactus font-bold text-xs uppercase text-[#b94a2c] truncate">
            {activeSection ? activeSection.name : `M${currentMeasure + 1}`}
          </span>
          <span className="font-mono text-[9px] text-[#f4ecd8]/60 whitespace-nowrap">
            M{currentMeasure + 1}/{totalMeasures} • {loopMode === 'infinite' ? '∞' : `${currentLoopIteration}/${loopMode}`}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsMetroOn(!isMetroOn)}
            className={`px-1.5 py-0.5 cordel-border-sm flex items-center gap-1 text-[9px] font-cactus font-bold uppercase ${
              isMetroOn ? 'bg-[#b94a2c] text-[#f4ecd8]' : 'bg-[#1a1a1a] text-[var(--cordel-text)]'
            }`}
            title="Repère sonore sur les temps"
          >
            <Bell size={11} />
            <span>Repère</span>
          </button>
          <button
            onClick={onToggleLetra}
            className={`px-1.5 py-0.5 cordel-border-sm flex items-center gap-1 text-[9px] font-cactus font-bold uppercase ${
              isLetraOpen ? 'bg-[#b94a2c] text-[#f4ecd8]' : 'bg-[#1a1a1a] text-[var(--cordel-text)]'
            }`}
          >
            <BookOpen size={11} />
            <span>Letra</span>
          </button>
        </div>
      </div>

      {/* Conducteur & Signe du Mestre Agrandis (w-20 h-20) */}
      <div className="flex items-center gap-2 bg-[#1a1a1a] p-1.5 border border-[var(--cordel-border)] min-h-[84px]">
        <div className="w-20 h-20 border-2 border-[var(--cordel-border)] shrink-0 flex items-center justify-center bg-[#121212] overflow-hidden shadow-[2px_2px_0px_var(--cordel-border)]">
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
          <span className="font-cactus font-bold text-xs uppercase text-[#b94a2c] truncate">
            {activeSignal?.name || activeSection?.name || 'CONDUCTEUR'}
          </span>
          {puxLyrics && <span className="text-[#c25e38] text-xs font-bold truncate leading-tight">{puxLyrics}</span>}
          {coroLyrics && <span className="text-[#60a5fa] text-xs font-bold truncate leading-tight">[{coroLyrics}]</span>}
          {!puxLyrics && !coroLyrics && (
            <span className="text-[var(--cordel-text)]/50 italic text-[11px] truncate">
              {activeSection ? activeSection.name : '—'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
