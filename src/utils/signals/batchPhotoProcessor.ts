
import { CordelOptions, defaultCordelOptions, processCordelEffectBase64 } from '../cordelEffect';

export interface BatchItem {
  id: string;
  file: File;
  name: string;
  rawBase64: string;
  processedBase64?: string;
}

export interface GroupedSignalItem {
  name: string;
  image: string; // T1 thumbnail
  frames: string[];
  rawFrames: string[];
  beatsCount: number;
  cordelOptions: CordelOptions;
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function processBatchItems(
  items: BatchItem[],
  options: CordelOptions,
  onProgress?: (done: number, total: number) => void
): Promise<BatchItem[]> {
  const result: BatchItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const processed = await processCordelEffectBase64(item.rawBase64, options, 200);
    result.push({ ...item, processedBase64: processed });
    onProgress?.(i + 1, items.length);
  }
  return result;
}

export function groupBatchIntoSignals(
  processedItems: BatchItem[],
  framesPerSignal: number,
  baseSignalName: string,
  options: CordelOptions
): GroupedSignalItem[] {
  const signals: GroupedSignalItem[] = [];
  const chunkSize = Math.max(1, framesPerSignal);

  for (let i = 0; i < processedItems.length; i += chunkSize) {
    const chunk = processedItems.slice(i, i + chunkSize);
    const frames = chunk.map((c) => c.processedBase64 || c.rawBase64);
    const rawFrames = chunk.map((c) => c.rawBase64);
    const indexStr = processedItems.length > chunkSize ? ` ${Math.floor(i / chunkSize) + 1}` : '';
    const signalTitle = chunk.length === 1 && chunk[0].name ? chunk[0].name.replace(/\.[^/.]+$/, '') : `${baseSignalName}${indexStr}`;

    signals.push({
      name: signalTitle,
      image: frames[0] || '',
      frames,
      rawFrames,
      beatsCount: chunk.length,
      cordelOptions: { ...options },
    });
  }

  return signals;
}
