/**
 * O Girador - Timbal Stroke Definitions (< 60 lignes)
 */

import { StrokeDef } from './strokeTypes';

export function getTimbalStrokeDefs(isFr: boolean, isLeftHanded: boolean): StrokeDef[] {
  const dom = isFr ? (isLeftHanded ? 'Gauche' : 'Droite') : (isLeftHanded ? 'Esquerda' : 'Direita');
  const sec = isFr ? (isLeftHanded ? 'Droite' : 'Gauche') : (isLeftHanded ? 'Direita' : 'Esquerda');

  return [
    { symbol: 'G', label: `${isFr ? 'Basse' : 'Grave'} ${dom}`, shortcut: 'G', colorKey: 'G' },
    { symbol: 'g', label: `${isFr ? 'Basse' : 'Grave'} ${sec}`, shortcut: 'g', colorKey: 'g' },
    { symbol: 'A', label: `Aberto ${dom}`, shortcut: 'A', colorKey: 'A' },
    { symbol: 'a', label: `Aberto ${sec}`, shortcut: 'a', colorKey: 'a' },
    { symbol: 'S', label: `${isFr ? 'Slap fermé' : 'Slap fechado'} ${dom}`, shortcut: 'S', colorKey: 'S' },
    { symbol: 's', label: `${isFr ? 'Slap fermé' : 'Slap fechado'} ${sec}`, shortcut: 's', colorKey: 's' },
    { symbol: 'T', label: `${isFr ? 'Slap ouvert / Tapa aberto' : 'Tapa aberto / Slap aberto'} ${dom}`, shortcut: 'T', colorKey: 'T' },
    { symbol: 't', label: `${isFr ? 'Slap ouvert / Tapa aberto' : 'Tapa aberto / Slap aberto'} ${sec}`, shortcut: 't', colorKey: 't' },
    { symbol: 'D', label: `${isFr ? 'Doigts' : 'Dedos'} ${dom}`, shortcut: 'D', colorKey: 'D' },
    { symbol: 'd', label: `${isFr ? 'Doigts' : 'Dedos'} ${sec}`, shortcut: 'd', colorKey: 'd' },
    { symbol: 'P', label: `${isFr ? 'Pressé' : 'Preso'} ${dom}`, shortcut: 'P', colorKey: 'P' },
    { symbol: 'p', label: `${isFr ? 'Pressé' : 'Preso'} ${sec}`, shortcut: 'p', colorKey: 'p' },
    { symbol: 'F', label: `Fla ${dom}`, shortcut: 'F', colorKey: 'F' },
    { symbol: 'f', label: `Fla ${sec}`, shortcut: 'f', colorKey: 'f' },
    { symbol: 'V', label: `Fla Slap ${dom}`, shortcut: 'V', colorKey: 'V' },
    { symbol: 'v', label: `Fla Slap ${sec}`, shortcut: 'v', colorKey: 'v' },
    { symbol: 'C', label: isFr ? 'Clap (mains)' : 'Palma (mãos)', shortcut: 'C', colorKey: 'C' },
    { symbol: 'B', label: isFr ? 'B — Barulho (Appel + Tenue)' : 'B — Barulho (Chamada + Sustentação)', shortcut: 'B', colorKey: 'B' },
    { symbol: 'b', label: isFr ? 'b — Barulho doux (Fade-In sans appel)' : 'b — Barulho suave (Fade-In sem chamada)', shortcut: 'b', colorKey: 'b' },
    { symbol: '/', label: isFr ? '/ — Extinction Barulho (Fade-Out)' : '/ — Extinção Barulho (Fade-Out)', shortcut: '/', colorKey: '/' },
    { symbol: '.', label: isFr ? '. — Fin du Barulho (Silence)' : '. — Fim do Barulho (Silêncio)', shortcut: '.', colorKey: '.' },
  ];
}
