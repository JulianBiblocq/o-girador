export interface HasPatternName {
  name?: string;
}

/**
 * Nettoie les suffixes parasites comme (Cópia), (Copie), (Var), etc.
 */
export function cleanPatternBaseName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s*\((?:c[oó]pia|copie|copy|var\.?)\s*\d*\)$/i, '')
    .trim();
}

/**
 * Génère un nom de pattern unique pour une piste donnée.
 *
 * @param patterns Liste des motifs existants sur la piste cible
 * @param baseName Nom de base facultatif (si duplication / collage créant un nouveau motif)
 * @param lang Langue courante ('fr', 'pt', 'en')
 * @returns Un nom unique respectant les règles d'incrémentation
 */
export function getNextPatternName(
  patterns: HasPatternName[] = [],
  baseName?: string,
  lang: string = 'fr'
): string {
  const existingNames = new Set(
    patterns
      .map(p => (p.name || '').trim().toLowerCase())
      .filter(Boolean)
  );

  const prefix = lang === 'fr' ? 'Motif' : (lang === 'en' ? 'Pattern' : 'Padrão');

  // 1. Création vierge (aucun baseName fourni)
  if (!baseName || !baseName.trim()) {
    let maxIndex = 0;
    // Regex couvrant Motif, Padrão, Padrao, Pattern suivi d'un espace et d'un nombre
    const standardNameRegex = /^(?:Motif|Padr[ãa]o|Pattern)\s+(\d+)$/i;

    for (const p of patterns) {
      const trimmed = (p.name || '').trim();
      const match = trimmed.match(standardNameRegex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxIndex) {
          maxIndex = num;
        }
      }
    }

    let candidateNum = maxIndex + 1;
    let candidate = `${prefix} ${candidateNum}`;
    while (existingNames.has(candidate.toLowerCase())) {
      candidateNum++;
      candidate = `${prefix} ${candidateNum}`;
    }
    return candidate;
  }

  // 2. Duplication / Collage créant un nouveau motif avec baseName fourni
  const cleaned = cleanPatternBaseName(baseName);
  const numberEndingMatch = cleaned.match(/^(.*?)\s*(\d+)$/);

  if (numberEndingMatch) {
    const rawRadical = numberEndingMatch[1].trim();
    const radical = rawRadical ? `${rawRadical} ` : '';
    const initialNum = parseInt(numberEndingMatch[2], 10);

    let candidateNum = initialNum + 1;
    let candidate = `${radical}${candidateNum}`;

    while (existingNames.has(candidate.toLowerCase())) {
      candidateNum++;
      candidate = `${radical}${candidateNum}`;
    }
    return candidate;
  } else {
    // Si le nom ne se termine pas par un nombre (ex: "Base", "Virada", "Solo")
    let candidateNum = 2;
    let candidate = `${cleaned} ${candidateNum}`;

    while (existingNames.has(candidate.toLowerCase())) {
      candidateNum++;
      candidate = `${cleaned} ${candidateNum}`;
    }
    return candidate;
  }
}
