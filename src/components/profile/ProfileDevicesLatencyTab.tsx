import React from 'react';
import { Volume2, Headphones, Radio, Plus, Trash2, Eye, Zap } from 'lucide-react';
import { useBluetoothLatencyStore, getProfileDisplayName } from '../../utils/bluetoothLatencyStore';
import { btTranslations } from '../../utils/bluetoothTranslations';
import { ProfileAudioHardwareSummary } from './ProfileAudioHardwareSummary';

interface ProfileDevicesLatencyTabProps {
  lang: 'fr' | 'pt';
  onCloseProfileModal: () => void;
}

export const ProfileDevicesLatencyTab: React.FC<ProfileDevicesLatencyTabProps> = ({
  lang,
  onCloseProfileModal,
}) => {
  const isPt = lang === 'pt', t = btTranslations[lang];
  const profiles = useBluetoothLatencyStore((s) => s.profiles);
  const activeProfileId = useBluetoothLatencyStore((s) => s.activeProfileId);
  const offsetMs = useBluetoothLatencyStore((s) => s.bluetoothVisualOffsetMs);
  const setActiveProfile = useBluetoothLatencyStore((s) => s.setActiveProfile);
  const setOffsetMs = useBluetoothLatencyStore((s) => s.setBluetoothVisualOffsetMs);
  const addProfile = useBluetoothLatencyStore((s) => s.addProfile);
  const updateProfile = useBluetoothLatencyStore((s) => s.updateProfile);
  const deleteProfile = useBluetoothLatencyStore((s) => s.deleteProfile);
  const openModal = useBluetoothLatencyStore((s) => s.openModal);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];
  const renderIcon = (type: string) =>
    type === 'bt_headphones' ? <Headphones size={13} className="shrink-0" />
    : type === 'bt_speaker' ? <Radio size={13} className="shrink-0" />
    : <Volume2 size={13} className="shrink-0" />;

  return (
    <div className="flex flex-col gap-3 text-left">
      <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--cordel-text-muted)]">
        {isPt ? '100% local neste aparelho — sincroniza baquetas Ao Vivo e áudio Bluetooth' : '100 % local sur cet appareil — synchronise baguettes Ao Vivo et écoute Bluetooth'}
      </div>

      <section className="p-2.5 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-cactus font-bold text-xs uppercase text-[var(--cordel-text)]">
            {isPt ? 'Aparelho de Escuta Ativo' : 'Appareil d\'Écoute Actif'}
          </span>
          <button
            type="button"
            onClick={() => addProfile({ name: t.newDevice, type: 'custom', offsetMs: 200 })}
            className="px-2 py-0.5 border border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] hover:border-[var(--cordel-accent-readable)] font-cactus font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer"
          >
            <Plus size={11} /> <span>{t.newDevice}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-0.5">
          {profiles.map((p) => {
            const isActive = p.id === activeProfileId;
            const isFactory = ['speaker', 'bt_speaker', 'bt_headphones'].includes(p.id);
            return (
              <div
                key={p.id}
                onClick={() => setActiveProfile(p.id)}
                className={`px-2 py-1.5 border-2 flex items-center justify-between gap-1.5 cursor-pointer transition-colors ${
                  isActive
                    ? 'border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] shadow-[1.5px_1.5px_0_var(--cordel-shadow-color)]'
                    : 'border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:border-[var(--cordel-accent-readable)]'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {renderIcon(p.type)}
                  <span className="font-cactus font-bold text-xs truncate">{getProfileDisplayName(p, lang)}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono text-[10px] font-bold">{p.offsetMs} ms</span>
                  {!isFactory && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); deleteProfile(p.id); }}
                      className="p-0.5 opacity-75 hover:opacity-100 cursor-pointer"
                      title={isPt ? 'Excluir' : 'Supprimer'}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {activeProfile && (
          <div className="pt-2 border-t border-[var(--cordel-border)]/35 flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="text"
                value={activeProfile.name}
                onChange={(e) => updateProfile(activeProfile.id, { name: e.target.value })}
                placeholder={t.profileNamePrompt}
                className="flex-1 h-7 px-2 border border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] text-xs font-mono font-bold outline-none focus:border-[var(--cordel-accent-readable)]"
              />
              <div className="flex items-center gap-1 shrink-0">
                {[-10, -5, 5, 10].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setOffsetMs(offsetMs + d)}
                    className="px-1.5 h-7 border border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] hover:bg-[var(--cordel-accent)] hover:text-[var(--cordel-on-accent)] font-mono font-bold text-[10px] cursor-pointer"
                  >
                    {d > 0 ? `+${d}` : d}
                  </button>
                ))}
                <span className="min-w-[54px] text-right font-mono font-black text-xs text-[var(--cordel-accent-readable)]">{offsetMs} ms</span>
              </div>
            </div>

            <input
              type="range" min={0} max={600} step={5} value={offsetMs}
              onChange={(e) => setOffsetMs(parseInt(e.target.value, 10))}
              className="w-full accent-[var(--cordel-accent)] cursor-pointer h-2"
            />

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button" onClick={() => openModal('ping')}
                className="py-1.5 px-2 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] font-cactus font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-[1.5px_1.5px_0_var(--cordel-shadow-color)]"
              >
                <Zap size={12} /> <span>{t.btnPing3Beeps}</span>
              </button>
              <button
                type="button" onClick={() => openModal('visual')}
                className="py-1.5 px-2 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] hover:border-[var(--cordel-accent-readable)] text-[var(--cordel-text)] font-cactus font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye size={12} /> <span>{t.btnFineTuneVisual}</span>
              </button>
            </div>
          </div>
        )}
      </section>

      <ProfileAudioHardwareSummary lang={lang} onCloseProfileModal={onCloseProfileModal} />
    </div>
  );
};
