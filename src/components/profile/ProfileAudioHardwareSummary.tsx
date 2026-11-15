import React, { useState } from 'react';
import { Speaker, RefreshCw, Sliders } from 'lucide-react';
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';

interface ProfileAudioHardwareSummaryProps {
  lang: 'fr' | 'pt';
  onCloseProfileModal: () => void;
}

export const ProfileAudioHardwareSummary: React.FC<ProfileAudioHardwareSummaryProps> = ({
  lang,
  onCloseProfileModal,
}) => {
  const isPt = lang === 'pt';
  const selectedOutputDeviceId = useAudioStore((s) => s.selectedOutputDeviceId);
  const availableOutputDevices = useAudioStore((s) => s.availableOutputDevices);
  const refreshAudioOutputDevices = useAudioStore((s) => s.refreshAudioOutputDevices);
  const openOficinaSection = useSequencerSettingsStore((s) => s.openOficinaSection);
  const [refreshing, setRefreshing] = useState(false);

  const activeDevice = availableOutputDevices.find((d) => d.deviceId === selectedOutputDeviceId);
  const outputLabel = activeDevice?.label || (selectedOutputDeviceId
    ? `${isPt ? 'Saída' : 'Sortie'} (${selectedOutputDeviceId.slice(0, 6)}...)`
    : (isPt ? 'Saída padrão do sistema' : 'Sortie par défaut du système'));

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refreshAudioOutputDevices(); } finally { setRefreshing(false); }
  };

  const handleOpenOficinaAudio = () => {
    onCloseProfileModal();
    openOficinaSection('audio');
  };

  return (
    <section className="p-2.5 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-cactus font-bold text-xs uppercase text-[var(--cordel-text)]">
          <Speaker size={13} className="shrink-0 text-[var(--cordel-accent-readable)]" />
          <span>{isPt ? 'Saída de Áudio & Microfone Local' : 'Sortie Audio & Micro de cet Appareil'}</span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-2 py-0.5 border border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] hover:border-[var(--cordel-accent-readable)] text-[10px] font-cactus font-bold uppercase flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
          <span>{isPt ? 'Detectar' : 'Détecter'}</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
        <div className="font-mono text-[var(--cordel-text-muted)] truncate">
          <strong className="text-[var(--cordel-text)]">{isPt ? 'Saída ativa :' : 'Sortie active :'}</strong> {outputLabel}
        </div>
        <button
          type="button"
          onClick={handleOpenOficinaAudio}
          className="hidden md:inline-flex shrink-0 px-2.5 py-1 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] font-cactus font-bold text-[10px] uppercase items-center gap-1 cursor-pointer shadow-[1.5px_1.5px_0_var(--cordel-shadow-color)]"
        >
          <Sliders size={11} />
          <span>{isPt ? 'A Oficina -> Áudio' : 'A Oficina -> Audio'}</span>
        </button>
      </div>
    </section>
  );
};
