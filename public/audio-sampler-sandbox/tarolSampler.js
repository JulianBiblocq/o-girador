/**
 * BaqueMix - Web Audio Sampler for Tarol (Maracatu Snare)
 * 
 * Native Web Audio API implementation of the Tarol sampler.
 * Supports:
 *  - Async decoding of 14 separate WAV samples.
 *  - Progressive progress callbacks during loading.
 *  - Smart anti-repetition Round-Robin sample selection.
 *  - Dynamic amplitude humanization (+/- 4% volume modulation).
 *  - Sound choke groups (stops long tremolo notes when a new stroke starts).
 *  - Exact-time scheduling (compatible with the AudioEngine Lookahead clock).
 */

const SAMPLE_CONFIG = {
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
  ]
};

export class TarolSampler {
  /**
   * @param {AudioContext} audioContext - Shared Web Audio context from AudioEngine
   * @param {AudioNode} outputNode - Node to connect playbacks to (usually masterGain)
   */
  constructor(audioContext, outputNode) {
    this.audioContext = audioContext;
    this.outputNode = outputNode;

    // Decoded AudioBuffer arrays by group
    this.buffers = {
      fort: [],
      faible: [],
      click: [],
      fla: [],
      tremer: [],
      cerclage: []
    };

    // Tracking last indices to prevent direct sample repetition (Round-Robin memory)
    this.lastIndices = {
      fort: -1,
      faible: -1,
      click: -1,
      fla: -1,
      tremer: -1,
      cerclage: -1
    };

    // Keep track of active tremolo source for choke functionality
    this.activeTremerSource = null;
  }

  /**
   * Load and decode all 14 sample files asynchronously
   * @param {string} baseUrl - Folder containing the samples
   * @param {function} onProgress - Callback (loadedCount, totalCount, currentFilename)
   */
  async load(baseUrl, onProgress = null) {
    const groups = Object.keys(SAMPLE_CONFIG);
    const totalFiles = groups.reduce((acc, k) => acc + SAMPLE_CONFIG[k].length, 0);
    let loadedCount = 0;

    const loadPromises = [];

    for (const group of groups) {
      const files = SAMPLE_CONFIG[group];
      this.buffers[group] = new Array(files.length);

      files.forEach((filename, idx) => {
        const fileUrl = `${baseUrl}${encodeURIComponent(filename)}`;
        
        const promise = (async () => {
          try {
            const response = await fetch(fileUrl);
            if (!response.ok) {
              throw new Error(`HTTP Error ${response.status} fetching ${filename}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const decodedBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            this.buffers[group][idx] = decodedBuffer;
            loadedCount++;
            
            if (onProgress) {
              onProgress(loadedCount, totalFiles, filename);
            }
          } catch (err) {
            console.error(`TarolSampler: Failed to load ${filename}`, err);
            throw err;
          }
        })();

        loadPromises.push(promise);
      });
    }

    await Promise.all(loadPromises);
    console.log("TarolSampler: All 14 samples successfully loaded.");
  }

  /**
   * Play a specific stroke type at a given audio context time
   * @param {string} strokeKey - Type of stroke ('fort_D', 'fort_E', 'faible_d', 'faible_e', 'click', 'fla', 'tremer', 'cerclage')
   * @param {number} time - Exact AudioContext timeline timestamp to sound the note
   */
  play(strokeKey, time) {
    let groupKey = '';
    let baseGain = 1.0;

    // Map stroke keys to sample groups and base gains
    switch (strokeKey) {
      case 'fort_D':
      case 'fort_E':
        groupKey = 'fort';
        baseGain = 0.95;
        break;
      case 'faible_d':
      case 'faible_e':
        groupKey = 'faible';
        baseGain = 0.32; // significantly softer
        break;
      case 'click':
        groupKey = 'click';
        baseGain = 0.55;
        break;
      case 'fla':
        groupKey = 'fla';
        baseGain = 0.85;
        break;
      case 'tremer':
        groupKey = 'tremer';
        baseGain = 0.80;
        break;
      case 'cerclage':
        groupKey = 'cerclage';
        baseGain = 0.65;
        break;
      default:
        // Ignore silent steps ('.') or unknown types
        return;
    }

    const groupBuffers = this.buffers[groupKey];
    if (!groupBuffers || groupBuffers.length === 0 || !groupBuffers[0]) {
      console.warn(`TarolSampler: No buffers available for group: ${groupKey}`);
      return;
    }

    // Choke tremolo: stop any ongoing tremolo playbacks at the exact start time of the new note
    if (this.activeTremerSource) {
      try {
        this.activeTremerSource.stop(time);
      } catch (_) {}
      this.activeTremerSource = null;
    }

    // Round-Robin index selection (avoids playing the same sample twice consecutively)
    const chosenIdx = this.selectRoundRobinIndex(groupKey, groupBuffers.length);
    const audioBuffer = groupBuffers[chosenIdx];

    // Create source buffer node
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;

    // Create dynamic gain node for humanization
    const gainNode = this.audioContext.createGain();
    
    // Add micro-amplitude humanization: +/- 4% gain fluctuation
    const volumeModulation = 0.96 + (Math.random() * 0.08);
    const finalVolume = baseGain * volumeModulation;

    gainNode.gain.setValueAtTime(finalVolume, time);

    // Node connections
    source.connect(gainNode);
    gainNode.connect(this.outputNode);

    // Playback
    source.start(time);

    // If it's a tremolo, track the active source to choke it on the next stroke
    if (groupKey === 'tremer') {
      this.activeTremerSource = source;
      source.onended = () => {
        if (this.activeTremerSource === source) {
          this.activeTremerSource = null;
        }
      };
    }
  }

  /**
   * Helper to perform anti-repetition selection
   */
  selectRoundRobinIndex(groupKey, numSamples) {
    if (numSamples <= 1) return 0;
    
    const lastIdx = this.lastIndices[groupKey];
    const available = [];
    
    for (let i = 0; i < numSamples; i++) {
      if (i !== lastIdx) {
        available.push(i);
      }
    }

    const chosen = available[Math.floor(Math.random() * available.length)];
    this.lastIndices[groupKey] = chosen;
    return chosen;
  }
}
