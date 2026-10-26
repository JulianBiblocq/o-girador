import React from 'react';
import { Play, Camera } from 'lucide-react';
import { CameraTimerSelector } from './CameraTimerSelector';
import { CameraTimerSec } from './useCameraTimerCountdown';

interface Props {
  beatsCount: number;
  onSelectBeatsCount: (count: number) => void;
  timerSec: CameraTimerSec;
  onSelectTimer: (sec: CameraTimerSec) => void;
  onTrigger: () => void;
  isCountingDown: boolean;
  lang: 'fr' | 'pt';
}

export const PhotoBoothCaptureControls: React.FC<Props> = ({
  beatsCount,
  onSelectBeatsCount,
  timerSec,
  onSelectTimer,
  onTrigger,
  isCountingDown,
  lang,
}) => {
  const modes: { count: number; labelFr: string; labelPt: string }[] = [
    { count: 1, labelFr: '1 (Fixe)', labelPt: '1 (Fixo)' },
    { count: 4, labelFr: '4 Temps', labelPt: '4 Tempos' },
    { count: 5, labelFr: '5 Temps', labelPt: '5 Tempos' },
  ];

  return (
    <div className="flex flex-wrap justify-between items-center gap-2 bg-[#eaddcf]/50 p-2 border border-black/15 rounded-sm">
      {/* 1. Sélecteur de mode [ 1 | 4 | 5 ] */}
      <div className="flex items-center gap-1.5 text-xs font-bold">
        <span>{lang === 'fr' ? 'Mode :' : 'Modo :'}</span>
        {modes.map((m) => (
          <button
            key={m.count}
            type="button"
            disabled={isCountingDown}
            onClick={() => onSelectBeatsCount(m.count)}
            className={`px-2 py-0.5 border border-black text-xs font-cactus font-bold cursor-pointer transition-colors ${
              beatsCount === m.count
                ? 'bg-[#8b2a1a] text-white shadow-xs'
                : 'bg-white text-black hover:bg-black/10'
            }`}
          >
            {lang === 'fr' ? m.labelFr : m.labelPt}
          </button>
        ))}
      </div>

      {/* 2. Retardateur compact en mode 1 photo */}
      <div className="flex items-center gap-2">
        {beatsCount === 1 && (
          <CameraTimerSelector
            timerSec={timerSec}
            onSelectTimer={onSelectTimer}
            disabled={isCountingDown}
          />
        )}

        {/* 3. Bouton Déclencher / Démarrer */}
        <button
          type="button"
          disabled={isCountingDown}
          onClick={onTrigger}
          className="px-4 py-1.5 bg-[#8b2a1a] hover:bg-[#6b1e11] text-white font-cactus font-bold text-sm border border-black shadow-[2px_2px_0px_#000] cursor-pointer flex items-center gap-1.5 disabled:opacity-50 transition-transform active:scale-95"
          title={lang === 'fr' ? 'Déclencher (ou Barre Espace)' : 'Capturar (ou Barra de Espaço)'}
        >
          {beatsCount === 1 ? (
            <Camera size={14} className="shrink-0" />
          ) : (
            <Play size={14} fill="currentColor" className="shrink-0" />
          )}
          <span>
            {beatsCount === 1
              ? lang === 'fr'
                ? 'Déclencher'
                : 'Capturar'
              : lang === 'fr'
              ? 'Démarrer'
              : 'Iniciar'}
          </span>
        </button>
      </div>
    </div>
  );
};
