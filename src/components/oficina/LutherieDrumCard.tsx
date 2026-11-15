/**
 * LutherieDrumCard.tsx — Carte individuelle d'accordage 0.1 st (Note FR/PT + Hz + Cents), résonance (Decay)
 * et passerelles directes par piste vers l'Éditeur de Motif (< 132 lignes).
 */
import React from 'react';
import { Volume2, RotateCcw } from 'lucide-react';
import { TrackGroup } from '../../types';
import { roundSemitonesTenth } from '../../utils/audio/drumFundamentalRegistry';
import { getDrumPitchNoteInfo } from '../../utils/audio/drumPitchToNote';
import { LutherieTrackLinksRow } from './LutherieTrackLinksRow';

export interface LutherieDrumCardProps {
  instrumentId: string;
  label: string;
  lang: string;
  tuning: number;
  decayPct: number;
  isPresent: boolean;
  tracks?: TrackGroup[];
  showSessionBridges?: boolean;
  isFocused?: boolean;
  onChangeTuning: (semitones: number) => void;
  onChangeDecay: (decayPct: number) => void;
  onPreviewStroke: (strokeSymbol: string) => void;
}

export const LutherieDrumCard: React.FC<LutherieDrumCardProps> = React.memo(({
  instrumentId, label, lang, tuning, decayPct, isPresent,
  tracks, showSessionBridges = false, isFocused = false,
  onChangeTuning, onChangeDecay, onPreviewStroke,
}) => {
  const isFr = lang === 'fr';
  const isTimbal = instrumentId === 'timbal';
  const isGongue = instrumentId === 'gongue';
  const defaultStroke = isTimbal ? 'A' : isGongue ? 'G' : 'D';
  const safeTuning = roundSemitonesTenth(tuning ?? 0);
  const safeDecay = decayPct ?? 100;
  const noteInfo = getDrumPitchNoteInfo(instrumentId, safeTuning, lang);
  const trackCount = tracks?.length ?? 0;
  const trackBadge = trackCount === 1 ? (isFr ? '1 piste' : '1 faixa') : (isFr ? `${trackCount} pistes` : `${trackCount} faixas`);

  const previewButtons: Array<[string, string, boolean]> = isTimbal
    ? [['A', isFr ? 'Frappe A (Aberto)' : 'Toque A (Aberto)', true], ['S', isFr ? 'Frappe S (Slap)' : 'Toque S (Slap)', false]]
    : isGongue
    ? [['G', isFr ? 'Frappe G (Grave)' : 'Toque G (Grave)', true], ['A', isFr ? 'Frappe A (Aigu)' : 'Toque A (Agudo)', false]]
    : [['D', isFr ? 'Frappe D' : 'Toque D', true]];

  return (
    <div
      data-testid={`lutherie-drum-card-${instrumentId}`}
      className={`bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border-strong)] p-3 flex flex-col gap-2.5 shadow-[3px_3px_0px_var(--cordel-shadow-color)] select-none transition-opacity ${isPresent ? 'opacity-100' : 'opacity-75'} ${isFocused ? 'ring-2 ring-[var(--cordel-gold)]' : ''}`}
    >
      <div className="flex flex-col gap-1 border-b border-dashed border-[var(--cordel-border)] pb-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-cactus font-bold uppercase text-xs md:text-sm text-[var(--cordel-text)] truncate">{label}</span>
          {showSessionBridges && (
            <span
              data-testid={`lutherie-track-count-${instrumentId}`}
              className={`px-1.5 py-0.5 font-cactus font-bold uppercase text-[9px] shrink-0 border ${
                trackCount > 0
                  ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)]'
                  : 'bg-[var(--cordel-surface)] text-[var(--cordel-text-muted)] border-[var(--cordel-border)]'
              }`}
            >
              {trackBadge}
            </span>
          )}
        </div>
        <span className="px-1.5 py-0.5 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-mono font-bold text-[10px] w-fit">
          {noteInfo.badgeText}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] font-cactus font-bold uppercase text-[var(--cordel-text)]">
          <span>{isFr ? 'Accordage (Pitch)' : 'Afinação (Pitch)'}</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-[var(--cordel-accent-readable)]">{noteInfo.semitonesLabel}</span>
            {safeTuning !== 0 && (
              <button
                type="button" onClick={() => { onChangeTuning(0); onPreviewStroke(defaultStroke); }}
                title={isFr ? 'Réinitialiser à 0 st' : 'Redefinir para 0 st'}
                className="p-0.5 bg-[var(--cordel-surface)] hover:bg-[var(--cordel-wood)] text-[var(--cordel-text)] hover:text-[var(--cordel-on-accent)] border border-[var(--cordel-border-strong)] cursor-pointer transition-colors"
              >
                <RotateCcw size={10} />
              </button>
            )}
          </div>
        </div>
        <input
          type="range" min={-6} max={6} step={0.1} value={safeTuning}
          onChange={(e) => onChangeTuning(roundSemitonesTenth(Number(e.target.value)))}
          onPointerUp={() => onPreviewStroke(defaultStroke)} onKeyUp={() => onPreviewStroke(defaultStroke)}
          className="w-full accent-[var(--cordel-accent)] cursor-pointer h-1.5"
        />
        <div className="flex justify-between text-[9px] font-mono text-[var(--cordel-text-muted)]">
          <span>-6 st</span><span>0 st (pas 0.1)</span><span>+6 st</span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] font-cactus font-bold uppercase text-[var(--cordel-text)]">
          <span>{isFr ? 'Résonance / Decay' : 'Ressonância / Decay'}</span>
          <span className="font-mono font-bold text-[var(--cordel-accent-readable)]">{safeDecay}%</span>
        </div>
        <input
          type="range" min={15} max={100} step={1} value={safeDecay}
          onChange={(e) => onChangeDecay(Number(e.target.value))}
          onPointerUp={() => onPreviewStroke(defaultStroke)} onKeyUp={() => onPreviewStroke(defaultStroke)}
          className="w-full accent-[var(--cordel-accent)] cursor-pointer h-1.5"
        />
        <div className="flex justify-between text-[9px] font-bold text-[var(--cordel-text-muted)]">
          <span>{isFr ? 'Sec (15%)' : 'Seco (15%)'}</span>
          <span>{isFr ? 'Plein (100%)' : 'Pleno (100%)'}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 pt-1 mt-auto">
        {previewButtons.map(([sym, lbl, isPrimary]) => (
          <button
            key={sym} type="button" onClick={() => onPreviewStroke(sym)}
            className={`flex-1 py-1.5 px-2 border border-[var(--cordel-border-strong)] font-cactus font-bold uppercase text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors ${
              isPrimary
                ? 'bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)]'
                : 'bg-[var(--cordel-surface)] hover:bg-[var(--cordel-wood)] text-[var(--cordel-text)] hover:text-[var(--cordel-on-accent)]'
            }`}
          >
            <Volume2 size={12} /><span>{lbl}</span>
          </button>
        ))}
      </div>

      {showSessionBridges && tracks && tracks.length > 0 && (
        <LutherieTrackLinksRow tracks={tracks} defaultLabel={label} lang={lang} />
      )}
    </div>
  );
});

LutherieDrumCard.displayName = 'LutherieDrumCard';
