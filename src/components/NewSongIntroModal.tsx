import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Language, WorkspaceTemplate } from '../types';
import { useWorkspaceTemplateStore } from '../stores/useWorkspaceTemplateStore';
import { instrumentsConfig } from '../data';
import { XiloScroll } from './XiloIcons';

interface NewSongIntroModalProps {
  onClose: () => void;
  onClearSong: () => void;
  onStartWizard: () => void;
  onSelectTemplate?: (template: WorkspaceTemplate) => void;
  lang: Language;
}

export const NewSongIntroModal: React.FC<NewSongIntroModalProps> = ({
  onClose,
  onClearSong,
  onStartWizard,
  onSelectTemplate,
  lang,
}) => {
  const modalRoot = document.getElementById('modal-root') || document.body;
  const [view, setView] = useState<'main' | 'templates'>('main');
  const templates = useWorkspaceTemplateStore((state) => state.templates);

  const content = (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 select-none font-sans"
      onClick={onClose}
    >
      <div 
        className="bg-[#f4ecd8] border-4 border-[#1a1a1a] p-6 md:p-8 max-w-3xl w-full rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col gap-6 relative transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bouton fermer */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-[#1a1a1a] hover:text-[#8b2a1a] font-bold text-2xl hover:scale-110 duration-200 cursor-pointer"
          aria-label={lang === 'fr' ? 'Fermer' : 'Fechar'}
        >
          ✕
        </button>

        {view === 'main' ? (
          <>
            {/* En-tête */}
            <div className="border-b-4 border-[#1a1a1a] pb-3 pr-8">
              <h3 className="font-cactus text-3xl md:text-4xl font-bold text-[#1a1a1a] uppercase tracking-wider">
                {lang === 'fr' ? 'Nouveau Morceau' : 'Nova Toada'}
              </h3>
              <p className="text-[#1a1a1a]/70 text-xs md:text-sm mt-1 font-cactus font-bold tracking-wide uppercase">
                {lang === 'fr' 
                  ? 'Choisissez comment démarrer votre création dans la Roda' 
                  : 'Escolha como iniciar sua criação na Roda'}
              </p>
            </div>

            {/* Description / Introduction */}
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

            {/* Grille de 3 cartes Cordel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              {/* Option 1 : Roda vide */}
              <button
                onClick={onClearSong}
                className="flex flex-col items-center justify-between p-5 bg-[#f4ecd8] border-3 border-[#1a1a1a] shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:scale-[0.98] transition-all cursor-pointer text-center group min-h-[160px]"
              >
                <div className="text-3xl mb-2 group-hover:scale-110 duration-200">🫙</div>
                <div className="font-cactus text-base font-bold text-[#1a1a1a] uppercase tracking-wider">
                  {lang === 'fr' ? 'Créer Roda vide' : 'Criar Roda vazia'}
                </div>
                <div className="text-[11px] text-[#1a1a1a]/70 mt-1 leading-snug">
                  {lang === 'fr' 
                    ? 'Efface tout et commence avec un projet vide.' 
                    : 'Apaga tudo e começa com um projet vazio.'}
                </div>
              </button>

              {/* Option 2 : Assistant du Mestre */}
              <button
                onClick={onStartWizard}
                className="flex flex-col items-center justify-between p-5 bg-[#8b2a1a] text-[#f4ecd8] border-3 border-[#1a1a1a] shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:scale-[0.98] transition-all cursor-pointer text-center group min-h-[160px]"
              >
                <div className="text-3xl mb-2 group-hover:scale-110 duration-200">👑</div>
                <div className="font-cactus text-base font-bold uppercase tracking-wider">
                  {lang === 'fr' ? 'Assistant du Mestre' : 'Assistente do Mestre'}
                </div>
                <div className="text-[11px] text-[#f4ecd8]/80 mt-1 leading-snug">
                  {lang === 'fr' 
                    ? 'Laisse-toi guider pas à pas par le mestre.' 
                    : 'Deixe-se guiar passo a passo pelo mestre.'}
                </div>
              </button>

              {/* Option 3 : Partir d'un gabarit */}
              <button
                onClick={() => {
                  if (templates.length > 0) {
                    setView('templates');
                  } else {
                    alert(
                      lang === 'pt'
                        ? 'Nenhum modelo salvo ainda. Salve o seu batuque atual clicando em "📜 Memorizar modelo" na régua Master da mesa de mixagem!'
                        : 'Aucun gabarit enregistré pour le moment. Sauvegardez votre batuque actuel en cliquant sur "📜 Mémoriser gabarit" sur la tranche Master de la console !'
                    );
                  }
                }}
                className="flex flex-col items-center justify-between p-5 bg-[#f4ecd8] border-3 border-[#1a1a1a] shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:scale-[0.98] transition-all cursor-pointer text-center group min-h-[160px] relative"
              >
                <div className="mb-2 group-hover:scale-110 duration-200 text-[#1a1a1a] flex items-center justify-center">
                  <XiloScroll size={34} />
                </div>
                <div className="font-cactus text-base font-bold text-[#1a1a1a] uppercase tracking-wider">
                  {lang === 'fr' ? "Partir d'un gabarit" : 'Partir de um modelo'}
                </div>
                <div className="text-[11px] text-[#1a1a1a]/70 mt-1 leading-snug">
                  {templates.length > 0
                    ? (lang === 'fr' 
                        ? `Utiliser une configuration de batuque sauvegardée.` 
                        : `Usar uma configuração de batuque salva.`)
                    : (lang === 'fr' 
                        ? 'Aucun gabarit mémorisé pour l\'instant.' 
                        : 'Nenhum modelo memorizado ainda.')}
                </div>
                {templates.length > 0 && (
                  <span className="mt-2 text-[10px] font-cactus font-bold px-2 py-0.5 bg-black text-[#f4ecd8] rounded-full">
                    {templates.length} {lang === 'fr' ? (templates.length > 1 ? 'gabarits' : 'gabarit') : (templates.length > 1 ? 'modelos' : 'modelo')}
                  </span>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Vue Sous-Sélection des Gabarits */}
            <div className="border-b-4 border-[#1a1a1a] pb-3 flex items-center justify-between gap-3 pr-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setView('main')}
                  className="px-3 py-1 bg-white text-[#1a1a1a] border-2 border-black font-cactus font-bold text-xs uppercase shadow-[2px_2px_0px_#000] hover:bg-black hover:text-white cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                >
                  ← {lang === 'pt' ? 'Voltar' : 'Retour'}
                </button>
                <h3 className="font-cactus text-2xl md:text-3xl font-bold text-[#1a1a1a] uppercase tracking-wider flex items-center gap-2">
                  <XiloScroll size={26} className="shrink-0" />
                  <span>{lang === 'fr' ? 'Choisir un Gabarit de Batuque' : 'Escolher um Modelo de Batuque'}</span>
                </h3>
              </div>
              <span className="text-[10px] font-cactus font-bold text-[#1a1a1a]/70 uppercase hidden sm:inline">
                🔒 {lang === 'fr' ? 'Gabarits Privés' : 'Modelos Privados'}
              </span>
            </div>

            <div className="max-h-[55vh] overflow-y-auto pr-1 flex flex-col gap-3 custom-scrollbar">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="border-2 border-black bg-white p-4 shadow-[3px_3px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-[3px_6px_4px_8px]"
                >
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-cactus font-bold text-base text-[#1a1a1a] truncate" title={tpl.name}>
                        {tpl.name}
                      </span>
                      <span className="text-[9px] font-bold font-cactus bg-[#f4ecd8] border border-black/30 px-1.5 py-0.5 rounded shrink-0">
                        {tpl.tracks.length} {lang === 'pt' ? 'faixas' : 'pistes'}
                      </span>
                    </div>

                    {/* Chips instruments */}
                    <div className="flex flex-wrap gap-1 py-1">
                      {tpl.tracks.map((tr, idx) => {
                        const inst = instrumentsConfig[tr.instrumentIdx];
                        const label = tr.customName || (inst ? inst.name : `Track ${idx + 1}`);
                        return (
                          <span
                            key={idx}
                            className="bg-[#f4ecd8] text-[#1a1a1a] border border-black/40 px-1.5 py-0.2 text-[9px] font-cactus font-bold rounded"
                          >
                            {tr.isBusFolder ? `📁 ${label}` : label}
                          </span>
                        );
                      })}
                    </div>

                    {/* Badges options incluses */}
                    <div className="flex flex-wrap gap-1 text-[9px] text-black/60">
                      {tpl.options.includeVolumePan && <span>🎚️ Vol/Pan</span>}
                      {tpl.options.includeEQ && <span>• 🎛️ EQ</span>}
                      {tpl.options.includeFX && <span>• ✨ FX</span>}
                      {tpl.options.includeStructure && <span>• 🗂️ Bus/Liens</span>}
                      {tpl.options.includeDisplayOrder && <span>• 🔄 Roda</span>}
                    </div>
                  </div>

                  {/* Bouton de chargement */}
                  <div className="shrink-0 flex items-center">
                    <button
                      onClick={() => {
                        if (onSelectTemplate) {
                          onSelectTemplate(tpl);
                        }
                      }}
                      className="w-full md:w-auto px-4 py-2 bg-black text-[#f4ecd8] border-2 border-black font-cactus font-bold uppercase text-xs shadow-[2px_2px_0px_#000] hover:bg-[#8b2a1a] cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                    >
                      🚀 {lang === 'fr' ? 'Charger ce gabarit' : 'Carregar este modelo'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(content, modalRoot);
};
