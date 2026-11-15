import React from 'react';
import { DispositionVisibility } from '../../../types/disposition.types';

interface VisibilitySelectorProps {
  visibility: DispositionVisibility;
  onChange: (val: DispositionVisibility) => void;
  hasGroup: boolean;
  groupName?: string | null;
  isMestreOrAdmin: boolean;
  lang: 'fr' | 'pt';
}

export const SaveDispositionVisibilitySelector: React.FC<VisibilitySelectorProps> = ({
  visibility,
  onChange,
  hasGroup,
  groupName,
  isMestreOrAdmin,
  lang,
}) => {
  return (
    <div className="flex flex-col gap-2 p-3 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] text-[var(--cordel-text)]">
      <label className="text-xs font-bold uppercase text-[var(--cordel-text)]">
        {lang === 'fr' ? 'Portée & Partage :' : 'Alcance e Compartilhamento :'}
      </label>

      <div className="flex flex-col gap-2 mt-1 text-xs font-sans">
        <label className="flex items-center gap-2 cursor-pointer font-bold">
          <input
            type="radio"
            name="dispositionVisibility"
            value="private"
            checked={visibility === 'private'}
            onChange={() => onChange('private')}
            className="accent-[var(--cordel-wood)] cursor-pointer"
          />
          <span>{lang === 'fr' ? 'Privé (Mon compte / Mémoire locale)' : 'Privado (Minha conta / Memória local)'}</span>
        </label>

        <label className={`flex items-center gap-2 font-bold ${hasGroup ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}>
          <input
            type="radio"
            name="dispositionVisibility"
            value="mestre_group"
            checked={visibility === 'mestre_group'}
            onChange={() => onChange('mestre_group')}
            disabled={!hasGroup}
            className="accent-[var(--cordel-wood)] cursor-pointer"
          />
          <span>{lang === 'fr' ? `Mon Groupe (${groupName || 'Groupe'})` : `Meu Grupo (${groupName || 'Grupo'})`}</span>
        </label>

        <label className={`flex items-center gap-2 font-bold ${isMestreOrAdmin ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}>
          <input
            type="radio"
            name="dispositionVisibility"
            value="public"
            checked={visibility === 'public'}
            onChange={() => onChange('public')}
            disabled={!isMestreOrAdmin}
            className="accent-[var(--cordel-wood)] cursor-pointer"
          />
          <span>{lang === 'fr' ? 'Catalogue Public (Accessible à tous)' : 'Catálogo Público (Acessível a todos)'}</span>
        </label>
        {!isMestreOrAdmin && (
          <span className="text-[10px] text-[var(--cordel-text-muted)] italic ml-5">
            {lang === 'fr' ? '* Seul un Mestre ou Admin peut publier dans le catalogue public.' : '* Apenas um Mestre ou Admin pode publicar no catálogo público.'}
          </span>
        )}
      </div>
    </div>
  );
};
