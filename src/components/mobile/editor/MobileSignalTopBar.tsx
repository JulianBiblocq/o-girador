/**
 * Bandeau supérieur compact de saisie et médias pour Signes du Mestre (< 70 lignes).
 */

import React, { useRef } from 'react';
import { Camera, Image as ImageIcon, FlipHorizontal, Lock } from 'lucide-react';
import { tMobile } from '../../../i18n/mobileTranslations';

interface Props {
  name: string;
  setName: (val: string) => void;
  mode: 'single' | 'four' | 'batch';
  setMode: (m: 'single' | 'four' | 'batch') => void;
  isMirror: boolean;
  onToggleMirror: () => void;
  lockFraming: boolean;
  onToggleLockFraming: () => void;
  onTriggerLiveCamera: () => void;
  onFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  lang: 'fr' | 'pt';
}

export const MobileSignalTopBar: React.FC<Props> = ({
  name, setName, mode, setMode, isMirror, onToggleMirror,
  lockFraming, onToggleLockFraming, onTriggerLiveCamera, onFiles, lang,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-1.5 p-2 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] shadow-[1px_1px_0px_var(--cordel-border)]">
      <div className="flex gap-1.5 items-center">
        <input
          type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder={tMobile(lang, 'signalName')}
          className="flex-1 min-w-0 px-2 py-1 text-xs border border-[var(--cordel-border)] bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] font-cactus font-bold"
        />
        <div className="flex border border-[var(--cordel-border)] overflow-hidden shrink-0">
          {(['single', 'four', 'batch'] as const).map((m) => (
            <button
              key={m} onClick={() => setMode(m)}
              className={`px-2 py-1 text-[10px] font-cactus font-bold uppercase transition-colors cursor-pointer ${
                mode === m ? 'bg-[#b94a2c] text-[#f4ecd8] font-extrabold' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)]'
              }`}
            >
              {m === 'single' ? '1P' : m === 'four' ? '4T' : 'Lot'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button onClick={onTriggerLiveCamera} className="flex-1 py-1 px-1.5 border border-[var(--cordel-border)] text-[10px] font-cactus font-bold uppercase bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] flex items-center justify-center gap-1 cursor-pointer">
          <Camera size={12} /> <span>{tMobile(lang, 'camera')}</span>
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-1 px-1.5 border border-[var(--cordel-border)] text-[10px] font-cactus font-bold uppercase bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] flex items-center justify-center gap-1 cursor-pointer">
          <ImageIcon size={12} /> <span>{tMobile(lang, 'gallery')}</span>
        </button>
        <button onClick={onToggleMirror} className={`px-2 py-1 border border-[var(--cordel-border)] text-[10px] font-cactus font-bold uppercase flex items-center gap-1 cursor-pointer ${isMirror ? 'bg-[#b94a2c] text-[#f4ecd8]' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)]'}`}>
          <FlipHorizontal size={12} /> <span>{tMobile(lang, 'mirror')}</span>
        </button>
        <button onClick={onToggleLockFraming} className={`px-2 py-1 border border-[var(--cordel-border)] text-[10px] font-cactus font-bold uppercase flex items-center gap-1 cursor-pointer ${lockFraming ? 'bg-[#b94a2c] text-[#f4ecd8]' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)]'}`}>
          <Lock size={12} /> <span>{tMobile(lang, 'lockFraming')}</span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple={mode !== 'single'} onChange={onFiles} className="hidden" />
      </div>
    </div>
  );
};
