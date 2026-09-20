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

  // 1. Verify Accordion headers
  const groupAccordionBtn = page.locator('button:has-text("Catálogo Maracatu Samambaia")').first();
  await expect(groupAccordionBtn).toBeVisible();
  const groupText = await groupAccordionBtn.innerText();
  console.log('Group Accordion Header:', groupText);
  expect(groupText).toContain('🥁');
  expect(groupText).not.toContain('Privado');
  expect(groupText).not.toContain('🔒');

  const publicAccordionBtn = page.locator('button:has-text("Catálogo Público")').first();
  await expect(publicAccordionBtn).toBeVisible();
  const publicText = await publicAccordionBtn.innerText();
  console.log('Public Accordion Header:', publicText);
  expect(publicText).toContain('☁️');

  // Verify that old static catalog is NOT visible
  const standardText = await page.locator('text=Catálogo O Girador (Padrão)').count();
  expect(standardText).toBe(0);

  // 2. Verify Group accordion is OPEN by default and shows 🥁 items
  const opanijeBtn = page.locator('button:has-text("Opanijé")').first();
  await expect(opanijeBtn).toBeVisible();
  const drumCount = await page.locator('button:has-text("🥁")').count();
  console.log(`Visible drum items count: ${drumCount}`);
  expect(drumCount).toBeGreaterThanOrEqual(8);

  // 3. Click on a group preset and verify URL sync
  await opanijeBtn.click();
  await page.waitForTimeout(1500);
  const currentUrl = page.url();
  console.log('URL after clicking preset:', currentUrl);
  expect(currentUrl).toContain('loadPreset=');
});

