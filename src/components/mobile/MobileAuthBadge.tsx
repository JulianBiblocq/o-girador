import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { formatUserRoleLabel } from '../../utils/userPreferencesStorage';

interface Props {
  lang?: 'fr' | 'pt';
}

export const MobileAuthBadge: React.FC<Props> = ({ lang = 'pt' }) => {
  const { currentUser, userProfile, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [imgError, setImgError] = useState(false);
  const openVisitorAuthModal = useSequencerStore((s) => s.openVisitorAuthModal);
  const setIsProfileModalOpen = useSequencerSettingsStore((s) => s.setIsProfileModalOpen);
  const ref = useRef<HTMLDivElement>(null);
  const isPt = lang === 'pt';

  useEffect(() => {
    if (!showDropdown) return;
    const onOutside = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('touchstart', onOutside);
    };
  }, [showDropdown]);

  const [cachedProfile] = useState(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('girador_user_cached_profile') : null;
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const activeUser = currentUser || (cachedProfile ? { displayName: cachedProfile.displayName } : null);

  if (!activeUser) {
    return (
      <button
        type="button"
        onClick={() => openVisitorAuthModal()}
        className="h-8 px-2 inline-flex items-center gap-1.5 box-border border border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] font-cactus font-bold text-[10px] sm:text-xs uppercase tracking-wide shadow-[1px_1px_0_var(--cordel-shadow-color)] hover:bg-[var(--cordel-accent)] hover:text-[var(--cordel-on-accent)] active:translate-y-0.5 cursor-pointer shrink-0"
        title={isPt ? 'Conectar-se' : 'Se connecter'}
      >
        <User size={13} className="shrink-0 text-[var(--cordel-accent-readable)]" />
        <span>{isPt ? 'Entrar' : 'Connexion'}</span>
      </button>
    );
  }

  const photoURL = userProfile?.photoURL || currentUser?.photoURL || cachedProfile?.photoURL;
  const displayName = userProfile?.displayName || currentUser?.displayName || cachedProfile?.displayName || currentUser?.email || 'U';
  const initial = displayName[0].toUpperCase();
  const groupLabel = userProfile?.groupName || cachedProfile?.groupName || (userProfile as any)?.association || null;
  const roleLabel = formatUserRoleLabel(userProfile, lang);

  return (
    <div className="relative shrink-0 select-none" ref={ref}>
      <button
        type="button"
        onClick={() => setShowDropdown((prev) => !prev)}
        className="h-8 px-2 inline-flex items-center gap-1.5 box-border border border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] shadow-[1px_1px_0_var(--cordel-shadow-color)] active:translate-y-0.5 cursor-pointer font-cactus font-bold text-xs"
        title={currentUser?.email || displayName}
      >
        {photoURL && !imgError ? (
          <img
            src={photoURL} alt="" referrerPolicy="no-referrer" onError={() => setImgError(true)}
            className="w-5 h-5 rounded-full object-cover border border-[var(--cordel-border)] shrink-0"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
            {initial}
          </div>
        )}
        {groupLabel && <span className="max-w-[70px] truncate text-[9px] uppercase">{groupLabel}</span>}
      </button>

      {showDropdown && (
        <div className="absolute top-10 right-0 z-50 bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border-strong)] shadow-[4px_4px_0_var(--cordel-shadow-color)] p-2.5 min-w-[195px] flex flex-col gap-2 text-left">
          <div>
            <div className="text-[11px] font-cactus font-bold text-[var(--cordel-text)] truncate">{displayName}</div>
            <div className="text-[9px] font-mono text-[var(--cordel-text-muted)] uppercase truncate">
              {groupLabel ? `${groupLabel} · ${roleLabel}` : roleLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setShowDropdown(false); setIsProfileModalOpen(true); }}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] font-cactus font-bold text-[10px] uppercase border border-[var(--cordel-border-strong)] cursor-pointer"
          >
            <SlidersHorizontal size={12} />
            <span>{isPt ? 'Perfil & Preferências' : 'Profil & Préférences'}</span>
          </button>
          <button
            type="button"
            onClick={() => { setShowDropdown(false); void logout(); }}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-[var(--cordel-surface)] text-[var(--cordel-text)] font-cactus font-bold text-[10px] uppercase border border-[var(--cordel-border)] hover:bg-[var(--cordel-accent)] hover:text-[var(--cordel-on-accent)] cursor-pointer"
          >
            <LogOut size={12} />
            <span>{isPt ? 'Sair' : 'Déconnexion'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
