import React from 'react';
import { getEcosystemUrl } from '../../constants/ecosystemUrls';

interface LandingFooterProps {
  isFr: boolean;
  onLanguageSelect: (lang: 'fr' | 'pt') => void;
  onLaunchOrquestrador: (e: React.MouseEvent) => void;
  onCurrentAppClick: (e: React.MouseEvent) => void;
  onLaunchOrganizador: (e: React.MouseEvent) => void;
  onLaunchDancador: (e: React.MouseEvent) => void;
  onLaunchMostrador: (e: React.MouseEvent) => void;
  currentUser: any;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({
  isFr,
  onLanguageSelect,
  onLaunchOrquestrador,
  onCurrentAppClick,
  onLaunchOrganizador,
  onLaunchDancador,
  onLaunchMostrador,
  currentUser,
}) => {
  return (
    <footer className="w-full relative border-t-2 border-[#1a1a1a]/20 py-5 px-4 bg-[#eaddcf]/30 z-20">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center">
        <div className="font-cactus text-xs text-[#1a1a1a]/70 tracking-wider select-none">
          O GIRADOR © 2026-2027
        </div>

        <nav aria-label={isFr ? "Écosystème O-Girador" : "Ecossistema O-Girador"} className="flex items-center justify-center gap-3 sm:gap-4 md:gap-5">
          <a
            href={getEcosystemUrl('orquestrador')}
            onClick={onLaunchOrquestrador}
            target="_blank"
            rel="noopener noreferrer"
            title={isFr ? "Orquestrad'Or — Hub" : "Orquestrad'Or — Hub central"}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-[#1a1a1a] shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-[#f4ecd8] flex items-center justify-center hover:scale-105 cursor-pointer"
          >
            <img src="/ecosystem/orquestrador.png" alt="O Orquestrad'Or" className="w-full h-full object-cover block select-none pointer-events-none" />
          </a>

          <button
            type="button"
            onClick={onCurrentAppClick}
            title={isFr ? "Séquenciad'Or (Actuel)" : "Séquenciad'Or (Atual)"}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-[#8b2a1a] ring-2 ring-[#8b2a1a] bg-[#f4ecd8] flex items-center justify-center cursor-default"
          >
            <img src="/ecosystem/sequenciador.png" alt="O Séquenciad'Or" className="w-full h-full object-cover block select-none pointer-events-none" />
          </button>

          <a
            href={!currentUser ? 'https://organizador.o-girador.com/demo' : getEcosystemUrl('organizador')}
            onClick={onLaunchOrganizador}
            target="_blank"
            rel="noopener noreferrer"
            title={isFr ? "Organizad'Or — Gestion d'association" : "Organizad'Or — Gestão do grupo"}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-[#1a1a1a] shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-[#f4ecd8] flex items-center justify-center hover:scale-105 cursor-pointer"
          >
            <img src="/ecosystem/organizador.png" alt="O Organizad'Or" className="w-full h-full object-cover block select-none pointer-events-none" />
          </a>

          <a
            href={getEcosystemUrl('dancador')}
            onClick={onLaunchDancador}
            target="_blank"
            rel="noopener noreferrer"
            title={isFr ? "Dançad'Or — Chorégraphie" : "Dançad'Or — Coreografia"}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-[#1a1a1a] shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-[#f4ecd8] flex items-center justify-center hover:scale-105 cursor-pointer"
          >
            <img src="/ecosystem/dancador.png" alt="O Dançador" className="w-full h-full object-cover block select-none pointer-events-none" />
          </a>

          <a
            href="https://organizador.o-girador.com/demo?app=mostrador"
            onClick={onLaunchMostrador}
            target="_blank"
            rel="noopener noreferrer"
            title={isFr ? "Mostrad'Or — Carte & Vitrine" : "Mostrad'Or — Mapa & Vitrine"}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-[#1a1a1a] shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-[#f4ecd8] flex items-center justify-center hover:scale-105 cursor-pointer"
          >
            <img src="/ecosystem/mostrador.png" alt="O Mostrad'Or" className="w-full h-full object-cover block select-none pointer-events-none" />
          </a>
        </nav>

        <div className="flex items-center gap-1 font-cactus text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => onLanguageSelect('fr')}
            className={`px-3 py-1 border transition-all cursor-pointer ${
              isFr ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a] font-bold shadow-[2px_2px_0px_#8b2a1a]' : 'bg-transparent text-[#1a1a1a] border-[#1a1a1a]/40'
            }`}
          >
            🇫🇷 Français
          </button>
          <span className="text-[#1a1a1a]/40 font-mono px-1">|</span>
          <button
            type="button"
            onClick={() => onLanguageSelect('pt')}
            className={`px-3 py-1 border transition-all cursor-pointer ${
              !isFr ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a] font-bold shadow-[2px_2px_0px_#8b2a1a]' : 'bg-transparent text-[#1a1a1a] border-[#1a1a1a]/40'
            }`}
          >
            🇧🇷 Português
          </button>
        </div>
      </div>
    </footer>
  );
};
