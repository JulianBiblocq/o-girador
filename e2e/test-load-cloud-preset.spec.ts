import { test, expect } from '@playwright/test';

test('Chargement effectif d un preset depuis le catalogue Cloud public', async ({ page }) => {
  await page.goto('http://localhost:5174/');
  await page.waitForTimeout(1000);

  // Click ENTRA NA RODA
  const entraBtn = page.locator('#entra-btn');
  if (await entraBtn.isVisible()) {
    await entraBtn.click();
    await page.waitForTimeout(1000);
  }

  // Open Menu
  const menuBtn = page.locator('button:has-text("Menu")').first();
  await menuBtn.click();
  await page.waitForTimeout(500);

  // Select the cloud preset "cloud:_convencao_2"
  const select = page.locator('select').first();
  await select.selectOption('cloud:_convencao_2');
  
  // Selecting closes the menu (setProjectDropOpen(false))
  await page.waitForTimeout(1500);

  // Re-open menu to inspect select value
  await menuBtn.click();
  await page.waitForTimeout(500);

  const selectAfter = page.locator('select').first();
  const currentOption = await selectAfter.inputValue();
  console.log('Selected option in select after load:', currentOption);
  expect(currentOption).toBe('cloud:_convencao_2');
});
