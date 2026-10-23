/**
 * VocalGrooveNudgeControl.tsx
 * Micro-calage temporel fin du chant (nudgeMs de -200ms a +200ms).
 * Met a jour le store Zustand sans latence ni re-render parasite (< 90 lignes).
 */
import React from 'react';
import type { Pattern } from '../../types/store.types';
import { useSequencerStore } from '../../stores/useSequencerStore';

interface VocalGrooveNudgeControlProps {
  trackId: number;
  pattern: Pattern;
  lang: string;
}

export const VocalGrooveNudgeControl: React.FC<VocalGrooveNudgeControlProps> = ({
  trackId,
  pattern,
  lang,
}) => {
  const hasAudioClip = Boolean(pattern.vocalClip || pattern.hasVocalAudio);
  if (!hasAudioClip) return null;

  const nudgeMs = pattern.vocalClip?.nudgeMs ?? 0;

  const updateNudge = (val: number) => {
    const clamped = Math.max(-200, Math.min(200, Math.round(val)));
    useSequencerStore.getState().setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          patterns: t.patterns.map((p) => {
            if (p.id !== pattern.id) return p;
            const curClip = p.vocalClip || {
              baseBpm: 55, sampleBpm: 55, trimStartSec: 0,
              trimEndSec: 0, nudgeMs: 0, anacrusisBeats: 0,
            };
            return {
              ...p,
              vocalClip: { ...curClip, nudgeMs: clamped, updatedAt: Date.now() },
            };
          }),
        };
      })
    );
  };

  const statusText = nudgeMs < 0
    ? `${nudgeMs} ms (${lang === 'fr' ? 'Anticipé' : 'Antecipado'})`
    : nudgeMs > 0
    ? `+${nudgeMs} ms (${lang === 'fr' ? 'Retardé' : 'Atrasado'})`
    : `0 ms (${lang === 'fr' ? 'Neutre' : 'Neutro'})`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#ece4d0]/30 border border-[#1a1a1a]/15 rounded select-none text-[11px]">
      <div className="flex items-center gap-2">
        <span className="font-bold text-[#8b2a1a] flex items-center gap-1">
          <span></span>
          <span>{lang === 'fr' ? 'Calage Groove :' : 'Ajuste Groove :'}</span>
        </span>
        <span className="font-mono font-bold text-[#1a1a1a] bg-[#f4ecd8] px-2 py-0.5 rounded border border-[#1a1a1a]/20 shadow-inner">
          {statusText}
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-1 min-w-[140px] max-w-xs">
        <span className="text-[9px] text-[#777] font-mono">-200ms</span>
        <input
          type="range"
          min={-200}
          max={200}
          step={1}
          value={nudgeMs}
          onChange={(e) => updateNudge(Number(e.target.value))}
          className="flex-1 accent-[#8b2a1a] cursor-pointer h-1.5 bg-[#1a1a1a]/15 rounded"
          title={`${lang === 'fr' ? 'Décalage fin' : 'Ajuste fino'} (${nudgeMs} ms)`}
        />
        <span className="text-[9px] text-[#777] font-mono">+200ms</span>
      </div>

      <div className="flex items-center gap-1">
        {[-10, -2, 0, 2, 10].map((delta) => (
          <button
            key={`nudge-btn-${delta}`}
            type="button"
            onClick={() => (delta === 0 ? updateNudge(0) : updateNudge(nudgeMs + delta))}
            className="px-1.5 py-0.5 text-[9px] font-bold font-mono bg-[#f4ecd8] hover:bg-[#8b2a1a] hover:text-[#f4ecd8] text-[#1a1a1a] border border-[#1a1a1a]/25 rounded transition-colors cursor-pointer"
          >
            {delta === 0 ? '0ms' : delta > 0 ? `+${delta}ms` : `${delta}ms`}
          </button>
        ))}
      </div>
    </div>
  );
};
