import React from 'react';
import { SettingsCachePurgeButton } from './SettingsCachePurgeButton';
import { EcoModeControls } from './EcoModeControls';

interface SettingsEcoTabProps {
  lang: string;
  confirmAsync?: (msg: string) => Promise<boolean>;
  alertAsync?: (msg: string) => Promise<void>;
}

export const SettingsEcoTab: React.FC<SettingsEcoTabProps> = ({ lang }) => {
  return (
    <div className="flex flex-col gap-6 text-left">
      <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-shadow">
        <h3 className="font-cactus font-bold text-sm uppercase mb-1 border-b border-[var(--cordel-border)]/20 pb-1">
          {lang === 'fr' ? 'Optimisation & Mode Éco' : 'Otimização & Modo Eco'}
        </h3>
        <p className="text-[10px] font-semibold opacity-80 mb-4">
          {lang === 'fr'
            ? 'Deux paliers pour soulager les téléphones et tablettes modestes, sans jamais supprimer une note ni couper une piste.'
            : 'Dois níveis para aliviar celulares e tablets modestos, sem nunca remover uma nota nem cortar uma faixa.'}
        </p>
        <EcoModeControls lang={lang} variant="full" />
      </div>

      <SettingsCachePurgeButton lang={lang} />
    </div>
  );
};
