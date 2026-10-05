/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SongSection, Language } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { saveSectionToCloud } from '../../cloudSections';
import { useAudio } from '../../contexts/AudioContext';

interface SongSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSection: SongSection | null;
  totalMeasures: number;
  lang: Language;
  defaultMeasure?: number;
  onCreateSection: (name: string, start: number, end: number, color: string, repeat?: number, level?: number) => void;
  onUpdateSection: (id: string, name: string, start: number, end: number, color: string, level?: number) => void;
  onSaveCloudSection?: (section: SongSection) => void;
  onLoadCloudSection?: (insertAtMeasure: number) => void;
}

export const SongSectionModal: React.FC<SongSectionModalProps> = ({
  isOpen,
  onClose,
  editingSection,
  totalMeasures,
  lang,
  defaultMeasure = 1,
  onCreateSection,
  onUpdateSection,
  onSaveCloudSection,
  onLoadCloudSection,
}) => {
  const { userProfile } = useAuth();
  const [sectionFormName, setSectionFormName] = useState<string>('');
  const [startM, setStartM] = useState<number>(1);
  const [endM, setEndM] = useState<number>(4);
  const [sectionFormColor, setSectionFormColor] = useState<string>('#f19066');
  const [sectionFormLevel, setSectionFormLevel] = useState<number>(0);
  
  const maxLimit = Math.max(64, totalMeasures);

  useEffect(() => {
    if (isOpen) {
      if (editingSection) {
        const s = editingSection.startMeasure + 1;
        const e = editingSection.endMeasure + 1;
        setSectionFormName(editingSection.name);
        setStartM(s);
        setEndM(e);
        setSectionFormColor(editingSection.color || '#f19066');
        setSectionFormLevel(editingSection.level || 0);
      } else {
        const s = Math.max(1, Math.min(maxLimit, defaultMeasure));
        const e = Math.min(maxLimit, s + 3);
        setSectionFormName(lang === 'fr' ? 'Partie A' : 'Parte A');
        setStartM(s);
        setEndM(e);
        setSectionFormColor('#f19066');
        setSectionFormLevel(0);
      }
    }
  }, [isOpen, editingSection, lang, totalMeasures, defaultMeasure, maxLimit]);

  if (!isOpen) return null;

  // Asservissement dynamique Début / Fin (Anti-inversion)
  const handleStartChange = (valStr: string) => {
    const val = parseInt(valStr, 10);
    if (isNaN(val)) return;
    const clampedStart = Math.max(1, Math.min(maxLimit, val));
    setStartM(clampedStart);
    if (clampedStart > endM) {
      setEndM(clampedStart);
    }
  };

  const handleEndChange = (valStr: string) => {
    const val = parseInt(valStr, 10);
    if (isNaN(val)) return;
    const clampedEnd = Math.max(1, Math.min(maxLimit, val));
    setEndM(clampedEnd);
    if (clampedEnd < startM) {
      setStartM(clampedEnd);
    }
  };

  const handleQuickDuration = (bars: number) => {
    const nextEnd = Math.min(maxLimit, startM + bars - 1);
    setEndM(nextEnd);
  };

  const duration = Math.max(1, endM - startM + 1);

  const handleValidate = async () => {
    if (!sectionFormName.trim()) return;
    const finalStart = Math.max(1, Math.min(maxLimit, startM));
    const finalEnd = Math.max(finalStart, Math.min(maxLimit, endM));

    if (editingSection) {
      onUpdateSection(editingSection.id, sectionFormName, finalStart - 1, finalEnd - 1, sectionFormColor, sectionFormLevel);
    } else {
      onCreateSection(sectionFormName, finalStart - 1, finalEnd - 1, sectionFormColor, 1, sectionFormLevel);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-[460px] bg-[var(--cordel-bg)] text-[var(--cordel-text)] p-5 cordel-border-sm cordel-shadow flex flex-col gap-4">
        {/* Titre dynamique */}
        <h3 className="font-cactus text-lg font-bold uppercase border-b border-[var(--cordel-border)] pb-2 text-[var(--cordel-text)] flex items-center justify-between">
          <span>
            {editingSection 
              ? (lang === 'fr' ? `MODIFIER LA SECTION (M. ${startM} - ${endM})` : `EDITAR SEÇÃO (C. ${startM} - ${endM})`)
              : (lang === 'fr' ? `NOUVELLE SECTION (M. ${startM} - ${endM})` : `NOVA SEÇÃO (C. ${startM} - ${endM})`)}
          </span>
          <button 
            type="button"
            onClick={onClose}
            className="text-xs hover:text-red-500 font-bold cursor-pointer opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </h3>

        {/* Nom */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase text-[var(--cordel-text)]">
            {lang === 'fr' ? 'Nom de la section' : 'Nome da seção'}
          </label>
          <input
            type="text"
            value={sectionFormName}
            onChange={(e) => setSectionFormName(e.target.value)}
            placeholder={lang === 'fr' ? 'Ex: Partie A / Refrain' : 'Ex: Parte A / Refrão'}
            className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] px-3 py-1.5 text-sm font-bold outline-none rounded-none focus:bg-[var(--cordel-border)]/10 text-[var(--cordel-text)]"
            autoFocus
          />
        </div>

        {/* Bloc d'intervalle : Bornes début / fin, durée et raccourcis rapides */}
        <div className="flex flex-col gap-2 p-2.5 bg-[var(--cordel-border)]/10 rounded cordel-border-sm">
          <div className="flex gap-4">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[10px] font-bold uppercase opacity-80 text-[var(--cordel-text)]">
                {lang === 'fr' ? 'Mesure début' : 'Medida inicial'}
              </label>
              <input
                type="number"
                min={1}
                max={endM}
                value={startM}
                onChange={(e) => handleStartChange(e.target.value)}
                className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] px-2 py-1 text-xs font-bold outline-none rounded-none focus:bg-[var(--cordel-border)]/10 text-[var(--cordel-text)] text-center"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[10px] font-bold uppercase opacity-80 text-[var(--cordel-text)]">
                {lang === 'fr' ? 'Mesure fin' : 'Medida final'}
              </label>
              <input
                type="number"
                min={startM}
                max={maxLimit}
                value={endM}
                onChange={(e) => handleEndChange(e.target.value)}
                className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] px-2 py-1 text-xs font-bold outline-none rounded-none focus:bg-[var(--cordel-border)]/10 text-[var(--cordel-text)] text-center"
              />
            </div>
          </div>

          {/* Indicateur de durée et Raccourcis rapides */}
          <div className="flex items-center justify-between pt-1 border-t border-[var(--cordel-border)]/20">
            <span className="text-[10px] font-bold text-[var(--cordel-text)] opacity-90">
              {lang === 'fr' ? `Durée : ${duration} mesure${duration > 1 ? 's' : ''}` : `Duração: ${duration} compasso${duration > 1 ? 's' : ''}`}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => handleQuickDuration(2)}
                className="px-2 py-0.5 text-[9px] font-bold bg-[var(--cordel-bg)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] border border-[var(--cordel-border)] rounded-sm transition-colors cursor-pointer"
              >
                [ 2 mes. ]
              </button>
              <button
                type="button"
                onClick={() => handleQuickDuration(4)}
                className="px-2 py-0.5 text-[9px] font-bold bg-[var(--cordel-bg)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] border border-[var(--cordel-border)] rounded-sm transition-colors cursor-pointer"
              >
                [ 4 mes. ]
              </button>
              <button
                type="button"
                onClick={() => handleQuickDuration(8)}
                className="px-2 py-0.5 text-[9px] font-bold bg-[var(--cordel-bg)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] border border-[var(--cordel-border)] rounded-sm transition-colors cursor-pointer"
              >
                [ 8 mes. ]
              </button>
            </div>
          </div>
        </div>

        {/* Niveau d'imbrication */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase text-[var(--cordel-text)]">
            {lang === 'fr' ? "Niveau d'imbrication" : "Nível de aninhamento"}
          </label>
          <select
            value={sectionFormLevel}
            onChange={(e) => setSectionFormLevel(parseInt(e.target.value, 10))}
            className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] p-1.5 text-xs font-bold text-[var(--cordel-text)] outline-none cursor-pointer"
          >
            <option value={0}>{lang === 'fr' ? 'Niveau 0 (Base)' : 'Nível 0 (Base)'}</option>
            <option value={1}>{lang === 'fr' ? 'Niveau 1 (Groupe)' : 'Nível 1 (Grupo)'}</option>
            <option value={2}>{lang === 'fr' ? 'Niveau 2 (Super-groupe)' : 'Nível 2 (Super-grupo)'}</option>
          </select>
        </div>

        {/* Couleur du bloc */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase text-[var(--cordel-text)]">
            {lang === 'fr' ? 'Couleur du bloc' : 'Cor do bloco'}
          </label>
          <div className="flex flex-wrap gap-2 mt-1">
            {[
              { value: '#e08283', label: 'Rouge' },
              { value: '#f19066', label: 'Orange' },
              { value: '#f5cd79', label: 'Jaune' },
              { value: '#55efc4', label: "Vert d'eau" },
              { value: '#74b9ff', label: 'Bleu pastel' },
              { value: '#a29bfe', label: 'Violet doux' },
              { value: '#eaddcf', label: 'Cordel beige' }
            ].map((colorOpt) => (
              <button
                type="button"
                key={colorOpt.value}
                onClick={() => setSectionFormColor(colorOpt.value)}
                className={`w-7 h-7 rounded-full cursor-pointer cordel-border-sm transition-transform ${
                  sectionFormColor === colorOpt.value ? 'scale-115 ring-2 ring-[var(--cordel-text)]' : 'opacity-85'
                }`}
                style={{ backgroundColor: colorOpt.value }}
                title={colorOpt.label}
              />
            ))}
          </div>
        </div>

        {/* Pied de page et boutons d'action */}
        <div className="flex flex-wrap justify-end gap-2.5 mt-2 border-t border-[var(--cordel-border)]/30 pt-3">
          <div className="flex flex-wrap gap-2.5 mr-auto">
            {editingSection && onSaveCloudSection && (
              <button
                type="button"
                onClick={() => {
                  if (!userProfile) {
                    useSequencerStore.getState().openVisitorAuthModal();
                    return;
                  }
                  onSaveCloudSection(editingSection);
                  onClose();
                }}
                className="px-3 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[#6b1e11]"
                title={!userProfile ? (lang === 'fr' ? 'Connectez-vous pour sauvegarder' : 'Conecte-se para salvar') : (lang === 'fr' ? 'Sauvegarder dans le Cloud' : 'Salvar na Nuvem')}
              >
                ☁️ {lang === 'fr' ? 'Sauvegarder' : 'Salvar'}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
          >
            {lang === 'fr' ? 'Annuler' : 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={handleValidate}
            disabled={!sectionFormName.trim()}
            className="px-4 py-1.5 bg-[var(--cordel-wood)] text-[#f4ecd8] border border-[var(--cordel-border)] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] flex items-center gap-1.5 disabled:opacity-50"
          >
            {editingSection 
              ? (lang === 'fr' ? 'Enregistrer les modifications' : 'Salvar alterações')
              : `➕ ${lang === 'fr' ? 'Créer la section' : 'Criar seção'}`}
          </button>
        </div>
      </div>
    </div>
  );
};
