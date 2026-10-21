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
  icon: string;
  color: string;
  instrumentIds: string[];
  isToada?: boolean;
}

const FAMILIES: FamilyDef[] = [
  { id: 'alfaias', label: 'Alfaias', icon: '🥁', color: '#8b2a1a', instrumentIds: ['marcante', 'meiao', 'repique'] },
  { id: 'caixas', label: 'Caixas', icon: '🥁', color: '#c0392b', instrumentIds: ['caixa', 'tarol'] },
  { id: 'gongue', label: 'Gonguê', icon: '🔔', color: '#d35400', instrumentIds: ['gongue'] },
  { id: 'agbe', label: 'Agbê / Mineiro', icon: '🌾', color: '#27ae60', instrumentIds: ['agbe', 'mineiro'] },
  { id: 'toada', label: 'Toada (Chant)', icon: '🎤', color: '#8e44ad', instrumentIds: ['puxador', 'coro'], isToada: true },
];

export const MobileFamilyMixer: React.FC<Props> = ({ isLocked }) => {
  const tracks = useSequencerStore((s) => s.tracks);
  const setTracks = useSequencerStore((s) => s.setTracks);
  const handleTrackVolumeChange = useSequencerStore((s) => s.handleTrackVolumeChange);

  const vocalMode = useAudioStore((s) => s.vocalMode);
  const setVocalMode = useAudioStore((s) => s.setVocalMode);

  return (
    <div className="w-full px-3 flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto">
      {FAMILIES.map((fam) => {
        const familyTracks = tracks.filter((t) => {
          const instId = instrumentsConfig[t.instrumentIdx]?.id;
          return instId && fam.instrumentIds.includes(instId);
        });

        if (familyTracks.length === 0) return null;

        const allMuted = familyTracks.every((t) => t.isMute);
        const anySolo = familyTracks.some((t) => t.isSolo);
        const avgVol = Math.round(
          familyTracks.reduce((acc, t) => acc + (t.volumeVal ?? 75), 0) / familyTracks.length
        );

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

        return (
          <MobileFamilyStrip
            key={fam.id}
            label={fam.label}
            icon={fam.icon}
            color={fam.color}
            isMuted={allMuted}
            isSolo={anySolo}
            volume={avgVol}
            onToggleMute={handleToggleMute}
            onToggleSolo={handleToggleSolo}
            onChangeVolume={handleChangeVolume}
            isLocked={isLocked}
            isToada={fam.isToada}
            vocalMode={vocalMode as any}
            onToggleVocalMode={() => setVocalMode(vocalMode === 'synth' ? 'voice' : 'synth')}
          />
        );
      })}
    </div>
  );
};
