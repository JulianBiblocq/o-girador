import React, { useState, useEffect } from 'react';
import { getEcosystemUrl } from '../../constants/ecosystemUrls';

interface LandingFooterProps {
  isFr: boolean;
  organizadorGroupLogo?: string | null;
  onLanguageSelect: (lang: 'fr' | 'pt') => void;
  onLaunchOrquestrador: (e: React.MouseEvent) => void;
  onCurrentAppClick: (e: React.MouseEvent) => void;
  onLaunchOrganizador: (e: React.MouseEvent) => void;
  onLaunchCantador: (e: React.MouseEvent) => void;
  onLaunchDancador: (e: React.MouseEvent) => void;
  onLaunchMostrador: (e: React.MouseEvent) => void;
  onOpenLegal?: () => void;
  currentUser: any;
}

const DEFAULT_ORG_ICON = '/ecosystem/organizador.png';

export const LandingFooter: React.FC<LandingFooterProps> = ({
  isFr,
  organizadorGroupLogo,
  onLanguageSelect,
  onLaunchOrquestrador,
  onCurrentAppClick,
  onLaunchOrganizador,
  onLaunchCantador,
  onLaunchDancador,
  onLaunchMostrador,
  onOpenLegal,
  currentUser,
}) => {
  const [groupLogoFailed, setGroupLogoFailed] = useState(false);
  useEffect(() => { setGroupLogoFailed(false); }, [organizadorGroupLogo]);

  const useCustomGroupBadge = Boolean(organizadorGroupLogo && !groupLogoFailed);
  const orgImgSrc = useCustomGroupBadge ? organizadorGroupLogo! : DEFAULT_ORG_ICON;

  const dockLinks = [
    { key: 'orquestrador', href: getEcosystemUrl('orquestrador'), onClick: onLaunchOrquestrador, title: isFr ? 'Orquestrador — Hub central' : 'Orquestrador — Hub central', img: '/ecosystem/orquestrador.png', alt: 'Orquestrador', contain: false },
    { key: 'organizador', href: !currentUser ? 'https://organizador.o-girador.com/demo' : getEcosystemUrl('organizador'), onClick: onLaunchOrganizador, title: isFr ? "Organizador — Gestion d'association" : 'Organizador — Gestão do grupo', img: orgImgSrc, alt: 'Organizador', contain: useCustomGroupBadge, onError: () => setGroupLogoFailed(true) },
    { key: 'cantador', href: getEcosystemUrl('cantador'), onClick: onLaunchCantador, title: isFr ? 'Cantador — Laboratoire vocal & Toadas' : 'Cantador — Laboratório vocal & Toadas', img: '/ecosystem/cantador.png', alt: 'Cantador', contain: false },
    { key: 'dancador', href: getEcosystemUrl('dancador'), onClick: onLaunchDancador, title: isFr ? 'Dançador — Chorégraphie' : 'Dançador — Coreografia', img: '/ecosystem/dancador.png', alt: 'Dançador', contain: false },
    { key: 'mostrador', href: 'https://organizador.o-girador.com/demo?app=mostrador', onClick: onLaunchMostrador, title: isFr ? 'Mostrador — Carte & Vitrine' : 'Mostrador — Mapa & Vitrine', img: '/ecosystem/mostrador.png', alt: 'Mostrador', contain: false },
  ];

  const badgeCls = 'w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] bg-[var(--cordel-paper-surface)] flex items-center justify-center hover:scale-105 transition-transform cursor-pointer';

  return (
    <footer className="w-full relative border-t-2 border-[var(--cordel-border)] py-5 px-4 sm:px-6 bg-[var(--cordel-surface)] z-20 mt-4">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center">
        <div className="font-cactus text-xs text-[var(--cordel-text-muted)] tracking-wider select-none flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <span>O GIRADOR (C) 2026-2027</span>
          <span className="opacity-40">·</span>
          <a
            href="#legal"
            onClick={(e) => {
              e.preventDefault();
              if (onOpenLegal) onOpenLegal();
              else window.location.hash = 'legal';
            }}
            className="hover:text-[var(--cordel-accent-readable)] underline transition-colors cursor-pointer"
          >
            {isFr ? 'Mentions Légales & CGU' : 'Termos de Uso & Privacidade'}
          </a>
        </div>

        <nav aria-label={isFr ? 'Écosystème O Girador' : 'Ecossistema O Girador'} className="flex items-center justify-center gap-2.5 sm:gap-3.5 md:gap-4">
          {dockLinks.slice(0, 1).map((item) => (
            <a key={item.key} href={item.href} onClick={item.onClick} target="_blank" rel="noopener noreferrer" title={item.title} className={badgeCls}>
              <img src={item.img} alt={item.alt} className="w-full h-full object-cover scale-[1.04] block select-none pointer-events-none" />
            </a>
          ))}

          <button
            type="button"
            onClick={onCurrentAppClick}
            title={isFr ? 'Sequenciador (Actuel)' : 'Sequenciador (Atual)'}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-[var(--cordel-wood)] ring-2 ring-[var(--cordel-accent-readable)] bg-[var(--cordel-paper-surface)] flex items-center justify-center cursor-default"
          >
            <img src="/ecosystem/sequenciador.png" alt="Sequenciador" className="w-full h-full object-cover scale-[1.04] block select-none pointer-events-none" />
          </button>

          {dockLinks.slice(1).map((item) => (
            <a key={item.key} href={item.href} onClick={item.onClick} target="_blank" rel="noopener noreferrer" title={item.title} className={badgeCls}>
              <img
                src={item.img}
                alt={item.alt}
                onError={item.onError}
                className={item.contain ? 'w-full h-full object-contain p-1 block select-none pointer-events-none' : 'w-full h-full object-cover scale-[1.04] block select-none pointer-events-none'}
              />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1 font-cactus text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => onLanguageSelect('fr')}
            className={`px-3 py-1 border transition-all cursor-pointer ${
              isFr ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)] font-bold shadow-[2px_2px_0px_var(--cordel-shadow-color)]' : 'bg-transparent text-[var(--cordel-text)] border-[var(--cordel-border)]'
            }`}
          >
            FR · Français
          </button>
          <span className="text-[var(--cordel-text-muted)] opacity-50 font-mono px-1">|</span>
          <button
            type="button"
            onClick={() => onLanguageSelect('pt')}
            className={`px-3 py-1 border transition-all cursor-pointer ${
              !isFr ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)] font-bold shadow-[2px_2px_0px_var(--cordel-shadow-color)]' : 'bg-transparent text-[var(--cordel-text)] border-[var(--cordel-border)]'
            }`}
          >
            BR · Português
          </button>
        </div>
      </div>
    </footer>
  );
};
