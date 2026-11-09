/**
 * LutherieDrumCard.tsx — Carte individuelle d'accordage (Pitch + Note/Hz) et de résonance (Decay)
 * pour un tambour du Baque (< 120 lignes).
 */
import React from 'react';
import { Volume2, RotateCcw } from 'lucide-react';
import { getDrumPitchNoteInfo } from '../../utils/audio/drumPitchToNote';

export interface LutherieDrumCardProps {
  instrumentId: string;
  label: string;
  lang: string;
  tuning: number;
  decayPct: number;
  isPresent: boolean;
  onChangeTuning: (semitones: number) => void;
  onChangeDecay: (decayPct: number) => void;
  onPreviewStroke: (strokeSymbol: string) => void;
}

export const LutherieDrumCard: React.FC<LutherieDrumCardProps> = React.memo(({
  instrumentId, label, lang, tuning, decayPct, isPresent,
  onChangeTuning, onChangeDecay, onPreviewStroke,
}) => {
  const isFr = lang === 'fr';
  const isTimbal = instrumentId === 'timbal';
  const defaultStroke = isTimbal ? 'A' : 'D';
  const noteInfo = getDrumPitchNoteInfo(instrumentId, tuning, lang);

  return (
    <div className={`bg-[var(--cordel-bg)] border-2 border-[var(--cordel-text)] p-3 flex flex-col gap-2.5 shadow-[3px_3px_0px_var(--cordel-text)] select-none transition-opacity ${isPresent ? 'opacity-100' : 'opacity-75'}`}>
      <div className="flex items-center justify-between gap-2 border-b border-dashed border-[var(--cordel-border)] pb-1.5">
        <span className="font-cactus font-bold uppercase text-xs md:text-sm text-[var(--cordel-text)] truncate">{label}</span>
        <span className="px-1.5 py-0.5 bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-mono font-bold text-[10px] rounded-xs shrink-0">
          {noteInfo.badgeText}
        </span>
      </div>

      {/* Curseur de Pitch (-6 à +6 demi-tons) */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] font-cactus font-bold uppercase text-[var(--cordel-text)]">
          <span>{isFr ? 'Accordage (Pitch)' : 'Afinação (Pitch)'}</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-[#8b2a1a] dark:text-[#f59e0b]">{noteInfo.semitonesLabel}</span>
            {tuning !== 0 && (
              <button
                type="button"
                onClick={() => { onChangeTuning(0); onPreviewStroke(defaultStroke); }}
                title={isFr ? 'Réinitialiser à 0 st' : 'Redefinir para 0 st'}
                className="p-0.5 hover:bg-[#8b2a1a] hover:!text-[#f4ecd8] border border-[var(--cordel-text)] rounded-xs cursor-pointer transition-colors"
              >
                <RotateCcw size={10} />
              </button>
            )}
          </div>
        </div>
        <input
          type="range" min={-6} max={6} step={0.5} value={tuning}
          onChange={(e) => onChangeTuning(Number(e.target.value))}
          onPointerUp={() => onPreviewStroke(defaultStroke)}
          onKeyUp={() => onPreviewStroke(defaultStroke)}
          className="w-full accent-[#8b2a1a] dark:accent-[#f59e0b] cursor-pointer h-1.5"
        />
        <div className="flex justify-between text-[9px] font-mono text-[var(--cordel-text)]/70">
          <span>-6 st</span><span>0 st</span><span>+6 st</span>
        </div>
      </div>

      {/* Curseur de Résonance / Decay global (15 % à 100 %) */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] font-cactus font-bold uppercase text-[var(--cordel-text)]">
          <span>{isFr ? 'Résonance / Decay' : 'Ressonância / Decay'}</span>
          <span className="font-mono font-bold text-[#8b2a1a] dark:text-[#f59e0b]">{decayPct}%</span>
        </div>
        <input
          type="range" min={15} max={100} step={1} value={decayPct}
          onChange={(e) => onChangeDecay(Number(e.target.value))}
          onPointerUp={() => onPreviewStroke(defaultStroke)}
          onKeyUp={() => onPreviewStroke(defaultStroke)}
          className="w-full accent-[#8b2a1a] dark:accent-[#f59e0b] cursor-pointer h-1.5"
        />
        <div className="flex justify-between text-[9px] font-bold text-[var(--cordel-text)]/70">
          <span>{isFr ? 'Sec (15%)' : 'Seco (15%)'}</span>
          <span>{isFr ? 'Plein (100%)' : 'Pleno (100%)'}</span>
        </div>
      </div>

      {/* Boutons d'écoute unitaire */}
      <div className="flex items-center gap-1.5 pt-1 mt-auto">
        {isTimbal ? (
          <>
            <button type="button" onClick={() => onPreviewStroke('A')} className="flex-1 py-1.5 px-2 bg-[var(--cordel-text)] hover:bg-[#8b2a1a] text-[var(--cordel-bg)] hover:!text-[#f4ecd8] border border-[var(--cordel-text)] font-cactus font-bold uppercase text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors">
              <Volume2 size={12} /><span>{isFr ? 'Frappe A (Aberto)' : 'Toque A (Aberto)'}</span>
            </button>
            <button type="button" onClick={() => onPreviewStroke('S')} className="flex-1 py-1.5 px-2 bg-[var(--cordel-surface)] hover:bg-[#8b2a1a] text-[var(--cordel-text)] hover:!text-[#f4ecd8] border border-[var(--cordel-text)] font-cactus font-bold uppercase text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors">
              <Volume2 size={12} /><span>{isFr ? 'Frappe S (Slap)' : 'Toque S (Slap)'}</span>
            </button>
          </>
        ) : (
          <button type="button" onClick={() => onPreviewStroke('D')} className="w-full py-1.5 px-2 bg-[var(--cordel-text)] hover:bg-[#8b2a1a] text-[var(--cordel-bg)] hover:!text-[#f4ecd8] border border-[var(--cordel-text)] font-cactus font-bold uppercase text-[10px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
            <Volume2 size={12} /><span>{isFr ? 'Frappe D' : 'Toque D'}</span>
          </button>
        )}
      </div>
    </div>
  );
});

LutherieDrumCard.displayName = 'LutherieDrumCard';
