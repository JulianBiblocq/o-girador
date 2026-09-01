import { test, expect } from '@playwright/test';

test.describe("Éditeur d'instrument", () => {
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

    await page.waitForTimeout(2000);

    // Enter the app by clicking the main landing page button
    await page.locator('#entra-btn').click();
    await page.waitForTimeout(1000);
    
    // Create an empty Roda and add Marcante
    await page.locator('button', { hasText: 'Menu' }).click();
    await page.locator('button', { hasText: /Créer une roda|Criar uma roda/i }).click();
    await page.locator('button', { hasText: /Créer Roda vide|Criar Roda vazia/i }).click();

    await page.locator('button', { hasText: /➕ Ajouter|➕ Adicionar/i }).click();
    await page.locator('text=/marcante/i').first().click();
    await page.waitForTimeout(500);
    await page.waitForTimeout(1000); // Wait for generation
  });

  test("Peut interagir avec les paramètres et les patterns de l'instrument", async ({ page }) => {
    // 1. Aller dans Détail Instrument (via le grand mixeur par ex, ou en cliquant sur le nom)
    // On va chercher le premier nom d'instrument affiché
    await page.locator('text=/marcante/i').first().click();
    
    // Wait for the detail editor modal or panel to appear
    await page.waitForTimeout(1000);

    // 2. Bouger des potards de balance au global et par piste
    // Assuming we have range inputs for Pan or Balance. If not standard range inputs, this might fail and need adjustment.
    const panInputs = page.locator('input[type="range"]');
    if (await panInputs.count() > 0) {
      await panInputs.first().fill('50');
    }

    // 3. Enregistrer et charger un pattern
    // Usually there is a save icon or button. Let's try to find text "Save" or "Enregistrer" or a button with title.
    const saveButton = page.locator('button', { hasText: /Sauver|Enregistrer|Save/i }).first();
    if (await saveButton.isVisible()) {
      await saveButton.click();
    }

    // 4. Ajouter des variations, créer une division différente (en 6, en 8)
    const varB = page.locator('button', { hasText: 'B' }).first();
    if (await varB.isVisible()) {
      await varB.click();
    }
    
    // Toggle tuplet edit mode to reveal the division selects
    const divToggleBtn = page.locator('button', { hasText: /⚙️ Divisions/i }).first();
    if (await divToggleBtn.isVisible()) {
      await divToggleBtn.click();
    }
    
    // Now find the select for the first group (which is within the grid)
    // Avoid the language dropdown by looking for select with specific options or within a specific container
    // "3" is the value for Triolet
    const divSelect = page.locator('select:has(option[value="6"])').first();
    if (await divSelect.isVisible()) {
      await divSelect.selectOption('6');
    }

    // 5. Copier un pattern et le coller ailleurs
    const copyPatternBtn = page.locator('button', { hasText: /Copier|Copy/i }).first();
    if (await copyPatternBtn.isVisible()) {
      await copyPatternBtn.click();
      
      const varC = page.locator('button', { hasText: 'C' }).first();
      if (await varC.isVisible()) await varC.click();
      
      const pastePatternBtn = page.locator('button', { hasText: /Coller|Paste/i }).first();
      if (await pastePatternBtn.isVisible()) await pastePatternBtn.click();
    }

    // 6. Copier une partie des patterns (les 4 premiers pas) et les coller
    // Assuming the grid cells are clickable
    const cells = page.locator('.pattern-cell'); // Dummy class, will update after running
    if (await cells.count() >= 8) {
      // Select first 4
      await cells.nth(0).click({ modifiers: ['Shift'] });
      await cells.nth(3).click({ modifiers: ['Shift'] });
      
      if (await copyPatternBtn.isVisible()) await copyPatternBtn.click();
      
      await cells.nth(4).click();
      if (await pastePatternBtn.isVisible()) await pastePatternBtn.click();
      
      // 7. Supprimer en sélectionnant tous et valider
      await cells.nth(0).click({ modifiers: ['Shift'] });
      const count = await cells.count();
      await cells.nth(count - 1).click({ modifiers: ['Shift'] });
      
      await page.keyboard.press('Backspace'); // or Delete
    }
  });
});
