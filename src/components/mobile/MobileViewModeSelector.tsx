/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';

interface Props {
  className?: string;
  lang?: 'fr' | 'pt';
}

export const MobileViewModeSelector: React.FC<Props> = ({ className = '', lang = 'pt' }) => {
  const { mobileViewMode, setMobileViewMode } = useSequencerStore(
    useShallow((s) => ({
      mobileViewMode: s.mobileViewMode || 'danse',
      setMobileViewMode: s.setMobileViewMode,
    }))
  );

  return (
    <div className={`relative flex items-center ${className}`}>
      <select
        value={mobileViewMode}
        onChange={(e) => setMobileViewMode(e.target.value as any)}
        className="w-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-cactus font-bold text-xs uppercase px-2 py-1.5 cordel-border-sm cursor-pointer shadow-[2px_2px_0_var(--cordel-border)] focus:outline-none appearance-none pr-6 tracking-wide"
        title={lang === 'pt' ? 'Mudar Modo' : 'Changer de Mode'}
      >
        <option value="danse">{lang === 'pt' ? 'Modo Dança' : 'Mode Danse'}</option>
        <option value="percussion">{lang === 'pt' ? 'Modo Percussão' : 'Mode Percussion'}</option>
        <option value="editeur">{lang === 'pt' ? 'Modo Editor (Scan & Fotos)' : 'Mode Éditeur (Scan & Photos)'}</option>
        <option value="complet">{lang === 'pt' ? 'Modo Completo (Studio)' : 'Mode Complet (Studio)'}</option>
      </select>
      <span className="pointer-events-none absolute right-2 text-[10px] text-[#b94a2c]">
        ▼
      </span>
    </div>
  );
};
