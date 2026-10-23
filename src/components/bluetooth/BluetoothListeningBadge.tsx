/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Badge d'écoute Cordel en haut à droite de la Roda (< 70 lignes).
 */
import React from 'react';
import { Volume2, Radio, Headphones } from 'lucide-react';
import { useBluetoothLatencyStore, getProfileDisplayName } from '../../utils/bluetoothLatencyStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { btTranslations } from '../../utils/bluetoothTranslations';

interface BluetoothListeningBadgeProps {
  lang?: 'fr' | 'pt';
  className?: string;
}

export const BluetoothListeningBadge: React.FC<BluetoothListeningBadgeProps> = ({
  lang: propLang,
  className = '',
}) => {
  const storeLang = useSequencerStore((s) => s.lang);
  const lang = (propLang || storeLang || 'pt') as 'fr' | 'pt';
  const t = btTranslations[lang] || btTranslations.pt;

  const profiles = useBluetoothLatencyStore((s) => s.profiles);
  const activeProfileId = useBluetoothLatencyStore((s) => s.activeProfileId);
  const openModal = useBluetoothLatencyStore((s) => s.openModal);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];
  const displayName = activeProfile ? getProfileDisplayName(activeProfile, lang) : '';

  const renderIcon = () => {
    if (!activeProfile) return <Volume2 size={13} strokeWidth={2.2} className="shrink-0" />;
    if (activeProfile.type === 'bt_headphones') return <Headphones size={13} strokeWidth={2.2} className="shrink-0" />;
    if (activeProfile.type === 'bt_speaker') return <Radio size={13} strokeWidth={2.2} className="shrink-0" />;
    return <Volume2 size={13} strokeWidth={2.2} className="shrink-0" />;
  };

  return (
    <button
      type="button"
      onClick={() => openModal('selector')}
      title={t.badgeTooltip}
      aria-label={t.badgeTooltip}
      className={`absolute top-2 right-2 md:top-2.5 md:right-3 z-30 h-7 px-2 border-2 border-black bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-cactus font-bold text-[10px] md:text-[11px] uppercase flex items-center gap-1.5 shadow-[2px_2px_0_#000] hover:bg-[var(--cordel-surface)] active:translate-y-0.5 cursor-pointer select-none transition-all ${className}`}
    >
      {renderIcon()}
      <span className="truncate max-w-[120px] md:max-w-[160px] tracking-wide leading-none">
        {displayName}
      </span>
    </button>
  );
};
