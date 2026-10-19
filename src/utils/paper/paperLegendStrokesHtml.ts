/**
 * paperLegendStrokesHtml.ts
 * Module HTML 1 : Tableau complet des frappes et conventions de carreaux (< 120 lignes).
 */
export const renderLegendStrokesHTML = (lang: 'fr' | 'pt'): string => {
  const isFr = lang === 'fr';

  return `
    <div style="font-family: sans-serif; color: #1a1a1a; font-size: 8.5px; line-height: 1.35;">
      <!-- Titre Section 1 -->
      <div style="font-weight: bold; font-size: 11px; text-transform: uppercase; color: #8b2a1a; border-bottom: 1.5px solid #8b2a1a; padding-bottom: 2px; margin-bottom: 6px;">
        1. ${isFr ? 'TABLEAU COMPLET DES FRAPPES PAR INSTRUMENT' : 'TABELA COMPLETA DE TOQUES POR INSTRUMENTO'}
        <span style="font-size: 9px; font-weight: normal; color: #555; margin-left: 8px;">(${isFr ? 'MAJUSCULE = Fort │ minuscule = Faible' : 'MAIÚSCULA = Forte │ minúscula = Fraco'})</span>
      </div>

      <!-- Grille des Instruments -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 8px;">
        <thead>
          <tr style="background: #f4ecd8; border: 1px solid #1a1a1a;">
            <th style="padding: 3px 5px; text-align: left; border-right: 1px solid #1a1a1a; width: 18%;">Pupitre (Code)</th>
            <th style="padding: 3px 5px; text-align: left; width: 82%;">${isFr ? 'Lettres & Frappes Reconnues' : 'Letras e Toques Reconhecidos'}</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #ccc;">
            <td style="padding: 3px 5px; font-weight: bold; border-right: 1px solid #1a1a1a; background: #fafafa;">Alfaias (Al, Mc, Me, Rp)</td>
            <td style="padding: 3px 5px;"><strong>D/d</strong> (Droite/Dir), <strong>E/e</strong> (Gauche/Esq), <strong>I/i</strong> (Bacalhau double barre <span style="font-family: monospace; font-weight: bold;">I</span>), <strong>B</strong> (Barulho), <strong>C</strong> (Baguettes/Clac), <strong>X</strong> (Aro/Cerclage). <em style="color: #8b2a1a;">(Aucun Fla sur Alfaia)</em></td>
          </tr>
          <tr style="border-bottom: 1px solid #ccc; background: #fffcf5;">
            <td style="padding: 3px 5px; font-weight: bold; border-right: 1px solid #1a1a1a;">Caixa & Tarol (Cx, Tr)</td>
            <td style="padding: 3px 5px;"><strong>D/d</strong> (Droite), <strong>E/e</strong> (Gauche), <strong>R/r</strong> (Roulement / Rouffade), <strong>F/f</strong> (Fla), <strong>X</strong> (Aro / Cerclage), <strong>C</strong> (Clic)</td>
          </tr>
          <tr style="border-bottom: 1px solid #ccc;">
            <td style="padding: 3px 5px; font-weight: bold; border-right: 1px solid #1a1a1a; background: #fafafa;">Gonguê (Gg)</td>
            <td style="padding: 3px 5px;"><strong>G/g</strong> (Grave / Aberto), <strong>A/a</strong> (Aigu / Agudo), <strong>X</strong> (Corps / Étouffé / Borda), <strong>B</strong> (Barulho)</td>
          </tr>
          <tr style="border-bottom: 1px solid #ccc; background: #fffcf5;">
            <td style="padding: 3px 5px; font-weight: bold; border-right: 1px solid #1a1a1a;">Agbê / Abê (Ab)</td>
            <td style="padding: 3px 5px;"><strong>D/d</strong> (Base droite), <strong>E/e</strong> (Base gauche), <strong>S</strong> (Secousse / Salto), <strong>V</strong> (Frappé / Volta), <strong>B</strong> (Barulho)</td>
          </tr>
          <tr style="border-bottom: 1px solid #ccc;">
            <td style="padding: 3px 5px; font-weight: bold; border-right: 1px solid #1a1a1a; background: #fafafa;">Mineiro (Mi)</td>
            <td style="padding: 3px 5px;"><strong>P/p</strong> (Poussé / Frente), <strong>T/t</strong> (Tiré / Trás), <strong>L</strong> (Lié / Côté / Lateral), <strong>B</strong> (Arrêté sec sur roulement / Tremer)</td>
          </tr>
          <tr style="border-bottom: 1px solid #ccc; background: #fffcf5;">
            <td style="padding: 3px 5px; font-weight: bold; border-right: 1px solid #1a1a1a;">Timbal (Tb)</td>
            <td style="padding: 3px 5px;"><strong>G/g</strong> (Basse), <strong>A/a</strong> (Ouvert / Aberto), <strong>S/s</strong> (Claqué / Slap), <strong>D/d</strong> (Fantôme), <strong>P/p</strong> (Pressé), <strong>F/f</strong> (Fla ouvert), <strong>V/v</strong> (Fla claqué), <strong>C</strong> (Clap), <strong>B</strong> (Barulho)</td>
          </tr>
          <tr style="border-bottom: 1px solid #ccc;">
            <td style="padding: 3px 5px; font-weight: bold; border-right: 1px solid #1a1a1a; background: #fafafa;">Apito (Ap)</td>
            <td style="padding: 3px 5px;"><strong>W/w</strong> (Sifflet Long / Court — compatible avec <strong>A</strong> / <strong>S</strong> sur papier)</td>
          </tr>
          <tr>
            <td style="padding: 3px 5px; font-weight: bold; border-right: 1px solid #1a1a1a; background: #fffcf5;">Toada (Td, Px, Co)</td>
            <td style="padding: 3px 5px;"><strong>+</strong> (Anacrouse), <strong>/</strong> (Mesures liées), <strong>*Gras*</strong> (Puxador solo), <strong>[Dm7]</strong> (Accord harmonie), <strong>~</strong> (Glissando / Tenue)</td>
          </tr>
        </tbody>
      </table>

      <!-- Titre Section 2 -->
      <div style="font-weight: bold; font-size: 11px; text-transform: uppercase; color: #8b2a1a; border-bottom: 1.5px solid #8b2a1a; padding-bottom: 2px; margin-bottom: 6px;">
        2. ${isFr ? 'CONVENTIONS DES CARREAUX & SOUS-LIGNES DE VARIATION (↳)' : 'CONVENÇÕES DE CASAS & SUBLINHAS DE VARIAÇÃO (↳)'}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 8px; margin-bottom: 8px;">
        <div style="background: #fafafa; border: 1px solid #ddd; padding: 5px 7px;">
          <div><strong>• Case vide [ &nbsp; ] :</strong> Silence standard sur ligne maîtresse (0).</div>
          <div><strong>• Règle du Temps Vide vs Tiret (-) sur sous-ligne (↳) :</strong></div>
          <div style="padding-left: 8px; color: #333;">
            - <em>4 carreaux d'un temps laissés vides</em> = Recopie automatiquement le temps de la ligne du dessus.<br/>
            - <em>Tiret <strong>-</strong> dans une case</em> = Force un <strong>vrai silence</strong> (gomme la frappe de la ligne maîtresse).
          </div>
          <div><strong>• Case coupée D/E ou d/I (ou (dI)) :</strong> Double coup (Ra / 2 triples-croches en 1 case).</div>
        </div>
        <div style="background: #fafafa; border: 1px solid #ddd; padding: 5px 7px;">
          <div><strong>• Double barre || :</strong> Fin et coupure nette du motif (cases suivantes ignorées).</div>
          <div><strong>• Trois points ... (ex: D . . . | ...) :</strong> Reste de la mesure entièrement silencieux.</div>
          <div><strong>• Chiffre au-dessus d'un temps (6, 3, 4) :</strong> Subdivision (6 = sextolet, 3 = triolet, 4 = doubles).</div>
          <div><strong>• Mots-clés "Base", "Base 1", "Idem", "%" :</strong> Reprend le motif étalon de l'instrument.</div>
        </div>
      </div>
    </div>
  `;
};
