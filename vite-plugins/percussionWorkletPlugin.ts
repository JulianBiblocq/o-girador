import path from 'path';
import { build, Plugin } from 'vite';

const VIRTUAL_ID = 'virtual:percussion-worklet-code';
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID;

/**
 * Compile `percussionEngineProcessor.ts` et ses dépendances DSP SOA en un bundle IIFE
 * 100 % autonome (zéro `import`/`export`), chargé via `Blob` URL en Dev comme en Prod.
 */
export function percussionWorkletPlugin(): Plugin {
  let cachedCode: string | null = null;
  let rootDir = process.cwd();

  async function compileWorkletToIIFE(): Promise<string> {
    if (cachedCode) return cachedCode;
    const entryPath = path.resolve(rootDir, 'src/audio/worklet/processor/percussionEngineProcessor.ts');
    const result = await build({
      configFile: false,
      logLevel: 'silent',
      build: {
        write: false,
        target: 'es2020',
        minify: false,
        lib: {
          entry: entryPath,
          formats: ['iife'],
          name: 'PercussionWorklet',
          fileName: () => 'percussion-worklet.iife.js',
        },
      },
    });
    const outputs = Array.isArray(result) ? result : [result];
    for (const out of outputs) {
      if ('output' in out) {
        const chunk = out.output.find((item) => item.type === 'chunk');
        if (chunk && chunk.type === 'chunk') {
          cachedCode = chunk.code;
          return cachedCode;
        }
      }
    }
    throw new Error('[percussionWorkletPlugin] Failed to compile AudioWorklet IIFE bundle');
  }

  return {
    name: 'vite-plugin-percussion-worklet-iife',
    configResolved(config) { rootDir = config.root; },
    resolveId(id) { return id === VIRTUAL_ID ? RESOLVED_VIRTUAL_ID : null; },
    async load(id) {
      if (id !== RESOLVED_VIRTUAL_ID) return null;
      const code = await compileWorkletToIIFE();
      return `export default ${JSON.stringify(code)};`;
    },
    handleHotUpdate({ file, server }) {
      if (file.replace(/\\/g, '/').includes('/src/audio/worklet/')) {
        cachedCode = null;
        const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
      }
    },
  };
}
