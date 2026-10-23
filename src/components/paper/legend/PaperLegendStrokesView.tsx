/**
 * Vue 1 : Tableau lisible des frappes et pupitres en gros caractères (< 115 lignes).
 */
import React from 'react';
import { resolvePupitreDisplayName } from '../../../utils/paper/paperNomenclatureHelper';
import { PaperLegendPupitreCard, PupitreLegendData } from './PaperLegendPupitreCard';

interface Props {
  lang: 'fr' | 'pt';
}

export const PaperLegendStrokesView: React.FC<Props> = ({ lang }) => {
  const isFr = lang === 'fr';

  const pupitres: PupitreLegendData[] = [
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
      code: 'tb',
      title: `${resolvePupitreDisplayName('tb', lang)} (Tb)`,
      subtitle: isFr ? 'Percussion de main' : 'Percussão de mão',
      warning: isFr ? 'Spécificité Timbal : MAJUSCULE = Main Droite │ minuscule = Main Gauche' : 'Regra do Timbal: MAIÚSCULA = Mão Direita │ minúscula = Mão Esquerda',
      strokes: [
        { key: 'G / g', desc: isFr ? 'Basse (Droite / Gauche)' : 'Grave (Dir / Esq)' },
        { key: 'A / a', desc: isFr ? 'Ouvert (Droite / Gauche)' : 'Aberto (Dir / Esq)' },
        { key: 'S / s', desc: isFr ? 'Claqué / Slap (D / G)' : 'Slap (Dir / Esq)' },
        { key: 'D / d', desc: isFr ? 'Fantôme (Droite / Gauche)' : 'Fantasma (Dir / Esq)' },
        { key: 'P / p', desc: isFr ? 'Pressé / Fermé (D / G)' : 'Preso / Abafado (D / E)' },
        { key: 'F / f', desc: isFr ? 'Fla ouvert (D / G)' : 'Fla aberto (D / E)' },
        { key: 'V / v', desc: isFr ? 'Fla claqué (D / G)' : 'Fla slap (D / E)' },
        { key: 'C', desc: isFr ? 'Clap (Palma)' : 'Palma (Clap)' },
        { key: 'B', desc: isFr ? 'Barulho (Grondement)' : 'Barulho (Vibração)' },
      ],
    },
    {
      code: 'ap',
      title: 'Apito (Ap)',
      subtitle: isFr ? 'Sifflet du Mestre' : 'Apito do Mestre',
      strokes: [
        { key: 'W / w', desc: isFr ? 'Sifflet Long / Court' : 'Apito Longo / Curto' },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-3 p-3 text-[#1a1a1a]">
      <div className="p-2.5 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-black font-cactus font-bold text-center text-xs tracking-wide shadow-[2px_2px_0px_#000]">
        {isFr ? 'MAJUSCULE = Coup Fort │ minuscule = Coup Faible (Sauf Timbal : MAJ = Droite │ min = Gauche)' : 'MAIÚSCULA = Toque Forte │ minúscula = Toque Fraco (Exceto Timbal: MAI = Direita │ min = Esquerda)'}
      </div>
      <div className="p-2 bg-[#faf6eb] border border-[#8b2a1a]/40 text-[10px] text-[#1a1a1a]/85 italic text-center">
        {isFr
          ? 'Les abréviations d\'instruments dans la colonne de 14mm (Al, Cx, Gg...) sont au choix de l\'utilisateur et personnalisables dans l\'Atelier Papier ou La Presse.'
          : 'As abreviações de instrumentos na coluna de 14mm (Al, Cx, Gg...) são de livre escolha do usuário e personalizáveis na Oficina Papel ou Na Imprensa.'}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {pupitres.map((p) => (
          <PaperLegendPupitreCard key={p.code} p={p} />
        ))}
      </div>
    </div>
  );
};
