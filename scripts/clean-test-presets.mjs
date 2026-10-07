/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Script de nettoyage sécurisé des presets de test Firestore et Firebase Storage.
 * Utilise Playwright headless Chromium pour bénéficier de l'environnement de navigation authentifié.
 */

import { chromium } from '@playwright/test';

const DEV_SERVER_URL = process.env.BASE_URL || 'http://localhost:5174';
const IS_DRY_RUN = process.argv.includes('--dry-run');

// 🛡️ SANCTUARISATION : Morceaux officiels du répertoire à ne JAMAIS supprimer
const OFFICIAL_REPERTOIRE_WHITELIST = [
  'opanije',
  'tem macaiba',
  'breque de caixa',
  'vou vadiar carnaval',
  'convencao 2',
  'convention 2',
  '_convencao_2',
  'vovo falou'
];

// UID de Julian (Administrateur) - Sanctuarisé
const JULIAN_UID = 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';

// Règle de ciblage stricte : SEULS les documents dont le nom contient explicitement un marqueur de test
const TEST_NAME_REGEX = /(\btest\b|preset test|\bmock\b|\be2e\b)/i;

function isWhitelisted(name) {
  if (!name) return false;
  const normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  return OFFICIAL_REPERTOIRE_WHITELIST.some(item => normalized.includes(item));
}

async function cleanTestPresets() {
  console.log(`\n============================================================`);
  console.log(`🧹 NETTOYAGE SÉCURISÉ DES PRESETS DE TEST FIRESTORE`);
  console.log(`   Mode: ${IS_DRY_RUN ? '🔍 DRY-RUN (Passe à blanc, aucune suppression)' : '⚡ EXÉCUTION RÉELLE (Purge)'}`);
  console.log(`   Cible: ${DEV_SERVER_URL}`);
  console.log(`============================================================\n`);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log(`[1/4] Connexion au serveur local ${DEV_SERVER_URL}...`);
    await page.goto(DEV_SERVER_URL);
    await page.waitForFunction(() => 'firebaseAuth' in window, { timeout: 30000 });

    console.log(`[2/4] Authentification et analyse du catalogue Firestore...`);
    const analysis = await page.evaluate(async (params) => {
      // @ts-ignore
      const auth = window.firebaseAuth;
      // @ts-ignore
      const signIn = window.signInWithEmailAndPassword;

      // Authentification avec le compte habilité de gestion
      await signIn(auth, 'mestre@ogirador.com', 'playwrighttest');

      const { fetchCloudPresets } = await import('../src/cloudLibrary.ts');
      // Récupérer la liste complète des presets
      const allPresets = await fetchCloudPresets(null, 'admin', null);

      return allPresets.map(p => {
        let createdStr = 'inconnu';
        try {
          if (typeof p.createdAt === 'number' && !isNaN(p.createdAt)) {
            createdStr = new Date(p.createdAt).toISOString();
          } else if (p.createdAt && typeof p.createdAt.toDate === 'function') {
            createdStr = p.createdAt.toDate().toISOString();
          }
        } catch (_) {}
        return {
          id: p.id,
          name: p.name || p.metadata?.toada || 'Sans nom',
          ownerId: p.ownerId || p.userId || 'inconnu',
          audioUrl: p.audioUrl || null,
          createdAt: createdStr
        };
      });
    }, {});

    const totalPresets = analysis.length;
    console.log(`Total des presets présents dans la collection 'presets' : ${totalPresets}\n`);

    const targeted = [];
    const preserved = [];

    for (const preset of analysis) {
      const isJulian = preset.ownerId === JULIAN_UID;
      const isRepertoire = isWhitelisted(preset.name);
      const matchesTestName = TEST_NAME_REGEX.test(preset.name);

      // Condition stricte : DOIT contenir un marqueur de test explicite ET NE DOIT PAS être sanctuarisé
      if (matchesTestName && !isJulian && !isRepertoire) {
        targeted.push(preset);
      } else {
        preserved.push(preset);
      }
    }

    console.log(`------------------------------------------------------------`);
    console.log(`🛡️ PRESETS SANCTUARISÉS ET CONSERVÉS (${preserved.length}) :`);
    console.log(`------------------------------------------------------------`);
    preserved.forEach(p => {
      console.log(`  ✓ [GARDÉ] "${p.name}" (ID: ${p.id}, Auteur: ${p.ownerId})`);
    });

    console.log(`\n------------------------------------------------------------`);
    console.log(`🎯 PRESETS DE TEST CIBLÉS POUR PURGE (${targeted.length}) :`);
    console.log(`------------------------------------------------------------`);
    targeted.forEach(p => {
      console.log(`  ✗ [À SUPPRIMER] "${p.name}" (ID: ${p.id}, Auteur: ${p.ownerId})`);
    });

    if (targeted.length === 0) {
      console.log(`\n✨ Aucun preset de test résiduel détecté. Le catalogue est déjà parfaitement propre.`);
      await browser.close();
      return;
    }

    if (IS_DRY_RUN) {
      console.log(`\n🔍 FIN DU DRY-RUN : ${targeted.length} documents identifiés pour suppression. Rien n'a été effacé.`);
      await browser.close();
      return;
    }

    // [3/4] Exécution de la suppression
    console.log(`\n[3/4] Exécution de la suppression sur Firestore et Firebase Storage...`);
    const deleteResults = await page.evaluate(async (targetedPresets) => {
      const { deleteCloudPreset } = await import('../src/cloudLibrary.ts');

      const deleted = [];
      const errors = [];

      for (const p of targetedPresets) {
        try {
          await deleteCloudPreset(p.id, p.audioUrl);
          deleted.push(p);
        } catch (err) {
          errors.push({ id: p.id, name: p.name, error: err?.message || String(err) });
        }
      }

      return { deleted, errors };
    }, targeted);

    console.log(`\n[4/4] Bilan de la purge :`);
    console.log(`  - Presets supprimés avec succès : ${deleteResults.deleted.length}`);
    if (deleteResults.errors.length > 0) {
      console.warn(`  - Erreurs rencontrées : ${deleteResults.errors.length}`);
      deleteResults.errors.forEach(e => console.warn(`    ⚠️ ${e.name} (${e.id}): ${e.error}`));
    }

    console.log(`\n============================================================`);
    console.log(`🎉 PURGE TERMINÉE : ${deleteResults.deleted.length} presets de test assainis.`);
    console.log(`   Presets légitimes restants dans le catalogue : ${preserved.length}`);
    console.log(`============================================================\n`);

  } catch (err) {
    console.error(`❌ Erreur durant le script de purge :`, err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

cleanTestPresets();
