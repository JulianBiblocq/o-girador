/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Script de restauration chirurgicale intégrale des morceaux du catalogue Samambaia
 * et de purge des presets fantômes générés par les tests E2E.
 * Utilise Playwright Chromium pour opérer dans l'environnement Firebase authentifié.
 */

import { chromium } from '@playwright/test';
import fs from 'fs';
import { execSync } from 'child_process';
import LZString from 'lz-string';

const DEV_SERVER_URL = process.env.BASE_URL || 'http://localhost:5174';
const JULIAN_UID = 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';

// 🛡️ Morceaux officiels du répertoire Samambaia sanctuarisés
const SANCTUARIZED_IDS = [
  '29dIDjgc2vPuDnwjiy9V', // Opanijé
  'hJFMrFdzwLezPmeTgVpE', // Vovó Falou
  'nawSahyNqRJK09bwmbHu', // Convenção 2
  'EcUcFC6Vd9hiKq8UR0dD', // Tem macaiba
  'HV63gho48hxMmAXM95TN', // Breque de caixa
  'tqsSWxMG8UbzK9FMUE1Q', // Vou vadiar carnaval
  'Vou vadiar carnaval',
  '_convencao_2'
];

async function main() {
  console.log(`\n============================================================`);
  console.log(`🚀 RESTAURATION CHIRURGICALE DES MORCEAUX DU CATALOGUE SAMAMBAIA`);
  console.log(`   Serveur: ${DEV_SERVER_URL}`);
  console.log(`============================================================\n`);

  // =========================================================================
  // 1. Préparation de VOVÓ FALOU (hJFMrFdzwLezPmeTgVpE)
  // =========================================================================
  console.log(`[1/6] Préparation de Vovó Falou (BPM 77, 4 mesures)...`);
  const rawVovo = execSync('git show 5c611d6:public/presets/Vovo_falou.json').toString();
  const vovoGit = JSON.parse(rawVovo);

  const vovoTracks = [
    // 0. Alfaia Marcante
    {
      id: 1779908305252,
      name: 'Marcante',
      customName: 'Marcante',
      instrumentIdx: 0,
      volumeVal: 75,
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
      volumeVal: 75,
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
      volumeVal: 75,
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
      volumeVal: 75,
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
      isBusFolder: true,
      isFolded: false,
      isSequencerFolded: false,
      volumeVal: 75,
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
      volumeVal: 75,
      isMute: false,
      isSolo: false,
      isHidden: false,
      selectedPatternId: 1779908319456,
      patterns: [
        {
          id: 1779908319456,
          name: 'Padrão 1',
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
          name: 'Padrão 2',
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
          name: 'Padrão 3',
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
      volumeVal: 75,
      isMute: false,
      isSolo: false,
      isHidden: false,
      selectedPatternId: 1779923888740,
      patterns: [
        {
          id: 1779923888740,
          name: 'Padrão 1',
          steps: 16,
          activeSteps: [0, 0, 0, 0, "C", "C", 0, "C", "C", 0, 0, 0, 0, 0, 0, 0],
          lyrics: ["", "", "", "", "Vo", "vó", "", "Fa", "lou", "", "", "", "", "", "", ""],
          notes: Array(16).fill(""),
          measureAssignments: [true, false, false, true],
          volumes: Array(16).fill(80),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        }
      ]
    }
  ];

  const vovoPresetObject = {
    name: 'Vovó Falou',
    bpm: 77,
    timeSig: '4/4',
    version: 3,
    audioScaleVersion: 2,
    totalMeasures: 4,
    metadata: {
      toada: 'Vovó Falou',
      nacao: 'Samambaia',
      ritmo: 'Maracatu',
      compositor: 'Domínio Público'
    },
    tracks: vovoTracks,
    circles: vovoGit.circles
  };

  const compressedVovo = LZString.compressToBase64(JSON.stringify(vovoPresetObject));

  // =========================================================================
  // 2. Préparation d'OPANIJÉ (29dIDjgc2vPuDnwjiy9V)
  // =========================================================================
  console.log(`[2/6] Préparation d'Opanijé (11 pistes, totalMeasures: 43)...`);
  const opanijeDump = JSON.parse(fs.readFileSync('scripts/opanije-firestore-dump.json', 'utf-8'));
  let audioMasterOpanije = null;
  if (fs.existsSync('scripts/audio-master-opanije-dump.json')) {
    audioMasterOpanije = JSON.parse(fs.readFileSync('scripts/audio-master-opanije-dump.json', 'utf-8'));
  }

  const TARGET_OPANIJE_MEASURES = 43;
  const opanijeTracks = JSON.parse(JSON.stringify(opanijeDump.tracks));

  opanijeTracks.forEach((track, tIdx) => {
    track.patterns.forEach(pattern => {
      const oldAssignments = pattern.measureAssignments || [];
      const newAssignments = Array(TARGET_OPANIJE_MEASURES).fill(false);
      for (let m = 0; m < Math.min(oldAssignments.length, TARGET_OPANIJE_MEASURES); m++) {
        newAssignments[m] = Boolean(oldAssignments[m]);
      }
      pattern.measureAssignments = newAssignments;
    });

    if (tIdx <= 6 && track.patterns.length > 0) {
      let groovePattern = track.patterns[track.patterns.length - 1];
      if (track.patterns.length >= 2) {
        const candidate = track.patterns[track.patterns.length - 2];
        const lastActiveMeasures = groovePattern.measureAssignments.map((v, i) => v ? i : null).filter(v => v !== null);
        if (lastActiveMeasures.length <= 2 && lastActiveMeasures.includes(17)) {
          groovePattern = candidate;
        }
      }

      for (let m = 18; m < TARGET_OPANIJE_MEASURES; m++) {
        groovePattern.measureAssignments[m] = true;
      }
    }
  });

  const measureBpms = Array(TARGET_OPANIJE_MEASURES).fill(110);
  const measureTimeSigs = Array(TARGET_OPANIJE_MEASURES).fill('4/4');
  const measureBpmTransitions = Array(TARGET_OPANIJE_MEASURES).fill('immediate');
  const measureSignals = Array(TARGET_OPANIJE_MEASURES).fill(null);

  for (let m = 13; m <= 25; m++) {
    measureBpms[m] = 55;
  }
  measureTimeSigs[25] = '2/4';
  measureSignals[11] = 'tytpS8KGav0rCMI19MIJ'; // Signal Opanijé
  measureSignals[34] = 'mqrzw56jppw6';         // Signal Luanda

  const opanijeAudioUrl = audioMasterOpanije?.audioUrl || 'https://firebasestorage.googleapis.com/v0/b/o-girador-7828c.firebasestorage.app/o/bounces%2Fpresets%2F29dIDjgc2vPuDnwjiy9V.webm?alt=media&token=1ffa976e-fcf6-4bf6-a30a-65bb963fcd07';

  const opanijePresetObject = {
    name: 'Opanijé',
    bpm: 110,
    timeSig: '4/4',
    version: 3,
    audioScaleVersion: 2,
    totalMeasures: TARGET_OPANIJE_MEASURES,
    metadata: {
      toada: 'Opanijé',
      nacao: 'Samambaia',
      ritmo: 'Maracatu',
      compositor: 'Mestre Letho Nascimento',
      youtubeUrl: 'https://youtu.be/Egjm2kYAmrA?si=lqSo8vKE8v4Vobxb'
    },
    measureBpms,
    measureTimeSigs,
    measureBpmTransitions,
    measureSignals,
    tracks: opanijeTracks
  };

  const compressedOpanije = LZString.compressToBase64(JSON.stringify(opanijePresetObject));

  // =========================================================================
  // 3. Préparation de TEM MACAIBA (EcUcFC6Vd9hiKq8UR0dD)
  // =========================================================================
  console.log(`[3/6] Préparation de Tem macaiba (BPM 83, 8 mesures, 7 pistes)...`);
  const temMacaibaRaw = JSON.parse(fs.readFileSync('../tem_macaiba.json', 'utf-8'));
  
  // Normaliser les noms de pistes
  const macaibaTrackNames = [
    { name: 'Caixa', customName: 'Caixa' },
    { name: 'ALFAIAS', customName: 'ALFAIAS' },
    { name: 'Marcante', customName: 'Marcante' },
    { name: 'Meião', customName: 'Meião' },
    { name: 'Repique', customName: 'Repique' },
    { name: 'Gonguê', customName: 'Gonguê' },
    { name: 'Mineiro', customName: 'Mineiro' }
  ];

  temMacaibaRaw.tracks.forEach((t, i) => {
    if (macaibaTrackNames[i]) {
      t.name = t.name || macaibaTrackNames[i].name;
      t.customName = t.customName || macaibaTrackNames[i].customName;
    }
  });

  const macaibaPresetObject = {
    ...temMacaibaRaw,
    name: 'Tem macaiba',
    bpm: temMacaibaRaw.bpm || 83,
    totalMeasures: temMacaibaRaw.totalMeasures || 8,
    version: 3,
    metadata: {
      toada: 'Tem macaiba',
      nacao: 'Samambaia',
      ritmo: 'Maracatu',
      compositor: 'Domínio Público'
    }
  };

  const compressedMacaiba = LZString.compressToBase64(JSON.stringify(macaibaPresetObject));

  // =========================================================================
  // 4. Préparation de CONVENÇÃO 2 (nawSahyNqRJK09bwmbHu)
  // =========================================================================
  console.log(`[4/6] Préparation de Convenção 2 (BPM 92, 12 mesures, 13 pistes)...`);
  const conv2Raw = JSON.parse(fs.readFileSync('../fichiers sequenciador/convencao_2.json', 'utf-8'));

  const conv2TrackNames = [
    { name: 'ALFAIAS', customName: 'ALFAIAS' },
    { name: 'Marcante', customName: 'Marcante' },
    { name: 'Meião', customName: 'Meião' },
    { name: 'Repique', customName: 'Repique' },
    { name: 'Timbal', customName: 'Timbal' },
    { name: 'Gonguê', customName: 'Gonguê' },
    { name: 'Caixas', customName: 'Caixas' },
    { name: 'Tarol', customName: 'Tarol' },
    { name: 'Caixa', customName: 'Caixa' },
    { name: 'Sementes', customName: 'Sementes' },
    { name: 'Agbê', customName: 'Agbê' },
    { name: 'Mineiro', customName: 'Mineiro' },
    { name: 'Apito', customName: 'Apito' }
  ];

  conv2Raw.tracks.forEach((t, i) => {
    if (conv2TrackNames[i]) {
      t.name = t.name || conv2TrackNames[i].name;
      t.customName = t.customName || conv2TrackNames[i].customName;
    }
  });

  const conv2PresetObject = {
    ...conv2Raw,
    name: 'Convenção 2',
    bpm: conv2Raw.bpm || 92,
    totalMeasures: conv2Raw.totalMeasures || 12,
    version: 3,
    metadata: {
      toada: 'Convenção 2',
      nacao: 'Samambaia',
      ritmo: 'Maracatu',
      compositor: 'Domínio Público'
    }
  };

  const compressedConv2 = LZString.compressToBase64(JSON.stringify(conv2PresetObject));

  // =========================================================================
  // 5. Préparation de VOU VADIAR CARNAVAL (tqsSWxMG8UbzK9FMUE1Q)
  // =========================================================================
  console.log(`[5/6] Préparation de Vou vadiar carnaval (BPM 83, 32 mesures, 7 pistes avec voix)...`);
  const vouVadiarRaw = JSON.parse(fs.readFileSync('public/presets/Vou vadiar carnaval.json', 'utf-8'));

  // Construction des pistes avec séparation propre Toada / Puxador / Coro
  const vouVadiarTracks = [
    // 0. Marcante
    {
      ...vouVadiarRaw.tracks[0],
      name: 'Marcante',
      customName: 'Marcante'
    },
    // 1. Caixa
    {
      ...vouVadiarRaw.tracks[1],
      name: 'Caixa',
      customName: 'Caixa'
    },
    // 2. Gonguê
    {
      ...vouVadiarRaw.tracks[2],
      name: 'Gonguê',
      customName: 'Gonguê'
    },
    // 3. Agbê
    {
      ...vouVadiarRaw.tracks[3],
      name: 'Agbê',
      customName: 'Agbê'
    },
    // 4. Toada bus
    {
      id: 999901,
      name: 'Toada',
      customName: 'Toada',
      instrumentIdx: 12,
      isBusFolder: true,
      isFolded: false,
      isSequencerFolded: false,
      volumeVal: 75,
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
      volumeVal: 84,
      isMute: false,
      isSolo: false,
      isHidden: false,
      selectedPatternId: 17806610283090,
      patterns: [
        {
          id: 17806610283090,
          name: 'Padrão 1',
          steps: 16,
          activeSteps: ["P", 0, "P", 0, "P", 0, "P", 0, 0, "P", 0, "P", "P", 0, 0, 0],
          lyrics: ["Vou", "", "Pra", "", "Ba-", "", "hi-", "", "", "a", "", "Brin-", "car", "", "", ""],
          notes: ["F4", "", "F4", "", "F4", "", "G4", "", "", "G4", "", "F4", "D4", "", "", ""],
          measureAssignments: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, false, false, false, false, false, false],
          volumes: Array(16).fill(84),
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
      volumeVal: 84,
      isMute: false,
      isSolo: false,
      isHidden: false,
      selectedPatternId: 17806610283091,
      patterns: [
        {
          id: 17806610283091,
          name: 'Padrão 2',
          steps: 16,
          activeSteps: ["C", 0, "C", 0, "C", 0, "C", 0, 0, "C", 0, "C", "C", 0, "P", 0],
          lyrics: ["Vou", "", "va-", "", "di-", "", "ar", "", "", "Car-", "", "na-", "val", "", "Eu", ""],
          notes: ["G4", "", "G4", "", "G4", "", "A4", "", "", "F4", "", "D4", "F4", "", "A4", ""],
          measureAssignments: [false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, false, false, false, false, false, false, false],
          volumes: Array(16).fill(84),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        }
      ]
    }
  ];

  const vouVadiarPresetObject = {
    name: 'Vou vadiar carnaval',
    bpm: vouVadiarRaw.bpm || 83,
    timeSig: '4/4',
    totalMeasures: 32,
    version: 3,
    audioScaleVersion: 2,
    metadata: {
      toada: 'Vou vadiar carnaval',
      nacao: 'Samambaia',
      ritmo: 'Maracatu',
      compositor: 'Domínio Público'
    },
    tracks: vouVadiarTracks,
    circles: vouVadiarRaw.circles
  };

  const compressedVouVadiar = LZString.compressToBase64(JSON.stringify(vouVadiarPresetObject));

  // =========================================================================
  // 6. Préparation de BREQUE DE CAIXA (HV63gho48hxMmAXM95TN)
  // =========================================================================
  console.log(`[6/6] Préparation de Breque de caixa (BPM 110, 4 mesures, 5 pistes de percussion)...`);

  const brequeTracks = [
    // 0. Caixa (instIdx: 3)
    {
      id: 1780700000001,
      name: 'Caixa',
      customName: 'Caixa',
      instrumentIdx: 3,
      volumeVal: 80,
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
    // 1. Tarol (instIdx: 4)
    {
      id: 1780700000003,
      name: 'Tarol',
      customName: 'Tarol',
      instrumentIdx: 4,
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
    // 2. Marcante (instIdx: 0)
    {
      id: 1780700000005,
      name: 'Marcante',
      customName: 'Marcante',
      instrumentIdx: 0,
      volumeVal: 80,
      isMute: false,
      isSolo: false,
      isHidden: false,
      selectedPatternId: 1780700000005,
      patterns: [
        {
          id: 1780700000005,
          name: 'Base Marcante',
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
          name: 'Breque Marcante',
          steps: 16,
          activeSteps: ["D", 0, 0, 0, "D", 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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
    // 3. Gonguê (instIdx: 5)
    {
      id: 1780700000007,
      name: 'Gonguê',
      customName: 'Gonguê',
      instrumentIdx: 5,
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
          activeSteps: ["GRV", 0, 0, 0, "GRV", 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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
    // 4. Agbê (instIdx: 6)
    {
      id: 1780700000009,
      name: 'Agbê',
      customName: 'Agbê',
      instrumentIdx: 6,
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
          id: 1780700000010,
          name: 'Breque Agbê',
          steps: 16,
          activeSteps: ["P", 0, 0, 0, "T", 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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

  const brequePresetObject = {
    name: 'Breque de caixa',
    bpm: 110,
    timeSig: '4/4',
    version: 3,
    audioScaleVersion: 2,
    totalMeasures: 4,
    metadata: {
      toada: 'Breque de caixa',
      nacao: 'Samambaia',
      ritmo: 'Maracatu',
      compositor: 'Domínio Público'
    },
    tracks: brequeTracks
  };

  const compressedBreque = LZString.compressToBase64(JSON.stringify(brequePresetObject));

  // =========================================================================
  // Synchronisation Firestore via Playwright (Session Mestre authentifiée)
  // =========================================================================
  console.log(`\nConnexion Playwright au studio et synchronisation Firestore...`);
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(DEV_SERVER_URL);
    await page.waitForFunction(() => 'firebaseAuth' in window, { timeout: 30000 });

    const payload = {
      JULIAN_UID,
      SANCTUARIZED_IDS,
      TARGET_OPANIJE_MEASURES,
      compressedVovo,
      compressedOpanije,
      compressedMacaiba,
      compressedConv2,
      compressedVouVadiar,
      compressedBreque,
      opanijeAudioUrl
    };

    const result = await page.evaluate(async (data) => {
      window.__ALLOW_SANCTUARIZED_RESTORE__ = true;

      const auth = window.firebaseAuth;
      const signIn = window.signInWithEmailAndPassword;
      await signIn(auth, 'mestre@ogirador.com', 'playwrighttest');

      const db = window.firebaseDb;
      const doc = window.doc;
      const getDoc = window.getDoc;
      const setDoc = window.setDoc;
      const collection = window.collection;
      const getDocs = window.getDocs;

      const { deleteCloudPreset } = await import('/src/cloudLibrary.ts');
      const logs = [];

      // 1. Vovó Falou
      const vovoDocRef = doc(db, 'presets', 'hJFMrFdzwLezPmeTgVpE');
      const vovoSnap = await getDoc(vovoDocRef);
      const existingVovoAudioUrl = vovoSnap.exists() ? vovoSnap.data()?.audioUrl : null;
      const vovoAudioUrl = existingVovoAudioUrl || 'https://firebasestorage.googleapis.com/v0/b/o-girador-7828c.firebasestorage.app/o/bounces%2Fpresets%2FhJFMrFdzwLezPmeTgVpE.webm?alt=media&token=22a07b17-8335-4ed5-ad26-f84e4c9e5bfa';

      await setDoc(vovoDocRef, {
        name: 'Vovó Falou',
        data: data.compressedVovo,
        ownerId: data.JULIAN_UID,
        groupId: 'samambaia',
        mestreId: data.JULIAN_UID,
        visibility: 'mestre_group',
        isDraft: false,
        isLocked: true,
        audioUrl: vovoAudioUrl,
        updatedAt: Date.now()
      }, { merge: true });
      logs.push('✓ Vovó Falou (hJFMrFdzwLezPmeTgVpE) restauré et verrouillé.');

      // 2. Opanijé
      const opanijeDocRef = doc(db, 'presets', '29dIDjgc2vPuDnwjiy9V');
      await setDoc(opanijeDocRef, {
        name: 'Opanijé',
        data: data.compressedOpanije,
        ownerId: data.JULIAN_UID,
        groupId: 'samambaia',
        mestreId: data.JULIAN_UID,
        visibility: 'mestre_group',
        isDraft: false,
        isLocked: true,
        audioUrl: data.opanijeAudioUrl,
        updatedAt: Date.now()
      }, { merge: true });
      logs.push(`✓ Opanijé (29dIDjgc2vPuDnwjiy9V) validé et verrouillé (${data.TARGET_OPANIJE_MEASURES} mesures).`);

      // 3. Tem macaiba
      const macaibaDocRef = doc(db, 'presets', 'EcUcFC6Vd9hiKq8UR0dD');
      await setDoc(macaibaDocRef, {
        name: 'Tem macaiba',
        data: data.compressedMacaiba,
        ownerId: data.JULIAN_UID,
        groupId: 'samambaia',
        mestreId: data.JULIAN_UID,
        visibility: 'mestre_group',
        isDraft: false,
        isLocked: true,
        updatedAt: Date.now()
      }, { merge: true });
      logs.push('✓ Tem macaiba (EcUcFC6Vd9hiKq8UR0dD) restauré et verrouillé.');

      // 4. Convenção 2
      const conv2DocRef = doc(db, 'presets', 'nawSahyNqRJK09bwmbHu');
      await setDoc(conv2DocRef, {
        name: 'Convenção 2',
        data: data.compressedConv2,
        ownerId: data.JULIAN_UID,
        groupId: 'samambaia',
        mestreId: data.JULIAN_UID,
        visibility: 'mestre_group',
        isDraft: false,
        isLocked: true,
        updatedAt: Date.now()
      }, { merge: true });
      logs.push('✓ Convenção 2 (nawSahyNqRJK09bwmbHu) restauré et verrouillé (groupId: samambaia).');

      // 5. Vou vadiar carnaval
      const vouVadiarDocRef = doc(db, 'presets', 'tqsSWxMG8UbzK9FMUE1Q');
      await setDoc(vouVadiarDocRef, {
        name: 'Vou vadiar carnaval',
        data: data.compressedVouVadiar,
        ownerId: data.JULIAN_UID,
        groupId: 'samambaia',
        mestreId: data.JULIAN_UID,
        visibility: 'mestre_group',
        isDraft: false,
        isLocked: true,
        updatedAt: Date.now()
      }, { merge: true });
      logs.push('✓ Vou vadiar carnaval (tqsSWxMG8UbzK9FMUE1Q) restauré et verrouillé.');

      // 6. Breque de caixa
      const brequeDocRef = doc(db, 'presets', 'HV63gho48hxMmAXM95TN');
      await setDoc(brequeDocRef, {
        name: 'Breque de caixa',
        data: data.compressedBreque,
        ownerId: data.JULIAN_UID,
        groupId: 'samambaia',
        mestreId: data.JULIAN_UID,
        visibility: 'mestre_group',
        isDraft: false,
        isLocked: true,
        updatedAt: Date.now()
      }, { merge: true });
      logs.push('✓ Breque de caixa (HV63gho48hxMmAXM95TN) reconstitué, restauré et verrouillé.');

      // 7. Purge des presets fantômes de tests
      const allPresetsSnap = await getDocs(collection(db, 'presets'));
      const deletedPresets = [];

      for (const d of allPresetsSnap.docs) {
        const item = d.data();
        const pId = d.id;
        const name = (item.name || '').trim();

        const isSanctuarized = data.SANCTUARIZED_IDS.includes(pId);
        const isJulian = item.ownerId === data.JULIAN_UID;
        const isGhostTest = /^E2E Test/i.test(name) || /^Test Perso Membre/i.test(name);

        if (isGhostTest && !isSanctuarized && !isJulian) {
          try {
            await deleteCloudPreset(pId, item.audioUrl);
            deletedPresets.push({ id: pId, name });
            logs.push(`✗ Supprimé preset fantôme de test: "${name}" (${pId})`);
          } catch (delErr) {
            logs.push(`⚠️ Erreur suppression ${pId}: ${delErr.message}`);
          }
        }
      }

      logs.push(`Purge achevée : ${deletedPresets.length} presets fantômes nettoyés.`);
      return { logs, deletedCount: deletedPresets.length };
    }, payload);

    console.log(`\nRésultats d'exécution :`);
    result.logs.forEach(l => console.log('  ' + l));

    // =========================================================================
    // Contrôle et Relecture intégrale des 6 morceaux
    // =========================================================================
    console.log(`\nContrôle final par relecture complète Firestore...`);
    const verification = await page.evaluate(async (ids) => {
      const db = window.firebaseDb;
      const doc = window.doc;
      const getDoc = window.getDoc;
      const { getCloudPreset } = await import('/src/cloudLibrary.ts');

      const pieces = [];
      for (const id of ids) {
        const snap = await getDoc(doc(db, 'presets', id));
        const data = snap.data();
        const p = await getCloudPreset(id);
        pieces.push({
          id,
          name: data?.name,
          presetName: p?.name,
          groupId: data?.groupId,
          ownerId: data?.ownerId,
          mestreId: data?.mestreId,
          visibility: data?.visibility,
          isDraft: data?.isDraft,
          isLocked: data?.isLocked,
          bpm: p?.bpm,
          totalMeasures: p?.totalMeasures,
          tracksCount: p?.tracks?.length || 0,
          tracks: p?.tracks?.map(t => ({
            name: t.customName || t.name,
            instIdx: t.instrumentIdx,
            isBus: !!t.isBusFolder,
            patternsCount: t.patterns?.length || 0
          }))
        });
      }
      return pieces;
    }, [
      '29dIDjgc2vPuDnwjiy9V',
      'hJFMrFdzwLezPmeTgVpE',
      'EcUcFC6Vd9hiKq8UR0dD',
      'HV63gho48hxMmAXM95TN',
      'tqsSWxMG8UbzK9FMUE1Q',
      'nawSahyNqRJK09bwmbHu'
    ]);

    console.log('\n============================================================');
    console.log('🎉 BILAN FINAL DE RESTAURATION DES MORCEAUX DU CATALOGUE :');
    console.log('============================================================\n');
    console.table(verification.map(p => ({
      'Titre': p.name,
      'ID Firestore': p.id,
      'Mesures': p.totalMeasures,
      'Pistes': p.tracksCount,
      'BPM': p.bpm,
      'Groupe': p.groupId,
      'Locked': p.isLocked,
      'Visibilité': p.visibility
    })));

    console.log('\nDétail des pistes par morceau :');
    verification.forEach(p => {
      console.log(`\n📌 ${p.name} (${p.id}) - ${p.totalMeasures} mesures, ${p.tracksCount} pistes, BPM ${p.bpm} :`);
      p.tracks?.forEach((t, i) => {
        console.log(`   ${i + 1}. [${t.isBus ? 'BUS' : 'INST ' + t.instIdx}] ${t.name} (${t.patternsCount} patterns)`);
      });
    });

  } catch (err) {
    console.error('❌ Erreur durant la restauration :', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
