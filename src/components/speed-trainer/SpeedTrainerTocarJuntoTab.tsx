import React from 'react';
import { CordelTarget } from '../ui/CordelTarget';
import { TrackGroup } from '../../types';
import { SpeedTrainerPlayableTracksList } from './SpeedTrainerPlayableTracksList';
import { SpeedTrainerTocarJuntoOptions } from './SpeedTrainerTocarJuntoOptions';

interface SpeedTrainerTocarJuntoTabProps {
  lang: string;
  t: (key: string) => string;
  playableTracks: TrackGroup[];
  selectedTrackId: number | null;
  setSelectedTrackId: (id: number | null) => void;
  tocarJuntoActive: boolean;
  tocarJuntoTrackId: number | null;
  isMutedOption: boolean;
  setIsMutedOption: (val: boolean) => void;
  hasFamilyGroup: boolean;
  selectedMuteScope: 'track' | 'family';
  setSelectedMuteScope: (scope: 'track' | 'family') => void;
  familyLabel: string;
  selectedBaseOnly: boolean;
  setSelectedBaseOnly: (val: boolean) => void;
  showAoVivoSticks: boolean;
  setShowAoVivoSticks: (val: boolean) => void;
}

export const SpeedTrainerTocarJuntoTab: React.FC<SpeedTrainerTocarJuntoTabProps> = ({
  lang,
  t,
  playableTracks,
  selectedTrackId,
  setSelectedTrackId,
  tocarJuntoActive,
  tocarJuntoTrackId,
  isMutedOption,
  setIsMutedOption,
  hasFamilyGroup,
  selectedMuteScope,
  setSelectedMuteScope,
  familyLabel,
  selectedBaseOnly,
  setSelectedBaseOnly,
  showAoVivoSticks,
  setShowAoVivoSticks,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="p-3 bg-amber-500/10 border-2 border-[#1a1a1a] rounded-none flex items-center gap-3">
        <CordelTarget size={26} className="text-[#c25e38] shrink-0" />
        <div className="flex flex-col">
          <span className="font-cactus font-bold text-sm text-[#1a1a1a]">
            {lang === 'fr' ? 'Mode Entraînement : Jouer avec' : 'Modo Treino: Tocar Junto'}
          </span>
          <span className="text-xs text-[#1a1a1a]/80 leading-snug">{t('tocarJuntoInstruction')}</span>
        </div>
      </div>

      <SpeedTrainerPlayableTracksList
        lang={lang}
        t={t}
        playableTracks={playableTracks}
        selectedTrackId={selectedTrackId}
        setSelectedTrackId={setSelectedTrackId}
        tocarJuntoActive={tocarJuntoActive}
        tocarJuntoTrackId={tocarJuntoTrackId}
      />

      <SpeedTrainerTocarJuntoOptions
        lang={lang}
        t={t}
        isMutedOption={isMutedOption}
        setIsMutedOption={setIsMutedOption}
        hasFamilyGroup={hasFamilyGroup}
        selectedMuteScope={selectedMuteScope}
        setSelectedMuteScope={setSelectedMuteScope}
        familyLabel={familyLabel}
        selectedBaseOnly={selectedBaseOnly}
        setSelectedBaseOnly={setSelectedBaseOnly}
        showAoVivoSticks={showAoVivoSticks}
        setShowAoVivoSticks={setShowAoVivoSticks}
      />
    </div>
  );
};
