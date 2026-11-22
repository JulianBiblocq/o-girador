import React, { useState, useEffect } from 'react';
import { getEcosystemUrl } from '../../constants/ecosystemUrls';
import { SHOW_AFINADOR, SHOW_DANCADOR } from '../../constants/featureFlags';
import { AfinadorCordelBadgeSvg } from './LandingCordelIcons';

interface LandingFooterProps {
  isFr: boolean;
  organizadorGroupLogo?: string | null;
  mostradorHref: string;
  onLanguageSelect: (lang: 'fr' | 'pt') => void;
  onLaunchOrquestrador: (e: React.MouseEvent) => void;
  onCurrentAppClick: (e: React.MouseEvent) => void;
  onLaunchOrganizador: (e: React.MouseEvent) => void;
  onLaunchCantador: (e: React.MouseEvent) => void;
  onLaunchDancador: (e: React.MouseEvent) => void;
  onLaunchAfinador: (e: React.MouseEvent) => void;
  onLaunchMostrador: (e: React.MouseEvent) => void;
  onOpenLegal?: () => void;
  currentUser: any;
}

const DEFAULT_ORG_ICON = '/ecosystem/organizador.png';

export const LandingFooter: React.FC<LandingFooterProps> = ({
  isFr,
  organizadorGroupLogo,
  mostradorHref,
  onLanguageSelect,
  onLaunchOrquestrador,
  onCurrentAppClick,
  onLaunchOrganizador,
  onLaunchCantador,
  onLaunchDancador,
  onLaunchAfinador,
  onLaunchMostrador,
  onOpenLegal,
  currentUser,
}) => {
  const [groupLogoFailed, setGroupLogoFailed] = useState(false);
  const [afinadorPngFailed, setAfinadorPngFailed] = useState(false);
  useEffect(() => { setGroupLogoFailed(false); }, [organizadorGroupLogo]);

  const useCustomGroupBadge = Boolean(organizadorGroupLogo && !groupLogoFailed);
  const orgImgSrc = useCustomGroupBadge ? organizadorGroupLogo! : DEFAULT_ORG_ICON;

  const badgeCls =
    'w-10 h-10 md:w-12 md:h-12 p-0 rounded-full overflow-hidden border-2 border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] bg-[var(--cordel-paper-surface)] flex items-center justify-center hover:scale-105 transition-transform cursor-pointer';
  const imgCls = 'w-full h-full object-cover scale-[1.04] block select-none pointer-events-none';

  return (
    <footer className="w-full relative border-t-2 border-[var(--cordel-border)] py-5 px-4 sm:px-6 bg-[var(--cordel-surface)] z-20 mt-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center">
        <div className="font-cactus text-xs text-[var(--cordel-text)] tracking-wider select-none flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <span className="opacity-85">O GIRADOR (C) 2026-2027</span>
          <span className="opacity-45">·</span>
          <a
            href="#legal"
            onClick={(e) => {
              e.preventDefault();
              if (onOpenLegal) onOpenLegal();
              else window.location.hash = 'legal';
            }}
            className="text-[var(--cordel-text)] hover:text-[var(--cordel-accent-readable)] font-bold underline transition-colors cursor-pointer"
          >
            {isFr ? 'Mentions légales & CGU' : 'Termos de Uso & Privacidade'}
          </a>
        </div>

        <nav aria-label={isFr ? 'Écosystème O Girador' : 'Ecossistema O Girador'} className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5 md:gap-4">
          <a href={getEcosystemUrl('orquestrador')} onClick={onLaunchOrquestrador} target="_blank" rel="noopener noreferrer" title="Orquestrador" className={badgeCls}>
            <img src="/ecosystem/orquestrador.png" alt="Orquestrador" className={imgCls} />
          </a>

          <button
            type="button"
            onClick={onCurrentAppClick}
            title={isFr ? 'Sequenciador (Actif)' : 'Sequenciador (Ativo)'}
            className="w-10 h-10 md:w-12 md:h-12 p-0 rounded-full overflow-hidden border-2 border-[var(--cordel-wood)] ring-2 ring-[var(--cordel-accent-readable)] bg-[var(--cordel-paper-surface)] shadow-inner translate-y-[1px] flex items-center justify-center cursor-default"
          >
            <img src="/ecosystem/sequenciador.png" alt="Sequenciador" className={imgCls} />
          </button>

          <a href={!currentUser ? 'https://organizador.o-girador.com/demo' : getEcosystemUrl('organizador')} onClick={onLaunchOrganizador} target="_blank" rel="noopener noreferrer" title="Organizador" className={badgeCls}>
            <img src={orgImgSrc} alt="Organizador" onError={() => setGroupLogoFailed(true)} className={useCustomGroupBadge ? 'w-full h-full object-contain p-1 block select-none pointer-events-none' : imgCls} />
          </a>

          <a href={getEcosystemUrl('cantador')} onClick={onLaunchCantador} target="_blank" rel="noopener noreferrer" title="Cantador" className={badgeCls}>
            <img src="/ecosystem/cantador.png" alt="Cantador" className={imgCls} />
          </a>

          {SHOW_DANCADOR && (
            <a href={getEcosystemUrl('dancador')} onClick={onLaunchDancador} target="_blank" rel="noopener noreferrer" title="Dançador" className={badgeCls}>
              <img src="/ecosystem/dancador.png" alt="Dançador" className={imgCls} />
            </a>
          )}

          {SHOW_AFINADOR && (
            <a href={getEcosystemUrl('afinador')} onClick={onLaunchAfinador} target="_blank" rel="noopener noreferrer" title="Afinador" className={badgeCls}>
              {afinadorPngFailed ? (
                <AfinadorCordelBadgeSvg />
              ) : (
                <img src="/ecosystem/afinador.png" alt="Afinador" onError={() => setAfinadorPngFailed(true)} className={imgCls} />
              )}
            </a>
          )}

          <a href={mostradorHref} onClick={onLaunchMostrador} target="_blank" rel="noopener noreferrer" title="Mostrador" className={badgeCls}>
            <img src="/ecosystem/mostrador.png" alt="Mostrador" className={imgCls} />
          </a>
        </nav>

        <div className="inline-flex border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface-elevated)] font-cactus text-xs select-none cordel-wood-shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => onLanguageSelect('fr')}
            className={`px-3 py-1 cursor-pointer transition-colors ${isFr ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] font-bold' : 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]'}`}
          >
            FR
          </button>
          <button
            type="button"
            onClick={() => onLanguageSelect('pt')}
            className={`px-3 py-1 border-l-2 border-[var(--cordel-border-strong)] cursor-pointer transition-colors ${!isFr ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] font-bold' : 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]'}`}
          >
            BR
          </button>
        </div>
      </div>
    </footer>
  );
};
