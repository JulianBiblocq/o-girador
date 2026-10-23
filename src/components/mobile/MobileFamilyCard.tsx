/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { useMuteGroupStore } from '../../stores/useMuteGroupStore';
import { MobileFamilyDef, ALL_MUTE_GROUP_IDS, ANALOG_BUTTON_STYLES } from './mobileFamilyConfig';
import {
  getFamilyTracks,
  isFamilyActiveInSong,
  getFamilyVolume,
  applyFamilyMute,
  applyFamilySolo,
} from '../../utils/mobileFamilyResolver';
import { faderPositionToDbString } from '../../utils/audioMath';
import { tMobile } from '../../i18n/mobileTranslations';

interface Props {
  family: MobileFamilyDef;
  isLocked: boolean;
  onOpenFader: () => void;
}

export const MobileFamilyCard: React.FC<Props> = ({ family, isLocked, onOpenFader }) => {
  const longPressTimerRef = useRef<any>(null);
  const lang = useSequencerStore((s) => s.lang);
  const tracks = useSequencerStore((s) => s.tracks);
  const setTracks = useSequencerStore((s) => s.setTracks);
  const vocalMode = useAudioStore((s) => s.vocalMode);
  const setVocalMode = useAudioStore((s) => s.setVocalMode);

  const muteGroupAssignments = useMuteGroupStore((s) => s.muteGroupAssignments);
  const activeMuteGroups = useMuteGroupStore((s) => s.activeMuteGroups);
  const toggleFamilyInMuteGroup = useMuteGroupStore((s) => s.toggleFamilyInMuteGroup);

  const famTracks = getFamilyTracks(tracks, family.id);
  const isActive = isFamilyActiveInSong(tracks, family.id);
  const playableTracks = famTracks.filter((t) => !t.isBusFolder);
  const allMuted = playableTracks.length > 0 && playableTracks.every((t) => t.isMute);
  const anySolo = playableTracks.some((t) => t.isSolo);
  const avgVol = getFamilyVolume(tracks, family.id);

  const toggleMute = () => !isLocked && isActive && setTracks((prev) => applyFamilyMute(prev, family.id, !allMuted));
  const toggleSolo = () => !isLocked && isActive && setTracks((prev) => applyFamilySolo(prev, family.id, !anySolo));
  const startLongPress = () => !isLocked && isActive && (longPressTimerRef.current = setTimeout(onOpenFader, 400));
  const cancelLongPress = () => { if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; } };

  const muteStyle = !isActive ? ANALOG_BUTTON_STYLES.disabled() : ANALOG_BUTTON_STYLES.mute(allMuted);
  const soloStyle = !isActive ? ANALOG_BUTTON_STYLES.disabled() : ANALOG_BUTTON_STYLES.solo(anySolo);

  return (
    <div
      className={`relative z-10 flex flex-col h-full p-1.5 bg-[#efe6d0]/92 dark:bg-[#1e1b18]/90 backdrop-blur-[1px] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-border)] ${
        !isActive ? 'opacity-45 saturate-[0.15] pointer-events-none select-none' : isLocked ? 'opacity-80' : ''
      }`}
    >
      {/* 1. En-tête : Nom + commutateur VOIX/SYNTH si toada + Badge dB */}
      <div className="shrink-0 flex items-center justify-between mb-1 gap-1">
        <span className="font-cactus font-bold text-xs uppercase text-[var(--cordel-text)] truncate">{family.label}</span>

        {family.isToada && isActive && (
          <button
            onClick={() => !isLocked && setVocalMode(vocalMode === 'synth' ? 'voice' : 'synth')}
            className={`px-1 py-0.5 font-cactus font-bold text-[9px] uppercase border transition-colors cursor-pointer ${
              vocalMode !== 'synth' ? 'bg-[#b94a2c] text-[#f4ecd8] border-[#f4ecd8]' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]'
            }`}
          >
            {vocalMode === 'synth' ? 'SYNTH' : tMobile(lang, 'voix').toUpperCase()}
          </button>
        )}

        <div
          onPointerDown={startLongPress}
          onPointerUp={cancelLongPress}
          onPointerCancel={cancelLongPress}
          onContextMenu={(e) => e.preventDefault()}
          onClick={() => !isLocked && isActive && onOpenFader()}
          className={`font-mono font-bold text-[10px] text-[var(--cordel-text)] tabular-nums px-1 py-0.5 rounded-xs border shrink-0 ${
            isActive ? 'bg-[#b94a2c]/20 border-[#b94a2c]/50 cursor-pointer active:border-[#b94a2c]' : 'bg-black/10 border-transparent cursor-default'
          }`}
          title={isActive ? 'Appui long ou clic pour fader individuel' : 'Famille inactive'}
        >
          {isActive ? faderPositionToDbString(avgVol) : '—'}
        </div>
      </div>

      {/* 2. Corps : Colonne Gauche [ M ] & [ S ] + Colonne Droite Groupes [ 1, 2, 3, 4 ] */}
      <div className="flex-1 min-h-0 flex gap-1.5">
        <div className="flex-1 flex flex-col gap-1.5">
          <button
            onClick={toggleMute}
            disabled={isLocked || !isActive}
            style={muteStyle.style}
            className={`flex-1 w-full text-xl font-mono flex items-center justify-center transition-transform active:translate-y-0.5 cursor-pointer ${muteStyle.className}`}
            title="Mute"
          >
            M
          </button>
          <button
            onClick={toggleSolo}
            disabled={isLocked || !isActive}
            style={soloStyle.style}
            className={`flex-1 w-full text-xl font-mono flex items-center justify-center transition-transform active:translate-y-0.5 cursor-pointer ${soloStyle.className}`}
            title="Solo"
          >
            S
          </button>
        </div>

        <div className="w-8 flex flex-col gap-1 shrink-0">
          {ALL_MUTE_GROUP_IDS.map((gid) => {
            const isAssigned = !!muteGroupAssignments[gid]?.includes(family.id);
            const isGroupActive = !!activeMuteGroups[gid];
            const mgStyle = !isActive ? ANALOG_BUTTON_STYLES.disabled() : ANALOG_BUTTON_STYLES.muteGroup(isAssigned, isGroupActive);
            return (
              <button
                key={gid}
                onClick={() => !isLocked && isActive && toggleFamilyInMuteGroup(gid, family.id)}
                disabled={isLocked || !isActive}
                style={mgStyle.style}
                className={`flex-1 w-full text-xs font-mono flex items-center justify-center transition-all cursor-pointer ${mgStyle.className}`}
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
