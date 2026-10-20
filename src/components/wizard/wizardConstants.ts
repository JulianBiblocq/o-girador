export { t } from './wizardTranslations';

export const AVAILABLE_INSTRUMENTS = [
  { id: 'marcante', name: 'Marcante (alfaia)', iconImg: 'icones/alfaia.svg', color: '#8a2b2b', label: 'Marcante' },
  { id: 'meiao', name: 'Meião (alfaia)', iconImg: 'icones/alfaia.svg', color: '#ab5318', label: 'Meião' },
  { id: 'repique', name: 'Repique (alfaia)', iconImg: 'icones/alfaia.svg', color: '#c9a724', label: 'Repique' },
  { id: 'caixa', name: 'Caixa', iconImg: 'icones/caixa.svg', color: '#7a3187', label: 'Caixa' },
  { id: 'tarol', name: 'Tarol', iconImg: 'icones/caixa.svg', color: '#2563eb', label: 'Tarol' },
  { id: 'gongue', name: 'Gonguê', iconImg: 'icones/gongue.svg', color: '#bdc3c7', label: 'Gonguê' },
  { id: 'agbe', name: 'Agbê', iconImg: 'icones/agbe.svg', color: '#22c55e', label: 'Agbê' },
  { id: 'mineiro', name: 'Mineiro', iconImg: 'icones/mineiro.svg', color: '#588157', label: 'Mineiro' },
  { id: 'timbal', name: 'Timbal', iconImg: 'icones/timbal.svg', color: '#d97706', label: 'Timbal' },
];

export const LIMITS: Record<string, number> = {
  marcante: 3,
  meiao: 3,
  repique: 3,
  caixa: 2,
  tarol: 2,
  agbe: 2,
  mineiro: 2,
  timbal: 2,
  gongue: 1,
};

export const REMOVE_THRESHOLD = 60;
