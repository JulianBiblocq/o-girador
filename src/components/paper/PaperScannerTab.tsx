/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Onglet 2 : Scanner Photo, Relecture des Motifs & Assemblage (< 145 lignes).
 */
import React, { useState } from 'react';
import { PaperPreset, PaperSequenceItem, PaperStepValue } from '../../types/paperWorkshop.types';
import { SequenceTagBuilder, factorizeSequence } from './SequenceTagBuilder';
import { PaperPatternPreviewGrid } from './PaperPatternPreviewGrid';
import { injectPaperScoreToStore } from '../../utils/paper/injectPaperScoreToStore';
import { ALL_PAPER_PRESETS } from '../../utils/paper/paperTranscribedPresets';
import { Upload, CheckCircle } from 'lucide-react';

interface Props {
  canImport: boolean;
  lang: 'fr' | 'pt';
}

export const PaperScannerTab: React.FC<Props> = ({ canImport, lang }) => {
  const [selectedPreset, setSelectedPreset] = useState<PaperPreset>(ALL_PAPER_PRESETS[0]);
  const [editablePatterns, setEditablePatterns] = useState(() => JSON.parse(JSON.stringify(ALL_PAPER_PRESETS[0].patterns)));
  const [sequenceItems, setSequenceItems] = useState<PaperSequenceItem[]>(() => factorizeSequence(ALL_PAPER_PRESETS[0].defaultSequence));
  // ⚠️ Précision 2 : Par défaut intelligent : vide -> toutes les sections en [ 📌 Morceau uniquement ]
  const [reusableSections, setReusableSections] = useState<Set<string>>(() => new Set());
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handleSelectPreset = (p: PaperPreset) => {
    setSelectedPreset(p);
    setEditablePatterns(JSON.parse(JSON.stringify(p.patterns)));
    setSequenceItems(factorizeSequence(p.defaultSequence));
    setReusableSections(new Set()); // Réinitialisation stricte
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleStepChange = (sec: string, pup: string, idx: number, val: PaperStepValue) => {
    setEditablePatterns((prev: any) => {
      const copy = { ...prev };
      if (!copy[sec]) copy[sec] = {};
      const curSteps = Array.isArray(copy[sec][pup]) ? [...copy[sec][pup]] : Array(16).fill(0);
      curSteps[idx] = val;
      copy[sec][pup] = curSteps;
      return copy;
    });
  };

  const toggleReusable = (secName: string) => {
    setReusableSections((prev) => {
      const next = new Set(prev);
      if (next.has(secName)) next.delete(secName);
      else next.add(secName);
      return next;
    });
  };

  const handleInject = () => {
    if (!canImport) {
      alert(lang === 'fr' ? 'Accès réservé au Mestre et Administrateurs.' : 'Acesso reservado ao Mestre.');
      return;
    }
    const flattenedSequence = sequenceItems.flatMap((item) => Array(item.repeatCount).fill(item.sectionName));
    const finalPreset: PaperPreset = { ...selectedPreset, patterns: editablePatterns };
    injectPaperScoreToStore(finalPreset, flattenedSequence, reusableSections, lang);
  };

  return (
    <div className="flex flex-col gap-2.5 font-sans text-xs">
      {/* 1. CHARGEMENT PHOTO & SÉLECTION DE PARTITION */}
      <div className="p-2.5 bg-black/5 border-2 border-[var(--cordel-border,#1a1a1a)] flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="px-2.5 py-1 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-black font-cactus font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000]">
            <Upload size={12} />
            <span>{lang === 'fr' ? 'Charger Photo' : 'Carregar Foto'}</span>
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
          </label>
          <span className="text-[10px] text-gray-600 italic">
            {photoPreview ? '📷 Photo chargée' : (lang === 'fr' ? 'Prenez en photo votre fiche A, B ou C' : 'Tire uma foto')}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[10px] uppercase">{lang === 'fr' ? 'Modèle :' : 'Modelo :'}</span>
          <select
            value={selectedPreset.id}
            onChange={(e) => {
              const p = ALL_PAPER_PRESETS.find((pr) => pr.id === e.target.value) || ALL_PAPER_PRESETS[0];
              handleSelectPreset(p);
            }}
            className="p-1 bg-white border border-black font-cactus font-bold text-xs"
          >
            {ALL_PAPER_PRESETS.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
        </div>
      </div>

      {/* 2. GRILLE DE RELECTURE DES MOTIFS & SÉLECTION DES SECTIONS */}
      <PaperPatternPreviewGrid
        patterns={editablePatterns}
        reusableSections={reusableSections}
        onToggleReusable={toggleReusable}
        onStepChange={handleStepChange}
        lang={lang}
      />

      {/* 3. CONSTRUCTEUR D'ÉTIQUETTES DE SÉQUENCE */}
      <SequenceTagBuilder
        availableSections={Object.keys(editablePatterns)}
        sequenceItems={sequenceItems}
        onChangeSequence={setSequenceItems}
        lang={lang}
      />

      {/* 4. BOUTON D'INJECTION */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-[10px] font-bold text-[#8b2a1a]">
          {!canImport ? (lang === 'fr' ? '🔒 Import réservé au Mestre.' : '🔒 Importação reservada.') : `⚡ ${sequenceItems.length} bloc(s) prêts`}
        </div>
        <button
          type="button"
          onClick={handleInject}
          disabled={sequenceItems.length === 0}
          className="py-2 px-4 bg-[#8b2a1a] disabled:opacity-40 text-[#f4ecd8] border-2 border-black font-cactus font-bold text-xs uppercase flex items-center gap-1.5 shadow-[2px_2px_0px_#000] hover:bg-black cursor-pointer"
        >
          <CheckCircle size={14} />
          <span>{lang === 'fr' ? '⚡ Injecter dans la Roda' : '⚡ Injetar na Roda'}</span>
        </button>
      </div>
    </div>
  );
};
