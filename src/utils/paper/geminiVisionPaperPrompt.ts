/**
 * Prompt système et spécifications JSON pour Gemini Vision OCR Atelier Papier (< 130 lignes).
 */
import { getCustomPupitreCodes } from './paperNomenclatureHelper';

export type VisionPromptMode = 'full_page' | 'single_pattern' | 'sequence_only';

export interface VisionPromptOptions {
  mode?: VisionPromptMode;
  targetSectionName?: string;
  existingSectionNames?: string[];
  lang?: 'fr' | 'pt';
}

export function buildGeminiVisionPaperPrompt(options: VisionPromptOptions | 'fr' | 'pt' = 'fr'): string {
  const opts: VisionPromptOptions = typeof options === 'string' ? { lang: options } : options;
  const lang = opts.lang || 'fr';
  const mode = opts.mode || 'full_page';

  const customCodes = getCustomPupitreCodes();
  const knownCodesStr = Object.entries(customCodes).map(([k, v]) => `${k}: "${v}"`).join(', ');

  const langNote = lang === 'fr'
    ? 'Analyse en français. Reconnais les abréviations personnalisées de l\'utilisateur.'
    : 'Análise em português. Reconheça as abreviações personalizadas do usuário.';

  const baseHeader = `TU ES LE RECONNAISSEUR EXPERT DE PARTITIONS DE PERCUSSION DU SÉQUENCIAD'OR (O GIRADOR).\n${langNote}\nCODES D'INSTRUMENTS : [ ${knownCodesStr} ].`;

  if (mode === 'single_pattern') {
    const secTarget = opts.targetSectionName ? `CIBLE : Motif "${opts.targetSectionName}".` : 'CIBLE : Détecte l\'unique motif cadré.';
    return `${baseHeader}
${secTarget}
EXTRACTION D'UN SEUL MOTIF :
1. Barres de temps : Détecte les séparations "|" et la fin "||".
2. Renvoie les cellules découpées temps par temps ("beats").
3. MAJUSCULE = coup fort, minuscule = coup faible. Tiret "-" = silence. "Base" ou "%" = recopie base.
4. "↳" ou "Var" = ligne de variation.
RÉPONSE JSON STRICTE :
{
  "pattern": {
    "name": "${opts.targetSectionName || 'Motif'}",
    "detectedTimeSig": "4/4" | "2/4" | "3/4" | "12/8",
    "beatResolutions": [4, 4, 4, 4],
    "totalSteps": 16,
    "lines": [
      { "role": "string", "isVariation": false, "beats": [["1","0","0","0"],["1","0","0","0"]] }
    ]
  }
}`.trim();
  }

  if (mode === 'sequence_only') {
    const knownList = opts.existingSectionNames?.length
      ? `MOTIFS CONNUS DE LA PARTITION (FAVORISER CETTE CORRESPONDANCE EXACTE) : [ ${opts.existingSectionNames.map((s) => `"${s}"`).join(', ')} ].`
      : '';
    return `${baseHeader}
EXTRACTION DU CONDUCTEUR / SÉQUENCE :
${knownList}
Lis l'ordre des étiquettes de sections (ex: "Intro x2", "Base x4", "1", "2", "Virada").
RÉPONSE JSON STRICTE :
{
  "sequence": ["Intro", "Intro", "Base", "Base", "Base", "Base"]
}`.trim();
  }

  // mode 'full_page' par défaut
  return `${baseHeader}
FORMAT A4 : 1 colonne Instrument (14mm) + 32 carreaux (8mm). Lignes manuscrites séparées par ligne vide.
RÈGLES D'EXTRACTION :
1. Barres de temps : "|" sépare les temps, "||" termine le motif.
2. Découpage en temps : Renvoie les cellules découpées temps par temps ("beats").
3. Subdivisions : 4x4=16 (4/4), 2x4=8 (2/4), 3x4=12 (3/4), 4x3=12 (12/8).
4. Lettres et Frappes : MAJUSCULE = coup fort, minuscule = faible. Case coupée: "d/I". Tiret "-" = silence. "Base" ou "%" = base. "↳" = variation.
RÉPONSE JSON STRICTE :
{
  "songTitle": string,
  "globalBpm": number,
  "globalTimeSig": "4/4" | "2/4" | "3/4" | "12/8",
  "patterns": [
    {
      "name": string,
      "detectedTimeSig": string,
      "beatResolutions": number[],
      "totalSteps": number,
      "lines": [
        { "role": string, "isVariation": boolean, "beats": string[][] }
      ]
    }
  ],
  "sequence": string[]
}`.trim();
}
