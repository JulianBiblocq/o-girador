/**
 * aoVivoTesterCatalog.ts — Catalogue des frappes et séquences du banc de test Ao Vivo (< 40 lignes).
 */
export type TesterFamily = 'alfaia' | 'caixa' | 'gongue' | 'timbal' | 'agbe' | 'mineiro';

export const TESTER_STROKES: Record<TesterFamily, { id: string; lbl: string }[]> = {
  alfaia: [
    { id: 'D', lbl: 'D' }, { id: 'd', lbl: 'd' },
    { id: 'E', lbl: 'E' }, { id: 'e', lbl: 'e' },
    { id: 'A', lbl: 'A (Abaf)' }, { id: 'I', lbl: 'I (Bac)' },
    { id: 'C', lbl: 'C' }, { id: 'X', lbl: 'X' }, { id: 'B', lbl: 'B' },
  ],
  caixa: [{ id: 'D', lbl: 'D' }, { id: 'd', lbl: 'd' }, { id: 'E', lbl: 'E' }, { id: 'e', lbl: 'e' }, { id: 'R', lbl: 'R' }, { id: 'r', lbl: 'r' }, { id: 'F', lbl: 'F' }, { id: 'f', lbl: 'f' }, { id: 'C', lbl: 'C' }, { id: 'X', lbl: 'X' }, { id: 'B', lbl: 'B' }],
  gongue: [{ id: 'G', lbl: 'G' }, { id: 'g', lbl: 'g' }, { id: 'A', lbl: 'A' }, { id: 'a', lbl: 'a' }, { id: 'X', lbl: 'X (Flanc)' }, { id: 'B', lbl: 'B (Bar)' }],
  timbal: [{ id: 'G', lbl: 'G' }, { id: 'g', lbl: 'g' }, { id: 'A', lbl: 'A' }, { id: 'a', lbl: 'a' }, { id: 'S', lbl: 'S' }, { id: 's', lbl: 's' }, { id: 'P', lbl: 'P' }, { id: 'D', lbl: 'D' }, { id: 'F', lbl: 'F' }, { id: 'V', lbl: 'V' }, { id: 'C', lbl: 'C' }, { id: 'B', lbl: 'B' }],
  agbe: [{ id: 'D', lbl: 'D' }, { id: 'd', lbl: 'd' }, { id: 'E', lbl: 'E' }, { id: 'e', lbl: 'e' }, { id: 'S', lbl: 'S (Salto)' }, { id: 'V', lbl: 'V (Volta)' }, { id: 'B', lbl: 'B' }],
  mineiro: [{ id: 'P', lbl: 'P' }, { id: 'p', lbl: 'p' }, { id: 'T', lbl: 'T' }, { id: 't', lbl: 't' }, { id: 'L', lbl: 'L (Lado)' }, { id: 'B', lbl: 'B' }],
};

export const TESTER_SEQUENCES: Record<TesterFamily, { id: string; lbl: string; steps: string[] }[]> = {
  alfaia: [
    { id: 'seq_Dd', lbl: 'D·d', steps: ['D', 'd'] },
    { id: 'seq_DAeD', lbl: 'D·A·e·D', steps: ['D', 'A', 'e', 'D'] },
    { id: 'seq_DddD', lbl: 'D·d·d·D', steps: ['D', 'd', 'd', 'D'] },
    { id: 'seq_DedE', lbl: 'D·e·d·E', steps: ['D', 'e', 'd', 'E'] },
  ],
  caixa: [{ id: 'seq_Dd', lbl: 'D·d', steps: ['D', 'd'] }, { id: 'seq_DddD', lbl: 'D·d·d·D', steps: ['D', 'd', 'd', 'D'] }, { id: 'seq_DedE', lbl: 'D·e·d·E', steps: ['D', 'e', 'd', 'E'] }],
  gongue: [{ id: 'seq_GgAa', lbl: 'G·g·A·a', steps: ['G', 'g', 'A', 'a'] }, { id: 'seq_GA', lbl: 'G·A', steps: ['G', 'A'] }],
  timbal: [{ id: 'seq_GSA', lbl: 'G·S·A', steps: ['G', 'S', 'A'] }, { id: 'seq_SdS', lbl: 'S·d·S', steps: ['S', 'D', 'S'] }],
  agbe: [{ id: 'seq_DeEd', lbl: 'D·e·E·d', steps: ['D', 'e', 'E', 'd'] }, { id: 'seq_DSE', lbl: 'D·S·E', steps: ['D', 'S', 'E'] }, { id: 'seq_SV', lbl: 'S·V', steps: ['S', 'V'] }],
  mineiro: [{ id: 'seq_PpTt', lbl: 'P·p·T·t', steps: ['P', 'p', 'T', 't'] }, { id: 'seq_PTL', lbl: 'P·T·L', steps: ['P', 'T', 'L'] }],
};
