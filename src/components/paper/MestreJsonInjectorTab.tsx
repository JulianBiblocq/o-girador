/**
 * Onglet 3 : Réserve JSON Mestre, Mémorisation & Injection Directe (< 145 lignes).
 */
import React, { useState } from 'react';
import { PaperPreset } from '../../types/paperWorkshop.types';
import { ALL_PAPER_PRESETS } from '../../utils/paper/paperTranscribedPresets';
import { injectPaperScoreToStore } from '../../utils/paper/injectPaperScoreToStore';
import { notifyToast } from '../../utils/toastHelper';
import { Zap, Upload, Save, Tag } from 'lucide-react';

interface Props {
  canImport: boolean;
  lang: 'fr' | 'pt';
  onSendToTagBuilder?: (preset: PaperPreset) => void;
}

const STORAGE_KEY = 'girador_mestre_custom_paper_presets';

export const MestreJsonInjectorTab: React.FC<Props> = ({ canImport, lang, onSendToTagBuilder }) => {
  const [customPresets, setCustomPresets] = useState<PaperPreset[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const allPresets = [...ALL_PAPER_PRESETS, ...customPresets];
  const [selectedId, setSelectedId] = useState<string>(allPresets[0].id);
  const [jsonText, setJsonText] = useState<string>(() => JSON.stringify(allPresets[0], null, 2));

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const p = allPresets.find((pr) => pr.id === id);
    if (p) setJsonText(JSON.stringify(p, null, 2));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setJsonText(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleSaveToReserve = () => {
    try {
      const preset: PaperPreset = JSON.parse(jsonText);
      const filtered = customPresets.filter((p) => p.id !== preset.id);
      const updated = [...filtered, preset];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setCustomPresets(updated);
      setSelectedId(preset.id);
      notifyToast(lang === 'fr' ? `Partition "${preset.name}" mémorisée dans votre réserve !` : `Partitura memorizada na sua reserva!`, 'success');
    } catch (err: any) {
      notifyToast((lang === 'fr' ? 'JSON invalide : ' : 'JSON inválido : ') + (err?.message || ''), 'error');
    }
  };

  const handleInjectDirect = () => {
    if (!canImport) {
      notifyToast(lang === 'fr' ? 'Accès réservé au Mestre et Administrateurs.' : 'Acesso reservado ao Mestre.', 'error');
      return;
    }
    try {
      injectPaperScoreToStore(JSON.parse(jsonText), undefined, undefined, lang);
    } catch (err: any) {
      notifyToast((lang === 'fr' ? 'JSON invalide : ' : 'JSON inválido : ') + (err?.message || ''), 'error');
    }
  };

  const handleSendToBuilder = () => {
    try { onSendToTagBuilder?.(JSON.parse(jsonText)); } catch (err: any) {
      notifyToast((lang === 'fr' ? 'JSON invalide : ' : 'JSON inválido : ') + (err?.message || ''), 'error');
    }
  };

  return (
    <div className="flex flex-col gap-2.5 font-sans text-xs">
      {/* SÉLECTEUR RAPIDE MESTRE */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-black/5 border border-black/30">
        <div className="flex items-center gap-1.5">
          <span className="font-cactus font-bold uppercase text-[11px] text-[#8b2a1a]">{lang === 'fr' ? 'Réserve du Mestre :' : 'Reserva Mestre :'}</span>
          <select value={selectedId} onChange={(e) => handleSelect(e.target.value)} className="p-1 bg-white border border-black font-cactus font-bold text-xs max-w-[220px]">
            {allPresets.map((p) => (<option key={p.id} value={p.id}>{p.name} ({p.totalMeasures}m)</option>))}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={handleSaveToReserve} className="px-2 py-1 bg-[#8b2a1a] text-[#f4ecd8] border border-black font-cactus font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer shadow-[1px_1px_0px_#000]">
            <Save size={11} /> <span>{lang === 'fr' ? 'Mémoriser dans ma Réserve' : 'Salvar na Reserva'}</span>
          </button>
          <label className="px-2 py-1 bg-white hover:bg-black hover:text-white border border-black font-cactus font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer">
            <Upload size={11} /> <span>{lang === 'fr' ? 'Charger .json' : 'Carregar'}</span>
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* ÉDITEUR JSON */}
      <textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)} rows={9} className="w-full p-2 font-mono text-[10px] bg-white border-2 border-black text-[#1a1a1a] resize-none outline-none focus:bg-stone-50" />

      {/* ACTIONS */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <span className="text-[10px] font-bold text-[#8b2a1a]">{!canImport ? 'Réservé au Mestre / Admin' : 'Mode Mestre Actif'}</span>
        <div className="flex items-center gap-2">
          {onSendToTagBuilder && (
            <button type="button" onClick={handleSendToBuilder} className="py-2 px-3 bg-white text-black border-2 border-black font-cactus font-bold text-xs uppercase flex items-center gap-1.5 shadow-[2px_2px_0px_#000] hover:bg-black hover:text-white cursor-pointer">
              <Tag size={13} /> <span>{lang === 'fr' ? 'Vers Constructeur d\'Étiquettes' : 'Para o Montador'}</span>
            </button>
          )}
          <button type="button" onClick={handleInjectDirect} disabled={!canImport} className="py-2 px-4 bg-[#8b2a1a] disabled:opacity-40 text-[#f4ecd8] border-2 border-black font-cactus font-bold text-xs uppercase flex items-center gap-1.5 shadow-[2px_2px_0px_#000] hover:bg-black cursor-pointer">
            <Zap size={13} /> <span>{lang === 'fr' ? 'Injecter Directement (1-Clic)' : 'Injetar em 1-Clique'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
