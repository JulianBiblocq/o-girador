import React, { useState } from 'react';
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
    } catch (err: any) {
      const errMsg = lang === 'fr'
        ? 'Impossible de rafraîchir les périphériques : ' + err.message
        : 'Erro ao atualizar dispositivos: ' + err.message;
      if (alertAsync) await alertAsync(errMsg);
      else notifyToast(errMsg, 'error');
    } finally {
      setIsAskingPermission(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[3px_6px_4px_8px] p-4 bg-white shadow-[3px_3px_0px_#000]">
        <h3 className="font-cactus font-bold text-sm uppercase mb-3 flex items-center gap-1.5 border-b border-black/10 pb-1">
          {lang === 'fr' ? 'Périphériques de Sortie Audio' : 'Dispositivos de Saída de Áudio'}
        </h3>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleRequestAudioPermission}
              disabled={isAskingPermission}
              className="px-4 py-2 font-cactus font-bold text-xs uppercase border-2 border-black cursor-pointer transition-colors shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none bg-[#8b2a1a] text-[#fdfaf2] hover:bg-[#1a1a1a] flex items-center gap-2"
            >
              {isAskingPermission
                ? (lang === 'fr' ? 'Détection...' : 'Detectando...')
                : (lang === 'fr' ? 'Lister les Sorties Audio' : 'Listar Saídas de Áudio')}
            </button>
            <span className="text-[10px] font-sans text-[#1a1a1a]/70">
              {lang === 'fr'
                ? 'Cliquez pour rafraîchir la liste des sorties et casques.'
                : 'Clique para atualizar a lista de saídas e fones.'}
            </span>
          </div>

          <div className="mt-1 max-w-md">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a]">
                {lang === 'fr' ? 'Sortie (Haut-parleurs / Casque) :' : 'Saída (Alto-falantes / Fones) :'}
              </label>
              <select
                value={selectedOutputDeviceId || ''}
                onChange={(e) => setSelectedOutputDeviceId(e.target.value || null)}
                className="bg-[#fbf8f0] border-2 border-black p-2 font-mono font-bold text-xs outline-none cursor-pointer focus:bg-white w-full truncate shadow-[1.5px_1.5px_0px_#000]"
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
