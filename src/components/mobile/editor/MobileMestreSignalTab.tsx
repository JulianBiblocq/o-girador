/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Onglet Signes du Mestre Mobile (< 130 lignes).
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { tMobile } from '../../../i18n/mobileTranslations';
import { defaultCordelOptions, CordelOptions, processCordelEffectBase64 } from '../../../utils/cordelEffect';
import { uploadMestreSignal } from '../../../services/cloud-signals/mestreSignalsMutations';
import { MobileMestreCordelSliders } from './MobileMestreCordelSliders';

export const MobileMestreSignalTab: React.FC = () => {
  const lang = useSequencerStore((s) => s.lang);
  const { userProfile, currentUser } = useAuth();
  const [mode, setMode] = useState<'single' | 'four' | 'batch'>('single');
  const [name, setName] = useState('');
  const [rawImages, setRawImages] = useState<string[]>([]);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [options, setOptions] = useState<CordelOptions>({
    ...defaultCordelOptions,
    brightness: 0,
    threshold: 128,
    woodGrain: 10,
    isMirror: true,
    lockFraming: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!rawImages[0]) return;
    let cancel = false;
    processCordelEffectBase64(rawImages[0], options, 200).then((res) => {
      if (!cancel) setPreviewImg(res);
    });
    return () => { cancel = true; };
  }, [rawImages, options]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    Promise.all(
      files.map((f) => new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.readAsDataURL(f);
      }))
    ).then((imgs) => setRawImages(imgs));
  };

  const handleSave = async () => {
    const mestreId = userProfile?.mestreId || currentUser?.uid;
    if (!mestreId || !previewImg || !name.trim()) return;
    setIsSaving(true);
    try {
      const beatsCount = mode === 'four' ? 4 : 1;
      const res = await uploadMestreSignal(
        mestreId,
        name.trim(),
        previewImg,
        rawImages.length > 1 ? rawImages : undefined,
        beatsCount,
        options.isMirror,
        rawImages,
        options
      );
      if (res.success && res.signal) {
        const store = useSequencerStore.getState();
        store.setMestreSignals([...store.mestreSignals, res.signal]);
        setName('');
        setRawImages([]);
        setPreviewImg(null);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto max-h-[calc(100vh-190px)] text-[var(--cordel-text)]">
      <div className="grid grid-cols-3 gap-1 bg-[var(--cordel-bg)] p-1 rounded border border-[var(--cordel-border)]">
        {(['single', 'four', 'batch'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`py-1 text-[11px] font-mono rounded transition-colors ${
              mode === m ? 'bg-[var(--cordel-accent)] text-white font-bold' : 'hover:bg-black/5'
            }`}
          >
            {m === 'single' ? tMobile(lang, 'onePhoto') : m === 'four' ? tMobile(lang, 'fourBeats') : tMobile(lang, 'batchPhoto')}
          </button>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <div className="w-24 h-24 rounded border-2 border-[var(--cordel-border)] bg-black/5 flex items-center justify-center overflow-hidden shrink-0">
          {previewImg ? (
            <img src={previewImg} alt="Preview" className="w-full h-full object-contain" />
          ) : (
            <span className="text-[10px] text-center px-1 opacity-60">Aperçu Xilo</span>
          )}
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={tMobile(lang, 'signalName')}
            className="w-full px-2 py-1 text-xs border border-[var(--cordel-border)] rounded bg-transparent font-mono"
          />
          <div className="flex gap-1.5">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 py-1 px-2 border border-[var(--cordel-border)] rounded text-[11px] font-mono bg-[var(--cordel-bg)] hover:bg-black/5"
            >
              {tMobile(lang, 'camera')}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-1 px-2 border border-[var(--cordel-border)] rounded text-[11px] font-mono bg-[var(--cordel-bg)] hover:bg-black/5"
            >
              {tMobile(lang, 'gallery')}
            </button>
          </div>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFiles} className="hidden" />
          <input ref={fileInputRef} type="file" accept="image/*" multiple={mode !== 'single'} onChange={handleFiles} className="hidden" />
        </div>
      </div>

      <MobileMestreCordelSliders options={options} setOptions={setOptions} lang={lang} />

      <button
        onClick={handleSave}
        disabled={isSaving || !previewImg || !name.trim()}
        className="w-full py-2 bg-[var(--cordel-accent)] text-white text-xs font-mono font-bold rounded shadow disabled:opacity-40 transition-opacity"
      >
        {isSaving ? '...' : tMobile(lang, 'saveSignal')}
      </button>
    </div>
  );
};
