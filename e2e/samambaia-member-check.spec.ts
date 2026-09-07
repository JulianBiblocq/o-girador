import { test, expect } from '@playwright/test';

test.describe('Vérification Membre Samambaia & Droits canWriteSequenciador', () => {

  test('1. Lecture du catalogue Samambaia pour un membre simple (sans canWriteSequenciador)', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => 'firebaseAuth' in window);

    const result = await page.evaluate(async () => {
      // @ts-ignore
      const auth = window.firebaseAuth;
      // @ts-ignore
      const db = window.firebaseDb;
      // @ts-ignore
      const signIn = window.signInWithEmailAndPassword;
      // @ts-ignore
      const doc = window.doc;
      // @ts-ignore
      const setDoc = window.setDoc;

      // Connecter en tant que membre simple de test
      const cred = await signIn(auth, 'eleve-group@ogirador.com', 'playwrighttest');
      const uid = cred.user.uid;

      // Configurer le profil utilisateur dans Firestore : membre Samambaia SANS canWriteSequenciador
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: 'eleve-group@ogirador.com',
        displayName: 'Membre Simple Samambaia',
        role: 'eleve',
        groupId: 'Samambaia',
        mestreId: 'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
        canWriteSequenciador: false,
        updatedAt: Date.now()
      }, { merge: true });

      // Importer les fonctions cloud
      const { fetchCloudPresets, getCloudPreset } = await import('/src/cloudLibrary.ts');
      const { checkIsAdmin } = await import('/src/contexts/AuthContext.tsx');

      const userProfile = {
        uid,
        role: 'eleve',
        groupId: 'Samambaia',
        mestreId: 'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
        canWriteSequenciador: false
      };

      const isAdmin = checkIsAdmin(userProfile as any);

      // Récupérer le catalogue cloud pour ce membre
      const presets = await fetchCloudPresets(uid, 'eleve', 'iA0SweEHyOPzAPGIDVZdeKAV2mk1', 'Samambaia');

      // Tenter de lire en détail le premier preset disponible
      let firstPresetDetails = null;
      if (presets.length > 0) {
        firstPresetDetails = await getCloudPreset(presets[0].id);
      }

      return {
        uid,
        isAdmin,
        presetsCount: presets.length,
        presetNames: presets.map(p => p.name),
        samplePresetLoaded: firstPresetDetails ? {
          name: firstPresetDetails.metadata?.toada || firstPresetDetails.name,
          tracksCount: firstPresetDetails.tracks?.length || 0,
          bpm: firstPresetDetails.bpm
        } : null
      };
    });

    console.log('[TEST 1 - Membre simple] Résultat:', JSON.stringify(result, null, 2));

    expect(result.isAdmin).toBe(false);
    expect(result.presetsCount).toBeGreaterThan(0);
    expect(result.presetNames.some((n: string) => n.toLowerCase().includes('opanij') || n.toLowerCase().includes('conven'))).toBe(true);
    expect(result.samplePresetLoaded).not.toBeNull();
  });

  test('2. Tentative d\'enregistrement pour un membre simple (création propre preset vs écrasement preset Mestre)', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => 'firebaseAuth' in window);

    const result = await page.evaluate(async () => {
      // @ts-ignore
      const auth = window.firebaseAuth;
      // @ts-ignore
      const db = window.firebaseDb;
      // @ts-ignore
      const signIn = window.signInWithEmailAndPassword;
      // @ts-ignore
      const doc = window.doc;
      // @ts-ignore
      const setDoc = window.setDoc;

      const cred = await signIn(auth, 'eleve-group@ogirador.com', 'playwrighttest');
      const uid = cred.user.uid;

      await setDoc(doc(db, 'users', uid), {
        canWriteSequenciador: false,
        groupId: 'Samambaia',
        mestreId: 'iA0SweEHyOPzAPGIDVZdeKAV2mk1'
      }, { merge: true });

      const { savePresetToCloud, fetchCloudPresets, deleteCloudPreset } = await import('/src/cloudLibrary.ts');

      const dummyPreset: any = {
        name: `Test Perso Membre ${Date.now()}`,
        bpm: 115,
        tracks: [],
        metadata: { toada: `Test Perso Membre ${Date.now()}` }
      };

      // Test A: Création d'un preset personnel
      let createdPresetId: string | null = null;
      let createError: string | null = null;
      try {
        createdPresetId = await savePresetToCloud(
          dummyPreset.name,
          dummyPreset,
          uid,
          'mestre_group',
          undefined,
          undefined,
          undefined,
          'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
          'Samambaia'
        );
      } catch (err: any) {
        createError = err?.message || String(err);
      }

      // Nettoyer le preset créé si réussi
      if (createdPresetId) {
        try {
          await deleteCloudPreset(createdPresetId);
        } catch(e) {}
      }

      // Test B: Tentative d'écraser un preset existant du Mestre (ex: chercher un preset dont ownerId !== uid)
      const presets = await fetchCloudPresets(uid, 'eleve', 'iA0SweEHyOPzAPGIDVZdeKAV2mk1', 'Samambaia');
      const mestrePreset = presets.find(p => p.ownerId !== uid && p.ownerId !== 'storage');

      let overwriteError: string | null = null;
      let overwriteSuccess = false;
      if (mestrePreset) {
        try {
          // Tentative d'écrasement avec targetPresetId = mestrePreset.id
          await savePresetToCloud(
            mestrePreset.name,
            dummyPreset,
            uid,
            'mestre_group',
            undefined,
            undefined,
            mestrePreset.id,
            'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
            'Samambaia'
          );
          overwriteSuccess = true;
        } catch (err: any) {
          overwriteError = err?.message || String(err);
        }
      }

      return {
        createSuccess: !!createdPresetId,
        createError,
        mestrePresetTargeted: mestrePreset ? { id: mestrePreset.id, name: mestrePreset.name, ownerId: mestrePreset.ownerId } : null,
        overwriteSuccess,
        overwriteError
      };
    });

    console.log('[TEST 2 - Droits membre simple] Résultat:', JSON.stringify(result, null, 2));
    expect(result.createSuccess).toBe(true);
  });

  test('3. Membre Samambaia AVEC canWriteSequenciador = true (Écriture, Enregistrement, Modification)', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => 'firebaseAuth' in window);

    const result = await page.evaluate(async () => {
      // @ts-ignore
      const auth = window.firebaseAuth;
      // @ts-ignore
      const db = window.firebaseDb;
      // @ts-ignore
      const signIn = window.signInWithEmailAndPassword;
      // @ts-ignore
      const doc = window.doc;
      // @ts-ignore
      const setDoc = window.setDoc;

      // 1. Le Mestre se connecte pour attribuer le rôle co-auteur (canWriteSequenciador) à l'élève
      const mestreCred = await signIn(auth, 'mestre@ogirador.com', 'playwrighttest');
      
      // On récupère l'UID de l'élève en se connectant temporairement ou via query
      const eleveCred = await signIn(auth, 'eleve-group@ogirador.com', 'playwrighttest');
      const eleveUid = eleveCred.user.uid;

      // Reconnexion en Mestre pour modifier le profil de l'élève
      await signIn(auth, 'mestre@ogirador.com', 'playwrighttest');
      await setDoc(doc(db, 'users', eleveUid), {
        uid: eleveUid,
        email: 'eleve-group@ogirador.com',
        displayName: 'Membre Co-Auteur Samambaia',
        role: 'eleve',
        groupId: 'Samambaia',
        mestreId: 'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
        canWriteSequenciador: true,
        updatedAt: Date.now()
      }, { merge: true });

      // 2. L'élève se reconnecte maintenant avec ses droits de co-auteur actifs
      await signIn(auth, 'eleve-group@ogirador.com', 'playwrighttest');

      const { fetchCloudPresets, savePresetToCloud, deleteCloudPreset, getCloudPreset } = await import('/src/cloudLibrary.ts');
      const { checkIsAdmin } = await import('/src/contexts/AuthContext.tsx');

      const userProfile = {
        uid: eleveUid,
        role: 'eleve',
        groupId: 'Samambaia',
        mestreId: 'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
        canWriteSequenciador: true
      };

      const isAdmin = checkIsAdmin(userProfile as any);

      // 3. Lire les presets du catalogue Samambaia
      const presets = await fetchCloudPresets(eleveUid, 'eleve', 'iA0SweEHyOPzAPGIDVZdeKAV2mk1', 'Samambaia');

      // 4. Créer un preset de groupe avec canWriteSequenciador
      const newPresetName = `Morceau Co-Auteur Samambaia ${Date.now()}`;
      const newPresetData: any = {
        name: newPresetName,
        bpm: 128,
        tracks: [
          {
            instrumentIdx: 0,
            isMute: false,
            isSolo: false,
            patterns: []
          }
        ],
        metadata: {
          toada: newPresetName,
          notes: 'Créé avec canWriteSequenciador par membre Samambaia'
        }
      };

      const createdId = await savePresetToCloud(
        newPresetName,
        newPresetData,
        eleveUid,
        'mestre_group',
        undefined,
        undefined,
        undefined,
        'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
        'Samambaia'
      );

      // 5. Relire immédiatement le preset créé
      const verifiedPreset = await getCloudPreset(createdId);

      // 6. Modifier / Mettre à jour le preset créé
      newPresetData.bpm = 135;
      newPresetData.metadata.notes = 'Mis à jour avec succès par co-auteur';
      await savePresetToCloud(
        newPresetName,
        newPresetData,
        eleveUid,
        'mestre_group',
        undefined,
        undefined,
        createdId,
        'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
        'Samambaia'
      );

      const updatedPreset = await getCloudPreset(createdId);

      // 7. Nettoyer le preset de test
      await deleteCloudPreset(createdId);

      return {
        isAdmin,
        catalogCount: presets.length,
        createdId,
        verifiedName: verifiedPreset?.name || verifiedPreset?.metadata?.toada,
        updatedBpm: updatedPreset?.bpm,
        updatedNotes: updatedPreset?.metadata?.notes
      };
    });

    console.log('[TEST 3 - Membre avec canWriteSequenciador] Résultat:', JSON.stringify(result, null, 2));

    expect(result.isAdmin).toBe(true);
    expect(result.catalogCount).toBeGreaterThan(0);
    expect(result.createdId).toBeTruthy();
    expect(result.updatedBpm).toBe(135);
    expect(result.updatedNotes).toBe('Mis à jour avec succès par co-auteur');
  });

  test('Test4', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => 'firebaseAuth' in window);

    const result = await page.evaluate(async () => {
      // @ts-ignore
      const auth = window.firebaseAuth;
      // @ts-ignore
      const db = window.firebaseDb;
      // @ts-ignore
      const signIn = window.signInWithEmailAndPassword;
      // @ts-ignore
      const getDoc = window.getDoc;
      // @ts-ignore
      const doc = window.doc;
      // @ts-ignore
      const setDoc = window.setDoc;

      // 1. Connexion Mestre pour garantir les droits co-auteur
      const mestreCred = await signIn(auth, 'mestre@ogirador.com', 'playwrighttest');
      const mestreUid = mestreCred.user.uid;
      const mestreDoc = await getDoc(doc(db, 'users', mestreUid));

      const eleveCred = await signIn(auth, 'eleve-group@ogirador.com', 'playwrighttest');
      const eleveUid = eleveCred.user.uid;

      // Reconnexion Mestre
      await signIn(auth, 'mestre@ogirador.com', 'playwrighttest');
      let initialSetDocError = null;
      try {
        await setDoc(doc(db, 'users', eleveUid), {
          uid: eleveUid,
          email: 'eleve-group@ogirador.com',
          role: 'eleve',
          groupId: 'Samambaia',
          mestreId: 'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
          canWriteSequenciador: true,
          updatedAt: Date.now()
        }, { merge: true });
      } catch (err: any) {
        initialSetDocError = err?.message || String(err);
      }

      const eleveDocAfter = await getDoc(doc(db, 'users', eleveUid));

      // 2. Reconnexion en tant qu'élève co-auteur
      await signIn(auth, 'eleve-group@ogirador.com', 'playwrighttest');

      const { fetchCloudPresets, savePresetToCloud, getCloudPreset } = await import('/src/cloudLibrary.ts');

      const presets = await fetchCloudPresets(eleveUid, 'eleve', 'iA0SweEHyOPzAPGIDVZdeKAV2mk1', 'Samambaia');
      
      const inspectedPresets = presets.map(p => ({
        id: p.id,
        name: p.name,
        ownerId: p.ownerId,
        visibility: p.visibility,
        mestreId: p.mestreId,
        groupId: (p as any).groupId,
        isFromStorage: (p as any).isFromStorage
      }));

      // Trouver un preset appartenant au Mestre
      const mestrePreset = presets.find(p => p.ownerId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1');
      let testUpdateOnMestrePreset = null;

      if (mestrePreset) {
        // Lire les données complètes actuelles pour ne rien perdre
        const originalData = await getCloudPreset(mestrePreset.id);
        if (originalData) {
          try {
            // Tenter une mise à jour mineure (ex: updatedAt ou notes) puis restaurer
            const updatedData = JSON.parse(JSON.stringify(originalData));
            const prevNotes = updatedData.metadata?.notes || '';
            updatedData.metadata = {
              ...updatedData.metadata,
              notes: `${prevNotes} [Test Co-Auteur Check]`
            };

            await savePresetToCloud(
              mestrePreset.name,
              updatedData,
              mestrePreset.ownerId, // garder l'owner original
              mestrePreset.visibility as any,
              undefined,
              undefined,
              mestrePreset.id,
              mestrePreset.mestreId,
              (mestrePreset as any).groupId || 'Samambaia'
            );

            // Relecture
            const reloaded = await getCloudPreset(mestrePreset.id);
            const successUpdate = reloaded?.metadata?.notes?.includes('[Test Co-Auteur Check]');

            // Restaurer immédiatement
            await savePresetToCloud(
              mestrePreset.name,
              originalData,
              mestrePreset.ownerId,
              mestrePreset.visibility as any,
              undefined,
              undefined,
              mestrePreset.id,
              mestrePreset.mestreId,
              (mestrePreset as any).groupId || 'Samambaia'
            );

            testUpdateOnMestrePreset = {
              presetId: mestrePreset.id,
              presetName: mestrePreset.name,
              canUpdate: successUpdate,
              error: null
            };
          } catch (err: any) {
            testUpdateOnMestrePreset = {
              presetId: mestrePreset.id,
              presetName: mestrePreset.name,
              canUpdate: false,
              error: err?.message || String(err)
            };
          }
        }
      }
      return {
        initialSetDocError,
        mestreDocData: mestreDoc.exists() ? mestreDoc.data() : null,
        eleveDocAfterData: eleveDocAfter.exists() ? eleveDocAfter.data() : null,
        mestrePresetRawFields: mestrePreset,
        inspectedPresets: inspectedPresets.slice(0, 5),
        testUpdateOnMestrePreset
      };
    });

    console.log('[TEST 4 - Détail presets et écriture co-auteur] Résultat:', JSON.stringify(result, null, 2));
    expect(result.inspectedPresets.length).toBeGreaterThan(0);
  });

});
