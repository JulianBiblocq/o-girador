import { test, expect } from '@playwright/test';

test('Membre Samambaia connecté voit bien le catalogue privé Samambaia', async ({ page }) => {
  await page.goto('http://localhost:5174/');
  await page.waitForTimeout(1000);

  // Click ENTRA NA RODA
  const entraBtn = page.locator('#entra-btn');
  if (await entraBtn.isVisible()) {
    await entraBtn.click();
    await page.waitForTimeout(1000);
  }

  // Sign in as playwright@ogirador.com and update doc with groupId: 'samambaia'
  await page.evaluate(async () => {
    // @ts-ignore
    const auth = window.firebaseAuth;
    // @ts-ignore
    const signIn = window.signInWithEmailAndPassword;
    // @ts-ignore
    const db = window.firebaseDb;
    // @ts-ignore
    const doc = window.doc;
    // @ts-ignore
    const updateDoc = window.updateDoc;

    if (auth && signIn) {
      const cred = await signIn(auth, 'playwright@ogirador.com', 'playwrighttest');
      if (cred?.user && db && doc && updateDoc) {
        await updateDoc(doc(db, 'users', cred.user.uid), {
          groupId: 'samambaia',
          groupName: 'Maracatu Samambaia'
        });
      }
    }
  });

  // Wait for auth & query to settle
  await page.waitForTimeout(3000);

  // Open Menu
  const menuBtn = page.locator('button:has-text("Menu")').first();
  await menuBtn.click();
  await page.waitForTimeout(500);

  const select = page.locator('select').first();
  const optgroups = await select.locator('optgroup').all();
  console.log(`\n=== OPTGROUPS [Playwright Samambaia Member] ===`);
  const labels: string[] = [];
  for (const og of optgroups) {
    const label = await og.getAttribute('label');
    const options = await og.locator('option').allInnerTexts();
    labels.push(label || '');
    console.log(`Optgroup: "${label}" -> ${options.length} options:`, options);
  }

  expect(labels.some(l => l.includes('Maracatu Samambaia (Privado)') || l.includes('Samambaia (Privé)'))).toBeTruthy();
  expect(labels.some(l => l.includes('Cloud (Público)') || l.includes('Cloud (Public)'))).toBeTruthy();
  expect(labels.some(l => l.includes('Padrão') || l.includes('Standard'))).toBeTruthy();
});
