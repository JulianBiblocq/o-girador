import React from 'react';
import { User, LogIn, ShieldCheck, Music2, Users } from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfile } from '../../contexts/auth/authTypes';
import { formatUserRoleLabel } from '../../utils/userPreferencesStorage';

interface ProfileIdentityBannerProps {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  lang: 'fr' | 'pt';
  onSignIn: () => void;
}

export const ProfileIdentityBanner: React.FC<ProfileIdentityBannerProps> = ({
  currentUser,
  userProfile,
  lang,
  onSignIn,
}) => {
  const isPt = lang === 'pt';

  if (!currentUser) {
    return (
      <div className="p-3 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-[2px_2px_0_var(--cordel-shadow-color)]">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-9 h-9 shrink-0 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] flex items-center justify-center text-[var(--cordel-text)]">
            <User size={18} />
          </div>
          <div className="min-w-0">
            <div className="font-cactus font-bold text-xs uppercase tracking-wide text-[var(--cordel-text)]">
              {isPt ? 'Modo Visitante (Aparelho Local)' : 'Mode Visiteur (Appareil Local)'}
            </div>
            <p className="text-[11px] text-[var(--cordel-text-muted)] leading-snug mt-0.5">
              {isPt
                ? 'Suas preferências ficam salvas neste aparelho. Conecte-se para sincronizar seu grupo Organizador.'
                : 'Vos préférences sont mémorisées sur cet appareil. Connectez-vous pour synchroniser votre profil Organizador.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSignIn}
          className="shrink-0 px-3 py-1.5 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] font-cactus font-bold text-[11px] uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0_var(--cordel-shadow-color)] transition-colors"
        >
          <LogIn size={13} />
          <span>{isPt ? 'Entrar com Google' : 'Se connecter avec Google'}</span>
        </button>
      </div>
    );
  }

  const roleLabel = formatUserRoleLabel(userProfile, lang);
  const groupLabel = userProfile?.groupName || userProfile?.groupId || null;
  const orgInstrument = (userProfile?.instrument || '').trim() || null;
  const displayName = userProfile?.displayName || currentUser.displayName || (isPt ? 'Músico' : 'Musicien');

  return (
    <div className="p-3 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] flex flex-col gap-2 shadow-[2px_2px_0_var(--cordel-shadow-color)]">
      <div className="flex items-center gap-2.5 min-w-0">
        {currentUser.photoURL ? (
          <img
            src={currentUser.photoURL}
            alt={displayName}
            referrerPolicy="no-referrer"
            className="w-10 h-10 shrink-0 rounded-full border-2 border-[var(--cordel-border-strong)] object-cover"
          />
        ) : (
          <div className="w-10 h-10 shrink-0 rounded-full border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] font-cactus font-bold text-sm flex items-center justify-center">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-cactus font-bold text-sm text-[var(--cordel-text)] truncate">{displayName}</div>
          <div className="text-[11px] font-mono text-[var(--cordel-text-muted)] truncate">{currentUser.email}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--cordel-border)]/35">
        {groupLabel && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]">
            <Users size={11} className="shrink-0" />
            <span className="truncate max-w-[140px]">{groupLabel}</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)]">
          <ShieldCheck size={11} className="shrink-0 text-[var(--cordel-accent-readable)]" />
          <span>{roleLabel}</span>
        </span>
        {orgInstrument && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)]">
            <Music2 size={11} className="shrink-0 text-[var(--cordel-accent-readable)]" />
            <span>Organizador : {orgInstrument}</span>
          </span>
        )}
      </div>
    </div>
  );
};
