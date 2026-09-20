/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Language, PresetMetadata } from '../types';

interface DescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: PresetMetadata;
  onSaveDescription: (data: { descriptionPt: string; descriptionFr: string }) => void;
  lang: Language;
  isPlaying: boolean;
}

export const DescriptionModal: React.FC<DescriptionModalProps> = ({
  isOpen,
  onClose,
  metadata,
  onSaveDescription,
  lang,
  isPlaying,
}) => {
  // Active text tab in the modal: 'pt' or 'fr' (initialized with the application's global language)
  const [activeTextLang, setActiveTextLang] = useState<'pt' | 'fr'>(lang === 'fr' ? 'fr' : 'pt');
  const [isEditing, setIsEditing] = useState(false);

  // Local state for descriptions to prevent store thrashing until explicitly saved
  const [localDescriptionPt, setLocalDescriptionPt] = useState<string>('');
  const [localDescriptionFr, setLocalDescriptionFr] = useState<string>('');

  // Synchronize local states when modal opens or metadata changes
  useEffect(() => {
    if (isOpen) {
      setActiveTextLang(lang === 'fr' ? 'fr' : 'pt');
      setIsEditing(false);
      setLocalDescriptionPt(metadata.descriptionPt || metadata.description || '');
      setLocalDescriptionFr(metadata.descriptionFr || '');
    }
  }, [isOpen, metadata, lang]);

  // If music starts playing while in edit mode, exit edit mode safely to preserve audio thread
  useEffect(() => {
    if (isPlaying && isEditing) {
      setIsEditing(false);
    }
  }, [isPlaying, isEditing]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          // Revert and exit edit mode
          setLocalDescriptionPt(metadata.descriptionPt || metadata.description || '');
          setLocalDescriptionFr(metadata.descriptionFr || '');
          setIsEditing(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEditing, metadata, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveDescription({
      descriptionPt: localDescriptionPt.trim(),
      descriptionFr: localDescriptionFr.trim(),
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setLocalDescriptionPt(metadata.descriptionPt || metadata.description || '');
    setLocalDescriptionFr(metadata.descriptionFr || '');
    setIsEditing(false);
  };

  const currentDisplayText = activeTextLang === 'pt' ? localDescriptionPt : localDescriptionFr;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#f4ecd8] border-4 border-[#1a1a1a] shadow-[6px_6px_0px_rgba(0,0,0,1)] rounded-[2px_6px_3px_5px] max-w-2xl w-full flex flex-col max-h-[90vh] relative text-[#1a1a1a] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onKeyUp={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b-3 border-[#1a1a1a] bg-[#ebe2cb] flex flex-col gap-2 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[10px] sm:text-xs uppercase font-cactus font-bold tracking-wider text-[#8b2a1a]">
                📖 {lang === 'fr' ? 'Histoire & Contexte' : 'História & Contexto'}
              </span>
              <h2 className="font-cactus font-bold text-lg sm:text-2xl uppercase tracking-wide truncate leading-tight text-[#1a1a1a]">
                {metadata.toada || (lang === 'fr' ? 'Toada sem título' : 'Toada sem título')}
              </h2>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-[#1a1a1a] hover:text-[#8b2a1a] hover:bg-[#1a1a1a]/10 w-8 h-8 flex items-center justify-center font-bold text-xl border-2 border-[#1a1a1a] rounded-[3px] transition-colors shrink-0 cursor-pointer shadow-[2px_2px_0px_#1a1a1a]"
              title={lang === 'fr' ? 'Fermer (Échap)' : 'Fechar (Esc)'}
            >
              ✕
            </button>
          </div>

          {/* Context badges (Nação, Compositor, Ritmo) */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
            {metadata.nacao && (
              <span className="px-2 py-0.5 bg-[#fcf9f2] border border-[#1a1a1a] rounded-xs shadow-[1px_1px_0px_#1a1a1a]">
                🏛️ {metadata.nacao}
              </span>
            )}
            {metadata.compositor && (
              <span className="px-2 py-0.5 bg-[#fcf9f2] border border-[#1a1a1a] rounded-xs shadow-[1px_1px_0px_#1a1a1a]">
                👤 {metadata.compositor}
              </span>
            )}
            {metadata.ritmo && (
              <span className="px-2 py-0.5 bg-[#fcf9f2] border border-[#1a1a1a] rounded-xs shadow-[1px_1px_0px_#1a1a1a]">
                🥁 {metadata.ritmo}
              </span>
            )}
          </div>

          {/* Language Tabs & Edit Action Bar */}
          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[#1a1a1a]/20">
            {/* Language switch tabs */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTextLang('pt')}
                className={`px-3 py-1 text-xs font-cactus font-bold uppercase transition-all cursor-pointer rounded-xs ${
                  activeTextLang === 'pt'
                    ? 'bg-[#1a1a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_rgba(0,0,0,0.3)]'
                    : 'bg-[#fcf9f2] text-[#1a1a1a] border-2 border-[#1a1a1a]/40 hover:border-[#1a1a1a]'
                }`}
              >
                🇧🇷 Português
              </button>
              <button
                type="button"
                onClick={() => setActiveTextLang('fr')}
                className={`px-3 py-1 text-xs font-cactus font-bold uppercase transition-all cursor-pointer rounded-xs ${
                  activeTextLang === 'fr'
                    ? 'bg-[#1a1a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_rgba(0,0,0,0.3)]'
                    : 'bg-[#fcf9f2] text-[#1a1a1a] border-2 border-[#1a1a1a]/40 hover:border-[#1a1a1a]'
                }`}
              >
                🇫🇷 Français
              </button>
            </div>

            {/* Edit / Read Mode toggle button */}
            {!isEditing ? (
              <button
                type="button"
                disabled={isPlaying}
                onClick={() => setIsEditing(true)}
                title={
                  isPlaying
                    ? (lang === 'fr' ? 'Mettre en pause pour éditer' : 'Pausar para editar')
                    : (lang === 'fr' ? 'Modifier le texte' : 'Editar texto')
                }
                className={`px-3 py-1 text-xs font-cactus font-bold uppercase border-2 transition-all flex items-center gap-1.5 rounded-xs ${
                  isPlaying
                    ? 'bg-[#1a1a1a]/10 text-[#1a1a1a]/40 border-[#1a1a1a]/20 cursor-not-allowed'
                    : 'bg-[#8b2a1a] hover:bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a] cursor-pointer shadow-[2px_2px_0px_#1a1a1a]'
                }`}
              >
                ✏️ {lang === 'fr' ? 'Modifier' : 'Editar'}
              </button>
            ) : (
              <span className="text-[11px] font-bold text-[#8b2a1a] uppercase font-cactus">
                ✍️ {lang === 'fr' ? 'Mode Édition' : 'Modo Edição'}
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-grow custom-scrollbar min-h-[220px] max-h-[60vh]">
          {isEditing ? (
            <div className="flex flex-col gap-2 h-full">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#1a1a1a]/80 font-cactus">
                {activeTextLang === 'pt'
                  ? 'Texto em Português :'
                  : 'Texte en Français :'}
              </label>
              <textarea
                value={activeTextLang === 'pt' ? localDescriptionPt : localDescriptionFr}
                onChange={(e) => {
                  if (activeTextLang === 'pt') {
                    setLocalDescriptionPt(e.target.value);
                  } else {
                    setLocalDescriptionFr(e.target.value);
                  }
                }}
                placeholder={
                  activeTextLang === 'pt'
                    ? 'Conte a história do ritmo, a toada, os mestres, curiosidades...'
                    : 'Racontez l\'histoire du rythme, de la toada, des mestres, anecdotes...'
                }
                rows={12}
                className="xilo-textarea w-full p-3.5 text-sm sm:text-base leading-relaxed resize-y font-sans min-h-[200px]"
                autoFocus
              />
            </div>
          ) : (
            <div className="bg-[#fcf9f2] border-2 border-[#1a1a1a] p-4 sm:p-6 rounded-[2px_4px_3px_5px] shadow-inner min-h-[180px]">
              {currentDisplayText ? (
                <div className="whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed text-[#1a1a1a] select-text">
                  {currentDisplayText}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-2 text-[#1a1a1a]/50">
                  <span className="text-3xl">📜</span>
                  <span className="italic text-xs sm:text-sm font-bold">
                    {lang === 'fr'
                      ? 'Aucune traduction disponible dans cette langue.'
                      : 'Sem tradução disponível neste idioma.'}
                  </span>
                  {!isPlaying && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="mt-2 text-xs font-cactus font-bold text-[#8b2a1a] hover:underline uppercase cursor-pointer"
                    >
                      + {lang === 'fr' ? 'Rédiger une histoire' : 'Escrever uma história'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-3 sm:p-4 border-t-3 border-[#1a1a1a] bg-[#ebe2cb] flex items-center justify-between gap-3 shrink-0">
          <div className="text-[10px] text-[#1a1a1a]/60 font-bold">
            {isEditing && (
              <span>
                💡 {lang === 'fr' ? 'Les modifications ne s\'appliquent qu\'au clic sur Enregistrer.' : 'As alterações só são salvas ao clicar em Salvar.'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 bg-[#fcf9f2] hover:bg-[#1a1a1a]/10 text-[#1a1a1a] border-2 border-[#1a1a1a] font-cactus font-bold text-xs uppercase cursor-pointer transition-colors shadow-[2px_2px_0px_#1a1a1a]"
                >
                  {lang === 'fr' ? 'Annuler' : 'Cancelar'}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-1.5 bg-[#1a1a1a] hover:bg-[#8b2a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] font-cactus font-bold text-xs uppercase cursor-pointer transition-colors shadow-[2px_2px_0px_#8b2a1a]"
                >
                  💾 {lang === 'fr' ? 'Enregistrer' : 'Salvar'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-[#1a1a1a] hover:bg-[#8b2a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] font-cactus font-bold text-xs uppercase cursor-pointer transition-colors shadow-[2px_2px_0px_#8b2a1a]"
              >
                {lang === 'fr' ? 'Fermer' : 'Fechar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
