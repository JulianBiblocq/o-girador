import React, { useState, useRef, useEffect } from 'react';
import { PresetMetadata, Language } from '../../types';
import { CordelImageEditor } from '../CordelImageEditor';

interface PresetManagerSectionProps {
  metadata: PresetMetadata;
  onMetadataChange: (newMeta: PresetMetadata) => void;
  lang: Language;
  userProfile: any;
}

export const PresetManagerSection: React.FC<PresetManagerSectionProps> = ({
  metadata,
  onMetadataChange,
  lang,
  userProfile,
}) => {
  const [showAddSignalForm, setShowAddSignalForm] = useState(false);
  const [signalCameraActive, setSignalCameraActive] = useState(false);
  const [pendingSignalImage, setPendingSignalImage] = useState<string | null>(null);
  const [pendingSignalName, setPendingSignalName] = useState('');
  const [useCordelEffect, setUseCordelEffect] = useState(false);
  const [rawSignalFrames, setRawSignalFrames] = useState<string[]>([]);
  const [flashActive, setFlashActive] = useState(false);
  const [isCapturingBurst, setIsCapturingBurst] = useState(false);
  const [burstCount, setBurstCount] = useState(0);
  const [isProcessingGif, setIsProcessingGif] = useState(false);

  const signalVideoRef = useRef<HTMLVideoElement | null>(null);
  const signalStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (signalStreamRef.current) {
        signalStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const compressAndResizeImage = (fileOrBlob: File | Blob, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 500;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
          callback(compressedBase64);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(fileOrBlob);
  };

  const handleSignalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressAndResizeImage(file, (base64) => {
        if (!pendingSignalName) {
          const nameWithoutExt = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
          setPendingSignalName(nameWithoutExt.substring(0, 30));
        }
        if (useCordelEffect) {
          setRawSignalFrames([base64]);
        } else {
          setPendingSignalImage(base64);
        }
      });
    }
    e.target.value = '';
  };

  const startSignalCamera = async () => {
    try {
      setSignalCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      signalStreamRef.current = stream;
      setTimeout(() => {
        if (signalVideoRef.current) {
          signalVideoRef.current.srcObject = stream;
          signalVideoRef.current.play().catch((e) => console.error('Video play error:', e));
        }
      }, 100);
    } catch (err) {
      console.error('Signal camera error:', err);
      setSignalCameraActive(false);
      window.alert(lang === 'fr' ? "Impossible d'accéder à la caméra." : "Não foi possível acessar a câmera.");
    }
  };

  const stopSignalCamera = () => {
    if (signalStreamRef.current) {
      signalStreamRef.current.getTracks().forEach((t) => t.stop());
      signalStreamRef.current = null;
    }
    setSignalCameraActive(false);
  };

  const captureSignalPhoto = (isBurst: boolean = true) => {
    if (isCapturingBurst || isProcessingGif) return;
    if (signalVideoRef.current) {
      setIsCapturingBurst(true);
      setBurstCount(0);
      setIsProcessingGif(false);

      const video = signalVideoRef.current;
      const frames: string[] = [];
      const totalFrames = isBurst ? 4 : 1;
      const intervalMs = isBurst ? 1000 : 0;

      const captureFrame = async (frameIndex: number) => {
        if (!signalStreamRef.current) {
          setIsCapturingBurst(false);
          return;
        }

        setFlashActive(true);
        setTimeout(() => setFlashActive(false), 150);

        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const videoWidth = video.videoWidth || 640;
          const videoHeight = video.videoHeight || 480;
          const size = Math.min(videoWidth, videoHeight);
          const sx = (videoWidth - size) / 2;
          const sy = (videoHeight - size) / 2;
          ctx.drawImage(video, sx, sy, size, size, 0, 0, 200, 200);

          const frameBase64 = canvas.toDataURL('image/jpeg', 0.4);
          frames.push(frameBase64);
          setBurstCount(frameIndex + 1);
        }

        if (frameIndex + 1 >= totalFrames) {
          setIsCapturingBurst(false);

          if (useCordelEffect) {
            setRawSignalFrames(frames);
            stopSignalCamera();
            return;
          }

          if (totalFrames === 1) {
            setPendingSignalImage(frames[0]);
            stopSignalCamera();
            return;
          }

          setIsProcessingGif(true);

          try {
            const gifshot = (await import('gifshot')).default;
            gifshot.createGIF(
              {
                images: frames,
                gifWidth: 160,
                gifHeight: 160,
                numFrames: totalFrames,
                frameDuration: 7.5,
                sampleInterval: 12,
                numWorkers: 2,
              },
              (obj: any) => {
                setIsProcessingGif(false);
                if (!obj.error) {
                  setPendingSignalImage(obj.image);
                  stopSignalCamera();
                } else {
                  console.error('GIF creation error:', obj.errorMsg);
                  window.alert(lang === 'fr' ? "Erreur lors de la génération du GIF." : "Erro ao gerar o GIF.");
                }
              }
            );
          } catch (err) {
            console.error('Failed to load gifshot:', err);
            setIsProcessingGif(false);
            window.alert(lang === 'fr' ? "Erreur de chargement du module GIF." : "Erro ao carregar o módulo GIF.");
          }
        } else {
          setTimeout(() => {
            captureFrame(frameIndex + 1);
          }, intervalMs);
        }
      };

      captureFrame(0);
    }
  };

  const handleAddLocalSignal = () => {
    if (!pendingSignalImage) return;
    const finalName = pendingSignalName.trim() || (lang === 'fr' ? 'Signal sans nom' : 'Sinal sem nome');

    const newSignal = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: finalName,
      image: pendingSignalImage,
    };
    const prev = metadata.rhythmSignals || [];
    onMetadataChange({ ...metadata, rhythmSignals: [...prev, newSignal] });
    setPendingSignalImage(null);
    setPendingSignalName('');
    setShowAddSignalForm(false);
  };

  const handleDeleteLocalSignal = (id: string) => {
    const updated = (metadata.rhythmSignals || []).filter((s) => s.id !== id);
    onMetadataChange({ ...metadata, rhythmSignals: updated });
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-[var(--cordel-bg)] cordel-border-sm mt-2">
      <span className="text-[var(--cordel-text)] font-cactus text-sm font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
        📂 {lang === 'fr' ? 'Signes Locaux' : 'Sinais Locais'}
      </span>
      <div className="flex flex-col gap-2">
        <span className="text-[8px] text-[var(--cordel-text)] opacity-60 leading-tight">
          {lang === 'fr'
            ? 'Ces images sont stockées localement dans votre projet.'
            : 'Estas imagens são armazenadas localmente no seu projeto.'}
        </span>

        {/* Galerie des signaux locaux */}
        {(metadata?.rhythmSignals || []).length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-1">
            {(metadata.rhythmSignals || []).map((sig) => (
              <div
                key={sig.id}
                className="relative group bg-[var(--cordel-bg)] cordel-border-sm overflow-hidden flex flex-col items-center justify-center aspect-square border-gray-400"
              >
                {sig.image ? (
                  <img src={sig.image} alt={sig.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-black/5 text-3xl">📢</div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1 flex flex-col text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-bold text-white truncate px-1">{sig.name}</span>
                </div>
                <div className="absolute top-1 left-1 bg-gray-500 text-white text-[8px] font-bold px-1 cordel-border-sm">Local</div>
                <button
                  onClick={() => handleDeleteLocalSignal(sig.id)}
                  className="absolute top-1 right-1 bg-[#8b2a1a] text-white font-bold text-[10px] w-5 h-5 flex items-center justify-center cordel-border-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                  title={lang === 'fr' ? 'Supprimer' : 'Excluir'}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Form Trigger */}
        {!pendingSignalImage && rawSignalFrames.length === 0 && !showAddSignalForm && (
          <button
            onClick={() => setShowAddSignalForm(true)}
            className="w-full py-2 mt-3 bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-cactus font-bold text-xs uppercase tracking-wider cordel-border-sm hover:opacity-90 transition-opacity cursor-pointer"
          >
            ➕ {lang === 'fr' ? 'Nouveau Signal Local' : 'Novo Sinal Local'}
          </button>
        )}

        {/* Add Form */}
        {!pendingSignalImage && rawSignalFrames.length === 0 && showAddSignalForm ? (
          <div className="flex flex-col gap-2 mt-3 border border-[var(--cordel-border)] border-dashed p-2 bg-black/5">
            <div className="flex justify-between items-center mb-1">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useCordelEffect}
                  onChange={(e) => setUseCordelEffect(e.target.checked)}
                  className="w-3 h-3 cursor-pointer accent-[var(--cordel-text)]"
                />
                <span className="text-[10px] text-[var(--cordel-text)] font-bold">
                  {lang === 'fr' ? '🎨 Appliquer effet Cordel' : '🎨 Aplicar efeito Cordel'}
                </span>
              </label>
              <button
                onClick={() => setShowAddSignalForm(false)}
                className="text-[12px] font-bold text-[var(--cordel-text)] hover:text-red-700 px-2 cursor-pointer"
                title={lang === 'fr' ? 'Fermer' : 'Fechar'}
              >
                ✖
              </button>
            </div>
            {signalCameraActive ? (
              <div className="flex flex-col gap-2">
                <div className="aspect-video bg-black cordel-border-sm overflow-hidden relative">
                  <video ref={signalVideoRef} className="w-full h-full object-cover" playsInline muted />
                  <div
                    className="absolute inset-0 bg-white z-20 pointer-events-none transition-opacity duration-150"
                    style={{ opacity: flashActive ? 0.7 : 0 }}
                  />
                  {(isCapturingBurst || isProcessingGif) && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 text-white z-10 select-none animate-fade-in">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] font-cactus font-bold tracking-wider uppercase">
                        {isProcessingGif
                          ? lang === 'fr' ? 'Création du GIF...' : 'Criando GIF...'
                          : `${lang === 'fr' ? 'Capture' : 'Capturando'} : ${burstCount}/4`}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => captureSignalPhoto(false)}
                    disabled={isCapturingBurst || isProcessingGif}
                    className="flex-1 py-1 text-white text-[10px] font-bold cordel-border-sm cursor-pointer bg-blue-600 hover:opacity-85 disabled:bg-blue-800 disabled:opacity-50"
                  >
                    📸 {lang === 'fr' ? 'Photo' : 'Foto'}
                  </button>
                  <button
                    onClick={() => captureSignalPhoto(true)}
                    disabled={isCapturingBurst || isProcessingGif}
                    className="flex-1 py-1 text-white text-[10px] font-bold cordel-border-sm cursor-pointer bg-emerald-600 hover:opacity-85 disabled:bg-emerald-800 disabled:opacity-50"
                  >
                    🎞️ {isProcessingGif
                      ? lang === 'fr' ? 'Création...' : 'Criando...'
                      : isCapturingBurst
                        ? `${burstCount}/4`
                        : lang === 'fr' ? 'Rafale' : 'Rajada'}
                  </button>
                  <button
                    onClick={stopSignalCamera}
                    disabled={isCapturingBurst || isProcessingGif}
                    className="py-1 px-2 text-black text-[10px] font-bold cordel-border-sm cursor-pointer bg-gray-300 hover:opacity-85 disabled:bg-gray-400 disabled:opacity-50"
                  >
                    ✖
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <label className="flex-1 py-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] text-[10px] font-bold cordel-border-sm text-center cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors flex items-center justify-center gap-1">
                  📁 {lang === 'fr' ? 'Fichier' : 'Arquivo'}
                  <input type="file" accept="image/*" onChange={handleSignalFileChange} className="hidden" />
                </label>
                <button
                  onClick={startSignalCamera}
                  className="flex-1 py-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] text-[10px] font-bold cordel-border-sm hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  📷 {lang === 'fr' ? 'Caméra' : 'Câmera'}
                </button>
              </div>
            )}
          </div>
        ) : rawSignalFrames.length > 0 ? (
          <CordelImageEditor
            frames={rawSignalFrames}
            lang={lang}
            onComplete={(result) => {
              setPendingSignalImage(result);
              setRawSignalFrames([]);
            }}
            onCancel={() => setRawSignalFrames([])}
          />
        ) : pendingSignalImage ? (
          <div className="flex flex-col gap-2 mt-3">
            <img src={pendingSignalImage} alt="preview" className="w-full max-h-24 object-contain bg-black/10 cordel-border-sm" />
            <input
              type="text"
              placeholder={lang === 'fr' ? 'Nom du signal…' : 'Nome do sinal…'}
              value={pendingSignalName}
              onChange={(e) => setPendingSignalName(e.target.value)}
              className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddLocalSignal();
              }}
              autoFocus
            />
            <div className="flex gap-2 mt-1">
              <button
                onClick={handleAddLocalSignal}
                disabled={!pendingSignalName.trim()}
                className={`flex-1 py-1 bg-black text-white cordel-border-sm text-[10px] font-bold ${
                  !pendingSignalName.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'
                }`}
              >
                {lang === 'fr' ? 'Ajouter' : 'Adicionar'}
              </button>
              <button
                onClick={() => {
                  setPendingSignalImage(null);
                  setPendingSignalName('');
                }}
                className="py-1 px-3 bg-gray-300 text-black text-[10px] font-bold cordel-border-sm hover:opacity-85 cursor-pointer"
              >
                {lang === 'fr' ? 'Annuler' : 'Cancelar'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
