/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Language } from '../../../types';
import { CordelImageEditor } from '../../CordelImageEditor';

interface SignalAddFormProps {
  showAddSignalForm: boolean;
  setShowAddSignalForm: (v: boolean) => void;
  pendingSignalImage: string | null;
  setPendingSignalImage: (v: string | null) => void;
  pendingSignalName: string;
  setPendingSignalName: (v: string) => void;
  rawSignalFrames: string[];
  setRawSignalFrames: (v: string[]) => void;
  onOpenPhotoBooth: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddSignal: () => void;
  lang: Language;
}

export const SignalAddForm: React.FC<SignalAddFormProps> = ({
  showAddSignalForm,
  setShowAddSignalForm,
  pendingSignalImage,
  setPendingSignalImage,
  pendingSignalName,
  setPendingSignalName,
  rawSignalFrames,
  setRawSignalFrames,
  onOpenPhotoBooth,
  onFileChange,
  onAddSignal,
  lang,
}) => {
  if (!pendingSignalImage && rawSignalFrames.length === 0 && !showAddSignalForm) {
    return (
      <button
        onClick={() => setShowAddSignalForm(true)}
        className="w-full py-2 mt-3 bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-cactus font-bold text-xs uppercase tracking-wider cordel-border-sm hover:opacity-90 transition-opacity cursor-pointer"
      >
        ➕ {lang === 'fr' ? 'Nouveau Signal Local' : 'Novo Sinal Local'}
      </button>
    );
  }

  if (!pendingSignalImage && rawSignalFrames.length === 0 && showAddSignalForm) {
    return (
      <div className="flex flex-col gap-2 mt-3 border border-[var(--cordel-border)] border-dashed p-2.5 bg-black/5">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] text-[var(--cordel-text)] font-bold uppercase font-cactus">
            {lang === 'fr' ? 'Créer un Signal Local' : 'Criar um Sinal Local'}
          </span>
          <button
            onClick={() => setShowAddSignalForm(false)}
            className="text-[12px] font-bold text-[var(--cordel-text)] hover:text-red-700 px-2 cursor-pointer"
            title={lang === 'fr' ? 'Fermer' : 'Fechar'}
          >
            ✖
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onOpenPhotoBooth}
            className="py-2 bg-[var(--cordel-wood)] text-white font-cactus font-bold text-xs uppercase tracking-wider cordel-border-sm hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-2"
          >
            📸 {lang === 'fr' ? 'Photo-cabine Musicale (Cadencée)' : 'Cabine de Fotos Musical'}
          </button>
          <div className="flex items-center gap-2">
            <label className="flex-1 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] text-[10px] font-bold cordel-border-sm text-center cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors flex items-center justify-center gap-1">
              📁 {lang === 'fr' ? 'Importer une image fixe' : 'Importar imagem fixa'}
              <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (rawSignalFrames.length > 0) {
    return (
      <CordelImageEditor
        frames={rawSignalFrames}
        lang={lang}
        onComplete={(result) => {
          setPendingSignalImage(result);
          setRawSignalFrames([]);
        }}
        onCancel={() => setRawSignalFrames([])}
      />
    );
  }

  if (pendingSignalImage) {
    return (
      <div className="flex flex-col gap-2 mt-3">
        <img src={pendingSignalImage} alt="preview" className="w-full max-h-24 object-contain bg-black/10 cordel-border-sm" />
        <input
          type="text"
          placeholder={lang === 'fr' ? 'Nom du signal…' : 'Nome do sinal…'}
          value={pendingSignalName}
          onChange={(e) => setPendingSignalName(e.target.value)}
          className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
          onKeyDown={(e) => {
            if (e.key === 'Enter') onAddSignal();
          }}
          autoFocus
        />
        <div className="flex gap-2 mt-1">
          <button
            onClick={onAddSignal}
            disabled={!pendingSignalName.trim()}
            className={`flex-1 py-1 bg-black text-white cordel-border-sm text-[10px] font-bold ${
              !pendingSignalName.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'
            }`}
          >
            {lang === 'fr' ? 'Ajouter' : 'Adicionar'}
          </button>
          <button
            onClick={() => {
              setPendingSignalImage(null);
              setPendingSignalName('');
            }}
            className="py-1 px-3 bg-gray-300 text-black text-[10px] font-bold cordel-border-sm hover:opacity-85 cursor-pointer"
          >
            {lang === 'fr' ? 'Annuler' : 'Cancelar'}
          </button>
        </div>
      </div>
    );
  }

  return null;
};
