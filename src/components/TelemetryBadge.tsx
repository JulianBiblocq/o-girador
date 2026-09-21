import React from 'react';
import { usePerformanceStore } from '../stores/usePerformanceStore';
import { useSequencerStore } from '../stores/useSequencerStore';

export const TelemetryBadge: React.FC = () => {
  const lang = useSequencerStore((state) => state.lang) || 'fr';
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
        <span>📊 {lang === 'fr' ? 'Télémétrie Système' : 'Telemetria do Sistema'}</span>
        {isUltraEcoMode && (
          <span className="text-xs bg-amber-500 text-black px-1.5 py-0.5 rounded font-black">
            ⚡ {lang === 'fr' ? 'Tier 3' : 'Nível 3'}
          </span>
        )}
      </h4>
      <div className="flex flex-col gap-2 text-xs">
        <div className="flex justify-between items-center py-1">
          <span className="font-bold">{lang === 'fr' ? 'Images par Seconde (FPS) :' : 'Quadros por Segundo (FPS) :'}</span>
          <span className={`px-2 py-0.5 border font-black ${getFpsColorClass(currentFps)}`}>
            {currentFps} FPS
          </span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="font-bold">{lang === 'fr' ? 'Mémoire Vive (RAM) :' : 'Memória RAM :'}</span>
          <span className="font-sans font-bold">
            {ram !== undefined ? `${ram} ${lang === 'fr' ? 'Go' : 'GB'}` : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="font-bold">{lang === 'fr' ? 'Cœurs CPU :' : 'Núcleos CPU :'}</span>
          <span className="font-sans font-bold">
            {cores !== undefined ? cores : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-t border-dashed border-[var(--cordel-border)] mt-1">
          <span className="font-bold flex items-center gap-1">
            ⚡ {lang === 'fr' ? 'Mode Ultra-Éco (Tier 3) :' : 'Modo Ultra-Eco (Nível 3) :'}
          </span>
          <button
            onClick={() => setUltraEcoMode(!isUltraEcoMode)}
            className={`px-3 py-1 text-xs font-bold rounded border shadow-sm transition-colors ${
              isUltraEcoMode
                ? 'bg-amber-500 text-black border-amber-600 font-black'
                : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-gray-400'
            }`}
          >
            {isUltraEcoMode ? (lang === 'fr' ? 'ACTIVÉ ⚡' : 'ATIVADO ⚡') : (lang === 'fr' ? 'DÉSACTIVÉ' : 'DESATIVADO')}
          </button>
        </div>
      </div>
      <p className="text-[9px] opacity-70 mt-2 font-sans italic leading-tight">
        {lang === 'fr'
          ? "Note : Le mode Ultra-Éco supprime la boucle d'animation rAF de l'aiguille pour donner 100% de la priorité CPU au moteur audio Tone.js."
          : "Nota: O modo Ultra-Eco desativa a animação rAF do ponteiro para dar 100% de prioridade da CPU ao motor de áudio Tone.js."}
      </p>
    </div>
  );
};

export const MiniTelemetryBadge: React.FC = () => {
  const lang = useSequencerStore((state) => state.lang) || 'fr';
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
      title={lang === 'fr'
        ? (isUltraEcoMode ? "Mode Ultra-Éco (Tier 3) Activé ⚡" : `Télémétrie : ${currentFps} FPS`)
        : (isUltraEcoMode ? "Modo Ultra-Eco (Nível 3) Ativado ⚡" : `Telemetria: ${currentFps} FPS`)}
    />
  );
};
