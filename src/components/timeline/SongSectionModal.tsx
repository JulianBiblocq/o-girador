/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SongSection, Language } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { saveSectionToCloud } from '../../cloudSections';

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
  const { userProfile } = useAuth();
  const [sectionFormName, setSectionFormName] = useState<string>('');
  const [sectionFormStart, setSectionFormStart] = useState<number | string>(1);
  const [sectionFormEnd, setSectionFormEnd] = useState<number | string>(4);
  const [sectionFormColor, setSectionFormColor] = useState<string>('#f19066');
  const [sectionFormLevel, setSectionFormLevel] = useState<number>(0);
  
  // Nouvel état pour l'enregistrement double-action sur le cloud
  const [saveToCloud, setSaveToCloud] = useState<boolean>(false);
  const [isSavingCloud, setIsSavingCloud] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSaveToCloud(false);
      setIsSavingCloud(false);
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

  // Fonction asynchrone d'extraction et de sauvegarde Firebase
  const handleCloudSave = async (name: string, start: number, end: number) => {
    if (!userProfile) return;
    setIsSavingCloud(true);
    try {
      const numMeasures = end - start + 1;
      const storeState = useSequencerStore.getState();
      const timeSigs = storeState.measureTimeSigs.slice(start, end + 1);
      const vols = storeState.measureVols.slice(start, end + 1);
      const volTransitions = storeState.measureVolTransitions.slice(start, end + 1);
      const signals = storeState.measureSignals.slice(start, end + 1);

      const sectionTracks = storeState.tracks.map(t => {
        const sectionPatterns = t.patterns.map(p => {
          if (!p.measureAssignments) return null;
          const isAssigned = p.measureAssignments.slice(start, end + 1).some(v => v);
          if (!isAssigned) return null;

          // Règle d'audit : ne garder que si le pattern contient des notes actives
          const hasActiveNotes = p.activeSteps.some(step => step !== 0 && step !== "" && step !== null && step !== undefined);
          if (!hasActiveNotes) return null;

          const newAssignments = p.measureAssignments.slice(start, end + 1);
          return { ...p, measureAssignments: newAssignments };
        }).filter(Boolean) as any[];

        return {
          instrumentIdx: t.instrumentIdx,
          isMute: t.isMute,
          isSolo: t.isSolo,
          volumeVal: t.volumeVal,
          reverbVal: t.reverbVal,
          panVal: t.panVal,
          patterns: sectionPatterns
        };
      }).filter(t => t.patterns.length > 0);

      const savedData = {
        numMeasures,
        timeSigs,
        vols,
        volTransitions,
        signals,
        tracks: sectionTracks
      };

      // Envoi sur Firebase dans la collection standard "sections"
      await saveSectionToCloud(
        name,
        savedData,
        userProfile.uid,
        'private', // Visibilité privée par défaut pour les snapshots automatiques
        userProfile.mestreId || undefined
      );
    } catch (err) {
      console.error("Erreur lors de la sauvegarde cloud du snapshot :", err);
      alert(lang === 'fr' ? 'Erreur lors de la sauvegarde Cloud.' : 'Erro ao salvar na Nuvem.');
    } finally {
      setIsSavingCloud(false);
    }
  };

  const handleValidate = async () => {
    if (!sectionFormName.trim()) return;
    let startVal = parseInt(String(sectionFormStart)) || 1;
    startVal = Math.max(1, Math.min(totalMeasures, startVal));
    let endVal = parseInt(String(sectionFormEnd)) || 1;
    endVal = Math.max(startVal, Math.min(totalMeasures, endVal));

    // 1. Action locale (création ou mise à jour de la section dans la timeline)
    if (editingSection) {
      onUpdateSection(editingSection.id, sectionFormName, startVal - 1, endVal - 1, sectionFormColor, sectionFormLevel);
    } else {
      onCreateSection(sectionFormName, startVal - 1, endVal - 1, sectionFormColor, 1, sectionFormLevel);
    }

    // 2. Double action : Sauvegarde sur le Cloud si coché
    if (saveToCloud && userProfile) {
      await handleCloudSave(sectionFormName.trim(), startVal - 1, endVal - 1);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-[460px] bg-[var(--cordel-bg)] text-[var(--cordel-text)] p-5 cordel-border-sm cordel-shadow flex flex-col gap-4">
        <h3 className="font-cactus text-xl font-bold uppercase border-b border-[var(--cordel-border)] pb-2 text-[var(--cordel-text)]">
          {editingSection 
            ? (lang === 'fr' ? 'Modifier la Section' : 'Editar Seção')
            : (lang === 'fr' ? 'Créer une Section' : 'Criar Seção')}
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
            placeholder="Ex: Partie A / Refrain"
            className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] px-3 py-1.5 text-sm font-bold outline-none rounded-none focus:bg-[var(--cordel-border)]/10 text-[var(--cordel-text)]"
            disabled={isSavingCloud}
          />
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
                key={colorOpt.value}
                onClick={() => setSectionFormColor(colorOpt.value)}
                className={`w-7 h-7 rounded-full cursor-pointer cordel-border-sm transition-transform ${
                  sectionFormColor === colorOpt.value ? 'scale-115 ring-2 ring-[var(--cordel-text)]' : 'opacity-85'
                }`}
                style={{ backgroundColor: colorOpt.value }}
                title={colorOpt.label}
                disabled={isSavingCloud}
              />
            ))}
          </div>
        </div>

        {/* Case à cocher : Enregistrer sur le Cloud */}
        {userProfile && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--cordel-border)]/10 select-none">
            <input
              type="checkbox"
              id="save-to-cloud-checkbox"
              checked={saveToCloud}
              onChange={(e) => setSaveToCloud(e.target.checked)}
              className="w-4 h-4 cursor-pointer accent-[#8b2a1a]"
              disabled={isSavingCloud}
            />
            <label 
              htmlFor="save-to-cloud-checkbox" 
              className="text-xs font-bold cursor-pointer text-[var(--cordel-text)] flex items-center gap-1"
            >
              ☁️ {lang === 'fr' ? 'Enregistrer comme Base/Template Global sur le cloud' : 'Salvar como Base/Template Global na nuvem'}
            </label>
          </div>
        )}

        {/* Pied de page et boutons d'action */}
        <div className="flex flex-wrap justify-end gap-2.5 mt-2 border-t border-[var(--cordel-border)]/30 pt-3">
          <div className="flex flex-wrap gap-2.5 mr-auto">
            {editingSection && onSaveCloudSection && !saveToCloud && (
              <button
                onClick={() => {
                  onSaveCloudSection(editingSection);
                  onClose();
                }}
                className="px-3 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[#6b1e11]"
                title={lang === 'fr' ? 'Sauvegarder dans le Cloud' : 'Salvar na Nuvem'}
                disabled={isSavingCloud}
              >
                ☁️ {lang === 'fr' ? 'Sauvegarder' : 'Salvar'}
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
            disabled={isSavingCloud}
          >
            {lang === 'fr' ? 'Annuler' : 'Cancelar'}
          </button>
          <button
            onClick={handleValidate}
            className="px-4 py-1.5 bg-[var(--cordel-wood)] text-[#f4ecd8] border border-[var(--cordel-border)] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] flex items-center gap-1.5"
            disabled={!sectionFormName.trim() || isSavingCloud}
          >
            {isSavingCloud ? (
              <span>...</span>
            ) : (
              <>
                {lang === 'fr' ? 'Valider' : 'Confirmar'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
