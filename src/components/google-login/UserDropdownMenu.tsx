/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { LogOut, Shield, Upload, Link } from 'lucide-react';
import { useEstandarteUpload } from './useEstandarteUpload';

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
  onAdminClick,
  onClose,
  onLogout,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isUploading, handleFileUpload } = useEstandarteUpload(currentUser, onClose);

  return (
    <div
      className={`absolute top-12 ${computedAlign === 'left' ? 'left-0' : 'right-0'} bg-[var(--cordel-bg)] cordel-border shadow-[4px_4px_0_var(--cordel-border)] min-w-[220px] max-w-[calc(100vw-24px)] z-[1000] flex flex-col p-3 gap-3 select-none box-border`}
    >
      <div className="flex flex-col border-b border-[var(--cordel-border)]/30 pb-2 gap-2">
        <div>
          <span className="text-xs font-cactus font-bold text-[var(--cordel-text)] truncate flex items-center gap-1">
            {userProfile.displayName}
            {isAdmin && (
              <span title={lang === 'fr' ? 'Administrateur' : 'Administrador'}>
                <Shield size={12} className="text-[#8b2a1a]" />
              </span>
            )}
          </span>
          <span className="text-[10px] font-sans text-[var(--cordel-text)] opacity-60 truncate block">
            {userProfile.email}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-1 pt-1 border-t border-[var(--cordel-border)]/20">
          {(userProfile.groupName || userProfile.groupId) && (
            <span className="text-[10px] font-cactus font-bold px-2 py-0.5 cordel-border-sm bg-[var(--cordel-wood)]/10 text-[var(--cordel-wood)] flex items-center gap-1">
              🥁 {userProfile.groupName || userProfile.groupId}
            </span>
          )}
          <span className="text-[10px] font-cactus font-bold px-2 py-0.5 cordel-border-sm bg-[var(--cordel-bg)] text-[var(--cordel-text)]">
            {userProfile.role === 'admin'
              ? '🛡️ Admin'
              : userProfile.role === 'mestre'
              ? (lang === 'fr' ? '👑 Maître' : '👑 Mestre')
              : userProfile.role === 'membre'
              ? (lang === 'fr' ? '🥁 Membre' : '🥁 Membro')
              : userProfile.role === 'eleve'
              ? (lang === 'fr' ? '🎓 Élève' : '🎓 Aluno')
              : (lang === 'fr' ? '👤 Visiteur' : '👤 Visitante')}
          </span>
          {userProfile.lateralite && (
            <span className="text-[10px] font-cactus font-bold px-2 py-0.5 cordel-border-sm bg-[var(--cordel-bg)] text-[var(--cordel-text)]">
              {userProfile.lateralite === 'gaucher' ? (lang === 'fr' ? '🫲 Gaucher' : '🫲 Canhoto') : (lang === 'fr' ? '🫱 Droitier' : '🫱 Destro')}
            </span>
          )}
        </div>
      </div>

      {isAdmin && onAdminClick && (
        <button
          type="button"
          onClick={() => {
            onClose();
            onAdminClick();
          }}
          className="flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-[var(--cordel-bg)] text-[#8b2a1a] border border-[#8b2a1a] font-cactus font-bold text-xs hover:bg-[#8b2a1a] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>{lang === 'fr' ? 'Administration' : 'Administração'}</span>
        </button>
      )}

      {(userProfile.role === 'mestre' || isAdmin) && (
        <>
          <button
            type="button"
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}?invite=${currentUser.uid}`;
              navigator.clipboard.writeText(url);
              alert(lang === 'fr' ? "Lien d'invitation copié ! Envoyez-le à vos élèves pour qu'ils rejoignent votre groupe." : 'Link de convite copiado! Envie-o para seus alunos para entrarem no grupo.');
              onClose();
            }}
            className="flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-[var(--cordel-bg)] text-[#27ae60] border border-[#27ae60] font-cactus font-bold text-xs hover:bg-[#27ae60] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer"
          >
            <Link className="w-3.5 h-3.5" />
            <span>{lang === 'fr' ? 'Inviter des élèves' : 'Convidar alunos'}</span>
          </button>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-[var(--cordel-bg)] text-[#2980b9] border border-[#2980b9] font-cactus font-bold text-xs hover:bg-[#2980b9] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer disabled:opacity-50"
          >
            {isUploading ? <span className="animate-spin">⚙️</span> : <Upload className="w-3.5 h-3.5" />}
            <span>{lang === 'fr' ? 'Mon étendard' : 'Meu Estandarte'}</span>
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() => {
          onClose();
          onLogout();
        }}
        className="flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-cactus font-bold text-xs hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>{lang === 'fr' ? 'Se déconnecter' : 'Sair da conta'}</span>
      </button>
    </div>
  );
};
