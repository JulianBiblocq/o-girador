/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { useMuteGroupStore } from '../../stores/useMuteGroupStore';
import { MobileFamilyDef, MuteGroupId, ALL_MUTE_GROUP_IDS } from './mobileFamilyConfig';
import { instrumentsConfig } from '../../data';
import { faderPositionToDbString } from '../../utils/audioMath';

interface Props {
  family: MobileFamilyDef;
  isLocked: boolean;
  onOpenFader: () => void;
}

export const MobileFamilyCard: React.FC<Props> = ({ family, isLocked, onOpenFader }) => {
  const longPressTimerRef = useRef<any>(null);

  const tracks = useSequencerStore((s) => s.tracks);
  const setTracks = useSequencerStore((s) => s.setTracks);
  const vocalMode = useAudioStore((s) => s.vocalMode);
  const setVocalMode = useAudioStore((s) => s.setVocalMode);

  const muteGroupAssignments = useMuteGroupStore((s) => s.muteGroupAssignments);
  const activeMuteGroups = useMuteGroupStore((s) => s.activeMuteGroups);
  const toggleFamilyInMuteGroup = useMuteGroupStore((s) => s.toggleFamilyInMuteGroup);

  const famTracks = tracks.filter((t) => family.instrumentIds.includes(instrumentsConfig[t.instrumentIdx]?.id || ''));
  const allMuted = famTracks.length > 0 && famTracks.every((t) => t.isMute);
  const anySolo = famTracks.some((t) => t.isSolo);
  const avgVol = famTracks.length > 0
    ? Math.round(famTracks.reduce((acc, t) => acc + (t.volumeVal ?? 75), 0) / famTracks.length) : 75;

  const toggleMute = () => {
    if (isLocked) return;
    const ids = new Set(famTracks.map((t) => t.id));
    setTracks((prev) => prev.map((t) => (ids.has(t.id) ? { ...t, isMute: !allMuted } : t)));
  };

  const toggleSolo = () => {
    if (isLocked) return;
    const ids = new Set(famTracks.map((t) => t.id));
    setTracks((prev) => prev.map((t) => (ids.has(t.id) ? { ...t, isSolo: !anySolo } : t)));
  };

  const startLongPress = () => {
    if (isLocked) return;
    longPressTimerRef.current = setTimeout(onOpenFader, 400);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
  };

  return (
    <div className={`flex flex-col h-full p-1.5 bg-[#1a1a1a] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-border)] ${isLocked ? 'opacity-80' : ''}`}>
      {/* 1. En-tête : Nom + commutateur VOIX/SYNTH si toada + Badge dB */}
      <div className="shrink-0 flex items-center justify-between mb-1 gap-1">
        <span className="font-cactus font-bold text-xs uppercase text-[var(--cordel-text)] truncate">{family.label}</span>

        {family.isToada && (
          <button
            onClick={() => !isLocked && setVocalMode(vocalMode === 'synth' ? 'voice' : 'synth')}
            className={`px-1 py-0.5 font-cactus font-bold text-[9px] uppercase border transition-colors ${
              vocalMode !== 'synth' ? 'bg-[#b94a2c] text-[#f4ecd8] border-[#f4ecd8]' : 'bg-[#121212] text-[var(--cordel-text)] border-[var(--cordel-border)]'
            }`}
          >
            {vocalMode === 'synth' ? 'SYNTH' : 'VOIX'}
          </button>
        )}

        <div
          onPointerDown={startLongPress}
          onPointerUp={cancelLongPress}
          onPointerCancel={cancelLongPress}
          onContextMenu={(e) => e.preventDefault()}
          onClick={() => !isLocked && onOpenFader()}
          className="font-mono font-bold text-[10px] text-[#f4ecd8] tabular-nums bg-[#b94a2c]/30 px-1 py-0.5 rounded-xs border border-[#b94a2c]/40 cursor-pointer active:border-[#b94a2c] shrink-0"
          title="Appui long ou clic pour fader individuel"
        >
          {faderPositionToDbString(avgVol)}
        </div>
      </div>

      {/* 2. Corps : Colonne Gauche [ M ] & [ S ] + Colonne Droite Groupes [ 1, 2, 3, 4 ] */}
      <div className="flex-1 min-h-0 flex gap-1.5">
        {/* Colonne Gauche : Très gros M & S empilés */}
        <div className="flex-1 flex flex-col gap-1.5">
          <button
            onClick={toggleMute}
            disabled={isLocked}
            className={`flex-1 w-full text-xl font-mono font-black border-2 flex items-center justify-center transition-colors active:translate-y-0.5 ${
              allMuted ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#f4ecd8]' : 'bg-[#121212] text-[var(--cordel-text)] border-[var(--cordel-border)] hover:border-[#8b2a1a]'
            }`}
            title="Mute"
          >
            M
          </button>
          <button
            onClick={toggleSolo}
            disabled={isLocked}
            className={`flex-1 w-full text-xl font-mono font-black border-2 flex items-center justify-center transition-colors active:translate-y-0.5 ${
              anySolo ? 'bg-[#d4af37] text-black border-black font-extrabold' : 'bg-[#121212] text-[var(--cordel-text)] border-[var(--cordel-border)] hover:border-[#d4af37]'
            }`}
            title="Solo"
          >
            S
          </button>
        </div>

        {/* Colonne Droite : 4 boutons d'assignation Groupes de Mute [ 1, 2, 3, 4 ] */}
        <div className="w-8 flex flex-col gap-1 shrink-0">
          {ALL_MUTE_GROUP_IDS.map((gid) => {
            const isAssigned = muteGroupAssignments[gid]?.includes(family.id);
            const isActive = activeMuteGroups[gid];
            return (
              <button
                key={gid}
                onClick={() => !isLocked && toggleFamilyInMuteGroup(gid, family.id)}
                disabled={isLocked}
                className={`flex-1 w-full text-xs font-mono font-black border flex items-center justify-center transition-all ${
                  isAssigned && isActive
                    ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#f4ecd8] shadow-xs'
                    : isAssigned
                    ? 'bg-[#d4af37]/25 text-[#d4af37] border-[#d4af37]'
                    : 'bg-[#121212] text-[var(--cordel-text)]/40 border-[var(--cordel-border)]/40 hover:border-[var(--cordel-border)]'
                }`}
                title={`Groupe de Mute ${gid}`}
              >
                {gid}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
