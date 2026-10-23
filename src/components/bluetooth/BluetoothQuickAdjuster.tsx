/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Ajustement rapide et renommage direct du profil d'écoute actif (< 110 lignes).
 */
import React from 'react';
import { Eye, Zap } from 'lucide-react';
import { useBluetoothLatencyStore, BluetoothDeviceProfile } from '../../utils/bluetoothLatencyStore';
import { btTranslations } from '../../utils/bluetoothTranslations';

interface BluetoothQuickAdjusterProps {
  profile: BluetoothDeviceProfile;
  lang: 'fr' | 'pt';
  onSelectTab: (tab: 'ping' | 'visual') => void;
}

export const BluetoothQuickAdjuster: React.FC<BluetoothQuickAdjusterProps> = ({
  profile,
  lang,
  onSelectTab,
}) => {
  const t = btTranslations[lang];
  const { bluetoothVisualOffsetMs, setBluetoothVisualOffsetMs, updateProfile } = useBluetoothLatencyStore();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateProfile(profile.id, { name: e.target.value });
  };

  const adjustOffset = (delta: number) => {
    const next = Math.max(0, Math.min(600, bluetoothVisualOffsetMs + delta));
    setBluetoothVisualOffsetMs(next);
  };

  return (
    <div className="flex flex-col gap-2.5 p-2.5 border-2 border-black bg-[var(--cordel-bg)] shadow-[2px_2px_0_#000]">
      {/* Champ de renommage direct */}
      <div className="flex flex-col gap-1">
        <label className="text-[9px] uppercase font-bold tracking-wider opacity-75 font-mono">
          {t.renameDevice}
        </label>
        <input
          type="text"
          value={profile.name}
          onChange={handleNameChange}
          placeholder={t.profileNamePrompt}
          className="w-full h-8 px-2 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-xs font-mono font-bold focus:outline-none focus:border-[#b94a2c]"
        />
      </div>

      {/* Contrôles de retouche rapide */}
      <div className="flex flex-col gap-1.5 pt-1 border-t border-[var(--cordel-border)]/30">
        <div className="flex justify-between items-center text-xs font-mono font-bold">
          <span className="text-[10px] opacity-60">0 ms</span>
          <span className="text-base text-[#b94a2c] font-cactus font-black tracking-wider">
            {bluetoothVisualOffsetMs} ms
          </span>
          <span className="text-[10px] opacity-60">600 ms</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => adjustOffset(-10)}
            className="flex-1 h-7 border border-[var(--cordel-border)] bg-[var(--cordel-card-btn-bg)] hover:bg-[#b94a2c] hover:text-[#f4ecd8] font-mono font-bold text-[11px] cursor-pointer"
          >
            -10 ms
          </button>
          <button
            type="button"
            onClick={() => adjustOffset(-5)}
            className="flex-1 h-7 border border-[var(--cordel-border)] bg-[var(--cordel-card-btn-bg)] hover:bg-[#b94a2c] hover:text-[#f4ecd8] font-mono font-bold text-[11px] cursor-pointer"
          >
            -5 ms
          </button>
          <button
            type="button"
            onClick={() => adjustOffset(5)}
            className="flex-1 h-7 border border-[var(--cordel-border)] bg-[var(--cordel-card-btn-bg)] hover:bg-[#b94a2c] hover:text-[#f4ecd8] font-mono font-bold text-[11px] cursor-pointer"
          >
            +5 ms
          </button>
          <button
            type="button"
            onClick={() => adjustOffset(10)}
            className="flex-1 h-7 border border-[var(--cordel-border)] bg-[var(--cordel-card-btn-bg)] hover:bg-[#b94a2c] hover:text-[#f4ecd8] font-mono font-bold text-[11px] cursor-pointer"
          >
            +10 ms
          </button>
        </div>

        <input
          type="range"
          min={0}
          max={600}
          step={5}
          value={bluetoothVisualOffsetMs}
          onChange={(e) => setBluetoothVisualOffsetMs(parseInt(e.target.value, 10))}
          className="w-full accent-[#b94a2c] cursor-pointer h-2.5 mt-0.5"
        />
      </div>

      {/* Outils de vérification */}
      <div className="flex gap-2 pt-1 border-t border-[var(--cordel-border)]/30">
        <button
          type="button"
          onClick={() => onSelectTab('visual')}
          className="flex-1 h-7 border border-[var(--cordel-border)] bg-[var(--cordel-card-btn-bg)] hover:bg-[#b94a2c] hover:text-[#f4ecd8] font-cactus font-bold text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer"
        >
          <Eye size={12} />
          <span>{t.btnFineTuneVisual}</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('ping')}
          className="flex-1 h-7 border border-[var(--cordel-border)] bg-[var(--cordel-card-btn-bg)] hover:bg-[#2a9d8f] hover:text-[#f4ecd8] font-cactus font-bold text-[10px] uppercase flex items-center justify-center gap-1 text-[#2a9d8f] cursor-pointer"
        >
          <Zap size={12} />
          <span>{t.btnPing3Beeps}</span>
        </button>
      </div>
    </div>
  );
};
