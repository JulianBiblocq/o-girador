import { instrumentsConfig, ASSETS_BASE_URL } from '../../data';
import { SECTION_ENSEMBLE_LIMITS } from '../../constants/sectionEnsembleLimits';

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
  marcante: SECTION_ENSEMBLE_LIMITS.marcante,
  meiao: SECTION_ENSEMBLE_LIMITS.meiao,
  repique: SECTION_ENSEMBLE_LIMITS.repique,
  caixa: SECTION_ENSEMBLE_LIMITS.caixa,
  tarol: SECTION_ENSEMBLE_LIMITS.tarol,
  agbe: SECTION_ENSEMBLE_LIMITS.agbe,
  mineiro: SECTION_ENSEMBLE_LIMITS.mineiro,
  timbal: SECTION_ENSEMBLE_LIMITS.timbal,
  gongue: SECTION_ENSEMBLE_LIMITS.gongue,
  apito: SECTION_ENSEMBLE_LIMITS.apito,
};

export const REMOVE_THRESHOLD = 60;
