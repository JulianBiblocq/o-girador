import React from 'react';
import { TrackGroup } from '../../types';

interface SettingsKitMacroEditorProps {
  track: TrackGroup;
  stroke: string;
  isVoice: boolean;
  isUsed: boolean;
  isStrokeCurrentlyActive: boolean;
  avgVolume: number;
  avgDecay: number;
  lang: string;
  onToggleForcedState: () => void;
  onClose: () => void;
  onVolumeChange: (val: number, delta: number) => void;
  onDecayChange: (val: number, delta: number) => void;
}

export const SettingsKitMacroEditor: React.FC<SettingsKitMacroEditorProps> = ({
  stroke,
  isVoice,
  isStrokeCurrentlyActive,
  avgVolume,
  avgDecay,
  lang,
  onToggleForcedState,
  onClose,
  onVolumeChange,
  onDecayChange,
}) => {
  return (
    <div className="mt-2 border-2 border-dashed border-black p-3 bg-white flex flex-col gap-3">
      <div className="flex justify-between items-center text-[10px] font-bold border-b border-black/10 pb-1.5 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span>
            🎚️ {lang === 'fr' ? `CONFIGURATION DE FRAPPE : [${stroke}]` : `CONFIGURAÇÃO DE BATIDA : [${stroke}]`}
          </span>
          <button
            onClick={onToggleForcedState}
            className={`px-2 py-0.5 border text-[9px] font-black uppercase tracking-wider cursor-pointer shadow-[1px_1px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all select-none ${
              isStrokeCurrentlyActive
                ? 'bg-green-600 text-white border-green-700 hover:bg-green-700'
                : 'bg-red-700 text-white border-red-800 hover:bg-red-800'
            }`}
            title={lang === 'fr'
              ? "Cliquez pour forcer l'activation ou la désactivation de cette frappe dans le kit"
              : 'Clique para forçar a ativação ou desativação desta batida no kit'}
          >
            {isStrokeCurrentlyActive
              ? (lang === 'fr' ? '● ACTIF' : '● ATIVO')
              : (lang === 'fr' ? '○ DÉSACTIVÉ' : '○ DESATIVADO')}
          </button>
        </div>
        <button
          onClick={onClose}
          className="text-[#8b2a1a] hover:underline uppercase font-bold text-[9px] cursor-pointer"
        >
          {lang === 'fr' ? 'Fermer' : 'Fechar'}
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[10px] font-bold">
          <span>🔊 {lang === 'fr' ? 'Volume Global :' : 'Volume Geral :'}</span>
          <span>{avgVolume}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={avgVolume}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            onVolumeChange(val, val - avgVolume);
          }}
          className="w-full accent-green-600 cursor-pointer h-1.5 bg-black/10"
        />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[10px] font-bold">
          <span>⏳ {isVoice ? (lang === 'fr' ? 'Durée Globale :' : 'Duração Geral :') : (lang === 'fr' ? 'Résonance Globale (Decay) :' : 'Ressonância Geral (Decay) :')}</span>
          <span>{avgDecay}%</span>
        </div>
        <input
          type="range"
          min="10"
          max="100"
          value={avgDecay}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            onDecayChange(val, val - avgDecay);
          }}
          className="w-full accent-[#8b2a1a] cursor-pointer h-1.5 bg-black/10"
        />
      </div>
    </div>
  );
};
