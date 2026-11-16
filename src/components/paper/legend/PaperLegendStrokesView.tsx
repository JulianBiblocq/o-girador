/**
 * Vue 1 : Tableau complet SSOT des frappes et des 8 pupitres (< 138 lignes).
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
      title: 'Alfaias (Al, Mc, Me, Rp)',
      subtitle: `${resolvePupitreDisplayName('mc', lang)}, ${resolvePupitreDisplayName('me', lang)}, ${resolvePupitreDisplayName('rp', lang)}`,
      strokes: [
        { key: 'D / d', desc: isFr ? 'Droite mailloche (Fort / faible)' : 'Direita maçaneta (Forte / fraco)' },
        { key: 'E / e', desc: isFr ? 'Gauche (e met en vibration avant D)' : 'Esquerda (e vibra antes de D)' },
        { key: 'A / a', desc: isFr ? 'Abafado (étouffé décollé avant suite)' : 'Abafado (desencosta antes do próximo)' },
        { key: 'I', desc: isFr ? 'Bacalhau Igarassu (2 barres I)' : 'Bacalhau Igarassu (2 traços I)' },
        { key: 'C', desc: isFr ? 'Clic de baguettes' : 'Clique de baquetas' },
        { key: 'X', desc: isFr ? 'Cerclage (Aro)' : 'Aro de madeira' },
        { key: 'B', desc: isFr ? 'Barulho (Roulement continu)' : 'Barulho (Rulo contínuo)' },
      ],
      note: isFr ? 'Aucun Fla sur Alfaia' : 'Sem Fla na Alfaia',
    },
    {
      code: 'cx',
      title: `${resolvePupitreDisplayName('cx', lang)} & ${resolvePupitreDisplayName('tr', lang)} (Cx, Tr)`,
      subtitle: isFr ? 'Caisses claires & Timbre' : 'Caixas e Tarol',
      strokes: [
        { key: 'D / d', desc: isFr ? 'Main droite (Fort / faible)' : 'Mão direita (Forte / fraco)' },
        { key: 'E / e', desc: isFr ? 'Main gauche (Fort / faible)' : 'Mão esquerda (Forte / fraco)' },
        { key: 'R / r', desc: isFr ? 'Rufada (Roulement court D / G)' : 'Rufada (Rulo curto D / E)' },
        { key: 'F / f', desc: isFr ? 'Fla (Double attaque D / G)' : 'Fla (Ataque duplo D / E)' },
        { key: 'A / a', desc: isFr ? 'Rimshot / Pele e Aro près du bord' : 'Pele e Aro / Rimshot na borda' },
        { key: 'C', desc: isFr ? 'Clic de baguettes' : 'Clique de baquetas' },
        { key: 'X', desc: isFr ? 'Cerclage (Aro)' : 'Aro' },
        { key: 'B', desc: isFr ? 'Barulho (Roulement continu)' : 'Barulho (Rulo contínuo)' },
      ],
    },
    {
      code: 'gg',
      title: `${resolvePupitreDisplayName('gg', lang)} (Gg)`,
      subtitle: isFr ? 'Cloche unique en fer forgé' : 'Campana única de ferro forjado',
      strokes: [
        { key: 'G / g', desc: isFr ? 'Grave (Haut près de la bouche)' : 'Grave (Topo perto da boca)' },
        { key: 'A / a', desc: isFr ? 'Aigu (Bas vers la base rigide)' : 'Agudo (Base rígida da campana)' },
        { key: 'B', desc: isFr ? 'Barulho (Roulement continu)' : 'Barulho (Rulo contínuo)' },
      ],
    },
    {
      code: 'ab',
      title: `${resolvePupitreDisplayName('ab', lang)} (Ab)`,
      subtitle: isFr ? 'Calebasse à filet de perles' : 'Cabaça com malha de contas',
      strokes: [
        { key: 'E / e', desc: isFr ? 'Gauche (Paume G, col tenu main D)' : 'Esquerda (Palma E, cabaça na D)' },
        { key: 'D / d', desc: isFr ? 'Droite (Retour latéral vers D)' : 'Direita (Retorno lateral para D)' },
        { key: 'S', desc: isFr ? 'Salto (Lancer haut)' : 'Salto (Impulso alto)' },
        { key: 'V', desc: isFr ? 'Volta (Retour bas)' : 'Volta (Retorno baixo)' },
        { key: 'B', desc: isFr ? 'Barulho (Secouement continu)' : 'Barulho (Agitação contínua)' },
      ],
    },
    {
      code: 'mi',
      title: `${resolvePupitreDisplayName('mi', lang)} (Mi)`,
      subtitle: isFr ? 'Cylindre métallique' : 'Ganzá metálico',
      strokes: [
        { key: 'P / p', desc: isFr ? 'Poussé avant (Projetar)' : 'Projetar (Para frente)' },
        { key: 'T / t', desc: isFr ? 'Tiré vers soi (Trazer)' : 'Trazer (Para trás)' },
        { key: 'L', desc: isFr ? 'Latéral (Lado diagonal)' : 'Lado (Lateral diagonal)' },
        { key: 'B', desc: isFr ? 'Barulho (Secouement continu)' : 'Barulho (Agitação contínua)' },
      ],
    },
    {
      code: 'tb',
      title: `${resolvePupitreDisplayName('tb', lang)} (Tb)`,
      subtitle: isFr ? 'Percussion de main' : 'Percussão de mão',
      warning: isFr ? 'Spécificité Timbal : MAJUSCULE = Main Droite │ minuscule = Main Gauche' : 'Regra do Timbal: MAIÚSCULA = Mão Direita │ minúscula = Mão Esquerda',
      strokes: [
        { key: 'G / g', desc: isFr ? 'Grave / Basse (D / G)' : 'Grave (Dir / Esq)' },
        { key: 'A / a', desc: isFr ? 'Ton ouvert / Aberto (D / G)' : 'Aberto (Dir / Esq)' },
        { key: 'S / s', desc: isFr ? 'Claqué / Slap (D / G)' : 'Slap / Estalo (Dir / Esq)' },
        { key: 'D / d', desc: isFr ? 'Doigts / Fantôme (D / G)' : 'Ponta de dedos (Dir / Esq)' },
        { key: 'P / p', desc: isFr ? 'Pressé / Fermé (D / G)' : 'Preso / Fechado (Dir / Esq)' },
        { key: 'F / f', desc: isFr ? 'Fla ouvert (D / G)' : 'Fla aberto (Dir / Esq)' },
        { key: 'V / v', desc: isFr ? 'Fla claqué (D / G)' : 'Fla slap (Dir / Esq)' },
        { key: 'C', desc: isFr ? 'Clap (Mains)' : 'Palma (Clap)' },
        { key: 'B', desc: isFr ? 'Barulho (Roulement continu)' : 'Barulho (Rulo contínuo)' },
      ],
    },
    {
      code: 'ap',
      title: 'Apito (Ap)',
      subtitle: isFr ? 'Sifflet de direction du Mestre' : 'Apito de comando do Mestre',
      strokes: [
        { key: 'W', desc: isFr ? 'Sifflet fort / long' : 'Apito forte / longo' },
        { key: 'w', desc: isFr ? 'Sifflet court / léger' : 'Apito curto / leve' },
      ],
    },
    {
      code: 'td',
      title: 'Toada — Grammaire v2 (Td, Px, Co)',
      subtitle: isFr ? 'Chant responsorial Puxador & Coro' : 'Canto de Puxador & Coro',
      strokes: [
        { key: 'P / C', desc: isFr ? 'Puxador (solo) / Coro (chœur)' : 'Puxador (solo) / Coro (resposta)' },
        { key: '_', desc: isFr ? 'Tenue / mélisme lié sans ré-attaque' : 'Sustentação / melisma ligado' },
        { key: '/', desc: isFr ? 'Soudure de durée / mesures liées' : 'Soldadura entre tempos/compassos' },
        { key: '0', desc: isFr ? 'Silence vocal explicite' : 'Silêncio vocal explícito' },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-3 p-3 text-[var(--cordel-text)]">
      <div className="p-2.5 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-center text-xs tracking-wide shadow-[2px_2px_0px_var(--cordel-shadow-color)]">
        {isFr ? 'MAJUSCULE = Coup Fort │ minuscule = Coup Faible (Sauf Timbal & Rimshot A/a Cx/Tr : MAJ = Droite │ min = Gauche)' : 'MAIÚSCULA = Toque Forte │ minúscula = Toque Fraco (Exceto Timbal e A/a Cx/Tr: MAI = Direita │ min = Esquerda)'}
      </div>
      <div className="p-2 bg-[var(--cordel-surface)] border border-[var(--cordel-border)] text-[10px] text-[var(--cordel-text-muted)] italic text-center">
        {isFr
          ? "Les abréviations d'instruments dans la colonne de 14 mm (Al, Cx, Gg...) sont personnalisables dans l'Atelier Papier ou La Presse."
          : 'As abreviações de instrumentos na coluna de 14 mm (Al, Cx, Gg...) são personalizáveis na Oficina Papel ou A Prensa.'}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {pupitres.map((p) => (
          <PaperLegendPupitreCard key={p.code} p={p} />
        ))}
      </div>
    </div>
  );
};
