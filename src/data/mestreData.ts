export interface MestreRound {
  id: number;
  signSymbol: string; // Emoji / Character representing the sign
  signName: {
    fr: string;
    pt: string;
  };
  options: {
    fr: string[];
    pt: string[];
  };
  correctAnswer: {
    fr: string;
    pt: string;
  };
}

export const mestreRounds: MestreRound[] = [
  {
    id: 1,
    signSymbol: '⚡',
    signName: {
      fr: 'La Virada (Transition)',
      pt: 'A Virada (Transição)'
    },
    options: {
      fr: ['Faire une Virada', 'Faire un solo', 'Arrêter la Roda'],
      pt: ['Fazer uma Virada', 'Fazer um solo', 'Parar a Roda']
    },
    correctAnswer: {
      fr: 'Faire une Virada',
      pt: 'Fazer uma Virada'
    }
  },
  {
    id: 2,
    signSymbol: '✋',
    signName: {
      fr: 'La Parada (Arrêt)',
      pt: 'A Parada (Parar)'
    },
    options: {
      fr: ['Accélérer le rythme', 'Faire une Parada (Arrêt)', 'Doubler le volume'],
      pt: ['Acelerar o ritmo', 'Fazer uma Parada', 'Dobrar o volume']
    },
    correctAnswer: {
      fr: 'Faire une Parada (Arrêt)',
      pt: 'Fazer uma Parada'
    }
  },
  {
    id: 3,
    signSymbol: '⏩',
    signName: {
      fr: 'Acelerar (Accélérer)',
      pt: 'Acelerar (Acelerar)'
    },
    options: {
      fr: ['Ralentir le tempo', 'Changer d\'instrument', 'Acelerar (Accélérer)'],
      pt: ['Diminuir o tempo', 'Mudar de instrumento', 'Acelerar']
    },
    correctAnswer: {
      fr: 'Acelerar (Accélérer)',
      pt: 'Acelerar'
    }
  }
];
