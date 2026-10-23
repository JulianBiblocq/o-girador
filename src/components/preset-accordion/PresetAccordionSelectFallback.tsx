/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface FallbackSelectProps {
  activePreset: string;
  currentSongTitle?: string;
  lang: 'pt' | 'fr';
  showGroupCatalogue: boolean;
  groupTitle: string;
  publicTitle: string;
  visiblePrivate: Array<{ id: string; name: string; isDraft?: boolean }>;
  visiblePublic: Array<{ id: string; name: string; isDraft?: boolean }>;
  onSelect: (val: string, cloudId?: string) => void;
}

export const PresetAccordionSelectFallback: React.FC<FallbackSelectProps> = ({
  activePreset,
  currentSongTitle,
  lang,
  showGroupCatalogue,
  groupTitle,
  publicTitle,
  visiblePrivate,
  visiblePublic,
  onSelect,
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
          {visiblePrivate.map((p) => (
            <option key={`og:${p.id}`} value={`cloud:${p.id}`}>{p.isDraft === true ? '' : ''}{p.name}</option>
          ))}
        </optgroup>
      )}
      <optgroup label={publicTitle}>
        {visiblePublic.map((p) => (
          <option key={`op:${p.id}`} value={`cloud:${p.id}`}>{p.isDraft === true ? '' : ''}{p.name}</option>
        ))}
      </optgroup>
    </select>
  );
};
