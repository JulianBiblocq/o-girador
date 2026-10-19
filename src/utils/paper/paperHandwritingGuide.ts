/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Modèle complet d'écriture manuscrite sur feuille vierge (< 110 lignes).
 */

export const renderHandwritingGuideHTML = (lang: 'fr' | 'pt'): string => {
  const isFr = lang === 'fr';
  const title = isFr
    ? '✍️ MODÈLE COMPLET : COMMENT TOUT ÉCRIRE À LA MAIN SUR FEUILLE VIERGE'
    : '✍️ MODELO COMPLETO : COMO ESCREVER TUDO À MÃO NA FOLHA LIVRE';

  return `
    <div style="margin-top: 14px; border: 2px solid #8b2a1a; padding: 10px 12px; background: #fffcf5; font-family: sans-serif; color: #1a1a1a;">
      <div style="font-weight: bold; font-size: 11px; text-transform: uppercase; color: #8b2a1a; margin-bottom: 6px; letter-spacing: 0.5px;">
        ${title}
      </div>

      <!-- Exemple Visuel Miniature de Partition Dessinée à la main -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-family: monospace; font-size: 8.5px; background: #fff;">
        <tr style="background: #f5f0e6; font-weight: bold;">
          <td style="width: 65px; border: 1px solid #1a1a1a; padding: 2px 4px;">Marge G.</td>
          <td colspan="4" style="border: 1px solid #1a1a1a; text-align: center; border-right: 2px solid #000;">Temps 1</td>
          <td colspan="4" style="border: 1px solid #1a1a1a; text-align: center; border-right: 2px solid #000;">Temps 2</td>
          <td colspan="4" style="border: 1px solid #1a1a1a; text-align: center; border-right: 2px solid #000;">Temps 3</td>
          <td colspan="4" style="border: 1px solid #1a1a1a; text-align: center; border-right: 2px solid #000;">Temps 4</td>
          <td style="width: 32px; border: 1px solid #1a1a1a; text-align: center;">Rep.</td>
        </tr>
        <tr>
          <td style="border: 1px solid #1a1a1a; font-weight: bold; background: #eee; padding: 2px 4px;">Mc+Me</td>
          <td style="border: 1px solid #bbb; text-align: center; background: #fff8e8;">D</td>
          <td style="border: 1px solid #bbb; text-align: center;">-</td>
          <td style="border: 1px solid #bbb; text-align: center;">-</td>
          <td style="border: 1px solid #bbb; border-right: 2px solid #000; text-align: center;">-</td>
          <td style="border: 1px solid #bbb; text-align: center;">-</td>
          <td style="border: 1px solid #bbb; text-align: center;">-</td>
          <td style="border: 1px solid #bbb; text-align: center;">-</td>
          <td style="border: 1px solid #bbb; border-right: 2px solid #000; text-align: center;">-</td>
          <td style="border: 1px solid #bbb; text-align: center;">e</td>
          <td style="border: 1px solid #bbb; text-align: center; background: #fff8e8;">D</td>
          <td style="border: 1px solid #bbb; text-align: center;">-</td>
          <td style="border: 1px solid #bbb; border-right: 2px solid #000; text-align: center;">-</td>
          <td style="border: 1px solid #bbb; text-align: center;">e</td>
          <td style="border: 1px solid #bbb; text-align: center; background: #fff8e8;">D</td>
          <td style="border: 1px solid #bbb; text-align: center;">-</td>
          <td style="border: 1px solid #bbb; border-right: 2px solid #000; text-align: center;">-</td>
          <td style="border: 1px solid #1a1a1a; text-align: center; font-weight: bold; background: #fafafa;">×4</td>
        </tr>
        <tr style="color: #666;">
          <td style="border: 1px solid #1a1a1a; font-weight: bold; background: #fdfdfd; padding: 2px 4px; color: #8b2a1a;">↳Rp</td>
          <td colspan="8" style="border: 1px solid #bbb; border-right: 2px solid #000; text-align: center; font-style: italic; background: #fbfbfb;">(cases vides = hérite de Mc+Me)</td>
          <td style="border: 1px solid #bbb; text-align: center; background: #ffe6e6; color: #8b2a1a; font-weight: bold;">d</td>
          <td style="border: 1px solid #bbb; text-align: center; background: #ffe6e6; color: #8b2a1a; font-weight: bold;">E</td>
          <td style="border: 1px solid #bbb; text-align: center;">-</td>
          <td style="border: 1px solid #bbb; border-right: 2px solid #000; text-align: center;">-</td>
          <td colspan="4" style="border: 1px solid #bbb; border-right: 2px solid #000; text-align: center; font-style: italic; background: #fbfbfb;">(hérite)</td>
          <td style="border: 1px solid #1a1a1a; text-align: center;"></td>
        </tr>
        <tr>
          <td style="border: 1px solid #1a1a1a; font-weight: bold; background: #eee; padding: 2px 4px;">Cx</td>
          <td style="border: 1px solid #bbb; text-align: center;">D/E</td>
          <td style="border: 1px solid #bbb; text-align: center;">D</td>
          <td style="border: 1px solid #bbb; text-align: center;">e</td>
          <td style="border: 1px solid #bbb; border-right: 2px solid #000; text-align: center;">D</td>
          <td style="border: 1px solid #bbb; text-align: center;">D</td>
          <td style="border: 1px solid #bbb; text-align: center;">e</td>
          <td style="border: 1px solid #bbb; text-align: center;">D</td>
          <td style="border: 1px solid #bbb; border-right: 2px solid #000; text-align: center;">e</td>
          <td colspan="8" style="border: 1px solid #bbb; border-right: 2px solid #000; text-align: center; font-weight: bold; color: #999; background: #f0f0f0;">|| (fin / coupure nette)</td>
          <td style="border: 1px solid #1a1a1a; text-align: center;"></td>
        </tr>
        <tr>
          <td style="border: 1px solid #1a1a1a; font-weight: bold; background: #eee; padding: 2px 4px;">Gg</td>
          <td colspan="16" style="border: 1px solid #bbb; border-right: 2px solid #000; text-align: center; font-weight: bold; letter-spacing: 4px; background: #fffbe6; color: #8b2a1a;">B A S E</td>
          <td style="border: 1px solid #1a1a1a; text-align: center;"></td>
        </tr>
      </table>

      <!-- Règles de Notation Manuscrite Synthétiques -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 8px; line-height: 1.35;">
        <div>
          <div><strong>1. Liaisons d'instruments :</strong> Écrire <code>Al</code> (lie toutes les alfaias), <code>Mc+Me</code>, <code>Cx+Tr</code>, <code>Ab+Mi</code> dans la marge gauche ou tracer une accolade <code>{ Al</code>.</div>
          <div><strong>2. Sous-ligne de variation :</strong> Écrire <code>↳Rp</code> ou <code>↳Me/Rp</code>. Remplir <em>uniquement les cases qui changent</em> : les cases vides copient automatiquement la ligne maîtresse.</div>
          <div><strong>3. Coups doubles (Ras) :</strong> Écrire <code>D/E</code> ou <code>d/I</code> dans le même carreau pour deux frappes rapides scindées.</div>
        </div>
        <div>
          <div><strong>4. Barres de temps & Arrêt :</strong> Tracer une barre <code>|</code> pour séparer les temps, et une double barre <code>||</code> pour couper le pattern (carreaux suivants ignorés).</div>
          <div><strong>5. Mot-clé "Base" ou "Idem" :</strong> Écrire <code>Base</code> en travers des carreaux pour reprendre le motif étalon sans tout redessiner.</div>
          <div><strong>6. Séquence & Conducteur en bas :</strong> Écrire <code>Luanda x4 | Partie 1 x2</code> ou <code>||: A | B :|| x2</code> directement au stylo.</div>
        </div>
      </div>
    </div>
  `;
};
