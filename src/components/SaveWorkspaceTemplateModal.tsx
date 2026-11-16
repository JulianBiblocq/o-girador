import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, SlidersHorizontal } from 'lucide-react';
import { usePortalRoot, useWindow } from '../contexts/WindowContext';
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
  const isPt = lang === 'pt';

  const hostWin = useWindow();
  const modalRoot = usePortalRoot();

  useEffect(() => {
    if (isOpen) setActiveTab(templates.length > 0 ? 'load' : 'save');
  }, [isOpen, templates.length]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    hostWin.addEventListener('keydown', onKeyDown);
    return () => hostWin.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, hostWin]);

  if (!isOpen) return null;

  const title = activeTab === 'load'
    ? (isPt ? 'Carregar um gabarito do batuque' : 'Charger un gabarit du batuque')
    : (isPt ? 'Memorizar o gabarito do batuque' : 'Mémoriser le gabarit du batuque');
  const subtitle = activeTab === 'load'
    ? (isPt ? 'Aplica a configuração na música atual sem apagar as notas' : 'Applique la configuration au morceau en cours sans écraser les notes')
    : (isPt ? 'Guarda a configuração de mixagem sem incluir as notas' : 'Enregistre la configuration de mixage sans inclure les notes');

  const tabCls = (active: boolean) =>
    `px-3 py-1 font-cactus font-bold text-xs uppercase border-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
      active
        ? 'border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] shadow-[2px_2px_0px_var(--cordel-shadow-color)]'
        : 'border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:border-[var(--cordel-accent-readable)]'
    }`;

  return createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100020] flex items-center justify-center p-4 select-none font-sans" onClick={onClose}>
      <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border-strong)] p-5 md:p-7 max-w-xl w-full rounded-sm shadow-[8px_8px_0px_var(--cordel-shadow-color)] flex flex-col gap-4 relative transition-colors" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--cordel-text)] hover:text-[var(--cordel-accent-readable)] cursor-pointer p-1 transition-colors"
          aria-label={isPt ? 'Fechar' : 'Fermer'}
        >
          <X size={22} />
        </button>

        <div className="border-b-2 border-[var(--cordel-border-strong)] pb-3 pr-8">
          <div className="flex items-center gap-2 mb-2">
            <button type="button" onClick={() => setActiveTab('load')} className={tabCls(activeTab === 'load')}>
              <SlidersHorizontal size={13} className="shrink-0" />
              <span>{isPt ? 'Carregar gabarito' : 'Charger un gabarit'}</span>
            </button>
            <button type="button" onClick={() => setActiveTab('save')} className={tabCls(activeTab === 'save')}>
              <XiloScroll size={13} className="shrink-0" />
              <span>{isPt ? 'Memorizar gabarito' : 'Mémoriser le gabarit'}</span>
            </button>
          </div>

          <h3 className="font-cactus text-xl md:text-2xl font-bold uppercase tracking-wider text-[var(--cordel-text)]">{title}</h3>
          <p className="text-[var(--cordel-text-muted)] text-xs mt-0.5 font-cactus font-bold tracking-wide uppercase">{subtitle}</p>
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
