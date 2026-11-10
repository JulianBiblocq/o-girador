import path from 'path';
import { build, Plugin } from 'vite';

interface WorkletBundleSpec {
  virtualId: string;
  resolvedId: string;
  entryRelPath: string;
  globalName: string;
  fileName: string;
  cachedCode: string | null;
}

const WORKLET_SPECS: WorkletBundleSpec[] = [
  {
    virtualId: 'virtual:percussion-worklet-code',
    resolvedId: '\0virtual:percussion-worklet-code',
    entryRelPath: 'src/audio/worklet/processor/percussionEngineProcessor.ts',
    globalName: 'PercussionWorklet',
    fileName: 'percussion-worklet.iife.js',
    cachedCode: null,
  },
  {
    virtualId: 'virtual:master-bus-worklet-code',
    resolvedId: '\0virtual:master-bus-worklet-code',
    entryRelPath: 'src/audio/worklet/master-bus/masterBusProcessor.ts',
    globalName: 'MasterBusWorklet',
    fileName: 'master-bus-worklet.iife.js',
    cachedCode: null,
  },
];

/**
 * Compile `percussionEngineProcessor.ts` et `masterBusProcessor.ts` en bundles IIFE
 * 100 % autonomes (zéro `import`/`export`), chargés via `Blob` URL en Dev comme en Prod (< 90 lignes).
 */
export function percussionWorkletPlugin(): Plugin {
  let rootDir = process.cwd();

  async function compileSpecToIIFE(spec: WorkletBundleSpec): Promise<string> {
    if (spec.cachedCode) return spec.cachedCode;
    const entryPath = path.resolve(rootDir, spec.entryRelPath);
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
          name: spec.globalName,
          fileName: () => spec.fileName,
        },
      },
    });
    const outputs = Array.isArray(result) ? result : [result];
    for (const out of outputs) {
      if ('output' in out) {
        const chunk = out.output.find((item) => item.type === 'chunk');
        if (chunk && chunk.type === 'chunk') {
          spec.cachedCode = chunk.code;
          return spec.cachedCode;
        }
      }
    }
    throw new Error(`[percussionWorkletPlugin] Failed to compile IIFE bundle for ${spec.virtualId}`);
  }

  return {
    name: 'vite-plugin-percussion-worklet-iife',
    configResolved(config) { rootDir = config.root; },
    resolveId(id) {
      const match = WORKLET_SPECS.find((s) => s.virtualId === id);
      return match ? match.resolvedId : null;
    },
    async load(id) {
      const match = WORKLET_SPECS.find((s) => s.resolvedId === id);
      if (!match) return null;
      const code = await compileSpecToIIFE(match);
      return `export default ${JSON.stringify(code)};`;
    },
    handleHotUpdate({ file, server }) {
      if (file.replace(/\\/g, '/').includes('/src/audio/worklet/')) {
        for (const spec of WORKLET_SPECS) {
          spec.cachedCode = null;
          const mod = server.moduleGraph.getModuleById(spec.resolvedId);
          if (mod) server.moduleGraph.invalidateModule(mod);
        }
      }
    },
  };
}
