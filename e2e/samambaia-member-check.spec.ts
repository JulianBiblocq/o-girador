import { test, expect } from '@playwright/test';
import { ensureStudioLoaded } from './helpers/navigation';

test.describe('Vérification Membre Samambaia & Droits canWriteSequenciador', () => {

  test('1. Lecture du catalogue Samambaia pour un membre simple (sans canWriteSequenciador)', async ({ page }) => {
    // Profil membre simple sans canWriteSequenciador
    await page.addInitScript(() => {
      localStorage.setItem(
        'girador_test_user_profile',
        JSON.stringify({
          uid: 'eleve-simple',
          email: 'eleve@samambaia.bzh',
          displayName: 'Membre Simple Samambaia',
          role: 'membre',
          groupId: 'Samambaia',
          groupName: 'Samambaia',
          mestreId: 'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
          canWriteSequenciador: false,
        })
      );
    });

    await page.goto('/');
    await ensureStudioLoaded(page);

    const result = await page.evaluate(async () => {
      const { fetchCloudPresets, getCloudPreset } = await import('../src/cloudLibrary.ts');
      const { checkIsAdmin } = await import('../src/contexts/AuthContext.tsx');

      const userProfile = {
        uid: 'eleve-simple',
        email: 'eleve@samambaia.bzh',
        role: 'membre',
        groupId: 'Samambaia',
        groupName: 'Samambaia',
        mestreId: 'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
        canWriteSequenciador: false,
      };

      const isAdmin = checkIsAdmin(userProfile as any);

      // Récupérer le catalogue cloud pour ce membre
      const presets = await fetchCloudPresets('eleve-simple', 'membre', 'iA0SweEHyOPzAPGIDVZdeKAV2mk1', 'Samambaia', false);

      // Tenter de lire en détail le premier preset disponible
      let firstPresetDetails = null;
      if (presets.length > 0) {
        firstPresetDetails = await getCloudPreset(presets[0].id);
      }

      return {
        uid: 'eleve-simple',
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
    // Profil membre simple sans canWriteSequenciador
    await page.addInitScript(() => {
      localStorage.setItem(
        'girador_test_user_profile',
        JSON.stringify({
          uid: 'eleve-simple',
          email: 'eleve@samambaia.bzh',
          displayName: 'Membre Simple Samambaia',
          role: 'membre',
          groupId: 'Samambaia',
          groupName: 'Samambaia',
          mestreId: 'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
          canWriteSequenciador: false,
        })
      );
    });

    await page.goto('/');
    await ensureStudioLoaded(page);

    const result = await page.evaluate(async () => {
      // @ts-ignore
      const auth = window.firebaseAuth;
      // @ts-ignore
      const signIn = window.signInWithEmailAndPassword;

      let uid = 'eleve-simple';
      if (auth && signIn) {
        try {
          const cred = await signIn(auth, 'eleve-group@ogirador.com', 'playwrighttest');
          if (cred?.user?.uid) {
            uid = cred.user.uid;
          }
        } catch (_) {}
      }

      if (typeof window !== 'undefined' && (window as any).__SET_TEST_USER_PROFILE__) {
        (window as any).__SET_TEST_USER_PROFILE__({
          uid,
          email: 'eleve@samambaia.bzh',
          role: 'membre',
          groupId: 'Samambaia',
          groupName: 'Samambaia',
          mestreId: 'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
          canWriteSequenciador: false,
        });
      }

      const { savePresetToCloud, fetchCloudPresets, deleteCloudPreset } = await import('../src/cloudLibrary.ts');

      const currentTracks = (window as any).__SEQUENCER_STORE__?.getState()?.tracks || [];
      const dummyPreset: any = {
        name: `Test Perso Membre ${Date.now()}`,
        bpm: 115,
        tracks: currentTracks.length > 0 ? currentTracks : [{ id: 1, name: 'Agbê', instrumentIdx: 0, patterns: [{ id: 1, steps: 16, activeSteps: Array(16).fill(0) }] }],
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

      // Nettoyer le preset créé si réussi et supprimer la clé persistée
      localStorage.removeItem('girador_last_loaded_preset_id');
      if (createdPresetId) {
        try {
          await deleteCloudPreset(createdPresetId);
        } catch(e) {}
      }

      // Test B: Tentative d'écraser un preset existant du Mestre (ex: chercher un preset dont ownerId !== uid)
      const presets = await fetchCloudPresets(uid, 'membre', 'iA0SweEHyOPzAPGIDVZdeKAV2mk1', 'Samambaia', false);
      const mestrePreset = presets.find(p => p.ownerId !== uid && p.ownerId !== 'storage' && p.id !== '29dIDjgc2vPuDnwjiy9V' && !p.name?.toLowerCase().includes('opanij'));

      let overwriteError: string | null = null;
      let overwriteSuccess = false;
      if (mestrePreset) {
        try {
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
    // Profil membre co-auteur avec canWriteSequenciador = true
    await page.addInitScript(() => {
      localStorage.setItem(
        'girador_test_user_profile',
        JSON.stringify({
          uid: 'eleve-auteur',
          email: 'auteur@samambaia.bzh',
          displayName: 'Membre Co-Auteur Samambaia',
          role: 'membre',
          groupId: 'Samambaia',
          groupName: 'Samambaia',
          mestreId: 'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
          canWriteSequenciador: true,
        })
      );
    });

    await page.goto('/');
    await ensureStudioLoaded(page);

    const result = await page.evaluate(async () => {
      // @ts-ignore
      const auth = window.firebaseAuth;
      // @ts-ignore
      const signIn = window.signInWithEmailAndPassword;

      let eleveUid = 'eleve-auteur';
      if (auth && signIn) {
        try {
          const eleveCred = await signIn(auth, 'eleve-group@ogirador.com', 'playwrighttest');
          if (eleveCred?.user?.uid) {
            eleveUid = eleveCred.user.uid;
          }
        } catch (_) {}
      }

      if (typeof window !== 'undefined' && (window as any).__SET_TEST_USER_PROFILE__) {
        (window as any).__SET_TEST_USER_PROFILE__({
          uid: eleveUid,
          email: 'auteur@samambaia.bzh',
          displayName: 'Membre Co-Auteur Samambaia',
          role: 'membre',
          groupId: 'Samambaia',
          groupName: 'Samambaia',
          mestreId: 'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
          canWriteSequenciador: true,
        });
      }

      const { fetchCloudPresets, savePresetToCloud, deleteCloudPreset, getCloudPreset } = await import('../src/cloudLibrary.ts');
      const { checkIsAdmin } = await import('../src/contexts/AuthContext.tsx');

      const userProfile = {
        uid: eleveUid,
        email: 'auteur@samambaia.bzh',
        role: 'membre',
        groupId: 'Samambaia',
        groupName: 'Samambaia',
        mestreId: 'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
        canWriteSequenciador: true,
      };

      const isAdmin = checkIsAdmin(userProfile as any);

      // Lire les presets du catalogue Samambaia
      const presets = await fetchCloudPresets(eleveUid, 'membre', 'iA0SweEHyOPzAPGIDVZdeKAV2mk1', 'Samambaia', true);

      // Créer un preset de groupe avec canWriteSequenciador
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

      let createdId: string | null = null;
      let verifiedPreset: any = null;
      let updatedPreset: any = null;

      try {
        createdId = await savePresetToCloud(
          newPresetName,
          newPresetData,
          eleveUid,
          'mestre_group',
          undefined,
          undefined,
          undefined,
          'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
          'Samambaia',
          true
        );

        // Relire immédiatement le preset créé
        verifiedPreset = await getCloudPreset(createdId);

        // Modifier / Mettre à jour le preset créé
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
          'Samambaia',
          true
        );

        updatedPreset = await getCloudPreset(createdId);
      } finally {
        // Nettoyer systématiquement le preset de test
        if (createdId) {
          try {
            await deleteCloudPreset(createdId);
          } catch (e) {
            console.warn(`[Cleanup error for ${createdId}]:`, e);
          }
        }
      }

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

  test('4. Détail presets et inspection co-auteur', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'girador_test_user_profile',
        JSON.stringify({
          uid: 'eleve-auteur',
          email: 'auteur@samambaia.bzh',
          displayName: 'Membre Co-Auteur Samambaia',
          role: 'membre',
          groupId: 'Samambaia',
          groupName: 'Samambaia',
          mestreId: 'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
          canWriteSequenciador: true,
        })
      );
    });

    await page.goto('/');
    await ensureStudioLoaded(page);

    const result = await page.evaluate(async () => {
      // @ts-ignore
      const auth = window.firebaseAuth;
      // @ts-ignore
      const signIn = window.signInWithEmailAndPassword;

      let eleveUid = 'eleve-auteur';
      if (auth && signIn) {
        try {
          const eleveCred = await signIn(auth, 'eleve-group@ogirador.com', 'playwrighttest');
          if (eleveCred?.user?.uid) {
            eleveUid = eleveCred.user.uid;
          }
        } catch (_) {}
      }

      if (typeof window !== 'undefined' && (window as any).__SET_TEST_USER_PROFILE__) {
        (window as any).__SET_TEST_USER_PROFILE__({
          uid: eleveUid,
          email: 'auteur@samambaia.bzh',
          role: 'membre',
          groupId: 'Samambaia',
          groupName: 'Samambaia',
          mestreId: 'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
          canWriteSequenciador: true,
        });
      }

      const { fetchCloudPresets } = await import('../src/cloudLibrary.ts');

      const presets = await fetchCloudPresets(eleveUid, 'membre', 'iA0SweEHyOPzAPGIDVZdeKAV2mk1', 'Samambaia', true);
      
      const inspectedPresets = presets.map(p => ({
        id: p.id,
        name: p.name,
        ownerId: p.ownerId,
        visibility: p.visibility,
        mestreId: p.mestreId,
        groupId: (p as any).groupId,
        isFromStorage: (p as any).isFromStorage
      }));

      const mestrePreset = presets.find(p => p.ownerId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1');

      return {
        mestrePresetRawFields: mestrePreset,
        inspectedPresets: inspectedPresets.slice(0, 5),
      };
    });

    console.log('[TEST 4 - Détail presets et inspection co-auteur] Résultat:', JSON.stringify(result, null, 2));
    expect(result.inspectedPresets.length).toBeGreaterThan(0);
  });

});
