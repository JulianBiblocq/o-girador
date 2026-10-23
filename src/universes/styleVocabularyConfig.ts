
export type StyleUniverse = 'maracatu' | 'capoeira' | 'samba' | 'samba_reggae';

export interface EnsembleVocabulary {
  ensembleName: string;
  restOfEnsemble: string;
}

const ENSEMBLE_VOCABULARY: Record<StyleUniverse, { fr: EnsembleVocabulary; pt: EnsembleVocabulary }> = {
  maracatu: {
    fr: { ensembleName: 'Batuque', restOfEnsemble: 'Reste du Batuque' },
    pt: { ensembleName: 'Batuque', restOfEnsemble: 'Resto do Batuque' },
  },
  capoeira: {
    fr: { ensembleName: 'Roda', restOfEnsemble: 'Reste de la Roda' },
    pt: { ensembleName: 'Roda', restOfEnsemble: 'Resto da Roda' },
  },
  samba: {
    fr: { ensembleName: 'Bateria', restOfEnsemble: 'Reste de la Bateria' },
    pt: { ensembleName: 'Bateria', restOfEnsemble: 'Resto da Bateria' },
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
