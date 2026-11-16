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
      <div className="border-2 border-[var(--cordel-border)] rounded-[3px_6px_4px_8px] p-4 bg-[var(--cordel-surface)] text-[var(--cordel-text)] shadow-[3px_3px_0px_var(--cordel-shadow-color)]">
        <h3 className="font-cactus font-bold text-sm uppercase mb-1 border-b border-[var(--cordel-border)]/35 pb-1.5">
          {lang === 'fr' ? 'Optimisation & Mode Éco' : 'Otimização & Modo Eco'}
        </h3>
        <p className="text-[11px] font-semibold text-[var(--cordel-text-muted)] mb-4">
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
