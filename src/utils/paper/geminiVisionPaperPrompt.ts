/**
 * Prompt système et spécification JSON pour Gemini Vision OCR Atelier Papier (< 130 lignes).
 */
import { getCustomPupitreCodes } from './paperNomenclatureHelper';

export function buildGeminiVisionPaperPrompt(lang: 'fr' | 'pt' = 'fr'): string {
  const customCodes = getCustomPupitreCodes();
  const knownCodesStr = Object.entries(customCodes)
    .map(([key, abbr]) => `${key}: "${abbr}"`)
    .join(', ');

  const langNote = lang === 'fr'
    ? 'Analyse en français. Reconnais les abréviations personnalisées de l\'utilisateur.'
    : 'Análise em português. Reconheça as abreviações personalizadas do usuário.';

  return `
TU ES LE RECONNAISSEUR EXPERT DE PARTITIONS DE PERCUSSION DU SÉQUENCIAD'OR (O GIRADOR).
${langNote}

GÉOMÉTRIE DE LA FICHE :
- Format A4 Paysage : 1 colonne Instrument (14mm) à gauche + 32 carreaux de frappe (8mm).
- Lignes : jusqu'à 25 lignes manuscrites avec blocs séparés par une ligne vide.
- Raccourcis d'instruments personnalisables par l'utilisateur : [ ${knownCodesStr} ].

RÈGLES CRITIQUES D'EXTRACTION DES TEMPS ET DES FRAIS :
1. Barres de temps : Détecte les barres verticales simples "|" séparant les temps et la double barre "||" terminant le motif.
2. Découpage en temps : Pour chaque ligne de pupitre, renvoie les cellules découpées temps par temps ("beats").
3. Subdivisions automatiques :
   - 4 temps de 4 cellules = 16 pas (4/4)
   - 2 temps de 4 cellules = 8 pas (2/4)
   - 3 temps de 4 cellules = 12 pas (3/4)
   - 4 temps de 3 cellules = 12 pas (12/8)
   - 4 temps de 6 cellules = 24 pas (4/4 sextolets)
   - 2 temps de 6 cellules + 2 temps de 4 cellules = 20 pas (4/4 mixte)
4. Lettres et Frappes :
   - MAJUSCULE = coup fort, minuscule = coup faible.
   - Timbal : MAJUSCULE = main droite, minuscule = main gauche (G/g, A/a, S/s, D/d, P/p, F/f, V/v, C, B).
   - "I" avec deux barres horizontales = Bacalhau.
   - Case coupée : "d/I" (double frappe dans un seul carreau).
   - Tiret "-" = silence forcé écrasant le maître.
   - "Base" ou "%" = recopie automatique de la ligne de base du pupitre.
   - "↳" ou "Var" = ligne de variation. Si une case est vide, elle hérite du maître.

SCHÉMA JSON STRICT DE RÉPONSE :
{
  "songTitle": string,
  "globalBpm": number,
  "globalTimeSig": "4/4" | "2/4" | "3/4" | "6/8" | "12/8",
  "patterns": [
    {
      "name": string,
      "detectedTimeSig": string,
      "beatResolutions": number[],
      "totalSteps": number,
      "lines": [
        {
          "role": string,
          "isVariation": boolean,
          "beats": string[][]
        }
      ]
    }
  ],
  "sequence": string[]
}
`.trim();
}
