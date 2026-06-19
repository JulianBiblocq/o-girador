import React, { useState, useEffect, useRef } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { LogOut, User } from 'lucide-react';

export interface GoogleUserProfile {
  iss?: string;
  nbf?: number;
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: boolean;
  azp?: string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  iat?: number;
  exp?: number;
  jti?: string;
}

interface GoogleLoginButtonProps {
  onProfileUpdate?: (profile: GoogleUserProfile | null) => void;
  className?: string;
  lang?: 'fr' | 'pt';
}

export function isValidGoogleClientId(id: string | undefined | null): boolean {
  if (!id) return false;
  const trimmed = id.trim();
  return (
    trimmed !== '' &&
    trimmed !== 'undefined' &&
    trimmed !== 'null' &&
    !trimmed.includes('YOUR_GOOGLE_CLIENT_ID') &&
    /^\d/.test(trimmed) &&
    trimmed.endsWith('.apps.googleusercontent.com')
  );
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '601273236123-e90og6lr85v5ca2lprke41igbs02alrv.apps.googleusercontent.com';
const hasGoogleClientId = isValidGoogleClientId(googleClientId);

const GoogleLoginButtonActive: React.FC<GoogleLoginButtonProps> = ({
  onProfileUpdate,
  className = '',
}) => {
  const [profile, setProfile] = useState<GoogleUserProfile | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('o_girador_user_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setProfile(parsed);
        if (onProfileUpdate) {
          onProfileUpdate(parsed);
        }
      } catch (err) {
        console.error('Failed to parse saved user profile:', err);
        localStorage.removeItem('o_girador_user_profile');
      }
    }
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        });
        const profileData = await res.json();
        setProfile(profileData);
        localStorage.setItem('o_girador_user_profile', JSON.stringify(profileData));
        if (onProfileUpdate) {
          onProfileUpdate(profileData);
        }
        console.log('Google Sign-In Success:', profileData);
      } catch (error) {
        console.error('Error fetching user profile info:', error);
      }
    },
    onError: (error) => {
      console.error('Google Sign-In Failed:', error);
    },
  });

  const handleLogout = () => {
    googleLogout();
    setProfile(null);
    setDropdownOpen(false);
    localStorage.removeItem('o_girador_user_profile');
    if (onProfileUpdate) {
      onProfileUpdate(null);
    }
    console.log('Google Logged Out');
  };

  if (profile) {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] cordel-button w-12 h-9 p-0 cursor-pointer flex justify-center items-center hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors"
          title={profile.name || 'Profil'}
        >
          {profile.picture ? (
            <img
              src={profile.picture}
              alt={profile.name || 'User'}
              className="w-6 h-6 rounded-full border border-[var(--cordel-border)] object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <User className="w-5 h-5 text-current" />
          )}
        </button>

        {dropdownOpen && (
          <div className="absolute top-10 right-0 bg-[var(--cordel-bg)] cordel-border shadow-[4px_4px_0_var(--cordel-border)] min-w-[200px] z-[1000] flex flex-col p-3 gap-3 select-none">
            <div className="flex flex-col border-b border-[var(--cordel-border)]/30 pb-2">
              <span className="text-xs font-cactus font-bold text-[var(--cordel-text)] truncate">
                {profile.name}
              </span>
              <span className="text-[10px] font-sans text-[var(--cordel-text)] opacity-60 truncate">
                {profile.email}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-cactus font-bold text-xs hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Se déconnecter</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        onClick={() => login()}
        className="bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] text-[var(--cordel-text)] cordel-button w-12 h-9 cursor-pointer flex justify-center items-center hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors"
        title="Se connecter avec Google"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.113-5.211 4.113-3.467 0-6.277-2.81-6.277-6.277s2.81-6.277 6.277-6.277c1.558 0 2.973.568 4.072 1.503L21.05 4.41C18.665 2.195 15.602 1 11.916 1 5.887 1 11.916 5.887 11.916 11.916S5.887 22.83 11.916 22.83c6.177 0 10.99-4.346 10.99-10.914 0-.648-.073-1.28-.2-1.63H12.24z"/>
        </svg>
      </button>
    </div>
  );
};

const GoogleLoginButtonDisabled: React.FC<GoogleLoginButtonProps> = ({
  className = '',
  lang = 'pt',
}) => {
  const titleText = lang === 'pt'
    ? "Login Google indisponível (modo offline)"
    : "Connexion Google indisponible (mode hors-ligne)";

  return (
    <div className={className}>
      <button
        disabled
        className="bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] text-[var(--cordel-text)] opacity-40 cursor-not-allowed w-12 h-9 flex justify-center items-center"
        title={titleText}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.113-5.211 4.113-3.467 0-6.277-2.81-6.277-6.277s2.81-6.277 6.277-6.277c1.558 0 2.973.568 4.072 1.503L21.05 4.41C18.665 2.195 15.602 1 11.916 1 5.887 1 11.916 5.887 11.916 11.916S5.887 22.83 11.916 22.83c6.177 0 10.99-4.346 10.99-10.914 0-.648-.073-1.28-.2-1.63H12.24z"/>
        </svg>
      </button>
    </div>
  );
};

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = (props) => {
  if (!hasGoogleClientId) {
    return <GoogleLoginButtonDisabled {...props} />;
  }
  return <GoogleLoginButtonActive {...props} />;
};
