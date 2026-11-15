import React from 'react';
import { LogOut, Shield, SlidersHorizontal, Users, Music2, Hand } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import {
  isSuperAdminProfile,
  formatUserRoleLabel,
  formatWorkingInstrumentLabel,
} from '../../utils/userPreferencesStorage';

interface DropdownProps {
  userProfile: any;
  currentUser: any;
  computedAlign: 'left' | 'right';
  lang: 'fr' | 'pt';
  onAdminClick?: () => void;
  onClose: () => void;
  onLogout: () => void;
}

export const UserDropdownMenu: React.FC<DropdownProps> = ({
  userProfile,
  currentUser,
  computedAlign,
  lang,
  onAdminClick,
  onClose,
  onLogout,
}) => {
  const isPt = lang === 'pt';
  const isLeftHanded = useSequencerStore((s) => s.isLeftHanded);
  const preferredInst = useSequencerStore((s) => s.preferredInstrumentName);
  const setIsProfileModalOpen = useSequencerSettingsStore((s) => s.setIsProfileModalOpen);

  const displayName = userProfile?.displayName || currentUser?.displayName || (isPt ? 'Membro' : 'Membre');
  const email = userProfile?.email || currentUser?.email;
  const groupLabel = userProfile?.groupName || userProfile?.groupId || null;
  const isSuperAdmin = isSuperAdminProfile(userProfile);
  const roleLabel = formatUserRoleLabel(userProfile, lang);
  const activeInstrumentLabel = preferredInst
    ? formatWorkingInstrumentLabel({ ...userProfile, preferredInstrument: preferredInst }, lang)
    : formatWorkingInstrumentLabel(userProfile, lang);
  const lateraliteLabel = isLeftHanded ? (isPt ? 'Canhoto' : 'Gaucher') : (isPt ? 'Destro' : 'Droitier');

  return (
    <div
      className={`absolute top-11 ${
        computedAlign === 'left' ? 'left-0' : 'right-0'
      } bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border-strong)] shadow-[4px_4px_0_var(--cordel-shadow-color)] min-w-[250px] max-w-[calc(100vw-24px)] z-[1000] flex flex-col p-3 gap-2.5 select-none box-border text-left`}
    >
      <div className="flex flex-col border-b border-[var(--cordel-border)]/40 pb-2.5 gap-2">
        <div>
          <span className="text-xs font-cactus font-bold text-[var(--cordel-text)] truncate flex items-center gap-1.5">
            <span className="truncate">{displayName}</span>
            {isSuperAdmin && (
              <span title="Super-Admin">
                <Shield size={12} className="text-[var(--cordel-accent-readable)] shrink-0" />
              </span>
            )}
          </span>
          {email && (
            <span className="text-[10px] font-mono text-[var(--cordel-text-muted)] truncate block mt-0.5">
              {email}
            </span>
          )}
        </div>

        {/* 4 badges clairs : Groupe · Rôle (Mestre invariant) · Instrument actif · Latéralité */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[var(--cordel-border)]/25">
          {groupLabel && (
            <span className="inline-flex items-center gap-1 text-[10px] font-cactus font-bold px-2 py-0.5 border border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]">
              <Users size={10} className="shrink-0" />
              <span className="truncate max-w-[130px]">{groupLabel}</span>
            </span>
          )}
          <span className="text-[10px] font-cactus font-bold px-2 py-0.5 border border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)]">
            {roleLabel}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-cactus font-bold px-2 py-0.5 border border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text)]">
            <Music2 size={10} className="shrink-0 text-[var(--cordel-accent-readable)]" />
            <span className="truncate max-w-[120px]">{activeInstrumentLabel}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-cactus font-bold px-2 py-0.5 border border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text)]">
            <Hand size={10} className="shrink-0 text-[var(--cordel-accent-readable)]" />
            <span>{lateraliteLabel}</span>
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => { onClose(); setIsProfileModalOpen(true); }}
        className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-xs uppercase shadow-[2px_2px_0_var(--cordel-shadow-color)] transition-colors cursor-pointer"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
        <span>{isPt ? 'Meu Perfil & Preferências' : 'Mon Profil & Préférences'}</span>
      </button>

      {isSuperAdmin && onAdminClick && (
        <button
          type="button"
          onClick={() => { onClose(); onAdminClick(); }}
          className="flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-[var(--cordel-surface-elevated)] hover:border-[var(--cordel-accent-readable)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase transition-colors cursor-pointer"
        >
          <Shield className="w-3.5 h-3.5 shrink-0 text-[var(--cordel-accent-readable)]" />
          <span>{isPt ? 'Administração' : 'Administration'}</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => { onClose(); onLogout(); }}
        className="flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-[var(--cordel-surface)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-cactus font-bold text-xs hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer"
      >
        <LogOut className="w-3.5 h-3.5 shrink-0" />
        <span>{isPt ? 'Sair da conta' : 'Se déconnecter'}</span>
      </button>
    </div>
  );
};
