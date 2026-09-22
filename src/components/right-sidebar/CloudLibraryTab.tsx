import React, { useState, useRef } from 'react';
import { CloudRhythmSignal, Language } from '../../types';
import { uploadMestreSignal, deleteMestreSignal } from '../../cloudSignals';
import { CordelImageEditor } from '../CordelImageEditor';
import { checkIsAdmin } from '../../contexts/AuthContext';
import { MusicalPhotoBoothModal } from '../signals/MusicalPhotoBoothModal';

interface CloudLibraryTabProps {
  mestreSignals: CloudRhythmSignal[];
  refreshMestreSignals?: () => void;
  userProfile: any;
  lang: Language;
}

export const CloudLibraryTab: React.FC<CloudLibraryTabProps> = ({
  mestreSignals = [],
  refreshMestreSignals,
  userProfile,
  lang,
}) => {
  const [showAddSignalForm, setShowAddSignalForm] = useState(false);
  const [isPhotoBoothOpen, setIsPhotoBoothOpen] = useState(false);
  const [pendingSignalImage, setPendingSignalImage] = useState<string | null>(null);
  const [pendingSignalName, setPendingSignalName] = useState('');
  const [useCordelEffect, setUseCordelEffect] = useState(true);
  const [rawSignalFrames, setRawSignalFrames] = useState<string[]>([]);
  const [isGlobalUpload, setIsGlobalUpload] = useState(false);
  const [isUploadingSignal, setIsUploadingSignal] = useState(false);

  // État Toast & Confirmation Cordel
  interface ToastState {
    type: 'success' | 'error' | 'info';
    message: string;
  }
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const [signalToDelete, setSignalToDelete] = useState<{ id: string; mestreId: string; name: string } | null>(null);
  const [isDeletingSignal, setIsDeletingSignal] = useState(false);

  const showToast = (type: 'success' | 'error' | 'info', message: string, durationMs: number = 4000) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setToast({ type, message });
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, durationMs);
  };

  const compressAndResizeImage = (fileOrBlob: File | Blob, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 500;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
          callback(compressedBase64);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(fileOrBlob);
  };

  const handleSignalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressAndResizeImage(file, (base64) => {
        if (!pendingSignalName) {
          const nameWithoutExt = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
          setPendingSignalName(nameWithoutExt.substring(0, 30));
        }
        if (useCordelEffect) {
          setRawSignalFrames([base64]);
        } else {
          setPendingSignalImage(base64);
        }
      });
    }
    e.target.value = '';
  };

  const handlePhotoBoothSave = async (signalData: {
    name: string;
    image: string;
    frames: string[];
    beatsCount: number;
  }) => {
    setIsUploadingSignal(true);
    const mestreIdToUse = isGlobalUpload ? 'global' : (userProfile?.mestreId || userProfile?.uid);

    if (mestreIdToUse) {
      const result = await uploadMestreSignal(
        mestreIdToUse,
        signalData.name,
        signalData.image,
        signalData.frames,
        signalData.beatsCount
      );
      if (result.success && result.signal) {
        if (refreshMestreSignals) refreshMestreSignals();
        showToast(
          'success',
          lang === 'fr' ? 'Signal Cloud enregistré avec succès !' : 'Sinal Cloud salvo com sucesso!'
        );
      } else {
        const detail = result.error || (lang === 'fr' ? 'Vérifiez vos règles Firebase.' : 'Verifique suas regras do Firebase.');
        showToast(
          'error',
          (lang === 'fr' ? "Erreur lors de l'upload vers le Cloud : " : 'Erro no upload para a nuvem: ') + detail
        );
      }
    } else {
      showToast('error', lang === 'fr' ? 'Erreur : Mestre ID introuvable.' : 'Erro: ID do Mestre não encontrado.');
    }
    setIsUploadingSignal(false);
    setIsPhotoBoothOpen(false);
  };

  const handleAddCloudSignal = async () => {
    if (!pendingSignalImage) return;
    setIsUploadingSignal(true);
    const finalName = pendingSignalName.trim() || (lang === 'fr' ? 'Signal sans nom' : 'Sinal sem nome');
    const mestreIdToUse = isGlobalUpload ? 'global' : (userProfile?.mestreId || userProfile?.uid);

    if (mestreIdToUse) {
      const result = await uploadMestreSignal(mestreIdToUse, finalName, pendingSignalImage);
      if (result.success && result.signal) {
        if (refreshMestreSignals) refreshMestreSignals();
        setPendingSignalImage(null);
        setPendingSignalName('');
        setShowAddSignalForm(false);
        showToast(
          'success',
          lang === 'fr' ? 'Signal Cloud enregistré avec succès !' : 'Sinal Cloud salvo com sucesso!'
        );
      } else {
        const detail = result.error || (lang === 'fr' ? 'Vérifiez vos règles Firebase.' : 'Verifique suas regras do Firebase.');
        showToast(
          'error',
          (lang === 'fr' ? "Erreur lors de l'upload vers le Cloud : " : 'Erro no upload para a nuvem: ') + detail
        );
      }
    } else {
      showToast('error', lang === 'fr' ? 'Erreur : Mestre ID introuvable.' : 'Erro: ID do Mestre não encontrado.');
    }
    setIsUploadingSignal(false);
  };

  const handleConfirmDelete = async () => {
    if (!signalToDelete) return;
    setIsDeletingSignal(true);
    const { id, mestreId, name } = signalToDelete;
    const res = await deleteMestreSignal(id, mestreId);
    setIsDeletingSignal(false);
    setSignalToDelete(null);

    if (res.success) {
      showToast('success', lang === 'fr' ? `Signal "${name}" supprimé.` : `Sinal "${name}" exclu.`);
      if (refreshMestreSignals) refreshMestreSignals();
    } else {
      showToast('error', (lang === 'fr' ? 'Erreur de suppression : ' : 'Erro ao excluir: ') + (res.error || ''));
    }
  };

  const isMestreOrAdmin = userProfile?.role === 'mestre' || userProfile?.role === 'admin';

  return (
    <div className="xilo-feedback-container flex flex-col gap-2 mt-2">
      <span className="text-[var(--cordel-text)] font-cactus text-sm font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
        ☁️ {lang === 'fr' ? 'Signes Cloud (Mestre)' : 'Sinais Cloud (Mestre)'}
      </span>
      <div className="flex flex-col gap-2">
        <span className="text-[8px] text-[var(--cordel-text)] opacity-60 leading-tight">
          {lang === 'fr'
            ? 'Ces images sont partagées sur le serveur Cloud (Offline-First, synchronisées une fois en ligne).'
            : 'Estas imagens são compartilhadas no servidor Cloud (Offline-First, sincronizadas online).'}
        </span>

        {/* Bandeau Toast Notification Cordel */}
        {toast && (
          <div
            role="status"
            className="bg-[#f4ecd8] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[3px_3px_0px_#1a1a1a] p-2.5 flex items-start justify-between gap-2 text-xs font-bold animate-fade-in select-none my-1"
          >
            <div className="flex items-start gap-2 flex-1">
              <span className="text-sm shrink-0">
                {toast.type === 'error' ? '🪵⚠️' : toast.type === 'success' ? '🪵✨' : 'ℹ️'}
              </span>
              <span className="leading-tight font-cactus tracking-wide pt-0.5 break-words">
                {toast.message}
              </span>
            </div>
            <button
              onClick={() => {
                if (toastTimeoutRef.current) {
                  window.clearTimeout(toastTimeoutRef.current);
                  toastTimeoutRef.current = null;
                }
                setToast(null);
              }}
              className="text-sm font-black hover:opacity-75 cursor-pointer leading-none px-1 text-[#1a1a1a]"
              title={lang === 'fr' ? 'Fermer' : 'Fechar'}
            >
              ✕
            </button>
          </div>
        )}

        {/* Confirmation Inline Cordel pour la suppression */}
        {signalToDelete && (
          <div className="bg-[#f4ecd8] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[3px_3px_0px_#1a1a1a] p-3 flex flex-col gap-2 my-1 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-base">🗑️</span>
              <span className="font-cactus text-xs font-bold tracking-wide">
                {lang === 'fr'
                  ? `Supprimer définitivement le signal "${signalToDelete.name}" ?`
                  : `Excluir definitivamente o sinal "${signalToDelete.name}"?`}
              </span>
            </div>
            <div className="flex gap-2 justify-end mt-1">
              <button
                onClick={() => setSignalToDelete(null)}
                disabled={isDeletingSignal}
                className="px-2.5 py-1 bg-white text-[#1a1a1a] border border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] text-[10px] font-bold cursor-pointer hover:bg-gray-100 disabled:opacity-50"
              >
                {lang === 'fr' ? 'Annuler' : 'Cancelar'}
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeletingSignal}
                className="px-2.5 py-1 bg-[#8b2a1a] text-white border border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] text-[10px] font-bold cursor-pointer hover:bg-red-800 disabled:opacity-50 flex items-center gap-1"
              >
                {isDeletingSignal ? '...' : (lang === 'fr' ? 'Supprimer' : 'Excluir')}
              </button>
            </div>
          </div>
        )}

        {/* Galerie des signaux Cloud */}
        {mestreSignals.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-1">
            {mestreSignals.map((sig) => (
              <div
                key={sig.id}
                className="relative group bg-[var(--cordel-bg)] cordel-border-sm overflow-hidden flex flex-col items-center justify-center aspect-square border-[var(--cordel-border)]"
              >
                {sig.imageUrl ? (
                  <img src={sig.imageUrl} alt={sig.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-black/5 text-3xl">📢</div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1 flex flex-col text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-bold text-white truncate px-1">{sig.name}</span>
                </div>
                {sig.mestreId === 'global' && (
                  <div className="absolute top-1 left-1 bg-emerald-600 text-white text-[8px] font-bold px-1 cordel-border-sm">
                    🌍 Global
                  </div>
                )}
                {isMestreOrAdmin && (
                  <button
                    onClick={() => setSignalToDelete({ id: sig.id, mestreId: sig.mestreId, name: sig.name })}
                    className="absolute top-1 right-1 bg-[#8b2a1a] text-white font-bold text-[10px] w-5 h-5 flex items-center justify-center cordel-border-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 cursor-pointer"
                    title={lang === 'fr' ? 'Supprimer' : 'Excluir'}
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Form Trigger (Seulement pour Mestre/Admin) */}
        {isMestreOrAdmin && !pendingSignalImage && rawSignalFrames.length === 0 && !showAddSignalForm && (
          <button
            onClick={() => setShowAddSignalForm(true)}
            className="w-full py-2 mt-3 bg-green-700 text-white font-cactus font-bold text-xs uppercase tracking-wider cordel-border-sm hover:opacity-90 transition-opacity cursor-pointer border-green-800 border"
          >
            ➕ {lang === 'fr' ? 'Nouveau Signal Cloud' : 'Novo Sinal Cloud'}
          </button>
        )}

        {/* Add Form */}
        {isMestreOrAdmin && !pendingSignalImage && rawSignalFrames.length === 0 && showAddSignalForm ? (
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
                onClick={() => {
                  setShowAddSignalForm(false);
                  setIsPhotoBoothOpen(true);
                }}
                className="py-2 bg-emerald-700 text-white font-cactus font-bold text-xs uppercase tracking-wider cordel-border-sm hover:bg-emerald-800 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                📸 {lang === 'fr' ? 'Photo-cabine Musicale (Cadencée)' : 'Cabine de Fotos Musical'}
              </button>
              <div className="flex items-center gap-2">
                <label className="flex-1 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] text-[10px] font-bold cordel-border-sm text-center cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors flex items-center justify-center gap-1">
                  📁 {lang === 'fr' ? 'Importer une image fixe' : 'Importar imagem fixa'}
                  <input type="file" accept="image/*" onChange={handleSignalFileChange} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        ) : rawSignalFrames.length > 0 ? (
          <CordelImageEditor
            frames={rawSignalFrames}
            lang={lang}
            onComplete={(result) => {
              setPendingSignalImage(result);
              setRawSignalFrames([]);
            }}
            onCancel={() => setRawSignalFrames([])}
          />
        ) : pendingSignalImage ? (
          <div className="flex flex-col gap-2 mt-3">
            <img src={pendingSignalImage} alt="preview" className="w-full max-h-24 object-contain bg-black/10 cordel-border-sm" />
            <input
              type="text"
              placeholder={lang === 'fr' ? 'Nom du signal…' : 'Nome do sinal…'}
              value={pendingSignalName}
              onChange={(e) => setPendingSignalName(e.target.value)}
              className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCloudSignal();
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
                  {lang === 'fr' ? '🌍 Rendre public (Catalogue Global)' : '🌍 Tornar público (Catálogo Global)'}
                </span>
              </label>
            )}
            <div className="flex gap-2 mt-1">
              <button
                onClick={handleAddCloudSignal}
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
        ) : null}

        {/* Modale Photo-cabine musicale */}
        <MusicalPhotoBoothModal
          isOpen={isPhotoBoothOpen}
          onClose={() => setIsPhotoBoothOpen(false)}
          onSave={handlePhotoBoothSave}
          lang={lang}
        />
      </div>
    </div>
  );
};
