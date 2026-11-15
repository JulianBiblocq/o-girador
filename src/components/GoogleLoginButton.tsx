import React, { useState, useEffect, useRef } from 'react';
import { User, LogIn, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSequencerSettingsStore } from '../stores/useSequencerSettingsStore';
import { UserDropdownMenu } from './google-login/UserDropdownMenu';

interface GoogleLoginButtonProps {
  className?: string;
  lang?: 'fr' | 'pt';
  onAdminClick?: () => void;
  align?: 'left' | 'right' | 'auto';
  size?: 'normal' | 'large';
  showVisitorMenu?: boolean;
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  className = '',
  lang = 'pt',
  onAdminClick,
  align = 'auto',
  size = 'normal',
  showVisitorMenu = false,
}) => {
  const { currentUser, userProfile, signInWithGoogle, logout, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [computedAlign, setComputedAlign] = useState<'left' | 'right'>(align === 'left' ? 'left' : 'right');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isPt = lang === 'pt';

  useEffect(() => {
    if (!dropdownOpen) return;
    if (align === 'left' || align === 'right') { setComputedAlign(align); return; }
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setComputedAlign(rect.left < window.innerWidth / 2 ? 'left' : 'right');
    }
  }, [dropdownOpen, align]);

  useEffect(() => {
    const onOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('touchstart', onOutside);
    };
  }, []);

  if (loading) {
    return (
      <div className={`${className} flex justify-center items-center w-10 h-[34px] opacity-50`}>
        <User className="w-4 h-4 animate-pulse opacity-60" />
      </div>
    );
  }

  if (currentUser && userProfile) {
    const avatarDim = size === 'large' ? 'w-11 h-11 sm:w-12 sm:h-12' : 'w-[34px] h-[34px]';
    const iconDim = size === 'large' ? 'w-6 h-6' : 'w-4 h-4';
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="cursor-pointer flex justify-center items-center rounded-full hover:opacity-85 transition-opacity"
          title={userProfile.displayName || (isPt ? 'Perfil' : 'Profil')}
        >
          {userProfile.photoURL ? (
            <img src={userProfile.photoURL} alt={userProfile.displayName || 'User'} className={`${avatarDim} rounded-full border-2 border-[var(--cordel-border-strong)] object-cover shadow-xs`} referrerPolicy="no-referrer" />
          ) : (
            <div className={`${avatarDim} rounded-full border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface)] flex justify-center items-center text-[var(--cordel-text)] shadow-xs`}>
              <User className={iconDim} />
            </div>
          )}
        </button>
        {dropdownOpen && (
          <UserDropdownMenu userProfile={userProfile} currentUser={currentUser} computedAlign={computedAlign} lang={lang} onAdminClick={onAdminClick} onClose={() => setDropdownOpen(false)} onLogout={logout} />
        )}
      </div>
    );
  }

  const btnDim = size === 'large' ? 'w-14 h-11 sm:w-16 sm:h-12' : 'w-11 h-[34px]';
  const svgDim = size === 'large' ? 'w-6 h-6' : 'w-4 h-4';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => (showVisitorMenu ? setDropdownOpen((o) => !o) : void signInWithGoogle())}
        className={`bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] text-[var(--cordel-text)] cordel-button ${btnDim} cursor-pointer flex justify-center items-center hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors shadow-xs`}
        title={showVisitorMenu ? (isPt ? 'Perfil & Conexão' : 'Profil & Connexion') : (isPt ? 'Conectar com o Google' : 'Se connecter avec Google')}
      >
        {showVisitorMenu ? (
          <User className={svgDim} />
        ) : (
          <svg viewBox="0 0 24 24" className={svgDim} fill="currentColor">
            <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.113-5.211 4.113-3.467 0-6.277-2.81-6.277-6.277s2.81-6.277 6.277-6.277c1.558 0 2.973.568 4.072 1.503L21.05 4.41C18.665 2.195 15.602 1 11.916 1 5.887 1 11.916 5.887 11.916 11.916S5.887 22.83 11.916 22.83c6.177 0 10.99-4.346 10.99-10.914 0-.648-.073-1.28-.2-1.63H12.24z" />
          </svg>
        )}
      </button>

      {showVisitorMenu && dropdownOpen && (
        <div
          className={`absolute top-11 ${computedAlign === 'left' ? 'left-0' : 'right-0'} bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border-strong)] shadow-[4px_4px_0_var(--cordel-shadow-color)] min-w-[235px] z-[1000] flex flex-col p-2.5 gap-2 select-none`}
        >
          <button
            type="button"
            onClick={() => { setDropdownOpen(false); void signInWithGoogle(); }}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-xs uppercase shadow-[2px_2px_0_var(--cordel-shadow-color)] cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 shrink-0" />
            <span>{isPt ? 'Entrar com Google' : 'Se connecter avec Google'}</span>
          </button>
          <button
            type="button"
            onClick={() => { setDropdownOpen(false); useSequencerSettingsStore.getState().setIsProfileModalOpen(true); }}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-[var(--cordel-surface-elevated)] hover:border-[var(--cordel-accent-readable)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span>{isPt ? 'Meu Perfil & Preferências' : 'Mon Profil & Préférences'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
