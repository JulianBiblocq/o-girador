import React from 'react';
import { GoogleLoginButton } from '../GoogleLoginButton';
import { useSequencer } from '../../contexts/SequencerContext';
import { useTransportStore } from '../../stores/useTransportStore';

interface HeaderProfileSectionProps {
  lang: 'pt' | 'fr';
  onAdminClick?: () => void;
  onOpenSwingModal: () => void;
  onCloseMenu: () => void;
}

export const HeaderProfileSection: React.FC<HeaderProfileSectionProps> = ({
  lang,
  onAdminClick,
  onOpenSwingModal,
  onCloseMenu,
}) => {
  const sequencer = useSequencer();
  const globalSwing = useTransportStore((state) => state.globalSwing);

  return (
    <div className="flex flex-col gap-2 border-b border-[var(--cordel-border)]/30 pb-3">
      <span className="text-[10px] font-bold text-[#d99b26] uppercase tracking-wide flex items-center gap-1">
        👤 {lang === 'pt' ? 'Perfil' : 'Profil'}
      </span>
      <div className="flex items-center gap-2">
        <GoogleLoginButton lang={lang} onAdminClick={onAdminClick} align="left" />
        <button
          onClick={() => {
            sequencer.setIsLeftHanded(!sequencer.isLeftHanded);
            onCloseMenu();
          }}
          className={`px-2 py-1.5 cordel-border-sm text-xs font-bold font-cactus cursor-pointer flex-1 ${
            sequencer.isLeftHanded
              ? 'bg-[var(--cordel-wood)] text-[#f4ecd8]'
              : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
          }`}
        >
          🫲 {lang === 'pt' ? 'Canhoto' : 'Gaucher'}
        </button>
      </div>
      <button
        onClick={() => {
          onOpenSwingModal();
          onCloseMenu();
        }}
        className={`px-2 py-1.5 cordel-border-sm text-xs font-bold font-cactus cursor-pointer flex justify-between items-center w-full mt-1 ${
          globalSwing.mode !== 'off'
            ? 'bg-[var(--cordel-wood)] text-[#f4ecd8]'
            : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
        }`}
      >
        <div className="flex items-center gap-1">
          <span className="text-[14px] leading-none">〰️</span> {lang === 'pt' ? 'Balanço' : 'Swing'}
        </div>
        <span>{globalSwing.mode === 'off' ? 'OFF' : globalSwing.mode === 'maracatu' ? 'ON' : 'CUST'}</span>
      </button>
    </div>
  );
};
