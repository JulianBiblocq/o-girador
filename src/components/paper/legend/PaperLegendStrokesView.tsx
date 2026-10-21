/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Vue 1 : Tableau lisible des frappes et pupitres en gros caractères (< 135 lignes).
 */
import React from 'react';
import { resolvePupitreDisplayName } from '../../../utils/paper/paperNomenclatureHelper';

interface Props {
  lang: 'fr' | 'pt';
}

export const PaperLegendStrokesView: React.FC<Props> = ({ lang }) => {
  const isFr = lang === 'fr';

  const pupitres = [
    {
      code: 'al',
      title: 'Alfaias',
      subtitle: `${resolvePupitreDisplayName('mc', lang)} (Mc), ${resolvePupitreDisplayName('me', lang)} (Me), ${resolvePupitreDisplayName('rp', lang)} (Rp)`,
      strokes: [
        { key: 'D / d', desc: isFr ? 'Droite (Fort / faible)' : 'Direita (Forte / fraco)' },
        { key: 'E / e', desc: isFr ? 'Gauche (Fort / faible)' : 'Esquerda (Forte / fraco)' },
        { key: 'I / i', desc: isFr ? 'Bacalhau (avec 2 barres I)' : 'Bacalhau (com 2 traços I)' },
        { key: 'B', desc: 'Barulho' },
        { key: 'C', desc: isFr ? 'Clac entre baguettes' : 'Clac baquetas' },
        { key: 'X', desc: isFr ? 'Aro / Cerclage' : 'Aro / Borda' },
      ],
      note: isFr ? 'Pas de Fla sur Alfaia' : 'Sem Fla no Alfaia',
    },
    {
      code: 'cx',
      title: `${resolvePupitreDisplayName('cx', lang)} & ${resolvePupitreDisplayName('tr', lang)} (Cx, Tr)`,
      subtitle: isFr ? 'Caisses claires & Timbre' : 'Caixas e Tarol',
      strokes: [
        { key: 'D / d', desc: isFr ? 'Droite (Fort / faible)' : 'Direita' },
        { key: 'E / e', desc: isFr ? 'Gauche (Fort / faible)' : 'Esquerda' },
        { key: 'R / r', desc: isFr ? 'Roulement / Rouffade' : 'Rolo / Rufo' },
        { key: 'F / f', desc: 'Fla' },
        { key: 'X', desc: isFr ? 'Aro / Cerclage' : 'Aro' },
        { key: 'C', desc: 'Clic' },
      ],
    },
    {
      code: 'gg',
      title: `${resolvePupitreDisplayName('gg', lang)} (Gg)`,
      subtitle: isFr ? 'Cloche en fer battu' : 'Campana de ferro',
      strokes: [
        { key: 'G / g', desc: isFr ? 'Grave / Ouvert' : 'Grave / Aberto' },
        { key: 'A / a', desc: isFr ? 'Aigu / Cloche' : 'Agudo / Sino' },
        { key: 'X', desc: isFr ? 'Corps / Étouffé' : 'Borda / Abafado' },
        { key: 'B', desc: 'Barulho' },
      ],
    },
    {
      code: 'ab',
      title: `${resolvePupitreDisplayName('ab', lang)} (Ab)`,
      subtitle: isFr ? 'Calebasse à graines' : 'Xequerê / Agbê',
      strokes: [
        { key: 'D / d', desc: isFr ? 'Base droite' : 'Base direita' },
        { key: 'E / e', desc: isFr ? 'Base gauche' : 'Base esquerda' },
        { key: 'S', desc: isFr ? 'Secousse / Salto' : 'Salto / Chacoalhado' },
        { key: 'V', desc: isFr ? 'Frappé / Volta' : 'Batida / Volta' },
      ],
    },
    {
      code: 'mi',
      title: `${resolvePupitreDisplayName('mi', lang)} (Mi)`,
      subtitle: isFr ? 'Shaker tubulaire métal' : 'Ganzá metálico',
      strokes: [
        { key: 'P / p', desc: isFr ? 'Poussé (vers l\'avant)' : 'Frente (Pressionado)' },
        { key: 'T / t', desc: isFr ? 'Tiré (traverser barre t)' : 'Trás (cruzar barra t)' },
        { key: 'L', desc: isFr ? 'Lié / Côté' : 'Lateral / Ligado' },
        { key: 'B', desc: isFr ? 'Arrêté net / Tremer' : 'Tremer / Parado' },
      ],
    },
    {
      code: 'tb_ap',
      title: `${resolvePupitreDisplayName('tb', lang)} (Tb) & Apito (Ap)`,
      subtitle: isFr ? 'Percussion main & Sifflet' : 'Percussão de mão & Apito',
      strokes: [
        { key: 'G / A / S', desc: isFr ? 'Basse / Ouvert / Claqué (Slap)' : 'Grave / Aberto / Slap' },
        { key: 'D / P / F', desc: isFr ? 'Fantôme / Pressé / Fla' : 'Fantasma / Preso / Fla' },
        { key: 'W / w', desc: isFr ? 'Apito Long / Court' : 'Apito Longo / Curto' },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-3 p-3 text-[#1a1a1a]">
      <div className="p-2.5 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-black font-cactus font-bold text-center text-xs tracking-wide shadow-[2px_2px_0px_#000]">
        {isFr ? 'MAJUSCULE = Coup Fort │ minuscule = Coup Faible' : 'MAIÚSCULA = Toque Forte │ minúscula = Toque Fraco'}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {pupitres.map((p) => (
          <div key={p.code} className="p-2.5 bg-white border-2 border-black shadow-[2px_2px_0px_#1a1a1a] flex flex-col justify-between">
            <div>
              <div className="flex items-baseline justify-between border-b-2 border-black/20 pb-1 mb-1.5">
                <span className="font-cactus font-bold text-sm text-[#8b2a1a] uppercase">{p.title}</span>
                <span className="text-[10px] text-black/60 italic truncate ml-1">{p.subtitle}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                {p.strokes.map((st) => (
                  <div key={st.key} className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-9 px-1 py-0.5 bg-[#f4ecd8] border border-black font-mono font-black text-center text-[#8b2a1a] shrink-0 text-[11px]">
                      {st.key}
                    </span>
                    <span className="text-black/80 font-medium text-[10px] leading-tight truncate">{st.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            {p.note && <div className="mt-1 text-[9px] font-bold text-[#8b2a1a] italic">{p.note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};
