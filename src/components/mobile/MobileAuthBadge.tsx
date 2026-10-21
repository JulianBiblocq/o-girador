/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSequencerStore } from '../../stores/useSequencerStore';

interface Props {
  lang?: 'fr' | 'pt';
}

export const MobileAuthBadge: React.FC<Props> = ({ lang = 'pt' }) => {
  const { currentUser, userProfile, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [imgError, setImgError] = useState(false);
  const openVisitorAuthModal = useSequencerStore((s) => s.openVisitorAuthModal);

  const [cachedProfile] = useState(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('girador_user_cached_profile') : null;
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  });

  const activeUser = currentUser || (cachedProfile ? { displayName: cachedProfile.displayName } : null);

  if (!activeUser) {
    return (
      <button
        onClick={() => openVisitorAuthModal()}
        className="px-2 py-1 bg-[#262220] text-[#f4ecd8] border border-[#f4ecd8]/40 font-cactus font-bold text-[10px] sm:text-xs uppercase tracking-wide flex items-center gap-1 shadow-[1px_1px_0_#000] hover:bg-[#b94a2c] active:translate-y-0.5 cursor-pointer shrink-0"
        title={lang === 'pt' ? 'Conectar-se' : 'Se connecter'}
      >
        <User size={13} className="shrink-0 text-[#b94a2c]" />
        <span>{lang === 'pt' ? 'Entrar' : 'Connexion'}</span>
      </button>
    );
  }

  const photoURL = userProfile?.photoURL || currentUser?.photoURL || cachedProfile?.photoURL;
  const displayName = userProfile?.displayName || currentUser?.displayName || cachedProfile?.displayName || currentUser?.email || 'U';
  const initial = displayName[0].toUpperCase();
  const groupLabel = userProfile?.groupName || cachedProfile?.groupName || (userProfile as any)?.association || null;

  return (
    <div className="relative shrink-0 select-none">
      <button
        onClick={() => setShowDropdown((prev) => !prev)}
        className="h-8 px-1.5 bg-[#262220] text-[#f4ecd8] border border-[#f4ecd8]/40 shadow-[1px_1px_0_#000] flex items-center gap-1.5 active:translate-y-0.5 cursor-pointer font-cactus font-bold text-xs"
        title={currentUser?.email || displayName}
      >
        {photoURL && !imgError ? (
          <img
            src={photoURL}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-6 h-6 rounded-full object-cover border border-[var(--cordel-border)] shrink-0"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-[#b94a2c] text-[#f4ecd8] flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
            {initial}
          </div>
        )}
        {groupLabel && <span className="max-w-[70px] truncate text-[9px] uppercase">{groupLabel}</span>}
      </button>

      {showDropdown && (
        <div className="absolute top-10 right-0 z-50 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border shadow-[4px_4px_0_var(--cordel-border)] p-2 min-w-[150px] flex flex-col gap-2">
          <div className="text-[10px] font-mono text-[#b94a2c] font-bold truncate">
            {displayName}
          </div>
          {groupLabel && <div className="text-[9px] font-cactus uppercase opacity-75">{groupLabel}</div>}
          <button
            onClick={() => {
              setShowDropdown(false);
              logout();
            }}
            className="flex items-center gap-1.5 px-2 py-1 bg-[#1a1a1a] text-[#f4ecd8] font-cactus font-bold text-[10px] uppercase border border-[var(--cordel-border)] hover:bg-[#b94a2c]"
          >
            <LogOut size={12} />
            <span>{lang === 'pt' ? 'Sair' : 'Déconnexion'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
