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
  const openVisitorAuthModal = useSequencerStore((s) => s.openVisitorAuthModal);

  if (!currentUser) {
    return (
      <button
        onClick={() => openVisitorAuthModal()}
        className="px-2 py-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm font-cactus font-bold text-[10px] sm:text-xs uppercase tracking-wide flex items-center gap-1 shadow-[2px_2px_0_var(--cordel-border)] hover:bg-[#b94a2c] hover:text-[#f4ecd8] active:translate-y-0.5 cursor-pointer shrink-0"
        title={lang === 'pt' ? 'Conectar-se' : 'Se connecter'}
      >
        <User size={13} className="shrink-0 text-[#b94a2c]" />
        <span>{lang === 'pt' ? 'Entrar' : 'Connexion'}</span>
      </button>
    );
  }

  const initial = (userProfile?.displayName || currentUser.displayName || currentUser.email || 'U')[0].toUpperCase();
  const groupLabel = userProfile?.groupName || (userProfile as any)?.association || null;

  return (
    <div className="relative shrink-0 select-none">
      <button
        onClick={() => setShowDropdown((prev) => !prev)}
        className="h-8 px-1.5 bg-[#1a1a1a] text-[#f4ecd8] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0_var(--cordel-border)] flex items-center gap-1.5 active:translate-y-0.5 cursor-pointer font-cactus font-bold text-xs"
        title={currentUser.email || ''}
      >
        <div className="w-5 h-5 rounded-full bg-[#b94a2c] text-[#f4ecd8] flex items-center justify-center font-mono font-bold text-[10px]">
          {initial}
        </div>
        {groupLabel && <span className="max-w-[70px] truncate text-[9px] uppercase">{groupLabel}</span>}
      </button>

      {showDropdown && (
        <div className="absolute top-10 right-0 z-50 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border shadow-[4px_4px_0_var(--cordel-border)] p-2 min-w-[150px] flex flex-col gap-2">
          <div className="text-[10px] font-mono text-[#b94a2c] font-bold truncate">
            {userProfile?.displayName || currentUser.email}
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
