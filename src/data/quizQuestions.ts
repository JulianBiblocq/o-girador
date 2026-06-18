export interface QuizQuestion {
  id: string;
  type: 'audio' | 'image';
  mediaUrl: string;
  questionText: {
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

export const quizQuestions: QuizQuestion[] = [
  {
    id: 'q1',
    type: 'audio',
    mediaUrl: 'Mixdown/Gongue G 1.ogg',
    questionText: {
      fr: 'Quel instrument joue ce coup grave et ouvert ?',
      pt: 'Qual instrumento toca esse golpe grave e aberto ?'
    },
    options: {
      fr: ['Gonguê', 'Alfaia', 'Caixa', 'Agbê'],
      pt: ['Gonguê', 'Alfaia', 'Caixa', 'Agbê']
    },
    correctAnswer: {
      fr: 'Gonguê',
      pt: 'Gonguê'
    }
  },
  {
    id: 'q2',
    type: 'audio',
    mediaUrl: 'Mixdown/Caixa R 1.ogg',
    questionText: {
      fr: 'Quel type de frappe de Caixa entendez-vous ?',
      pt: 'Qual tipo de toque de Caixa você está escutando ?'
    },
    options: {
      fr: ['Rufada (Roulement)', 'Fla', 'Coup simple', 'Click'],
      pt: ['Rufada (Toque duplo)', 'Fla', 'Toque simples', 'Click']
    },
    correctAnswer: {
      fr: 'Rufada (Roulement)',
      pt: 'Rufada (Toque duplo)'
    }
  },
  {
    id: 'q3',
    type: 'audio',
    mediaUrl: 'Mixdown/Alfaia meiao F 1.ogg',
    questionText: {
      fr: 'Quel instrument produit ce son lourd et bas ?',
      pt: 'Qual instrumento produz esse som grave e pesado ?'
    },
    options: {
      fr: ['Alfaia Marcante', 'Agbê', 'Tarol', 'Mineiro'],
      pt: ['Alfaia Marcante', 'Agbê', 'Tarol', 'Mineiro']
    },
    correctAnswer: {
      fr: 'Alfaia Marcante',
      pt: 'Alfaia Marcante'
    }
  },
  {
    id: 'q4',
    type: 'audio',
    mediaUrl: 'Mixdown/Agbe S 1.ogg',
    questionText: {
      fr: "Quel geste technique de l'Agbê produit ce son ?",
      pt: 'Qual gesto técnico do Agbê produz esse som ?'
    },
    options: {
      fr: ['Saut / Lancer (saut)', 'Secousse simple', 'Frappe main', 'Glissé'],
      pt: ['Salto / Lançamento (saut)', 'Sacudida simples', 'Toque de mão', 'Deslizado']
    },
    correctAnswer: {
      fr: 'Saut / Lancer (saut)',
      pt: 'Salto / Lançamento (saut)'
    }
  },
  {
    id: 'q5',
    type: 'audio',
    mediaUrl: 'Mixdown/Mineiro F P 1.ogg',
    questionText: {
      fr: 'Quel instrument produit ce son de secousse continue ?',
      pt: 'Qual instrumento produz esse som de chocalho contínuo ?'
    },
    options: {
      fr: ['Mineiro', 'Gonguê', 'Alfaia', 'Caixa'],
      pt: ['Mineiro', 'Gonguê', 'Alfaia', 'Caixa']
    },
    correctAnswer: {
      fr: 'Mineiro',
      pt: 'Mineiro'
    }
  },
  {
    id: 'q6',
    type: 'image',
    mediaUrl: 'icones/gongue.svg',
    questionText: {
      fr: 'Quel est cet instrument traditionnel en métal ?',
      pt: 'Qual é esse instrumento de metal tradicional ?'
    },
    options: {
      fr: ['Gonguê', 'Alfaia', 'Agbê', 'Tarol'],
      pt: ['Gonguê', 'Alfaia', 'Agbê', 'Tarol']
    },
    correctAnswer: {
      fr: 'Gonguê',
      pt: 'Gonguê'
    }
  },
  {
    id: 'q7',
    type: 'image',
    mediaUrl: 'icones/alfaia.svg',
    questionText: {
      fr: "Comment s'appelle ce tambour à cordes du Maracatu ?",
      pt: 'Como se chama esse tambor de cordas do Maracatu ?'
    },
    options: {
      fr: ['Alfaia', 'Caixa', 'Tarol', 'Gonguê'],
      pt: ['Alfaia', 'Caixa', 'Tarol', 'Gonguê']
    },
    correctAnswer: {
      fr: 'Alfaia',
      pt: 'Alfaia'
    }
  },
  {
    id: 'q8',
    type: 'image',
    mediaUrl: 'icones/agbe.svg',
    questionText: {
      fr: "Quel est cet instrument fait d'une calebasse et de graines ?",
      pt: 'Qual é esse instrumento feito de cabaça e sementes ?'
    },
    options: {
      fr: ['Agbê', 'Mineiro', 'Gonguê', 'Caixa'],
      pt: ['Agbê', 'Mineiro', 'Gonguê', 'Caixa']
    },
    correctAnswer: {
      fr: 'Agbê',
      pt: 'Agbê'
    }
  },
  {
    id: 'q9',
    type: 'image',
    mediaUrl: 'icones/mineiro.svg',
    questionText: {
      fr: 'Cet instrument cylindrique métallique (chocalho) est le...',
      pt: 'Esse instrumento cilíndrico metálico (chocalho) é o...'
    },
    options: {
      fr: ['Mineiro', 'Agbê', 'Tarol', 'Gonguê'],
      pt: ['Mineiro', 'Agbê', 'Tarol', 'Gonguê']
    },
    correctAnswer: {
      fr: 'Mineiro',
      pt: 'Mineiro'
    }
  },
  {
    id: 'q10',
    type: 'image',
    mediaUrl: 'icones/caixa.svg',
    questionText: {
      fr: 'Quel instrument assure le soutien rythmique aigu (caisse claire) ?',
      pt: 'Qual instrumento garante o suporte rítmico agudo ?'
    },
    options: {
      fr: ['Caixa', 'Alfaia', 'Gonguê', 'Mineiro'],
      pt: ['Caixa', 'Alfaia', 'Gonguê', 'Mineiro']
    },
    correctAnswer: {
      fr: 'Caixa',
      pt: 'Caixa'
    }
  }
];
