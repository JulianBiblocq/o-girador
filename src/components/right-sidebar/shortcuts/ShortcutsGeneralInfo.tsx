
import React from 'react';
import DOMPurify from 'dompurify';
import { MessageSquare } from 'lucide-react';
import { XiloLightning } from '../../XiloIcons';

interface ShortcutsGeneralInfoProps {
  t: (key: string) => string;
  lang: string;
}

export const ShortcutsGeneralInfo: React.FC<ShortcutsGeneralInfoProps> = ({ t, lang }) => {
  return (
    <>
      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
            <XiloLightning size={16} className="shrink-0 text-yellow-500 fill-current" />
            {lang === 'fr' ? 'Entraînement au tempo' : 'Treino de andamento'}
          </span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-2 border-t border-[var(--cordel-border)]/20 text-[10px] text-[var(--cordel-text)] leading-relaxed">
          <p>{lang === 'fr' ? "Démarre une boucle de travail après un décompte au tempo ralenti, puis accélère progressivement par palier (+1, +2 ou +4 BPM) à chaque cycle jusqu'au tempo cible. À l'arrêt, le morceau retrouve immédiatement ses réglages initiaux sans impacter la sauvegarde." : "Inicia um loop de estudo após uma contagem em andamento lento, acelerando progressivamente (+1, +2 ou +4 BPM) a cada ciclo até o andamento alvo. Ao parar, a música restaura imediatamente as configurações originais sem alterar o arquivo salvo."}</p>
        </div>
      </details>

      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
          <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">{t('wavExportTitle')}</span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-2 border-t border-[var(--cordel-border)]/20 text-[11px] text-[var(--cordel-text)] leading-relaxed">
          <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('wavExportDesc')) }} />
        </div>
      </details>

      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
          <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">{t('pwaOfflineTitle')}</span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-2 border-t border-[var(--cordel-border)]/20 text-[11px] text-[var(--cordel-text)] leading-relaxed">
          <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('pwaOfflineDesc')) }} />
        </div>
      </details>

      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
          <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">{t('feedbackTitle')}</span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-3 border-t border-[var(--cordel-border)]/20 text-center">
          <p className="text-[10px] text-[var(--cordel-text)] leading-relaxed mb-2">{lang === 'fr' ? "Une idée, un bug ou un retour ? Venez en discuter sur le forum !" : "Uma ideia, um bug ou feedback? Venha conversar no fórum!"}</p>
          <button onClick={() => window.open('https://github.com/JulianBiblocq/o-girador/issues', '_blank')} className="bg-[var(--cordel-text)] text-[var(--cordel-bg)] hover:bg-[var(--cordel-border)] px-3 py-1.5 text-xs font-bold cordel-border-sm cursor-pointer mx-auto flex items-center gap-1.5 transition-colors">
            <MessageSquare size={13} className="shrink-0" />
            <span>{t('feedbackBtn')}</span>
          </button>
        </div>
      </details>
    </>
  );
};
