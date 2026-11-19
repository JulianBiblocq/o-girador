/**
 * strokeDockMatrixConfig.ts — Configuration SSOT des matrices 2 lignes + mini-labels FR/BR pour les 7 familles (< 140 lignes).
 */
import { DockCentralColumn, DockDirectionalColumn, DockRowLabel, StrokeDockMatrixSpec } from './strokeDockMatrixTypes';

const k = (symbol: string, title?: string) => ({ symbol, title });
const pair = (s: string, w: string) => ({ kind: 'pair' as const, strong: k(s), weak: k(w) });
const single = (symbol: string) => ({ kind: 'single' as const, key: k(symbol) });
const empty = () => ({ kind: 'empty' as const });
const tall = (id: string, label: string, symbol: string): DockCentralColumn => ({ kind: 'tall', id, label, key: k(symbol) });

function makeBarulhoCol(isFr: boolean, mainSym = 'B', softSym = 'b', label = 'Barulho'): DockCentralColumn {
  return {
    kind: 'barulho',
    id: mainSym,
    label,
    main: k(mainSym, isFr ? `${mainSym} — Appel + Tenue` : `${mainSym} — Chamada + Sustentação`),
    minis: [
      k(softSym, isFr ? `${softSym} — Doux (Fade-In)` : `${softSym} — Suave (Fade-In)`),
      k('/', isFr ? '/ — Extinction (Fade-Out)' : '/ — Extinção (Fade-Out)'),
      k('.', isFr ? '. — Fin (Silence)' : '. — Fim (Silêncio)'),
    ],
  };
}

function makeHandRows(isFr: boolean, isLeftHanded: boolean): [DockRowLabel, DockRowLabel] {
  const right = isFr ? 'Droite' : 'Direita';
  const left = isFr ? 'Gauche' : 'Esquerda';
  return isLeftHanded ? [{ text: left }, { text: right }] : [{ text: right }, { text: left }];
}

export function getDefaultBrushForInstrument(instId: string, instType = ''): string {
  if (instId === 'gongue' || instType === 'gongue' || instId === 'timbal') return 'G';
  if (instId === 'agbe') return 'E';
  if (instId === 'mineiro') return 'P';
  if (instId === 'apito') return 'L';
  return 'D';
}

export function buildStrokeDockMatrix(
  instId: string, instType: string, isFr: boolean, isLeftHanded: boolean
): StrokeDockMatrixSpec {
  const id = (instId || '').toLowerCase();
  const type = (instType || '').toLowerCase();
  const barulho = makeBarulhoCol(isFr);

  if (['marcante', 'meiao', 'repique', 'alfaia'].includes(id) || type === 'alfaia') {
    return {
      familyId: 'alfaia', defaultBrush: 'D', rows: makeHandRows(isFr, isLeftHanded),
      directionalCols: [
        { id: 'peau', label: isFr ? 'Peau' : 'Pele', top: pair('D', 'd'), bottom: pair('E', 'e') },
        { id: 'abafado', label: 'Abafado', top: empty(), bottom: single('A') },
        { id: 'bacalhau', label: 'Bacalhau', top: empty(), bottom: single('I') },
      ],
      centralCols: [tall('C', 'Clic', 'C'), tall('X', isFr ? 'Cerclage' : 'Aro', 'X'), barulho],
    };
  }

  if (id === 'caixa' || id === 'tarol' || type === 'caixa') {
    return {
      familyId: 'caixa', defaultBrush: 'D', rows: makeHandRows(isFr, isLeftHanded),
      directionalCols: [
        { id: 'peau', label: isFr ? 'Peau' : 'Pele', top: pair('D', 'd'), bottom: pair('E', 'e') },
        { id: 'fla', label: 'Fla', top: single('F'), bottom: single('f') },
        { id: 'rimshot', label: 'Rimshot', top: single('A'), bottom: single('a') },
        { id: 'rufada', label: 'Rufada', top: single('R'), bottom: single('r') },
      ],
      centralCols: [tall('C', 'Clic', 'C'), tall('X', isFr ? 'Cerclage' : 'Aro', 'X'), barulho],
    };
  }

  if (id === 'timbal') {
    const cols: DockDirectionalColumn[] = [
      { id: 'G', label: isFr ? 'Basse' : 'Grave', top: single('G'), bottom: single('g') },
      { id: 'A', label: 'Aberto', top: single('A'), bottom: single('a') },
      { id: 'S', label: 'Slap', top: single('S'), bottom: single('s') },
      { id: 'D', label: isFr ? 'Doigts' : 'Dedos', top: single('D'), bottom: single('d') },
      { id: 'P', label: isFr ? 'Pressé' : 'Preso', top: single('P'), bottom: single('p') },
      { id: 'F', label: 'Fla', top: single('F'), bottom: single('f') },
      { id: 'V', label: 'Fla Slap', top: single('V'), bottom: single('v') },
    ];
    return {
      familyId: 'timbal', defaultBrush: 'G', rows: makeHandRows(isFr, isLeftHanded),
      directionalCols: cols,
      centralCols: [tall('C', isFr ? 'Clap' : 'Palma', 'C'), barulho],
    };
  }

  if (id === 'gongue' || type === 'gongue') {
    return {
      familyId: 'gongue', defaultBrush: 'G',
      rows: [
        { text: isFr ? 'Grave' : 'Grave — Topo', title: isFr ? 'Grave — Haut de la cloche' : 'Grave — Topo da campana' },
        { text: isFr ? 'Aigu' : 'Agudo — Base', title: isFr ? 'Aigu — Base de la cloche' : 'Agudo — Base da campana' },
      ],
      directionalCols: [{ id: 'cloche', label: isFr ? 'Cloche' : 'Campana', top: pair('G', 'g'), bottom: pair('A', 'a') }],
      centralCols: [tall('X', 'Parada', 'X'), barulho],
    };
  }

  if (id === 'agbe') {
    // getVisualStrokeSymbol laisse E/D invariants sur Agbê : ← Vers G. reste toujours associé à E et → Vers D. à D.
    return {
      familyId: 'agbe', defaultBrush: 'E',
      rows: [
        { text: isFr ? 'Vers G.' : 'Para Esq.', arrow: 'left' },
        { text: isFr ? 'Vers D.' : 'Para Dir.', arrow: 'right' },
      ],
      directionalCols: [{ id: 'filet', label: isFr ? 'Filet' : 'Malha', top: pair('E', 'e'), bottom: pair('D', 'd') }],
      centralCols: [tall('S', 'Salto', 'S'), tall('V', 'Volta', 'V'), barulho],
    };
  }

  if (id === 'mineiro') {
    return {
      familyId: 'mineiro', defaultBrush: 'P',
      rows: [
        { text: isFr ? 'Pousser' : 'Projetar', arrow: 'up' },
        { text: isFr ? 'Tirer' : 'Trazer', arrow: 'down' },
      ],
      directionalCols: [{ id: 'axe', label: isFr ? 'Va-et-vient' : 'Vaivém', top: pair('P', 'p'), bottom: pair('T', 't') }],
      centralCols: [tall('L', isFr ? 'Latéral' : 'Lado', 'L'), barulho],
    };
  }

  if (id === 'apito') {
    return {
      familyId: 'apito', defaultBrush: 'L', rows: null, directionalCols: [],
      centralCols: [makeBarulhoCol(isFr, 'L', 'l', isFr ? 'Long' : 'Longo'), tall('C', isFr ? 'Court' : 'Curto', 'C')],
    };
  }

  return {
    familyId: 'generic', defaultBrush: 'D', rows: makeHandRows(isFr, isLeftHanded),
    directionalCols: [{ id: 'peau', label: isFr ? 'Peau' : 'Pele', top: pair('D', 'd'), bottom: pair('E', 'e') }],
    centralCols: [],
  };
}
