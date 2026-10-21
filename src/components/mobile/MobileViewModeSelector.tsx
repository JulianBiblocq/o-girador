/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAuth } from '../../contexts/AuthContext';
import { getEcosystemUrl } from '../../constants/ecosystemUrls';
import { launchWithSSO } from '../../utils/crossAppAuth';
import { tMobile } from '../../i18n/mobileTranslations';

interface Props {
  className?: string;
  lang?: 'fr' | 'pt';
}

export const MobileViewModeSelector: React.FC<Props> = ({ className = '', lang: propLang }) => {
  const storeLang = useSequencerStore((s) => s.lang);
  const lang = storeLang || propLang || 'pt';
  const mobileViewMode = useSequencerStore((s) => s.mobileViewMode || 'danse');
  const setMobileViewMode = useSequencerStore((s) => s.setMobileViewMode);
  const { userProfile, isAdmin } = useAuth();

  const handleModeChange = (val: string) => {
    if (val === 'chant') {
      const metadata = (useSequencerStore.getState().metadata || {}) as any;
      const songId = metadata.morceauId || metadata.songId || metadata.toada || '';
      const toadaId = metadata.toada || '';
      const isPrivileged = userProfile?.role === 'mestre' || !!userProfile?.mestreId || isAdmin || userProfile?.canWriteSequenciador || userProfile?.isPremium;

      const query = isPrivileged
        ? `?songId=${encodeURIComponent(songId)}&toadaId=${encodeURIComponent(toadaId)}`
        : `?mode=eleve&songId=${encodeURIComponent(songId)}&toadaId=${encodeURIComponent(toadaId)}`;

      const targetUrl = getEcosystemUrl('vocalLab', query);
      launchWithSSO(targetUrl, { appLabel: 'Cantador', appKey: 'vocalLab', forceSameTab: false });
      return;
    }

    setMobileViewMode(val as any);
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <select
        value={mobileViewMode}
        onChange={(e) => handleModeChange(e.target.value)}
        className="w-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-cactus font-bold text-xs uppercase px-2 py-1.5 cordel-border-sm cursor-pointer shadow-[2px_2px_0_var(--cordel-border)] focus:outline-none appearance-none pr-6 tracking-wide"
        title={tMobile(lang, 'viewMode')}
      >
        <option value="percussion">{tMobile(lang, 'modePercussion')}</option>
        <option value="danse">{tMobile(lang, 'modeDanse')}</option>
        <option value="chant">{tMobile(lang, 'modeChant')}</option>
        <option value="editeur">{tMobile(lang, 'modeEditeur')}</option>
        <option value="complet">{tMobile(lang, 'modeComplet')}</option>
      </select>
      <span className="pointer-events-none absolute right-2 text-[10px] text-[#b94a2c]">
        ▼
      </span>
    </div>
  );
};
