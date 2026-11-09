/**
 * LutheriePresetsBar.tsx — Bandeau d'Accords Prédéfinis d'Usine & Sauvegarde de Réglages Personnels
 * pour le Banc « Afinação & Lutherie » (< 125 lignes).
 */
import React, { useState, useEffect } from 'react';
import { Plus, X, Check } from 'lucide-react';
import {
  FACTORY_LUTHERIE_PRESETS, LutheriePreset, LutherieDrumRole,
  loadCustomLutheriePresets, saveCustomLutheriePreset, deleteCustomLutheriePreset,
  syncCustomLutheriePresetsFromCloud, isLutheriePresetMatching,
} from '../../utils/audio/lutheriePresetsStorage';

export interface LutheriePresetsBarProps {
  lang: string;
  currentTunings: Record<LutherieDrumRole, number>;
  currentDecays: Record<LutherieDrumRole, number>;
  onApplyPreset: (preset: LutheriePreset) => void;
}

export const LutheriePresetsBar: React.FC<LutheriePresetsBarProps> = React.memo(({
  lang, currentTunings, currentDecays, onApplyPreset,
}) => {
  const isFr = lang === 'fr';
  const [customPresets, setCustomPresets] = useState<LutheriePreset[]>(() => loadCustomLutheriePresets());
  const [isSaving, setIsSaving] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    let mounted = true;
    syncCustomLutheriePresetsFromCloud().then((merged) => { if (mounted) setCustomPresets(merged); });
    return () => { mounted = false; };
  }, []);

  const handleSaveSubmit = () => {
    if (!newName.trim()) return setIsSaving(false);
    setCustomPresets(saveCustomLutheriePreset(newName, currentTunings, currentDecays));
    setNewName('');
    setIsSaving(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCustomPresets(deleteCustomLutheriePreset(id));
  };

  return (
    <div className="bg-[var(--cordel-surface)] border-2 border-[var(--cordel-text)] p-3 flex flex-col gap-2.5 shadow-[3px_3px_0px_var(--cordel-text)] select-none">
      {/* Ligne 1 : Accords Prédéfinis (Usine) */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <span className="font-cactus font-bold uppercase text-[10px] md:text-xs text-[var(--cordel-text)] shrink-0">
          {isFr ? 'Accords Prédéfinis :' : 'Acordes Predefinidos :'}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {FACTORY_LUTHERIE_PRESETS.map((preset) => {
            const isActive = isLutheriePresetMatching(preset, currentTunings, currentDecays);
            return (
              <button
                key={preset.id} type="button" onClick={() => onApplyPreset(preset)}
                className={`px-2.5 py-1 border-2 border-[var(--cordel-text)] flex flex-col items-start text-left cursor-pointer transition-colors shadow-[2px_2px_0px_var(--cordel-text)] ${
                  isActive ? 'bg-[#8b2a1a] !text-[#f4ecd8] font-bold' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[#8b2a1a] hover:!text-[#f4ecd8]'
                }`}
              >
                <span className="font-cactus font-bold uppercase text-[10px] leading-tight">{isFr ? preset.nameFr : preset.namePt}</span>
                {preset.subtitle && <span className="font-mono text-[9px] opacity-85 leading-tight">{preset.subtitle}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ligne 2 : Mes Réglages (Personnels) */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-t border-dashed border-[var(--cordel-border)] pt-2">
        <span className="font-cactus font-bold uppercase text-[10px] md:text-xs text-[var(--cordel-text)] shrink-0">
          {isFr ? 'Mes Réglages :' : 'Meus Ajustes :'}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {customPresets.map((preset) => {
            const isActive = isLutheriePresetMatching(preset, currentTunings, currentDecays);
            return (
              <div
                key={preset.id} onClick={() => onApplyPreset(preset)}
                className={`px-2 py-1 border-2 border-[var(--cordel-text)] flex items-center gap-1.5 cursor-pointer transition-colors shadow-[2px_2px_0px_var(--cordel-text)] ${
                  isActive ? 'bg-[#8b2a1a] !text-[#f4ecd8] font-bold' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[#8b2a1a] hover:!text-[#f4ecd8]'
                }`}
              >
                <span className="font-cactus font-bold uppercase text-[10px]">{preset.nameFr}</span>
                <button type="button" onClick={(e) => handleDelete(e, preset.id)} title={isFr ? 'Supprimer' : 'Excluir'} className="p-0.5 hover:opacity-75 cursor-pointer">
                  <X size={11} />
                </button>
              </div>
            );
          })}

          {isSaving ? (
            <div className="flex items-center gap-1 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-text)] p-0.5">
              <input
                type="text" autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveSubmit();
                  if (e.key === 'Escape') { setIsSaving(false); setNewName(''); }
                }}
                placeholder={isFr ? 'Nom du réglage...' : 'Nome do ajuste...'}
                className="px-1.5 py-0.5 text-[10px] font-cactus font-bold bg-transparent text-[var(--cordel-text)] outline-none w-32"
              />
              <button type="button" onClick={handleSaveSubmit} className="px-1.5 py-0.5 bg-[#8b2a1a] !text-[#f4ecd8] font-cactus font-bold text-[10px] flex items-center gap-0.5 cursor-pointer">
                <Check size={11} /><span>OK</span>
              </button>
              <button type="button" onClick={() => { setIsSaving(false); setNewName(''); }} className="p-0.5 text-[var(--cordel-text)] cursor-pointer">
                <X size={11} />
              </button>
            </div>
          ) : (
            <button
              type="button" onClick={() => setIsSaving(true)}
              className="px-2.5 py-1 bg-[var(--cordel-text)] hover:bg-[#8b2a1a] text-[var(--cordel-bg)] hover:!text-[#f4ecd8] border-2 border-[var(--cordel-text)] font-cactus font-bold uppercase text-[10px] flex items-center gap-1 cursor-pointer shadow-[2px_2px_0px_var(--cordel-text)] transition-colors"
            >
              <Plus size={12} /><span>{isFr ? 'Sauver ce réglage' : 'Salvar ajuste'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

LutheriePresetsBar.displayName = 'LutheriePresetsBar';
