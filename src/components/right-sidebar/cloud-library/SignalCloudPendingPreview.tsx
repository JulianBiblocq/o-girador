/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Language } from '../../../types';
import { checkIsAdmin } from '../../../contexts/AuthContext';

interface PendingPreviewProps {
  pendingSignalImage: string;
  setPendingSignalImage: (v: string | null) => void;
  pendingSignalName: string;
  setPendingSignalName: (v: string) => void;
  userProfile: any;
  isGlobalUpload: boolean;
  setIsGlobalUpload: (v: boolean) => void;
  isUploadingSignal: boolean;
  onAddSignal: () => void;
  lang: Language;
}

export const SignalCloudPendingPreview: React.FC<PendingPreviewProps> = ({
  pendingSignalImage,
  setPendingSignalImage,
  pendingSignalName,
  setPendingSignalName,
  userProfile,
  isGlobalUpload,
  setIsGlobalUpload,
  isUploadingSignal,
  onAddSignal,
  lang,
}) => {
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
      {checkIsAdmin(userProfile) && (
        <label className="flex items-center gap-2 cursor-pointer mt-1">
          <input
            type="checkbox"
            checked={isGlobalUpload}
            onChange={(e) => setIsGlobalUpload(e.target.checked)}
            className="accent-emerald-600"
          />
          <span className="text-[10px] font-bold text-[var(--cordel-text)]">
            {lang === 'fr' ? 'Rendre public (Catalogue Global)' : 'Tornar público (Catálogo Global)'}
          </span>
        </label>
      )}
      <div className="flex gap-2 mt-1">
        <button
          onClick={onAddSignal}
          disabled={!pendingSignalName.trim() || isUploadingSignal}
          className={`flex-1 py-1 bg-black text-white cordel-border-sm text-[10px] font-bold ${
            !pendingSignalName.trim() || isUploadingSignal ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'
          }`}
        >
          {isUploadingSignal ? '...' : lang === 'fr' ? 'Ajouter' : 'Adicionar'}
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
};
