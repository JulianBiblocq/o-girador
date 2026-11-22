import React from 'react';
import { CordelDiamondBullet } from './LandingCordelIcons';

export const LandingBookletOral: React.FC<{ isFr: boolean }> = ({ isFr }) => (
  <>
    <div>
      <div className="flex items-center justify-between border-b border-[var(--cordel-border)]/50 pb-2 mb-2.5">
        <span className="font-cactus text-xs uppercase font-bold tracking-wider text-[var(--cordel-accent-readable)]">
          {isFr ? 'LIVRET 01' : 'FOLHETO 01'}
        </span>
        <span className="font-cactus text-[10px] uppercase text-[var(--cordel-text-muted)]">
          360° · OFICINA
        </span>
      </div>
      <h2 className="font-cactus font-bold text-lg sm:text-xl text-[var(--cordel-text)] leading-snug">
        {isFr ? 'Le Studio & la Roda' : 'O Estúdio e a Roda'}
      </h2>
      <p className="font-serif italic text-xs text-[var(--cordel-accent-readable)] mb-3">
        {isFr ? 'Écrire, accorder et faire tourner le baque' : 'Escrever, afinar e girar o baque'}
      </p>
      <ul className="space-y-2 text-xs font-serif text-[var(--cordel-text-muted)] leading-snug">
        <li className="flex items-start gap-2">
          <CordelDiamondBullet />
          <span>
            <strong className="text-[var(--cordel-text)]">{isFr ? 'Double lecture :' : 'Leitura dupla :'}</strong>{' '}
            {isFr
              ? 'visualisez le cycle collectif à 360° dans la Roda tout en structurant appels, viradas et sections sur la Timeline linéaire.'
              : 'visualize o ciclo coletivo em 360° na Roda enquanto estrutura chamadas, viradas e seções na Timeline linear.'}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <CordelDiamondBullet />
          <span>
            <strong className="text-[var(--cordel-text)]">{isFr ? 'Sons acoustiques & Accordage :' : 'Sons acústicos e Afinação :'}</strong>{' '}
            {isFr
              ? "prises studio sur instruments réels, mixage par pupitre et réglage des fûts et cloches dans A Oficina — dans une plage acoustique naturelle — pour faire sonner la Roda selon l'accordage propre à votre Nação, bloco ou batuque."
              : 'gravações de estúdio em instrumentos reais, mixagem por naipe e ajuste de tambores e gonguês na Oficina — dentro de uma tessitura acústica natural — para fazer a Roda soar com a afinação própria da sua Nação, bloco ou batuque.'}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <CordelDiamondBullet />
          <span>
            <strong className="text-[var(--cordel-text)]">O Balanço :</strong>{' '}
            {isFr
              ? 'ajustez le micro-timing de chaque instrument pour respecter le placement rythmique propre à votre groupe.'
              : 'ajuste o micro-timing de cada instrumento para respeitar a levada própria do seu grupo.'}
          </span>
        </li>
      </ul>
    </div>
    <div className="pt-3 mt-4 border-t border-[var(--cordel-border)]/40 flex justify-between items-center text-[10px] font-mono uppercase text-[var(--cordel-text-muted)]">
      <span>Roda &amp; Timeline</span>
      <span>O Balanço</span>
    </div>
  </>
);
