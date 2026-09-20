import { test } from '@playwright/test';

test('Tester fetchCloudPresets pour tous les profils types', async ({ page }) => {
  await page.goto('http://localhost:5174/');
  await page.waitForTimeout(1000);

  const results = await page.evaluate(async () => {
    // Sign in as playwright to have auth
    // @ts-ignore
    const auth = window.firebaseAuth;
    // @ts-ignore
    const signIn = window.signInWithEmailAndPassword;
    await signIn(auth, 'playwright@ogirador.com', 'playwrighttest');

    const { fetchCloudPresets } = await import('/src/cloudLibrary.ts');

    const profilesToTest = [
      { name: '1. Visiteur non connecté (null)', uid: null, role: 'visiteur', mestreId: null, groupId: null, canWrite: false },
      { name: '2. Visiteur connecté (role visiteur, sans groupe)', uid: 'some_visiteur_uid', role: 'visiteur', mestreId: null, groupId: null, canWrite: false },
      { name: '3. Eleve sans groupId ni mestreId', uid: 'some_eleve_uid', role: 'eleve', mestreId: null, groupId: null, canWrite: false },
      { name: '4. Membre standard sans groupId', uid: 'some_membre_uid', role: 'membre', mestreId: null, groupId: null, canWrite: false },
      { name: '5. Eleve Samambaia explicite', uid: 'some_eleve_samambaia', role: 'eleve', mestreId: 'iA0SweEHyOPzAPGIDVZdeKAV2mk1', groupId: 'Samambaia', canWrite: false },
      { name: '6. Guest Pro (canWriteSequenciador=true, groupId=guest-pro)', uid: 'some_pro_uid', role: 'pro', mestreId: null, groupId: 'guest-pro', canWrite: true },
      { name: '7. Guest Pro sans groupId (canWriteSequenciador=true)', uid: 'some_pro_nogroup', role: 'pro', mestreId: null, groupId: null, canWrite: true },
      { name: '8. Julian Biblocq (uid=iA0SweEHyOPzAPGIDVZdeKAV2mk1, role=mestre)', uid: 'iA0SweEHyOPzAPGIDVZdeKAV2mk1', role: 'mestre', mestreId: null, groupId: 'samambaia', canWrite: true },
      { name: '9. Admin (role=admin)', uid: 'iA0SweEHyOPzAPGIDVZdeKAV2mk1', role: 'admin', mestreId: null, groupId: 'samambaia', canWrite: true },
    ];

    const out: any[] = [];
    for (const p of profilesToTest) {
      try {
        const list = await fetchCloudPresets(p.uid, p.role, p.mestreId, p.groupId, p.canWrite);
        out.push({
          profile: p.name,
          count: list.length,
          presets: list.map(x => x.name)
        });
      } catch (err: any) {
        out.push({
          profile: p.name,
          error: err.message
        });
      }
    }
    return out;
  });

  console.log('=== RÉSULTATS DES PROFILS TYPES ===');
  console.log(JSON.stringify(results, null, 2));
});
