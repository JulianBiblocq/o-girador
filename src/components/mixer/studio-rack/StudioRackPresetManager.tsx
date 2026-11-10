import React, { useEffect, useRef, useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { StudioRackModuleId } from '../masterEffectsTypes';
import { StudioRackStrings } from './studioRackI18n';
import {
  getFactoryPresetsForModule, loadStudioFxUserPresets,
  createStudioUserPreset, renameStudioUserPreset, deleteStudioUserPreset, StudioUserPresetItem,
} from '../../../audio/effects/studioFxUserPresets';

interface StudioRackPresetManagerProps {
  activeTab: StudioRackModuleId;
  activePresetId: string;
  onSelectPreset: (presetId: string, userPreset?: StudioUserPresetItem) => void;
  getCurrentTabSettings: () => Record<string, any>;
  lang: string;
  s: StudioRackStrings;
}

export const StudioRackPresetManager: React.FC<StudioRackPresetManagerProps> = ({
  activeTab, activePresetId, onSelectPreset, getCurrentTabSettings, lang, s,
}) => {
  const [userPresets, setUserPresets] = useState<StudioUserPresetItem[]>(() => loadStudioFxUserPresets()[activeTab]);
  const [editMode, setEditMode] = useState<'create' | 'rename' | 'delete' | null>(null);
  const [draftName, setDraftName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUserPresets(loadStudioFxUserPresets()[activeTab]);
    setEditMode(null);
  }, [activeTab]);

  useEffect(() => {
    const refresh = () => setUserPresets(loadStudioFxUserPresets()[activeTab]);
    window.addEventListener('girador-studio-user-presets-changed', refresh);
    return () => window.removeEventListener('girador-studio-user-presets-changed', refresh);
  }, [activeTab]);

  useEffect(() => {
    if ((editMode === 'create' || editMode === 'rename') && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editMode]);

  const factoryPresets = getFactoryPresetsForModule(activeTab);
  const selectedUserPreset = userPresets.find(p => p.id === activePresetId);

  const startCreate = () => {
    setDraftName(`${lang === 'fr' ? 'Mon Preset' : 'Meu Preset'} ${userPresets.length + 1}`);
    setEditMode('create');
  };

  const startRename = () => {
    if (!selectedUserPreset) return;
    setDraftName(selectedUserPreset.name);
    setEditMode('rename');
  };

  const submitName = () => {
    const clean = draftName.trim();
    if (!clean) { setEditMode(null); return; }
    if (editMode === 'create') {
      const created = createStudioUserPreset(activeTab, clean, getCurrentTabSettings());
      setUserPresets(loadStudioFxUserPresets()[activeTab]);
      onSelectPreset(created.id, created);
    } else if (editMode === 'rename' && selectedUserPreset) {
      const renamed = renameStudioUserPreset(activeTab, selectedUserPreset.id, clean);
      setUserPresets(loadStudioFxUserPresets()[activeTab]);
      if (renamed) onSelectPreset(renamed.id, renamed);
    }
    setEditMode(null);
  };

  const confirmDelete = () => {
    if (!selectedUserPreset) return;
    deleteStudioUserPreset(activeTab, selectedUserPreset.id);
    setUserPresets(loadStudioFxUserPresets()[activeTab]);
    setEditMode(null);
    if (factoryPresets[0]) onSelectPreset(factoryPresets[0].id);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); submitName(); }
    else if (e.key === 'Escape') { e.preventDefault(); setEditMode(null); }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-cactus font-bold uppercase tracking-wider text-[var(--master-header-text)]/85">{s.presetLabel}</span>
      <select
        data-testid="studio-rack-preset-select" value={activePresetId || ''}
        onChange={(e) => { const val = e.target.value; onSelectPreset(val, userPresets.find(u => u.id === val)); }}
        className="py-1 px-2 font-cactus font-bold text-[10px] uppercase tracking-wider bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border-2 border-[var(--cordel-ink-dark)] rounded-none cursor-pointer outline-none"
      >
        <option value="" disabled>{s.presetCustom}</option>
        <optgroup label={s.factoryPresetsGroup}>
          {factoryPresets.map(p => <option key={p.id} value={p.id}>{lang === 'fr' ? p.labelFr : p.labelPt}</option>)}
        </optgroup>
        {userPresets.length > 0 && (
          <optgroup label={s.userPresetsGroup}>
            {userPresets.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </optgroup>
        )}
      </select>

      {editMode === 'create' || editMode === 'rename' ? (
        <div className="flex items-center gap-1 bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border-2 border-[var(--cordel-ink-dark)] px-1 py-0.5 rounded-none">
          <input
            ref={inputRef} type="text" value={draftName} maxLength={28} data-testid="studio-rack-preset-name-input"
            onChange={e => setDraftName(e.target.value)} onKeyDown={handleInputKeyDown}
            className="w-28 bg-transparent text-[10px] font-cactus font-bold outline-none px-1"
          />
          <button type="button" onClick={submitName} title={s.validateBtn} className="p-0.5 hover:text-[var(--cordel-wood)] cursor-pointer"><Check size={12} /></button>
          <button type="button" onClick={() => setEditMode(null)} title={s.cancelBtn} className="p-0.5 hover:text-[var(--cordel-wood)] cursor-pointer"><X size={12} /></button>
        </div>
      ) : editMode === 'delete' ? (
        <div className="flex items-center gap-1 bg-[var(--vu-level-clip)] text-[var(--fx-active-text)] border border-[var(--cordel-border)] px-1.5 py-0.5 text-[9.5px] font-cactus font-bold uppercase rounded-none">
          <span>{s.confirmDeletePrompt}</span>
          <button type="button" data-testid="studio-rack-preset-confirm-delete" onClick={confirmDelete} className="underline px-1 cursor-pointer">{s.yesBtn}</button>
          <button type="button" onClick={() => setEditMode(null)} className="opacity-85 px-1 cursor-pointer">{s.noBtn}</button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <button type="button" data-testid="studio-rack-preset-save-btn" onClick={startCreate} className="px-2 py-1 bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-parchment-bg)] border border-[var(--cordel-ink-dark)] rounded-none font-cactus font-bold text-[9.5px] uppercase cursor-pointer">
            {s.savePresetBtn}
          </button>
          <button type="button" data-testid="studio-rack-preset-rename-btn" disabled={!selectedUserPreset} onClick={startRename} title={s.renamePresetBtn} className="p-1 bg-[var(--cordel-surface)] text-[var(--cordel-text)] border border-[var(--cordel-border)] rounded-none disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"><Pencil size={11} /></button>
          <button type="button" data-testid="studio-rack-preset-delete-btn" disabled={!selectedUserPreset} onClick={() => setEditMode('delete')} title={s.deletePresetBtn} className="p-1 bg-[var(--cordel-surface)] text-[var(--cordel-text)] border border-[var(--cordel-border)] rounded-none disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"><Trash2 size={11} /></button>
        </div>
      )}
    </div>
  );
};
