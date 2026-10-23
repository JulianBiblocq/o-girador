/**
 * Carte d'accueil Cordel pour le premier calage Bluetooth (< 130 lignes).
 */
import React, { useState } from 'react';
import { useBluetoothLatencyStore } from '../../utils/bluetoothLatencyStore';
import { btTranslations } from '../../utils/bluetoothTranslations';
import { Smartphone, Radio, Headphones, Zap, Eye, Play, Check } from 'lucide-react';

interface Props {
  lang: 'fr' | 'pt';
  onLaunchTool: (tool: 'ping' | 'visual') => void;
  onDone: () => void;
}

export const BluetoothOnboardingCard: React.FC<Props> = ({ lang, onLaunchTool, onDone }) => {
  const t = btTranslations[lang];
  const { setActiveProfile, setHasCompletedOnboarding } = useBluetoothLatencyStore();
  const [selectedType, setSelectedType] = useState<'speaker' | 'bt_speaker' | 'bt_headphones' | null>(null);

  const selectDevice = (id: 'speaker' | 'bt_speaker' | 'bt_headphones') => {
    setActiveProfile(id);
    if (id === 'speaker') {
      setHasCompletedOnboarding(true);
      onDone();
    } else {
      setSelectedType(id);
    }
  };

  const handleDone = () => {
    setHasCompletedOnboarding(true);
    onDone();
  };

  return (
    <div className="flex flex-col gap-3 select-none text-[var(--cordel-text)]">
      <p className="text-xs opacity-85 leading-relaxed">{t.onboardingDesc}</p>
      <div className="flex flex-col gap-2">
        {/* 1. Téléphone ou Câble */}
        <div
          onClick={() => selectDevice('speaker')}
          className="p-2.5 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] hover:border-[#b94a2c] cursor-pointer flex items-center justify-between gap-3 shadow-[1px_1px_0_#000] active:translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-[var(--cordel-border)] bg-[var(--cordel-card-btn-bg)] flex items-center justify-center shrink-0">
              <Smartphone size={18} />
            </div>
            <div className="text-left">
              <div className="text-xs font-cactus font-bold">{t.optSpeaker}</div>
              <div className="text-[10px] opacity-70 leading-tight">{t.optSpeakerDesc}</div>
            </div>
          </div>
          <span className="text-[10px] font-cactus font-bold text-[#2a9d8f] uppercase shrink-0">0 ms</span>
        </div>

        {/* 2. Enceinte sans fil */}
        <div
          onClick={() => selectDevice('bt_speaker')}
          className={`p-2.5 border-2 cursor-pointer flex flex-col gap-2 shadow-[1px_1px_0_#000] ${
            selectedType === 'bt_speaker' ? 'border-black bg-[var(--cordel-card-btn-bg)]' : 'border-[var(--cordel-border)] bg-[var(--cordel-surface)] hover:border-[#b94a2c]'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border border-[var(--cordel-border)] bg-[var(--cordel-bg)] flex items-center justify-center shrink-0"><Radio size={18} /></div>
              <div className="text-left"><div className="text-xs font-cactus font-bold">{t.optBtSpeaker}</div><div className="text-[10px] opacity-70 leading-tight">{t.optBtSpeakerDesc}</div></div>
            </div>
            {selectedType === 'bt_speaker' && <Check size={16} className="text-[#2a9d8f]" />}
          </div>
          {selectedType === 'bt_speaker' && (
            <div className="flex gap-2 pt-1 border-t border-[var(--cordel-border)]">
              <button type="button" onClick={() => onLaunchTool('ping')} className="flex-1 h-8 px-2 border-2 border-black bg-[#2a9d8f] text-[#f4ecd8] font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1 shadow-[1px_1px_0_#000]">
                <Zap size={13} /><span>{t.btnPing3Beeps}</span>
              </button>
              <button type="button" onClick={handleDone} className="flex-1 h-8 px-2 border border-[var(--cordel-border)] bg-[var(--cordel-surface)] font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1">
                <Play size={13} /><span>{t.btnPlayNow}</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. Casque sans fil */}
        <div
          onClick={() => selectDevice('bt_headphones')}
          className={`p-2.5 border-2 cursor-pointer flex flex-col gap-2 shadow-[1px_1px_0_#000] ${
            selectedType === 'bt_headphones' ? 'border-black bg-[var(--cordel-card-btn-bg)]' : 'border-[var(--cordel-border)] bg-[var(--cordel-surface)] hover:border-[#b94a2c]'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border border-[var(--cordel-border)] bg-[var(--cordel-bg)] flex items-center justify-center shrink-0"><Headphones size={18} /></div>
              <div className="text-left"><div className="text-xs font-cactus font-bold">{t.optBtHeadphones}</div><div className="text-[10px] opacity-70 leading-tight">{t.optBtHeadphonesDesc}</div></div>
            </div>
            {selectedType === 'bt_headphones' && <Check size={16} className="text-[#2a9d8f]" />}
          </div>
          {selectedType === 'bt_headphones' && (
            <div className="flex gap-2 pt-1 border-t border-[var(--cordel-border)]">
              <button type="button" onClick={() => onLaunchTool('visual')} className="flex-1 h-8 px-2 border-2 border-black bg-[#b94a2c] text-[#f4ecd8] font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1 shadow-[1px_1px_0_#000]">
                <Eye size={13} /><span>{t.btnFineTuneVisual}</span>
              </button>
              <button type="button" onClick={handleDone} className="flex-1 h-8 px-2 border border-[var(--cordel-border)] bg-[var(--cordel-surface)] font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1">
                <Play size={13} /><span>{t.btnPlayNow}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

