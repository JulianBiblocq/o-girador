declare module 'gifshot' {
  export interface GIFOptions {
    images?: (string | HTMLCanvasElement | HTMLImageElement)[];
    gifWidth?: number;
    gifHeight?: number;
    interval?: number;
    numFrames?: number;
    frameDuration?: number;
    sampleInterval?: number;
    numWorkers?: number;
    filter?: string;
  }

  export interface GIFResult {
    error: boolean;
    errorCode: string;
    errorMsg: string;
    image: string; // Base64 data URL
  }

  export function createGIF(
    options: GIFOptions,
    callback: (obj: GIFResult) => void
  ): void;
}
