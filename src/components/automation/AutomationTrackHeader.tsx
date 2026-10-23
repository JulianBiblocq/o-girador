import React from 'react';

export interface AutomationTrackHeaderProps {
  type: 'tempo' | 'volume' | 'pan' | 'reverb';
  label?: string;
  color: string;
  lang: string;
  headerWidth: number;
  min: number;
  max: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isBypassed?: boolean;
  onToggleBypass?: () => void;
  onClose?: () => void;
  paramSelector?: {
    current: 'volume' | 'pan' | 'reverb';
    onChange: (param: 'volume' | 'pan' | 'reverb') => void;
  };
}

export const AutomationTrackHeader: React.FC<AutomationTrackHeaderProps> = React.memo(({
  type, label, color, lang, headerWidth, min, max,
  isExpanded, onToggleExpand, isBypassed = false, onToggleBypass, onClose, paramSelector,
}) => {
  const defaultLabel = type === 'tempo' ? (lang === 'fr' ? 'Tempo' : 'Andamento') :
    type === 'pan' ? (lang === 'fr' ? 'Panoramique' : 'Panorâmico') :
    type === 'reverb' ? (lang === 'fr' ? 'Send Réverbe' : 'Envio Reverb') :
    (lang === 'fr' ? 'Volume Global' : 'Volume Mestre');

  return (
    <div
      className="timeline-sticky-header flex flex-col p-2 border-r border-[var(--cordel-border)] bg-[var(--cordel-bg)] relative shrink-0 shadow-[2px_0_10px_rgba(0,0,0,0.5)] z-40 sticky left-0 select-none"
      style={{ width: `${headerWidth}px`, minWidth: `${headerWidth}px` }}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <button
            onClick={onToggleExpand}
            className="text-xs font-bold text-gray-400 hover:text-white cursor-pointer pointer-events-auto shrink-0"
            title={isExpanded ? (lang === 'fr' ? 'Réduire' : 'Recolher') : (lang === 'fr' ? 'Développer' : 'Expandir')}
          >
            {isExpanded ? '▼' : '►'}
          </button>
          <span className="text-xs font-black uppercase tracking-wider truncate" style={{ color }} title={label || defaultLabel}>
            {label || defaultLabel}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onToggleBypass && (
            <button
              onClick={onToggleBypass}
              className={`px-1.5 py-0.5 text-[9px] font-bold tracking-wider rounded uppercase transition-all cursor-pointer ${
                !isBypassed
                  ? 'border border-[#a83220] bg-[#8b2a1a] text-[#f4ecd8] hover:bg-[#a83220] shadow-xs'
                  : 'border border-dashed border-gray-600/50 bg-black/40 text-gray-400 line-through hover:text-gray-200'
              }`}
              title={lang === 'fr' ? (isBypassed ? "Activer l'automation" : "Débrayer l'automation") : (isBypassed ? "Ativar automação" : "Desativar automação")}
            >
              AUTO
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs font-bold text-gray-400 hover:text-red-400 cursor-pointer pointer-events-auto ml-0.5 shrink-0 px-1"
              title={lang === 'fr' ? "Fermer l'automation" : "Fechar automação"}
            >
              
            </button>
          )}
        </div>
      </div>

      {paramSelector && isExpanded && (
        <div className="flex items-center gap-1 my-1">
          {(['volume', 'pan', 'reverb'] as const).map((p) => (
            <button
              key={p}
              onClick={() => paramSelector.onChange(p)}
              className={`flex-1 py-0.5 text-[9px] font-bold rounded uppercase transition-colors cursor-pointer border text-center ${
                paramSelector.current === p
                  ? 'bg-amber-600 text-white border-amber-400 shadow-xs'
                  : 'bg-black/40 text-gray-400 hover:text-gray-200 border-white/10 hover:border-white/30'
              }`}
            >
              {p === 'volume' ? 'Vol' : p === 'pan' ? 'Pan' : 'Rev'}
            </button>
          ))}
        </div>
      )}

      {isExpanded && (
        <div className="flex flex-col mt-auto gap-0.5 text-[9px] text-gray-500 font-medium">
          {type === 'pan' ? (
            <>
              <div className="flex justify-between"><span>Max</span><span className="text-gray-400">R 100</span></div>
              <div className="flex justify-between"><span>Center</span><span className="text-gray-400">C (0)</span></div>
              <div className="flex justify-between"><span>Min</span><span className="text-gray-400">L 100</span></div>
            </>
          ) : type === 'reverb' ? (
            <>
              <div className="flex justify-between"><span>Max</span><span className="text-gray-400">100%</span></div>
              <div className="flex justify-between"><span>Min</span><span className="text-gray-400">0%</span></div>
            </>
          ) : (
            <>
              <div className="flex justify-between"><span>Max</span><span className="text-gray-400">{max}</span></div>
              <div className="flex justify-between"><span>Min</span><span className="text-gray-400">{min}</span></div>
            </>
          )}
        </div>
      )}
    </div>
  );
});
