import React from 'react';
import { getEcosystemUrl } from '../../constants/ecosystemUrls';
import { launchCrossApp } from '../../utils/crossAppAuth';
import { CordelDiamondBullet } from './LandingCordelIcons';

export const LandingBookletOrquestrador: React.FC<{ isFr: boolean }> = ({ isFr }) => (
  <>
    <div>
      <div className="flex items-center justify-between border-b border-[var(--cordel-border)]/50 pb-2 mb-3">
        <span className="font-cactus text-xs uppercase font-bold tracking-wider text-[var(--cordel-accent-readable)]">
          {isFr ? 'LIVRET 04' : 'FOLHETO 04'}
        </span>
        <span className="font-cactus text-xs uppercase text-[var(--cordel-text-muted)]">
          ORQUESTRADOR
        </span>
      </div>
      <h2 className="font-cactus font-bold text-xl sm:text-2xl text-[var(--cordel-text)] mb-3 leading-snug">
        {isFr ? '« Connecter les Nações et les groupes »' : '« Conectar as Nações e os grupos »'}
      </h2>
      <ul className="space-y-2 text-xs sm:text-sm font-serif text-[var(--cordel-text-muted)] leading-snug">
        <li className="flex items-start gap-2">
          <CordelDiamondBullet />
          <span><strong className="text-[var(--cordel-text)]">{isFr ? 'La carte mondiale :' : 'O mapa mundial :'}</strong> {isFr ? 'inscription de son groupe ou Nação sur la cartographie internationale.' : 'cadastro do seu grupo ou Nação na cartografia internacional.'}</span>
        </li>
        <li className="flex items-start gap-2">
          <CordelDiamondBullet />
          <span><strong className="text-[var(--cordel-text)]">{isFr ? 'Partage de rythmes :' : 'Compartilhamento :'}</strong> {isFr ? "échange de motifs, vitrines Mostrador et découverte d'arrangements." : 'troca de levadas, vitrines Mostrador e descoberta de arranjos.'}</span>
        </li>
      </ul>
    </div>
    <div className="mt-4 pt-3 border-t border-[var(--cordel-border)]/40">
      <a
        href={getEcosystemUrl('orquestrador')}
        onClick={(e) => {
          e.preventDefault();
          launchCrossApp(getEcosystemUrl('orquestrador'), { appKey: 'orquestrador', appLabel: 'Orquestrador' });
        }}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full py-2.5 px-3 bg-[var(--cordel-bg)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] text-[var(--cordel-text)] text-center border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-xs uppercase tracking-wide cordel-wood-shadow-sm transition-colors"
      >
        {isFr ? 'Inscrire mon groupe sur la carte' : 'Cadastrar meu grupo no mapa'}
      </a>
    </div>
  </>
);
