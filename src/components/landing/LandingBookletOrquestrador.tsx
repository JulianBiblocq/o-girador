import React from 'react';
import { getEcosystemUrl } from '../../constants/ecosystemUrls';
import { launchCrossApp } from '../../utils/crossAppAuth';

export const LandingBookletOrquestrador: React.FC<{ isFr: boolean }> = ({ isFr }) => (
  <>
    <div>
      <div className="flex items-center justify-between border-b border-[#1a1a1a]/30 pb-2 mb-3">
        <span className="font-cactus text-xs uppercase font-bold tracking-wider text-[#8b2a1a]">
          {isFr ? 'LIVRET 04' : 'FOLHETO 04'}
        </span>
        <span className="font-cactus text-xs uppercase text-[#1a1a1a]/70">
          ORQUESTRADOR
        </span>
      </div>
      <h2 className="font-cactus font-bold text-xl sm:text-2xl text-[#1a1a1a] mb-3 leading-snug">
        {isFr ? '« Connecter les Nações et les groupes »' : '« Conectar as Nações e os grupos »'}
      </h2>
      <ul className="space-y-2 text-xs sm:text-sm font-serif text-[#1a1a1a]/85 leading-snug">
        <li className="flex items-start gap-1.5">
          <span className="text-[#8b2a1a] font-bold mt-0.5">✦</span>
          <span><strong>{isFr ? 'La carte mondiale :' : 'O mapa mundial :'}</strong> {isFr ? 'inscription de son groupe ou nação sur la cartographie internationale.' : 'cadastro do seu grupo ou nação na cartografia internacional.'}</span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="text-[#8b2a1a] font-bold mt-0.5">✦</span>
          <span><strong>{isFr ? 'Partage de rythmes :' : 'Compartilhamento :'}</strong> {isFr ? 'échange de motifs et découverte d’arrangements.' : 'troca de levadas e descoberta de arranjos.'}</span>
        </li>
      </ul>
    </div>
    <div className="mt-4 pt-3 border-t border-[#1a1a1a]/20">
      <a
        href={getEcosystemUrl('orquestrador')}
        onClick={(e) => {
          e.preventDefault();
          launchCrossApp(getEcosystemUrl('orquestrador'), { appKey: 'orquestrador', appLabel: "l'Orquestrador" });
        }}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full py-2.5 px-3 bg-[#f4ecd8] hover:bg-[#8b2a1a] hover:text-[#f4ecd8] text-[#1a1a1a] text-center border-2 border-[#1a1a1a] font-cactus font-bold text-xs uppercase tracking-wide cordel-wood-shadow-sm transition-colors"
      >
        {isFr ? '🌍 Inscrire mon groupe sur la carte' : '🌍 Cadastrar meu grupo no mapa'}
      </a>
    </div>
  </>
);
