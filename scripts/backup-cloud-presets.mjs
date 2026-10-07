/**
 * scripts/backup-cloud-presets.mjs
 * 
 * Export de sécurité local des presets Cloud Firestore :
 * - Cible le groupe Samambaia (groupId: "samambaia") et les presets publics
 * - Décompresse les charges LZString
 * - Enregistre une archive globale horodatée : backups/presets/presets_backup_YYYY-MM-DD_HHmm.json
 * - Enregistre un fichier individuel par morceau : backups/presets/<nom_du_morceau>.json
 */

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import LZString from 'lz-string';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5174';

function pad(n) {
  return String(n).padStart(2, '0');
}

function getFormattedDate(d = new Date()) {
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}_${HH}${mm}`;
}

function sanitizeFilename(name) {
  return (name || 'sans_nom')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .trim()
    .replace(/\s+/g, '_');
}

function countActiveSteps(tracks = []) {
  return tracks.reduce((total, track) => {
    return total + (track.patterns || []).reduce((acc, p) => {
      const active = (p.activeSteps || []).filter(s => s && s !== 0 && s !== '0' && s !== '').length;
      return acc + active;
    }, 0);
  }, 0);
}

async function runBackup() {
  console.log(`📡 Connexion à l'instance locale (${BASE_URL})...`);
  
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(BASE_URL, { timeout: 30000 });
    await page.waitForFunction(() => 'firebaseAuth' in window && 'firebaseDb' in window, { timeout: 30000 });

    console.log('🔑 Authentification Mestre...');
    const rawPresets = await page.evaluate(async () => {
      const auth = window.firebaseAuth;
      const db = window.firebaseDb;
      const signIn = window.signInWithEmailAndPassword;
      const collection = window.collection;
      const getDocs = window.getDocs;

      await signIn(auth, 'mestre@ogirador.com', 'playwrighttest');

      const snapshot = await getDocs(collection(db, 'presets'));
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      return list;
    });

    console.log(`📦 ${rawPresets.length} document(s) récupéré(s) de Firestore.`);

    // Filtrer Samambaia et les presets publics
    const filtered = rawPresets.filter(p => {
      const g = (p.groupId || '').toLowerCase();
      const isSamambaia = g === 'samambaia';
      const isPublic = p.visibility === 'public';
      const isMestre = p.ownerId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' || p.mestreId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
      return isSamambaia || isPublic || isMestre;
    });

    console.log(`🎯 ${filtered.length} preset(s) Samambaia / Publics sélectionnés pour la sauvegarde.`);

    // Décompression et structuration
    const processedPresets = [];
    for (const raw of filtered) {
      let decompressed = null;
      if (raw.data) {
        if (typeof raw.data === 'object') {
          decompressed = raw.data;
        } else if (typeof raw.data === 'string') {
          try {
            if (raw.data.startsWith('{')) {
              decompressed = JSON.parse(raw.data);
            } else {
              const decoded = LZString.decompressFromBase64(raw.data) || LZString.decompressFromUTF16(raw.data);
              if (decoded) {
                decompressed = JSON.parse(decoded);
              }
            }
          } catch (e) {
            console.warn(`⚠️ Impossible de parser les données du preset ${raw.id} (${raw.name}):`, e.message);
          }
        }
      }

      processedPresets.push({
        id: raw.id,
        name: raw.name || decompressed?.metadata?.toada || 'Sans Nom',
        groupId: raw.groupId || 'samambaia',
        ownerId: raw.ownerId || '',
        mestreId: raw.mestreId || '',
        visibility: raw.visibility || 'mestre_group',
        isDraft: Boolean(raw.isDraft),
        isLocked: Boolean(raw.isLocked),
        audioUrl: raw.audioUrl || null,
        createdAt: raw.createdAt || null,
        updatedAt: raw.updatedAt || null,
        presetData: decompressed
      });
    }

    // Répertoire de destination (à la fois dans le package et à la racine si applicable)
    const backupDirs = [
      path.resolve(process.cwd(), 'backups/presets'),
      path.resolve(process.cwd(), '../backups/presets')
    ];

    for (const bDir of backupDirs) {
      if (!fs.existsSync(bDir)) {
        fs.mkdirSync(bDir, { recursive: true });
      }
    }

    const timestamp = getFormattedDate();
    const globalBackupFilename = `presets_backup_${timestamp}.json`;

    // 1. Archive globale horodatée
    for (const bDir of backupDirs) {
      const targetGlobalPath = path.join(bDir, globalBackupFilename);
      fs.writeFileSync(targetGlobalPath, JSON.stringify(processedPresets, null, 2), 'utf8');
      console.log(`💾 Archive globale enregistrée : ${targetGlobalPath}`);
    }

    // 2. Fichiers individuels par morceau
    const summaryRows = [];
    for (const item of processedPresets) {
      const safeName = sanitizeFilename(item.name);
      const singleFileName = `${safeName}.json`;

      // Le fichier individuel contient le preset décompressé avec métadonnées complètes
      const individualContent = {
        _backupMeta: {
          firestoreId: item.id,
          name: item.name,
          groupId: item.groupId,
          ownerId: item.ownerId,
          mestreId: item.mestreId,
          visibility: item.visibility,
          isDraft: item.isDraft,
          isLocked: item.isLocked,
          audioUrl: item.audioUrl,
          exportedAt: new Date().toISOString()
        },
        ...(item.presetData || {})
      };

      for (const bDir of backupDirs) {
        const singleFilePath = path.join(bDir, singleFileName);
        fs.writeFileSync(singleFilePath, JSON.stringify(individualContent, null, 2), 'utf8');
      }

      const data = item.presetData;
      summaryRows.push({
        ID: item.id,
        Titre: item.name,
        Mesures: data?.totalMeasures || 'N/A',
        BPM: data?.bpm || 'N/A',
        Pistes: data?.tracks?.length || 0,
        'Pas Actifs': countActiveSteps(data?.tracks),
        Fichier: singleFileName
      });
    }

    console.log('\n📊 Synthèse des morceaux sauvegardés :');
    console.table(summaryRows);
    console.log(`\n✅ Sauvegarde terminée avec succès (${processedPresets.length} morceaux exportés).`);

  } finally {
    await browser.close();
  }
}

runBackup().catch(err => {
  console.error('❌ Erreur critique lors de la sauvegarde :', err);
  process.exit(1);
});
