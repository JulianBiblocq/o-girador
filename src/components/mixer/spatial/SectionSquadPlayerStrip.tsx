/**
 * SectionSquadPlayerStrip.tsx — Tranche individuelle (`#1 ★` Meneur + `#2..#N`) du Mini-Mixeur de Pupitre (< 88 lignes).
 */
import React from 'react';
import type { SectionPlayerPlacement } from '../../../types';
import { computePlayerCombinedPan, MAX_ACOUSTIC_PAN } from '../../../audio/spatial/sectionSpatialAcoustics';
import { getLeftPanPrefix } from '../../controls/panKnobMath';
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
  const lang = isFr ? 'fr' : 'pt';
  const isLeader = playerIdx === 0;
  const ownPan = typeof player.panVal === 'number' && Number.isFinite(player.panVal)
    ? player.panVal
    : Math.max(-100, Math.min(100, Math.round((player.x - 50) * 2)));
  const ownVol = typeof player.volumeVal === 'number' && Number.isFinite(player.volumeVal) ? player.volumeVal : 75;
  const effAcoustic = computePlayerCombinedPan(player.x, trackPanVal, ownPan);
  const effPct = Math.round(Math.abs(effAcoustic / MAX_ACOUSTIC_PAN) * 100);
  const effLabel = effPct <= 2 ? 'C' : effAcoustic < 0 ? `${getLeftPanPrefix(lang)}${effPct}` : `D${effPct}`;

  return (
    <div
      data-testid={`squad-player-strip-${playerIdx + 1}`}
      className={`w-[70px] shrink-0 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] p-1.5 flex flex-col items-center gap-1.5 select-none ${
        isEcoMuted ? 'opacity-45' : ''
      }`}
    >
      <div
        title={isLeader ? (isFr ? 'Meneur de pupitre (#1)' : 'Líder do naipe (#1)') : undefined}
        className={`w-full flex items-center justify-between px-1 py-0.5 border border-[var(--cordel-ink-dark)] font-mono text-[9.5px] font-black ${
          isLeader ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)]'
        }`}
      >
        <span className="flex items-center gap-0.5">
          <span>#{playerIdx + 1}</span>
          {isLeader && (
            <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 12 12"><polygon points="6,0.8 7.6,4.2 11.2,4.7 8.6,7.2 9.2,10.8 6,9.0 2.8,10.8 3.4,7.2 0.8,4.7 4.4,4.2" fill="currentColor" /></svg>
          )}
        </span>
        <span className="text-[8.5px] opacity-90" title={isFr ? 'Pan effectif (avec Pan de tranche)' : 'Pan efetivo'}>{effLabel}</span>
      </div>

      <PanKnob
        value={ownPan}
        defaultValue={0}
        label=""
        lang={lang}
        showLabels={false}
        onChange={(val) => onCommitPan(playerIdx, val)}
      />

      <div className="w-full flex-1 flex justify-center min-h-[122px]">
        <MixerVolumeFader
          value={ownVol}
          defaultValue={75}
          height={122}
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
