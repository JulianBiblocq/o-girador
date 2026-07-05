export interface DicteeBlock {
  id: string;
  label: string; // The rhythmic syllable: e.g. "TUM", "TI", "BUM", "TAC", "DÉ", "RUF"
  instrument: {
    fr: string;
    pt: string;
  };
  audioUrl: string;
  color: string; // Color matching the instrument configuration
}

export interface DicteeLevel {
  id: number;
  title: {
    fr: string;
    pt: string;
  };
  description: {
    fr: string;
    pt: string;
  };
  targetLabels: string[]; // e.g. ["TUM", "TI", "TUM", "TI"]
  blocks: DicteeBlock[];
}

export const dicteeLevels: DicteeLevel[] = [
  {
    id: 1,
    title: {
      fr: 'Dialogue de Gonguê',
      pt: 'Diálogo de Gonguê'
    },
    description: {
      fr: 'Reconstituez le dialogue classique du Gonguê : alternance de coups ouverts et fermés.',
      pt: 'Reconstitua o diálogo clássico do Gonguê: alternando golpes abertos e fechados.'
    },
    targetLabels: ['TUM', 'TI', 'TUM', 'TI'],
    blocks: [
      {
        id: 'g1-1',
        label: 'TUM',
        instrument: { fr: 'Gonguê Grave', pt: 'Gonguê Grave' },
        audioUrl: 'Mixdown/Gongue G 1.ogg',
        color: '#8c7b7b'
      },
      {
        id: 'g1-2',
        label: 'TI',
        instrument: { fr: 'Gonguê Aigu', pt: 'Gonguê Agudo' },
        audioUrl: 'Mixdown/Gongue A 1.ogg',
        color: '#bdc3c7'
      },
      {
        id: 'g1-3',
        label: 'TUM',
        instrument: { fr: 'Gonguê Grave', pt: 'Gonguê Grave' },
        audioUrl: 'Mixdown/Gongue G 1.ogg',
        color: '#8c7b7b'
      },
      {
        id: 'g1-4',
        label: 'TI',
        instrument: { fr: 'Gonguê Aigu', pt: 'Gonguê Agudo' },
        audioUrl: 'Mixdown/Gongue A 1.ogg',
        color: '#bdc3c7'
      }
    ]
  },
  {
    id: 2,
    title: {
      fr: 'Baque de Base',
      pt: 'Baque Básico'
    },
    description: {
      fr: 'Combinez le coup lourd de l\'Alfaia et le claquement sec de la Caixa.',
      pt: 'Combine o baque pesado da Alfaia com o estalo seco da Caixa.'
    },
    targetLabels: ['BUM', 'TAC', 'BUM', 'TAC'],
    blocks: [
      {
        id: 'g2-1',
        label: 'BUM',
        instrument: { fr: 'Alfaia Marcante', pt: 'Alfaia Marcante' },
        audioUrl: 'Mixdown/Alfaia meiao F 1.ogg',
        color: '#8a2b2b'
      },
      {
        id: 'g2-2',
        label: 'TAC',
        instrument: { fr: 'Caixa', pt: 'Caixa' },
        audioUrl: 'Mixdown/Caixa F 1.ogg',
        color: '#7a3187'
      },
      {
        id: 'g2-3',
        label: 'BUM',
        instrument: { fr: 'Alfaia Marcante', pt: 'Alfaia Marcante' },
        audioUrl: 'Mixdown/Alfaia meiao F 1.ogg',
        color: '#8a2b2b'
      },
      {
        id: 'g2-4',
        label: 'TAC',
        instrument: { fr: 'Caixa', pt: 'Caixa' },
        audioUrl: 'Mixdown/Caixa F 1.ogg',
        color: '#7a3187'
      }
    ]
  },
  {
    id: 3,
    title: {
      fr: 'Le Contretemps',
      pt: 'O Contratempo'
    },
    description: {
      fr: 'Intégrez la vibration du filet de l\'Agbê entre les notes du Gonguê.',
      pt: 'Integre a vibração do Agbê entre as notas do Gonguê.'
    },
    targetLabels: ['TUM', 'DÉ', 'TI', 'DÉ'],
    blocks: [
      {
        id: 'g3-1',
        label: 'TUM',
        instrument: { fr: 'Gonguê Grave', pt: 'Gonguê Grave' },
        audioUrl: 'Mixdown/Gongue G 1.ogg',
        color: '#8c7b7b'
      },
      {
        id: 'g3-2',
        label: 'DÉ',
        instrument: { fr: 'Agbê', pt: 'Agbê' },
        audioUrl: 'Mixdown/Agbe F D 1.ogg',
        color: '#22c55e'
      },
      {
        id: 'g3-3',
        label: 'TI',
        instrument: { fr: 'Gonguê Aigu', pt: 'Gonguê Agudo' },
        audioUrl: 'Mixdown/Gongue A 1.ogg',
        color: '#bdc3c7'
      },
      {
        id: 'g3-4',
        label: 'DÉ',
        instrument: { fr: 'Agbê', pt: 'Agbê' },
        audioUrl: 'Mixdown/Agbe F D 1.ogg',
        color: '#22c55e'
      }
    ]
  },
  {
    id: 4,
    title: {
      fr: 'Virada Rapide',
      pt: 'Virada Rápida'
    },
    description: {
      fr: 'Reconstituez ce motif dynamique de transition : roulement, coup sec, impact lourd et cloche.',
      pt: 'Reconstitua esse padrão dinâmico de transição: toque duplo, golpe seco, baque e sino.'
    },
    targetLabels: ['RUF', 'TAC', 'BUM', 'TUM'],
    blocks: [
      {
        id: 'g4-1',
        label: 'RUF',
        instrument: { fr: 'Caixa Roulement', pt: 'Caixa Rufada' },
        audioUrl: 'Mixdown/Caixa R 1.ogg',
        color: '#a855f7'
      },
      {
        id: 'g4-2',
        label: 'TAC',
        instrument: { fr: 'Caixa', pt: 'Caixa' },
        audioUrl: 'Mixdown/Caixa F 1.ogg',
        color: '#7a3187'
      },
      {
        id: 'g4-3',
        label: 'BUM',
        instrument: { fr: 'Alfaia Marcante', pt: 'Alfaia Marcante' },
        audioUrl: 'Mixdown/Alfaia meiao F 1.ogg',
        color: '#8a2b2b'
      },
      {
        id: 'g4-4',
        label: 'TUM',
        instrument: { fr: 'Gonguê Grave', pt: 'Gonguê Grave' },
        audioUrl: 'Mixdown/Gongue G 1.ogg',
        color: '#8c7b7b'
      }
    ]
  }
];
