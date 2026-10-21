/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Track, TrackGroup } from '../../types';

interface Props {
  label: string;
  labelColorClass?: string;
  selectedTrackId: number | null;
  onSelectTrackId: (id: number | null) => void;
  trackOptions: (Track | TrackGroup)[];
  getTrackName: (t: any) => string;
  allowNone?: boolean;
  noneLabel?: string;
  currentTrack?: (Track | TrackGroup) | null;
  onToggleMute: () => void;
}

export const MobilePercTrackSelector: React.FC<Props> = ({
  label,
  labelColorClass = 'text-[var(--cordel-text)]/70',
  selectedTrackId,
  onSelectTrackId,
  trackOptions,
  getTrackName,
  allowNone = false,
  noneLabel = 'Aucun',
  currentTrack,
  onToggleMute,
}) => {
  return (
    <div className="flex flex-col gap-0.5">
      <label className={`text-[9px] font-mono uppercase font-bold truncate ${labelColorClass}`}>
        {label}
      </label>
      <div className="flex items-center gap-1">
        <select
          value={selectedTrackId ?? ''}
          onChange={(e) => onSelectTrackId(e.target.value ? Number(e.target.value) : null)}
          className="flex-1 min-w-0 bg-[#1a1a1a] text-[var(--cordel-text)] font-cactus font-bold text-xs uppercase px-1.5 py-1 cordel-border-sm cursor-pointer shadow-[1px_1px_0_var(--cordel-border)] focus:outline-none"
        >
          {allowNone && <option value="">{noneLabel}</option>}
          {trackOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {getTrackName(t)}
            </option>
          ))}
        </select>
        <button
          onClick={onToggleMute}
          disabled={!currentTrack}
          className={`w-8 h-8 cordel-border-sm flex items-center justify-center shrink-0 shadow-[1px_1px_0_var(--cordel-border)] active:translate-y-0.5 ${
            !currentTrack
              ? 'opacity-30 bg-[#1a1a1a] text-stone-500'
              : currentTrack.isMute
              ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#f4ecd8]'
              : 'bg-[#1a1a1a] text-[#27ae60] border-[#27ae60]/60'
          }`}
          title={
            !currentTrack
              ? 'Aucune piste sélectionnée'
              : currentTrack.isMute
              ? 'Son coupé (Muet)'
              : 'Son actif (Audible)'
          }
        >
          {currentTrack?.isMute ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      </div>
    </div>
  );
};
