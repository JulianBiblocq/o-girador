import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
  onOpenPaperScanner?: () => void;
  lang: Language;
}

export const NewSongIntroModal: React.FC<NewSongIntroModalProps> = ({
  onClose,
  onClearSong,
  onStartWizard,
  onSelectTemplate,
  onOpenPaperScanner,
  lang,
}) => {
  const modalRoot = document.getElementById('modal-root') || document.body;
  const [view, setView] = useState<'main' | 'templates'>('main');
  const templates = useWorkspaceTemplateStore((state) => state.templates);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (view === 'templates') setView('main');
        else onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, view]);

  const content = (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100020] flex items-center justify-center p-4 select-none font-sans"
      onClick={onClose}
    >
      <div
        className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border-strong)] p-5 md:p-7 max-w-4xl w-full rounded-sm shadow-[8px_8px_0px_var(--cordel-shadow-color)] flex flex-col gap-5 relative transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-[var(--cordel-text)] hover:text-[var(--cordel-accent-readable)] border-2 border-transparent hover:border-[var(--cordel-border)] cursor-pointer transition-colors"
          aria-label={lang === 'fr' ? 'Fermer' : 'Fechar'}
        >
          <X size={22} strokeWidth={2.5} />
        </button>

        {view === 'main' ? (
          <NewSongMainOptions
            lang={lang}
            templates={templates}
            onClearSong={onClearSong}
            onStartWizard={onStartWizard}
            onOpenTemplates={() => setView('templates')}
            onOpenPaperScanner={onOpenPaperScanner}
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
