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
  const mode = opts.mode || 'full_page';

  const customCodes = getCustomPupitreCodes();
  const knownCodesStr = Object.entries(customCodes).map(([k, v]) => `${k}: "${v}"`).join(', ');

  const baseHeader = `TU ES LE RECONNAISSEUR EXPERT DE PARTITIONS DE PERCUSSION DU SÉQUENCIAD'OR (O GIRADOR).
CODES PUPITRES RECONNUS : [ ${knownCodesStr} ].
RÈGLES D'IDENTIFICATION MANUSCRITE :
1. Marge gauche : "Al" manuscrit ressemble souvent à "Ae" (le "l" cursif ressemble à un "e") -> toujours normaliser en rôle "al".
2. Pupitre "Ab" (Agbê) : contient couramment les lettres T, P, D, E, S, V, B. Ne jamais omettre la ligne "Ab" ni ses lettres T et P.
3. Extraire TOUTES les lignes écrites dans la marge gauche (Al, Cx, Gg, Ab, Mi, Tb, Tr, Mc, Me, Rp, Ap...).
4. ZÉRO "1" : INTERDICTION FORMELLE DE REMPLACER LES LETTRES PAR DES "1". Conserver fidèlement les lettres manuscrites exactes (ex: D, d, E, e, G, g, A, a, T, t, P, p, I, i, R, F, X, B, C).
5. Silences / cases vides : "." ou "-" ou espace vide -> renvoyer "0".
6. Alignement temporel : les barres verticales "|" séparent les temps (ex: 4 temps en 4/4) et "||" termine le motif. Si les Temps 1 et 2 sont vides (ex: ". . . . | . . . ."), renvoyer pour ces temps ["0","0","0","0"]. Les frappes écrites dans les 3e et 4e compartiments doivent obligatoirement tomber sur les Temps 3 et 4.
7. Alignement vertical & micro-points : vérifier impérativement l'alignement des frappes avec les colonnes 1..32 en haut de la feuille et les micro-points de repère tous les 4 carreaux (4, 8, 12, 16, 20, 24, 28).
8. ZÉRO remplissage silencieux : ne JAMAIS compléter silencieusement la fin d'un temps ou d'une mesure avec des "0" ou "." si le compte de cases lues entre deux barres "|" (ou avant "||") ne tombe pas juste (ex: 3 ou 5 cases lues au lieu de 4, ou 15 / 17 cases au lieu de 16).
9. Vigilance décalage : dès qu'une case est étroite, effacée ou que le compte de cases d'un temps est incertain, inclure obligatoirement un objet dans "doubts" avec la raison "Décalage possible : nombre de cases incertain sur ce temps".`;

  if (mode === 'single_pattern') {
    const secTarget = opts.targetSectionName ? `CIBLE : Motif "${opts.targetSectionName}".` : 'CIBLE : Détecte l\'unique motif cadré.';
    return `${baseHeader}
${secTarget}
EXTRACTION DE CE MOTIF (ex: 4 temps de 4 doubles-croches = 16 pas) :
RÉPONSE JSON STRICTE (sans texte autour) :
{
  "pattern": {
    "name": "${opts.targetSectionName || 'Motif'}",
    "detectedTimeSig": "4/4",
    "beatResolutions": [4, 4, 4, 4],
    "totalSteps": 16,
    "lines": [
      { "role": "al", "isVariation": false, "beats": [["0","0","0","0"],["0","0","0","0"],["0","0","D","0"],["E","0","D","0"]] },
      { "role": "cx", "isVariation": false, "beats": [["0","0","0","0"],["0","0","0","0"],["0","0","D","0"],["D","0","D","0"]] },
      { "role": "gg", "isVariation": false, "beats": [["0","0","0","0"],["0","0","0","0"],["0","0","G","0"],["G","0","G","0"]] },
      { "role": "ab", "isVariation": false, "beats": [["0","0","0","0"],["0","0","0","0"],["0","0","T","0"],["P","0","T","0"]] }
    ],
    "doubts": [{ "role": "cx", "stepIndex": 12, "reason": "Décalage possible : nombre de cases incertain sur ce temps" }]
  }
}`.trim();
  }

  if (mode === 'sequence_only') {
    const knownList = opts.existingSectionNames?.length
      ? `MOTIFS CONNUS (FAVORISER CETTE CORRESPONDANCE EXACTE) : [ ${opts.existingSectionNames.map((s) => `"${s}"`).join(', ')} ].`
      : '';
    return `${baseHeader}
EXTRACTION DU CONDUCTEUR / SÉQUENCE :
${knownList}
Lis l'ordre des étiquettes (ex: "Intro x2", "Base x4", "1", "2", "Virada").
RÉPONSE JSON STRICTE :
{
  "sequence": ["Intro", "Intro", "Base", "Base", "Base", "Base"]
}`.trim();
  }

  // mode 'full_page' par défaut
  return `${baseHeader}
FORMAT A4 : 1 colonne Instrument (14mm) + 32 carreaux (8mm). Lignes manuscrites séparées par ligne vide.
RÈGLES D'EXTRACTION :
1. Barres "|" séparent les temps, "||" termine le motif.
2. Découpage en temps : renvoie les cellules découpées temps par temps ("beats").
3. Subdivisions : 4x4=16 (4/4), 2x4=8 (2/4), 3x4=12 (3/4), 4x3=12 (12/8).
4. Lettres exactes, jamais de "1". Case coupée : "d/I". Tiret "-" ou "." = silence ("0").
5. Si un temps n'a pas le bon compte de cellules, renvoyer les cellules lues et ajouter un objet dans "doubts".
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
      ],
      "doubts"?: [{ "role": string, "stepIndex": number, "reason": string }]
    }
  ],
  "sequence": string[]
}`.trim();
}
