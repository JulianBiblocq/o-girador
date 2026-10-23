/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Sélecteur et gestionnaire rapide de profils d'écoute (< 130 lignes).
 */
import React from 'react';
import { useBluetoothLatencyStore, getProfileDisplayName } from '../../utils/bluetoothLatencyStore';
import { btTranslations } from '../../utils/bluetoothTranslations';
import { BluetoothQuickAdjuster } from './BluetoothQuickAdjuster';
import { Volume2, Headphones, Radio, Plus, Trash2 } from 'lucide-react';

interface Props {
  lang: 'fr' | 'pt';
  onSelectTab: (tab: 'ping' | 'visual') => void;
  onClose: () => void;
}

export const BluetoothProfileSelector: React.FC<Props> = ({ lang, onSelectTab, onClose }) => {
  const t = btTranslations[lang];
  const { profiles, activeProfileId, setActiveProfile, addProfile, deleteProfile } = useBluetoothLatencyStore();

  const getIcon = (type: string) => {
    if (type === 'bt_headphones') return <Headphones size={14} className="shrink-0" />;
    if (type === 'bt_speaker') return <Radio size={14} className="shrink-0" />;
    return <Volume2 size={14} className="shrink-0" />;
  };

  const handleAdd = () => {
    addProfile({
      name: t.newDevice,
      type: 'custom',
      offsetMs: 200,
    });
  };

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  return (
    <div className="flex flex-col gap-2.5 select-none">
      {/* Liste des appareils */}
      <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-0.5">
        {profiles.map((p) => {
          const isActive = p.id === activeProfileId;
          const isBase = ['speaker', 'bt_speaker', 'bt_headphones'].includes(p.id);
          const name = getProfileDisplayName(p, lang);
          return (
            <div
              key={p.id}
              onClick={() => setActiveProfile(p.id)}
              className={`px-2 py-1.5 border-2 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                isActive
                  ? 'border-black bg-[#b94a2c] text-[#f4ecd8] shadow-[1px_1px_0_#000]'
                  : 'border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] hover:border-[#b94a2c]'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {getIcon(p.type)}
                <span className="text-xs font-cactus font-bold truncate">{name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-[11px] font-bold opacity-85">{p.offsetMs} ms</span>
                {!isBase && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProfile(p.id);
                    }}
                    className="p-1 hover:text-red-400 opacity-60 hover:opacity-100 cursor-pointer"
                    title={lang === 'pt' ? 'Excluir' : 'Supprimer'}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="w-full h-7 border border-[var(--cordel-border)] bg-[var(--cordel-card-btn-bg)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1 cursor-pointer"
      >
        <Plus size={13} />
        <span>{t.newDevice}</span>
      </button>

      {/* Retouche directe et outillage pour le profil actif */}
      {activeProfile && (
        <BluetoothQuickAdjuster
          profile={activeProfile}
          lang={lang}
          onSelectTab={onSelectTab}
        />
      )}

      <button
        type="button"
        onClick={onClose}
        className="w-full h-8 border-2 border-black bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-surface)] font-cactus font-bold text-xs uppercase shadow-[1px_1px_0_#000] cursor-pointer"
      >
        {t.btnCancel}
      </button>
    </div>
  );
};
