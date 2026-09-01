import { test, expect } from '@playwright/test';

test.describe('Création de Roda', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Login the test user created in global setup
    await page.evaluate(async () => {
      // @ts-ignore
      const auth = window.firebaseAuth;
      if (!auth) return;
      // @ts-ignore
      const signIn = window.signInWithEmailAndPassword;
      if (signIn) {
        await signIn(auth, 'playwright@ogirador.com', 'playwrighttest');
      }
    });

    // Wait a bit for auth state to propagate and modals to disappear
    await page.waitForTimeout(2000);

    // Enter the app by clicking the main landing page button
    await page.locator('#entra-btn').click();
    
    // Wait for the main app to load
    await page.waitForTimeout(1000);
  });

  test('Création d\'une Roda vide et ajout manuel d\'instruments', async ({ page }) => {
    // 2. Ouvrir le menu Projet et cliquer sur Effacer (Nouveau)
    await page.screenshot({ path: 'test-failure-manual.png' });
    await page.locator('button', { hasText: 'Menu' }).click();
    await page.locator('button', { hasText: /Créer une roda|Criar uma roda/i }).click();

    // 3. Modale d'introduction : Choisir "Créer Roda vide"
    await page.locator('button', { hasText: /Créer Roda vide|Criar Roda vazia/i }).click();

    // 4. Vérifier que la Roda est vide
    // Il ne doit y avoir aucun instrument dans la liste principale
    // Note: Le sélecteur dépend de comment les instruments sont rendus (ex: un bouton "Ajouter Instrument")
    const addInstrumentBtn = page.locator('button', { hasText: /➕ Ajouter|➕ Adicionar/i });
    await expect(addInstrumentBtn).toBeVisible();

    // 5. Ajouter un instrument
    await addInstrumentBtn.click();
    
    // Le menu déroulant des instruments apparaît, on sélectionne "Marcante" ou un autre
    await page.locator('text=/marcante/i').first().click();

    // Vérifier que l'instrument a été ajouté à la piste
    await expect(page.locator('text=/marcante/i').first()).toBeVisible();
  });

  test('Création d\'une Roda via l\'Assistant du Mestre', async ({ page }) => {
    // Ouvrir le menu Projet et cliquer sur Effacer (Nouveau)
    await page.screenshot({ path: 'test-failure-assistant.png' });
    await page.locator('button', { hasText: 'Menu' }).click();
    await page.locator('button', { hasText: /Créer une roda|Criar uma roda/i }).click();

    // Modale d'introduction : Choisir "Assistant du Mestre"
    await page.locator('button', { hasText: /Assistant du Mestre|Assistente do Mestre/i }).click();

    // Vérifier que l'assistant s'est bien ouvert
    await expect(page.locator('text=/Assistant de Création|Assistente de Criação/i')).toBeVisible();

    // Cliquer sur Suivant à l'étape 1
    const nextButton = page.locator('button', { hasText: /Suivant|Avançar/i });
    await expect(nextButton).toBeVisible();
    await nextButton.click();

    // Étape 2 : Config, on clique sur "Faire sonner la Roda"
    const finishButton = page.locator('button', { hasText: /Faire sonner la Roda|Fazer soar a Roda/i });
    await expect(finishButton).toBeVisible();
    await finishButton.click();

    // Vérifier que l'assistant s'est fermé et que la Roda a été générée
    await expect(page.locator('text=/Assistant de Création|Assistente de Criação/i')).toBeHidden();
  });

});
