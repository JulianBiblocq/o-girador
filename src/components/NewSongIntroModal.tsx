import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Language, WorkspaceTemplate } from '../types';
import { useWorkspaceTemplateStore } from '../stores/useWorkspaceTemplateStore';
import { NewSongMainOptions } from './new-song/NewSongMainOptions';
import { NewSongTemplatesView } from './new-song/NewSongTemplatesView';

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
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-[#1a1a1a] hover:text-[#8b2a1a] font-bold text-2xl hover:scale-110 duration-200 cursor-pointer"
          aria-label={lang === 'fr' ? 'Fermer' : 'Fechar'}
        >
          
        </button>

        {view === 'main' ? (
          <NewSongMainOptions
            lang={lang}
            templates={templates}
            onClearSong={onClearSong}
            onStartWizard={onStartWizard}
            onOpenTemplates={() => setView('templates')}
          />
        ) : (
          <NewSongTemplatesView
            lang={lang}
            templates={templates}
            onBack={() => setView('main')}
            onSelectTemplate={onSelectTemplate}
          />
        )}
      </div>
    </div>
  );

  return createPortal(content, modalRoot);
};
