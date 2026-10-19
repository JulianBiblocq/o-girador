/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Dictionnaire des pupitres et symboles de frappe Cordel (< 110 lignes).
 */
import { PupitreCode, PupitreInfo } from '../../types/paperWorkshop.types';

export const PUPITRES_REGISTRY: PupitreInfo[] = [
  { code: 'al', nameFr: 'Alfaias', namePt: 'Alfaias', instId: 'marcante', symbolMemo: 'D (Droite/Dir), d (Faible/Fraca), E/e (Gauche/Esq), S (Salto), V (Volta), B (Barulho)' },
  { code: 'cx', nameFr: 'Caixas', namePt: 'Caixas', instId: 'caixa', symbolMemo: 'D/d (Droite/Dir), E/e (Gauche/Esq), R (Rimshot), F (Flam), C (Coup sec)' },
  { code: 'gg', nameFr: 'Gonguê', namePt: 'Gonguê', instId: 'gongue', symbolMemo: 'G (Grave / Aberto), A (Aigu / Fechado / Abafado)' },
  { code: 'ab', nameFr: 'Agbe / Abê', namePt: 'Agbe / Abê', instId: 'agbe', symbolMemo: 'D (Base droite), E (Base gauche), d/e (Tapote), S (Salto), R (Rolar)' },
  { code: 'mi', nameFr: 'Mineiro', namePt: 'Mineiro', instId: 'mineiro', symbolMemo: 'P/p (Pousser / Frente), T/t (Tirer / Trás), L (Côté / Lado), B (Barulho)' },
  { code: 'tb', nameFr: 'Timbal', namePt: 'Timbal', instId: 'timbal', symbolMemo: 'O (Open / Aberto), S (Slap), B (Bass / Grave), T (Touch)' },
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
    <div style="margin-top: 10px; padding: 6px 10px; border: 1.5px solid #1a1a1a; font-family: monospace; font-size: 8px; line-height: 1.35; background: #faf8f2;">
      <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 3px; font-size: 9px; letter-spacing: 0.5px;">${title} :</div>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        ${selected.map((p) => `<div><strong>${p.code.toUpperCase()} (${lang === 'fr' ? p.nameFr : p.namePt}) :</strong> ${p.symbolMemo}</div>`).join('')}
      </div>
      <div style="margin-top: 3px; color: #555; font-style: italic;">
        ${lang === 'fr' ? 'Case vide = Silence (0)  •  Double barre || = Fin/Coupure du motif  •  Mot-clé "Base" = reprise du motif étalon' : 'Casa vazia = Silêncio (0)  •  Barra dupla || = Fim do motivo  •  Palavra-chave "Base" = repete o motivo padrão'}
      </div>
    </div>
  `;
};
