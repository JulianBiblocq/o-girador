/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SongSection, Language } from '../../types';

interface SongSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSection: SongSection | null;
  totalMeasures: number;
  lang: Language;
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
  onCreateSection,
  onUpdateSection,
  onSaveCloudSection,
  onLoadCloudSection,
}) => {
  const [sectionFormName, setSectionFormName] = useState<string>('');
  const [sectionFormStart, setSectionFormStart] = useState<number | string>(1);
  const [sectionFormEnd, setSectionFormEnd] = useState<number | string>(4);
  const [sectionFormColor, setSectionFormColor] = useState<string>('#f19066');
  const [sectionFormLevel, setSectionFormLevel] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      if (editingSection) {
        setSectionFormName(editingSection.name);
        setSectionFormStart(editingSection.startMeasure + 1);
        setSectionFormEnd(editingSection.endMeasure + 1);
        setSectionFormColor(editingSection.color || '#f19066');
        setSectionFormLevel(editingSection.level || 0);
      } else {
        setSectionFormName(lang === 'fr' ? 'Partie A' : 'Parte A');
        setSectionFormStart(1);
        setSectionFormEnd(Math.min(4, totalMeasures));
        setSectionFormColor('#f19066');
        setSectionFormLevel(0);
      }
    }
  }, [isOpen, editingSection, lang, totalMeasures]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-[460px] bg-[var(--cordel-bg)] text-[var(--cordel-text)] p-5 cordel-border-sm cordel-shadow flex flex-col gap-4">
        <h3 className="font-cactus text-xl font-bold uppercase border-b border-[var(--cordel-border)] pb-2 text-[var(--cordel-text)]">
          {editingSection 
            ? (lang === 'fr' ? 'Modifier la Section' : 'Editar Seção')
            : (lang === 'fr' ? 'Créer une Section' : 'Criar Seção')}
        </h3>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase text-[var(--cordel-text)]">{lang === 'fr' ? 'Nom de la section' : 'Nome da seção'}</label>
          <input
            type="text"
            value={sectionFormName}
            onChange={(e) => setSectionFormName(e.target.value)}
            placeholder="Ex: Partie A / Refrain"
            className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] px-3 py-1.5 text-sm font-bold outline-none rounded-none focus:bg-[var(--cordel-border)]/10 text-[var(--cordel-text)]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase text-[var(--cordel-text)]">{lang === 'fr' ? 'Couleur du bloc' : 'Cor do bloco'}</label>
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

        <div className="flex flex-wrap justify-end gap-2.5 mt-2 border-t border-[var(--cordel-border)]/30 pt-3">
          <div className="flex flex-wrap gap-2.5 mr-auto">
            {editingSection && onSaveCloudSection && (
              <button
                onClick={() => {
                  onSaveCloudSection(editingSection);
                  onClose();
                }}
                className="px-3 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[#6b1e11]"
                title={lang === 'fr' ? 'Sauvegarder dans le Cloud' : 'Salvar na Nuvem'}
              >
                ☁️ {lang === 'fr' ? 'Sauvegarder' : 'Salvar'}
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
          >
            {lang === 'fr' ? 'Annuler' : 'Cancelar'}
          </button>
          <button
            onClick={() => {
              if (!sectionFormName.trim()) return;
              let startVal = parseInt(String(sectionFormStart)) || 1;
              startVal = Math.max(1, Math.min(totalMeasures, startVal));
              let endVal = parseInt(String(sectionFormEnd)) || 1;
              endVal = Math.max(startVal, Math.min(totalMeasures, endVal));
              if (editingSection) {
                onUpdateSection(editingSection.id, sectionFormName, startVal - 1, endVal - 1, sectionFormColor, sectionFormLevel);
              } else {
                onCreateSection(sectionFormName, startVal - 1, endVal - 1, sectionFormColor, 1, sectionFormLevel);
              }
              onClose();
            }}
            className="px-4 py-1.5 bg-[var(--cordel-wood)] text-[#f4ecd8] border border-[var(--cordel-border)] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
          >
            {lang === 'fr' ? 'Valider' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};
