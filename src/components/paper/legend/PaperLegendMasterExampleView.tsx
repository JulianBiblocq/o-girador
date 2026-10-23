/**
 * Vue In-App de l'Exemple Maître Complet (14mm + 32 carreaux) (< 120 lignes).
 */
import React from 'react';
import { renderMasterExampleHTML } from '../../../utils/paper/paperLegendMasterExample';

interface Props {
  lang: 'fr' | 'pt';
}

export const PaperLegendMasterExampleView: React.FC<Props> = ({ lang }) => {
  const isFr = lang === 'fr';
  const htmlContent = renderMasterExampleHTML(lang);

  return (
    <div className="flex flex-col gap-2 p-3 text-[#1a1a1a]">
      <div className="p-2 bg-[#faf6eb] border border-[#8b2a1a]/40 text-xs">
        <span className="font-cactus font-bold uppercase text-[#8b2a1a] block mb-1">
          {isFr ? 'Exemple Maître — Tous les cas de figure sur la Grille 32x25' : 'Exemplo Mestre — Todos os casos na Grade 32x25'}
        </span>
        <p className="text-[10.5px] leading-relaxed text-[#1a1a1a]/85 m-0">
          {isFr
            ? 'Cette grille illustre la syntaxe complète : Base, variations (↳), case coupée (d/I), silence forcé (-), motif 32 pas sur 2 mesures, 2/4 (8p), 12/8 ternaire (12p), mixte (20p) et ligne conducteur SÉQ.'
            : 'Esta grade ilustra a sintaxe completa: Base, variações (↳), casa cortada (d/I), silêncio forçado (-), padrão de 32 passos em 2 compassos, 2/4 (8p), 12/8 ternário (12p), misto (20p) e linha condutora SÉQ.'}
        </p>
      </div>

      <div
        className="overflow-x-auto border-2 border-black bg-white p-2 shadow-[2px_2px_0px_#1a1a1a]"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
};
