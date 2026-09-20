import { test, expect } from '@playwright/test';

test('Diagnostiquer le contenu du menu Projet et le catalogue dans le séquenceur', async ({ page }) => {
  await page.goto('http://localhost:5174/');
  await page.waitForTimeout(1000);

  // Click ENTRA NA RODA
  const entraBtn = page.locator('#entra-btn');
  await entraBtn.waitFor({ state: 'visible', timeout: 10000 });
  await entraBtn.click();
  await page.waitForTimeout(1500);

  // Function to inspect the select
  const inspectSelect = async (contextLabel: string) => {
    // Open Menu
    const menuBtn = page.locator('button:has-text("Menu")').first();
    await menuBtn.click();
    await page.waitForTimeout(500);

    const select = page.locator('select').first();
    const optgroups = await select.locator('optgroup').all();
    console.log(`\n=== OPTGROUPS [${contextLabel}] ===`);
    for (const og of optgroups) {
      const label = await og.getAttribute('label');
      const options = await og.locator('option').allInnerTexts();
      console.log(`Optgroup: "${label}" -> ${options.length} options:`, options);
    }

    // Close menu
    await menuBtn.click();
    await page.waitForTimeout(300);
  };

  // 1. As currently loaded
  await inspectSelect('Initial User');

  // 2. Sign in as playwright@ogirador.com
  await page.evaluate(async () => {
    // @ts-ignore
    const auth = window.firebaseAuth;
    // @ts-ignore
    const signIn = window.signInWithEmailAndPassword;
    if (auth && signIn) {
      await signIn(auth, 'playwright@ogirador.com', 'playwrighttest');
    }
  });
  await page.waitForTimeout(2000);
  await inspectSelect('Playwright User (Samambaia member)');

  // 3. Inspect raw fetchCloudPresets
  const presetsFromDirectCall = await page.evaluate(async () => {
    const { fetchCloudPresets } = await import('/src/cloudLibrary.ts');
    // @ts-ignore
    const auth = window.firebaseAuth;
    const user = auth?.currentUser;
    if (!user) return { error: 'No user' };

    // Fetch user doc
    // @ts-ignore
    const db = window.firebaseDb;
    // @ts-ignore
    const doc = window.doc;
    // @ts-ignore
    const getDoc = window.getDoc;
    const userSnap = await getDoc(doc(db, 'users', user.uid));
    const userData = userSnap.exists() ? userSnap.data() : null;

    const list = await fetchCloudPresets(user.uid, userData?.role || 'visiteur', userData?.mestreId || null, userData?.groupId || null, userData?.canWriteSequenciador);
    return {
      user: { uid: user.uid, email: user.email, userData },
      presets: list.map(p => ({ id: p.id, name: p.name, groupId: (p as any).groupId, mestreId: p.mestreId, ownerId: p.ownerId, visibility: p.visibility }))
    };
  });
  console.log('\n=== DIRECT CALL RESULT ===', JSON.stringify(presetsFromDirectCall, null, 2));
});
