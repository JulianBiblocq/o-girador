import React from 'react';
import { usePerformanceStore } from '../stores/usePerformanceStore';

export const TelemetryBadge: React.FC = () => {
  const currentFps = usePerformanceStore((state) => state.currentFps);
  const ram = usePerformanceStore((state) => state.ram);
  const cores = usePerformanceStore((state) => state.cores);

  // Calcule la couleur de la pastille ou de la bordure selon les FPS
  const getFpsColorClass = (fps: number) => {
    if (fps >= 50) return 'text-[#27ae60] border-[#27ae60]';
    if (fps >= 30) return 'text-[#d35400] border-[#d35400]';
    return 'text-[#c0392b] border-[#c0392b]';
  };

  return (
    <div className="bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] p-4 shadow-[4px_4px_0px_#000] max-w-sm font-cactus text-[var(--cordel-text)]">
      <h4 className="text-sm font-bold uppercase tracking-wider mb-3 border-b border-[var(--cordel-border)] pb-1 flex items-center gap-2">
        📊 Télémétrie Système
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
      </div>
      <p className="text-[9px] opacity-70 mt-3 font-sans italic leading-tight">
        Note : Ces mesures sont indicatives et basées sur les API web standard disponibles.
      </p>
    </div>
  );
};

export const MiniTelemetryBadge: React.FC = () => {
  const currentFps = usePerformanceStore((state) => state.currentFps);

  const getBadgeColor = (fps: number) => {
    if (fps >= 50) return 'bg-[#27ae60]'; // Vert
    if (fps >= 30) return 'bg-[#d35400]'; // Orange
    return 'bg-[#c0392b]'; // Rouge
  };

  return (
    <div 
      className={`w-3 h-3 rounded-full border border-black ${getBadgeColor(currentFps)} inline-block shrink-0`}
      title={`Télémétrie : ${currentFps} FPS`}
    />
  );
};
