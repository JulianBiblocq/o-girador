import React, { useState } from 'react';
import { PresetMetadata, Language, RhythmSignal } from '../../types';
import { CordelImageEditor } from '../CordelImageEditor';
import { MusicalPhotoBoothModal } from '../signals/MusicalPhotoBoothModal';

interface PresetManagerSectionProps {
  metadata: PresetMetadata;
  onMetadataChange: (newMeta: PresetMetadata) => void;
  lang: Language;
  userProfile: any;
}

export const PresetManagerSection: React.FC<PresetManagerSectionProps> = ({
  metadata,
  onMetadataChange,
  lang,
  userProfile,
}) => {
  const [showAddSignalForm, setShowAddSignalForm] = useState(false);
  const [isPhotoBoothOpen, setIsPhotoBoothOpen] = useState(false);
  const [pendingSignalImage, setPendingSignalImage] = useState<string | null>(null);
  const [pendingSignalName, setPendingSignalName] = useState('');
  const [useCordelEffect, setUseCordelEffect] = useState(true);
  const [rawSignalFrames, setRawSignalFrames] = useState<string[]>([]);

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

  const handlePhotoBoothSave = (signalData: {
    name: string;
    image: string;
    frames: string[];
    beatsCount: number;
  }) => {
    const newSignal: RhythmSignal = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: signalData.name,
      image: signalData.image,
      frames: signalData.frames,
      beatsCount: signalData.beatsCount,
      createdAt: Date.now(),
    };
    const prev = metadata.rhythmSignals || [];
    onMetadataChange({ ...metadata, rhythmSignals: [...prev, newSignal] });
  };

  const handleAddLocalSignal = () => {
    if (!pendingSignalImage) return;
    const finalName = pendingSignalName.trim() || (lang === 'fr' ? 'Signal sans nom' : 'Sinal sem nome');

    const newSignal = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: finalName,
      image: pendingSignalImage,
    };
    const prev = metadata.rhythmSignals || [];
    onMetadataChange({ ...metadata, rhythmSignals: [...prev, newSignal] });
    setPendingSignalImage(null);
    setPendingSignalName('');
    setShowAddSignalForm(false);
  };

  const handleDeleteLocalSignal = (id: string) => {
    const updated = (metadata.rhythmSignals || []).filter((s) => s.id !== id);
    onMetadataChange({ ...metadata, rhythmSignals: updated });
  };

  return (
    <div className="xilo-feedback-container flex flex-col gap-2 mt-2">
      <span className="text-[var(--cordel-text)] font-cactus text-sm font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
        📂 {lang === 'fr' ? 'Signes Locaux' : 'Sinais Locais'}
      </span>
      <div className="flex flex-col gap-2">
        <span className="text-[8px] text-[var(--cordel-text)] opacity-60 leading-tight">
          {lang === 'fr'
            ? 'Ces images sont stockées localement dans votre projet.'
            : 'Estas imagens são armazenadas localmente no seu projeto.'}
        </span>

        {/* Galerie des signaux locaux */}
        {(metadata?.rhythmSignals || []).length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-1">
            {(metadata.rhythmSignals || []).map((sig) => (
              <div
                key={sig.id}
                className="relative group bg-[var(--cordel-bg)] cordel-border-sm overflow-hidden flex flex-col items-center justify-center aspect-square border-gray-400"
              >
                {sig.image ? (
                  <img src={sig.image} alt={sig.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-black/5 text-3xl">📢</div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1 flex flex-col text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-bold text-white truncate px-1">{sig.name}</span>
                </div>
                <div className="absolute top-1 left-1 bg-gray-500 text-white text-[8px] font-bold px-1 cordel-border-sm">Local</div>
                <button
                  onClick={() => handleDeleteLocalSignal(sig.id)}
                  className="absolute top-1 right-1 bg-[#8b2a1a] text-white font-bold text-[10px] w-5 h-5 flex items-center justify-center cordel-border-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                  title={lang === 'fr' ? 'Supprimer' : 'Excluir'}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Form Trigger */}
        {!pendingSignalImage && rawSignalFrames.length === 0 && !showAddSignalForm && (
          <button
            onClick={() => setShowAddSignalForm(true)}
            className="w-full py-2 mt-3 bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-cactus font-bold text-xs uppercase tracking-wider cordel-border-sm hover:opacity-90 transition-opacity cursor-pointer"
          >
            ➕ {lang === 'fr' ? 'Nouveau Signal Local' : 'Novo Sinal Local'}
          </button>
        )}

        {/* Add Form */}
        {!pendingSignalImage && rawSignalFrames.length === 0 && showAddSignalForm ? (
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
                onClick={() => {
                  setShowAddSignalForm(false);
                  setIsPhotoBoothOpen(true);
                }}
                className="py-2 bg-[var(--cordel-wood)] text-white font-cactus font-bold text-xs uppercase tracking-wider cordel-border-sm hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-2"
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
                if (e.key === 'Enter') handleAddLocalSignal();
              }}
              autoFocus
            />
            <div className="flex gap-2 mt-1">
              <button
                onClick={handleAddLocalSignal}
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
