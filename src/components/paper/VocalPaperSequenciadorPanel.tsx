/**
 * VocalPaperSequenciadorPanel.tsx
 * Volet « Atelier Papier du Chant (Toada) » dans le Grand Atelier Papier de Sequenciador (< 130 lignes).
 */
import React, { useState, useRef } from 'react';
import { Printer, Camera, Plus, Trash2, RefreshCw, Key, CheckCircle2 } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import {
  scanAndInjectVocalPaperInSequenciador,
  getVocalOpticalApiKey,
  setVocalOpticalApiKey,
} from '../../utils/paper/vocalPaperSequenciadorHelper';
import {
  VocalPaperSheetsBasket,
  VocalCartState,
  VocalNumberingMode,
  VocalPreviewSheetId,
} from './VocalPaperSheetsBasket';

export interface VocalPaperSequenciadorPanelProps {
  lang?: 'fr' | 'pt';
  onClose?: () => void;
}

export const VocalPaperSequenciadorPanel: React.FC<VocalPaperSequenciadorPanelProps> = ({ lang = 'fr', onClose }) => {
  const bpm = useSequencerStore((s) => s.bpm) || 88;
  const metadata = useSequencerStore((s) => s.metadata);
  const [subTab, setSubTab] = useState<'print' | 'scan'>('print');
  const [title, setTitle] = useState(metadata?.toada || (metadata as { title?: string })?.title || 'Vovó falou');
  const [cart, setCart] = useState<VocalCartState>({ sequence: 1, notes: 3, rhythm: 1, instructions: 0 });
  const [numberingMode, setNumberingMode] = useState<VocalNumberingMode>('blank');
  const [previewSheet, setPreviewSheet] = useState<VocalPreviewSheetId | null>(null);
  const [photos, setPhotos] = useState<Array<{ id: string; name: string; dataUrl: string }>>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(() => !getVocalOpticalApiKey());
  const [keyDraft, setKeyDraft] = useState(() => getVocalOpticalApiKey() || '');
  const fileRef = useRef<HTMLInputElement>(null);

  const setQty = (k: keyof VocalCartState, v: number) => setCart((p) => ({ ...p, [k]: Math.max(0, Math.min(20, v)) }));

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === 'string') {
          setPhotos((prev) => [...prev, { id: `ph-${Date.now()}-${Math.random()}`, name: file.name, dataUrl: ev.target!.result as string }]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRunScan = async () => {
    if (photos.length === 0) return;
    if (keyDraft.trim()) setVocalOpticalApiKey(keyDraft.trim());
    setIsScanning(true);
    setErrorMsg(null);
    setStatusMsg(lang === 'pt' ? 'Leitura óptica das folhas de canto...' : 'Lecture optique des feuilles de chant en cours...');
    const res = await scanAndInjectVocalPaperInSequenciador(photos.map((p) => p.dataUrl), bpm, title, keyDraft.trim());
    setIsScanning(false);
    if (!res.success) { setErrorMsg(res.error || 'Lecture optique impossible'); setStatusMsg(null); return; }
    setStatusMsg(`${res.count} pattern(s) injectés dans 5. Puxador & 6. Coro (BPM Batuque ${bpm} préservé).`);
    setTimeout(() => onClose?.(), 900);
  };

  return (
    <div className="space-y-2.5 font-mono text-xs text-[var(--cordel-text)]">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b-2 border-[var(--cordel-border)]">
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setSubTab('print')} className={`px-3 py-1.5 font-bold uppercase border-2 border-[var(--cordel-border-strong)] flex items-center gap-1.5 cursor-pointer transition-colors ${subTab === 'print' ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:border-[var(--cordel-accent-readable)]'}`}><Printer className="w-3.5 h-3.5" /><span>1. Panier d&apos;Impression (A4 Paysage N&amp;B)</span></button>
          <button type="button" onClick={() => setSubTab('scan')} className={`px-3 py-1.5 font-bold uppercase border-2 border-[var(--cordel-border-strong)] flex items-center gap-1.5 cursor-pointer transition-colors ${subTab === 'scan' ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:border-[var(--cordel-accent-readable)]'}`}><Camera className="w-3.5 h-3.5" /><span>2. Photographier / Injecter dans Puxador &amp; Coro</span></button>
        </div>
        <div className="text-[11px] font-bold text-[var(--cordel-text-muted)]">BPM maître Batuque : {bpm} BPM</div>
      </div>

      {subTab === 'print' ? (
        <VocalPaperSheetsBasket
          title={title}
          bpm={bpm}
          cart={cart}
          numberingMode={numberingMode}
          previewSheet={previewSheet}
          onSetQty={setQty}
          onChangeNumberingMode={setNumberingMode}
          onChangePreviewSheet={setPreviewSheet}
        />
      ) : (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)]">
            <label className="flex items-center gap-2 font-bold text-[var(--cordel-text)]"><span>Titre Toada :</span><input value={title} onChange={(e) => setTitle(e.target.value)} className="px-2 py-1 border border-[var(--cordel-border-strong)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-bold" /></label>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setShowKey((v) => !v)} className="px-2.5 py-1 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] font-bold flex items-center gap-1 cursor-pointer transition-colors"><Key className="w-3.5 h-3.5" /><span>Clé optique</span></button>
              <button type="button" onClick={() => fileRef.current?.click()} className="px-3 py-1 bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-bold flex items-center gap-1 cursor-pointer transition-colors"><Plus className="w-3.5 h-3.5" /><span>Ajouter photo(s)</span></button>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleAddFiles} className="hidden" />
            </div>
          </div>
          {showKey && <div className="flex items-center gap-2 p-2 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface-muted)]"><input type="password" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} placeholder="Clé d'accès du service de lecture optique..." className="flex-1 px-2 py-1 border border-[var(--cordel-border-strong)] bg-[var(--cordel-bg)] text-[var(--cordel-text)]" /><button type="button" onClick={() => { setVocalOpticalApiKey(keyDraft); setShowKey(false); }} className="px-2.5 py-1 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border border-[var(--cordel-border-strong)] font-bold cursor-pointer">OK</button></div>}
          {photos.length === 0 ? <div onClick={() => fileRef.current?.click()} className="py-5 border-2 border-dashed border-[var(--cordel-border-strong)] bg-[var(--cordel-surface)] hover:bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] text-center cursor-pointer transition-colors"><Camera className="w-6 h-6 mx-auto mb-1 text-[var(--cordel-accent-readable)]" /><div className="font-bold">Cliquez pour ajouter vos photos (Feuille Séquence + Feuilles Patterns P1..Pn)</div></div> : <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">{photos.map((p, idx) => <div key={p.id} className="p-1.5 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] flex flex-col gap-1"><img src={p.dataUrl} alt={p.name} className="h-16 w-full object-cover" /><div className="flex items-center justify-between text-[10px] font-bold"><span>Page {idx + 1}</span><button type="button" onClick={() => setPhotos((arr) => arr.filter((x) => x.id !== p.id))} className="text-[var(--cordel-status-danger)] cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button></div></div>)}</div>}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)]">
            <span className="text-[11px] font-bold text-[var(--cordel-text-muted)]">Cible : Pistes 5. Puxador (idx 10) &amp; 6. Coro (idx 11) • Percussions &amp; BPM ({bpm}) intacts</span>
            <button type="button" disabled={photos.length === 0 || isScanning} onClick={handleRunScan} className="px-3.5 py-1.5 bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-[2px_2px_0_var(--cordel-shadow-color)] transition-colors"><RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} /><span>{isScanning ? 'Lecture optique...' : 'Lire et injecter dans le morceau'}</span></button>
          </div>
          {statusMsg && <div className="p-2 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-status-success)] text-[var(--cordel-on-accent)] font-bold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 shrink-0" /><span>{statusMsg}</span></div>}
          {errorMsg && <div className="p-2 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-status-danger)] text-[var(--cordel-on-accent)] font-bold">{errorMsg}</div>}
        </div>
      )}
    </div>
  );
};
