class ClockProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frames = 0;
  }

  process(inputs, outputs, parameters) {
    this.frames += 128;
    if (this.frames >= 1024) {
      this.port.postMessage('tick');
      this.frames = 0;
    }
    return true;
  }
}

registerProcessor('clock-processor', ClockProcessor);
