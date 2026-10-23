import React from 'react';
import { Language, WorkspaceTemplate } from '../../types';
import { useSequencer } from '../../contexts/SequencerContext';
import { XiloScroll } from '../XiloIcons';

interface NewSongMainOptionsProps {
  lang: Language;
  templates: WorkspaceTemplate[];
  onClearSong: () => void;
  onStartWizard: () => void;
  onOpenTemplates: () => void;
}

export const NewSongMainOptions: React.FC<NewSongMainOptionsProps> = ({
  lang,
  templates,
  onClearSong,
  onStartWizard,
  onOpenTemplates,
}) => {
  const sequencer = useSequencer();

  const handleTemplateClick = async () => {
    if (templates.length > 0) {
      onOpenTemplates();
    } else {
      const msg = lang === 'pt'
        ? 'Nenhum modelo salvo ainda. Salve o seu batuque atual clicando em "Memorizar modelo" na régua Master da mesa de mixagem!'
        : 'Aucun gabarit enregistré pour le moment. Sauvegardez votre batuque actuel en cliquant sur "Mémoriser gabarit" sur la tranche Master de la console !';
      if (sequencer.alertAsync) {
        await sequencer.alertAsync(msg);
      }
    }
  };

  return (
    <>
      <div className="border-b-4 border-[#1a1a1a] pb-3 pr-8">
        <h3 className="font-cactus text-3xl md:text-4xl font-bold text-[#1a1a1a] uppercase tracking-wider">
          {lang === 'fr' ? 'Nouveau Morceau' : 'Nova Toada'}
        </h3>
        <p className="text-[#1a1a1a]/70 text-xs md:text-sm mt-1 font-cactus font-bold tracking-wide uppercase">
          {lang === 'fr' ? 'Choisissez comment démarrer votre création dans la Roda' : 'Escolha como iniciar sua criação na Roda'}
        </p>
      </div>

      <div className="text-sm text-[#1a1a1a] leading-relaxed border-2 border-dashed border-[#1a1a1a]/30 p-4 bg-white/30 rounded-sm">
        {lang === 'fr' ? (
          <p>
            Prêt à lancer un nouveau rythme ? Vous pouvez commencer sur une ardoise complètement vierge, vous laisser guider pas à pas par le <strong>Mestre</strong> ou repartir immédiatement d'un de vos <strong>gabarits de batuque</strong> favoris.
          </p>
        ) : (
          <p>
            Pronto para começar um novo ritmo? Você pode começar com uma tela limpa, deixar-se guiar passo a passo pelo <strong>Mestre</strong> ou iniciar diretamente a partir de um dos seus <strong>modelos de batuque</strong> favoritos.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        <button
          onClick={onClearSong}
          className="flex flex-col items-center justify-between p-5 bg-[#f4ecd8] border-3 border-[#1a1a1a] shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer text-center group min-h-[160px]"
        >
          <div className="text-3xl mb-2 group-hover:scale-110 duration-200"></div>
          <div className="font-cactus text-base font-bold text-[#1a1a1a] uppercase tracking-wider">
            {lang === 'fr' ? 'Créer Roda vide' : 'Criar Roda vazia'}
          </div>
          <div className="text-[11px] text-[#1a1a1a]/70 mt-1 leading-snug">
            {lang === 'fr' ? 'Efface tout et commence avec un projet vide.' : 'Apaga tudo e começa com um projet vazio.'}
          </div>
        </button>

        <button
          onClick={onStartWizard}
          className="flex flex-col items-center justify-between p-5 bg-[#8b2a1a] text-[#f4ecd8] border-3 border-[#1a1a1a] shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer text-center group min-h-[160px]"
        >
          <div className="text-3xl mb-2 group-hover:scale-110 duration-200"></div>
          <div className="font-cactus text-base font-bold uppercase tracking-wider">
            {lang === 'fr' ? 'Assistant du Mestre' : 'Assistente do Mestre'}
          </div>
          <div className="text-[11px] text-[#f4ecd8]/80 mt-1 leading-snug">
            {lang === 'fr' ? 'Laisse-toi guider pas à pas par le mestre.' : 'Deixe-se guiar passo a passo pelo mestre.'}
          </div>
        </button>

        <button
          onClick={handleTemplateClick}
          className="flex flex-col items-center justify-between p-5 bg-[#f4ecd8] border-3 border-[#1a1a1a] shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer text-center group min-h-[160px] relative"
        >
          <div className="mb-2 group-hover:scale-110 duration-200 text-[#1a1a1a] flex items-center justify-center">
            <XiloScroll size={34} />
          </div>
          <div className="font-cactus text-base font-bold text-[#1a1a1a] uppercase tracking-wider">
            {lang === 'fr' ? "Partir d'un gabarit" : 'Partir de um modelo'}
          </div>
          <div className="text-[11px] text-[#1a1a1a]/70 mt-1 leading-snug">
            {templates.length > 0
              ? (lang === 'fr' ? 'Utiliser une configuration de batuque sauvegardée.' : 'Usar uma configuração de batuque salva.')
              : (lang === 'fr' ? "Aucun gabarit mémorisé pour l'instant." : 'Nenhum modelo memorizado ainda.')}
          </div>
          {templates.length > 0 && (
            <span className="mt-2 text-[10px] font-cactus font-bold px-2 py-0.5 bg-black text-[#f4ecd8] rounded-full">
              {templates.length} {lang === 'fr' ? (templates.length > 1 ? 'gabarits' : 'gabarit') : (templates.length > 1 ? 'modelos' : 'modelo')}
            </span>
          )}
        </button>
      </div>
    </>
  );
};
