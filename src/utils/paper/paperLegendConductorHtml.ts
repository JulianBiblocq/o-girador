/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Module HTML 2 : Syntaxe complète du conducteur, Coda, dé carré ⊡ et 5 Règles d'Or (< 120 lignes).
 */
export const renderLegendConductorHTML = (lang: 'fr' | 'pt'): string => {
  const isFr = lang === 'fr';

  return `
    <div style="font-family: sans-serif; color: #1a1a1a; font-size: 10pt; line-height: 1.35;">
      <!-- Titre Section 3 -->
      <div style="font-weight: bold; font-size: 12pt; text-transform: uppercase; color: #8b2a1a; border-bottom: 2px solid #8b2a1a; padding-bottom: 2px; margin-bottom: 6px;">
        3. ${isFr ? 'SYNTAXE DU CONDUCTEUR (SÉQUENCE & ARRANGEMENT)' : 'SINTAXE DO CONDUTOR (SEQUÊNCIA & ARRANJO)'}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 9.5pt; margin-bottom: 8px;">
        <div style="background: #fafafa; border: 1px solid #ccc; padding: 6px 8px;">
          <div><strong>• Multiplicateurs & Plages :</strong> <code>Luanda x4</code> ou <code>m. 3-9</code>.</div>
          <div style="margin-top: 2px;"><strong>• Reprises :</strong> <code>||: A | B :|| x2</code> (répète 2 fois le bloc).</div>
          <div style="margin-top: 2px;"><strong>• Boîtes 1re et 2e fois (1ª / 2ª Volta) :</strong></div>
          <div style="padding-left: 6px; font-family: monospace; color: #8b2a1a; font-size: 9pt;">
            ||: Luanda x3 | [1. Trovão :|| [2. Fim Martelo ||
          </div>
          <div style="padding-left: 6px; color: #555; font-size: 8.5pt;">➔ 1er tour joue Trovão, 2e tour saute à Fim Martelo.</div>
          <div style="margin-top: 2px;"><strong>• Coda (⊕) & Renvois (D.C. / D.S.) :</strong></div>
          <div style="padding-left: 6px; color: #333; font-size: 8.5pt;">
            - <strong>D.C.</strong> = Da Capo │ <strong>D.S.</strong> = Dal Segno (𝄋).<br/>
            - <strong>To Coda ⊕</strong> = Au 2e passage, saute au bloc <strong>⊕ Coda</strong>.
          </div>
        </div>
        <div style="background: #fafafa; border: 1px solid #ccc; padding: 6px 8px;">
          <div><strong>• Dé carré ⊡ (🎲) & Variations à la volée :</strong></div>
          <div style="padding-left: 6px; color: #333; font-size: 8.5pt;">
            - <code>| Luanda x3 |</code> = Joue la base pure.<br/>
            - <code>| Luanda x3 ⊡ |</code> ou <code>+ Var</code> = Active le tirage aléatoire des variations.<br/>
            - <code>| Luanda(v2) |</code> = Force la variation v2 sur cette mesure précise.<br/>
            - <code>Igarassu + Var (Cx, Rp) x8</code> = Variations ciblées sur certains pupitres.
          </div>
          <div style="margin-top: 3px;"><strong>• Crochets de Sections & Macros :</strong> <code>Partie 1 [ Luanda x3 | Trovão ] x2</code>.</div>
          <div style="margin-top: 2px;"><strong>• Tempo & Rampes :</strong> <code>♩ = 110 ↗ 120</code> (accélération), <code>♩ = 120 ↘ 90</code> (ralenti).</div>
        </div>
      </div>

      <!-- Titre Section 4 : Les 5 Règles d'Or -->
      <div style="border: 2px solid #8b2a1a; background: #fffcf5; padding: 6px 10px; margin-top: 4px;">
        <div style="font-weight: bold; font-size: 11pt; text-transform: uppercase; color: #8b2a1a; margin-bottom: 4px; display: flex; align-items: center; gap: 5px;">
          <span>⭐</span> ${isFr ? 'LES 5 RÈGLES D’OR POUR UN SCAN PHOTO SANS DOUTE' : 'AS 5 REGRAS DE OURO PARA UM SCAN PERFEITO'}
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 8.5pt; line-height: 1.3;">
          <div>
            <div><strong>1. MAJUSCULES BÂTONS :</strong> Noms de motifs/sections toujours en lettres capitales bien droites.</div>
            <div><strong>2. Double barre du "I" (Bacalhau) :</strong> Toujours tracer les deux barres horizontales haut et bas sur le <code>I</code> pour ne jamais le confondre avec une barre <code>|</code>.</div>
            <div><strong>3. Croisement franc du "t" (Mineiro) :</strong> Bien croiser la barre horizontale du <code>t</code> des deux côtés.</div>
          </div>
          <div>
            <div><strong>4. Fermeture des mesures :</strong> Toujours borner le motif par une barre <code>|</code> ou double barre <code>||</code>.</div>
            <div><strong>5. Slash "/" pour doubles coups :</strong> Écrire <code>d/I</code> ou <code>D/E</code> avec un slash oblique. <em>Pas de barre verticale dans un carreau</em>.</div>
          </div>
        </div>
      </div>
    </div>
  `;
};
