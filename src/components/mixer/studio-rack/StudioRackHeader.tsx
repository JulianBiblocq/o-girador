import React from 'react';
import { RotateCcw, X, Sliders } from 'lucide-react';
import { StudioRackModuleId } from '../masterEffectsTypes';
import { StudioRackStrings } from './studioRackI18n';
import {
  STUDIO_REVERB_PRESETS,
  STUDIO_SATURATION_PRESETS,
  STUDIO_COMPRESSOR_PRESETS,
  STUDIO_EQ_PRESETS,
} from '../../../audio/effects/studioFxPresets';

interface StudioRackHeaderProps {
  activeTab: StudioRackModuleId;
  onSelectTab: (tab: StudioRackModuleId) => void;
  activePresetId: string;
  onSelectPreset: (presetId: string) => void;
  onResetActiveTab: () => void;
  onClose: () => void;
  lang: string;
  s: StudioRackStrings;
  disableFx: boolean;
  disableEq: boolean;
}

const TABS: { id: StudioRackModuleId; key: keyof StudioRackStrings; accent: string }[] = [
  { id: 'reverb', key: 'tabReverb', accent: 'var(--fx-reverb-accent)' },
  { id: 'saturation', key: 'tabDisto', accent: 'var(--fx-disto-accent)' },
  { id: 'compressor', key: 'tabComp', accent: 'var(--fx-comp-accent)' },
  { id: 'eq', key: 'tabEq', accent: 'var(--eq-high-color)' },
];

export const StudioRackHeader: React.FC<StudioRackHeaderProps> = ({
  activeTab,
  onSelectTab,
  activePresetId,
  onSelectPreset,
  onResetActiveTab,
  onClose,
  lang,
  s,
  disableFx,
  disableEq,
}) => {
  const presets =
    activeTab === 'reverb'
      ? STUDIO_REVERB_PRESETS
      : activeTab === 'saturation'
        ? STUDIO_SATURATION_PRESETS
        : activeTab === 'compressor'
          ? STUDIO_COMPRESSOR_PRESETS
          : STUDIO_EQ_PRESETS;

  const showEcoBanner = (activeTab === 'eq' && disableEq) || (activeTab !== 'eq' && disableFx);

  return (
    <div className="flex flex-col w-full bg-[var(--master-header-bg)] text-[var(--master-header-text)] border-b-[3px] border-[var(--cordel-border)] shrink-0 select-none">
      {/* Ligne supérieure : Titre + Preset de base + Réinitialiser + Fermer */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-[var(--cordel-border)]/35">
        <div className="flex items-center gap-2">
          <Sliders size={16} className="text-[var(--cordel-gold)] shrink-0" />
          <span className="font-cactus font-black text-sm md:text-base tracking-widest uppercase">
            {s.rackTitle}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[10px] font-cactus font-bold uppercase tracking-wider text-[var(--master-header-text)]/85">
            <span>{s.presetLabel}</span>
            <select
              data-testid="studio-rack-preset-select"
              value={activePresetId || ''}
              onChange={(e) => onSelectPreset(e.target.value)}
              className="py-1 px-2 font-cactus font-bold text-[10px] uppercase tracking-wider bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border-2 border-[var(--cordel-ink-dark)] rounded-none cursor-pointer outline-none"
            >
              <option value="" disabled>{s.presetCustom}</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {lang === 'fr' ? p.labelFr : p.labelPt}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            data-testid="studio-rack-reset-btn"
            onClick={onResetActiveTab}
            className="px-2.5 py-1 bg-[var(--cordel-surface)] hover:bg-[var(--cordel-wood)] text-[var(--cordel-text)] border border-[var(--cordel-border)] rounded-none font-cactus font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>{s.resetBtn}</span>
          </button>

          <button
            type="button"
            data-testid="studio-rack-close-btn"
            onClick={onClose}
            title={s.closeTitle}
            className="p-1 bg-[var(--cordel-wood)] hover:opacity-90 text-[var(--cordel-parchment-bg)] border border-[var(--cordel-border)] rounded-none transition-opacity cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Onglets de navigation 4 modules */}
      <div className="grid grid-cols-4 w-full bg-[var(--cordel-bg)]">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-testid={`studio-rack-tab-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className={`py-2 px-2 font-cactus font-black text-[11px] uppercase tracking-wider border-r last:border-r-0 border-[var(--cordel-border)]/45 rounded-none transition-colors cursor-pointer ${
                isActive ? 'text-[var(--fx-active-text)]' : 'text-[var(--cordel-text)]/70 hover:text-[var(--cordel-text)] hover:bg-black/10'
              }`}
              style={{
                backgroundColor: isActive ? tab.accent : 'transparent',
                color: isActive && tab.id === 'compressor' ? 'var(--fx-comp-active-text)' : undefined,
              }}
            >
              {s[tab.key]}
            </button>
          );
        })}
      </div>

      {showEcoBanner && (
        <div className="w-full px-3 py-1.5 bg-[var(--vu-level-warn)] text-[var(--cordel-ink-dark)] font-cactus font-bold text-[10px] uppercase tracking-wider border-t border-[var(--cordel-ink-dark)]">
          {activeTab === 'eq' ? s.ecoEqWarning : s.ecoFxWarning}
        </div>
      )}
    </div>
  );
};

