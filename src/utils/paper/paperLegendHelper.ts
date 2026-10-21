/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Dictionnaire des pupitres et symboles de frappe Cordel (< 60 lignes).
 */
import { PupitreCode, PupitreInfo } from '../../types/paperWorkshop.types';
export { renderHandwritingGuideHTML } from './paperHandwritingGuide';

export const PUPITRES_REGISTRY: PupitreInfo[] = [
  { code: 'al', nameFr: 'Alfaias', namePt: 'Alfaias', instId: 'marcante', symbolMemo: 'D (Droite/Dir), d (Faible), E/e (Gauche), S (Salto), V (Volta), B (Barulho)' },
  { code: 'cx', nameFr: 'Caixas', namePt: 'Caixas', instId: 'caixa', symbolMemo: 'D/d (Droite/Dir), E/e (Gauche), R (Rimshot), F (Flam), C (Coup sec)' },
  { code: 'gg', nameFr: 'Gonguê', namePt: 'Gonguê', instId: 'gongue', symbolMemo: 'G (Grave / Aberto), A (Aigu / Fechado / Abafado)' },
  { code: 'ab', nameFr: 'Agbe / Abê', namePt: 'Agbe / Abê', instId: 'agbe', symbolMemo: 'D (Base droite), E (Base gauche), d/e (Tapote), S (Salto), R (Rolar)' },
  { code: 'mi', nameFr: 'Mineiro', namePt: 'Mineiro', instId: 'mineiro', symbolMemo: 'P/p (Pousser / Frente), T/t (Tirer / Trás), L (Côté), B (Barulho)' },
  { code: 'tb', nameFr: 'Timbal', namePt: 'Timbal', instId: 'timbal', symbolMemo: 'G/g (Basse D/G), A/a (Ouvert), S/s (Slap), D/d (Fantôme), P/p (Pressé), F/f, V/v, C, B • MAJ=Droite / min=Gauche' },
  { code: 'td', nameFr: 'Toada (Voix)', namePt: 'Toada (Voz)', instId: 'puxador', symbolMemo: 'Paroles / Letras, P (Puxador), C (Coro), || (Fin de phrase)' },
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
    <div style="box-sizing: border-box; flex-shrink: 0; margin-top: auto; padding: 4px 8px; border: 1.5px solid #1a1a1a; font-family: monospace; font-size: 8pt; line-height: 1.25; background: #faf8f2;">
      <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 2px; font-size: 8.5pt; letter-spacing: 0.5px;">${title} :</div>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        ${selected.map((p) => `<div><strong>${p.code.toUpperCase()} (${lang === 'fr' ? p.nameFr : p.namePt}) :</strong> ${p.symbolMemo}</div>`).join('')}
      </div>
      <div style="margin-top: 2px; color: #555; font-style: italic; font-size: 7.5pt;">
        ${lang === 'fr' ? 'Case vide = Silence (0)  •  Double barre || = Fin/Coupure  •  Sauf Timbal : MAJ = Droite │ min = Gauche  •  Noircir ● les ronds pour le cloud' : 'Casa vazia = Silêncio (0)  •  Barra dupla || = Fim  •  Exceto Timbal: MAI = Direita │ min = Esquerda  •  Preencher ● os círculos para nuvem'}
      </div>
    </div>
  `;
};
