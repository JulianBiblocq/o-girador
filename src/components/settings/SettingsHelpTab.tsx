import React from 'react';
import { BookOpen, Keyboard } from 'lucide-react';
import { Language } from '../../types';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { useGuideStore } from '../../stores/useGuideStore';
import { useActiveStrokesByInstrument } from './useActiveStrokesByInstrument';

const ShortcutsGuide = lazyWithRetry(
  () => import('../right-sidebar/ShortcutsGuide').then((m) => ({ default: m.ShortcutsGuide })),
  'ShortcutsGuide'
);

interface SettingsHelpTabProps {
  lang: Language;
  t: (key: string) => string;
  isLeftHanded?: boolean;
}

export const SettingsHelpTab: React.FC<SettingsHelpTabProps> = ({
  lang,
  t,
  isLeftHanded = false,
}) => {
  const activeStrokesByInstrument = useActiveStrokesByInstrument(lang, isLeftHanded);

  return (
    <div className="flex flex-col gap-5 text-left">
      <div className="border-2 border-[var(--cordel-border)] rounded-[3px_6px_4px_8px] p-4 bg-[var(--cordel-surface)] text-[var(--cordel-text)] shadow-[3px_3px_0px_var(--cordel-shadow-color)] flex flex-col gap-3">
        <h3 className="font-cactus font-bold text-sm uppercase text-[var(--cordel-text)] flex items-center gap-2 border-b border-[var(--cordel-border)]/35 pb-1.5">
          <BookOpen size={15} className="text-[var(--cordel-accent-readable)] shrink-0" />
          <span>{lang === 'fr' ? "MANUEL COMPLET DE L'APPLICATION" : 'MANUAL COMPLETO DO APLICATIVO'}</span>
        </h3>
        <p className="text-[11px] text-[var(--cordel-text-muted)] font-semibold">
          {lang === 'fr'
            ? "Accédez au guide illustré complet pour apprendre à utiliser les fonctions de la Roda, de la Timeline, de la synthèse vocale et de l'exportation."
            : 'Acesse o guia ilustrado completo para aprender a usar os recursos da Roda, Linha do tempo, sintetizador de voz e exportação.'}
        </p>

        <button
          type="button"
          onClick={() => {
            useSequencerSettingsStore.getState().setIsSettingsOpen(false);
            useGuideStore.getState().openGuide();
          }}
          className="w-full px-4 py-2.5 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] hover:bg-[var(--cordel-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-xs uppercase cursor-pointer shadow-[2px_2px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-colors text-center"
        >
          {lang === 'fr' ? 'OUVRIR LE MANUEL COMPLET' : 'ABRIR O MANUAL COMPLETO'}
        </button>
      </div>

      <div className="border-2 border-[var(--cordel-border)] rounded-[3px_6px_4px_8px] p-4 bg-[var(--cordel-surface)] text-[var(--cordel-text)] shadow-[3px_3px_0px_var(--cordel-shadow-color)] flex flex-col gap-3 max-h-[50vh] min-h-[30vh]">
        <h3 className="font-cactus font-bold text-sm uppercase text-[var(--cordel-text)] flex items-center gap-2 border-b border-[var(--cordel-border)]/35 pb-1.5">
          <Keyboard size={15} className="text-[var(--cordel-accent-readable)] shrink-0" />
          <span>{lang === 'fr' ? 'Légende des Frappes Actives' : 'Legenda das Batidas Ativas'}</span>
        </h3>
        <p className="text-[11px] text-[var(--cordel-text-muted)] font-semibold">
          {lang === 'fr'
            ? 'Voici la liste des raccourcis clavier et notations pour les instruments de la partition courante. Les instruments non programmés sont automatiquement masqués.'
            : 'Esta é a lista de atalhos e notações para os instrumentos do ritmo atual. Instrumentos não programados são ocultados automaticamente.'}
        </p>
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <React.Suspense
            fallback={
              <div className="p-4 text-xs font-mono text-[var(--cordel-text-muted)]">
                {lang === 'fr' ? 'Chargement...' : 'Carregando...'}
              </div>
            }
          >
            <ShortcutsGuide lang={lang} t={t} activeStrokesByInstrument={activeStrokesByInstrument} />
          </React.Suspense>
        </div>
      </div>
    </div>
  );
};
