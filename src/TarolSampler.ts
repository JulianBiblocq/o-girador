/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Tone from 'tone';

const filenames = {
  fort: [
    'Tarol fort D1.wav',
    'Tarol fort D2.wav',
    'Tarol fort D3.wav',
    'Tarol fort D4.wav'
  ],
  faible: [
    'Tarol faible d1.wav',
    'Tarol faible d2.wav',
    'Tarol faible d3.wav',
    'Tarol faible d4.wav'
  ],
  click: [
    'Tarol click c1.wav',
    'Tarol click c2.wav'
  ],
  fla: [
    'Tarol fla1.wav',
    'Tarol fla2.wav'
  ],
  tremer: [
    'Tarol tremer.wav'
  ],
  cerclage: [
    'Tarol cerclage x.wav'
  ],
  rufada: [
    'Tarol rufada1.wav',
    'Tarol rufada2.wav',
    'Tarol rufada3.wav'
  ]
};

export class TarolSampler {
  private buffers: { [key: string]: Tone.ToneAudioBuffer[] } = {
    fort: [],
    faible: [],
    click: [],
    fla: [],
    tremer: [],
    cerclage: [],
    rufada: []
  };

  private lastIndices: { [key: string]: number } = {
    fort: -1,
    faible: -1,
    click: -1,
    fla: -1,
    tremer: -1,
    cerclage: -1,
    rufada: -1
  };

  private channel: Tone.Channel | null = null;
  private activeSources: Set<Tone.ToneBufferSource> = new Set();
  private activeTremerSources: Set<Tone.ToneBufferSource> = new Set();

  constructor() {}

  /**
   * Connect to the Mixer channel of Tarol
   */
  public connect(channel: Tone.Channel): this {
    this.channel = channel;
    return this;
  }

  /**
   * Preload all samples using Tone.ToneAudioBuffer
   */
  public async load(baseUrl: string, onSampleLoaded?: () => void): Promise<void> {
    const promises: Promise<void>[] = [];

    Object.keys(filenames).forEach((groupKey) => {
      const files = filenames[groupKey as keyof typeof filenames];
      files.forEach((filename, idx) => {
        // Encode filenames properly to support spaces
        const url = `${baseUrl}${encodeURIComponent(filename)}`;
        
        promises.push(
          new Promise<void>((resolve, reject) => {
            const buf = new Tone.ToneAudioBuffer(
              url,
              () => {
                this.buffers[groupKey][idx] = buf;
                if (onSampleLoaded) {
                  onSampleLoaded();
                }
                resolve();
              },
              (err) => {
                console.error(`Failed to load Tarol sample: ${url}`, err);
                reject(err);
              }
            );
          })
        );
      });
    });

    await Promise.all(promises);
  }

  /**
   * Select a random index that differs from the last played index in the group (anti-repetition)
   */
  private selectIndex(groupKey: string, numSamples: number): number {
    if (numSamples <= 1) return 0;
    const lastIdx = this.lastIndices[groupKey];
    
    const available: number[] = [];
    for (let i = 0; i < numSamples; i++) {
      if (i !== lastIdx) {
        available.push(i);
      }
    }
    
    const chosen = available[Math.floor(Math.random() * available.length)];
    this.lastIndices[groupKey] = chosen;
    return chosen;
  }

  /**
   * Play a specific stroke type at triggerTime with optional velocity/gain and decay multipliers
   */
  public play(strokeKey: string, time: number, velocity: number, decayMultiplier: number): void {
    let groupKey = '';
    
    // Normalize keys (supports both hyphens from scheduler and underscores from sandbox)
    const k = strokeKey.toLowerCase().replace('_', '-');
    if (k === 'fort-d' || k === 'fort-e') {
      groupKey = 'fort';
    } else if (k === 'faible-d' || k === 'faible-e') {
      groupKey = 'faible';
    } else if (k === 'click') {
      groupKey = 'click';
    } else if (k === 'fla') {
      groupKey = 'fla';
    } else if (k === 'tremer') {
      groupKey = 'tremer';
    } else if (k === 'cerclage') {
      groupKey = 'cerclage';
    } else if (k === 'rufada-d' || k === 'rufada-e' || k === 'rufada') {
      groupKey = 'rufada';
    } else {
      console.warn(`TarolSampler: unknown stroke key: ${strokeKey}`);
      return;
    }

    const groupBuffers = this.buffers[groupKey];
    if (!groupBuffers || groupBuffers.length === 0) return;

    // Smart Round-Robin index selection
    const chosenIdx = this.selectIndex(groupKey, groupBuffers.length);
    const buffer = groupBuffers[chosenIdx];
    if (!buffer || !buffer.loaded) return;

    const nativeAudioBuffer = buffer.get();
    if (!nativeAudioBuffer) return;

    // Choke trêmulo: stop any active trêmulo sound when another sound starts
    if (this.activeTremerSources.size > 0) {
      this.activeTremerSources.forEach((src) => {
        try {
          (src as unknown as AudioBufferSourceNode).stop(time);
        } catch (_) {}
      });
      this.activeTremerSources.clear();
    }

    // Create native AudioBufferSourceNode (bypasses Tone.js wrapper overhead)
    const rawCtx = Tone.getContext().rawContext as AudioContext;
    const source = rawCtx.createBufferSource();
    source.buffer = nativeAudioBuffer;

    // Create native GainNode for precise velocity
    const gainNode = rawCtx.createGain();
    gainNode.gain.setValueAtTime(velocity, time);

    source.connect(gainNode);

    // Connect native GainNode directly to the channel input node
    if (this.channel) {
      // Recursively resolve native AudioNode if wrapped in a ToneAudioNode
      let destNode: any = this.channel.input;
      while (destNode && !(destNode instanceof AudioNode) && destNode.input) {
        destNode = destNode.input;
      }
      if (destNode instanceof AudioNode) {
        gainNode.connect(destNode);
      } else {
        try {
          (gainNode as any).connect(this.channel.input);
        } catch (_) {
          gainNode.connect(rawCtx.destination);
        }
      }
    } else {
      gainNode.connect(rawCtx.destination);
    }

    // Apply decay multiplier if less than 1.0 (truncates duration)
    const duration = nativeAudioBuffer.duration * decayMultiplier;
    
    // Play sound on absolute timeline
    if (decayMultiplier < 1.0) {
      source.start(time, 0, duration);
    } else {
      source.start(time);
    }

    // Keep track of active sources for stopAll
    const wrappedSource = source as unknown as Tone.ToneBufferSource;
    this.activeSources.add(wrappedSource);
    
    if (groupKey === 'tremer') {
      this.activeTremerSources.add(wrappedSource);
      source.onended = () => {
        this.activeTremerSources.delete(wrappedSource);
        this.activeSources.delete(wrappedSource);
        gainNode.disconnect();
      };
    } else {
      source.onended = () => {
        this.activeSources.delete(wrappedSource);
        gainNode.disconnect();
      };
    }
  }

  /**
   * Stop all active sources
   */
  public stopAll(): void {
    this.activeSources.forEach((source) => {
      try {
        (source as unknown as AudioBufferSourceNode).stop();
      } catch (_) {}
    });
    this.activeSources.clear();
  }
}
