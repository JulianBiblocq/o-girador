import React from 'react';
import { getEcosystemUrl } from '../../constants/ecosystemUrls';
import { SHOW_AFINADOR } from '../../constants/featureFlags';
import { launchCrossApp } from '../../utils/crossAppAuth';
import { CordelDiamondBullet } from './LandingCordelIcons';

export const LandingBookletOrquestrador: React.FC<{ isFr: boolean }> = ({ isFr }) => (
  <>
    <div>
      <div className="flex items-center justify-between border-b border-[var(--cordel-border)]/50 pb-2 mb-2.5">
        <span className="font-cactus text-xs uppercase font-bold tracking-wider text-[var(--cordel-accent-readable)]">
          {isFr ? 'LIVRET 04' : 'FOLHETO 04'}
        </span>
        <span className="font-cactus text-[10px] uppercase text-[var(--cordel-text-muted)]">
          O GIRADOR
        </span>
      </div>
      <h2 className="font-cactus font-bold text-lg sm:text-xl text-[var(--cordel-text)] leading-snug">
        {isFr ? "L'Écosystème O Girador" : 'O Ecossistema O Girador'}
      </h2>
      <p className="font-serif italic text-xs text-[var(--cordel-accent-readable)] mb-3">
        {isFr ? 'Des outils reliés pour la vie du groupe' : 'Ferramentas conectadas para a vida do grupo'}
      </p>
      <ul className="space-y-2 text-xs font-serif text-[var(--cordel-text-muted)] leading-snug">
        <li className="flex items-start gap-2">
          <CordelDiamondBullet />
          <span>
            <strong className="text-[var(--cordel-text)]">{isFr ? 'Organizador & Mostrador :' : 'Organizador e Mostrador :'}</strong>{' '}
            {isFr
              ? 'gérez les répétitions, les fiches pédagogiques et la vitrine publique de votre association.'
              : 'organize os ensaios, as fichas de estudo e a página pública da sua associação.'}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <CordelDiamondBullet />
          {SHOW_AFINADOR ? (
            <span>
              <strong className="text-[var(--cordel-text)]">{isFr ? 'Cantador & Afinador :' : 'Cantador e Afinador :'}</strong>{' '}
              {isFr
                ? 'préparez le chant des toadas (Puxador / Coro) et accordez précisément les peaux et cloches de votre batuque.'
                : 'trabalhe o canto das toadas (Puxador / Coro) e afine com precisão os tambores e gonguês do seu batuque.'}
            </span>
          ) : (
            <span>
              <strong className="text-[var(--cordel-text)]">Cantador :</strong>{' '}
              {isFr
                ? 'enregistrez les voix du Puxador et du Coro, travaillez la justesse et importez vos chants en un clic.'
                : 'grave as vozes do Puxador e do Coro, trabalhe a afinação vocal e importe suas toadas em um clique.'}
            </span>
          )}
        </li>
        <li className="flex items-start gap-2">
          <CordelDiamondBullet />
          <span>
            <strong className="text-[var(--cordel-text)]">Orquestrador :</strong>{' '}
            {isFr
              ? 'échangez des rythmes avec la communauté et référencez votre Nação ou groupe sur la carte mondiale.'
              : 'troque baques com a comunidade e cadastre sua Nação ou grupo no mapa mundial.'}
          </span>
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
        className="block w-full py-2 px-3 bg-[var(--cordel-bg)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] text-[var(--cordel-text)] text-center border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-[11px] uppercase tracking-wide cordel-wood-shadow-sm transition-colors"
      >
        {isFr ? 'Voir la carte mondiale & inscrire mon groupe' : 'Ver o mapa mundial e cadastrar meu grupo'}
      </a>
    </div>
  </>
);
