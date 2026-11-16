import { PlacedInstrument } from '../../stores/useWizardStore';

export interface WizardExpressFormation {
  id: 'roda_compacte' | 'batuque_classique' | 'grand_batuque';
  labelFr: string;
  labelPt: string;
  descFr: string;
  descPt: string;
  slots: Array<{ instrumentType: string; x: number; y: number }>;
}

export const WIZARD_EXPRESS_FORMATIONS: WizardExpressFormation[] = [
  {
    id: 'roda_compacte',
    labelFr: 'Roda Compacte',
    labelPt: 'Roda Compacta',
    descFr: '5 fûts essentiels',
    descPt: '5 instrumentos essenciais',
    slots: [
      { instrumentType: 'gongue', x: 50, y: 74 },
      { instrumentType: 'caixa', x: 38, y: 62 },
      { instrumentType: 'marcante', x: 32, y: 40 },
      { instrumentType: 'meiao', x: 50, y: 36 },
      { instrumentType: 'repique', x: 68, y: 40 },
    ],
  },
  {
    id: 'batuque_classique',
    labelFr: 'Batuque Classique',
    labelPt: 'Batuque Clássico',
    descFr: '8 instruments équilibrés',
    descPt: '8 instrumentos equilibrados',
    slots: [
      { instrumentType: 'gongue', x: 50, y: 78 },
      { instrumentType: 'agbe', x: 34, y: 72 },
      { instrumentType: 'mineiro', x: 66, y: 72 },
      { instrumentType: 'caixa', x: 40, y: 56 },
      { instrumentType: 'tarol', x: 60, y: 56 },
      { instrumentType: 'marcante', x: 30, y: 34 },
      { instrumentType: 'meiao', x: 50, y: 30 },
      { instrumentType: 'repique', x: 70, y: 34 },
    ],
  },
  {
    id: 'grand_batuque',
    labelFr: 'Grand Batuque de Rue',
    labelPt: 'Grande Batuque de Rua',
    descFr: '13 instruments en cortège',
    descPt: '13 instrumentos em cortejo',
    slots: [
      { instrumentType: 'gongue', x: 50, y: 80 },
      { instrumentType: 'agbe', x: 32, y: 74 },
      { instrumentType: 'agbe', x: 68, y: 74 },
      { instrumentType: 'mineiro', x: 58, y: 78 },
      { instrumentType: 'timbal', x: 42, y: 78 },
      { instrumentType: 'caixa', x: 35, y: 56 },
      { instrumentType: 'caixa', x: 46, y: 54 },
      { instrumentType: 'tarol', x: 62, y: 56 },
      { instrumentType: 'marcante', x: 24, y: 32 },
      { instrumentType: 'marcante', x: 35, y: 28 },
      { instrumentType: 'meiao', x: 47, y: 26 },
      { instrumentType: 'meiao', x: 56, y: 26 },
      { instrumentType: 'repique', x: 72, y: 32 },
    ],
  },
];

const DEFAULT_ROLE_ANCHOR: Record<string, { x: number; y: number }> = {
  gongue: { x: 50, y: 78 },
  agbe: { x: 34, y: 72 },
  mineiro: { x: 66, y: 72 },
  timbal: { x: 43, y: 76 },
  caixa: { x: 40, y: 56 },
  tarol: { x: 60, y: 56 },
  marcante: { x: 30, y: 34 },
  meiao: { x: 50, y: 30 },
  repique: { x: 70, y: 34 },
};

export function buildPlacedFromFormation(formation: WizardExpressFormation): PlacedInstrument[] {
  const now = Date.now();
  return formation.slots.map((s, idx) => ({
    id: `${s.instrumentType}_${now}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
    instrumentType: s.instrumentType,
    x: s.x,
    y: s.y,
  }));
}

export function computeSmartSinglePlacement(
  instrumentType: string,
  existing: PlacedInstrument[]
): { x: number; y: number } {
  const base = DEFAULT_ROLE_ANCHOR[instrumentType] || { x: 50, y: 52 };
  const sameRoleCount = existing.filter((i) => i.instrumentType === instrumentType).length;
  if (sameRoleCount === 0) return { ...base };
  const dir = sameRoleCount % 2 === 1 ? 1 : -1;
  const step = Math.ceil(sameRoleCount / 2);
  return {
    x: Math.max(18, Math.min(82, base.x + dir * step * 8)),
    y: Math.max(18, Math.min(86, base.y - step * 4)),
  };
}
