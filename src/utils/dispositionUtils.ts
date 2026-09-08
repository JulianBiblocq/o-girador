/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlacedInstrumentConfig } from '../types/disposition.types';

export function formatDispositionSummary(
  instruments: PlacedInstrumentConfig[],
  lang: 'fr' | 'pt' = 'fr'
): string {
  if (!instruments || instruments.length === 0) {
    return lang === 'fr' ? 'Aucun instrument' : 'Nenhum instrumento';
  }

  const counts: Record<string, number> = {};
  instruments.forEach((inst) => {
    counts[inst.instrumentType] = (counts[inst.instrumentType] || 0) + 1;
  });

  const names: Record<string, { fr: [string, string]; pt: [string, string] }> = {
    marcante: { fr: ['Marcante', 'Marcantes'], pt: ['Marcante', 'Marcantes'] },
    meiao: { fr: ['Meião', 'Meiões'], pt: ['Meião', 'Meiões'] },
    repique: { fr: ['Repique', 'Repiques'], pt: ['Repique', 'Repiques'] },
    caixa: { fr: ['Caixa', 'Caixas'], pt: ['Caixa', 'Caixas'] },
    tarol: { fr: ['Tarol', 'Taróis'], pt: ['Tarol', 'Taróis'] },
    gongue: { fr: ['Gonguê', 'Gonguês'], pt: ['Gonguê', 'Gonguês'] },
    agbe: { fr: ['Agbê', 'Agbês'], pt: ['Agbê', 'Agbês'] },
    mineiro: { fr: ['Mineiro', 'Mineiros'], pt: ['Mineiro', 'Mineiros'] },
    timbal: { fr: ['Timbal', 'Timbais'], pt: ['Timbal', 'Timbais'] },
  };

  // Groupement des alfaias
  const totalAlfaias = (counts['marcante'] || 0) + (counts['meiao'] || 0) + (counts['repique'] || 0);
  const parts: string[] = [];

  if (totalAlfaias > 0) {
    const subParts: string[] = [];
    if (counts['marcante']) subParts.push(`${counts['marcante']} ${counts['marcante'] > 1 ? names['marcante'][lang][1] : names['marcante'][lang][0]}`);
    if (counts['meiao']) subParts.push(`${counts['meiao']} ${counts['meiao'] > 1 ? names['meiao'][lang][1] : names['meiao'][lang][0]}`);
    if (counts['repique']) subParts.push(`${counts['repique']} ${counts['repique'] > 1 ? names['repique'][lang][1] : names['repique'][lang][0]}`);

    const alfaiaLabel = totalAlfaias > 1 ? 'Alfaias' : 'Alfaia';
    parts.push(`${totalAlfaias} ${alfaiaLabel} (${subParts.join(', ')})`);
  }

  // Autres instruments
  const otherTypes = ['caixa', 'tarol', 'gongue', 'agbe', 'mineiro', 'timbal'];
  otherTypes.forEach((type) => {
    const count = counts[type];
    if (count) {
      const config = names[type];
      const label = config ? (count > 1 ? config[lang][1] : config[lang][0]) : type;
      parts.push(`${count} ${label}`);
    }
  });

  // Instruments inconnus s'il y en a
  Object.keys(counts).forEach((type) => {
    if (!['marcante', 'meiao', 'repique', ...otherTypes].includes(type)) {
      parts.push(`${counts[type]} ${type}`);
    }
  });

  return parts.join(', ');
}
