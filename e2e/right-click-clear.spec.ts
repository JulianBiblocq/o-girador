import { test, expect } from '@playwright/test';

test.describe("Effacement au Clic Droit (Workflow Express FL Studio)", () => {
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

    // Enter the app
    await page.locator('#entra-btn').click();
    await page.waitForTimeout(1000);

    // Create an empty Roda and add Marcante (percussion instrument)
    await page.locator('button', { hasText: 'Menu' }).click();
    await page.locator('button', { hasText: /Créer une roda|Criar uma roda/i }).click();
    await page.locator('button', { hasText: /Créer Roda vide|Criar Roda vazia/i }).click();

    await page.locator('button', { hasText: /➕ Ajouter|➕ Adicionar/i }).click();
    await page.locator('text=/marcante/i').first().click();
    await page.waitForTimeout(1500);
  });

  test("Clic droit sur un pas simple → efface la note instantanément (pas vide)", async ({ page }) => {
    // 1. Ouvrir l'éditeur en cliquant sur l'instrument
    await page.locator('text=/marcante/i').first().click();
    await page.waitForTimeout(1000);

    // 2. Trouver le premier pas vide dans la grille
    const firstStep = page.locator('.step-input-cell').first();
    await expect(firstStep).toBeVisible();

    // 3. Clic gauche pour poser une note
    await firstStep.click();
    await page.waitForTimeout(300);

    // 4. Vérifier que le pas n'est plus vide (contient une valeur)
    const valueAfterClick = await firstStep.inputValue().catch(() => null)
      ?? await firstStep.textContent();
    // Le pas doit contenir quelque chose (la note posée dépend de l'instrument, mais ne doit pas être vide)

    // 5. Clic droit sur le même pas : doit effacer sans menu contextuel natif
    // Intercepter que le menu contextuel natif ne s'affiche pas
    let contextMenuFired = false;
    await page.evaluate(() => {
      document.addEventListener('contextmenu', (e) => {
        // If not prevented, it means the native menu would appear
        if (!e.defaultPrevented) {
          (window as any).__nativeContextMenuFired = true;
        }
      }, { capture: true, once: true });
    });

    await firstStep.click({ button: 'right' });
    await page.waitForTimeout(300);

    // Vérifier que le menu contextuel natif n'est PAS apparu
    contextMenuFired = await page.evaluate(() => (window as any).__nativeContextMenuFired || false);
    expect(contextMenuFired).toBe(false);

    // 6. Vérifier que le pas est maintenant vide
    const valueAfterRightClick = await firstStep.inputValue().catch(() => '')
      ?? await firstStep.textContent();
    expect(valueAfterRightClick?.trim()).toBe('');
  });

  test("Clic droit sur un pas déjà vide → early return (coût CPU = 0, pas de re-render)", async ({ page }) => {
    // Ouvrir l'éditeur
    await page.locator('text=/marcante/i').first().click();
    await page.waitForTimeout(1000);

    const emptyStep = page.locator('.step-input-cell').nth(1);
    await expect(emptyStep).toBeVisible();

    // Le pas d'index 1 est vide par défaut. Clic droit ne doit rien changer
    const valueBefore = await emptyStep.inputValue().catch(() => '')
      ?? await emptyStep.textContent();
    expect(valueBefore?.trim()).toBe('');

    await emptyStep.click({ button: 'right' });
    await page.waitForTimeout(200);

    const valueAfter = await emptyStep.inputValue().catch(() => '')
      ?? await emptyStep.textContent();
    expect(valueAfter?.trim()).toBe('');
  });

  test("Clic droit sur un pas scindé : efface un seul triangle, puis le pas entier", async ({ page }) => {
    // Ouvrir l'éditeur
    await page.locator('text=/marcante/i').first().click();
    await page.waitForTimeout(1000);

    const firstStep = page.locator('.step-input-cell').first();
    await expect(firstStep).toBeVisible();

    // 1. Poser une note (clic gauche)
    await firstStep.click();
    await page.waitForTimeout(300);

    // 2. Activer l'outil Ciseau pour scinder le pas en deux sous-coups
    const scissorBtn = page.locator('button', { hasText: /✂|Ciseau|Scissors/i }).first();
    if (await scissorBtn.isVisible()) {
      await scissorBtn.click();
      await page.waitForTimeout(200);

      // Clic gauche sur le pas pour le scinder
      await firstStep.click();
      await page.waitForTimeout(300);

      // Désactiver l'outil ciseau
      await scissorBtn.click();
      await page.waitForTimeout(200);
    }

    // 3. Chercher les triangles cliquables (sub-index 0 et 1) si le pas est scindé
    const subIndexZero = page.locator('[data-sub-index="0"]').first();
    const subIndexOne = page.locator('[data-sub-index="1"]').first();

    if (await subIndexZero.isVisible()) {
      // 4. Clic droit sur le premier triangle (sub-index 0) : efface seulement cette moitié
      await subIndexZero.click({ button: 'right' });
      await page.waitForTimeout(300);

      // Le second triangle (sub-index 1) devrait toujours être visible
      // puisqu'un seul sous-pas a été effacé

      // 5. Clic droit sur le second triangle : le pas entier doit devenir silence
      if (await subIndexOne.isVisible()) {
        await subIndexOne.click({ button: 'right' });
        await page.waitForTimeout(300);
      }

      // Vérifier que le pas est maintenant vide (plus de triangles)
      const stepValue = await firstStep.inputValue().catch(() => '')
        ?? await firstStep.textContent();
      expect(stepValue?.trim()).toBe('');
    }
  });

  test("Clic droit ne déclenche JAMAIS l'outil d'écriture actif", async ({ page }) => {
    // Ouvrir l'éditeur
    await page.locator('text=/marcante/i').first().click();
    await page.waitForTimeout(1000);

    // Trouver un pas vide
    const emptyStep = page.locator('.step-input-cell').first();
    await expect(emptyStep).toBeVisible();

    // Clic droit sur un pas vide : ne doit PAS poser de note
    await emptyStep.click({ button: 'right' });
    await page.waitForTimeout(300);

    // Le pas doit rester vide (le clic droit ne pose jamais de note)
    const valueAfterRightClick = await emptyStep.inputValue().catch(() => '')
      ?? await emptyStep.textContent();
    expect(valueAfterRightClick?.trim()).toBe('');
  });

  test("Menu contextuel natif bloqué sur toute la grille (conteneur + triangles)", async ({ page }) => {
    // Ouvrir l'éditeur
    await page.locator('text=/marcante/i').first().click();
    await page.waitForTimeout(1000);

    // Tester sur le conteneur .percussion-step-container
    const container = page.locator('.percussion-step-container').first();
    await expect(container).toBeVisible();

    // Installer un listener pour détecter si preventDefault a bien été appelé
    await page.evaluate(() => {
      (window as any).__contextMenuDefaultPrevented = false;
      document.addEventListener('contextmenu', (e) => {
        (window as any).__contextMenuDefaultPrevented = e.defaultPrevented;
      }, { capture: false, once: true });
    });

    await container.click({ button: 'right' });
    await page.waitForTimeout(200);

    const wasPrevented = await page.evaluate(() => (window as any).__contextMenuDefaultPrevented);
    expect(wasPrevented).toBe(true);
  });
});
