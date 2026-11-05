
export type StyleUniverse = 'maracatu' | 'capoeira' | 'samba' | 'samba_reggae';

export interface EnsembleVocabulary {
  ensembleName: string;
  restOfEnsemble: string;
}

const ENSEMBLE_VOCABULARY: Record<StyleUniverse, { fr: EnsembleVocabulary; pt: EnsembleVocabulary }> = {
  maracatu: {
    fr: { ensembleName: 'Baque', restOfEnsemble: 'Reste du Baque' },
    pt: { ensembleName: 'Baque', restOfEnsemble: 'Resto do Baque' },
  },
  capoeira: {
    fr: { ensembleName: 'Roda', restOfEnsemble: 'Reste de la Roda' },
    pt: { ensembleName: 'Roda', restOfEnsemble: 'Resto da Roda' },
  },
  samba: {
    fr: { ensembleName: 'Baque', restOfEnsemble: 'Reste du Baque' },
    pt: { ensembleName: 'Baque', restOfEnsemble: 'Resto do Baque' },
  },
  samba_reggae: {
    fr: { ensembleName: 'Bloco', restOfEnsemble: 'Reste du Bloco' },
    pt: { ensembleName: 'Bloco', restOfEnsemble: 'Resto do Bloco' },
  },
};

export function getEnsembleVocabulary(
  universe: StyleUniverse | string = 'maracatu',
  lang: 'fr' | 'pt' = 'fr'
): EnsembleVocabulary {
  const normalized = (universe in ENSEMBLE_VOCABULARY ? universe : 'maracatu') as StyleUniverse;
  return ENSEMBLE_VOCABULARY[normalized][lang] || ENSEMBLE_VOCABULARY[normalized].fr;
}
