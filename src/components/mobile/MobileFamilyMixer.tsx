/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { instrumentsConfig } from '../../data';
import { MobileFamilyStrip } from './MobileFamilyStrip';

interface Props {
  isLocked: boolean;
}

interface FamilyDef {
  id: string;
  label: string;
  instrumentIds: string[];
  isToada?: boolean;
}

const FAMILIES: FamilyDef[] = [
  { id: 'alfaias', label: 'ALFAIAS', instrumentIds: ['marcante', 'meiao', 'repique'] },
  { id: 'caixas', label: 'CAIXAS', instrumentIds: ['caixa', 'tarol'] },
  { id: 'gongue', label: 'GONGUÊ', instrumentIds: ['gongue'] },
  { id: 'agbe', label: 'AGBÊ', instrumentIds: ['agbe', 'mineiro'] },
  { id: 'toada', label: 'TOADA', instrumentIds: ['puxador', 'coro'], isToada: true },
];

export const MobileFamilyMixer: React.FC<Props> = ({ isLocked }) => {
  const tracks = useSequencerStore((s) => s.tracks);
  const setTracks = useSequencerStore((s) => s.setTracks);
  const handleTrackVolumeChange = useSequencerStore((s) => s.handleTrackVolumeChange);

  const vocalMode = useAudioStore((s) => s.vocalMode);
  const setVocalMode = useAudioStore((s) => s.setVocalMode);

  return (
    <div className="w-full flex-1 min-h-0 bg-[#121212] grid grid-cols-5 gap-0.5 select-none overflow-hidden">
      {FAMILIES.map((fam) => {
        const familyTracks = tracks.filter((t) => {
          const instId = instrumentsConfig[t.instrumentIdx]?.id;
          return instId && fam.instrumentIds.includes(instId);
        });

        const allMuted = familyTracks.length > 0 && familyTracks.every((t) => t.isMute);
        const anySolo = familyTracks.some((t) => t.isSolo);
        const avgVol = familyTracks.length > 0
          ? Math.round(familyTracks.reduce((acc, t) => acc + (t.volumeVal ?? 75), 0) / familyTracks.length)
          : 75;

        const handleToggleMute = () => {
          const target = !allMuted;
          const ids = new Set(familyTracks.map((t) => t.id));
          setTracks((prev) => prev.map((t) => (ids.has(t.id) ? { ...t, isMute: target } : t)));
        };

        const handleToggleSolo = () => {
          const target = !anySolo;
          const ids = new Set(familyTracks.map((t) => t.id));
          setTracks((prev) => prev.map((t) => (ids.has(t.id) ? { ...t, isSolo: target } : t)));
        };

        const handleChangeVolume = (vol: number) => {
          familyTracks.forEach((t) => handleTrackVolumeChange(t.id, vol));
        };

        const handleToggleVocalMode = () => {
          setVocalMode(vocalMode === 'voice' ? 'synth' : 'voice');
        };

        return (
          <MobileFamilyStrip
            key={fam.id}
            label={fam.label}
            isMuted={allMuted}
            isSolo={anySolo}
            volume={avgVol}
            onToggleMute={handleToggleMute}
            onToggleSolo={handleToggleSolo}
            onChangeVolume={handleChangeVolume}
            isLocked={isLocked}
            isToada={fam.isToada}
            vocalMode={vocalMode}
            onToggleVocalMode={handleToggleVocalMode}
          />
        );
      })}
    </div>
  );
};
