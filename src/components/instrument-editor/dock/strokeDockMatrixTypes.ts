/**
 * strokeDockMatrixTypes.ts — Types purs de la matrice 2 lignes à accès direct du StrokeWritingDock (< 60 lignes).
 */

export type DockArrowDir = 'left' | 'right' | 'up' | 'down';

export interface DockRowLabel {
  text: string;
  title?: string;
  arrow?: DockArrowDir;
}

export interface DockKeySpec {
  symbol: string;
  title?: string;
}

export type DockRowCellSpec =
  | { kind: 'pair'; strong: DockKeySpec; weak: DockKeySpec }
  | { kind: 'single'; key: DockKeySpec }
  | { kind: 'empty' };

export interface DockDirectionalColumn {
  id: string;
  label: string;
  top: DockRowCellSpec;
  bottom: DockRowCellSpec;
}

export type DockCentralColumn =
  | {
      kind: 'tall';
      id: string;
      label: string;
      key: DockKeySpec;
    }
  | {
      kind: 'barulho';
      id: string;
      label: string;
      main: DockKeySpec;
      minis: [DockKeySpec, DockKeySpec, DockKeySpec];
    };

export interface StrokeDockMatrixSpec {
  familyId: string;
  defaultBrush: string;
  rows: [DockRowLabel, DockRowLabel] | null;
  directionalCols: DockDirectionalColumn[];
  centralCols: DockCentralColumn[];
}
