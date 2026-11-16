/**
 * Exemple Maître Complet annoté pour la Légende (14mm + 32 carreaux) (< 95 lignes).
 */
import { resolvePupitreAbbr } from './paperNomenclatureHelper';

export function renderMasterExampleHTML(lang: 'fr' | 'pt' = 'fr'): string {
  const isFr = lang === 'fr';
  const al = resolvePupitreAbbr('al');
  const cx = resolvePupitreAbbr('cx');
  const ab = resolvePupitreAbbr('ab');
  const mi = resolvePupitreAbbr('mi');
  const tb = resolvePupitreAbbr('tb');

  const title = isFr
    ? 'EXEMPLE MAÎTRE COMPLET (TOUS LES CAS DE FIGURE SUR LA GRILLE 32 CARREAUX)'
    : 'EXEMPLO MESTRE COMPLETO (TODOS OS CASOS NA GRADE DE 32 CASAS)';

  const rows = [
    { inst: cx, cells: ['D', 'e', 'D', 'e', '|', 'D', 'e', 'D', 'e', '|', 'D', 'e', 'D', 'e', '|', 'D', 'e', 'D', 'e', '||'], tag: '[BASES]' },
    { inst: ab, cells: ['E', '.', 'd', 'e', '|', 'D', '.', 'e', 'd', '|', 'E', '.', 'd', 'e', '|', 'D', '.', 'e', 'd', '||'], tag: 'E paume / D retour' },
    { inst: '', cells: [], tag: isFr ? '(Ligne vide = séparateur de blocs)' : '(Linha vazia = separador de blocos)' },
    { inst: al, cells: ['D', '.', '.', '.', '|', 'D', '.', '.', '.', '|', 'e', 'I', '.', '.', '|', 'e', 'I', '.', '.', '||'], tag: '[IGARASSU] 4/4 (16p)' },
    { inst: '↳Rp V1', cells: ['.', '.', '.', '.', '|', '.', '.', '.', '.', '|', 'd', 'e', '.', '.', '|', '.', '.', '.', '.', '||'], tag: isFr ? '↳ vide = copie Al' : '↳ vazio = copia Al' },
    { inst: '↳Rp V2', cells: ['.', '.', '.', '.', '|', '.', '.', '.', '.', '|', 'd/I', '.', '-', '.', '|', '.', '.', '.', '.', '||'], tag: isFr ? 'd/I coupé, - forcé' : 'd/I duplo, - forçado' },
    { inst: cx, cells: ['Base', '', '', '', '|', '', '', '', '', '|', '', '', '', '', '|', '', '', '', '', '||'], tag: 'Base = recopie Cx' },
    { inst: '↳Cx V1', cells: ['.', '.', '.', '.', '|', '.', '.', '.', '.', '|', 'd', 'R', 'e', 'D', '|', '.', '.', '.', '.', '||'], tag: 'R = Rufada T3' },
    { inst: mi, cells: ['P', 't', 'P', 't', '|', 'P', 't', 'P', 't', '|', 'P', 't', 'P', 'T', '|', 'P', 't', 'P', 'T', '||'], tag: 'P t P T alterné' },
    { inst: al, cells: ['D', '.', '.', '.', '|', 'D', '.', '.', '.', '|', 'e', 'I', '.', '.', '|', 'e', 'I', '.', '.', '||', 'D', '.', '.', '.', '|', 'D', '.', '.', '.', '|', 'd', 'e', 'D', '.', '|', 'D', '.', '.', '.', '||'], tag: '[PARTIE A] (32p = 2 mes.)' },
    { inst: cx, cells: ['F', 'e', 'D', 'e', '|', 'D', 'e', 'D', 'e', '||'], tag: '[RELANCE] 2/4 (8p) - F = Fla' },
    { inst: tb, cells: ['G', 'a', 's', '|', 'G', 'd', 'A', '|', 'G', 'a', 's', '|', 'P', 'p', 'B', '||'], tag: '[TERNAIRE] 12/8 Tb (12p)' },
    { inst: al, cells: ['D', '.', 'e', 'd', 'e', 'd', '|', 'D', '.', 'e', 'd', 'e', 'd', '|', 'D', '.', 'e', 'D', '|', 'D', '.', '.', '.', '||'], tag: '[TREMER] 4/4 Mixte (20p)' },
    { inst: al, cells: ['D', '.', '.', '.', '|', '...', '||'], tag: isFr ? 'Abréviation fin : | ... ||' : 'Abreviação fim : | ... ||' },
    { inst: 'SÉQ.', cells: ['Intro(BPM=90->110)', '|', '||:', 'Igarassu x3 +Var(Cx,Rp)', '|', '[1. Partie A :||', '[2. Tremer', '|', 'Relance', '|', 'Fin ||'], tag: isFr ? 'Conducteur complet' : 'Condutor completo' },
  ];

  const renderedRows = rows.map((r) => {
    const isSpecialSeq = r.inst === 'SÉQ.';
    const cellContent = isSpecialSeq ? `
      <td colspan="32" style="border: 0.25mm solid var(--cordel-border, #7a7060); padding: 2px 4px; font-family: monospace; font-size: 6.5pt; font-weight: bold; background: var(--cordel-parchment-surface, #efe7d3); color: var(--cordel-wood, #8b2a1a);">
        ${r.cells.join(' ')}
      </td>
    ` : Array.from({ length: 32 }, (_, i) => {
      const val = r.cells[i] || '';
      const isBar = val === '|' || val === '||';
      const bg = val === 'Base' ? 'var(--cordel-parchment-panel, #ece4d0)' : (val && !isBar ? 'var(--cordel-parchment-surface, #efe7d3)' : 'transparent');
      const fw = isBar ? 'bold' : (val && val !== '.' && val !== '-' ? 'bold' : 'normal');
      const color = isBar ? 'var(--cordel-ink-dark, #1a1a1a)' : (val === '-' ? 'var(--cordel-status-danger, #a82819)' : (val === 'R' || val === 'd/I' ? 'var(--cordel-wood, #8b2a1a)' : 'var(--cordel-ink-dark, #1a1a1a)'));
      return `
        <td style="width: 7mm; min-width: 7mm; height: 5.2mm; text-align: center; border: 0.25mm solid var(--cordel-border, #7a7060); font-family: monospace; font-size: 6.5pt; font-weight: ${fw}; background: ${bg}; color: ${color};">
          ${val}
        </td>
      `;
    }).join('');

    return `
      <tr style="height: 5.2mm;">
        <td style="width: 14mm; min-width: 14mm; font-size: 6.5pt; font-weight: bold; font-family: sans-serif; text-align: center; border: 0.25mm solid var(--cordel-border, #7a7060); background: var(--cordel-parchment-panel, #ece4d0); color: var(--cordel-ink-dark, #1a1a1a);">
          ${r.inst}
        </td>
        ${cellContent}
        <td style="font-size: 6pt; font-family: sans-serif; padding-left: 4px; color: var(--cordel-text-muted, #44403c); white-space: nowrap; border: none;">
          ${r.tag}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div style="margin: 10px 0; border: 1.5px solid var(--cordel-wood, #8b2a1a); padding: 6px; background: var(--cordel-paper-surface, #f4ecd8); page-break-inside: avoid;">
      <div style="font-weight: bold; font-size: 8.5pt; font-family: sans-serif; color: var(--cordel-wood, #8b2a1a); text-transform: uppercase; margin-bottom: 4px;">
        ${title}
      </div>
      <table style="border-collapse: collapse; table-layout: fixed; width: 100%;">
        <tbody>
          ${renderedRows}
        </tbody>
      </table>
    </div>
  `;
}
