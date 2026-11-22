/**
 * SectionSquadPlayerStrip.tsx — Tranche individuelle (Pan + Fader) d'un musicien `#k` du Mini-Mixeur de Pupitre (< 85 lignes).
 */
import React from 'react';
import type { SectionPlayerPlacement } from '../../../types';
import { computePlayerCombinedPan, MAX_ACOUSTIC_PAN } from '../../../audio/spatial/sectionSpatialAcoustics';
import { MixerVolumeFader } from '../../MixerVolumeFader';
import { PanKnob } from '../../PanKnob';

interface SectionSquadPlayerStripProps {
  player: SectionPlayerPlacement;
  playerIdx: number;
  trackPanVal: number;
  isEcoMuted: boolean;
  isFr: boolean;
  onAudioDragVol: (idx: number, volPos: number) => void;
  onCommitVol: (idx: number, volPos: number) => void;
  onCommitPan: (idx: number, panVal: number) => void;
}

export const SectionSquadPlayerStrip: React.FC<SectionSquadPlayerStripProps> = ({
  player,
  playerIdx,
  trackPanVal,
  isEcoMuted,
  isFr,
  onAudioDragVol,
  onCommitVol,
  onCommitPan,
}) => {
  const ownPan = typeof player.panVal === 'number' && Number.isFinite(player.panVal)
    ? player.panVal
    : Math.max(-100, Math.min(100, Math.round((player.x - 50) * 2)));
  const ownVol = typeof player.volumeVal === 'number' && Number.isFinite(player.volumeVal) ? player.volumeVal : 75;
  const effAcoustic = computePlayerCombinedPan(player.x, trackPanVal, ownPan);
  const effPct = Math.round(Math.abs(effAcoustic / MAX_ACOUSTIC_PAN) * 100);
  const effLabel = effPct <= 2 ? 'C' : effAcoustic < 0 ? `E${effPct}` : `D${effPct}`;

  return (
    <div
      data-testid={`squad-player-strip-${playerIdx + 1}`}
      className={`w-[68px] shrink-0 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] p-1.5 flex flex-col items-center gap-1.5 select-none ${
        isEcoMuted ? 'opacity-45' : ''
      }`}
    >
      <div className="w-full flex items-center justify-between px-1 py-0.5 bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border border-[var(--cordel-ink-dark)] font-mono text-[10px] font-black">
        <span>#{playerIdx + 1}</span>
        <span className="text-[9px] opacity-80" title={isFr ? 'Pan effectif (avec Master Pan)' : 'Pan efetivo'}>{effLabel}</span>
      </div>

      <PanKnob
        value={ownPan}
        defaultValue={0}
        label="Pan"
        showLabels={false}
        onChange={(val) => onCommitPan(playerIdx, val)}
      />

      <div className="w-full flex-1 flex justify-center min-h-[126px]">
        <MixerVolumeFader
          value={ownVol}
          defaultValue={75}
          height={126}
          thumbWidth={26}
          thumbHeight={16}
          fontSize="9px"
          onAudioDrag={(pos) => onAudioDragVol(playerIdx, pos)}
          onChange={(pos) => onCommitVol(playerIdx, pos)}
        />
      </div>
    </div>
  );
};
