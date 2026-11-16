import React from 'react';
import { CordelDiamondBullet } from './LandingCordelIcons';

export const LandingBookletSequenciador: React.FC<{ isFr: boolean }> = ({ isFr }) => (
  <>
    <div>
      <div className="flex items-center justify-between border-b border-[var(--cordel-border)]/50 pb-2 mb-3">
        <span className="font-cactus text-xs uppercase font-bold tracking-wider text-[var(--cordel-accent-readable)]">
          {isFr ? 'LIVRET 02' : 'FOLHETO 02'}
        </span>
        <span className="font-cactus text-xs uppercase text-[var(--cordel-text-muted)]">
          {isFr ? 'SEQUENCIADOR' : 'O SEQUENCIADOR'}
        </span>
      </div>
      <h2 className="font-cactus font-bold text-xl sm:text-2xl text-[var(--cordel-text)] mb-3 leading-snug">
        {isFr ? '« Apprendre et décortiquer le baque »' : '« Aprender e decifrar o baque »'}
      </h2>
      <ul className="space-y-2 text-xs sm:text-sm font-serif text-[var(--cordel-text-muted)] leading-snug">
        <li className="flex items-start gap-2">
          <CordelDiamondBullet />
          <span><strong className="text-[var(--cordel-text)]">{isFr ? 'Le cycle à 360° :' : 'O ciclo em 360° :'}</strong> {isFr ? "visualiser la tourne continue d'un coup d'œil." : 'visualizar a levada contínua num relance.'}</span>
        </li>
        <li className="flex items-start gap-2">
          <CordelDiamondBullet />
          <span><strong className="text-[var(--cordel-text)]">{isFr ? "L'écoute analytique :" : 'A escuta analítica :'}</strong> {isFr ? 'isoler un pupitre en focus, ralentir le tempo.' : 'isolar um naipe em foco, desacelerar o andamento.'}</span>
        </li>
        <li className="flex items-start gap-2">
          <CordelDiamondBullet />
          <span><strong className="text-[var(--cordel-text)]">{isFr ? 'Lutherie Studio 48 kHz :' : 'Lutheria Estúdio 48 kHz :'}</strong> {isFr ? 'banques acoustiques haute fidélité captées sur instruments réels.' : 'bancos acústicos de alta fidelidade gravados em instrumentos reais.'}</span>
        </li>
        <li className="flex items-start gap-2">
          <CordelDiamondBullet />
          <span><strong className="text-[var(--cordel-text)]">{isFr ? 'Le balanço vivant :' : 'O balanço vivo :'}</strong> {isFr ? 'réglage fin du micro-timing pour restituer le groove du batuque.' : 'ajuste fino do micro-timing para resgatar o groove do batuque.'}</span>
        </li>
      </ul>
    </div>
    <div className="pt-4 mt-4 border-t border-[var(--cordel-border)]/40 flex justify-between items-center text-[10px] font-mono uppercase text-[var(--cordel-text-muted)]">
      <span>360° · 48 kHz</span>
      <span>Balanço &amp; Groove</span>
    </div>
  </>
);
