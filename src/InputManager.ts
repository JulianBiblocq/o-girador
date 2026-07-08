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
import { instrumentAudioConfigs, StrokeMapping, InstrumentAudioConfig } from './data/audioConfig';

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

    // Stop all barulhos if the user switches tabs or the window loses focus
    window.addEventListener('blur', this.handleBlur);
  }

  /**
   * Cleans up global listeners to prevent memory leaks.
   */
  public dispose(): void {
    window.removeEventListener('blur', this.handleBlur);
  }

  /**
   * Sets the active instrument ID to route keyboard strikes to.
   */
  public setActiveInstrument(instrumentId: string | null): void {
    this.activeInstrumentId = instrumentId;
  }

  /**
   * Sets the global left-handed preference.
   */
  public setLeftHanded(isLeft: boolean): void {
    this.isLeftHanded = isLeft;
  }

  /**
   * Register a callback to notify UI components (e.g. for hits animations).
   */
  public setOnStrokeTriggered(callback: (instrumentId: string, strokeSymbol: string) => void): void {
    this.onStrokeTriggered = callback;
  }

  /**
   * Maps left-handed / right-handed symmetrical key stroke switches.
   */
  private applyHandedness(key: string, config: InstrumentAudioConfig): string {
    if (!config.leftHandedSupport || !this.isLeftHanded) return key;
    const map: Record<string, string> = {
      D: 'E',
      E: 'D',
      Q: 'D',
      d: 'e',
      e: 'd',
      q: 'd',
      R: 'r',
      r: 'R'
    };
    return map[key] ?? key;
  }

  /**
   * Global keydown handler.
   */
  public handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.activeInstrumentId) return;

    // Bypass if typing inside form inputs, textareas, etc.
    const activeTag = document.activeElement?.tagName || '';
    if (activeTag === 'INPUT' || activeTag === 'SELECT' || activeTag === 'TEXTAREA' || document.activeElement?.id === 'letras-textarea') {
      return;
    }

    const config = instrumentAudioConfigs.find(c => c.id === this.activeInstrumentId);
    if (!config) return;

    const keyStr = this.applyHandedness(e.key, config);

    // Find the mapped stroke
    let matchedStroke: StrokeMapping | null = null;
    let matchedSymbol: string | null = null;

    for (const stroke of config.strokes) {
      if (stroke.caseSensitive) {
        if (stroke.keys.includes(keyStr)) {
          matchedStroke = stroke;
          matchedSymbol = stroke.symbol;
          break;
        }
      } else {
        const found = stroke.keys.some(k => k.toLowerCase() === keyStr.toLowerCase());
        if (found) {
          matchedStroke = stroke;
          matchedSymbol = stroke.symbol;
          break;
        }
      }
    }

    if (matchedStroke && matchedSymbol) {
      // Prevent browser default actions (like arrow scroll or space-play conflicts)
      e.preventDefault();

      // Prevent OS repeat events from firing repeatedly
      if (e.repeat) {
        return;
      }

      // Play stroke
      const now = this.audioEngine.getCurrentTime();
      this.audioEngine.playNote(this.activeInstrumentId, matchedSymbol, now, 1.0, 1.0);

      // Trigger UI callback
      if (this.onStrokeTriggered) {
        this.onStrokeTriggered(this.activeInstrumentId, matchedSymbol);
      }
    }
  };

  /**
   * Global keyup handler.
   */
  public handleKeyUp = (e: KeyboardEvent): void => {
    if (!this.activeInstrumentId) return;

    const config = instrumentAudioConfigs.find(c => c.id === this.activeInstrumentId);
    if (!config) return;

    const keyStr = this.applyHandedness(e.key, config);

    // Find if this key is a barulho sound to stop it
    let isBarulhoKey = false;
    for (const stroke of config.strokes) {
      if (stroke.isBarulho) {
        if (stroke.caseSensitive) {
          if (stroke.keys.includes(keyStr)) {
            isBarulhoKey = true;
            break;
          }
        } else {
          if (stroke.keys.some(k => k.toLowerCase() === keyStr.toLowerCase())) {
            isBarulhoKey = true;
            break;
          }
        }
      }
    }

    if (isBarulhoKey) {
      e.preventDefault();
      this.audioEngine.stopBarulho(this.activeInstrumentId);
    }
  };
}
