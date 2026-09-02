import { test, expect } from '@playwright/test';

const testProfiles = [
  { name: 'Mestre', email: 'mestre@ogirador.com', canSave: true },
  { name: 'Eleve Group', email: 'eleve-group@ogirador.com', canSave: true },
  { name: 'Eleve Lambda', email: 'eleve-lambda@ogirador.com', canSave: true },
  { name: 'Free Membre', email: 'free@ogirador.com', canSave: true },
  { name: 'Visiteur', email: null, canSave: false },
];

test.describe('Sauvegardes Cloud E2E', () => {
  for (const profile of testProfiles) {
    test.describe(`Profil: ${profile.name}`, () => {
      
      test.beforeEach(async ({ page }) => {
        await page.goto('/');

        if (profile.email) {
          await page.evaluate(async (email) => {
            // @ts-ignore
            const auth = window.firebaseAuth;
            // @ts-ignore
            const signIn = window.signInWithEmailAndPassword;
            if (auth && signIn) {
              try {
                await signIn(auth, email, 'playwrighttest');
              } catch(e) { console.error(e); }
            }
          }, profile.email);
          
          await page.waitForTimeout(2000); // Wait for auth and profile to load
        } else {
          // Visiteur -> on s'assure d'être déconnecté
          await page.evaluate(async () => {
            // @ts-ignore
            const auth = window.firebaseAuth;
            // @ts-ignore
            const signOut = window.firebaseSignOut || (auth && auth.signOut ? auth.signOut.bind(auth) : null);
            if (signOut) {
              await signOut();
            }
          });
          await page.waitForTimeout(1000);
        }
        
        // Clic sur 'Entrer' (landing page) si affiché
        const entraBtn = page.locator('#entra-btn');
        try {
          await entraBtn.waitFor({ state: 'visible', timeout: 3000 });
          await entraBtn.click();
          await page.waitForTimeout(1000);
        } catch (e) {
          // Already entered or not present
        }
      });

      test('Test de Sauvegarde de Preset', async ({ page }) => {
        page.on('dialog', dialog => {
          console.log(`[Dialog in ${profile.name}]: ${dialog.message()}`);
          dialog.dismiss();
        });
        
        // Gérer l'initialisation du séquenceur
        const newRodaBtn = page.locator('button', { hasText: /Créer Roda vide|Criar Roda vazia/i });
        const projetBtn = page.locator('.absolute.left-1\\/2 > button, button:has-text("Menu")').first();
        const clearBtn = page.locator('button', { hasText: /Créer une roda|Criar uma roda|clear/i });

        if (!(await newRodaBtn.isVisible())) {
           if (await projetBtn.isVisible()) {
               await projetBtn.click();
               await page.waitForTimeout(500);
               if (await clearBtn.isVisible()) {
                   await clearBtn.click();
               } else {
                   await projetBtn.click(); // refermer
               }
           }
        }
        
        // Maintenant le modal DEVRAIT être là (soit au lancement, soit via clear)
        await newRodaBtn.waitFor({ state: 'visible', timeout: 5000 });
        await newRodaBtn.click();
        
        await page.waitForTimeout(1000); // wait for modal to disappear
        await page.locator('button', { hasText: /➕ Ajouter|➕ Adicionar/i }).click();
        await page.locator('text=/marcante/i').first().click();
        await page.waitForTimeout(1000); // wait for generation

        // Essayer de sauvegarder dans le cloud via le menu Projet
        await projetBtn.click();
        await page.waitForTimeout(500); // wait for dropdown
        await page.locator('button', { hasText: /Sauvegarder \(Cloud\)|Salvar \(Cloud\)/i }).click();

        // Attendre la modale
        const validerBtn = page.locator('button', { hasText: /^Sauvegarder$|^Salvar$/i });
        await expect(validerBtn).toBeVisible();

        if (profile.canSave) {
          
          // Entrer un nom
          const inputName = page.locator('input[placeholder*="Ex:"]').first();
          const presetName = `E2E Test ${profile.name} ${Date.now()}`;
          await inputName.fill(presetName);
          
          // Désactiver la génération audio pour accélérer le test E2E
          const audioBounceCheckbox = page.locator('input[type="checkbox"]#autoGenerateAudio');
          if (await audioBounceCheckbox.isVisible()) {
            await audioBounceCheckbox.uncheck();
          }
          
          await validerBtn.click();

          // Wait for success toast and close it
          await expect(page.locator('text=/✅ Sauvegardé dans le cloud|✅ Salvo na nuvem/i')).toBeVisible({ timeout: 10000 });
          await page.locator('button', { hasText: /Valider|OK/i }).click();
          
          // --- TEST DU BUG DE RAFRAICHISSEMENT ---
          // On modifie une valeur (ex: le tempo)
          // BPM est un input range ou on peut cliquer sur les fleches
          const bpmInput = page.locator('input[type="number"]').first();
          if (await bpmInput.isVisible()) {
            await bpmInput.fill('120');
          }

          // On re-sauvegarde par dessus !
          await projetBtn.click();
          await page.waitForTimeout(500); // wait for dropdown
          await page.locator('button', { hasText: /Sauvegarder \(Cloud\)|Salvar \(Cloud\)/i }).click();
          await expect(validerBtn).toBeVisible();
          
          if (await audioBounceCheckbox.isVisible()) {
            await audioBounceCheckbox.uncheck();
          }
          
          // Cliquer sur valider, il devrait demander confirmation d'écraser
          await validerBtn.click();
          
          // Confirmer l'écrasement
          await page.locator('button', { hasText: /Valider|OK|Oui|Sim/i }).click();

          // Wait for success toast and close it again
          await expect(page.locator('text=/✅ Sauvegardé dans le cloud|✅ Salvo na nuvem/i')).toBeVisible({ timeout: 10000 });
          await page.locator('button', { hasText: /Valider|OK/i }).click();

          // Rafraichir
          await page.reload();
          await page.waitForTimeout(2000);

          // Skip landing page again
          const entraBtn = page.locator('#entra-btn');
          try {
            await entraBtn.waitFor({ state: 'visible', timeout: 5000 });
            await entraBtn.click();
            await page.waitForTimeout(1000);
          } catch (e) {}

          // L'intro modal s'ouvre au rechargement
          const newRodaBtn = page.locator('button', { hasText: /Créer Roda vide|Criar Roda vazia/i });
          try {
             await newRodaBtn.waitFor({ state: 'visible', timeout: 5000 });
             await newRodaBtn.click();
             await page.waitForTimeout(1000);
          } catch (e) {
             // Modale non apparue, on continue
          }
          
          // Ré-ouvrir le menu "Projet"
          await projetBtn.click();
          await page.waitForTimeout(500);

          // Retrier jusqu'à ce que l'option soit disponible et sélectionnée
          const presetDropdown = page.locator('select').first(); 
          await expect(async () => {
            const optionsText = await presetDropdown.innerText();
            expect(optionsText).toContain(`☁️ ${presetName}`);
            await presetDropdown.selectOption({ label: `☁️ ${presetName}` });
          }).toPass({ timeout: 20000 });
          
          await page.waitForTimeout(1000);
          
          // Verify that BPM is 120
          if (await bpmInput.isVisible()) {
            const bpmValue = await bpmInput.inputValue();
            expect(bpmValue).toBe('120');
          }
          
        } else {
          // Le bouton de sauvegarde doit être désactivé pour le visiteur
          await expect(validerBtn).toBeDisabled();
        }
      });
      
    });
  }
});
