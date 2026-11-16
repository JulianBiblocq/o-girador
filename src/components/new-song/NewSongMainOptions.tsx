import React from 'react';
import { ScanLine } from 'lucide-react';
import { Language, WorkspaceTemplate } from '../../types';
import { notifyToast } from '../../utils/toastHelper';
import { XiloRoda, XiloMestre, XiloScroll } from '../XiloIcons';

interface NewSongMainOptionsProps {
  lang: Language;
  templates: WorkspaceTemplate[];
  onClearSong: () => void;
  onStartWizard: () => void;
  onOpenTemplates: () => void;
  onOpenPaperScanner?: () => void;
}

export const NewSongMainOptions: React.FC<NewSongMainOptionsProps> = ({
  lang,
  templates,
  onClearSong,
  onStartWizard,
  onOpenTemplates,
  onOpenPaperScanner,
}) => {
  const isPt = lang === 'pt';

  const handleTemplateClick = () => {
    if (templates.length > 0) {
      onOpenTemplates();
      return;
    }
    notifyToast(
      isPt
        ? 'Nenhum modelo salvo ainda. Use "Memorizar gabarito" na régua Master da mesa de mixagem!'
        : 'Aucun gabarit enregistré. Utilisez « Mémoriser gabarit » sur la tranche Master de la console !',
      'info'
    );
  };

  const baseCardCls =
    'flex flex-col items-center justify-between p-4 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] shadow-[4px_4px_0px_var(--cordel-shadow-color)] hover:border-[var(--cordel-accent-readable)] hover:bg-[var(--cordel-surface-elevated)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-colors cursor-pointer text-center group min-h-[172px] relative';

  return (
    <>
      <div className="border-b-2 border-[var(--cordel-border-strong)] pb-3 pr-8">
        <h3 className="font-cactus text-2xl md:text-3xl font-bold text-[var(--cordel-text)] uppercase tracking-wider">
          {isPt ? 'Nova Toada' : 'Nouveau Morceau'}
        </h3>
        <p className="text-[var(--cordel-text-muted)] text-xs md:text-sm mt-1 font-cactus font-bold tracking-wide uppercase">
          {isPt ? 'Escolha como iniciar sua criação na Roda' : 'Choisissez comment démarrer votre création dans la Roda'}
        </p>
      </div>

      <div className="text-xs md:text-sm text-[var(--cordel-text)] leading-relaxed border-2 border-dashed border-[var(--cordel-border)] p-3.5 bg-[var(--cordel-surface)] rounded-sm">
        {isPt ? (
          <p>Inicie em uma Roda vazia, deixe-se guiar pelo <strong>Assistente do Mestre</strong>, carregue um dos seus <strong>modelos de batuque</strong> ou importe uma <strong>partitura em papel</strong>.</p>
        ) : (
          <p>Partez d'une Roda vierge, laissez-vous guider par l'<strong>Assistant du Mestre</strong>, chargez l'un de vos <strong>gabarits de batuque</strong> ou importez une <strong>partition papier</strong>.</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button type="button" onClick={onClearSong} className={baseCardCls}>
          <div className="mt-1 mb-2 text-[var(--cordel-accent-readable)] group-hover:scale-110 transition-transform"><XiloRoda size={32} /></div>
          <div>
            <div className="font-cactus text-sm font-bold uppercase tracking-wider">{isPt ? 'Criar Roda vazia' : 'Créer Roda vide'}</div>
            <div className="text-[11px] text-[var(--cordel-text-muted)] mt-1 leading-snug">{isPt ? 'Apaga tudo e começa com um projeto limpo.' : 'Efface tout et démarre sur une page blanche.'}</div>
          </div>
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--cordel-text-muted)] mt-2">{isPt ? 'Livre' : 'Libre'}</span>
        </button>

        <button
          type="button"
          onClick={onStartWizard}
          className="flex flex-col items-center justify-between p-4 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] shadow-[4px_4px_0px_var(--cordel-shadow-color)] hover:bg-[var(--cordel-accent)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-colors cursor-pointer text-center group min-h-[172px] relative"
        >
          <div className="mt-1 mb-2 text-[var(--cordel-on-accent)] group-hover:scale-110 transition-transform"><XiloMestre size={32} /></div>
          <div>
            <div className="font-cactus text-sm font-bold uppercase tracking-wider">{isPt ? 'Assistente do Mestre' : 'Assistant du Mestre'}</div>
            <div className="text-[11px] text-[var(--cordel-on-accent)]/85 mt-1 leading-snug">{isPt ? 'Posicione o batuque, escute o balanço e arme a Roda.' : 'Placez le batuque, écoutez le balanço et armez la Roda.'}</div>
          </div>
          <span className="mt-2 text-[9px] font-cactus font-bold uppercase px-2 py-0.5 border border-[var(--cordel-on-accent)]/50 bg-black/20 text-[var(--cordel-on-accent)]">
            {isPt ? 'Guiado • 3 etapas' : 'Guidé • 3 étapes'}
          </span>
        </button>

        <button type="button" onClick={handleTemplateClick} className={baseCardCls}>
          <div className="mt-1 mb-2 text-[var(--cordel-accent-readable)] group-hover:scale-110 transition-transform"><XiloScroll size={32} /></div>
          <div>
            <div className="font-cactus text-sm font-bold uppercase tracking-wider">{isPt ? 'Partir de um modelo' : "Partir d'un gabarit"}</div>
            <div className="text-[11px] text-[var(--cordel-text-muted)] mt-1 leading-snug">
              {templates.length > 0 ? (isPt ? 'Carregar uma configuração de batuque salva.' : 'Utiliser une configuration de batuque mémorisée.') : (isPt ? 'Nenhum modelo memorizado no momento.' : "Aucun gabarit mémorisé pour l'instant.")}
            </div>
          </div>
          <span className="mt-2 text-[9px] font-cactus font-bold uppercase px-2 py-0.5 border border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)]">
            {templates.length} {isPt ? (templates.length > 1 ? 'modelos' : 'modelo') : (templates.length > 1 ? 'gabarits' : 'gabarit')}
          </span>
        </button>

        {onOpenPaperScanner && (
          <button type="button" onClick={onOpenPaperScanner} className={baseCardCls}>
            <div className="mt-1 mb-2 text-[var(--cordel-accent-readable)] group-hover:scale-110 transition-transform"><ScanLine size={30} strokeWidth={2.2} /></div>
            <div>
              <div className="font-cactus text-sm font-bold uppercase tracking-wider">{isPt ? 'Importar Partitura' : 'Importer Partition'}</div>
              <div className="text-[11px] text-[var(--cordel-text-muted)] mt-1 leading-snug">{isPt ? 'Digitalize uma folha manuscrita ou impressa na Oficina.' : "Numérisez une feuille papier dans l'Atelier Papier."}</div>
            </div>
            <span className="mt-2 text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--cordel-accent-readable)]">{isPt ? 'Oficina de Papel' : 'Atelier Papier'}</span>
          </button>
        )}
      </div>
    </>
  );
};
