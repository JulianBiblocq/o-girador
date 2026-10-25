import React from 'react';
import { Volume2, Sparkles } from 'lucide-react';
import { useTransportStore } from '../../stores/useTransportStore';
import { useShallow } from 'zustand/react/shallow';

interface TransportMetronomeModesSectionProps {
  lang: string;
}

export const TransportMetronomeModesSection: React.FC<TransportMetronomeModesSectionProps> = ({
  lang,
}) => {
  const {
    isMetroOn,
    setIsMetroOn,
    isVisualMetronomeActive,
    setIsVisualMetronomeActive,
  } = useTransportStore(
    useShallow((state) => ({
      isMetroOn: state.isMetroOn,
      setIsMetroOn: state.setIsMetroOn,
      isVisualMetronomeActive: state.isVisualMetronomeActive,
      setIsVisualMetronomeActive: state.setIsVisualMetronomeActive,
    }))
  );

  const isPt = lang === 'pt';

  return (
    <div className="flex flex-col gap-1.5 pb-2.5 mb-2.5 border-b border-[#1a1a1a]/20">
      <label className="flex items-center justify-between gap-2 p-1.5 bg-black/5 hover:bg-black/10 rounded cursor-pointer transition-colors">
        <div className="flex items-center gap-1.5">
          <Volume2 size={13} className="shrink-0 text-black/70" />
          <span className="font-bold text-xs">
            {isPt ? 'Clique sonoro contínuo' : 'Clic sonore continu'}
          </span>
        </div>
        <input
          type="checkbox"
          checked={isMetroOn}
          onChange={(e) => setIsMetroOn(e.target.checked)}
          className="w-4 h-4 accent-[var(--cordel-wood)] cursor-pointer"
        />
      </label>

      <label className="flex items-center justify-between gap-2 p-1.5 bg-black/5 hover:bg-black/10 rounded cursor-pointer transition-colors">
        <div className="flex items-center gap-1.5">
          <Sparkles size={13} className="shrink-0 text-black/70" />
          <span className="font-bold text-xs">
            {isPt ? 'Metrônomo visual (Halo Roda)' : 'Métronome visuel (Halo Roda)'}
          </span>
        </div>
        <input
          type="checkbox"
          checked={isVisualMetronomeActive}
          onChange={(e) => setIsVisualMetronomeActive(e.target.checked)}
          className="w-4 h-4 accent-[var(--cordel-wood)] cursor-pointer"
        />
      </label>
    </div>
  );
};
