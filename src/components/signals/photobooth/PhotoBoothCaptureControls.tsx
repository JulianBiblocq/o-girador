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
    <div className="flex flex-wrap justify-between items-center gap-2 bg-[var(--cordel-surface)] text-[var(--cordel-text)] p-2.5 border border-[var(--cordel-border)] rounded-sm">
      <div className="flex items-center gap-1.5 text-xs font-bold">
        <span>{lang === 'fr' ? 'Mode :' : 'Modo :'}</span>
        {modes.map((m) => (
          <button
            key={m.count}
            type="button"
            disabled={isCountingDown}
            onClick={() => onSelectBeatsCount(m.count)}
            className={`px-2 py-0.5 border border-[var(--cordel-border-strong)] text-xs font-cactus font-bold cursor-pointer transition-colors ${
              beatsCount === m.count
                ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]'
                : 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:border-[var(--cordel-accent-readable)]'
            }`}
          >
            {lang === 'fr' ? m.labelFr : m.labelPt}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {beatsCount === 1 && (
          <CameraTimerSelector
            timerSec={timerSec}
            onSelectTimer={onSelectTimer}
            disabled={isCountingDown}
          />
        )}

        <button
          type="button"
          disabled={isCountingDown}
          onClick={onTrigger}
          className="px-4 py-1.5 bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] font-cactus font-bold text-sm border-2 border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer flex items-center gap-1.5 disabled:opacity-50 transition-transform active:scale-95"
          title={lang === 'fr' ? 'Déclencher (ou Barre Espace)' : 'Capturar (ou Barra de Espaço)'}
        >
          {beatsCount === 1 ? (
            <Camera size={14} className="shrink-0" />
          ) : (
            <Play size={14} fill="currentColor" className="shrink-0" />
          )}
          <span>
            {beatsCount === 1
              ? (lang === 'fr' ? 'Déclencher' : 'Capturar')
              : (lang === 'fr' ? 'Démarrer' : 'Iniciar')}
          </span>
        </button>
      </div>
    </div>
  );
};
