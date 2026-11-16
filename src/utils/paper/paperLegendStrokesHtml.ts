/**
 * Module HTML 1 : Tableau complet SSOT des frappes et conventions de carreaux (< 120 lignes).
 */
import { renderMasterExampleHTML } from './paperLegendMasterExample';

export const renderLegendStrokesHTML = (lang: 'fr' | 'pt'): string => {
  const isFr = lang === 'fr';

  return `
    <div style="font-family: sans-serif; color: #1a1a1a; font-size: 10pt; line-height: 1.35;">
      <div style="background: #faf6eb; border: 1.5px dashed #8b2a1a; padding: 4px 8px; margin-bottom: 8px; font-size: 9.5pt; font-weight: bold; text-align: center; color: #8b2a1a;">
        ${isFr
          ? 'ÉCRITURE : Titres & Noms en MAJUSCULES BÂTONS (ex: LUANDA) │ Frappes en SCRIPT détaché │ Noircir ● les ronds pour le Cloud'
          : 'ESCRITA: Títulos e Nomes em MAIÚSCULAS BASTÃO (ex: LUANDA) │ Toques em SCRIPT destacado │ Preencher ● os círculos para Nuvem'}
      </div>

      <div style="font-weight: bold; font-size: 12pt; text-transform: uppercase; color: #8b2a1a; border-bottom: 2px solid #8b2a1a; padding-bottom: 2px; margin-bottom: 6px;">
        1. ${isFr ? 'TABLEAU COMPLET DES FRAPPES PAR INSTRUMENT' : 'TABELA COMPLETA DE TOQUES POR INSTRUMENTO'}
        <span style="font-size: 9.5pt; font-weight: normal; color: #555; margin-left: 8px;">(${isFr ? 'MAJUSCULE = Fort │ minuscule = Faible (Sauf Timbal & Rimshot A/a Cx/Tr : MAJ = Droite │ min = Gauche)' : 'MAIÚSCULA = Forte │ minúscula = Fraco (Exceto Timbal e A/a Cx/Tr: MAI = Direita │ min = Esquerda)'})</span>
      </div>
      <div style="background: #faf6eb; border: 1px solid #d4cbb3; padding: 2px 6px; margin-bottom: 6px; font-size: 8pt; color: #555; font-style: italic;">
        ${isFr
          ? "Note : Les abréviations d'instruments dans la colonne de 14 mm (Al, Cx, Gg...) sont personnalisables dans l'Atelier Papier ou La Presse."
          : 'Nota: As abreviações de instrumentos na coluna de 14 mm (Al, Cx, Gg...) são personalizáveis na Oficina Papel ou A Prensa.'}
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9.5pt;">
        <thead>
          <tr style="background: #f4ecd8; border: 1.5px solid #1a1a1a; font-size: 10.5pt;">
            <th style="padding: 4px 6px; text-align: left; border-right: 1.5px solid #1a1a1a; width: 22%;">Pupitre (Code)</th>
            <th style="padding: 4px 6px; text-align: left; width: 78%;">${isFr ? 'Lettres & Frappes Officielles' : 'Letras e Toques Oficiais'}</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #ccc;">
            <td style="padding: 4px 6px; font-weight: bold; font-size: 10.5pt; border-right: 1.5px solid #1a1a1a; background: #fafafa;">Alfaias (Al, Mc, Me, Rp)</td>
            <td style="padding: 4px 6px;"><strong>D/d</strong> (${isFr ? 'Droite mailloche' : 'Direita maçaneta'}), <strong>E/e</strong> (${isFr ? 'Gauche, e met en vibration avant D' : 'Esquerda, e vibra antes de D'}), <strong>A/a</strong> (${isFr ? 'Abafado étouffé se décollant avant le coup suivant' : 'Abafado desencostando antes do próximo'}), <strong>I</strong> (Bacalhau Igarassu double barre <span style="font-family: monospace; font-weight: bold;">I</span>), <strong>C</strong> (Clic), <strong>X</strong> (Aro), <strong>B</strong> (Barulho). <em style="color: #8b2a1a;">(${isFr ? 'Aucun Fla sur Alfaia' : 'Sem Fla na Alfaia'})</em></td>
          </tr>
          <tr style="border-bottom: 1px solid #ccc; background: #fffcf5;">
            <td style="padding: 4px 6px; font-weight: bold; font-size: 10.5pt; border-right: 1.5px solid #1a1a1a;">Caixa &amp; Tarol (Cx, Tr)</td>
            <td style="padding: 4px 6px;"><strong>D/d</strong> (${isFr ? 'Droite' : 'Direita'}), <strong>E/e</strong> (${isFr ? 'Gauche' : 'Esquerda'}), <strong>R/r</strong> (${isFr ? 'Rufada — roulement court D/G' : 'Rufada — rulo curto D/E'}), <strong>F/f</strong> (Fla), <strong>A/a</strong> (${isFr ? 'Rimshot / Pele e Aro près du bord D/G' : 'Pele e Aro / Rimshot perto da borda D/E'}), <strong>C</strong> (Clic), <strong>X</strong> (Aro), <strong>B</strong> (Barulho)</td>
          </tr>
          <tr style="border-bottom: 1px solid #ccc;">
            <td style="padding: 4px 6px; font-weight: bold; font-size: 10.5pt; border-right: 1.5px solid #1a1a1a; background: #fafafa;">Gonguê (Gg)</td>
            <td style="padding: 4px 6px;"><em>${isFr ? 'Cloche unique en fer forgé :' : 'Campana única de ferro forjado :'}</em> <strong>G/g</strong> (${isFr ? 'Grave — haut près de la bouche' : 'Grave — topo perto da boca'}), <strong>A/a</strong> (${isFr ? 'Aigu — bas vers la base rigide' : 'Agudo — base rígida'}), <strong>B</strong> (Barulho)</td>
          </tr>
          <tr style="border-bottom: 1px solid #ccc; background: #fffcf5;">
            <td style="padding: 4px 6px; font-weight: bold; font-size: 10.5pt; border-right: 1.5px solid #1a1a1a;">Agbê (Ab)</td>
            <td style="padding: 4px 6px;"><strong>E/e</strong> (${isFr ? 'Gauche — calebasse tenue main droite allant vers la gauche, paume gauche' : 'Esquerda — cabaça na mão direita indo à esquerda, palma esquerda'}), <strong>D/d</strong> (${isFr ? 'Droite — retour latéral vers la droite' : 'Direita — retorno lateral para a direita'}), <strong>S</strong> (Salto), <strong>V</strong> (Volta), <strong>B</strong> (Barulho)</td>
          </tr>
          <tr style="border-bottom: 1px solid #ccc;">
            <td style="padding: 4px 6px; font-weight: bold; font-size: 10.5pt; border-right: 1.5px solid #1a1a1a; background: #fafafa;">Mineiro (Mi)</td>
            <td style="padding: 4px 6px;"><strong>P/p</strong> (${isFr ? 'Poussé avant / Projetar' : 'Projetar para frente'}), <strong>T/t</strong> (${isFr ? 'Tiré vers soi / Trazer' : 'Trazer para trás'}), <strong>L</strong> (${isFr ? 'Latéral / Lado' : 'Lado / Lateral'}), <strong>B</strong> (Barulho)</td>
          </tr>
          <tr style="border-bottom: 1px solid #ccc; background: #fffcf5;">
            <td style="padding: 4px 6px; font-weight: bold; font-size: 10.5pt; border-right: 1.5px solid #1a1a1a;">Timbal (Tb)</td>
            <td style="padding: 4px 6px;">
              <div style="background: #fff3cd; border: 1px solid #856404; padding: 2px 6px; margin-bottom: 3px; font-size: 8.5pt; font-weight: bold; color: #856404;">
                ${isFr ? 'Spécificité Timbal : MAJUSCULE = Main Droite │ minuscule = Main Gauche' : 'Regra do Timbal: MAIÚSCULA = Mão Direita │ minúscula = Mão Esquerda'}
              </div>
              ${isFr
                ? '<strong>G/g</strong> : Grave/Basse (D/G) • <strong>A/a</strong> : Ton ouvert/Aberto (D/G) • <strong>S/s</strong> : Claqué/Slap (D/G) • <strong>D/d</strong> : Doigts/Fantôme (D/G) • <strong>P/p</strong> : Pressé/Fermé (D/G) • <strong>F/f</strong> : Fla ouvert (D/G) • <strong>V/v</strong> : Fla claqué (D/G) • <strong>C</strong> : Clap • <strong>B</strong> : Barulho'
                : '<strong>G/g</strong> : Grave (D/E) • <strong>A/a</strong> : Aberto (D/E) • <strong>S/s</strong> : Slap (D/E) • <strong>D/d</strong> : Ponta de dedos (D/E) • <strong>P/p</strong> : Preso/Fechado (D/E) • <strong>F/f</strong> : Fla aberto (D/E) • <strong>V/v</strong> : Fla slap (D/E) • <strong>C</strong> : Palma • <strong>B</strong> : Barulho'}
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #ccc;">
            <td style="padding: 4px 6px; font-weight: bold; font-size: 10.5pt; border-right: 1.5px solid #1a1a1a; background: #fafafa;">Apito (Ap)</td>
            <td style="padding: 4px 6px;"><strong>W</strong> (${isFr ? 'Sifflet fort / long' : 'Apito forte / longo'}), <strong>w</strong> (${isFr ? 'Sifflet court / léger' : 'Apito curto / leve'})</td>
          </tr>
          <tr>
            <td style="padding: 4px 6px; font-weight: bold; font-size: 10.5pt; border-right: 1.5px solid #1a1a1a; background: #fffcf5;">Toada — v2 (Td, Px, Co)</td>
            <td style="padding: 4px 6px;"><strong>P</strong> (Puxador), <strong>C</strong> (Coro), <strong>_</strong> (${isFr ? 'Tenue / mélisme lié sans ré-attaque' : 'Sustentação / melisma ligado'}), <strong>/</strong> (${isFr ? 'Soudure de durée / mesures liées' : 'Soldadura entre tempos/compassos'}), <strong>0</strong> (${isFr ? 'Silence vocal explicite' : 'Silêncio vocal explícito'}), <strong>+</strong> (Anacrouse), <strong>[Dm7]</strong> (${isFr ? 'Accord' : 'Acorde'})</td>
          </tr>
        </tbody>
      </table>

      <div style="font-weight: bold; font-size: 12pt; text-transform: uppercase; color: #8b2a1a; border-bottom: 2px solid #8b2a1a; padding-bottom: 2px; margin-bottom: 6px;">
        2. ${isFr ? 'CONVENTIONS DES CARREAUX & SOUS-LIGNES DE VARIATION (↳)' : 'CONVENÇÕES DE CASAS & SUBLINHAS DE VARIAÇÃO (↳)'}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 9.5pt; margin-bottom: 6px;">
        <div style="background: #fafafa; border: 1px solid #ccc; padding: 6px 8px;">
          <div><strong>• ${isFr ? 'Case vide [ &nbsp; ] :' : 'Casa vazia [ &nbsp; ] :'}</strong> ${isFr ? 'Silence standard sur ligne maîtresse (0).' : 'Silêncio padrão na linha mestra (0).'}</div>
          <div style="margin-top: 2px;"><strong>• ${isFr ? 'Sous-ligne de variation (↳) :' : 'Sublinha de variação (↳) :'}</strong></div>
          <div style="padding-left: 8px; color: #333; margin-top: 2px;">
            - <em>${isFr ? 'Carreaux vides' : 'Casas vazias'}</em> = ${isFr ? 'Hérite automatiquement du motif maître.' : 'Herda automaticamente do padrão mestre.'}<br/>
            - <em>${isFr ? 'Tiret' : 'Traço'} <strong>-</strong></em> = ${isFr ? 'Force un vrai silence (gomme la frappe maîtresse).' : 'Força um silêncio real (apaga o golpe mestre).'}
          </div>
          <div style="margin-top: 2px;"><strong>• ${isFr ? 'Case scindée D/E ou d/I :' : 'Casa dividida D/E ou d/I :'}</strong> ${isFr ? 'Double coup successif (Ra).' : 'Toque duplo sucessivo (Rá).'}</div>
        </div>
        <div style="background: #fafafa; border: 1px solid #ccc; padding: 6px 8px;">
          <div><strong>• ${isFr ? 'Double barre || :' : 'Barra dupla || :'}</strong> ${isFr ? 'Fin et coupure nette du motif.' : 'Fim e corte imediato do padrão.'}</div>
          <div><strong>• ${isFr ? 'Trois points ... :' : 'Três pontos ... :'}</strong> ${isFr ? 'Reste de la mesure entièrement silencieux.' : 'Resto do compasso em silêncio.'}</div>
          <div><strong>• ${isFr ? 'Chiffre au-dessus d’un temps (6, 3, 4) :' : 'Número sobre o tempo (6, 3, 4) :'}</strong> ${isFr ? 'Subdivision (6 = sextolet, 3 = triolet).' : 'Subdivisão (6 = sextina, 3 = tercina).'}</div>
          <div><strong>• "Base", "Idem", "%" :</strong> ${isFr ? "Reprend le motif étalon de l'instrument." : 'Repete o padrão base do instrumento.'}</div>
          <div><strong>• ${isFr ? 'Ronds optiques ● :' : 'Círculos ópticos ● :'}</strong> ${isFr ? 'Noircir au stylo pour la sauvegarde Cloud au scan.' : 'Preencher à caneta para salvar na Nuvem no scan.'}</div>
        </div>
      </div>
      ${renderMasterExampleHTML(lang)}
    </div>
  `;
};
