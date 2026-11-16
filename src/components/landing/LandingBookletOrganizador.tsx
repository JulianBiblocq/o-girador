import React from 'react';
import { CordelDiamondBullet } from './LandingCordelIcons';

export const LandingBookletOrganizador: React.FC<{ isFr: boolean }> = ({ isFr }) => (
  <>
    <div>
      <div className="flex items-center justify-between border-b border-[var(--cordel-border)]/50 pb-2 mb-3">
        <span className="font-cactus text-xs uppercase font-bold tracking-wider text-[var(--cordel-accent-readable)]">
          {isFr ? 'LIVRET 03' : 'FOLHETO 03'}
        </span>
        <span className="font-cactus text-xs uppercase text-[var(--cordel-text-muted)]">
          ORGANIZADOR · CANTADOR · DANÇADOR
        </span>
      </div>
      <h2 className="font-cactus font-bold text-xl sm:text-2xl text-[var(--cordel-text)] mb-3 leading-snug">
        {isFr ? '« De la partition à la répétition »' : '« Da partitura ao ensaio »'}
      </h2>
      <ul className="space-y-2 text-xs sm:text-sm font-serif text-[var(--cordel-text-muted)] leading-snug">
        <li className="flex items-start gap-2">
          <CordelDiamondBullet />
          <span><strong className="text-[var(--cordel-text)]">{isFr ? 'Passerelle pédagogique :' : 'Ponte pedagógica :'}</strong> {isFr ? 'partage direct du répertoire avec Organizador et des toadas avec Cantador.' : 'integração direta do repertório com o Organizador e das toadas com o Cantador.'}</span>
        </li>
        <li className="flex items-start gap-2">
          <CordelDiamondBullet />
          <span><strong className="text-[var(--cordel-text)]">{isFr ? 'Le geste et le pas :' : 'O gesto e o passo :'}</strong> {isFr ? 'synchronisation des mouvements chorégraphiques de Dançador.' : 'sincronização dos movimentos coreográficos do Dançador.'}</span>
        </li>
        <li className="flex items-start gap-2">
          <CordelDiamondBullet />
          <span><strong className="text-[var(--cordel-text)]">{isFr ? 'Gestion collective :' : 'Gestão coletiva :'}</strong> {isFr ? 'organisation des répétitions, fiches papier et suivi du batuque.' : 'organização dos ensaios, folhas impressas e acompanhamento do batuque.'}</span>
        </li>
      </ul>
    </div>
    <div className="pt-4 mt-4 border-t border-[var(--cordel-border)]/40 flex justify-between items-center text-[10px] font-mono uppercase text-[var(--cordel-text-muted)]">
      <span>{isFr ? 'Pédagogie' : 'Pedagogia'}</span>
      <span>{isFr ? 'Voix · Corps & Pas' : 'Voz · Corpo & Passo'}</span>
    </div>
  </>
);
