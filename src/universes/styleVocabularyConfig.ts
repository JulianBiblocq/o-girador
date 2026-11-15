
export type CanonicalStyleUniverse = 'maracatu' | 'batucada' | 'sambareggae' | 'samba' | 'capoeira';
export type StyleUniverse = CanonicalStyleUniverse | 'samba_reggae';

export interface EnsembleVocabulary {
  ensembleName: string;
  restOfEnsemble: string;
}

export const ENSEMBLE_VOCABULARY: Record<CanonicalStyleUniverse, { fr: EnsembleVocabulary; pt: EnsembleVocabulary }> = {
  maracatu: {
    fr: { ensembleName: 'Baque', restOfEnsemble: 'Reste du Baque' },
    pt: { ensembleName: 'Baque', restOfEnsemble: 'Resto do Baque' },
  },
  batucada: {
    fr: { ensembleName: 'Bateria', restOfEnsemble: 'Reste de la Bateria' },
    pt: { ensembleName: 'Bateria', restOfEnsemble: 'Resto da Bateria' },
  },
  sambareggae: {
    fr: { ensembleName: 'Bloco', restOfEnsemble: 'Reste du Bloco' },
    pt: { ensembleName: 'Bloco', restOfEnsemble: 'Resto do Bloco' },
  },
  samba: {
    fr: { ensembleName: 'Levada', restOfEnsemble: 'Reste de la Levada' },
    pt: { ensembleName: 'Levada', restOfEnsemble: 'Resto da Levada' },
  },
  capoeira: {
    fr: { ensembleName: 'Roda', restOfEnsemble: 'Reste de la Roda' },
    pt: { ensembleName: 'Roda', restOfEnsemble: 'Resto da Roda' },
  },
};

export function normalizeStyleUniverse(universe?: string | null): CanonicalStyleUniverse {
  const clean = String(universe || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (clean === 'samba_reggae' || clean === 'sambareggae') return 'sambareggae';
  if (clean in ENSEMBLE_VOCABULARY) return clean as CanonicalStyleUniverse;
  return 'maracatu';
}

export function getEnsembleVocabulary(
  universe: StyleUniverse | string = 'maracatu',
  lang: 'fr' | 'pt' = 'fr'
): EnsembleVocabulary {
  const normalized = normalizeStyleUniverse(universe);
  return ENSEMBLE_VOCABULARY[normalized][lang] || ENSEMBLE_VOCABULARY[normalized].fr;
}
