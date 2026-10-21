/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { instrumentsConfig } from '../../data';
import { faderPositionToDbString } from '../../utils/audioMath';
import { MobileSingleFaderPopover } from './MobileSingleFaderPopover';

interface Props { isLocked: boolean; }
interface FamilyDef { id: string; label: string; instrumentIds: string[]; isToada?: boolean; }

const FAMILIES: FamilyDef[] = [
  { id: 'alfaias', label: 'ALFAIAS', instrumentIds: ['marcante', 'meiao', 'repique'] },
  { id: 'caixas', label: 'CAIXAS', instrumentIds: ['caixa', 'tarol'] },
  { id: 'timbal', label: 'TIMBAL', instrumentIds: ['timbal'] },
  { id: 'gongue', label: 'GONGUÊ', instrumentIds: ['gongue'] },
  { id: 'agbe', label: 'AGBÊ', instrumentIds: ['agbe', 'mineiro'] },
  { id: 'toada', label: 'TOADA', instrumentIds: ['puxador', 'coro'], isToada: true },
];

export const MobileFamilyPads: React.FC<Props> = ({ isLocked }) => {
  const [activeFaderFamily, setActiveFaderFamily] = useState<FamilyDef | null>(null);
  const longPressTimerRef = useRef<any>(null);

  const tracks = useSequencerStore((s) => s.tracks);
  const setTracks = useSequencerStore((s) => s.setTracks);
  const handleTrackVolumeChange = useSequencerStore((s) => s.handleTrackVolumeChange);
  const vocalMode = useAudioStore((s) => s.vocalMode);
  const setVocalMode = useAudioStore((s) => s.setVocalMode);

  const startLongPress = (fam: FamilyDef) => {
    if (isLocked) return;
    longPressTimerRef.current = setTimeout(() => setActiveFaderFamily(fam), 400);
  };
  const cancelLongPress = () => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
  };

  return (
    <div className="w-full flex-1 min-h-0 bg-[#121212] p-2 grid grid-cols-3 grid-rows-2 gap-2 select-none overflow-hidden">
      {FAMILIES.map((fam) => {
        const famTracks = tracks.filter((t) => fam.instrumentIds.includes(instrumentsConfig[t.instrumentIdx]?.id || ''));
        const allMuted = famTracks.length > 0 && famTracks.every((t) => t.isMute);
        const anySolo = famTracks.some((t) => t.isSolo);
        const avgVol = famTracks.length > 0
          ? Math.round(famTracks.reduce((acc, t) => acc + (t.volumeVal ?? 75), 0) / famTracks.length) : 75;

        const toggleMute = () => {
          const ids = new Set(famTracks.map((t) => t.id));
          setTracks((prev) => prev.map((t) => (ids.has(t.id) ? { ...t, isMute: !allMuted } : t)));
        };
        const toggleSolo = () => {
          const ids = new Set(famTracks.map((t) => t.id));
          setTracks((prev) => prev.map((t) => (ids.has(t.id) ? { ...t, isSolo: !anySolo } : t)));
        };

        return (
          <div key={fam.id} className={`flex flex-col justify-between p-1.5 bg-[#1a1a1a] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-border)] ${isLocked ? 'opacity-80' : ''}`}>
            {/* En-tête : Nom + Badge dB (Appui long 400ms ou clic pour ouvrir le fader) */}
            <div
              onPointerDown={() => startLongPress(fam)}
              onPointerUp={cancelLongPress}
              onPointerCancel={cancelLongPress}
              onContextMenu={(e) => e.preventDefault()}
              onClick={() => !isLocked && setActiveFaderFamily(fam)}
              className="flex items-center justify-between gap-1 cursor-pointer bg-[#121212] px-1.5 py-1 border border-[var(--cordel-border)]/50 active:border-[#b94a2c]"
              title="Cliquer ou appui long pour régler le fader"
            >
              <span className="font-cactus font-bold text-xs uppercase text-[var(--cordel-text)] truncate">{fam.label}</span>
              <span className="font-mono font-bold text-[10px] text-[#f4ecd8] tabular-nums bg-[#b94a2c]/30 px-1 py-0.5 rounded-xs border border-[#b94a2c]/40 shrink-0">
                {faderPositionToDbString(avgVol)}
              </span>
            </div>

            {/* Switch Voix / Synthé pour Toada */}
            {fam.isToada && (
              <button
                onClick={() => setVocalMode(vocalMode === 'synth' ? 'voice' : 'synth')}
                disabled={isLocked}
                className={`w-full py-0.5 my-0.5 font-cactus font-bold text-[9px] uppercase border transition-colors ${
                  vocalMode !== 'synth' ? 'bg-[#b94a2c] text-[#f4ecd8] border-[#f4ecd8]' : 'bg-[#121212] text-[var(--cordel-text)] border-[var(--cordel-border)]'
                }`}
              >
                {vocalMode === 'synth' ? 'SYNTH' : 'VOIX'}
              </button>
            )}

            {/* Gros boutons [ M ] et [ S ] (h-11 minimum) */}
            <div className={`grid grid-cols-2 gap-1.5 ${fam.isToada ? 'mt-0' : 'mt-1'}`}>
              <button
                onClick={toggleMute}
                disabled={isLocked}
                className={`h-11 font-mono font-bold text-sm flex items-center justify-center border-2 transition-colors active:translate-y-0.5 ${
                  allMuted ? 'bg-[#b94a2c] text-[#f4ecd8] border-[#f4ecd8]' : 'bg-[#121212] text-[var(--cordel-text)] border-[var(--cordel-border)] hover:border-[#b94a2c]'
                }`}
                title="Mute"
              >
                M
              </button>
              <button
                onClick={toggleSolo}
                disabled={isLocked}
                className={`h-11 font-mono font-bold text-sm flex items-center justify-center border-2 transition-colors active:translate-y-0.5 ${
                  anySolo ? 'bg-[#d4a017] text-black border-black font-extrabold' : 'bg-[#121212] text-[var(--cordel-text)] border-[var(--cordel-border)] hover:border-[#d4a017]'
                }`}
                title="Solo"
              >
                S
              </button>
            </div>
          </div>
        );
      })}

      {activeFaderFamily && (
        <MobileSingleFaderPopover
          label={activeFaderFamily.label}
          volume={
            tracks.filter((t) => activeFaderFamily.instrumentIds.includes(instrumentsConfig[t.instrumentIdx]?.id || ''))
              .reduce((acc, t, _, arr) => acc + (t.volumeVal ?? 75) / (arr.length || 1), 0) || 75
          }
          onChangeVolume={(vol) => {
            tracks.filter((t) => activeFaderFamily.instrumentIds.includes(instrumentsConfig[t.instrumentIdx]?.id || ''))
              .forEach((t) => handleTrackVolumeChange(t.id, vol));
          }}
          onClose={() => setActiveFaderFamily(null)}
        />
      )}
    </div>
  );
};
