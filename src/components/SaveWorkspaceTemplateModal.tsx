/**
 * Modale 2-en-1 « Gabarit du batuque » : Charger & Memoriser (< 115 lignes).
 */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, SlidersHorizontal } from 'lucide-react';
import { Language } from '../types';
import { XiloScroll } from './XiloIcons';
import { useWorkspaceTemplateStore } from '../stores/useWorkspaceTemplateStore';
import { SaveWorkspaceTemplateTab } from './workspace-template/SaveWorkspaceTemplateTab';
import { LoadWorkspaceTemplateTab } from './mixer/LoadWorkspaceTemplateTab';

interface SaveWorkspaceTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const SaveWorkspaceTemplateModal: React.FC<SaveWorkspaceTemplateModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const templates = useWorkspaceTemplateStore((s) => s.templates);
  const [activeTab, setActiveTab] = useState<'load' | 'save'>('load');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(templates.length > 0 ? 'load' : 'save');
    }
  }, [isOpen, templates.length]);

  if (!isOpen) return null;

  const modalRoot = document.getElementById('modal-root') || document.body;

  const title = activeTab === 'load'
    ? (lang === 'pt' ? 'Carregar um gabarito do batuque' : 'Charger un gabarit du batuque')
    : (lang === 'pt' ? 'Memorizar o gabarito do batuque' : 'Mémoriser le gabarit du batuque');

  const subtitle = activeTab === 'load'
    ? (lang === 'pt' ? 'Aplica a configuração na música atual sem apagar as notas' : 'Applique la configuration au morceau en cours sans écraser les notes')
    : (lang === 'pt' ? 'Guarda a configuração de mixagem sem incluir as notas' : 'Enregistre la configuration de mixage sans inclure les notes');

  return createPortal(
    <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[250] flex items-center justify-center p-4 select-none font-sans" onClick={onClose}>
      <div className="bg-[#f4ecd8] border-4 border-[#1a1a1a] p-5 md:p-7 max-w-xl w-full rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col gap-4 relative text-[#1a1a1a] transition-all" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#1a1a1a] hover:text-[#8b2a1a] font-bold hover:scale-110 duration-200 cursor-pointer p-1"
          aria-label={lang === 'fr' ? 'Fermer' : 'Fechar'}
        >
          <X size={22} />
        </button>

        <div className="border-b-4 border-[#1a1a1a] pb-3 pr-8">
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => setActiveTab('load')}
              className={`px-3 py-1 font-cactus font-bold text-xs uppercase border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] cursor-pointer transition-colors flex items-center gap-1.5 ${
                activeTab === 'load' ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-white text-[#1a1a1a] hover:bg-[#1a1a1a]/5'
              }`}
            >
              <SlidersHorizontal size={13} className="shrink-0" />
              <span>{lang === 'pt' ? 'Carregar gabarito' : 'Charger un gabarit'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('save')}
              className={`px-3 py-1 font-cactus font-bold text-xs uppercase border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] cursor-pointer transition-colors flex items-center gap-1.5 ${
                activeTab === 'save' ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-white text-[#1a1a1a] hover:bg-[#1a1a1a]/5'
              }`}
            >
              <XiloScroll size={13} className="shrink-0" />
              <span>{lang === 'pt' ? 'Memorizar gabarito' : 'Mémoriser le gabarit'}</span>
            </button>
          </div>

          <h3 className="font-cactus text-xl md:text-2xl font-bold uppercase tracking-wider flex items-center gap-2 text-[#1a1a1a]">
            <span>{title}</span>
          </h3>
          <p className="text-[#1a1a1a]/70 text-xs mt-0.5 font-cactus font-bold tracking-wide uppercase">
            {subtitle}
          </p>
        </div>

        {activeTab === 'load' ? (
          <LoadWorkspaceTemplateTab lang={lang} onClose={onClose} onSwitchToSave={() => setActiveTab('save')} />
        ) : (
          <SaveWorkspaceTemplateTab lang={lang} onClose={onClose} />
        )}
      </div>
    </div>,
    modalRoot
  );
};
