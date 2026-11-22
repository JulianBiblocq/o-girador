import React from 'react';
import { CordelDiamondBullet } from './LandingCordelIcons';

export const LandingBookletOrganizador: React.FC<{ isFr: boolean }> = ({ isFr }) => (
  <>
    <div>
      <div className="flex items-center justify-between border-b border-[var(--cordel-border)]/50 pb-2 mb-2.5">
        <span className="font-cactus text-xs uppercase font-bold tracking-wider text-[var(--cordel-accent-readable)]">
          {isFr ? 'LIVRET 03' : 'FOLHETO 03'}
        </span>
        <span className="font-cactus text-[10px] uppercase text-[var(--cordel-text-muted)]">
          A4 · SCAN · PDF
        </span>
      </div>
      <h2 className="font-cactus font-bold text-lg sm:text-xl text-[var(--cordel-text)] leading-snug">
        {isFr ? 'Du Papier au Son' : 'Do Papel ao Som'}
      </h2>
      <p className="font-serif italic text-xs text-[var(--cordel-accent-readable)] mb-3">
        {isFr ? "Du cahier de répétition à l'écran" : 'Do caderno de ensaio para a tela'}
      </p>
      <ul className="space-y-2 text-xs font-serif text-[var(--cordel-text-muted)] leading-snug">
        <li className="flex items-start gap-2">
          <CordelDiamondBullet />
          <span>
            <strong className="text-[var(--cordel-text)]">{isFr ? 'Tablatures vierges gratuites :' : 'Tablaturas em branco gratuitas :'}</strong>{' '}
            {isFr
              ? 'imprimez librement vos feuilles de motifs A4, conducteurs et fiches légendes pour noter vos rythmes au stylo.'
              : 'imprima livremente folhas de padrões A4, roteiros e legendas para anotar seus baques à caneta.'}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <CordelDiamondBullet />
          <span>
            <strong className="text-[var(--cordel-text)]">{isFr ? 'Scanner Photo :' : 'Scanner por Foto :'}</strong>{' '}
            {isFr
              ? 'photographiez vos grilles manuscrites pour les convertir en séquences jouables dans la Roda.'
              : 'fotografe suas grades manuscritas para convertê-las em sequências tocáveis na Roda.'}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <CordelDiamondBullet />
          <span>
            <strong className="text-[var(--cordel-text)]">{isFr ? 'La Presse PDF :' : 'A Prensa PDF :'}</strong>{' '}
            {isFr
              ? 'générez des fiches propres de partitions et de Mini-Rodas A4 prêtes à partager avec vos musiciens.'
              : 'gere folhas limpas de partituras e Mini-Rodas em A4 prontas para compartilhar com os batuqueiros.'}
          </span>
        </li>
      </ul>
    </div>
    <div className="pt-3 mt-4 border-t border-[var(--cordel-border)]/40 flex justify-between items-center text-[10px] font-mono uppercase text-[var(--cordel-text-muted)]">
      <span>{isFr ? 'Atelier Papier' : 'Oficina de Papel'}</span>
      <span>Mini-Rodas A4</span>
    </div>
  </>
);
