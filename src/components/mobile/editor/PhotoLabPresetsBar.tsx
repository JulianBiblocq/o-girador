/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Bandeau compact de profils de réglages sauvegardés pour le Labo Photo (< 115 lignes).
 */

import React, { useState, useEffect } from 'react';
import { BookmarkPlus, RotateCcw, Check, X, Sliders } from 'lucide-react';
import { CordelOptions, defaultCordelOptions } from '../../../utils/cordelEffect';
import { SavedPhotoLabPreset, STORAGE_KEY_PRESETS } from '../../../store/usePhotoLabDraftStore';
import { tMobile } from '../../../i18n/mobileTranslations';

interface Props {
  currentOptions: CordelOptions;
  onApplyOptions: (options: CordelOptions) => void;
  lang: 'fr' | 'pt';
}

export const PhotoLabPresetsBar: React.FC<Props> = ({ currentOptions, onApplyOptions, lang }) => {
  const [presets, setPresets] = useState<SavedPhotoLabPreset[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PRESETS);
      if (saved) setPresets(JSON.parse(saved));
    } catch (_) {}
  }, []);

  const persistPresets = (next: SavedPhotoLabPreset[]) => {
    setPresets(next);
    try { localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(next)); } catch (_) {}
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    const newPreset: SavedPhotoLabPreset = { id: Date.now().toString(), name: trimmed, options: { ...currentOptions } };
    persistPresets([...presets, newPreset]);
    setNameInput('');
    setIsAdding(false);
  };

  const handleDelete = (id: string, ev: React.MouseEvent) => {
    ev.stopPropagation();
    persistPresets(presets.filter((p) => p.id !== id));
  };

  return (
    <div className="bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-border)] p-1.5 flex flex-col gap-1.5 text-xs font-mono select-none">
      <div className="flex items-center justify-between gap-1 flex-wrap">
        {isAdding ? (
          <form onSubmit={handleSave} className="flex items-center gap-1 flex-1">
            <input
              type="text" autoFocus value={nameInput} onChange={(e) => setNameInput(e.target.value)}
              placeholder={tMobile(lang, 'presetNamePlaceholder')}
              className="flex-1 min-w-[120px] px-1.5 py-0.5 text-[11px] bg-[var(--cordel-bg)] border border-[var(--cordel-border)] text-[var(--cordel-text)] font-sans"
            />
            <button type="submit" className="p-1 bg-[#15803d] text-white border border-[var(--cordel-border)] cursor-pointer" title="OK">
              <Check size={12} />
            </button>
            <button type="button" onClick={() => setIsAdding(false)} className="p-1 bg-black/10 border border-[var(--cordel-border)] cursor-pointer" title="Annuler">
              <X size={12} />
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-1 flex-wrap flex-1">
            <button
              type="button" onClick={() => setIsAdding(true)}
              className="px-2 py-0.5 bg-[var(--cordel-card-btn-bg)] hover:bg-[#8b2a1a] hover:text-white text-[var(--cordel-card-btn-text)] border border-[var(--cordel-border)] font-cactus font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer transition-colors"
            >
              <BookmarkPlus size={11} />
              <span>{tMobile(lang, 'saveCurrentPreset')}</span>
            </button>
            <button
              type="button" onClick={() => onApplyOptions({ ...defaultCordelOptions })}
              className="px-1.5 py-0.5 bg-black/5 hover:bg-black/10 text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 font-cactus font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer"
              title={tMobile(lang, 'resetDefault')}
            >
              <RotateCcw size={10} />
              <span>{tMobile(lang, 'resetDefault')}</span>
            </button>
          </div>
        )}
      </div>

      {presets.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5 pt-0.5">
          <span className="text-[10px] font-cactus uppercase opacity-70 shrink-0 flex items-center gap-0.5">
            <Sliders size={10} />
          </span>
          {presets.map((p) => (
            <div
              key={p.id} onClick={() => onApplyOptions(p.options)}
              className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-[var(--cordel-card-btn-bg)] hover:border-[#8b2a1a] text-[var(--cordel-card-btn-text)] border border-[var(--cordel-border)] font-cactus font-bold text-[10px] uppercase cursor-pointer transition-colors"
            >
              <span>{p.name}</span>
              <button
                type="button" onClick={(e) => handleDelete(p.id, e)}
                className="hover:text-red-600 p-0.2 cursor-pointer ml-0.5" title="Supprimer"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
