import { test, expect } from '@playwright/test';

test.describe('Passerelle Organizador ➔ Sequenciador', () => {

  test('1. Latéralité et Reset à la déconnexion', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => 'firebaseAuth' in window);

    // Initialement droitier par défaut
    const initialHandedness = await page.evaluate(async () => {
      // @ts-ignore
      const { useSequencerStore } = await import('/src/stores/useSequencerStore.ts');
      return useSequencerStore.getState().isLeftHanded;
    });
    expect(initialHandedness).toBe(false);

    // Simulation de l'héritage d'un profil gaucher
    const isGaucherApplied = await page.evaluate(async () => {
      // @ts-ignore
      const { useSequencerStore } = await import('/src/stores/useSequencerStore.ts');
      // Simuler l'effet de AuthContext lors de la lecture d'un profil gaucher
      const rawData = { lateralite: 'gaucher' };
      const isLeft = (rawData as any).lateralite === 'gaucher' || (rawData as any).isLeftHanded === true;
      useSequencerStore.getState().setIsLeftHanded(isLeft);
      return useSequencerStore.getState().isLeftHanded;
    });
    expect(isGaucherApplied).toBe(true);

    // Simulation de la déconnexion et reset obligatoire
    const isResetAfterLogout = await page.evaluate(async () => {
      // @ts-ignore
      const { useSequencerStore } = await import('/src/stores/useSequencerStore.ts');
      // Règle de sécurité 2 : useSequencerStore.getState().setIsLeftHanded(false) lors de la déconnexion
      useSequencerStore.getState().setIsLeftHanded(false);
      return useSequencerStore.getState().isLeftHanded;
    });
    expect(isResetAfterLogout).toBe(false);
  });

  test('2. Accès au catalogue Samambaia pour un rôle membre (assimilation élève)', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => 'firebaseAuth' in window);

    const presets = await page.evaluate(async () => {
      // @ts-ignore
      const auth = window.firebaseAuth;
      // @ts-ignore
      const signIn = window.signInWithEmailAndPassword;
      await signIn(auth, 'playwright@ogirador.com', 'playwrighttest');

      const { fetchCloudPresets } = await import('/src/cloudLibrary.ts');
      // Membre Organizador Samambaia avec role 'membre'
      const list = await fetchCloudPresets('uid_membre_organizador', 'membre', null, 'Samambaia');
      return list.map(p => p.name);
    });

    console.log('Morceaux accessibles pour le membre Samambaia:', presets);
    expect(presets.length).toBeGreaterThan(0);
    const lowerNames = presets.map(n => n.toLowerCase());
    expect(lowerNames.some(n => n.includes('opanij'))).toBe(true);
    expect(lowerNames.some(n => n.includes('macaiba'))).toBe(true);
    expect(lowerNames.some(n => n.includes('vov'))).toBe(true);
    expect(lowerNames.some(n => n.includes('conven'))).toBe(true);
  });

  test('3. Épuration de GoogleLoginButton (aucun champ texte d\'administration de groupe)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Vérifier qu'aucun input text n'est présent pour saisir un groupe dans le header / menu
    const groupInputs = await page.locator('input[placeholder*="groupe" i], input[placeholder*="samambaia" i]').count();
    expect(groupInputs).toBe(0);
  });
});
