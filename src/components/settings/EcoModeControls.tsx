import React from 'react';
import { Leaf, Smartphone } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';

interface EcoModeControlsProps {
  lang: string;
  variant?: 'compact' | 'full';
}

const TXT = {
  fr: {
    eco: 'Mode Éco', ecoSub: 'Affichage allégé — Son 100 % intact',
    ecoDesc: "Coupe les animations décoratives, ombres, textures et vumètres. L'aiguille de la Roda et la tête de lecture restent fluides.",
    strict: 'Alléger aussi les effets audio (Vieux téléphone)',
    strictDesc: "Coupe en douceur la réverbe, la distorsion, le compresseur et les égaliseurs. Aucune note n'est supprimée.",
    on: 'Actif', off: 'Désactivé',
  },
  pt: {
    eco: 'Modo Eco', ecoSub: 'Exibição leve — Som 100 % intacto',
    ecoDesc: 'Desliga animações decorativas, sombras, texturas e vumetros. O ponteiro da Roda e o cursor de reprodução continuam fluidos.',
    strict: 'Aliviar também os efeitos de áudio (Celular antigo)',
    strictDesc: 'Desliga suavemente reverb, distorção, compressor e equalizadores. Nenhuma nota é removida.',
    on: 'Ativo', off: 'Desativado',
  },
};

/** Commandes Eco a 2 paliers (Palier 1 visuel / Palier 2 audio), bilingues FR / PT. */
export const EcoModeControls: React.FC<EcoModeControlsProps> = ({ lang, variant = 'full' }) => {
  const isEcoMode = useSequencerStore((s) => Boolean(s.isEcoMode));
  const isStrictAudio = useSequencerStore((s) => Boolean(s.isEcoMode && s.ecoConfig?.disableFx && s.ecoConfig?.disableEq));
  // Handlers toujours definis (jamais `undefined`) : evite le warning React "checked sans onChange".
  const onToggleEco = () => useSequencerStore.getState().toggleEcoMode?.();
  const onToggleStrict = () => useSequencerStore.getState().toggleStrictAudioEco?.();
  const t = lang === 'fr' ? TXT.fr : TXT.pt;
  const isCompact = variant === 'compact';

  return (
    <div className={`flex flex-col text-[var(--cordel-text)] ${isCompact ? 'gap-1.5' : 'gap-3'}`}>
      <label className="flex items-start gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={Boolean(isEcoMode)}
          onChange={onToggleEco}
          className="accent-[var(--cordel-text)] w-4 h-4 mt-0.5 cursor-pointer shrink-0"
          data-testid="eco-mode-toggle"
        />
        <span className="flex flex-col min-w-0">
          <span className="flex items-center gap-1.5 font-cactus font-bold text-xs uppercase">
            <Leaf className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} />
            {t.eco}
            <span className="px-1 border border-[var(--cordel-border)] text-[9px] leading-4 font-bold">
              {isEcoMode ? t.on : t.off}
            </span>
          </span>
          <span className="text-[10px] font-bold opacity-80">{t.ecoSub}</span>
          {!isCompact && <span className="text-[10px] opacity-70 leading-tight mt-0.5">{t.ecoDesc}</span>}
        </span>
      </label>

      <label className={`flex items-start gap-2 cursor-pointer select-none border-l-2 border-[var(--cordel-border)] ${isCompact ? 'pl-2 ml-1' : 'pl-3 ml-1.5'}`}>
        <input
          type="checkbox"
          checked={Boolean(isStrictAudio)}
          onChange={onToggleStrict}
          className="accent-[var(--cordel-text)] w-4 h-4 mt-0.5 cursor-pointer shrink-0"
          data-testid="eco-strict-audio-toggle"
        />
        <span className="flex flex-col min-w-0">
          <span className="flex items-center gap-1.5 font-cactus font-bold text-[11px] uppercase leading-tight">
            <Smartphone className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} />
            {t.strict}
          </span>
          <span className="text-[10px] opacity-70 leading-tight mt-0.5">{t.strictDesc}</span>
        </span>
      </label>
    </div>
  );
};

