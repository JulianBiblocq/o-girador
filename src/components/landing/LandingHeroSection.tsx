import React from 'react';
import { Loader2, Printer, BookOpen, Disc } from 'lucide-react';
import { LandingHeroBrand } from './LandingHeroBrand';

interface LandingHeroSectionProps {
  isFr: boolean;
  isToneReady: boolean;
  isUnlocking: boolean;
  onEnterRoda: (e?: React.MouseEvent | React.TouchEvent) => void;
  onEnterPractice: () => void;
  onEnterPrintA4: () => void;
  onEnterGuide: () => void;
}

export const LandingHeroSection: React.FC<LandingHeroSectionProps> = ({
  isFr,
  isToneReady,
  isUnlocking,
  onEnterRoda,
  onEnterPractice,
  onEnterPrintA4,
  onEnterGuide,
}) => {
  const isBusy = !isToneReady || isUnlocking;
  const shortcutCls =
    'px-3 py-2 bg-[var(--cordel-surface-elevated)] hover:bg-[var(--cordel-wood)] text-[var(--cordel-text)] hover:text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 cordel-wood-shadow-sm cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <section className="w-full relative flex flex-col items-center text-center px-4 pt-2 sm:pt-3 pb-3 max-w-5xl mx-auto z-20">
      <LandingHeroBrand
        onEnterRoda={onEnterRoda}
        isFr={isFr}
        isToneReady={isToneReady}
        isUnlocking={isUnlocking}
      />

      <h1 className="font-cactus font-bold text-lg sm:text-xl md:text-2xl text-[var(--cordel-text)] max-w-3xl mx-auto mt-5 sm:mt-6 leading-snug">
        {isFr
          ? "L'atelier circulaire du Maracatu de Baque Virado — Rythme, Chant & Partition"
          : 'A oficina circular do Maracatu de Baque Virado — Ritmo, Canto e Partitura'}
      </h1>

      <p className="font-serif text-xs sm:text-sm md:text-base text-[var(--cordel-text-muted)] max-w-3xl mx-auto mt-3 px-2 leading-relaxed">
        {isFr
          ? "Le Maracatu vit dans la rue, par le chant, l'écoute et la transmission directe des mestres. Pensé comme un carnet de mémoire — sans jamais remplacer les répétitions — Sequenciador réunit sur un même établi la tourne à 360° du batuque, l'écriture multipiste, les toadas et le cahier papier."
          : 'O Maracatu vive na rua, no canto, na escuta e na transmissão direta dos mestres. Pensado como um caderno de memória — sem jamais substituir os ensaios — o Sequenciador reúne na mesma bancada o giro em 360° do batuque, a escrita multipista, as toadas e o caderno de papel.'}
      </p>

      <div className="mt-5 sm:mt-6 flex flex-col items-center w-full max-w-2xl">
        <button
          type="button"
          onClick={onEnterRoda}
          disabled={isBusy}
          className="px-7 sm:px-10 py-3 sm:py-3.5 bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-base sm:text-lg uppercase tracking-wider cordel-wood-shadow flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBusy && <Loader2 className="w-5 h-5 animate-spin shrink-0 stroke-current" />}
          <span>{isFr ? 'ENTRER DANS LA RODA' : 'ENTRAR NA RODA'}</span>
        </button>

        <p className="font-serif italic text-[11px] sm:text-xs text-[var(--cordel-text-muted)] mt-2.5 px-2">
          {isFr
            ? "Accès libre sans inscription • Morceaux vitrine en écoute intégrale & création jusqu'à 30 mesures"
            : 'Acesso livre sem cadastro • Baques de demonstração completos e criação de até 30 compassos'}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-4 w-full">
          <button type="button" onClick={onEnterPractice} disabled={isBusy} className={shortcutCls}>
            <Disc size={14} className="shrink-0 stroke-current" />
            <span>{isFr ? 'Mode Pratique' : 'Modo Prática'}</span>
          </button>

          <button type="button" onClick={onEnterPrintA4} disabled={isBusy} className={shortcutCls}>
            <Printer size={14} className="shrink-0 stroke-current" />
            <span>{isFr ? 'Imprimer une tablature vierge A4' : 'Imprimir tablatura em branco A4'}</span>
          </button>

          <button type="button" onClick={onEnterGuide} disabled={isBusy} className={shortcutCls}>
            <BookOpen size={14} className="shrink-0 stroke-current" />
            <span>{isFr ? "Guide de l'atelier" : 'Guia da oficina'}</span>
          </button>
        </div>
      </div>
    </section>
  );
};
