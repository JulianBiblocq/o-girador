/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LogOut, Shield } from 'lucide-react';

interface DropdownProps {
  userProfile: any;
  currentUser: any;
  isAdmin: boolean;
  computedAlign: 'left' | 'right';
  lang: 'fr' | 'pt';
  onAdminClick?: () => void;
  onClose: () => void;
  onLogout: () => void;
}

export const UserDropdownMenu: React.FC<DropdownProps> = ({
  userProfile,
  currentUser,
  isAdmin,
  computedAlign,
  lang,
  onClose,
  onLogout,
}) => {
  const displayName = userProfile?.displayName || currentUser?.displayName || 'Membre';
  const email = userProfile?.email || currentUser?.email;
  const groupLabel = userProfile?.groupName || userProfile?.groupId;

  const isMestre = userProfile?.role === 'mestre' || userProfile?.dbRole === 'mestre';
  const roleOrInstrument = isMestre
    ? 'Mestre'
    : userProfile?.instrument ||
      (userProfile?.role === 'admin'
        ? 'Admin'
        : userProfile?.role === 'membre'
        ? (lang === 'fr' ? 'Membre' : 'Membro')
        : userProfile?.role === 'eleve'
        ? (lang === 'fr' ? 'Élève' : 'Aluno')
        : (lang === 'fr' ? 'Visiteur' : 'Visitante'));

  const isLeft = Boolean(userProfile?.lateralite === 'gaucher' || userProfile?.isLeftHanded);
  const lateraliteLabel = isLeft
    ? (lang === 'fr' ? 'Gaucher' : 'Canhoto')
    : (lang === 'fr' ? 'Droitier' : 'Destro');

  return (
    <div
      className={`absolute top-12 ${
        computedAlign === 'left' ? 'left-0' : 'right-0'
      } bg-[var(--cordel-bg)] cordel-border shadow-[4px_4px_0_var(--cordel-border)] min-w-[220px] max-w-[calc(100vw-24px)] z-[1000] flex flex-col p-3 gap-3 select-none box-border`}
    >
      <div className="flex flex-col border-b border-[var(--cordel-border)]/30 pb-2.5 gap-2">
        <div>
          <span className="text-xs font-cactus font-bold text-[var(--cordel-text)] truncate flex items-center gap-1.5">
            <span className="truncate">{displayName}</span>
            {isAdmin && (
              <span title={lang === 'fr' ? 'Administrateur' : 'Administrador'}>
                <Shield size={12} className="text-[#8b2a1a] shrink-0" />
              </span>
            )}
          </span>
          {email && (
            <span className="text-[10px] font-sans text-[var(--cordel-text)] opacity-60 truncate block mt-0.5">
              {email}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[var(--cordel-border)]/20">
          {groupLabel && (
            <span className="text-[10px] font-cactus font-bold px-2 py-0.5 cordel-border-sm bg-[var(--cordel-wood)]/10 text-[var(--cordel-wood)]">
              {groupLabel}
            </span>
          )}
          <span className="text-[10px] font-cactus font-bold px-2 py-0.5 cordel-border-sm bg-[var(--cordel-bg)] text-[var(--cordel-text)]">
            {roleOrInstrument}
          </span>
          <span className="text-[10px] font-cactus font-bold px-2 py-0.5 cordel-border-sm bg-[var(--cordel-bg)] text-[var(--cordel-text)]">
            {lateraliteLabel}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          onClose();
          onLogout();
        }}
        className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-cactus font-bold text-xs hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer"
      >
        <LogOut className="w-3.5 h-3.5 shrink-0" />
        <span>{lang === 'fr' ? 'Se déconnecter' : 'Sair da conta'}</span>
      </button>
    </div>
  );
};
