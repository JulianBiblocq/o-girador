/**
 * VocalPaperSequenciadorPanel.tsx
 * Volet « Atelier Papier du Chant (Toada) » dans le Grand Atelier Papier de Sequenciador (< 135 lignes).
 * Impression des feuilles A4 N&B (Grille Paysage 8 Temps Libres sur Feuilles 2 & 3) et injection dans 5. Puxador & 6. Coro.
 */
import React, { useState, useRef } from 'react';
import { Printer, Camera, Plus, Trash2, RefreshCw, Key, CheckCircle2 } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { printSequenciadorVocalSheet, scanAndInjectVocalPaperInSequenciador, getVocalOpticalApiKey, setVocalOpticalApiKey } from '../../utils/paper/vocalPaperSequenciadorHelper';

const VOCAL_SHEETS = [
  { id: 'sequence' as const, code: 'CHANT-SEQ', title: 'Feuille 1 — Séquence & Paroles (Pux / Cor)', desc: 'Grille M1..M32 sur 2 lignes (Pux / Cor) pour attribuer P1..Pn, X (Pause) et Unisson.' },
  { id: 'notes_1m' as const, code: 'CHANT-NOTES-1M', title: 'Feuille 2 — Patterns & Clavier 1 Octave (Paysage • 8 Temps Libres)', desc: '4 systèmes [ P__ ] A4 Paysage (32 subdivisions de 8.4mm) : TEMPS libre (1M+Ana ou 2M), OCTAVE (3/4/5), Clavier La➔Sol# & SYLLABES ouverte.' },
  { id: 'rhythm_only' as const, code: 'CHANT-RYTHME', title: 'Feuille 3 — Paroles & Rythme Seul (Paysage • 8 Temps Libres)', desc: '6 systèmes [ P__ ] A4 Paysage (32 subdivisions de 8.4mm) : bande TEMPS libre, bande RYTHME (5.5mm) + bande SYLLABES ouverte (11mm).' },
  { id: 'instructions' as const, code: 'CHANT-GUIDE', title: "Feuille 4 — Guide & Conventions d'écriture", desc: 'Mémo illustré : grille 8 temps libres (2|3|4|1|2|3|4|1 ou 2M), tirets "-" intra-mots, élisions "E\'O" et traits (───).' },
];

export interface VocalPaperSequenciadorPanelProps {
  lang?: 'fr' | 'pt';
  onClose?: () => void;
}

export const VocalPaperSequenciadorPanel: React.FC<VocalPaperSequenciadorPanelProps> = ({ lang = 'fr', onClose }) => {
  const bpm = useSequencerStore((s) => s.bpm) || 88;
  const metadata = useSequencerStore((s) => s.metadata);
  const [subTab, setSubTab] = useState<'print' | 'scan'>('print');
  const [title, setTitle] = useState(metadata?.toada || (metadata as any)?.title || 'Vovó falou');
  const [photos, setPhotos] = useState<Array<{ id: string; name: string; dataUrl: string }>>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(() => !getVocalOpticalApiKey());
  const [keyDraft, setKeyDraft] = useState(() => getVocalOpticalApiKey() || '');
  const fileRef = useRef<HTMLInputElement>(null);

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
    setIsScanning(true); setErrorMsg(null);
    setStatusMsg(lang === 'pt' ? 'Leitura óptica das folhas de canto...' : 'Lecture optique des feuilles de chant en cours...');
    const res = await scanAndInjectVocalPaperInSequenciador(photos.map((p) => p.dataUrl), bpm, title, keyDraft.trim());
    setIsScanning(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Lecture optique impossible');
      setStatusMsg(null);
      return;
    }
    setStatusMsg(`✓ ${res.count} pattern(s) injectés dans 5. Puxador & 6. Coro (BPM Batuque ${bpm} préservé).`);
    setTimeout(() => onClose?.(), 900);
  };

  return (
    <div className="space-y-3 font-mono text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b-2 border-black">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setSubTab('print')} className={`px-3 py-1.5 font-bold uppercase border-2 border-black flex items-center gap-1.5 cursor-pointer ${subTab === 'print' ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-white text-black'}`}>
            <Printer className="w-3.5 h-3.5" /><span>1. Imprimer Feuilles Vierges (100 % N&B)</span>
          </button>
          <button type="button" onClick={() => setSubTab('scan')} className={`px-3 py-1.5 font-bold uppercase border-2 border-black flex items-center gap-1.5 cursor-pointer ${subTab === 'scan' ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-white text-black'}`}>
            <Camera className="w-3.5 h-3.5" /><span>2. Photographier / Injecter dans Puxador & Coro</span>
          </button>
        </div>
        <div className="text-[11px] font-bold">BPM maître Batuque : {bpm} BPM</div>
      </div>

      {subTab === 'print' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {VOCAL_SHEETS.map((sh) => (
            <div key={sh.id} className="p-3 border-2 border-black bg-white flex flex-col justify-between gap-2">
              <div>
                <div className="flex items-center justify-between gap-1 font-bold"><span>{sh.title}</span><span className="text-[10px] px-1 border border-black">[{sh.code}]</span></div>
                <p className="text-[11px] opacity-80 mt-1">{sh.desc}</p>
              </div>
              <button type="button" onClick={() => printSequenciadorVocalSheet(sh.id, { title, bpm, timeSignature: '4/4' })} className="self-end px-3 py-1 bg-[#8b2a1a] text-[#f4ecd8] font-bold flex items-center gap-1.5 cursor-pointer">
                <Printer className="w-3.5 h-3.5" /><span>Imprimer A4 N&B</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 border-2 border-black bg-white">
            <label className="flex items-center gap-2 font-bold"><span>Titre Toada :</span><input value={title} onChange={(e) => setTitle(e.target.value)} className="px-2 py-1 border border-black font-bold" /></label>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setShowKey((v) => !v)} className="px-2.5 py-1 border-2 border-black bg-white font-bold flex items-center gap-1 cursor-pointer"><Key className="w-3.5 h-3.5" /><span>Clé optique</span></button>
              <button type="button" onClick={() => fileRef.current?.click()} className="px-3 py-1 bg-[#8b2a1a] text-[#f4ecd8] font-bold flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /><span>Ajouter photo(s)</span></button>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleAddFiles} className="hidden" />
            </div>
          </div>
          {showKey && (
            <div className="flex items-center gap-2 p-2 border-2 border-black bg-amber-50">
              <input type="password" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} placeholder="Clé d'accès du service de lecture optique..." className="flex-1 px-2 py-1 border border-black bg-white" />
              <button type="button" onClick={() => { setVocalOpticalApiKey(keyDraft); setShowKey(false); }} className="px-2.5 py-1 bg-black text-white font-bold cursor-pointer">OK</button>
            </div>
          )}
          {photos.length === 0 ? (
            <div onClick={() => fileRef.current?.click()} className="py-6 border-2 border-dashed border-black bg-white text-center cursor-pointer">
              <Camera className="w-6 h-6 mx-auto mb-1 text-[#8b2a1a]" />
              <div className="font-bold">Cliquez pour ajouter vos photos (Feuille Séquence + Feuilles Patterns P1..Pn)</div>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map((p, idx) => (
                <div key={p.id} className="p-1.5 border-2 border-black bg-white flex flex-col gap-1">
                  <img src={p.dataUrl} alt={p.name} className="h-16 w-full object-cover" />
                  <div className="flex items-center justify-between text-[10px] font-bold"><span>Page {idx + 1}</span><button type="button" onClick={() => setPhotos((arr) => arr.filter((x) => x.id !== p.id))} className="text-red-700 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button></div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between p-2.5 border-2 border-black bg-white">
            <span className="text-[11px] font-bold">Cible : Pistes 5. Puxador (idx 10) & 6. Coro (idx 11) • Percussions & BPM ({bpm}) intacts</span>
            <button type="button" disabled={photos.length === 0 || isScanning} onClick={handleRunScan} className="px-3.5 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Lecture optique...' : 'Lire et injecter dans le morceau'}</span>
            </button>
          </div>
          {statusMsg && <div className="p-2 border-2 border-emerald-700 bg-emerald-50 text-emerald-900 font-bold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /><span>{statusMsg}</span></div>}
          {errorMsg && <div className="p-2 border-2 border-red-700 bg-red-50 text-red-900 font-bold">{errorMsg}</div>}
        </div>
      )}
    </div>
  );
};
