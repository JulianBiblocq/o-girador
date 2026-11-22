import React from 'react';
import { CordelDiamondBullet } from './LandingCordelIcons';

export const LandingBookletSequenciador: React.FC<{ isFr: boolean }> = ({ isFr }) => (
  <>
    <div>
      <div className="flex items-center justify-between border-b border-[var(--cordel-border)]/50 pb-2 mb-2.5">
        <span className="font-cactus text-xs uppercase font-bold tracking-wider text-[var(--cordel-accent-readable)]">
          {isFr ? 'LIVRET 02' : 'FOLHETO 02'}
        </span>
        <span className="font-cactus text-[10px] uppercase text-[var(--cordel-text-muted)]">
          AO VIVO · TOADAS
        </span>
      </div>
      <h2 className="font-cactus font-bold text-lg sm:text-xl text-[var(--cordel-text)] leading-snug">
        {isFr ? 'Pratique, Lecture & Chant' : 'Prática, Escuta e Canto'}
      </h2>
      <p className="font-serif italic text-xs text-[var(--cordel-accent-readable)] mb-3">
        {isFr ? 'Travailler entre deux répétitions' : 'Estudar entre os ensaios'}
      </p>
      <ul className="space-y-2 text-xs font-serif text-[var(--cordel-text-muted)] leading-snug">
        <li className="flex items-start gap-2">
          <CordelDiamondBullet />
          <span>
            <strong className="text-[var(--cordel-text)]">{isFr ? 'Mode Pratique & Tocar Junto :' : 'Modo Prática e Tocar Junto :'}</strong>{' '}
            {isFr
              ? 'isolez ou coupez votre tambour pour jouer par-dessus le batuque, avec baguettes animées (Ao Vivo) en droitier ou gaucher et accélération par paliers (Speed Trainer).'
              : 'isole ou silencie seu instrumento para tocar junto com o batuque, com baquetas animadas (Ao Vivo) para destros ou canhotos e aceleração gradual (Speed Trainer).'}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <CordelDiamondBullet />
          <span>
            <strong className="text-[var(--cordel-text)]">{isFr ? 'Mode Lecture sur mobile :' : 'Modo Escuta no celular :'}</strong>{' '}
            {isFr
              ? "lancez les boucles de sections et gérez d'un geste les 6 familles d'instruments (Mute / Solo) pour répéter le chant, les appels ou les déplacements sans afficher la grille technique."
              : 'acione loops de seções e controle com um toque os 6 naipes (Mute / Solo) para ensaiar o canto, as chamadas ou a movimentação sem exibir a grade técnica.'}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <CordelDiamondBullet />
          <span>
            <strong className="text-[var(--cordel-text)]">{isFr ? 'Toadas & Signes du Mestre :' : 'Toadas e Sinais do Mestre :'}</strong>{' '}
            {isFr
              ? 'suivez le chant (Puxador et Coro) calé sur les mesures, les gestes d’appel gravés et la vidéo de référence.'
              : 'acompanhe o canto (Puxador e Coro) alinhado aos compassos, os sinais gravados em xilogravura e o vídeo de referência.'}
          </span>
        </li>
      </ul>
    </div>
    <div className="pt-3 mt-4 border-t border-[var(--cordel-border)]/40 flex justify-between items-center text-[10px] font-mono uppercase text-[var(--cordel-text-muted)]">
      <span>Tocar Junto</span>
      <span>{isFr ? 'Lecture & Chant' : 'Escuta & Canto'}</span>
    </div>
  </>
);
