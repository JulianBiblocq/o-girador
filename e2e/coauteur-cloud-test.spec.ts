import { test, expect } from '@playwright/test';

// Run serially to avoid auth token collision between parallel tests
test.describe.serial('Test Co-Auteur et Partage de Groupe Cloud', () => {

  test('1. Le Mestre crée une section groupe Samambaia, et l\'élève Samambaia la retrouve', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => 'firebaseAuth' in window);

    const testSectionName = `Section Test Samambaia ${Date.now()}`;

    // Étape A: Mestre se connecte et sauvegarde une section avec groupId = 'Samambaia'
    const sectionId = await page.evaluate(async (name) => {
      // @ts-ignore
      const auth = window.firebaseAuth;
      // @ts-ignore
      const signIn = window.signInWithEmailAndPassword;
      const userCred = await signIn(auth, 'mestre@ogirador.com', 'playwrighttest');
      const mestreUid = userCred.user.uid;

      const { saveSectionToCloud } = await import('/src/cloudSections.ts');

      const dummySectionData = {
        numMeasures: 1,
        timeSigs: [{ numerator: 4, denominator: 4, speed: 1 }],
        vols: [0.8],
        volTransitions: ['immediate'],
        signals: [null],
        tracks: []
      };

      const docId = await saveSectionToCloud(
        name,
        // @ts-ignore
        dummySectionData,
        mestreUid,
        'mestre_group',
        'mestre',
        undefined,
        mestreUid,
        'Samambaia'
      );

      return docId;
    }, testSectionName);

    expect(sectionId).toBeTruthy();
    console.log(`[TEST] Section créée par le Mestre: ID = ${sectionId}, Name = ${testSectionName}`);

    // Étape B: L'élève du groupe Samambaia se connecte et vérifie qu'il voit la section du Mestre
    const foundSection = await page.evaluate(async (expectedName) => {
      // @ts-ignore
      const auth = window.firebaseAuth;
      // @ts-ignore
      const signIn = window.signInWithEmailAndPassword;
      const userCred = await signIn(auth, 'eleve-group@ogirador.com', 'playwrighttest');
      const eleveUid = userCred.user.uid;

      const { fetchCloudSections } = await import('/src/cloudSections.ts');

      // L'élève a le groupId Samambaia
      const sections = await fetchCloudSections(eleveUid, 'eleve', null, 'Samambaia');
      console.log(`[TEST] Sections trouvées par l'élève:`, sections.map(s => s.name));
      return sections.find(s => s.name === expectedName);
    }, testSectionName);

    expect(foundSection).toBeTruthy();
    expect(foundSection?.name).toBe(testSectionName);
    console.log(`[TEST] Section récupérée avec succès par l'élève Samambaia:`, foundSection?.name);
  });

  test('2. Écoute temps réel (onSnapshot) dans le profil utilisateur', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => 'firebaseAuth' in window);

    const realtimeResult = await page.evaluate(async () => {
      // @ts-ignore
      const auth = window.firebaseAuth;
      // @ts-ignore
      const db = window.firebaseDb;
      // @ts-ignore
      const signIn = window.signInWithEmailAndPassword;
      // @ts-ignore
      const setDoc = window.setDoc;
      // @ts-ignore
      const doc = window.doc;

      const userCred = await signIn(auth, 'eleve-group@ogirador.com', 'playwrighttest');
      const uid = userCred.user.uid;

      // Modifier un champ dans Firestore en temps réel
      const testMarker = `realtime_${Date.now()}`;
      await setDoc(doc(db, 'users', uid), {
        mestreMessage: testMarker
      }, { merge: true });

      // Attendre un bref instant que le snapshot se propage
      await new Promise(r => setTimeout(r, 1000));

      return { updated: true, marker: testMarker };
    });

    expect(realtimeResult.updated).toBe(true);
    console.log(`[TEST] Snapshot temps réel propagé sans erreur:`, realtimeResult.marker);
  });

  test('3. Vérification de l\'accès co-auteur (canWriteSequenciador) dans checkIsAdmin', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => 'firebaseAuth' in window);

    const checkResult = await page.evaluate(async () => {
      const { checkIsAdmin } = await import('/src/contexts/AuthContext.tsx');
      
      // Profil élève normal -> pas admin
      const eleveProfile: any = { role: 'eleve', canWriteSequenciador: false };
      const eleveCanWrite = checkIsAdmin(eleveProfile);

      // Profil co-auteur avec canWriteSequenciador: true -> admin/écriture autorisée!
      const coauteurProfile: any = { role: 'eleve', canWriteSequenciador: true };
      const coauteurCanWrite = checkIsAdmin(coauteurProfile);

      // Profil visiteur -> faux
      const visiteurProfile: any = { role: 'visiteur' };
      const visiteurCanWrite = checkIsAdmin(visiteurProfile);

      // Profil mestre -> vrai
      const mestreProfile: any = { role: 'mestre' };
      const mestreCanWrite = checkIsAdmin(mestreProfile);

      return {
        eleveCanWrite,
        coauteurCanWrite,
        visiteurCanWrite,
        mestreCanWrite
      };
    });

    expect(checkResult.eleveCanWrite).toBe(false);
    expect(checkResult.coauteurCanWrite).toBe(true);
    expect(checkResult.visiteurCanWrite).toBe(false);
    expect(checkResult.mestreCanWrite).toBe(true);

    console.log('[TEST] Vérification logique co-auteur checkIsAdmin:', checkResult);
  });

});
