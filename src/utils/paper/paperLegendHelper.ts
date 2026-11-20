/**
 * Dictionnaire SSOT des pupitres et symboles de frappe Cordel (< 55 lignes).
 */
import { PupitreCode, PupitreInfo } from '../../types/paperWorkshop.types';
export { renderHandwritingGuideHTML } from './paperHandwritingGuide';

export const PUPITRES_REGISTRY: PupitreInfo[] = [
  { code: 'al', nameFr: 'Alfaias', namePt: 'Alfaias', instId: 'marcante', symbolMemo: 'D/d (Droite/Dir), E/e (Gauche/Esq), A/a (Abafado), I (Bacalhau), C (Clic), X (Aro), B (Barulho)' },
  { code: 'cx', nameFr: 'Caixas & Tarol', namePt: 'Caixas e Tarol', instId: 'caixa', symbolMemo: 'D/d (Droite/Dir), E/e (Gauche/Esq), R/r (Rufada), F/f (Fla), A/a (Rimshot / Pele e Aro), C (Clic), X (Aro), B/b (Barulho : B -> b -> / -> .)' },
  { code: 'gg', nameFr: 'Gonguê', namePt: 'Gonguê', instId: 'gongue', symbolMemo: 'Cloche unique : G/g (Grave — Haut / Topo), A/a (Aigu — Base), X (Arrêt étouffé / Parada), B (Barulho)' },
  { code: 'ab', nameFr: 'Agbê', namePt: 'Agbê', instId: 'agbe', symbolMemo: 'E/e (Gauche — Paume / Palma), D/d (Droite — Retour / Retorno), S (Salto), V (Volta), B (Barulho)' },
  { code: 'mi', nameFr: 'Mineiro', namePt: 'Mineiro', instId: 'mineiro', symbolMemo: 'P/p (Poussé / Projetar), T/t (Tiré / Trazer), L (Latéral / Lado), B (Barulho)' },
  { code: 'tb', nameFr: 'Timbal', namePt: 'Timbal', instId: 'timbal', symbolMemo: 'G/g (Basse), A/a (Ouvert), S/s (Slap F.), T/t (Slap O. / Tapa Ab.), D/d (Doigts), P/p (Pressé), F/f, V/v, C, B • MAJ=Droite / min=Gauche' },
  { code: 'ap', nameFr: 'Apito', namePt: 'Apito', instId: 'apito', symbolMemo: 'L/l (Long bouclé : L -> l -> / -> .), C (Court / Curto)' },
  { code: 'td', nameFr: 'Toada (Voix)', namePt: 'Toada (Voz)', instId: 'puxador', symbolMemo: 'P (Puxador), C (Coro), _ (Tenue liée), / (Soudure), 0 (Silence vocal), + (Anacrouse)' },
];

export const getPupitreInfo = (code: PupitreCode): PupitreInfo => {
  return PUPITRES_REGISTRY.find((p) => p.code === code) || PUPITRES_REGISTRY[0];
};

export const generateMemoFooterText = (pupitres: PupitreCode[], lang: 'fr' | 'pt'): string => {
  const selected = PUPITRES_REGISTRY.filter((p) => pupitres.includes(p.code));
  const prefix = lang === 'fr' ? 'MEMO FRAPPES : ' : 'LEGENDA DE TOQUES : ';
  return prefix + selected.map((p) => `[${p.code.toUpperCase()}] ${p.symbolMemo}`).join('  •  ');
};

export const generateMemoFooterHTML = (pupitres: PupitreCode[], lang: 'fr' | 'pt'): string => {
  const selected = PUPITRES_REGISTRY.filter((p) => pupitres.includes(p.code));
  const title = lang === 'fr' ? 'MÉMO DES LETTRES & FRAPPES' : 'LEGENDA DE TOQUES & LETRAS';
  return `
    <div style="box-sizing: border-box; flex-shrink: 0; margin-top: auto; padding: 4px 8px; border: 1.5px solid var(--cordel-ink-dark, #1a1a1a); font-family: monospace; font-size: 8pt; line-height: 1.25; background: var(--cordel-parchment-bg, #f4ecd8);">
      <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 2px; font-size: 8.5pt; letter-spacing: 0.5px;">${title} :</div>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        ${selected.map((p) => `<div><strong>${p.code.toUpperCase()} (${lang === 'fr' ? p.nameFr : p.namePt}) :</strong> ${p.symbolMemo}</div>`).join('')}
      </div>
      <div style="margin-top: 2px; color: var(--cordel-text-muted, #44403c); font-style: italic; font-size: 7.5pt;">
        ${lang === 'fr' ? 'Case vide = Silence (0)  •  Double barre || = Fin/Coupure  •  Sauf Timbal & Rimshot A/a Cx/Tr : MAJ = Droite │ min = Gauche' : 'Casa vazia = Silêncio (0)  •  Barra dupla || = Fim  •  Exceto Timbal e A/a Cx/Tr: MAI = Direita │ min = Esquerda'}
      </div>
    </div>
  `;
};
