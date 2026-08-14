import React from 'react';
import { usePerformanceStore } from '../stores/usePerformanceStore';

export const TelemetryBadge: React.FC = () => {
  const currentFps = usePerformanceStore((state) => state.currentFps);
  const ram = usePerformanceStore((state) => state.ram);
  const cores = usePerformanceStore((state) => state.cores);
  const isUltraEcoMode = usePerformanceStore((state) => state.isUltraEcoMode);
  const setUltraEcoMode = usePerformanceStore((state) => state.setUltraEcoMode);

  // Calcule la couleur de la pastille ou de la bordure selon les FPS
  const getFpsColorClass = (fps: number) => {
    if (fps >= 50) return 'text-[#27ae60] border-[#27ae60]';
    if (fps >= 30) return 'text-[#d35400] border-[#d35400]';
    return 'text-[#c0392b] border-[#c0392b]';
  };

  return (
    <div className="bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] p-4 shadow-[4px_4px_0px_#000] max-w-sm font-cactus text-[var(--cordel-text)]">
      <h4 className="text-sm font-bold uppercase tracking-wider mb-3 border-b border-[var(--cordel-border)] pb-1 flex items-center justify-between">
        <span>📊 Télémétrie Système</span>
        {isUltraEcoMode && (
          <span className="text-xs bg-amber-500 text-black px-1.5 py-0.5 rounded font-black">⚡ Tier 3</span>
        )}
      </h4>
      <div className="flex flex-col gap-2 text-xs">
        <div className="flex justify-between items-center py-1">
          <span className="font-bold">Images par Seconde (FPS) :</span>
          <span className={`px-2 py-0.5 border font-black ${getFpsColorClass(currentFps)}`}>
            {currentFps} FPS
          </span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="font-bold">Mémoire Vive (RAM) :</span>
          <span className="font-sans font-bold">
            {ram !== undefined ? `${ram} Go` : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="font-bold">Cœurs CPU :</span>
          <span className="font-sans font-bold">
            {cores !== undefined ? cores : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-t border-dashed border-[var(--cordel-border)] mt-1">
          <span className="font-bold flex items-center gap-1">
            ⚡ Mode Ultra-Éco (Tier 3) :
          </span>
          <button
            onClick={() => setUltraEcoMode(!isUltraEcoMode)}
            className={`px-3 py-1 text-xs font-bold rounded border shadow-sm transition-colors ${
              isUltraEcoMode
                ? 'bg-amber-500 text-black border-amber-600 font-black'
                : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-gray-400'
            }`}
          >
            {isUltraEcoMode ? 'ACTIVÉ ⚡' : 'DÉSACTIVÉ'}
          </button>
        </div>
      </div>
      <p className="text-[9px] opacity-70 mt-2 font-sans italic leading-tight">
        Note : Le mode Ultra-Éco supprime la boucle d'animation rAF de l'aiguille pour donner 100% de la priorité CPU au moteur audio Tone.js.
      </p>
    </div>
  );
};

export const MiniTelemetryBadge: React.FC = () => {
  const currentFps = usePerformanceStore((state) => state.currentFps);
  const isUltraEcoMode = usePerformanceStore((state) => state.isUltraEcoMode);

  const getBadgeColor = (fps: number) => {
    if (isUltraEcoMode) return 'bg-amber-500'; // Jaune / Éclair Ultra-Éco
    if (fps >= 50) return 'bg-[#27ae60]'; // Vert
    if (fps >= 30) return 'bg-[#d35400]'; // Orange
    return 'bg-[#c0392b]'; // Rouge
  };

  return (
    <div 
      className={`w-3 h-3 rounded-full border border-black ${getBadgeColor(currentFps)} inline-block shrink-0`}
      title={isUltraEcoMode ? "Mode Ultra-Éco (Tier 3) Activé ⚡" : `Télémétrie : ${currentFps} FPS`}
    />
  );
};
