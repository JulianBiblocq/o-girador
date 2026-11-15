import { instrumentsConfig, ASSETS_BASE_URL } from '../../data';

export { t } from './wizardTranslations';

const WIZARD_ROLE_IDS = [
  'marcante',
  'meiao',
  'repique',
  'caixa',
  'tarol',
  'gongue',
  'agbe',
  'mineiro',
  'timbal',
] as const;

export const AVAILABLE_INSTRUMENTS = WIZARD_ROLE_IDS.map((roleId) => {
  const found = instrumentsConfig.find((c) => c.id === roleId);
  return {
    id: roleId,
    name: found?.name || roleId,
    iconImg: found?.iconImg ? `${ASSETS_BASE_URL}${found.iconImg}` : `icones/${roleId}.svg`,
    color: found?.color || 'var(--cordel-border-strong)',
    label: found?.name ? found.name.replace(/\s*\(.*\)/, '') : roleId,
  };
});

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
