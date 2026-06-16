/**
 * BaqueMix Audio Configuration & Mappings Database
 * Contains all absolute local paths, stroke mapping, case-sensitivity rules, and UI orders.
 */

export interface StrokeMapping {
  symbol: string;         // The unique note symbol matching sequencer values (e.g. 'D', 'rd', 'GRV')
  keys: string[];         // Keyboard keys that trigger this stroke
  files: string[];        // File paths for round-robin sample selection
  caseSensitive: boolean; // Whether keys are case sensitive
  isBarulho?: boolean;    // If true, the stroke plays as a loop on keydown and stops on keyup
}

export interface InstrumentAudioConfig {
  id: string;
  name: string;
  uiOrder: string[];      // Order in which symbols are displayed in UI legend
  strokes: StrokeMapping[];
  leftHandedSupport: boolean;
  macroPitch?: number;    // Pitch multiplier (e.g. Marcante 0.85, Repique 1.15)
}

export const instrumentAudioConfigs: InstrumentAudioConfig[] = [
  {
    id: 'agbe',
    name: 'Agbê',
    uiOrder: ['E', 'D', 'e', 'd', 'S', 'V', 'B'],
    leftHandedSupport: false,
    strokes: [
      {
        symbol: 'E', // Fort Gauche
        keys: ['E'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Agbe F E 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Agbe F E 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Agbe F E 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Agbe F E 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'D', // Fort Droite
        keys: ['D'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Agbe F D 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Agbe F D 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Agbe F D 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Agbe F D 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'e', // Faible Gauche
        keys: ['e'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Agbe f 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Agbe f 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Agbe f 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Agbe f 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'd', // Faible Droite
        keys: ['d'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Agbe f 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Agbe f 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Agbe f 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Agbe f 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'S', // Salto / Saut (Insensitive)
        keys: ['S', 's'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Agbe S 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Agbe S 2.ogg"
        ],
        caseSensitive: false
      },
      {
        symbol: 'V', // Volta / Atterrissage (Insensitive)
        keys: ['V', 'v'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Agbe A 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Agbe A 2.ogg"
        ],
        caseSensitive: false
      },
      {
        symbol: 'B', // Barulho (Insensitive)
        keys: ['B', 'b'],
        files: ["E:/projets/Roda de maracatu/Mixdown/Agbe B.ogg"],
        caseSensitive: false,
        isBarulho: true
      }
    ]
  },
  {
    id: 'marcante',
    name: 'Alfaia Marcante',
    uiOrder: ['Q', 'D', 'E', 'q', 'd', 'e', 'X', 'C', 'B', 'I'],
    leftHandedSupport: true,
    macroPitch: Math.pow(2, -2/12), // -2 semitones (Fundamental)
    strokes: getAlfaiaStrokes()
  },
  {
    id: 'meiao',
    name: 'Alfaia Meião',
    uiOrder: ['Q', 'D', 'E', 'q', 'd', 'e', 'X', 'C', 'B', 'I'],
    leftHandedSupport: true,
    macroPitch: Math.pow(2, 5/12), // +5 semitones (Perfect Fifth)
    strokes: getAlfaiaStrokes()
  },
  {
    id: 'repique',
    name: 'Alfaia Repique',
    uiOrder: ['Q', 'D', 'E', 'q', 'd', 'e', 'X', 'C', 'B', 'I'],
    leftHandedSupport: true,
    macroPitch: Math.pow(2, 10/12), // +10 semitones (Octave relative toMarcante)
    strokes: getAlfaiaStrokes()
  },
  {
    id: 'caixa',
    name: 'Caixa',
    uiOrder: ['D', 'E', 'Q', 'd', 'e', 'q', 'X', 'C', 'B', 'F', 'R', 'r'],
    leftHandedSupport: true,
    strokes: [
      {
        symbol: 'D', // Fort Right
        keys: ['D'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Caixa F 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Caixa F 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Caixa F 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Caixa F 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'E', // Fort Left
        keys: ['E'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Caixa F 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Caixa F 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Caixa F 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Caixa F 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'Q', // Alt Fort Left
        keys: ['Q'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Caixa F 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Caixa F 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Caixa F 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Caixa F 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'd', // Faible Right
        keys: ['d'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Caixa faible 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Caixa faible 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Caixa faible 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Caixa faible 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'e', // Faible Left
        keys: ['e'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Caixa faible 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Caixa faible 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Caixa faible 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Caixa faible 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'q', // Alt Faible Left
        keys: ['q'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Caixa faible 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Caixa faible 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Caixa faible 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Caixa faible 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'R', // Rufada Right (R)
        keys: ['R'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Caixa R 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Caixa R 2.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'r', // Rufada Left (r)
        keys: ['r'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Caixa R 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Caixa R 2.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'F', // Fla (F/f)
        keys: ['F', 'f'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Caixa Fla 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Caixa Fla 2.ogg"
        ],
        caseSensitive: false
      },
      {
        symbol: 'X', // Aro (X/x)
        keys: ['X', 'x'],
        files: ["E:/projets/Roda de maracatu/Mixdown/Caixa X.ogg"],
        caseSensitive: false
      },
      {
        symbol: 'C', // Click / Baguettes
        keys: ['C', 'c'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Caixa C 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Caixa C 2.ogg"
        ],
        caseSensitive: false
      },
      {
        symbol: 'B', // Barulho (B/b)
        keys: ['B', 'b'],
        files: ["E:/projets/Roda de maracatu/Mixdown/Caixa B.ogg"],
        caseSensitive: false,
        isBarulho: true
      }
    ]
  },
  {
    id: 'tarol',
    name: 'Tarol',
    uiOrder: ['D', 'E', 'Q', 'd', 'e', 'q', 'X', 'C', 'B', 'F', 'R', 'r'],
    leftHandedSupport: true,
    strokes: [
      {
        symbol: 'D', // Fort Right
        keys: ['D'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Tarol F1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Tarol F 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Tarol F 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Tarol F 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'E', // Fort Left
        keys: ['E'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Tarol F1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Tarol F 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Tarol F 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Tarol F 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'Q', // Alt Fort Left
        keys: ['Q'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Tarol F1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Tarol F 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Tarol F 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Tarol F 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'd', // Faible Right
        keys: ['d'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Tarol faible 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Tarol faible 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Tarol faible 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Tarol faible 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'e', // Faible Left
        keys: ['e'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Tarol faible 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Tarol faible 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Tarol faible 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Tarol faible 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'q', // Alt Faible Left
        keys: ['q'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Tarol faible 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Tarol faible 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Tarol faible 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Tarol faible 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'R', // Rufada Right (R)
        keys: ['R'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Tarol R 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Tarol R 2.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'r', // Rufada Left (r)
        keys: ['r'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Tarol R 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Tarol R 2.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'F', // Fla (F/f)
        keys: ['F', 'f'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Tarol Fla 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Tarol Fla 2.ogg"
        ],
        caseSensitive: false
      },
      {
        symbol: 'X', // Aro (X/x)
        keys: ['X', 'x'],
        files: ["E:/projets/Roda de maracatu/Mixdown/Tarol X.ogg"],
        caseSensitive: false
      },
      {
        symbol: 'C', // Click (C/c)
        keys: ['C', 'c'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Tarol C 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Tarol C 2.ogg"
        ],
        caseSensitive: false
      },
      {
        symbol: 'B', // Barulho (B/b)
        keys: ['B', 'b'],
        files: ["E:/projets/Roda de maracatu/Mixdown/Tarol B.ogg"],
        caseSensitive: false,
        isBarulho: true
      }
    ]
  },
  {
    id: 'gongue',
    name: 'Gonguê',
    uiOrder: ['G', 'A', 'g', 'a', 'X', 'B'],
    leftHandedSupport: false,
    strokes: [
      {
        symbol: 'G', // Fort Grave (G)
        keys: ['G'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Gongue G 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Gongue G 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Gongue G 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Gongue G 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'A', // Fort Aigu (A)
        keys: ['A'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Gongue A 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Gongue A 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Gongue A 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Gongue A 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'g', // Faible Grave (g)
        keys: ['g'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Gongue f g 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Gongue f g 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Gongue f g 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Gongue f g 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'a', // Faible Aigu (a)
        keys: ['a'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Gongue f a 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Gongue f a 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Gongue f a 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Gongue f a 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'X', // Cerclage (X/x)
        keys: ['X', 'x'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Gongue C 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Gongue C 2.ogg"
        ],
        caseSensitive: false
      },
      {
        symbol: 'B', // Barulho (B/b)
        keys: ['B', 'b'],
        files: ["E:/projets/Roda de maracatu/Mixdown/Gongue B.ogg"],
        caseSensitive: false,
        isBarulho: true
      }
    ]
  },
  {
    id: 'mineiro',
    name: 'Mineiro',
    uiOrder: ['P', 'T', 'p', 't', 'L', 'B'],
    leftHandedSupport: false,
    strokes: [
      {
        symbol: 'P', // Fort Pousser
        keys: ['P'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Mineiro F P 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Mineiro F P 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Mineiro F P 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Mineiro F P 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'T', // Fort Tirer
        keys: ['T'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Mineiro F T 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Mineiro F T 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Mineiro F T 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Mineiro F T 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'p', // Faible Pousser
        keys: ['p'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Mineiro f 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Mineiro f 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Mineiro f 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Mineiro f 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 't', // Faible Tirer
        keys: ['t'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Mineiro f 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Mineiro f 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Mineiro f 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Mineiro f 4.ogg"
        ],
        caseSensitive: true
      },
      {
        symbol: 'L', // Lado (L/l) (Insensitive)
        keys: ['L', 'l'],
        files: [
          "E:/projets/Roda de maracatu/Mixdown/Mineiro L 1.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Mineiro L 2.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Mineiro L 3.ogg",
          "E:/projets/Roda de maracatu/Mixdown/Mineiro L 4.ogg"
        ],
        caseSensitive: false
      },
      {
        symbol: 'B', // Barulho (B/b) (Insensitive)
        keys: ['B', 'b'],
        files: ["E:/projets/Roda de maracatu/Mixdown/Mineiro B.ogg"],
        caseSensitive: false,
        isBarulho: true
      }
    ]
  }
];

function getAlfaiaStrokes(): StrokeMapping[] {
  return [
    {
      symbol: 'D', // Fort Right
      keys: ['D'],
      files: [
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao F 1.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao F 2.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao F 3.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao F 4.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao F 5.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao F 6.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'E', // Fort Left
      keys: ['E'],
      files: [
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao F 1.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao F 2.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao F 3.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao F 4.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao F 5.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao F 6.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'Q', // Alt Fort Left
      keys: ['Q'],
      files: [
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao F 1.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao F 2.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao F 3.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao F 4.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao F 5.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao F 6.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'd', // Faible Right
      keys: ['d'],
      files: [
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao faible 1.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao faible 2.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao faible 3.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao faible 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'e', // Faible Left
      keys: ['e'],
      files: [
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao faible 1.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao faible 2.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao faible 3.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao faible 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'q', // Alt Faible Left
      keys: ['q'],
      files: [
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao faible 1.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao faible 2.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao faible 3.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao faible 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'X', // Aro (X/x)
      keys: ['X', 'x'],
      files: [
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao X 1.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao X 2.ogg"
      ],
      caseSensitive: false
    },
    {
      symbol: 'C', // Click (C/c)
      keys: ['C', 'c'],
      files: [
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao C 1.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao C 2.ogg"
      ],
      caseSensitive: false
    },
    {
      symbol: 'I', // Bacalhau (I/i)
      keys: ['I', 'i'],
      files: [
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao I 1.ogg",
        "E:/projets/Roda de maracatu/Mixdown/Alfaia meiao I 2.ogg"
      ],
      caseSensitive: false
    },
    {
      symbol: 'B', // Barulho (B/b)
      keys: ['B', 'b'],
      files: ["E:/projets/Roda de maracatu/Mixdown/Alfaia meiao B.ogg"],
      caseSensitive: false,
      isBarulho: true
    }
  ];
}
