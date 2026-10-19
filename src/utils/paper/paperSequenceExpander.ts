/**
 * paperSequenceExpander.ts
 * Déroulement intelligent des séquences Cordel : boîtes 1re/2e fois, Coda ⊕, D.S./D.C. et macros (< 120 lignes).
 */

export interface ExpandedMeasureToken {
  name: string;
  hasVariationDice?: boolean;
  forcedVariation?: string;
}

export function expandSequenceTokens(seqStr: string): string[] {
  let cleaned = seqStr.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  // 1. Résolution des macros préalables : [A] = [ Luanda x2 | Trovão ]
  const macroMap = new Map<string, string>();
  cleaned = cleaned.replace(/\[\s*([a-zA-Z0-9_-]+)\s*\]\s*=\s*\[\s*(.*?)\s*\]/gi, (_, name, body) => {
    macroMap.set(name.trim().toLowerCase(), body.trim());
    return '';
  });

  macroMap.forEach((body, name) => {
    const macroRegex = new RegExp(`\\b${name}\\b`, 'gi');
    cleaned = cleaned.replace(macroRegex, body);
  });

  // 2. Déroulement des boîtes de 1re et 2e fois : ||: Corps | [1. V1 :|| [2. V2 ||
  const voltasRegex = /\|\|:\s*(.*?)\s*\|\s*\[1\.\s*(.*?)\s*:\|\|\s*\[2\.\s*(.*?)\s*(?:\|\||\||$)/gi;
  cleaned = cleaned.replace(voltasRegex, (_, body, v1, v2) => {
    return `${body} | ${v1} | ${body} | ${v2}`;
  });

  // 3. Déroulement des reprises simples ||: A | B :|| xN
  cleaned = cleaned.replace(/\|\|:\s*(.*?)\s*:\|\|\s*(?:[xX*×](\d+))?/gi, (_, body, repeatStr) => {
    const times = repeatStr ? parseInt(repeatStr, 10) : 2;
    return Array(times).fill(body.trim()).join(' | ');
  });

  // 4. Déroulement des crochets génériques : [ A | B ] xN
  cleaned = cleaned.replace(/\[\s*(.*?)\s*\]\s*(?:[xX*×](\d+))?/gi, (_, body, repeatStr) => {
    const times = repeatStr ? parseInt(repeatStr, 10) : 1;
    return Array(times).fill(body.trim()).join(' | ');
  });

  // 5. Coda (⊕), Da Capo (D.C.) et Dal Segno (D.S.)
  if (/(\bto\s+coda\b|⊕|al\s+coda)/i.test(cleaned)) {
    const parts = cleaned.split(/(?:⊕\s*coda|\[coda\])/i);
    if (parts.length >= 2) {
      const mainBody = parts[0].trim();
      const codaBody = parts[1].trim();
      const cleanMain = mainBody.replace(/(\bto\s+coda\b|⊕)/gi, '').replace(/\b(d\.c\.|d\.s\.)\b.*$/gi, '').trim();
      cleaned = `${cleanMain} | ${codaBody}`;
    }
  }

  // 6. Découpage en mesures individuelles
  const rawTokens = cleaned.split(/[|,\n]/).map((t) => t.trim()).filter((t) => t && t !== '||' && t !== ':||' && t !== '||:');
  const result: string[] = [];

  for (const token of rawTokens) {
    const multMatch = token.match(/^(.*?)\s*([xX*×])\s*(\d+)$/);
    if (multMatch) {
      const name = multMatch[1].trim();
      const count = parseInt(multMatch[3], 10) || 1;
      for (let i = 0; i < count; i++) result.push(name);
    } else {
      // Nettoyage de notations résiduelles
      const clean = token.replace(/^(m\.\s*\d+-\d+\s*:?)/i, '').trim();
      if (clean) result.push(clean);
    }
  }

  return result;
}

export function parseMeasureVariationTag(token: string): { name: string; hasDice: boolean; forcedVar?: string } {
  let name = token.trim();
  const hasDice = name.includes('⊡') || /\+\s*var/i.test(name);
  name = name.replace(/⊡/g, '').replace(/\+\s*var/gi, '').trim();

  let forcedVar: string | undefined;
  const vMatch = name.match(/^(.*?)\s*\((v\d+)\)$/i);
  if (vMatch) {
    name = vMatch[1].trim();
    forcedVar = vMatch[2].toLowerCase();
  }

  return { name, hasDice, forcedVar };
}
