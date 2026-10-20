export function setupPwaLaunchHandler(applyPreset: (data: any) => Promise<void>): () => void {
  if (typeof window === 'undefined') return () => {};

  if ('launchQueue' in window) {
    (window as any).launchQueue.setConsumer(async (launchParams: any) => {
      if (launchParams.targetURL) {
        window.dispatchEvent(new CustomEvent('pwa-launch-url', { detail: { targetURL: launchParams.targetURL } }));
      }
      if (!launchParams.files || launchParams.files.length === 0) return;
      try {
        const fileHandle = launchParams.files[0];
        const file: File = await fileHandle.getFile();
        if (!file.name.endsWith('.json')) return;
        const text = await file.text();
        await applyPreset(JSON.parse(text));
      } catch (err) {
        console.error('Failed to load file from launchQueue:', err);
      }
    });
  }

  const handleFilesFromOtherConsumer = async (e: Event) => {
    const customEvent = e as CustomEvent<{ files: any[] }>;
    const files = customEvent.detail?.files;
    if (!files || files.length === 0) return;
    try {
      const fileHandle = files[0];
      const file: File = await fileHandle.getFile();
      if (!file.name.endsWith('.json')) return;
      const text = await file.text();
      await applyPreset(JSON.parse(text));
    } catch (err) {
      console.error('Failed to load file from pwa-launch-files:', err);
    }
  };

  window.addEventListener('pwa-launch-files', handleFilesFromOtherConsumer);
  return () => {
    window.removeEventListener('pwa-launch-files', handleFilesFromOtherConsumer);
  };
}
