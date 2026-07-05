import React, { useState, useEffect, useRef } from 'react';
import { LogOut, User, Shield, Image as ImageIcon, Upload, Link } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

interface GoogleLoginButtonProps {
  className?: string;
  lang?: 'fr' | 'pt';
  onAdminClick?: () => void;
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  className = '',
  lang = 'pt',
  onAdminClick,
}) => {
  const { currentUser, userProfile, signInWithGoogle, logout, loading, updateUserProfileField } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    
    // Only accept images
    if (!file.type.startsWith('image/')) {
      alert("Veuillez sélectionner une image.");
      return;
    }

    try {
      setIsUploading(true);
      
      // Read file and resize via Canvas to keep it small for Firestore (Base64)
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to webp or jpeg
          const dataUrl = canvas.toDataURL('image/webp', 0.8);
          
          // Verify size (Firestore limit is 1MB per document)
          if (dataUrl.length > 800000) {
            alert("L'image est trop volumineuse même après compression.");
            setIsUploading(false);
            return;
          }

          try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userDocRef, { groupLogoUrl: dataUrl });
            alert("Votre logo a été mis à jour avec succès ! Rechargez la page pour voir les changements.");
          } catch (err) {
            console.error("Erreur Firestore:", err);
            alert("Erreur lors de la sauvegarde.");
          } finally {
            setIsUploading(false);
            setDropdownOpen(false);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error("Erreur générale:", error);
      alert("Une erreur est survenue.");
      setIsUploading(false);
      setDropdownOpen(false);
    }
  };

  if (loading) {
    return (
      <div className={`${className} flex justify-center items-center w-12 h-9 opacity-50`}>
        <span className="animate-spin font-cactus">⚙️</span>
      </div>
    );
  }

  if (currentUser && userProfile) {
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
              className="w-8 h-8 rounded-full border-2 border-[var(--cordel-border)] object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] flex justify-center items-center text-[var(--cordel-text)]">
              <User className="w-5 h-5" />
            </div>
          )}
        </button>

        {dropdownOpen && (
          <div className="absolute top-10 right-0 bg-[var(--cordel-bg)] cordel-border shadow-[4px_4px_0_var(--cordel-border)] min-w-[200px] z-[1000] flex flex-col p-3 gap-3 select-none">
            <div className="flex flex-col border-b border-[var(--cordel-border)]/30 pb-2 gap-2">
              <div>
                <span className="text-xs font-cactus font-bold text-[var(--cordel-text)] truncate flex items-center gap-1">
                  {userProfile.displayName}
                  {userProfile.role === 'admin' && <Shield size={12} className="text-[#8b2a1a]" title="Administrateur" />}
                </span>
                <span className="text-[10px] font-sans text-[var(--cordel-text)] opacity-60 truncate block">
                  {userProfile.email}
                </span>
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold uppercase text-[var(--cordel-text)]/70">
                  {lang === 'fr' ? 'Mon Instrument' : 'Meu Instrumento'}
                </label>
                <select
                  value={userProfile.instrument || 'caixa'}
                  onChange={(e) => updateUserProfileField('instrument', e.target.value)}
                  className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-1 text-xs font-bold w-full rounded outline-none"
                >
                  <option value="alfaia">Alfaia</option>
                  <option value="caixa">Caixa</option>
                  <option value="gongue">Gonguê</option>
                  <option value="agbe">Agbê</option>
                  <option value="timbal">Timbal</option>
                </select>
              </div>
            </div>
            {userProfile.role === 'admin' && onAdminClick && (
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onAdminClick();
                }}
                className="flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-[var(--cordel-bg)] text-[#8b2a1a] border border-[#8b2a1a] font-cactus font-bold text-xs hover:bg-[#8b2a1a] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Administration</span>
              </button>
            )}

            {(userProfile.role === 'mestre' || userProfile.role === 'admin') && (
              <>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}${window.location.pathname}?invite=${currentUser.uid}`;
                    navigator.clipboard.writeText(url);
                    alert("Lien d'invitation copié ! Envoyez-le à vos élèves pour qu'ils rejoignent votre groupe.");
                    setDropdownOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-[var(--cordel-bg)] text-[#27ae60] border border-[#27ae60] font-cactus font-bold text-xs hover:bg-[#27ae60] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer"
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>Inviter Élèves</span>
                </button>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-[var(--cordel-bg)] text-[#2980b9] border border-[#2980b9] font-cactus font-bold text-xs hover:bg-[#2980b9] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? <span className="animate-spin">⚙️</span> : <Upload className="w-3.5 h-3.5" />}
                  <span>Mon Estandarte</span>
                </button>
              </>
            )}

            <button
              onClick={() => {
                setDropdownOpen(false);
                logout();
              }}
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
        onClick={signInWithGoogle}
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

