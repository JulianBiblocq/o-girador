/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Script d'application directe du JSON authentique complet d'Opanijé
 * Source: recup-opanije-43mesures.json (11 pistes, 43 mesures)
 * Cible Firestore: presets/29dIDjgc2vPuDnwjiy9V
 */

import { chromium } from '@playwright/test';
import fs from 'fs';
import LZString from 'lz-string';

const DEV_SERVER_URL = process.env.BASE_URL || 'http://localhost:5174';
const JULIAN_UID = 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
const OPANIJE_ID = '29dIDjgc2vPuDnwjiy9V';

async function main() {
  console.log(`\n============================================================`);
  console.log(`🚀 INJECTION D'OPANIJÉ DEPUIS recup-opanije-43mesures.json`);
  console.log(`   Serveur: ${DEV_SERVER_URL}`);
  console.log(`============================================================\n`);

  // 1. Lire le fichier source
  if (!fs.existsSync('recup-opanije-43mesures.json')) {
    throw new Error('Fichier recup-opanije-43mesures.json introuvable !');
  }

  const rawData = JSON.parse(fs.readFileSync('recup-opanije-43mesures.json', 'utf-8'));
  console.log(`[1/3] Source lue : ${rawData.tracks?.length} pistes, ${rawData.totalMeasures} mesures.`);

  // S'assurer du nom propre et des métadonnées
  const opanijePresetObject = {
    ...rawData,
    name: 'Opanijé',
    version: 3,
    audioScaleVersion: 2,
    totalMeasures: 43,
    metadata: {
      toada: 'Opanijé',
      nacao: 'Samambaia',
      ritmo: 'Maracatu',
      compositor: 'Mestre Letho Nascimento',
      youtubeUrl: 'https://youtu.be/Egjm2kYAmrA?si=lqSo8vKE8v4Vobxb',
      ...(rawData.metadata || {})
    }
  };

  const compressedData = LZString.compressToBase64(JSON.stringify(opanijePresetObject));
  console.log(`  Taille compressée LZ-String : ${(compressedData.length / 1024).toFixed(1)} KB`);

  // 2. Connexion Playwright et écriture dans Firestore
  console.log(`\n[2/3] Écriture dans Firestore (document ${OPANIJE_ID})...`);
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(DEV_SERVER_URL);
    await page.waitForFunction(() => 'firebaseAuth' in window, { timeout: 30000 });

    const payload = {
      id: OPANIJE_ID,
      compressedData,
      julianUid: JULIAN_UID,
      audioUrl: 'https://firebasestorage.googleapis.com/v0/b/o-girador-7828c.firebasestorage.app/o/bounces%2Fpresets%2F29dIDjgc2vPuDnwjiy9V.webm?alt=media&token=1ffa976e-fcf6-4bf6-a30a-65bb963fcd07'
    };

    const writeResult = await page.evaluate(async (data) => {
      window.__ALLOW_SANCTUARIZED_RESTORE__ = true;

      const auth = window.firebaseAuth;
      const signIn = window.signInWithEmailAndPassword;
      await signIn(auth, 'mestre@ogirador.com', 'playwrighttest');

      const db = window.firebaseDb;
      const doc = window.doc;
      const setDoc = window.setDoc;
      const docRef = doc(db, 'presets', data.id);

      await setDoc(docRef, {
        name: 'Opanijé',
        data: data.compressedData,
        ownerId: data.julianUid,
        groupId: 'samambaia',
        mestreId: data.julianUid,
        visibility: 'mestre_group',
        isDraft: false,
        isLocked: true,
        audioUrl: data.audioUrl,
        updatedAt: Date.now()
      }, { merge: true });

      return { success: true };
    }, payload);

    console.log(`  ✓ Écriture Firestore effectuée avec succès.`);

    // 3. Relecture de confirmation et contrôle strict
    console.log(`\n[3/3] Relecture de contrôle depuis Firestore...`);
    const verification = await page.evaluate(async (id) => {
      const db = window.firebaseDb;
      const doc = window.doc;
      const getDoc = window.getDoc;
      const snap = await getDoc(doc(db, 'presets', id));
      return snap.data();
    }, OPANIJE_ID);

    const decompressed = JSON.parse(LZString.decompressFromBase64(verification.data));

    console.log('\n============================================================');
    console.log('🎉 CONFIRMATION OFFICIELLE OPANIJÉ FIRESTORE :');
    console.log('============================================================\n');
    console.log(`Titre document: "${verification.name}"`);
    console.log(`Titre preset:   "${decompressed.name}"`);
    console.log(`ID Firestore:   ${OPANIJE_ID}`);
    console.log(`Groupe:         "${verification.groupId}"`);
    console.log(`OwnerId:        "${verification.ownerId}"`);
    console.log(`MestreId:       "${verification.mestreId}"`);
    console.log(`Visibilité:     "${verification.visibility}"`);
    console.log(`Verrouillé:     ${verification.isLocked}`);
    console.log(`Brouillon:      ${verification.isDraft}`);
    console.log(`BPM:            ${decompressed.bpm}`);
    console.log(`Total Mesures:  ${decompressed.totalMeasures}`);
    console.log(`Total Pistes:   ${decompressed.tracks.length}\n`);

    console.log('Détail des 11 pistes enregistrées :');
    const tableData = decompressed.tracks.map((t, idx) => ({
      '#': idx + 1,
      'Nom': t.name,
      'Custom Name': t.customName || t.name,
      'ID': t.id,
      'Inst Idx': t.instrumentIdx,
      'Type': t.isBusFolder ? 'Dossier Bus' : (t.instrumentRoleKey ? `Voix (${t.instrumentRoleKey})` : 'Instrument'),
      'Bus Parent': t.busId || '-',
      'Patterns': t.patterns?.length || 0,
      'Assignation Mesures': t.patterns?.[0]?.measureAssignments ? `${t.patterns[0].measureAssignments.filter(Boolean).length}/${t.patterns[0].measureAssignments.length}` : '-'
    }));

    console.table(tableData);

  } catch (err) {
    console.error('❌ Erreur :', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
