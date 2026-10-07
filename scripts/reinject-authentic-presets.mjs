/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Script de réinjection définitive et sanctuarisation des presets authentiques
 * dans Firestore pour les 6 morceaux officiels du catalogue Samambaia.
 */

import { chromium } from '@playwright/test';
import fs from 'fs';
import LZString from 'lz-string';

const DEV_SERVER_URL = process.env.BASE_URL || 'http://localhost:5174';
const JULIAN_UID = 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';

function countActiveSteps(preset) {
  let count = 0;
  if (preset.circles) {
    preset.circles.forEach(c => {
      count += (c.activeSteps || []).filter(s => s && s !== 0 && s !== '0' && s !== '').length;
    });
  }
  if (preset.tracks) {
    preset.tracks.forEach(t => {
      (t.patterns || []).forEach(p => {
        count += (p.activeSteps || []).filter(s => s && s !== 0 && s !== '0' && s !== '').length;
      });
    });
  }
  return count;
}

async function main() {
  console.log(`\n============================================================`);
  console.log(`🚀 RÉINJECTION OFFICIELLE DES PRESETS AUTHENTIQUES SAMAMBAIA`);
  console.log(`   Serveur: ${DEV_SERVER_URL}`);
  console.log(`============================================================\n`);

  // =========================================================================
  // 1. OPANIJÉ (29dIDjgc2vPuDnwjiy9V)
  // =========================================================================
  console.log(`[1/6] Préparation d'Opanijé (43 mesures, 11 pistes)...`);
  const rawOpanije = JSON.parse(fs.readFileSync('recup-opanije-43mesures.json', 'utf-8'));
  const opanijePreset = {
    ...rawOpanije,
    name: 'Opanijé',
    totalMeasures: 43,
    bpm: rawOpanije.bpm || 110,
    version: 3,
    audioScaleVersion: 2,
    metadata: {
      toada: 'Opanijé',
      nacao: 'Samambaia',
      ritmo: 'Maracatu',
      compositor: 'Mestre Letho Nascimento',
      youtubeUrl: 'https://youtu.be/Egjm2kYAmrA?si=lqSo8vKE8v4Vobxb',
      ...(rawOpanije.metadata || {})
    }
  };

  // =========================================================================
  // 2. VOVÓ FALOU (hJFMrFdzwLezPmeTgVpE)
  // =========================================================================
  console.log(`[2/6] Préparation de Vovó Falou (4 mesures, paroles complètes, BPM 77)...`);
  const vovoTracks = [
    // 0. Marcante
    {
      id: 1779908305252,
      name: 'Marcante',
      customName: 'Marcante',
      instrumentIdx: 0,
      instrumentRoleKey: 'alfaia_grave',
      volumeVal: 80,
      isMute: false,
      isSolo: false,
      isHidden: false,
      selectedPatternId: 1779908305252,
      patterns: [
        {
          id: 1779908305252,
          name: 'Padrão 1',
          steps: 16,
          activeSteps: ["D", 0, 0, 0, "g", 0, "D", 0, "g", "D", 0, 0, "g", "D", 0, 0],
          lyrics: Array(16).fill(""),
          notes: Array(16).fill(""),
          measureAssignments: [true, true, true, true],
          volumes: Array(16).fill(80),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        }
      ]
    },
    // 1. Caixa
    {
      id: 1779908307194,
      name: 'Caixa',
      customName: 'Caixa',
      instrumentIdx: 3,
      instrumentRoleKey: 'caixa_baixo',
      volumeVal: 80,
      isMute: false,
      isSolo: false,
      isHidden: false,
      selectedPatternId: 1779908307194,
      patterns: [
        {
          id: 1779908307194,
          name: 'Padrão 1',
          steps: 16,
          activeSteps: ["D", "D", "g", "D", "D", "g", "D", "g", "D", "D", "g", "D", "D", "g", "D", "g"],
          lyrics: Array(16).fill(""),
          notes: Array(16).fill(""),
          measureAssignments: [true, true, true, true],
          volumes: Array(16).fill(80),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        }
      ]
    },
    // 2. Gonguê
    {
      id: 1779908312248,
      name: 'Gonguê',
      customName: 'Gonguê',
      instrumentIdx: 5,
      instrumentRoleKey: 'gongue',
      volumeVal: 80,
      isMute: false,
      isSolo: false,
      isHidden: false,
      selectedPatternId: 1779908312248,
      patterns: [
        {
          id: 1779908312248,
          name: 'Padrão 1',
          steps: 16,
          activeSteps: ["GRV", 0, "AIG", 0, "GRV", 0, "AIG", 0, "GRV", "AIG", 0, "aig", "GRV", 0, "AIG", 0],
          lyrics: Array(16).fill(""),
          notes: Array(16).fill(""),
          measureAssignments: [true, true, true, true],
          volumes: Array(16).fill(80),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        }
      ]
    },
    // 3. Agbê
    {
      id: 1779908314541,
      name: 'Agbê',
      customName: 'Agbê',
      instrumentIdx: 6,
      instrumentRoleKey: 'agbe',
      volumeVal: 80,
      isMute: false,
      isSolo: false,
      isHidden: false,
      selectedPatternId: 1779908314541,
      patterns: [
        {
          id: 1779908314541,
          name: 'Padrão 1',
          steps: 16,
          activeSteps: ["P", 0, "t", "p", "T", 0, "p", "t", "P", 0, "t", "p", "T", 0, "p", "t"],
          lyrics: Array(16).fill(""),
          notes: Array(16).fill(""),
          measureAssignments: [true, true, true, true],
          volumes: Array(16).fill(80),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        }
      ]
    },
    // 4. Bus Toada
    {
      id: 999901,
      name: 'Toada',
      customName: 'Toada',
      instrumentIdx: 12,
      instrumentRoleKey: 'toada',
      isBusFolder: true,
      isFolded: false,
      isSequencerFolded: false,
      volumeVal: 80,
      isMute: false,
      isSolo: false,
      isHidden: false,
      selectedPatternId: 0,
      patterns: []
    },
    // 5. Puxador
    {
      id: 999101,
      name: 'Puxador',
      customName: 'Puxador',
      instrumentIdx: 10,
      instrumentRoleKey: 'puxador',
      busId: '999901',
      volumeVal: 80,
      isMute: false,
      isSolo: false,
      isHidden: false,
      selectedPatternId: 1779908319456,
      patterns: [
        {
          id: 1779908319456,
          name: 'Mesure 1',
          steps: 16,
          activeSteps: ["P", 0, 0, 0, "P", "P", 0, "P", "P", "P", "P", "P", "P", "P", 0, "P"],
          lyrics: ["no", "", "", "", "Vo", "vó", "", "Fa", "lou", "E", "O", "Ba", "rão", "A", "", "ssi"],
          notes: Array(16).fill(""),
          measureAssignments: [true, false, false, false],
          volumes: Array(16).fill(80),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        },
        {
          id: 1779908323224,
          name: 'Mesure 2',
          steps: 16,
          activeSteps: ["P", 0, "P", 0, 0, 0, "P", 0, 0, "P", 0, "P", "P", "P", 0, "P"],
          lyrics: ["fa", "", "ias", "", "", "", "Na", "", "", "Mar", "", "ca", "ção", "das", "", "Al"],
          notes: Array(16).fill(""),
          measureAssignments: [false, true, false, false],
          volumes: Array(16).fill(80),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        },
        {
          id: 1779923886721,
          name: 'Mesure 3',
          steps: 16,
          activeSteps: ["P", 0, 0, 0, 0, 0, "P", 0, 0, "P", 0, "P", "P", 0, "P", "P"],
          lyrics: ["gue", "", "", "", "", "", "No", "", "", "Ti", "li", "li", "ta", "", "Do", "Gon"],
          notes: Array(16).fill(""),
          measureAssignments: [false, false, true, false],
          volumes: Array(16).fill(80),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        }
      ]
    },
    // 6. Coro
    {
      id: 999102,
      name: 'Coro',
      customName: 'Coro',
      instrumentIdx: 11,
      instrumentRoleKey: 'coro',
      busId: '999901',
      volumeVal: 80,
      isMute: false,
      isSolo: false,
      isHidden: false,
      selectedPatternId: 1779923888740,
      patterns: [
        {
          id: 1779923888740,
          name: 'Mesure 4 (Réponse)',
          steps: 16,
          activeSteps: [0, 0, 0, 0, "C", "C", 0, "C", "C", 0, 0, 0, 0, 0, 0, 0],
          lyrics: ["", "", "", "", "Vo", "vó", "", "Fa", "lou", "", "", "", "", "", "", ""],
          notes: Array(16).fill(""),
          measureAssignments: [false, false, false, true],
          volumes: Array(16).fill(80),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        }
      ]
    }
  ];

  const vovoPreset = {
    name: 'Vovó Falou',
    bpm: 77,
    timeSig: '4/4',
    totalMeasures: 4,
    version: 3,
    audioScaleVersion: 2,
    metadata: {
      toada: 'Vovó Falou',
      nacao: 'Samambaia',
      ritmo: 'Maracatu',
      compositor: 'Mestre Walter'
    },
    tracks: vovoTracks,
    measureBpms: [77, 77, 77, 77]
  };

  // =========================================================================
  // 3. TEM MACAIBA (EcUcFC6Vd9hiKq8UR0dD)
  // =========================================================================
  console.log(`[3/6] Préparation de Tem macaiba (8 mesures, 7 pistes, BPM 83)...`);
  const temMacaibaRaw = JSON.parse(fs.readFileSync('recup_presets_git/macaiba_authentique_disk.json', 'utf-8'));
  const macaibaPreset = {
    ...temMacaibaRaw,
    name: 'Tem macaiba',
    bpm: 83,
    totalMeasures: 8,
    version: 3,
    audioScaleVersion: 2,
    metadata: {
      toada: 'Tem macaiba',
      nacao: 'Samambaia',
      ritmo: 'Maracatu',
      compositor: 'Domínio Público',
      ...(temMacaibaRaw.metadata || {})
    }
  };

  // =========================================================================
  // 4. VOU VADIAR CARNAVAL (tqsSWxMG8UbzK9FMUE1Q)
  // =========================================================================
  console.log(`[4/6] Préparation de Vou vadiar carnaval (32 mesures, mélodie & paroles, BPM 83)...`);
  const vadiarSource = JSON.parse(fs.readFileSync('recup_presets_git/vadiar_authentique_b77af3b.json', 'utf-8'));
  
  // On structure proprement avec le Bus Toada et Puxador / Coro avec hauteurs de notes
  const vadiarTracks = [
    // 0. Marcante
    {
      ...vadiarSource.tracks[0],
      name: 'Marcante',
      customName: 'Marcante',
      instrumentIdx: 0,
      instrumentRoleKey: 'alfaia_grave'
    },
    // 1. Caixa
    {
      ...vadiarSource.tracks[1],
      name: 'Caixa',
      customName: 'Caixa',
      instrumentIdx: 3,
      instrumentRoleKey: 'caixa_baixo'
    },
    // 2. Gonguê
    {
      ...vadiarSource.tracks[2],
      name: 'Gonguê',
      customName: 'Gonguê',
      instrumentIdx: 5,
      instrumentRoleKey: 'gongue'
    },
    // 3. Agbê
    {
      ...vadiarSource.tracks[3],
      name: 'Agbê',
      customName: 'Agbê',
      instrumentIdx: 6,
      instrumentRoleKey: 'agbe'
    },
    // 4. Bus Toada
    {
      id: 999901,
      name: 'Toada',
      customName: 'Toada',
      instrumentIdx: 12,
      instrumentRoleKey: 'toada',
      isBusFolder: true,
      isFolded: false,
      isSequencerFolded: false,
      volumeVal: 80,
      isMute: false,
      isSolo: false,
      isHidden: false,
      selectedPatternId: 0,
      patterns: []
    },
    // 5. Puxador (Chant soliste)
    {
      id: 999101,
      name: 'Puxador',
      customName: 'Puxador',
      instrumentIdx: 10,
      instrumentRoleKey: 'puxador',
      busId: '999901',
      volumeVal: 85,
      isMute: false,
      isSolo: false,
      isHidden: false,
      selectedPatternId: 17806610283090,
      patterns: [
        {
          id: 17806610283090,
          name: 'Vou Pra Bahia Brincar',
          steps: 16,
          activeSteps: vadiarSource.tracks[4].patterns[0].activeSteps,
          lyrics: vadiarSource.tracks[4].patterns[0].lyrics,
          notes: vadiarSource.tracks[4].patterns[0].notes,
          measureAssignments: vadiarSource.tracks[4].patterns[0].measureAssignments,
          volumes: Array(16).fill(85),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        }
      ]
    },
    // 6. Coro (Réponse du chœur)
    {
      id: 999102,
      name: 'Coro',
      customName: 'Coro',
      instrumentIdx: 11,
      instrumentRoleKey: 'coro',
      busId: '999901',
      volumeVal: 85,
      isMute: false,
      isSolo: false,
      isHidden: false,
      selectedPatternId: 17806610283091,
      patterns: [
        {
          id: 17806610283091,
          name: 'Vou vadiar Carnaval Eu',
          steps: 16,
          activeSteps: vadiarSource.tracks[4].patterns[1].activeSteps,
          lyrics: vadiarSource.tracks[4].patterns[1].lyrics,
          notes: vadiarSource.tracks[4].patterns[1].notes,
          measureAssignments: vadiarSource.tracks[4].patterns[1].measureAssignments,
          volumes: Array(16).fill(85),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        },
        {
          id: 17806610283092,
          name: 'Vou vadiar Carnaval (Fin)',
          steps: 16,
          activeSteps: vadiarSource.tracks[4].patterns[2].activeSteps,
          lyrics: vadiarSource.tracks[4].patterns[2].lyrics,
          notes: vadiarSource.tracks[4].patterns[2].notes,
          measureAssignments: vadiarSource.tracks[4].patterns[2].measureAssignments,
          volumes: Array(16).fill(85),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        }
      ]
    }
  ];

  const vadiarPreset = {
    name: 'Vou vadiar carnaval',
    bpm: 83,
    timeSig: '4/4',
    totalMeasures: 32,
    version: 3,
    audioScaleVersion: 2,
    metadata: {
      toada: 'Vou vadiar carnaval',
      nacao: 'Samambaia',
      ritmo: 'Maracatu',
      compositor: 'Domínio Público',
      ...(vadiarSource.metadata || {})
    },
    tracks: vadiarTracks
  };

  // =========================================================================
  // 5. CONVENÇÃO 2 (nawSahyNqRJK09bwmbHu) - OPTION B (12 mesures, 13 pistes)
  // =========================================================================
  console.log(`[5/6] Préparation de Convenção 2 (Option B : 12 mesures, 13 pistes, BPM 92)...`);
  const conv2Disk = JSON.parse(fs.readFileSync('e:/o-girador/fichiers sequenciador/convencao_2.json', 'utf-8'));
  const conv2Git = JSON.parse(fs.readFileSync('recup_presets_git/convencao_authentique_92e4f40.json', 'utf-8'));

  // Pour Meiao et Repique (pistes 2 et 3 de conv2Disk), réinjecter les motifs de 92e4f40 pour 12 mesures
  const meiaoPatterns = conv2Git.tracks[1].patterns.map(p => ({
    ...p,
    measureAssignments: (p.measureAssignments || []).slice(0, 12)
  }));
  const repiquePatterns = conv2Git.tracks[2].patterns.map(p => ({
    ...p,
    measureAssignments: (p.measureAssignments || []).slice(0, 12)
  }));

  const conv2Tracks = conv2Disk.tracks.map((t, idx) => {
    if (idx === 2) {
      return {
        ...t,
        name: 'Meião',
        customName: 'Meião',
        instrumentIdx: 1,
        instrumentRoleKey: 'alfaia_medio',
        patterns: meiaoPatterns
      };
    }
    if (idx === 3) {
      return {
        ...t,
        name: 'Repique',
        customName: 'Repique',
        instrumentIdx: 2,
        instrumentRoleKey: 'alfaia_agudo',
        patterns: repiquePatterns
      };
    }
    return t;
  });

  const conv2Preset = {
    ...conv2Disk,
    name: 'Convenção 2',
    bpm: 92,
    totalMeasures: 12,
    version: 3,
    audioScaleVersion: 2,
    metadata: {
      toada: 'Convenção 2',
      nacao: 'Samambaia',
      ritmo: 'Maracatu',
      compositor: 'Domínio Público',
      ...(conv2Disk.metadata || {})
    },
    tracks: conv2Tracks
  };

  // =========================================================================
  // 6. BREQUE DE CAIXA (HV63gho48hxMmAXM95TN) - ÉTUDE 4 MESURES
  // =========================================================================
  console.log(`[6/6] Préparation de Breque de caixa (4 mesures, BPM 110)...`);
  const brequeTracks = [
    // 0. Caixa (Piste d'étude principale)
    {
      id: 1780700000001,
      name: 'Caixa',
      customName: 'Caixa',
      instrumentIdx: 3,
      instrumentRoleKey: 'caixa_baixo',
      volumeVal: 85,
      isMute: false,
      isSolo: false,
      isHidden: false,
      selectedPatternId: 1780700000001,
      patterns: [
        {
          id: 1780700000001,
          name: 'Base Luanda',
          steps: 16,
          activeSteps: ["D", "D", "g", "D", "D", "g", "D", "g", "D", "D", "g", "D", "D", "g", "D", "g"],
          lyrics: Array(16).fill(""),
          notes: Array(16).fill(""),
          measureAssignments: [true, true, false, true],
          volumes: Array(16).fill(80),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        },
        {
          id: 1780700000002,
          name: 'Breque de Caixa',
          steps: 16,
          activeSteps: ["D", 0, "D", 0, "D", 0, "D", 0, 0, "D", "E", "D", "E", 0, "F", 0],
          lyrics: Array(16).fill(""),
          notes: Array(16).fill(""),
          measureAssignments: [false, false, true, false],
          volumes: Array(16).fill(85),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        }
      ]
    },
    // 1. Tarol
    {
      id: 1780700000003,
      name: 'Tarol',
      customName: 'Tarol',
      instrumentIdx: 4,
      instrumentRoleKey: 'caixa_alto',
      volumeVal: 80,
      isMute: false,
      isSolo: false,
      isHidden: false,
      selectedPatternId: 1780700000003,
      patterns: [
        {
          id: 1780700000003,
          name: 'Base Tarol',
          steps: 16,
          activeSteps: ["D", "e", "d", "E", "D", "e", "D", "e", "d", "E", "d", "e", "d", "E", "d", "e"],
          lyrics: Array(16).fill(""),
          notes: Array(16).fill(""),
          measureAssignments: [true, true, false, true],
          volumes: Array(16).fill(80),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        },
        {
          id: 1780700000004,
          name: 'Breque Tarol',
          steps: 16,
          activeSteps: ["D", 0, "D", 0, "D", 0, "D", 0, 0, "D", "E", "D", "E", 0, "F", 0],
          lyrics: Array(16).fill(""),
          notes: Array(16).fill(""),
          measureAssignments: [false, false, true, false],
          volumes: Array(16).fill(85),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        }
      ]
    },
    // 2. Marcante
    {
      id: 1780700000005,
      name: 'Marcante',
      customName: 'Marcante',
      instrumentIdx: 0,
      instrumentRoleKey: 'alfaia_grave',
      volumeVal: 80,
      isMute: false,
      isSolo: false,
      isHidden: false,
      selectedPatternId: 1780700000005,
      patterns: [
        {
          id: 1780700000005,
          name: 'Base Luanda',
          steps: 16,
          activeSteps: ["D", 0, 0, 0, "g", 0, "D", 0, "g", "D", 0, 0, "g", "D", 0, 0],
          lyrics: Array(16).fill(""),
          notes: Array(16).fill(""),
          measureAssignments: [true, true, false, true],
          volumes: Array(16).fill(80),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        },
        {
          id: 1780700000006,
          name: 'Breque Alfaia',
          steps: 16,
          activeSteps: ["D", 0, "E", 0, "D", 0, "E", 0, 0, "D", "E", "D", "E", 0, 0, 0],
          lyrics: Array(16).fill(""),
          notes: Array(16).fill(""),
          measureAssignments: [false, false, true, false],
          volumes: Array(16).fill(85),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        }
      ]
    },
    // 3. Gonguê
    {
      id: 1780700000007,
      name: 'Gonguê',
      customName: 'Gonguê',
      instrumentIdx: 5,
      instrumentRoleKey: 'gongue',
      volumeVal: 80,
      isMute: false,
      isSolo: false,
      isHidden: false,
      selectedPatternId: 1780700000007,
      patterns: [
        {
          id: 1780700000007,
          name: 'Base Gonguê',
          steps: 16,
          activeSteps: ["GRV", 0, "AIG", 0, "GRV", 0, "AIG", 0, "GRV", "AIG", 0, "aig", "GRV", 0, "AIG", 0],
          lyrics: Array(16).fill(""),
          notes: Array(16).fill(""),
          measureAssignments: [true, true, false, true],
          volumes: Array(16).fill(80),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        },
        {
          id: 1780700000008,
          name: 'Breque Gonguê',
          steps: 16,
          activeSteps: ["GRV", 0, "GRV", 0, "GRV", 0, "GRV", 0, "GRV", "GRV", "GRV", "GRV", "GRV", 0, 0, 0],
          lyrics: Array(16).fill(""),
          notes: Array(16).fill(""),
          measureAssignments: [false, false, true, false],
          volumes: Array(16).fill(85),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        }
      ]
    },
    // 4. Agbê
    {
      id: 1780700000009,
      name: 'Agbê',
      customName: 'Agbê',
      instrumentIdx: 6,
      instrumentRoleKey: 'agbe',
      volumeVal: 80,
      isMute: false,
      isSolo: false,
      isHidden: false,
      selectedPatternId: 1780700000009,
      patterns: [
        {
          id: 1780700000009,
          name: 'Base Agbê',
          steps: 16,
          activeSteps: ["P", 0, "t", "p", "T", 0, "p", "t", "P", 0, "t", "p", "T", 0, "p", "t"],
          lyrics: Array(16).fill(""),
          notes: Array(16).fill(""),
          measureAssignments: [true, true, false, true],
          volumes: Array(16).fill(80),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        },
        {
          id: 17807000000010,
          name: 'Breque Agbê',
          steps: 16,
          activeSteps: ["P", 0, "T", 0, "P", 0, "T", 0, 0, "P", "T", "P", "T", 0, 0, 0],
          lyrics: Array(16).fill(""),
          notes: Array(16).fill(""),
          measureAssignments: [false, false, true, false],
          volumes: Array(16).fill(85),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        }
      ]
    }
  ];

  const brequePreset = {
    name: 'Breque de caixa',
    bpm: 110,
    timeSig: '4/4',
    totalMeasures: 4,
    version: 3,
    audioScaleVersion: 2,
    metadata: {
      toada: 'Breque de caixa',
      nacao: 'Samambaia',
      ritmo: 'Maracatu',
      compositor: 'Mestre Letho Nascimento'
    },
    tracks: brequeTracks,
    measureBpms: [110, 110, 110, 110]
  };

  // Liste des morceaux à injecter
  const piecesToInject = [
    {
      id: '29dIDjgc2vPuDnwjiy9V',
      name: 'Opanijé',
      preset: opanijePreset,
      audioUrl: 'https://firebasestorage.googleapis.com/v0/b/o-girador-7828c.firebasestorage.app/o/bounces%2Fpresets%2F29dIDjgc2vPuDnwjiy9V.webm?alt=media&token=1ffa976e-fcf6-4bf6-a30a-65bb963fcd07'
    },
    {
      id: 'hJFMrFdzwLezPmeTgVpE',
      name: 'Vovó Falou',
      preset: vovoPreset,
      audioUrl: 'https://firebasestorage.googleapis.com/v0/b/o-girador-7828c.firebasestorage.app/o/bounces%2Fpresets%2FhJFMrFdzwLezPmeTgVpE.webm?alt=media&token=22a07b17-8335-4ed5-ad26-f84e4c9e5bfa'
    },
    {
      id: 'EcUcFC6Vd9hiKq8UR0dD',
      name: 'Tem macaiba',
      preset: macaibaPreset,
      audioUrl: null
    },
    {
      id: 'tqsSWxMG8UbzK9FMUE1Q',
      name: 'Vou vadiar carnaval',
      preset: vadiarPreset,
      audioUrl: null
    },
    {
      id: 'nawSahyNqRJK09bwmbHu',
      name: 'Convenção 2',
      preset: conv2Preset,
      audioUrl: null
    },
    {
      id: 'HV63gho48hxMmAXM95TN',
      name: 'Breque de caixa',
      preset: brequePreset,
      audioUrl: null
    }
  ];

  // Compression LZ-String
  const payloadItems = piecesToInject.map(p => ({
    id: p.id,
    name: p.name,
    audioUrl: p.audioUrl,
    compressedData: LZString.compressToBase64(JSON.stringify(p.preset)),
    measures: p.preset.totalMeasures,
    tracks: p.preset.tracks.length,
    activeSteps: countActiveSteps(p.preset)
  }));

  console.log('\nRésumé des payloads préparés :');
  payloadItems.forEach(p => {
    console.log(`- ${p.name.padEnd(22)} (${p.id}) : ${p.measures} mesures, ${p.tracks} pistes, ${p.activeSteps} pas actifs (${(p.compressedData.length / 1024).toFixed(1)} KB)`);
  });

  // Connexion Playwright et injection dans Firestore
  console.log(`\n============================================================`);
  console.log(`⚡ EXÉCUTION DE L'INJECTION FIRESTORE VIA PLAYWRIGHT...`);
  console.log(`============================================================\n`);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(DEV_SERVER_URL);
    await page.waitForFunction(() => 'firebaseAuth' in window, { timeout: 30000 });

    const injectResults = await page.evaluate(async ({ items, julianUid }) => {
      window.__ALLOW_SANCTUARIZED_RESTORE__ = true;

      const auth = window.firebaseAuth;
      const signIn = window.signInWithEmailAndPassword;
      await signIn(auth, 'mestre@ogirador.com', 'playwrighttest');

      const db = window.firebaseDb;
      const doc = window.doc;
      const setDoc = window.setDoc;
      const getDoc = window.getDoc;

      const results = [];

      for (const item of items) {
        const docRef = doc(db, 'presets', item.id);
        const existingSnap = await getDoc(docRef);
        const existingAudioUrl = existingSnap.exists() ? existingSnap.data()?.audioUrl : null;
        const finalAudioUrl = item.audioUrl || existingAudioUrl || null;

        await setDoc(docRef, {
          name: item.name,
          data: item.compressedData,
          ownerId: julianUid,
          groupId: 'samambaia',
          mestreId: julianUid,
          visibility: 'mestre_group',
          isDraft: false,
          isLocked: true,
          audioUrl: finalAudioUrl,
          updatedAt: Date.now()
        }, { merge: true });

        // Relecture immédiate pour vérification
        const checkSnap = await getDoc(docRef);
        const checkData = checkSnap.data();

        results.push({
          id: item.id,
          name: checkData.name,
          ownerId: checkData.ownerId,
          groupId: checkData.groupId,
          mestreId: checkData.mestreId,
          visibility: checkData.visibility,
          isDraft: checkData.isDraft,
          isLocked: checkData.isLocked,
          hasAudioUrl: !!checkData.audioUrl,
          rawLength: checkData.data?.length || 0
        });
      }

      return results;
    }, { items: payloadItems, julianUid: JULIAN_UID });

    console.log('Résultats retournés par Firestore :');
    console.table(injectResults);

    // Re-vérification avec décompression complète de chaque document
    console.log(`\n============================================================`);
    console.log(`🔍 AUDIT ET CONTRÔLE DE DÉCOMPRESSION DE CHAQUE MORCEAU`);
    console.log(`============================================================\n`);

    const finalAudit = await page.evaluate(async (ids) => {
      const db = window.firebaseDb;
      const doc = window.doc;
      const getDoc = window.getDoc;
      const decompress = window.LZString ? window.LZString.decompressFromBase64 : null;

      const list = [];
      for (const id of ids) {
        const snap = await getDoc(doc(db, 'presets', id));
        if (snap.exists()) {
          const d = snap.data();
          list.push({
            id,
            name: d.name,
            groupId: d.groupId,
            isLocked: d.isLocked,
            visibility: d.visibility,
            compressedLength: d.data?.length || 0,
            dataStr: d.data
          });
        }
      }
      return list;
    }, piecesToInject.map(p => p.id));

    const finalReport = finalAudit.map(item => {
      const decompressed = JSON.parse(LZString.decompressFromBase64(item.dataStr));
      let activeCount = 0;
      let lyricsCount = 0;
      let notesCount = 0;

      (decompressed.tracks || []).forEach(t => {
        (t.patterns || []).forEach(p => {
          activeCount += (p.activeSteps || []).filter(s => s && s !== 0 && s !== '0' && s !== '').length;
          lyricsCount += (p.lyrics || []).filter(Boolean).length;
          notesCount += (p.notes || []).filter(Boolean).length;
        });
      });

      return {
        'Morceau': item.name,
        'ID Firestore': item.id,
        'Mesures': decompressed.totalMeasures,
        'Pistes': (decompressed.tracks || []).length,
        'Pas Actifs': activeCount,
        'Paroles': lyricsCount,
        'Notes': notesCount,
        'BPM': decompressed.bpm,
        'Groupe': item.groupId,
        'Verrouillé': item.isLocked ? 'OUI' : 'NON'
      };
    });

    console.table(finalReport);

    console.log(`\n🎉 SUCCÈS TOTAL : Les 6 morceaux officiels Samambaia ont été restaurés et sanctuarisés dans Firestore !`);

  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('\n❌ Erreur fatale lors de la réinjection :', err);
  process.exit(1);
});
