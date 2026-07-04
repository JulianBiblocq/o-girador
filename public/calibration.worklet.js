/**
 * O Girador - AudioWorklet Processor for High-Precision Latency Calibration
 * 
 * Captures microphone input raw samples in the audio thread,
 * detects the exact sample index of the impulse response peak,
 * and reports the measured loopback latency to the main thread.
 */

class CalibrationProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.recordedSamples = null;
    this.sampleCount = 0;
    this.maxDurationSamples = 0;
    this.searchStartIndex = -1;
    
    this.startContextTime = -1;
    this.pingContextTime = -1;
    this.sampleRate = 44100;
    this.maxVal = 0;
    this.hasFinished = false;

    this.port.onmessage = (e) => {
      if (e.data.action === 'init') {
        this.sampleRate = e.data.sampleRate;
        const durationSec = e.data.durationSec || 1.5;
        this.pingContextTime = e.data.pingContextTime;
        
        this.maxDurationSamples = Math.round(durationSec * this.sampleRate);
        this.recordedSamples = new Float32Array(this.maxDurationSamples);
      }
    };
  }

  process(inputs, outputs, parameters) {
    if (this.hasFinished) return false;
    
    // Remember the exact AudioContext time when processing started
    if (this.startContextTime === -1 && this.pingContextTime !== -1) {
      this.startContextTime = currentTime;
      this.searchStartIndex = Math.round((this.pingContextTime - this.startContextTime) * this.sampleRate);
    }

    const input = inputs[0];
    if (!input || input.length === 0 || !this.recordedSamples) return true;
    
    const channelData = input[0]; // Mono input channel
    if (!channelData) return true;

    for (let i = 0; i < channelData.length; i++) {
      if (this.sampleCount < this.maxDurationSamples) {
        this.recordedSamples[this.sampleCount] = channelData[i];
        
        // Track the maximum absolute value after the theoretical ping emission
        if (this.searchStartIndex !== -1 && this.sampleCount >= this.searchStartIndex) {
          const absVal = Math.abs(channelData[i]);
          if (absVal > this.maxVal) {
            this.maxVal = absVal;
          }
        }
        
        this.sampleCount++;
      } else {
        // Processing completed, run analysis
        this.analyzeAndReport();
        this.hasFinished = true;
        return false; // Tells AudioContext to stop this processor and uncollect it
      }
    }

    return true;
  }

  analyzeAndReport() {
    if (this.maxVal < 0.02) {
      this.port.postMessage({ status: 'error', code: 'LOW_SIGNAL' });
      return;
    }

    const threshold = this.maxVal * 0.5;
    let peakIndex = -1;

    for (let i = this.searchStartIndex; i < this.recordedSamples.length; i++) {
      if (Math.abs(this.recordedSamples[i]) >= threshold) {
        peakIndex = i;
        break;
      }
    }

    if (peakIndex === -1) {
      this.port.postMessage({ status: 'error', code: 'NO_PEAK_FOUND' });
      return;
    }

    const delaySamples = peakIndex - this.searchStartIndex;
    const latencyMs = Math.round((delaySamples / this.sampleRate) * 1000);
    
    this.port.postMessage({ status: 'success', latencyMs });
  }
}

registerProcessor('calibration-processor', CalibrationProcessor);
