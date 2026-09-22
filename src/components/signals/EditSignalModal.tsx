/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { CloudRhythmSignal, RhythmSignal } from '../../types';

export interface EditSignalModalProps {
  isOpen: boolean;
  onClose: () => void;
  signal: (CloudRhythmSignal | RhythmSignal) | null;
  onSave: (updated: {
    id: string;
    name: string;
    image?: string;
    frames?: string[];
    beatsCount?: number;
  }) => Promise<void> | void;
  onRetakePhoto?: (targetSignal: CloudRhythmSignal | RhythmSignal) => void;
  lang: 'fr' | 'pt';
  bpm?: number;
}

export const EditSignalModal: React.FC<EditSignalModalProps> = ({
  isOpen,
  onClose,
  signal,
  onSave,
  onRetakePhoto,
  lang,
  bpm = 90,
}) => {
  const [name, setName] = useState('');
  const [activeFrameIdx, setActiveFrameIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [imgError, setImgError] = useState(false);
  const previewTimerRef = useRef<any>(null);

  useEffect(() => {
    if (signal && isOpen) {
      setName(signal.name || '');
      setActiveFrameIdx(0);
      setImgError(false);
    }
  }, [signal, isOpen]);

  // Boucle d'animation au tempo si plusieurs trames existent
  const frames = signal?.frames && signal.frames.length > 0 ? signal.frames : null;

  useEffect(() => {
    if (isOpen && frames && frames.length > 1) {
      const intervalMs = (60 / bpm) * 1000;
      previewTimerRef.current = setInterval(() => {
        setActiveFrameIdx((prev) => (prev + 1) % frames.length);
      }, intervalMs);
      return () => {
        if (previewTimerRef.current) clearInterval(previewTimerRef.current);
      };
    }
  }, [isOpen, frames, bpm]);

  if (!isOpen || !signal) return null;

  const resolvedImage = frames
    ? frames[activeFrameIdx]
    : (signal.image || (signal as any).imageUrl || '');

  const hasValidBase64 = resolvedImage && resolvedImage.startsWith('data:');
  const showSealFallback = imgError || (!hasValidBase64 && !resolvedImage);

  // Initiales du nom pour le sceau Cordel textuel
  const initials = signal.name
    ? signal.name
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0]?.toUpperCase())
        .slice(0, 2)
        .join('')
    : 'SG';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onSave({
        id: signal.id,
        name: name.trim(),
        image: signal.image,
        frames: signal.frames,
        beatsCount: signal.beatsCount,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetake = () => {
    if (onRetakePhoto) {
      onRetakePhoto(signal);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-[310] flex items-center justify-center p-3 select-none font-sans overflow-y-auto">
      <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border)] cordel-shadow max-w-md w-full p-5 flex flex-col gap-4 relative animate-fade-in my-auto">
        
        {/* Bouton de fermeture */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-lg font-bold hover:text-[var(--cordel-wood)] transition-colors cursor-pointer w-7 h-7 flex items-center justify-center border border-[var(--cordel-border)]/30 hover:border-[var(--cordel-border)]"
          title={lang === 'fr' ? 'Fermer' : 'Fechar'}
        >
          ✕
        </button>

        {/* Titre */}
        <div className="border-b-2 border-[var(--cordel-border)] pb-2 pr-8">
          <h2 className="font-cactus text-xl font-bold uppercase tracking-wider text-[var(--cordel-wood)] flex items-center gap-2">
            ✏️ {lang === 'fr' ? 'Édition du Signe du Mestre' : 'Editar Sinal do Mestre'}
          </h2>
          <p className="text-[10px] opacity-70 font-bold font-cactus uppercase mt-0.5">
            {lang === 'fr'
              ? 'Modifiez le nom ou reprenez la prise de vue synchronisée'
              : 'Altere o nome ou capture novamente a postura'}
          </p>
        </div>

        {/* Formulaire de modification */}
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          
          {/* Champ Nom */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-cactus font-bold uppercase opacity-80">
              🏷️ {lang === 'fr' ? 'Nom du signal :' : 'Nome do sinal :'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={lang === 'fr' ? 'Nom du geste...' : 'Nome do gesto...'}
              className="bg-black/5 border-2 border-[var(--cordel-border)] p-2 text-sm font-bold text-[var(--cordel-text)] outline-none focus:bg-white"
              autoFocus
              required
            />
          </div>

          {/* Prévisualisation visuelle */}
          <div className="flex flex-col items-center gap-2 bg-black/5 p-3 border border-[var(--cordel-border)]/30">
            <span className="text-[10px] font-cactus font-bold uppercase opacity-75 self-start">
              🖼️ {lang === 'fr' ? 'Aperçu actuel :' : 'Visualização atual :'}
            </span>

            <div className="relative w-36 h-36 border-3 border-[var(--cordel-border)] bg-black/10 overflow-hidden cordel-shadow flex items-center justify-center">
              {!showSealFallback ? (
                <img
                  src={resolvedImage}
                  alt={signal.name}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#f4ecd8] flex flex-col items-center justify-center p-2 text-center border-2 border-dashed border-[#1a1a1a]/40">
                  <div className="w-12 h-12 rounded-full border-2 border-[#1a1a1a] flex items-center justify-center font-cactus font-bold text-xl text-[var(--cordel-wood)] mb-1 bg-black/5">
                    {initials}
                  </div>
                  <span className="text-[9px] font-cactus font-bold uppercase text-black/70 leading-tight">
                    {lang === 'fr' ? 'Image à renouveler' : 'Imagem a renovar'}
                  </span>
                </div>
              )}

              {/* Indicateur de trame active */}
              {frames && frames.length > 1 && (
                <div className="absolute top-1 left-1 bg-black/80 text-white text-[9px] font-cactus font-bold px-1.5 py-0.5">
                  T{activeFrameIdx + 1} / {frames.length}
                </div>
              )}
            </div>

            {/* Planche-contact si multi-trames */}
            {frames && frames.length > 1 && (
              <div className="flex gap-1.5 mt-1">
                {frames.map((frame, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveFrameIdx(idx)}
                    className={`relative w-9 h-9 border-2 overflow-hidden cursor-pointer transition-all ${
                      activeFrameIdx === idx
                        ? 'border-[var(--cordel-wood)] ring-2 ring-[var(--cordel-wood)] scale-105'
                        : 'border-[var(--cordel-border)]/60 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={frame} alt={`T${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-black/80 text-white text-[7px] text-center font-cactus font-bold">
                      T{idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Information sur le signal */}
            <div className="text-[9px] font-cactus opacity-70 flex gap-3 mt-1">
              <span>🥁 {frames ? `${frames.length} trames (BPM: ${bpm})` : 'Image fixe'}</span>
              {(signal as any).mestreId === 'global' && <span>🌍 Global</span>}
            </div>
          </div>

          {/* Bouton pour reprendre la prise de vue avec la Photo-Cabine */}
          {onRetakePhoto && (
            <button
              type="button"
              onClick={handleRetake}
              className="w-full py-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-[var(--cordel-text)] border-2 border-dashed border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              📷 {lang === 'fr' ? 'Reprendre la prise de vue (Photo-cabine)' : 'Capturar novamente (Cabine de fotos)'}
            </button>
          )}

          {/* Boutons d'action */}
          <div className="flex gap-2 pt-2 border-t border-[var(--cordel-border)]/30">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-black/10 hover:bg-black/20 border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase cursor-pointer"
            >
              {lang === 'fr' ? 'Annuler' : 'Cancelar'}
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="flex-1 py-2 bg-[var(--cordel-wood)] text-white border-2 border-[var(--cordel-border)] shadow-[3px_3px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer font-cactus font-bold text-xs uppercase tracking-wider active:scale-[0.99] transition-all disabled:opacity-50"
            >
              💾 {isSaving ? (lang === 'fr' ? 'Enregistrement...' : 'Salvando...') : (lang === 'fr' ? 'Valider' : 'Salvar')}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
