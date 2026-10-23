import React from 'react';
import * as Tone from 'tone';
import { BalancoEditorPanel } from '../balanco/BalancoEditorPanel';
import { useTransportStore } from '../../stores/useTransportStore';
import { metroChannel } from '../../audio/effectsChain';
import { GlobalSwing, Language } from '../../types';

interface SettingsGrooveTabProps {
  lang: Language;
}

export const SettingsGrooveTab: React.FC<SettingsGrooveTabProps> = ({ lang }) => {
  const globalSwing = useTransportStore((state) => state.globalSwing);
  const setGlobalSwing = useTransportStore((state) => state.setGlobalSwing);
  const isMetroOn = useTransportStore((state) => state.isMetroOn);
  const setIsMetroOn = useTransportStore((state) => state.setIsMetroOn);
  const metroVolume = useTransportStore((state) => state.metroVolume);
  const setMetroVolume = useTransportStore((state) => state.setMetroVolume);
  const metroSound = useTransportStore((state) => state.metroSound);
  const setMetroSound = useTransportStore((state) => state.setMetroSound);

  const handleMetroVolumeChange = (val: number) => {
    setMetroVolume(val);
    if (metroChannel && metroChannel.volume) {
      const gain = Math.max(0.00001, val / 100);
      const db = val === 0 ? -Infinity : Tone.gainToDb(gain);
      metroChannel.volume.value = db;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. BLOC GROOVE (BALANÇO COMPLET INLINE) */}
      <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[3px_6px_4px_8px] p-4 bg-white shadow-[3px_3px_0px_#000]">
        <h3 className="font-cactus font-bold text-sm uppercase mb-3 flex items-center gap-1.5 border-b border-black/10 pb-1">
          {lang === 'fr' ? 'Balanço Général' : 'Balanço Geral'}
        </h3>
        <BalancoEditorPanel
          globalSwing={globalSwing}
          setGlobalSwing={setGlobalSwing}
          lang={lang}
          compact={true}
        />
      </div>

      {/* 2. BLOC MÉTRONOME */}
      <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[3px_6px_4px_8px] p-4 bg-white shadow-[3px_3px_0px_#000]">
        <h3 className="font-cactus font-bold text-sm uppercase mb-3 flex items-center gap-1.5 border-b border-black/10 pb-1">
          {lang === 'fr' ? 'Métronome' : 'Metrônomo'}
        </h3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/5 pb-3">
            {/* Gauche : Activer Clic */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMetroOn(!isMetroOn)}
                className={`px-4 py-2 font-cactus font-bold text-xs uppercase border-2 border-black cursor-pointer transition-colors shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                  isMetroOn
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-black/5'
                }`}
              >
                {isMetroOn ? 'On' : 'Off'}
              </button>
              <span className="text-[10px] font-bold">
                {lang === 'pt' ? 'Ativar Clique' : 'Activer le Clic'}
              </span>
            </div>

            {/* Droite : Choix du son */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {lang === 'pt' ? 'Som :' : 'Son :'}
              </span>
              <select
                value={metroSound}
                onChange={(e) => setMetroSound(e.target.value as any)}
                className="bg-white border-2 border-black p-1.5 font-cactus font-bold text-xs uppercase outline-none cursor-pointer focus:bg-[#fbf8f0] min-w-[100px]"
              >
                <option value="synth">Synth</option>
                <option value="clave">Clave</option>
                <option value="cowbell">Cowbell</option>
              </select>
            </div>
          </div>

          {/* Volume */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span>Volume :</span>
              <span>{metroVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={metroVolume}
              onChange={(e) => handleMetroVolumeChange(parseInt(e.target.value, 10))}
              className="w-full accent-black cursor-pointer h-1.5 bg-black/10"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
