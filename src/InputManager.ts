/**
 * O Girador Keyboard Event Manager (InputManager)
 * 
 * Manages live keyboard routing:
 *  - Handles case-sensitive and case-insensitive keys.
 *  - Implements left-handed inversion dynamics.
 *  - Prevents OS key-repeat events.
 *  - Stops Barulho looping sound on keyup.
 */

import { AudioEngine } from './AudioEngine';
import { instrumentAudioConfigs } from './data/audioConfig';
import {
  applyHandedness,
  findMatchingStroke,
  isBarulhoStroke,
} from './input/inputStrokeMatcher';

export class InputManager {
  private audioEngine: AudioEngine;
  private activeInstrumentId: string | null = null;
  private isLeftHanded: boolean = false;
  private onStrokeTriggered: ((instrumentId: string, strokeSymbol: string) => void) | null = null;

  private handleBlur = () => {
    this.audioEngine.stopAllBarulho();
  };

  constructor(audioEngine: AudioEngine) {
    this.audioEngine = audioEngine;
    window.addEventListener('blur', this.handleBlur);
  }

  public dispose(): void {
    window.removeEventListener('blur', this.handleBlur);
  }

  public setActiveInstrument(instrumentId: string | null): void {
    this.activeInstrumentId = instrumentId;
  }

  public setLeftHanded(isLeft: boolean): void {
    this.isLeftHanded = isLeft;
  }

  public setOnStrokeTriggered(callback: (instrumentId: string, strokeSymbol: string) => void): void {
    this.onStrokeTriggered = callback;
  }

  public handleKeyDown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!this.activeInstrumentId) return;

    const activeTag = document.activeElement?.tagName || '';
    if (
      activeTag === 'INPUT' ||
      activeTag === 'SELECT' ||
      activeTag === 'TEXTAREA' ||
      document.activeElement?.id === 'letras-textarea'
    ) {
      return;
    }

    const config = instrumentAudioConfigs.find((c) => c.id === this.activeInstrumentId);
    if (!config) return;

    const keyStr = applyHandedness(e.key, config, this.isLeftHanded);
    const { matchedStroke, matchedSymbol } = findMatchingStroke(keyStr, config);

    if (matchedStroke && matchedSymbol) {
      e.preventDefault();
      if (e.repeat) return;

      const now = this.audioEngine.getCurrentTime();
      this.audioEngine.playNote(this.activeInstrumentId, matchedSymbol, now, 1.0, 1.0, true);

      if (this.onStrokeTriggered) {
        this.onStrokeTriggered(this.activeInstrumentId, matchedSymbol);
      }
    }
  };

  public handleKeyUp = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!this.activeInstrumentId) return;

    const config = instrumentAudioConfigs.find((c) => c.id === this.activeInstrumentId);
    if (!config) return;

    const keyStr = applyHandedness(e.key, config, this.isLeftHanded);
    if (isBarulhoStroke(keyStr, config)) {
      e.preventDefault();
      this.audioEngine.stopBarulho(this.activeInstrumentId);
    }
  };
}
