/**
 * AtelierVocalButton.tsx
 * Bouton d'accès direct à l'Atelier Vocal (O Girador Vocal Lab) avec SSO.
 * Intégré dans l'en-tête du Détail Instrument pour les pistes vocales (Puxador, Coro, Bus Toada).
 * Strictement < 60 lignes (Anti-Monolithe Rule 6.A).
 */
import React from 'react';
import { getEcosystemUrl } from '../constants/ecosystemUrls';
import { launchWithSSO } from '../utils/crossAppAuth';
import { Mic } from 'lucide-react';

interface AtelierVocalButtonProps {
  lang?: 'fr' | 'pt';
  className?: string;
}

export const AtelierVocalButton: React.FC<AtelierVocalButtonProps> = ({
  lang = 'fr',
  className = '',
}) => {
  const handleOpenVocalLab = () => {
    const targetUrl = getEcosystemUrl('vocalLab');
    launchWithSSO(targetUrl, {
      appLabel: lang === 'fr' ? 'Cantador (Atelier Vocal)' : 'Cantador (Oficina Vocal)',
      appKey: 'vocalLab',
    });
  };

  const label = lang === 'fr' ? 'Cantador (Atelier Vocal)' : 'Cantador (Oficina Vocal)';
  const tooltip = lang === 'fr'
    ? "Ouvrir Cantador — Atelier Vocal (O Girador)"
    : "Abrir Cantador — Oficina Vocal (O Girador)";

  return (
    <button
      type="button"
      onClick={handleOpenVocalLab}
      title={tooltip}
      className={`px-2.5 py-1 text-[11px] font-cactus font-bold flex items-center gap-1.5 border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] bg-[#1e293b] hover:bg-[#334155] text-amber-300 transition-all cursor-pointer rounded-none select-none active:translate-y-[1px] active:shadow-none ${className}`}
    >
      <Mic className="w-3.5 h-3.5 shrink-0 text-amber-400" />
      <span>{label}</span>
    </button>
  );
};
