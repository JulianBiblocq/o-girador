/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Déclencheur sans friction, bandeau toast et badge d'écoute Bluetooth (< 135 lignes).
 */
import React, { useEffect, useState } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useBluetoothLatencyStore, getProfileDisplayName } from '../../utils/bluetoothLatencyStore';
import { btTranslations } from '../../utils/bluetoothTranslations';
import { BluetoothModalContainer } from './BluetoothModalContainer';
import { Volume2, Radio, Headphones, X } from 'lucide-react';

interface Props {
  lang?: 'fr' | 'pt';
  forceShowBadge?: boolean;
}

export const BluetoothOnboardingFlow: React.FC<Props> = ({ lang: propLang, forceShowBadge = false }) => {
  const storeLang = useSequencerStore((s) => s.lang);
  const lang = storeLang || propLang || 'pt';
  const t = btTranslations[lang];

  const activeAoVivoTrackId = useSequencerStore((s) => s.activeAoVivoTrackId);
  const tocarJuntoActive = useSequencerStore((s) => s.tocarJuntoActive);
  const tocarJuntoTrackId = useSequencerStore((s) => s.tocarJuntoTrackId);

  const {
    hasCompletedOnboarding,
    activeProfileId,
    bluetoothVisualOffsetMs,
    profiles,
    openModal,
  } = useBluetoothLatencyStore();

  const [showToast, setShowToast] = useState(false);
  const [hasShownToastThisSession, setHasShownToastThisSession] = useState(false);

  const isTrainingActive = activeAoVivoTrackId !== null || tocarJuntoActive || tocarJuntoTrackId !== null;
  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  const displayName = activeProfile ? getProfileDisplayName(activeProfile, lang) : '';

  useEffect(() => {
    if (!isTrainingActive) return;

    if (!hasCompletedOnboarding) {
      openModal('onboarding');
    } else if (!hasShownToastThisSession) {
      setShowToast(true);
      setHasShownToastThisSession(true);
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isTrainingActive, hasCompletedOnboarding, hasShownToastThisSession, openModal]);

  const getProfileIcon = (type: string) => {
    if (type === 'bt_headphones') return <Headphones size={13} strokeWidth={2.2} className="shrink-0" />;
    if (type === 'bt_speaker') return <Radio size={13} strokeWidth={2.2} className="shrink-0" />;
    return <Volume2 size={13} strokeWidth={2.2} className="shrink-0" />;
  };

  return (
    <>
      <BluetoothModalContainer lang={lang} />

      {/* Bandeau Toast non-bloquant (3 secondes) en haut lors de l'entrée en mode entraînement */}
      {showToast && isTrainingActive && (
        <div className="fixed top-2 inset-x-0 mx-auto max-w-sm px-3 z-50 pointer-events-auto transition-all animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-black shadow-[3px_3px_0_#000] p-2 flex items-center justify-between gap-2 text-xs font-cactus font-bold">
            <div className="flex items-center gap-1.5 min-w-0">
              {getProfileIcon(activeProfile.type)}
              <span className="truncate">
                {t.toastListeningPrefix} : {displayName}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowToast(false);
                  openModal('selector');
                }}
                className="px-2 py-0.5 border border-[var(--cordel-border)] bg-[var(--cordel-card-btn-bg)] hover:bg-[#b94a2c] hover:text-[#f4ecd8] text-[10px] uppercase cursor-pointer"
              >
                {t.toastChangeBtn}
              </button>
              <button
                type="button"
                onClick={() => setShowToast(false)}
                className="p-1 hover:opacity-70 cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
