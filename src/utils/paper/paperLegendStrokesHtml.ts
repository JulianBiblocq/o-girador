/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Module HTML 1 : Tableau complet des frappes et conventions de carreaux (< 130 lignes).
 */
export const renderLegendStrokesHTML = (lang: 'fr' | 'pt'): string => {
  const isFr = lang === 'fr';

  return `
    <div style="font-family: sans-serif; color: #1a1a1a; font-size: 10pt; line-height: 1.35;">
      <!-- Règle d'écriture manuscrite & Optique -->
      <div style="background: #faf6eb; border: 1.5px dashed #8b2a1a; padding: 4px 8px; margin-bottom: 8px; font-size: 9.5pt; font-weight: bold; text-align: center; color: #8b2a1a;">
        ${isFr
          ? 'ÉCRITURE : Titres & Noms en MAJUSCULES BÂTONS (ex: LUANDA) │ Frappes en SCRIPT détaché │ Noircir ● les ronds pour le Cloud'
          : 'ESCRITA: Títulos e Nomes em MAIÚSCULAS BASTÃO (ex: LUANDA) │ Toques em SCRIPT destacado │ Preencher ● os círculos para Nuvem'}
      </div>

      <!-- Titre Section 1 -->
      <div style="font-weight: bold; font-size: 12pt; text-transform: uppercase; color: #8b2a1a; border-bottom: 2px solid #8b2a1a; padding-bottom: 2px; margin-bottom: 6px;">
        1. ${isFr ? 'TABLEAU COMPLET DES FRAPPES PAR INSTRUMENT' : 'TABELA COMPLETA DE TOQUES POR INSTRUMENTO'}
        <span style="font-size: 10pt; font-weight: normal; color: #555; margin-left: 8px;">(${isFr ? 'MAJUSCULE = Fort │ minuscule = Faible (Sauf Timbal : MAJ = Droite │ min = Gauche)' : 'MAIÚSCULA = Forte │ minúscula = Fraco (Exceto Timbal: MAI = Direita │ min = Esquerda)'})</span>
      </div>

      <!-- Grille des Instruments -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9.5pt;">
        <thead>
          <tr style="background: #f4ecd8; border: 1.5px solid #1a1a1a; font-size: 10.5pt;">
            <th style="padding: 4px 6px; text-align: left; border-right: 1.5px solid #1a1a1a; width: 22%;">Pupitre (Code)</th>
            <th style="padding: 4px 6px; text-align: left; width: 78%;">${isFr ? 'Lettres & Frappes Reconnues' : 'Letras e Toques Reconhecidos'}</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #ccc;">
            <td style="padding: 4px 6px; font-weight: bold; font-size: 11pt; border-right: 1.5px solid #1a1a1a; background: #fafafa;">Alfaias (Al, Mc, Me, Rp)</td>
            <td style="padding: 4px 6px;"><strong>D/d</strong> (Droite/Dir), <strong>E/e</strong> (Gauche/Esq), <strong>I/i</strong> (Bacalhau double barre <span style="font-family: monospace; font-weight: bold;">I</span>), <strong>B</strong> (Barulho), <strong>C</strong> (Baguettes/Clac), <strong>X</strong> (Aro/Cerclage). <em style="color: #8b2a1a;">(Aucun Fla sur Alfaia)</em></td>
          </tr>
          <tr style="border-bottom: 1px solid #ccc; background: #fffcf5;">
            <td style="padding: 4px 6px; font-weight: bold; font-size: 11pt; border-right: 1.5px solid #1a1a1a;">Caixa & Tarol (Cx, Tr)</td>
            <td style="padding: 4px 6px;"><strong>D/d</strong> (Droite), <strong>E/e</strong> (Gauche), <strong>R/r</strong> (Roulement / Rouffade), <strong>F/f</strong> (Fla), <strong>X</strong> (Aro / Cerclage), <strong>C</strong> (Clic)</td>
          </tr>
          <tr style="border-bottom: 1px solid #ccc;">
            <td style="padding: 4px 6px; font-weight: bold; font-size: 11pt; border-right: 1.5px solid #1a1a1a; background: #fafafa;">Gonguê (Gg)</td>
            <td style="padding: 4px 6px;"><strong>G/g</strong> (Grave / Aberto), <strong>A/a</strong> (Aigu / Agudo), <strong>X</strong> (Corps / Étouffé / Borda), <strong>B</strong> (Barulho)</td>
          </tr>
          <tr style="border-bottom: 1px solid #ccc; background: #fffcf5;">
            <td style="padding: 4px 6px; font-weight: bold; font-size: 11pt; border-right: 1.5px solid #1a1a1a;">Agbê / Abê (Ab)</td>
            <td style="padding: 4px 6px;"><strong>D/d</strong> (Base droite), <strong>E/e</strong> (Base gauche), <strong>S</strong> (Secousse / Salto), <strong>V</strong> (Frappé / Volta), <strong>B</strong> (Barulho)</td>
          </tr>
          <tr style="border-bottom: 1px solid #ccc;">
            <td style="padding: 4px 6px; font-weight: bold; font-size: 11pt; border-right: 1.5px solid #1a1a1a; background: #fafafa;">Mineiro (Mi)</td>
            <td style="padding: 4px 6px;"><strong>P/p</strong> (Poussé / Frente), <strong>T/t</strong> (Tiré / Trás), <strong>L</strong> (Lié / Côté / Lateral), <strong>B</strong> (Arrêté sec sur roulement / Tremer)</td>
          </tr>
          <tr style="border-bottom: 1px solid #ccc; background: #fffcf5;">
            <td style="padding: 4px 6px; font-weight: bold; font-size: 11pt; border-right: 1.5px solid #1a1a1a;">Timbal (Tb)</td>
            <td style="padding: 4px 6px;">
              <div style="background: #fff3cd; border: 1px solid #856404; padding: 2px 6px; margin-bottom: 3px; font-size: 8.5pt; font-weight: bold; color: #856404; border-radius: 2px;">
                ${isFr ? '⚠️ Spécificité Timbal : MAJUSCULE = Main Droite │ minuscule = Main Gauche' : '⚠️ Regra do Timbal: MAIÚSCULA = Mão Direita │ minúscula = Mão Esquerda'}
              </div>
              ${isFr
                ? '<strong>G/g</strong> : Basse (Droite/Gauche) • <strong>A/a</strong> : Ouvert (D/G) • <strong>S/s</strong> : Claqué/Slap (D/G) • <strong>D/d</strong> : Fantôme (D/G) • <strong>P/p</strong> : Pressé/Fermé (D/G) • <strong>F/f</strong> : Fla ouvert (D/G) • <strong>V/v</strong> : Fla claqué (D/G) • <strong>C</strong> : Clap • <strong>B</strong> : Barulho (Grondement)'
                : '<strong>G/g</strong> : Grave (Direita/Esquerda) • <strong>A/a</strong> : Aberto (D/E) • <strong>S/s</strong> : Slap (D/E) • <strong>D/d</strong> : Fantasma (D/E) • <strong>P/p</strong> : Preso/Abafado (D/E) • <strong>F/f</strong> : Fla aberto (D/E) • <strong>V/v</strong> : Fla slap (D/E) • <strong>C</strong> : Palma • <strong>B</strong> : Barulho (Vibração)'}
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #ccc;">
            <td style="padding: 4px 6px; font-weight: bold; font-size: 11pt; border-right: 1.5px solid #1a1a1a; background: #fafafa;">Apito (Ap)</td>
            <td style="padding: 4px 6px;"><strong>W/w</strong> (Sifflet Long / Court — compatible avec <strong>A</strong> / <strong>S</strong> sur papier)</td>
          </tr>
          <tr>
            <td style="padding: 4px 6px; font-weight: bold; font-size: 11pt; border-right: 1.5px solid #1a1a1a; background: #fffcf5;">Toada (Td, Px, Co)</td>
            <td style="padding: 4px 6px;"><strong>+</strong> (Anacrouse), <strong>/</strong> (Mesures liées), <strong>*Gras*</strong> (Puxador solo), <strong>[Dm7]</strong> (Accord harmonie), <strong>~</strong> (Glissando / Tenue)</td>
          </tr>
        </tbody>
      </table>

      <!-- Titre Section 2 -->
      <div style="font-weight: bold; font-size: 12pt; text-transform: uppercase; color: #8b2a1a; border-bottom: 2px solid #8b2a1a; padding-bottom: 2px; margin-bottom: 6px;">
        2. ${isFr ? 'CONVENTIONS DES CARREAUX & SOUS-LIGNES DE VARIATION (↳)' : 'CONVENÇÕES DE CASAS & SUBLINHAS DE VARIAÇÃO (↳)'}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 10pt; margin-bottom: 6px;">
        <div style="background: #fafafa; border: 1px solid #ccc; padding: 6px 8px;">
          <div><strong>• Case vide [ &nbsp; ] :</strong> Silence standard sur ligne maîtresse (0).</div>
          <div style="margin-top: 2px;"><strong>• Règle du Temps Vide vs Tiret (-) sur sous-ligne (↳) :</strong></div>
          <div style="padding-left: 8px; color: #333; margin-top: 2px;">
            - <em>4 carreaux d'un temps laissés vides</em> = Recopie automatiquement le temps du dessus.<br/>
            - <em>Tiret <strong>-</strong> dans une case</em> = Force un <strong>vrai silence</strong> (gomme la frappe maîtresse).
          </div>
          <div style="margin-top: 2px;"><strong>• Case coupée D/E ou d/I :</strong> Double coup (Ra / 2 doubles en 1 case).</div>
        </div>
        <div style="background: #fafafa; border: 1px solid #ccc; padding: 6px 8px;">
          <div><strong>• Double barre || :</strong> Fin et coupure nette du motif (cases suivantes ignorées).</div>
          <div><strong>• Trois points ... (ex: D . . . | ...) :</strong> Reste de la mesure entièrement silencieux.</div>
          <div><strong>• Chiffre au-dessus d'un temps (6, 3, 4) :</strong> Subdivision (6 = sextolet, 3 = triolet).</div>
          <div><strong>• Mots-clés "Base", "Base 1", "Idem", "%" :</strong> Reprend le motif étalon de l'instrument.</div>
          <div><strong>• Ronds optiques ● :</strong> Noircir au stylo pour déclencher la sauvegarde Cloud au scan.</div>
        </div>
      </div>
    </div>
  `;
};
