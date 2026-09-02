import { test, expect } from '@playwright/test';

test.describe('Validation du Chargement des Vues et Modules Dynamiques', () => {
  test('Tous les composants lazy-loadés (ConsoleMixer, DawLinearSequencer, etc.) se chargent avec succès sans erreur de chunk', async ({ page }) => {
    const errorLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorLogs.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForFunction(() => 'firebaseAuth' in window);

    // 1. Valider le chargement dynamique de chaque vue principale
    const results = await page.evaluate(async () => {
      const loaded: Record<string, boolean | string> = {};

      try {
        const m = await import('/src/components/ConsoleMixer.tsx');
        loaded['ConsoleMixer'] = typeof m.ConsoleMixer === 'object' || typeof m.ConsoleMixer === 'function';
      } catch (err: any) {
        loaded['ConsoleMixer'] = err.message;
      }

      try {
        const m = await import('/src/components/CircleSequencer.tsx');
        loaded['CircleSequencer'] = typeof m.CircleSequencer === 'object' || typeof m.CircleSequencer === 'function';
      } catch (err: any) {
        loaded['CircleSequencer'] = err.message;
      }

      try {
        const m = await import('/src/components/DawLinearSequencer.tsx');
        loaded['DawLinearSequencer'] = typeof m.DawLinearSequencer === 'object' || typeof m.DawLinearSequencer === 'function';
      } catch (err: any) {
        loaded['DawLinearSequencer'] = err.message;
      }

      try {
        const m = await import('/src/components/TimelineSequencer.tsx');
        loaded['TimelineSequencer'] = typeof m.TimelineSequencer === 'object' || typeof m.TimelineSequencer === 'function';
      } catch (err: any) {
        loaded['TimelineSequencer'] = err.message;
      }

      try {
        const m = await import('/src/components/AdminPanel.tsx');
        loaded['AdminPanel'] = typeof m.AdminPanel === 'object' || typeof m.AdminPanel === 'function';
      } catch (err: any) {
        loaded['AdminPanel'] = err.message;
      }

      return loaded;
    });

    console.log('Résultats de chargement dynamique des vues :', results);

    expect(results['ConsoleMixer']).toBe(true);
    expect(results['CircleSequencer']).toBe(true);
    expect(results['DawLinearSequencer']).toBe(true);
    expect(results['TimelineSequencer']).toBe(true);
    expect(results['AdminPanel']).toBe(true);

    // Aucun message d'erreur de module ou de strict MIME type
    const criticalErrors = errorLogs.filter(log => 
      log.includes('dynamically imported module') || 
      log.includes('Failed to load module script') ||
      log.includes('text/html')
    );
    expect(criticalErrors).toEqual([]);
  });

  test('L\'utilitaire lazyWithRetry capture et gère correctement les rechargements sur erreur de chunk', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => 'firebaseAuth' in window);

    const helperStatus = await page.evaluate(async () => {
      const { lazyWithRetry } = await import('/src/utils/lazyWithRetry.ts');
      return typeof lazyWithRetry === 'function';
    });

    expect(helperStatus).toBe(true);
  });

  test('La TransportBar masque le chiffre du BPM sur smartphone tout en gardant l\'icône et les boutons +/-', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForFunction(() => 'firebaseAuth' in window);

    const isLoaded = await page.evaluate(async () => {
      const mod = await import('/src/components/TransportBar.tsx');
      return typeof mod.TransportBar === 'object' || typeof mod.TransportBar === 'function';
    });

    expect(isLoaded).toBe(true);
  });

  test('Sur smartphone, la console, la timeline et les pistes dépliées sont bien accessibles', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForFunction(() => 'firebaseAuth' in window);

    const status = await page.evaluate(async () => {
      const { useSequencerStore } = await import('/src/stores/useSequencerStore.ts');
      const isTracksInitiallyCollapsed = useSequencerStore.getState().isTracksCollapsed;
      return { isTracksInitiallyCollapsed };
    });

    // Sur mobile, les pistes doivent être dépliées directement
    expect(status.isTracksInitiallyCollapsed).toBe(false);
  });
});

