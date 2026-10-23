import React from 'react';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

const ShortcutsGuide = lazyWithRetry(
  () => import('../right-sidebar/ShortcutsGuide').then((m) => ({ default: m.ShortcutsGuide })),
  'ShortcutsGuide'
);

interface SettingsHelpTabProps {
  lang: string;
  t: (key: string) => string;
  activeStrokesByInstrument: Record<string, string[]>;
}

export const SettingsHelpTab: React.FC<SettingsHelpTabProps> = ({
  lang,
  t,
  activeStrokesByInstrument,
}) => {
  return (
    <div className="flex flex-col gap-5 text-left">
      <div className="border-2 border-black p-4 bg-white shadow-[3px_3px_0px_#000] flex flex-col gap-4">
        <h3 className="font-cactus font-bold text-sm uppercase mb-1 flex items-center gap-1.5 border-b border-black/10 pb-1">
          {lang === 'fr' ? "Mode d'Emploi de l'Atelier" : 'Manual da Oficina'}
        </h3>
        <p className="text-[10px] opacity-75">
          {lang === 'fr'
            ? "Accédez au guide illustré complet pour apprendre à utiliser les fonctions de la Roda, de la Timeline, de la synthèse vocale et de l'exportation."
            : 'Acesse o guia ilustrado completo para aprender a usar os recursos da Roda, Linha do tempo, sintetizador de voz e exportação.'}
        </p>

        <button
          onClick={() => window.open('/tutorial.html', '_blank')}
          className="w-full px-4 py-3 bg-black text-[#f4ecd8] border-2 border-black font-cactus font-bold uppercase cursor-pointer hover:bg-[#8b2a1a] hover:text-[#f4ecd8] shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-center"
        >
          {lang === 'fr' ? "Ouvrir le Mode d'Emploi" : 'Abrir o Manual'}
        </button>
      </div>

      <div className="border-2 border-black p-4 bg-white shadow-[3px_3px_0px_#000] flex flex-col gap-3 max-h-[45vh] min-h-[30vh]">
        <h3 className="font-cactus font-bold text-sm uppercase mb-1 flex items-center gap-1.5 border-b border-black/10 pb-1">
          {lang === 'fr' ? 'Légende des Frappes Actives' : 'Legenda das Batidas Ativas'}
        </h3>
        <p className="text-[10px] opacity-75 mb-1">
          {lang === 'fr'
            ? 'Voici la liste des raccourcis clavier et notations pour les instruments de la partition courante. Les instruments non programmés sont automatiquement masqués.'
            : 'Esta é a lista de atalhos e notações para os instrumentos do ritmo atual. Instrumentos não programados são ocultados automaticamente.'}
        </p>
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <React.Suspense fallback={<div className="p-4 text-xs font-mono opacity-50">{lang === 'fr' ? 'Chargement...' : 'Carregando...'}</div>}>
            <ShortcutsGuide
              lang={lang}
              t={t}
              activeStrokesByInstrument={activeStrokesByInstrument}
            />
          </React.Suspense>
        </div>
      </div>
    </div>
  );
};
