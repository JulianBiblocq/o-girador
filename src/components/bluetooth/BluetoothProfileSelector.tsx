/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Sélecteur et gestionnaire rapide de profils d'écoute (< 130 lignes).
 */
import React from 'react';
import { useBluetoothLatencyStore } from '../../utils/bluetoothLatencyStore';
import { btTranslations } from '../../utils/bluetoothTranslations';
import { Volume2, Headphones, Radio, Plus, Trash2, Zap, Eye } from 'lucide-react';

interface Props {
  lang: 'fr' | 'pt';
  onSelectTab: (tab: 'ping' | 'visual') => void;
  onClose: () => void;
}

export const BluetoothProfileSelector: React.FC<Props> = ({ lang, onSelectTab, onClose }) => {
  const t = btTranslations[lang];
  const { profiles, activeProfileId, setActiveProfile, addProfile, deleteProfile } = useBluetoothLatencyStore();

  const getIcon = (type: string) => {
    if (type === 'bt_headphones') return <Headphones size={15} />;
    if (type === 'bt_speaker') return <Radio size={15} />;
    return <Volume2 size={15} />;
  };

  const handleAdd = () => {
    addProfile({
      name: lang === 'pt' ? 'Novo aparelho' : 'Nouvel appareil',
      type: 'custom',
      offsetMs: 200,
    });
  };

  return (
    <div className="flex flex-col gap-3 select-none">
      <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
        {profiles.map((p) => {
          const isActive = p.id === activeProfileId;
          const isBase = ['speaker', 'bt_speaker', 'bt_headphones'].includes(p.id);
          return (
            <div
              key={p.id}
              onClick={() => setActiveProfile(p.id)}
              className={`p-2 border-2 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                isActive
                  ? 'border-black bg-[#b94a2c] text-[#f4ecd8] shadow-[1px_1px_0_#000]'
                  : 'border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] hover:border-[#b94a2c]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {getIcon(p.type)}
                <span className="text-xs font-cactus font-bold truncate">{p.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xs font-bold">{p.offsetMs} ms</span>
                {!isBase && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProfile(p.id);
                    }}
                    className="p-1 hover:text-red-400 opacity-60 hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleAdd}
          className="flex-1 h-8 border border-[var(--cordel-border)] bg-[var(--cordel-card-btn-bg)] font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1"
        >
          <Plus size={13} />
          <span>{lang === 'pt' ? 'Adicionar perfil' : 'Ajouter un profil'}</span>
        </button>
      </div>

      <div className="border-t border-[var(--cordel-border)] pt-2 flex gap-2">
        <button
          type="button"
          onClick={() => onSelectTab('ping')}
          className="flex-1 h-8 border border-[var(--cordel-border)] bg-[var(--cordel-card-btn-bg)] font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1 text-[#2a9d8f]"
        >
          <Zap size={13} />
          <span>{t.btnPing3Beeps}</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('visual')}
          className="flex-1 h-8 border border-[var(--cordel-border)] bg-[var(--cordel-card-btn-bg)] font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1 text-[#b94a2c]"
        >
          <Eye size={13} />
          <span>{t.btnFineTuneVisual}</span>
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full h-8 border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase mt-1"
      >
        {t.btnCancel}
      </button>
    </div>
  );
};
