class RecorderWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.leftBuffer = new Float32Array(this.bufferSize);
    this.rightBuffer = new Float32Array(this.bufferSize);
    this.framesRecorded = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    // Web Audio API optimise les silences complets en passant un tableau vide.
    // Si l'entrée est silencieuse, on génère manuellement 128 frames de silence (zéros).
    const isSilent = !input || input.length === 0;
    
    const left = isSilent ? new Float32Array(128) : input[0];
    const right = isSilent ? new Float32Array(128) : (input.length > 1 ? input[1] : left);
    
    // Optimisation 1 : Copie mémoire native C++ ultra-rapide
    this.leftBuffer.set(left, this.framesRecorded);
    this.rightBuffer.set(right, this.framesRecorded);
    
    this.framesRecorded += left.length; // 128 frames par appel
    
    if (this.framesRecorded >= this.bufferSize) {
      // Optimisation 2 : Transferable Objects (Zéro Copie mémoire)
      this.port.postMessage(
        {
          left: this.leftBuffer,
          right: this.rightBuffer
        },
        [this.leftBuffer.buffer, this.rightBuffer.buffer]
      );
      
      // Optimisation 3 : L'ancien buffer ayant été transféré et verrouillé, on en alloue un nouveau
      this.leftBuffer = new Float32Array(this.bufferSize);
      this.rightBuffer = new Float32Array(this.bufferSize);
      this.framesRecorded = 0;
    }
    
    return true;
  }
}

registerProcessor('recorder-worklet', RecorderWorklet);