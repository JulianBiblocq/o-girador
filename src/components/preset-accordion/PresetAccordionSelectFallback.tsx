import React from 'react';
import type { CatalogAccordionPresetItem } from './presetAccordionTiers';

interface FallbackSelectProps {
  activePreset: string;
  currentSongTitle?: string;
  lang: 'pt' | 'fr';
  showGroupCatalogue: boolean;
  groupTitle: string;
  showcaseTitle: string;
  communityTitle: string;
  canAccessCommunity: boolean;
  groupItems: CatalogAccordionPresetItem[];
  showcaseItems: CatalogAccordionPresetItem[];
  communityItems: CatalogAccordionPresetItem[];
  onSelect: (val: string, cloudId?: string) => void;
}

export const PresetAccordionSelectFallback: React.FC<FallbackSelectProps> = ({
  activePreset, currentSongTitle, lang, showGroupCatalogue, groupTitle, showcaseTitle,
  communityTitle, canAccessCommunity, groupItems, showcaseItems, communityItems, onSelect,
}) => {
  return (
    <select
      aria-hidden="true"
      tabIndex={-1}
      className="sr-only"
      value={activePreset}
      onChange={(e) => {
        const val = e.target.value;
        onSelect(val, val.startsWith('cloud:') ? val.replace('cloud:', '') : undefined);
      }}
    >
      <option value="" disabled>{currentSongTitle || (lang === 'pt' ? 'Escolha um ritmo' : 'Choisir un rythme')}</option>
      {showGroupCatalogue && (
        <optgroup label={groupTitle}>
          {groupItems.map((p) => (
            <option key={`og:${p.id}`} value={p.selectValue || `cloud:${p.id}`}>{p.name}</option>
          ))}
        </optgroup>
      )}
      <optgroup label={showcaseTitle}>
        {showcaseItems.map((p) => (
          <option key={`os:${p.id}`} value={p.selectValue || `cloud:${p.id}`}>{p.name}</option>
        ))}
      </optgroup>
      {canAccessCommunity && communityItems.length > 0 && (
        <optgroup label={communityTitle}>
          {communityItems.map((p) => (
            <option key={`oc:${p.id}`} value={p.selectValue || `cloud:${p.id}`}>{p.name}</option>
          ))}
        </optgroup>
      )}
    </select>
  );
};
