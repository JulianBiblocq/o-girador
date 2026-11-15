import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, UserCheck, MonitorSmartphone, Headphones } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { useBluetoothLatencyStore } from '../../utils/bluetoothLatencyStore';
import { ProfileIdentityBanner } from './ProfileIdentityBanner';
import { ProfileMusicPreferencesTab } from './ProfileMusicPreferencesTab';
import { ProfileStartupComfortTab } from './ProfileStartupComfortTab';
import { ProfileDevicesLatencyTab } from './ProfileDevicesLatencyTab';

type ProfileTabId = 'profile' | 'startup' | 'latency';

interface UserProfilePreferencesModalProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const UserProfilePreferencesModal: React.FC<UserProfilePreferencesModalProps> = ({
  isDarkMode,
  onToggleDarkMode,
}) => {
  const isOpen = useSequencerSettingsStore((s) => s.isProfileModalOpen);
  const setIsOpen = useSequencerSettingsStore((s) => s.setIsProfileModalOpen);
  const lang = useSequencerStore((s) => s.lang) === 'fr' ? 'fr' : 'pt';
  const isPt = lang === 'pt';
  const { currentUser, userProfile, signInWithGoogle } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTabId>('profile');

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (useBluetoothLatencyStore.getState().isModalOpen) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [isOpen, setIsOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const tabs: Array<{ id: ProfileTabId; label: string; Icon: React.FC<any> }> = [
    { id: 'profile', label: isPt ? '1. Perfil & Naipe' : '1. Profil & Pupitre', Icon: UserCheck },
    { id: 'startup', label: isPt ? '2. Abertura & Tela' : '2. Ouverture & Affichage', Icon: MonitorSmartphone },
    { id: 'latency', label: isPt ? '3. Aparelhos & Latência' : '3. Appareils & Latences', Icon: Headphones },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[100035] flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs select-none"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-xl max-h-[calc(100dvh-1.5rem)] border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] shadow-[6px_6px_0_var(--cordel-shadow-color)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-2.5 border-b-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] flex items-center justify-between gap-2 shrink-0">
          <h2 className="font-cactus font-bold text-sm sm:text-base uppercase tracking-wide truncate">
            {isPt ? 'Meu Perfil & Preferências' : 'Mon Profil & Préférences'}
          </h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label={isPt ? 'Fechar' : 'Fermer'}
            className="w-7 h-7 flex items-center justify-center border border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] hover:bg-[var(--cordel-accent)] hover:text-[var(--cordel-on-accent)] cursor-pointer transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Bandeau identité + Onglets */}
        <div className="px-3.5 pt-3 pb-2 flex flex-col gap-2.5 border-b border-[var(--cordel-border)]/40 shrink-0">
          <ProfileIdentityBanner
            currentUser={currentUser}
            userProfile={userProfile}
            lang={lang}
            onSignIn={() => { void signInWithGoogle(); }}
          />
          <div className="grid grid-cols-3 gap-1.5">
            {tabs.map(({ id, label, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`py-1.5 px-2 border-2 font-cactus font-bold text-[10px] sm:text-[11px] uppercase flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                    active
                      ? 'border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] shadow-[1.5px_1.5px_0_var(--cordel-shadow-color)]'
                      : 'border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] hover:border-[var(--cordel-accent-readable)]'
                  }`}
                >
                  <Icon size={12} className="shrink-0 hidden sm:inline" />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenu défilant de l'onglet actif */}
        <div className="p-3.5 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
          {activeTab === 'profile' && <ProfileMusicPreferencesTab lang={lang} />}
          {activeTab === 'startup' && (
            <ProfileStartupComfortTab lang={lang} isDarkMode={isDarkMode} onToggleDarkMode={onToggleDarkMode} />
          )}
          {activeTab === 'latency' && (
            <ProfileDevicesLatencyTab lang={lang} onCloseProfileModal={() => setIsOpen(false)} />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
