/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Onglet 3 : Réserve JSON Mestre & Injection Directe (< 145 lignes).
 */
import React, { useState } from 'react';
import { PaperPreset } from '../../types/paperWorkshop.types';
import { ALL_PAPER_PRESETS } from '../../utils/paper/paperTranscribedPresets';
import { injectPaperScoreToStore } from '../../utils/paper/injectPaperScoreToStore';
import { Zap, Upload, Copy, Check } from 'lucide-react';

interface MestreJsonInjectorTabProps {
  canImport: boolean;
  lang: 'fr' | 'pt';
  onSendToTagBuilder?: (preset: PaperPreset) => void;
}

export const MestreJsonInjectorTab: React.FC<MestreJsonInjectorTabProps> = ({
  canImport,
  lang,
  onSendToTagBuilder,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(ALL_PAPER_PRESETS[0].id);
  const [jsonText, setJsonText] = useState<string>(() => JSON.stringify(ALL_PAPER_PRESETS[0], null, 2));

  const handleSelectPreset = (id: string) => {
    setSelectedPresetId(id);
    const p = ALL_PAPER_PRESETS.find((pr) => pr.id === id);
    if (p) setJsonText(JSON.stringify(p, null, 2));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const txt = ev.target?.result as string;
      setJsonText(txt);
    };
    reader.readAsText(file);
  };

  const handleInjectDirect = () => {
    if (!canImport) {
      alert(lang === 'fr' ? 'Accès réservé au Mestre et Administrateurs.' : 'Acesso reservado ao Mestre.');
      return;
    }
    try {
      const preset: PaperPreset = JSON.parse(jsonText);
      injectPaperScoreToStore(preset, undefined, lang);
    } catch (err: any) {
      alert((lang === 'fr' ? 'JSON invalide : ' : 'JSON inválido : ') + (err?.message || ''));
    }
  };

  const handleSendToBuilder = () => {
    try {
      const preset: PaperPreset = JSON.parse(jsonText);
      onSendToTagBuilder?.(preset);
    } catch (err: any) {
      alert((lang === 'fr' ? 'JSON invalide : ' : 'JSON inválido : ') + (err?.message || ''));
    }
  };

  return (
    <div className="flex flex-col gap-3 font-sans text-xs">
      {/* SÉLECTEUR RAPIDE MESTRE */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-black/5 border border-black/30">
        <div className="flex items-center gap-2">
          <span className="font-cactus font-bold uppercase text-[11px] text-[var(--cordel-wood,#8b2a1a)]">
            {lang === 'fr' ? '4 Presets Historiques Mestre :' : '4 Presets Históricos Mestre :'}
          </span>
          <select
            value={selectedPresetId}
            onChange={(e) => handleSelectPreset(e.target.value)}
            className="p-1 bg-white border border-black font-cactus font-bold text-xs"
          >
            {ALL_PAPER_PRESETS.map((p) => (<option key={p.id} value={p.id}>{p.name} ({p.totalMeasures}m)</option>))}
          </select>
        </div>

        <label className="px-2.5 py-1 bg-white hover:bg-black hover:text-white border border-black font-cactus font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer transition-colors">
          <Upload className="w-3 h-3" />
          <span>{lang === 'fr' ? 'Charger .json' : 'Carregar .json'}</span>
          <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {/* ÉDITEUR JSON */}
      <div className="flex flex-col gap-1">
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={10}
          className="w-full p-2 font-mono text-[10px] bg-white border-2 border-black text-[#1a1a1a] resize-none outline-none focus:bg-stone-50"
          placeholder='{"name": "...", "patterns": {...}}'
        />
      </div>

      {/* BOUTONS D'ACTION */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <span className="text-[10px] font-bold text-[#8b2a1a]">
          {!canImport ? '🔒 Réservé au Mestre / Admin' : '⚡ Mode Mestre Actif'}
        </span>
        <div className="flex items-center gap-2">
          {onSendToTagBuilder && (
            <button
              type="button"
              onClick={handleSendToBuilder}
              className="py-2 px-3 bg-white text-black border-2 border-black font-cactus font-bold text-xs uppercase flex items-center gap-1.5 shadow-[2px_2px_0px_#000] hover:bg-black hover:text-white cursor-pointer transition-colors"
            >
              🏷️ {lang === 'fr' ? 'Vers Constructeur d\'Étiquettes' : 'Para o Montador'}
            </button>
          )}
          <button
            type="button"
            onClick={handleInjectDirect}
            disabled={!canImport}
            className="py-2 px-4 bg-[var(--cordel-wood,#8b2a1a)] disabled:opacity-40 text-[#f4ecd8] border-2 border-black font-cactus font-bold text-xs uppercase flex items-center gap-1.5 shadow-[2px_2px_0px_#000] hover:bg-black cursor-pointer transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{lang === 'fr' ? 'Injecter Directement (1-Clic)' : 'Injetar em 1-Clique'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
