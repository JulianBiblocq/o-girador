import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useBalancoAudioCapture } from './useBalancoAudioCapture';
import { BalancoCaptureMetronomeBar } from './BalancoCaptureMetronomeBar';
import { BalancoCapturePad } from './BalancoCapturePad';
import { useBalancoHardwareInput } from './useBalancoHardwareInput';
import { flashLed } from './balancoCaptureUtils';

interface BalancoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureComplete: (offsets: [number, number, number, number]) => void;
  lang: Language;
}

export const BalancoCaptureModal: React.FC<BalancoCaptureModalProps> = ({
  isOpen,
  onClose,
  onCaptureComplete,
  lang
}) => {
  const initialBpm = useSequencerStore((state) => state.measureBpms[0] || 100);
  const [captureBpm, setCaptureBpm] = useState<number>(initialBpm);
  const [cycleMeasures, setCycleMeasures] = useState<4 | 8>(4);

  useEffect(() => {
    if (isOpen) setCaptureBpm(initialBpm);
  }, [isOpen, initialBpm]);

  const padRef = useRef<HTMLButtonElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const railTrackRef = useRef<HTMLDivElement>(null);
  const leftLedRef = useRef<HTMLDivElement>(null);
  const rightLedRef = useRef<HTMLDivElement>(null);

  const capture = useBalancoAudioCapture(
    isOpen,
    captureBpm,
    cycleMeasures,
    cursorRef,
    railTrackRef,
    leftLedRef,
    rightLedRef,
    flashLed,
    onCaptureComplete,
    onClose
  );

  const { handlePointerHit } = useBalancoHardwareInput(isOpen, padRef, capture.registerHit);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 select-none" onClick={onClose}>
      <div className="bg-[#f4ecd8] border-[3px] border-[#1a1a1a] p-6 max-w-md w-full rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col gap-5 text-[#1a1a1a]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b-2 border-[#1a1a1a] pb-2">
          <h3 className="font-cactus text-2xl font-bold flex items-center gap-2">
            {lang === 'fr' ? 'Capture de Balanço' : 'Captura de Balanço'}
          </h3>
          <button onClick={onClose} className="text-xl font-bold hover:text-[#8b2a1a] cursor-pointer"></button>
        </div>

        <div className="flex items-center justify-between bg-[#eaddcf]/50 p-3 border border-black/15 rounded-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs uppercase">{lang === 'fr' ? 'Cycle :' : 'Ciclo :'}</span>
            <div className="flex gap-1">
              {([4, 8] as const).map((count) => (
                <button
                  key={count}
                  type="button"
                  disabled={capture.phase !== 'idle'}
                  onClick={() => setCycleMeasures(count)}
                  className={`px-2.5 py-1 text-xs font-bold border border-black cursor-pointer shadow-[1px_1px_0px_#000] disabled:opacity-50 ${
                    cycleMeasures === count ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-white text-black hover:bg-black hover:text-white'
                  }`}
                >
                  {count} {lang === 'fr' ? 'mes.' : 'comp.'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-white px-2 py-1 border border-black shadow-[1px_1px_0px_#000]">
            <span></span>
            <button type="button" disabled={capture.phase !== 'idle'} onClick={() => setCaptureBpm(b => Math.max(40, b - 5))} className="w-6 h-6 flex items-center justify-center font-bold text-xs bg-[#eaddcf] border border-black hover:bg-black hover:text-white cursor-pointer disabled:opacity-40">-5</button>
            <input type="number" min={40} max={240} disabled={capture.phase !== 'idle'} value={captureBpm} onChange={(e) => setCaptureBpm(Math.max(40, Math.min(240, parseInt(e.target.value, 10) || 100)))} className="w-12 text-center font-cactus text-sm font-bold bg-transparent border-b border-black/30 outline-none disabled:opacity-50" />
            <button type="button" disabled={capture.phase !== 'idle'} onClick={() => setCaptureBpm(b => Math.min(240, b + 5))} className="w-6 h-6 flex items-center justify-center font-bold text-xs bg-[#eaddcf] border border-black hover:bg-black hover:text-white cursor-pointer disabled:opacity-40">+5</button>
          </div>
        </div>

        <BalancoCaptureMetronomeBar lang={lang} leftLedRef={leftLedRef} rightLedRef={rightLedRef} railTrackRef={railTrackRef} cursorRef={cursorRef} />

        <BalancoCapturePad
          phase={capture.phase}
          prerollCount={capture.prerollCount}
          hitCount={capture.hitCount}
          lang={lang}
          padRef={padRef}
          onPointerHit={handlePointerHit}
          onStartCapture={capture.startCapture}
        />

        <div className="bg-[#eaddcf]/40 border border-black/15 p-2.5 rounded-sm text-[10px] leading-relaxed text-[#333]">
          {lang === 'fr' ? 'Note : Clavier et écran tactile sont sujets à une latence matérielle (~15 ms). Pour une capture chirurgicale, privilégiez un pad MIDI.' : 'Nota: Teclado e tela sensível ao toque sofrem com latência (~15 ms). Para captura cirúrgica, prefira um pad MIDI.'}
        </div>
      </div>
    </div>
  );
};
