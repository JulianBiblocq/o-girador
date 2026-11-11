/**
 * BusDynamicsPresetBar.tsx — Barre inline de Presets de Bus Niveau 1 (< 135 lignes).
 * Zéro boîte native (`prompt`/`confirm`/`alert`), protection clavier stricte (`Space` / `Enter` / `Escape`).
 */
import React, { useEffect, useRef, useState } from 'react';
import { BUS_COMPRESSOR_ARCHETYPE_LABELS } from '../../../audio/effects/busCompressorArchetypes';
import type { BusCompressorArchetypeId, BusCompressorPresetArchetypeId, BusCompressorSettings } from '../../../audio/effects/busCompressorTypes';
import {
  BUS_COMP_USER_PRESETS_EVENT, applyBusCompressorUserPreset, createBusCompressorUserPreset,
  deleteBusCompressorUserPreset, isFactoryBusArchetypeId, loadBusCompressorUserPresets,
  renameBusCompressorUserPreset, type BusCompressorUserPreset,
} from '../../../audio/effects/busCompressorUserPresets';
import type { BusDynamicsModalStrings } from './busDynamicsModalI18n';

const FACTORY_IDS: readonly BusCompressorPresetArchetypeId[] = [
  'alfaias_glue', 'caixas_carpet', 'sementes_control', 'toada_presence',
];

interface BusDynamicsPresetBarProps {
  trackId: number;
  settings: BusCompressorSettings;
  naturalArchetype: BusCompressorPresetArchetypeId;
  activeUserPresetId: string | null;
  onActiveUserPresetChange: (id: string | null) => void;
  onSelectArchetype: (arch: BusCompressorPresetArchetypeId) => void;
  s: BusDynamicsModalStrings;
}

export const BusDynamicsPresetBar: React.FC<BusDynamicsPresetBarProps> = ({
  trackId, settings, naturalArchetype, activeUserPresetId, onActiveUserPresetChange, onSelectArchetype, s,
}) => {
  const [userPresets, setUserPresets] = useState<BusCompressorUserPreset[]>(() => loadBusCompressorUserPresets());
  const [editMode, setEditMode] = useState<'create' | 'rename' | 'delete' | null>(null);
  const [draftName, setDraftName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const refresh = () => setUserPresets(loadBusCompressorUserPresets());
    window.addEventListener(BUS_COMP_USER_PRESETS_EVENT, refresh);
    return () => window.removeEventListener(BUS_COMP_USER_PRESETS_EVENT, refresh);
  }, []);

  useEffect(() => {
    if ((editMode === 'create' || editMode === 'rename') && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editMode]);

  const selectedUserPreset = activeUserPresetId ? userPresets.find((p) => p.id === activeUserPresetId) : undefined;
  const selectValue: BusCompressorArchetypeId | string = selectedUserPreset ? selectedUserPreset.id : settings.archetype;

  const submitName = () => {
    const clean = draftName.trim();
    if (!clean) { setEditMode(null); return; }
    if (editMode === 'create') {
      const created = createBusCompressorUserPreset(clean, settings);
      setUserPresets(loadBusCompressorUserPresets());
      if (created) { applyBusCompressorUserPreset(trackId, created.id); onActiveUserPresetChange(created.id); }
    } else if (editMode === 'rename' && selectedUserPreset) {
      const renamed = renameBusCompressorUserPreset(selectedUserPreset.id, clean);
      setUserPresets(loadBusCompressorUserPresets());
      if (renamed) onActiveUserPresetChange(renamed.id);
    }
    setEditMode(null);
  };

  const confirmDelete = () => {
    if (!selectedUserPreset) return;
    deleteBusCompressorUserPreset(selectedUserPreset.id);
    setUserPresets(loadBusCompressorUserPresets());
    setEditMode(null);
    onActiveUserPresetChange(null);
    onSelectArchetype(naturalArchetype);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); submitName(); }
    else if (e.key === 'Escape') { e.preventDefault(); setEditMode(null); }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] px-3 py-2 rounded-none select-none">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] font-cactus font-bold uppercase tracking-wider opacity-85">{s.presetLabel}</span>
        <select
          data-testid="bus-dynamics-preset-select" value={selectValue}
          onChange={(e) => {
            const val = e.target.value;
            if (isFactoryBusArchetypeId(val)) { onActiveUserPresetChange(null); onSelectArchetype(val); }
            else if (applyBusCompressorUserPreset(trackId, val)) { onActiveUserPresetChange(val); }
          }}
          className="py-1 px-2 font-cactus font-bold text-[10px] uppercase tracking-wider bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border-2 border-[var(--cordel-ink-dark)] rounded-none cursor-pointer outline-none"
        >
          {selectValue === 'custom' && <option value="custom" disabled>{s.presetCustomOption}</option>}
          <optgroup label={s.factoryPresetsGroup}>
            {FACTORY_IDS.map((id) => <option key={id} value={id}>{BUS_COMPRESSOR_ARCHETYPE_LABELS[id]}</option>)}
          </optgroup>
          <optgroup label={s.userPresetsGroup}>
            {userPresets.length === 0
              ? <option value="__none__" disabled>{s.noUserPresets}</option>
              : userPresets.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </optgroup>
        </select>
      </div>

      {editMode === 'create' || editMode === 'rename' ? (
        <div className="flex items-center gap-1 bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border-2 border-[var(--cordel-ink-dark)] px-1.5 py-0.5 rounded-none">
          <input
            ref={inputRef} type="text" value={draftName} maxLength={32} placeholder={s.inputPlaceholder}
            data-testid="bus-dynamics-preset-input" onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={handleInputKeyDown} onKeyUp={(e) => e.stopPropagation()}
            className="w-36 bg-transparent text-[10px] font-cactus font-bold outline-none px-1"
          />
          <button type="button" onClick={submitName} title={s.validateBtn} className="px-1.5 py-0.5 bg-[var(--cordel-wood)] text-[var(--cordel-parchment-bg)] font-cactus font-bold text-[9.5px] uppercase rounded-none cursor-pointer">{s.validateBtn}</button>
          <button type="button" onClick={() => setEditMode(null)} title={s.cancelBtn} className="px-1.5 py-0.5 border border-[var(--cordel-ink-dark)] font-cactus font-bold text-[9.5px] uppercase rounded-none cursor-pointer">{s.cancelBtn}</button>
        </div>
      ) : editMode === 'delete' ? (
        <div className="flex items-center gap-1.5 bg-[var(--vu-level-clip)] text-[var(--fx-active-text)] border border-[var(--cordel-border)] px-2 py-0.5 text-[9.5px] font-cactus font-bold uppercase rounded-none">
          <span>{s.confirmPrompt}</span>
          <button type="button" data-testid="bus-dynamics-confirm-delete" onClick={confirmDelete} className="underline px-1 cursor-pointer">{s.yesBtn}</button>
          <button type="button" onClick={() => setEditMode(null)} className="opacity-85 px-1 cursor-pointer">{s.noBtn}</button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <button type="button" data-testid="bus-dynamics-save-btn" onClick={() => { setDraftName(`${s.defaultPresetPrefix} ${userPresets.length + 1}`); setEditMode('create'); }} className="px-2 py-1 bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-parchment-bg)] border border-[var(--cordel-ink-dark)] rounded-none font-cactus font-bold text-[9.5px] uppercase flex items-center gap-1 cursor-pointer">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg><span>{s.saveBtn}</span>
          </button>
          <button type="button" data-testid="bus-dynamics-rename-btn" disabled={!selectedUserPreset} onClick={() => { if (selectedUserPreset) { setDraftName(selectedUserPreset.name); setEditMode('rename'); } }} title={s.renameBtn} className="px-2 py-1 bg-[var(--cordel-surface)] text-[var(--cordel-text)] border border-[var(--cordel-border)] rounded-none font-cactus font-bold text-[9.5px] uppercase flex items-center gap-1 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg><span>{s.renameBtn}</span>
          </button>
          <button type="button" data-testid="bus-dynamics-delete-btn" disabled={!selectedUserPreset} onClick={() => setEditMode('delete')} title={s.deleteBtn} className="px-2 py-1 bg-[var(--cordel-surface)] text-[var(--cordel-text)] border border-[var(--cordel-border)] rounded-none font-cactus font-bold text-[9.5px] uppercase flex items-center gap-1 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg><span>{s.deleteBtn}</span>
          </button>
        </div>
      )}
    </div>
  );
};
