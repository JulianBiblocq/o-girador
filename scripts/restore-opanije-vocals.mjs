/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Script de rétablissement de l'arbre vocal officiel d'Opanijé (29dIDjgc2vPuDnwjiy9V)
 * Bus Toada, Puxador, Coro + 8 pistes d'instruments = 11 pistes au total sur 43 mesures.
 */

import { chromium } from '@playwright/test';
import fs from 'fs';
import LZString from 'lz-string';

const DEV_SERVER_URL = process.env.BASE_URL || 'http://localhost:5174';
const JULIAN_UID = 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
const OPANIJE_ID = '29dIDjgc2vPuDnwjiy9V';
const TARGET_MEASURES = 43;

async function main() {
  console.log(`\n============================================================`);
  console.log(`🎤 RÉTABLISSEMENT DE L'ARBRE VOCAL D'OPANIJÉ`);
  console.log(`   Serveur: ${DEV_SERVER_URL}`);
  console.log(`============================================================\n`);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log(`[1/4] Connexion au serveur local ${DEV_SERVER_URL}...`);
    await page.goto(DEV_SERVER_URL);
    await page.waitForFunction(() => 'firebaseAuth' in window, { timeout: 30000 });

    console.log(`[2/4] Lecture de l'état actuel d'Opanijé dans Firestore...`);
    const currentPreset = await page.evaluate(async (id) => {
      const auth = window.firebaseAuth;
      const signIn = window.signInWithEmailAndPassword;
      await signIn(auth, 'mestre@ogirador.com', 'playwrighttest');

      const { getCloudPreset } = await import('/src/cloudLibrary.ts');
      const p = await getCloudPreset(id);
      const snap = await window.getDoc(window.doc(window.firebaseDb, 'presets', id));
      return {
        preset: p,
        docData: snap.data()
      };
    }, OPANIJE_ID);

    const basePreset = currentPreset.preset;
    console.log(`  Preset actuel: "${basePreset?.name}", BPM: ${basePreset?.bpm}, Mesures: ${basePreset?.totalMeasures}, Pistes: ${basePreset?.tracks?.length}`);

    // Garder les 8 premières pistes instrumentales (Marcante, Meião, Repique, Tarol, Caixa, Gonguê, Agbê, Apito)
    const instrumentTracks = (basePreset?.tracks || []).filter(t => !t.isBusFolder && t.instrumentRoleKey !== 'puxador' && t.instrumentRoleKey !== 'coro' && t.instrumentIdx !== 10 && t.instrumentIdx !== 11 && t.instrumentIdx !== 12);
    console.log(`  Pistes instrumentales conservées (${instrumentTracks.length}):`, instrumentTracks.map(t => t.customName || t.name));

    // Construction de l'arbre vocal officiel
    const TOADA_BUS_ID = 'toada_bus_opanije';
    const PUXADOR_ID = 'puxador_opanije';
    const CORO_ID = 'coro_opanije';

    const toadaBusTrack = {
      id: TOADA_BUS_ID,
      name: 'Bus Toada',
      customName: 'Toada',
      instrumentIdx: 12,
      instrumentRoleKey: 'toada',
      isBusFolder: true,
      isFolded: false,
      isSequencerFolded: false,
      volumeVal: 75,
      isMute: false,
      isSolo: false,
      isHidden: false,
      selectedPatternId: 0,
      patterns: []
    };

    const puxadorTrack = {
      id: PUXADOR_ID,
      name: 'Puxador',
      customName: 'Puxador',
      instrumentIdx: 10,
      instrumentRoleKey: 'puxador',
      busId: TOADA_BUS_ID,
      volumeVal: 80,
      isMute: false,
      isSolo: false,
      isHidden: false,
      selectedPatternId: 9991011,
      patterns: [
        {
          id: 9991011,
          name: 'Puxador 1',
          steps: 16,
          activeSteps: Array(16).fill(0),
          lyrics: Array(16).fill(''),
          notes: Array(16).fill(''),
          measureAssignments: Array(TARGET_MEASURES).fill(false),
          volumes: Array(16).fill(80),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        }
      ]
    };

    const coroTrack = {
      id: CORO_ID,
      name: 'Coro',
      customName: 'Coro',
      instrumentIdx: 11,
      instrumentRoleKey: 'coro',
      busId: TOADA_BUS_ID,
      volumeVal: 80,
      isMute: false,
      isSolo: false,
      isHidden: false,
      selectedPatternId: 9991021,
      patterns: [
        {
          id: 9991021,
          name: 'Coro 1',
          steps: 16,
          activeSteps: Array(16).fill(0),
          lyrics: Array(16).fill(''),
          notes: Array(16).fill(''),
          measureAssignments: Array(TARGET_MEASURES).fill(false),
          volumes: Array(16).fill(80),
          decays: Array(16).fill(100),
          microtimings: Array(16).fill(0),
          variations: []
        }
      ]
    };

    // Assemblage final des 11 pistes
    const finalTracks = [
      ...instrumentTracks,
      toadaBusTrack,
      puxadorTrack,
      coroTrack
    ];

    console.log(`\n  Arbre total constitué : ${finalTracks.length} pistes.`);

    const updatedPresetObject = {
      ...basePreset,
      name: 'Opanijé',
      bpm: 110,
      totalMeasures: TARGET_MEASURES,
      tracks: finalTracks
    };

    const compressedOpanije = LZString.compressToBase64(JSON.stringify(updatedPresetObject));

    console.log(`\n[3/4] Écriture dans Firestore (document ${OPANIJE_ID})...`);
    const updateResult = await page.evaluate(async ({ id, compressedData, julianUid }) => {
      window.__ALLOW_SANCTUARIZED_RESTORE__ = true;

      const auth = window.firebaseAuth;
      const signIn = window.signInWithEmailAndPassword;
      await signIn(auth, 'mestre@ogirador.com', 'playwrighttest');

      const db = window.firebaseDb;
      const doc = window.doc;
      const setDoc = window.setDoc;

      const docRef = doc(db, 'presets', id);
      await setDoc(docRef, {
        name: 'Opanijé',
        data: compressedData,
        ownerId: julianUid,
        groupId: 'samambaia',
        mestreId: julianUid,
        visibility: 'mestre_group',
        isDraft: false,
        isLocked: true,
        updatedAt: Date.now()
      }, { merge: true });

      return { success: true };
    }, {
      id: OPANIJE_ID,
      compressedData: compressedOpanije,
      julianUid: JULIAN_UID
    });

    console.log(`  ✓ Écriture Firestore terminée avec succès.`);

    console.log(`\n[4/4] Contrôle & Relecture de validation...`);
    const verified = await page.evaluate(async (id) => {
      const { getCloudPreset } = await import('/src/cloudLibrary.ts');
      const p = await getCloudPreset(id);
      const snap = await window.getDoc(window.doc(window.firebaseDb, 'presets', id));
      const docData = snap.data();
      return {
        id,
        name: docData?.name,
        presetName: p?.name,
        bpm: p?.bpm,
        totalMeasures: p?.totalMeasures,
        groupId: docData?.groupId,
        isLocked: docData?.isLocked,
        visibility: docData?.visibility,
        tracksCount: p?.tracks?.length,
        tracks: p?.tracks?.map((t, i) => ({
          num: i + 1,
          id: t.id,
          name: t.name,
          customName: t.customName,
          instIdx: t.instrumentIdx,
          isBus: !!t.isBusFolder,
          busId: t.busId || null,
          role: t.instrumentRoleKey || null,
          patternsCount: t.patterns?.length || 0,
          patternMeasures: t.patterns?.[0]?.measureAssignments?.length || 0
        }))
      };
    }, OPANIJE_ID);

    console.log('\n============================================================');
    console.log('🎉 BILAN OPANIJÉ APRÈS MISE À JOUR :');
    console.log('============================================================\n');
    console.log(`Titre: ${verified.name}`);
    console.log(`ID: ${verified.id}`);
    console.log(`BPM: ${verified.bpm}`);
    console.log(`Total Mesures: ${verified.totalMeasures}`);
    console.log(`Nombre total de pistes: ${verified.tracksCount}`);
    console.log(`Groupe: ${verified.groupId}`);
    console.log(`Verrouillé: ${verified.isLocked}`);
    console.log(`Visibilité: ${verified.visibility}`);
    console.log('\nListe ordonnée des 11 pistes :');
    console.table(verified.tracks);

  } catch (err) {
    console.error('❌ Erreur lors du rétablissement vocal :', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
