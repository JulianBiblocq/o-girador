import React from 'react';
import { Clipboard } from 'lucide-react';
import { Language } from '../../../types';

interface CopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  copiedJsonText: string;
}

export const CopyModal: React.FC<CopyModalProps> = ({
  isOpen,
  onClose,
  lang,
  copiedJsonText
}) => {
  if (!isOpen) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(copiedJsonText);
    alert(lang === 'fr' ? 'Copié dans le presse-papier !' : 'Copiado para a área de transferência !');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
      <div className="bg-[var(--cordel-bg)] border-4 border-[var(--cordel-border)] shadow-[8px_8px_0_var(--cordel-border)] w-full max-w-2xl p-6 relative flex flex-col gap-4">
        <h3 className="font-cactus text-2xl font-black text-[var(--cordel-wood)]">
          {lang === 'fr' ? 'Exercice JSON Généré !' : 'Exercício JSON Gerado !'}
        </h3>
        
        <p className="text-xs text-[var(--cordel-text)]/70">
          {lang === 'fr'
            ? 'Le téléchargement a été lancé automatiquement. Si ce n\'est pas le cas, copiez le contenu ci-dessous :'
            : 'O download foi iniciado automaticamente. Caso não tenha começado, copie o conteúdo abaixo:'}
        </p>

        <textarea
          readOnly
          value={copiedJsonText}
          className="bg-black/35 text-green-400 font-mono text-[10px] p-3 border-2 border-[var(--cordel-border)]/50 rounded h-64 resize-none overflow-y-auto"
        />

        <div className="flex gap-2 justify-end mt-2">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-4 py-2 border-2 border-[var(--cordel-border)] bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-bold text-xs uppercase cursor-pointer hover:bg-[var(--cordel-bg)] hover:text-[var(--cordel-text)] transition-colors cordel-button"
          >
            <Clipboard className="w-4 h-4" />
            {lang === 'fr' ? 'Copier' : 'Copiar'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-bold text-xs uppercase cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cordel-button"
          >
            {lang === 'fr' ? 'Fermer' : 'Fechar'}
          </button>
        </div>
      </div>
    </div>
  );
};
