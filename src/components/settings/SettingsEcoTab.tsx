import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { SettingsCachePurgeButton } from './SettingsCachePurgeButton';

interface SettingsEcoTabProps {
  lang: string;
  confirmAsync?: (msg: string) => Promise<boolean>;
  alertAsync?: (msg: string) => Promise<void>;
}

export const SettingsEcoTab: React.FC<SettingsEcoTabProps> = ({
  lang,
  confirmAsync,
  alertAsync,
}) => {
  const isEcoMode = useSequencerStore((state) => state.isEcoMode);
  const ecoConfig = useSequencerStore((state) => state.ecoConfig);
  const toggleEcoMode = useSequencerStore((state) => state.toggleEcoMode);
  const toggleEcoOption = useSequencerStore((state) => state.toggleEcoOption);

  return (
    <div className="flex flex-col gap-6 text-left">
      <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[4px_10px_6px_12px] p-4 bg-white shadow-[3.5px_3.5px_0px_#000]">
        <h3 className="font-cactus font-bold text-sm uppercase mb-1 flex items-center gap-1.5 border-b border-black/10 pb-1">
          {lang === 'fr' ? 'Optimisation & Mode Éco' : 'Otimização & Modo Eco'}
        </h3>
        <p className="text-[10px] opacity-75 mb-4">
          {lang === 'pt'
            ? 'Ative o modo econômico para aliviar o processador (CPU/GPU) em dispositivos mais modestos.'
            : 'Activez le mode économique pour soulager le processeur (CPU/GPU) sur les appareils modestes.'}
        </p>

        <div className="flex items-center gap-3 border-2 border-black p-3 bg-[#eaddcf]/20 mb-4">
          <button
            onClick={toggleEcoMode}
            className={`px-4 py-2 font-cactus font-bold text-xs uppercase border-2 border-black cursor-pointer transition-colors shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
              isEcoMode ? 'bg-[#8b2a1a] text-[#fdfaf2]' : 'bg-white text-[#1a1a1a] hover:bg-black/5'
            }`}
          >
            {isEcoMode ? (lang === 'fr' ? 'Actif' : 'Ativo') : (lang === 'fr' ? 'Désactivé' : 'Desativado')}
          </button>
          <div className="flex flex-col">
            <span className="font-cactus font-bold text-xs uppercase">
              {lang === 'fr' ? 'Interrupteur Général Mode Éco' : 'Chave Geral Modo Eco'}
            </span>
            <span className="text-[9px] opacity-70">
              {lang === 'fr' ? 'Réduit drastiquement la charge CPU globale.' : 'Reduz drasticamente o consumo geral de CPU.'}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 pl-2 border-l-2 border-black/20">
          <label className="flex items-center gap-3 cursor-pointer hover:bg-black/5 p-1 transition-colors select-none">
            <input
              type="checkbox"
              className="w-4 h-4 cursor-pointer accent-black"
              checked={!!ecoConfig?.disableFx}
              onChange={() => toggleEcoOption('disableFx')}
            />
            <div className="flex flex-col">
              <span className="font-cactus text-xs font-bold text-black uppercase">
                {lang === 'fr' ? 'Désactiver les Effets (Reverb/Compressor)' : 'Desativar Efeitos (Reverb/Compressor)'}
              </span>
              <span className="text-[9px] opacity-70">
                {lang === 'fr' ? 'Bypasse la réverbération spatiale et la compression master.' : 'Ignora a reverberação espacial e compressão master.'}
              </span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer hover:bg-black/5 p-1 transition-colors select-none">
            <input
              type="checkbox"
              className="w-4 h-4 cursor-pointer accent-black"
              checked={!!ecoConfig?.disableEq}
              onChange={() => toggleEcoOption('disableEq')}
            />
            <div className="flex flex-col">
              <span className="font-cactus text-xs font-bold text-black uppercase">
                {lang === 'fr' ? 'Désactiver les Égaliseurs par piste' : 'Desativar Equalizadores por canal'}
              </span>
              <span className="text-[9px] opacity-70">
                {lang === 'fr' ? "Bypasse les bandes d'égalisation individuelles sur le mixeur." : 'Ignora as bandas de equalização individuais no mixer.'}
              </span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer hover:bg-black/5 p-1 transition-colors select-none">
            <input
              type="checkbox"
              className="w-4 h-4 cursor-pointer accent-black"
              checked={!!ecoConfig?.disableAnimations}
              onChange={() => toggleEcoOption('disableAnimations')}
            />
            <div className="flex flex-col">
              <span className="font-cactus text-xs font-bold text-black uppercase">
                {lang === 'fr' ? 'Désactiver les Animations (30 FPS)' : 'Desativar Animações (30 FPS)'}
              </span>
              <span className="text-[9px] opacity-70">
                {lang === 'fr' ? "Limite l'affichage à 30 FPS pour soulager le GPU." : 'Limita o display a 30 FPS para aliviar o GPU.'}
              </span>
            </div>
          </label>
        </div>
      </div>

      <SettingsCachePurgeButton lang={lang} />
    </div>
  );
};
