let toneInstance: typeof import('tone') | null = null;

export const loadTone = async () => {
  console.log("🚀 loadTone() called!");
  console.trace("Trace for loadTone:");
  if (!toneInstance) {
    console.log("⏳ Downloading Tone.js chunk...");
    // Vite will automatically split this into a separate chunk
    toneInstance = await import('tone');
  }
  return toneInstance;
};

export const getTone = () => {
  if (!toneInstance) {
    throw new Error("Tone.js has not been loaded yet. Make sure loadTone() is called before getTone().");
  }
  return toneInstance;
};
