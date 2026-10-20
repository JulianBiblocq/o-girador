import React, { useState, useEffect, useRef } from 'react';
import { User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserDropdownMenu } from './google-login/UserDropdownMenu';

interface GoogleLoginButtonProps {
  className?: string;
  lang?: 'fr' | 'pt';
  onAdminClick?: () => void;
  align?: 'left' | 'right' | 'auto';
  size?: 'normal' | 'large';
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  className = '',
  lang = 'pt',
  onAdminClick,
  align = 'auto',
  size = 'normal',
}) => {
  const { currentUser, userProfile, signInWithGoogle, logout, loading, isAdmin } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [computedAlign, setComputedAlign] = useState<'left' | 'right'>(align === 'left' ? 'left' : 'right');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    if (align === 'left' || align === 'right') {
      setComputedAlign(align);
      return;
    }
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setComputedAlign(rect.left < window.innerWidth / 2 ? 'left' : 'right');
    }
  }, [dropdownOpen, align]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  if (loading) {
    return (
      <div className={`${className} flex justify-center items-center w-12 h-9 opacity-50`}>
        <span className="animate-spin font-cactus">⚙️</span>
      </div>
    );
  }

  if (currentUser && userProfile) {
    const avatarDim = size === 'large' ? 'w-11 h-11 sm:w-12 sm:h-12' : 'w-8 h-8';
    const iconDim = size === 'large' ? 'w-6 h-6' : 'w-5 h-5';

    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="cursor-pointer flex justify-center items-center rounded-full hover:opacity-80 transition-opacity"
          title={userProfile.displayName || 'Profil'}
        >
          {userProfile.photoURL ? (
            <img
              src={userProfile.photoURL}
              alt={userProfile.displayName || 'User'}
              className={`${avatarDim} rounded-full border-2 border-[var(--cordel-border)] object-cover shadow-sm`}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={`${avatarDim} rounded-full border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] flex justify-center items-center text-[var(--cordel-text)] shadow-sm`}>
              <User className={iconDim} />
            </div>
          )}
        </button>

        {dropdownOpen && (
          <UserDropdownMenu
            userProfile={userProfile}
            currentUser={currentUser}
            isAdmin={isAdmin}
            computedAlign={computedAlign}
            lang={lang}
            onAdminClick={onAdminClick}
            onClose={() => setDropdownOpen(false)}
            onLogout={logout}
          />
        )}
      </div>
    );
  }

  const btnDim = size === 'large' ? 'w-14 h-11 sm:w-16 sm:h-12' : 'w-12 h-9';
  const svgDim = size === 'large' ? 'w-6 h-6' : 'w-5 h-5';

  return (
    <div className={className}>
      <button
        onClick={signInWithGoogle}
        className={`bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] text-[var(--cordel-text)] cordel-button ${btnDim} cursor-pointer flex justify-center items-center hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors shadow-sm`}
        title={lang === 'fr' ? 'Se connecter avec Google' : 'Conectar com o Google'}
      >
        <svg viewBox="0 0 24 24" className={svgDim} fill="currentColor">
          <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.113-5.211 4.113-3.467 0-6.277-2.81-6.277-6.277s2.81-6.277 6.277-6.277c1.558 0 2.973.568 4.072 1.503L21.05 4.41C18.665 2.195 15.602 1 11.916 1 5.887 1 11.916 5.887 11.916 11.916S5.887 22.83 11.916 22.83c6.177 0 10.99-4.346 10.99-10.914 0-.648-.073-1.28-.2-1.63H12.24z" />
        </svg>
      </button>
    </div>
  );
};
