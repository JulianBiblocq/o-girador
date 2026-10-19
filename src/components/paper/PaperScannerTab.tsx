/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Onglet 2 : Scanner Photo & Assemblage de Feuilles (< 145 lignes).
 */
import React, { useState } from 'react';
import { PaperPreset, PaperSequenceItem } from '../../types/paperWorkshop.types';
import { SequenceTagBuilder } from './SequenceTagBuilder';
import { injectPaperScoreToStore } from '../../utils/paper/injectPaperScoreToStore';
import { ALL_PAPER_PRESETS } from '../../utils/paper/paperTranscribedPresets';
import { Camera, Upload, Sparkles, CheckCircle } from 'lucide-react';

interface PaperScannerTabProps {
  canImport: boolean;
  lang: 'fr' | 'pt';
}

export const PaperScannerTab: React.FC<PaperScannerTabProps> = ({ canImport, lang }) => {
  const [selectedPreset, setSelectedPreset] = useState<PaperPreset>(ALL_PAPER_PRESETS[0]);
  const [sequenceItems, setSequenceItems] = useState<PaperSequenceItem[]>(() =>
    ALL_PAPER_PRESETS[0].defaultSequence.map((s, i) => ({ id: `init-${i}`, sectionName: s, repeatCount: 1 }))
  );
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleInject = () => {
    if (!canImport) {
      alert(lang === 'fr'
        ? "L'injection dans le séquenceur est réservée au Mestre et Administrateurs."
        : "A injeção no sequenciador é reservada ao Mestre e Administradores.");
      return;
    }
    const flattenedSequence = sequenceItems.flatMap((item) => Array(item.repeatCount).fill(item.sectionName));
    injectPaperScoreToStore(selectedPreset, flattenedSequence, lang);
  };

  const availableSections = Object.keys(selectedPreset.patterns);

  return (
    <div className="flex flex-col gap-3 font-sans text-xs">
      {/* 1. ZONE DE CAPTURE PHOTO / FICHIER */}
      <div className="p-3 bg-black/5 border-2 border-[var(--cordel-border,#1a1a1a)] flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="px-3 py-1.5 bg-[var(--cordel-wood,#8b2a1a)] text-[#f4ecd8] border-2 border-black font-cactus font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000]">
            <Upload className="w-3.5 h-3.5" />
            <span>{lang === 'fr' ? 'Charger Photo de Partition' : 'Carregar Foto da Partitura'}</span>
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
          </label>
          <span className="text-[10px] text-gray-600 italic">
            {photoPreview ? '📷 Photo chargée (Aide au cadrage active)' : (lang === 'fr' ? 'Prenez en photo votre fiche papier A, B ou C' : 'Tire uma foto da sua folha de papel')}
          </span>
        </div>

        {/* Morceau Modèle associé */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-[10px] uppercase">{lang === 'fr' ? 'Morceau :' : 'Toada :'}</span>
          <select
            value={selectedPreset.id}
            onChange={(e) => {
              const p = ALL_PAPER_PRESETS.find((pr) => pr.id === e.target.value) || ALL_PAPER_PRESETS[0];
              setSelectedPreset(p);
              setSequenceItems(p.defaultSequence.map((s, i) => ({ id: `p-${i}`, sectionName: s, repeatCount: 1 })));
            }}
            className="p-1 bg-white border border-black font-cactus font-bold text-xs"
          >
            {ALL_PAPER_PRESETS.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
        </div>
      </div>

      {/* 2. CONSTRUCTEUR D'ÉTIQUETTES DE SÉQUENCE */}
      <SequenceTagBuilder
        availableSections={availableSections}
        sequenceItems={sequenceItems}
        onChangeSequence={setSequenceItems}
        lang={lang}
      />

      {/* 3. BOUTON D'INJECTION */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-[11px] font-bold text-[#8b2a1a]">
          {!canImport && (lang === 'fr' ? '🔒 Consultation libre. Import réservé au Mestre.' : '🔒 Consulta livre. Importação reservada ao Mestre.')}
        </div>
        <button
          type="button"
          onClick={handleInject}
          disabled={sequenceItems.length === 0}
          className="py-2.5 px-5 bg-[var(--cordel-wood,#8b2a1a)] disabled:opacity-40 text-[#f4ecd8] border-2 border-black font-cactus font-bold text-xs uppercase flex items-center gap-2 shadow-[3px_3px_0px_#000] hover:bg-black transition-colors cursor-pointer"
        >
          <CheckCircle className="w-4 h-4" />
          <span>{lang === 'fr' ? '⚡ Injecter la Partition dans la Roda' : '⚡ Injetar Partitura na Roda'}</span>
        </button>
      </div>
    </div>
  );
};
