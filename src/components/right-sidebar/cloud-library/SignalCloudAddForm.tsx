/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Language } from '../../../types';
import { CordelImageEditor } from '../../CordelImageEditor';
import { SignalCloudPendingPreview } from './SignalCloudPendingPreview';

interface AddFormProps {
  isMestreOrAdmin: boolean;
  userProfile: any;
  showAddSignalForm: boolean;
  setShowAddSignalForm: (v: boolean) => void;
  pendingSignalImage: string | null;
  setPendingSignalImage: (v: string | null) => void;
  pendingSignalName: string;
  setPendingSignalName: (v: string) => void;
  rawSignalFrames: string[];
  setRawSignalFrames: (v: string[]) => void;
  isGlobalUpload: boolean;
  setIsGlobalUpload: (v: boolean) => void;
  isUploadingSignal: boolean;
  onOpenPhotoBooth: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddSignal: () => void;
  lang: Language;
}

export const SignalCloudAddForm: React.FC<AddFormProps> = ({
  isMestreOrAdmin,
  userProfile,
  showAddSignalForm,
  setShowAddSignalForm,
  pendingSignalImage,
  setPendingSignalImage,
  pendingSignalName,
  setPendingSignalName,
  rawSignalFrames,
  setRawSignalFrames,
  isGlobalUpload,
  setIsGlobalUpload,
  isUploadingSignal,
  onOpenPhotoBooth,
  onFileChange,
  onAddSignal,
  lang,
}) => {
  if (!isMestreOrAdmin) return null;

  if (!pendingSignalImage && rawSignalFrames.length === 0 && !showAddSignalForm) {
    return (
      <button
        onClick={() => setShowAddSignalForm(true)}
        className="w-full py-2 mt-3 bg-green-700 text-white font-cactus font-bold text-xs uppercase tracking-wider cordel-border-sm hover:opacity-90 transition-opacity cursor-pointer border-green-800 border"
      >
        ➕ {lang === 'fr' ? 'Nouveau Signal Cloud' : 'Novo Sinal Cloud'}
      </button>
    );
  }

  if (!pendingSignalImage && rawSignalFrames.length === 0 && showAddSignalForm) {
    return (
      <div className="flex flex-col gap-2 mt-3 border border-[var(--cordel-border)] border-dashed p-2.5 bg-black/5">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] text-[var(--cordel-text)] font-bold uppercase font-cactus">
            {lang === 'fr' ? 'Créer un Signal Cloud' : 'Criar um Sinal Cloud'}
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
            className="py-2 bg-emerald-700 text-white font-cactus font-bold text-xs uppercase tracking-wider cordel-border-sm hover:bg-emerald-800 transition-colors cursor-pointer flex items-center justify-center gap-2"
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
      <SignalCloudPendingPreview
        pendingSignalImage={pendingSignalImage}
        setPendingSignalImage={setPendingSignalImage}
        pendingSignalName={pendingSignalName}
        setPendingSignalName={setPendingSignalName}
        userProfile={userProfile}
        isGlobalUpload={isGlobalUpload}
        setIsGlobalUpload={setIsGlobalUpload}
        isUploadingSignal={isUploadingSignal}
        onAddSignal={onAddSignal}
        lang={lang}
      />
    );
  }

  return null;
};
