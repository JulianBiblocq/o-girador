import React, { useState } from 'react';
import { Headphones, RefreshCw } from 'lucide-react';
import { useAudioStore } from '../../stores/useAudioStore';
import { notifyToast } from '../../utils/toastHelper';

interface SettingsAudioTabProps {
  lang: string;
  alertAsync?: (msg: string) => Promise<void>;
}

export const SettingsAudioTab: React.FC<SettingsAudioTabProps> = ({ lang, alertAsync }) => {
  const selectedOutputDeviceId = useAudioStore((state) => state.selectedOutputDeviceId);
  const availableOutputDevices = useAudioStore((state) => state.availableOutputDevices);
  const setSelectedOutputDeviceId = useAudioStore((state) => state.setSelectedOutputDeviceId);
  const refreshAudioOutputDevices = useAudioStore((state) => state.refreshAudioOutputDevices);
  const [isAskingPermission, setIsAskingPermission] = useState(false);

  const handleRequestAudioPermission = async () => {
    setIsAskingPermission(true);
    try {
      await refreshAudioOutputDevices();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const errMsg = lang === 'fr'
        ? 'Impossible de rafraîchir les périphériques : ' + message
        : 'Erro ao atualizar dispositivos: ' + message;
      if (alertAsync) await alertAsync(errMsg);
      else notifyToast(errMsg, 'error');
    } finally {
      setIsAskingPermission(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      <div className="border-2 border-[var(--cordel-border)] rounded-[3px_6px_4px_8px] p-4 bg-[var(--cordel-surface)] text-[var(--cordel-text)] shadow-[3px_3px_0px_var(--cordel-shadow-color)]">
        <h3 className="font-cactus font-bold text-sm uppercase text-[var(--cordel-text)] mb-3 flex items-center gap-2 border-b border-[var(--cordel-border)]/35 pb-1.5">
          <Headphones size={15} className="text-[var(--cordel-accent-readable)] shrink-0" />
          <span>{lang === 'fr' ? 'Périphériques de Sortie Audio' : 'Dispositivos de Saída de Áudio'}</span>
        </h3>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRequestAudioPermission}
              disabled={isAskingPermission}
              className="px-4 py-2 font-cactus font-bold text-xs uppercase border-2 border-[var(--cordel-border-strong)] cursor-pointer transition-colors shadow-[2px_2px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] hover:bg-[var(--cordel-accent)] disabled:opacity-60 flex items-center gap-2"
            >
              <RefreshCw size={13} className={isAskingPermission ? 'animate-spin shrink-0' : 'shrink-0'} />
              <span>
                {isAskingPermission
                  ? (lang === 'fr' ? 'Détection...' : 'Detectando...')
                  : (lang === 'fr' ? 'Lister les Sorties Audio' : 'Listar Saídas de Áudio')}
              </span>
            </button>
            <span className="text-[11px] font-sans text-[var(--cordel-text-muted)] font-semibold">
              {lang === 'fr'
                ? 'Cliquez pour rafraîchir la liste des sorties et casques.'
                : 'Clique para atualizar a lista de saídas e fones.'}
            </span>
          </div>

          <div className="mt-1 max-w-md">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--cordel-text)]">
                {lang === 'fr' ? 'Sortie (Haut-parleurs / Casque) :' : 'Saída (Alto-falantes / Fones) :'}
              </label>
              <select
                value={selectedOutputDeviceId || ''}
                onChange={(e) => setSelectedOutputDeviceId(e.target.value || null)}
                className="bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] p-2 font-mono font-bold text-xs outline-none cursor-pointer focus:border-[var(--cordel-accent-readable)] w-full truncate shadow-[1.5px_1.5px_0px_var(--cordel-shadow-color)]"
              >
                <option value="">{lang === 'fr' ? '-- Par défaut --' : '-- Padrão --'}</option>
                {availableOutputDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || (lang === 'fr' ? `Sortie (${device.deviceId.slice(0, 6)}...)` : `Saída (${device.deviceId.slice(0, 6)}...)`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
