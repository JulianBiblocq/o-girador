import { test, expect } from '@playwright/test';

test.describe('Catalogue Cloud Samambaia', () => {
  test('Les presets de Samambaia sont accessibles via fetchCloudPresets avec groupId', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => 'firebaseAuth' in window);

    const presets = await page.evaluate(async () => {
      // @ts-ignore
      const auth = window.firebaseAuth;
      // @ts-ignore
      const signIn = window.signInWithEmailAndPassword;
      await signIn(auth, 'playwright@ogirador.com', 'playwrighttest');

      const { fetchCloudPresets } = await import('/src/cloudLibrary.ts');
      // Simulated member: role 'membre', mestreId null, groupId 'Samambaia'
      const list = await fetchCloudPresets('dummy_member_uid', 'membre', null, 'Samambaia');
      return list.map(p => ({ id: p.id, name: p.name, ownerId: p.ownerId, visibility: p.visibility }));
    });

    console.log('Presets fetched for Samambaia member:', presets.map(p => p.name));

    // Verify Samambaia presets are present
    const names = presets.map(p => p.name.toLowerCase());
    const hasConven = names.some(n => n.includes('conven'));
    const hasOpanije = names.some(n => n.includes('opanij'));
    const hasMacaiba = names.some(n => n.includes('macaiba'));

    expect(hasConven).toBe(true);
    expect(hasOpanije).toBe(true);
    expect(hasMacaiba).toBe(true);
  });

  test('fetchCloudPresets résout automatiquement le Mestre de Samambaia même avec un groupId minuscule "samambaia"', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => 'firebaseAuth' in window);

    const presets = await page.evaluate(async () => {
      // @ts-ignore
      const auth = window.firebaseAuth;
      // @ts-ignore
      const signIn = window.signInWithEmailAndPassword;
      await signIn(auth, 'playwright@ogirador.com', 'playwrighttest');

      const { fetchCloudPresets } = await import('/src/cloudLibrary.ts');
      // Lowercase groupId 'samambaia'
      const list = await fetchCloudPresets('some_user_samambaia_lower', 'membre', null, 'samambaia');
      return list.map(p => p.name);
    });

    console.log('Resolved presets for samambaia lowercase:', presets);
    expect(presets.length).toBeGreaterThan(0);
    expect(presets.some(n => n.toLowerCase().includes('conven'))).toBe(true);
    expect(presets.some(n => n.toLowerCase().includes('opanij'))).toBe(true);
  });
});
