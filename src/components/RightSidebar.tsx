/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TrackGroup, Language, PresetMetadata } from '../types';
import { i18n, instrumentsConfig } from '../data';

interface RightSidebarProps {
  lang: Language;
  activePanel: 'legend' | 'letras' | null;
  onTogglePanel: (panel: 'legend' | 'letras') => void;
  tracks: TrackGroup[];
  letras: string;
  onLetrasChange: (val: string) => void;
  onExtractLyrics?: () => void;
  metadata?: PresetMetadata;
  onMetadataChange?: (val: PresetMetadata) => void;
  currentPlayState: {
    stepIndex: number;
    maxTicks: number;
    activePatternIdByInst: { [instIdx: number]: number | null };
  } | null;
  totalMeasures: number;
  whistleVol?: number;
  onWhistleVolChange?: (val: number) => void;
}

const RightSidebarComponent: React.FC<RightSidebarProps> = ({
  lang,
  activePanel,
  onTogglePanel,
  tracks,
  letras,
  onLetrasChange,
  onExtractLyrics,
  metadata,
  onMetadataChange,
  currentPlayState,
  totalMeasures,
  whistleVol,
  onWhistleVolChange,
}) => {
  const [signalCameraActive, setSignalCameraActive] = React.useState<boolean>(false);
  const signalVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const signalStreamRef = React.useRef<MediaStream | null>(null);
  const [subTab, setSubTab] = React.useState<'toada' | 'info'>('info');
  const [pendingSignalImage, setPendingSignalImage] = React.useState<string | null>(null);
  const [pendingSignalName, setPendingSignalName] = React.useState<string>('');

  // Stop camera stream on unmount
  React.useEffect(() => {
    return () => {
      if (signalStreamRef.current) {
        signalStreamRef.current.getTracks().forEach(track => track.stop());
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
        setPendingSignalImage(base64);
        if (!pendingSignalName) {
          const nameWithoutExt = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
          setPendingSignalName(nameWithoutExt.substring(0, 30));
        }
      });
    }
    e.target.value = '';
  };

  const startSignalCamera = async () => {
    try {
      setSignalCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      signalStreamRef.current = stream;
      setTimeout(() => {
        if (signalVideoRef.current) {
          signalVideoRef.current.srcObject = stream;
          signalVideoRef.current.play().catch(e => console.error('Video play error:', e));
        }
      }, 100);
    } catch (err) {
      console.error('Signal camera error:', err);
      setSignalCameraActive(false);
      window.alert(lang === 'fr' 
        ? "Impossible d'accéder à la caméra."
        : "Não foi possível acessar a câmera.");
    }
  };

  const stopSignalCamera = () => {
    if (signalStreamRef.current) {
      signalStreamRef.current.getTracks().forEach(t => t.stop());
      signalStreamRef.current = null;
    }
    setSignalCameraActive(false);
  };

  const captureSignalPhoto = () => {
    if (signalVideoRef.current) {
      const video = signalVideoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            compressAndResizeImage(blob, (base64) => {
              setPendingSignalImage(base64);
              stopSignalCamera();
            });
          }
        }, 'image/jpeg', 0.5);
      }
    }
  };

  const handleAddSignal = () => {
    if (!pendingSignalImage || !onMetadataChange || !metadata) return;
    const newSignal = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: pendingSignalName.trim() || (lang === 'fr' ? 'Signal sans nom' : 'Sinal sem nome'),
      image: pendingSignalImage,
    };
    const prev = metadata.rhythmSignals || [];
    onMetadataChange({ ...metadata, rhythmSignals: [...prev, newSignal] });
    setPendingSignalImage(null);
    setPendingSignalName('');
  };

  const handleDeleteSignal = (id: string) => {
    if (!onMetadataChange || !metadata) return;
    const updated = (metadata.rhythmSignals || []).filter(s => s.id !== id);
    onMetadataChange({ ...metadata, rhythmSignals: updated });
  };

  const t = (key: string) => {
    const section = i18n[lang];
    return (section as any)[key] || key;
  };

  if (!activePanel) return null;

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return '';
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    const videoId = match ? match[1] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
  };

  // Render localized HTML strings safely for the gold rule
  const goldRuleHtml = t('goldRule');

  return (
    <>
      <div
        id="right-sidebar-panel"
        className="w-[340px] min-w-[340px] bg-[var(--cordel-bg)] cordel-bg border-l-[3px] border-[var(--cordel-border)] flex flex-col h-full transition-all duration-300 relative z-10 text-[var(--cordel-text)]"
      >
        {/* --- LEGEND SECTION --- */}
        {activePanel === 'legend' && (
        <div className="flex flex-col p-5 h-full overflow-y-auto">
          <div className="flex justify-between items-center border-b-[3px] border-[var(--cordel-border)] pb-3 mb-4">
            <span className="font-cactus font-bold text-2xl text-[var(--cordel-text)] tracking-wider uppercase font-medium">
              {t('legend')}
            </span>
            <button
              onClick={() => onTogglePanel('legend')}
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button px-2 py-1 text-sm font-bold hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors hidden md:block"
              title={t('toggleLegendBtn')}
            >
              ▶
            </button>
          </div>

          <div className="flex flex-col gap-1.5 pr-1 flex-grow">
            {/* Shortcuts & Gestures */}
            <div className="relative flex flex-col gap-1 bg-[var(--cordel-bg)] cordel-border-sm p-2">
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                {t('seqLegendTitle')}
              </span>
              <div className="text-[11px] text-[var(--cordel-text)] leading-relaxed">
                <p className="font-bold text-[var(--cordel-wood)] dark:text-[#f1c40f] mt-0.5 mb-0.5">
                  {t('seqDesktopTitle')}
                </p>
                <p dangerouslySetInnerHTML={{ __html: t('seqDesktopKeys') }} className="mb-2 pl-1" />
                <p className="font-bold text-[var(--cordel-wood)] dark:text-[#f1c40f] mb-0.5">
                  {t('seqMobileTitle')}
                </p>
                <p dangerouslySetInnerHTML={{ __html: t('seqMobileKeys') }} className="pl-1" />
              </div>
            </div>

            {/* Recording & WAV Export */}
            <div className="relative flex flex-col gap-1 bg-[var(--cordel-bg)] cordel-border-sm p-2">
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                {t('wavExportTitle')}
              </span>
              <div className="text-[11px] text-[var(--cordel-text)] leading-relaxed">
                <p dangerouslySetInnerHTML={{ __html: t('wavExportDesc') }} />
              </div>
            </div>

            {/* Offline Mode */}
            <div className="relative flex flex-col gap-1 bg-[var(--cordel-bg)] cordel-border-sm p-2">
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                {t('pwaOfflineTitle')}
              </span>
              <div className="text-[11px] text-[var(--cordel-text)] leading-relaxed">
                <p dangerouslySetInnerHTML={{ __html: t('pwaOfflineDesc') }} />
              </div>
            </div>


            {/* Vocals */}
            <div className="relative flex flex-col gap-1 bg-[var(--cordel-bg)] cordel-border-sm p-2">
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                {t('voiceLegendTitle')}
              </span>
              <div className="text-xs text-[var(--cordel-text)] leading-relaxed">
                <p dangerouslySetInnerHTML={{ __html: t('voiceLegend1') }} />
                <p dangerouslySetInnerHTML={{ __html: t('voiceLegend2') }} />
              </div>
            </div>

            {/* Gold Rule */}
            <div
              className="text-[11px] mt-2 mb-1 text-[var(--cordel-text)] font-bold leading-relaxed border-l-4 border-[var(--cordel-border)] pl-2"
              dangerouslySetInnerHTML={{ __html: goldRuleHtml }}
            />

            {/* Instruments Details */}
            <div className="relative flex flex-col gap-1 bg-[var(--cordel-bg)] cordel-border-sm p-2">
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                {t('alfaiaCaixa')}
              </span>
              <div className="flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[var(--cordel-text)] text-[var(--cordel-bg)]">
                    D / d
                  </span>
                  <span>{t('mainDroite')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-transparent border-[2px] border-[var(--cordel-border)] text-[var(--cordel-text)]">
                    E / e
                  </span>
                  <span>{t('mainGauche')}</span>
                </div>
              </div>
            </div>

            {/* Alfaia Specific Strokes */}
            <div className="relative flex flex-col gap-1 bg-[var(--cordel-bg)] cordel-border-sm p-2">
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                🥁 Alfaia (Extras)
              </span>
              <div className="flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#8c7b7b] text-[#f4ecd8]">
                    X / x
                  </span>
                  <span>{t('legendAlfaiaCerclage')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#ff8da1] text-[#1a1a1a]">
                    I / i
                  </span>
                  <span>{t('legendAlfaiaIguarassu')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#4c1c1c] text-[#f4ecd8]">
                    t
                  </span>
                  <span>{t('legendAlfaiaBarulho')}</span>
                </div>
              </div>
            </div>

            {/* Caixa Specific Strokes */}
            <div className="relative flex flex-col gap-1 bg-[var(--cordel-bg)] cordel-border-sm p-2">
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                🥁 Caixa (Extras)
              </span>
              <div className="flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#a855f7] text-[#f4ecd8]">
                    R / r
                  </span>
                  <span>{t('legendCaixaRufadaD')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#d8b4fe] text-[#1a1a1a]">
                    Z / z
                  </span>
                  <span>{t('legendCaixaRufadaG')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#7e7b8c] text-[#f4ecd8]">
                    X / x
                  </span>
                  <span>{t('legendCaixaCerclage')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#d946ef] text-[#f4ecd8]">
                    F / f
                  </span>
                  <span>{t('legendCaixaFla')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#4a044e] text-[#f4ecd8]">
                    t
                  </span>
                  <span>{t('legendCaixaBarulho')}</span>
                </div>
              </div>
            </div>

            {/* Tarol Specific Strokes */}
            <div className="relative flex flex-col gap-1 bg-[var(--cordel-bg)] cordel-border-sm p-2">
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                🥁 Tarol (Extras)
              </span>
              <div className="flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#3a506b] text-[#f4ecd8]">
                    X
                  </span>
                  <span>{t('legendTarolCerclage')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#60a5fa] text-[#1a1a1a]">
                    F
                  </span>
                  <span>{t('legendTarolFla')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#bfdbfe] text-[#1a1a1a]">
                    C
                  </span>
                  <span>{t('legendTarolClick')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#10b981] text-[#f4ecd8]">
                    T
                  </span>
                  <span>{t('legendTarolTremer')}</span>
                </div>
              </div>
            </div>

            {/* Gongue */}
            <div className="relative flex flex-col gap-1 bg-[var(--cordel-bg)] cordel-border-sm p-2">
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                {t('gongueLegend')}
              </span>
              <div className="flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[var(--cordel-text)] text-[var(--cordel-bg)]">
                    G / g
                  </span>
                  <span>{t('gongueGrave')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-transparent border-[2px] border-[var(--cordel-border)] text-[var(--cordel-text)]">
                    A / a
                  </span>
                  <span>{t('gongueAigu')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#6d4c41] text-[#f4ecd8]">
                    t
                  </span>
                  <span>{t('gongueBarulho')}</span>
                </div>
              </div>
            </div>

            {/* Agbe */}
            <div className="relative flex flex-col gap-1 bg-[var(--cordel-bg)] cordel-border-sm p-2">
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                {t('agbeLegend')}
              </span>
              <div className="flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[var(--cordel-text)] text-[var(--cordel-bg)]">
                    E / e
                  </span>
                  <span>{t('agbeG')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-transparent border-[2px] border-[var(--cordel-border)] text-[var(--cordel-text)]">
                    D / d
                  </span>
                  <span>{t('agbeD')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#dcfce7] text-[#1a1a1a]">
                    S / s
                  </span>
                  <span>{t('legendAgbeSaut')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#052e16] text-[#f4ecd8]">
                    t
                  </span>
                  <span>{t('legendAgbeBarulho')}</span>
                </div>
              </div>
            </div>

            {/* Mineiro */}
            <div className="relative flex flex-col gap-1 bg-[var(--cordel-bg)] cordel-border-sm p-2">
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                {t('mineiroLegend')}
              </span>
              <div className="flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[var(--cordel-text)] text-[var(--cordel-bg)]">
                    P / p
                  </span>
                  <span>{t('mineiroP')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-transparent border-[2px] border-[var(--cordel-border)] text-[var(--cordel-text)]">
                    T / t
                  </span>
                  <span>{t('mineiroT')}</span>
                </div>
              </div>
            </div>

            {/* Contact & Feedback */}
            <div className="relative flex flex-col gap-1 bg-[var(--cordel-bg)] cordel-border-sm p-3 text-center mt-2 shrink-0">
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                {t('feedbackTitle')}
              </span>
              <p className="text-[10px] text-[var(--cordel-text)] leading-relaxed mb-1.5">
                {lang === 'fr' 
                  ? "Une idée, un bug ou un retour ? Venez en discuter sur le forum !" 
                  : "Uma ideia, um bug ou feedback? Venha conversar no fórum!"}
              </p>
              <button
                onClick={() => window.open('https://github.com/JulianBiblocq/BaqueMix/issues', '_blank')}
                className="bg-[#27ae60] text-[#1a1a1a] hover:opacity-90 px-3 py-1 text-xs font-bold cordel-border-sm cursor-pointer mx-auto flex items-center gap-1"
              >
                <span>💬</span>
                <span>{t('feedbackBtn')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- LETRAS / TOADA SECTION --- */}
      {activePanel === 'letras' && (
        <div className="flex flex-col p-5 h-full overflow-hidden">
          <div className="flex justify-between items-center border-b-[3px] border-[var(--cordel-border)] pb-3 mb-4 shrink-0">
            <span className="font-cactus font-bold text-2xl text-[var(--cordel-text)] tracking-wider uppercase font-medium">
              {t('letrasTitle')}
            </span>
            <button
              onClick={() => onTogglePanel('letras')}
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button px-2 py-1 text-sm font-bold hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors hidden md:block"
            >
              X
            </button>
          </div>

          {/* Sub-tab Selector */}
          <div className="flex gap-2 mb-4 shrink-0">
            <button
              onClick={() => setSubTab('toada')}
              className={`flex-1 py-1.5 font-cactus font-bold text-xs uppercase cordel-border-sm cursor-pointer transition-colors ${
                subTab === 'toada'
                  ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
                  : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)]/10'
              }`}
            >
              📝 {lang === 'fr' ? 'Paroles' : 'Letra'}
            </button>
            <button
              onClick={() => setSubTab('info')}
              className={`flex-1 py-1.5 font-cactus font-bold text-xs uppercase cordel-border-sm cursor-pointer transition-colors ${
                subTab === 'info'
                  ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
                  : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)]/10'
              }`}
            >
              ℹ️ Info
            </button>
          </div>

          {/* Tab 1: Paroles / Lyrics */}
          {subTab === 'toada' && (
            <div className="flex flex-col flex-grow overflow-hidden min-h-0">
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus mb-1 shrink-0">
                {lang === 'fr' ? 'Paroles de la Toada' : 'Letra da Toada'}
              </span>
              <textarea
                id="letras-textarea"
                placeholder={t('letrasPlaceholder')}
                value={letras}
                onChange={(e) => onLetrasChange(e.target.value)}
                className="w-full h-[150px] min-h-[100px] bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[2px] border-[var(--cordel-border)] p-2 font-sans text-xs outline-none resize-none focus:border-[var(--cordel-border)] mb-4 shrink-0"
              />
              
              {onExtractLyrics && (
                <button
                  onClick={onExtractLyrics}
                  className="w-full py-1.5 bg-[#8b2a1a] text-[#f4ecd8] text-xs font-bold cordel-border-sm hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer mb-4 shrink-0 flex items-center justify-center gap-1.5"
                  title={t('extractBtn')}
                >
                  <span>{t('extractBtn')}</span>
                </button>
              )}
              
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus mb-1 shrink-0">
                🎤 Karaokê
              </span>

              {/* Karaoke Viewer Container */}
              <div className="flex-grow overflow-y-auto min-h-0 pr-1 custom-scrollbar">
                {(() => {
                  const voiceTracks = tracks.filter(t => instrumentsConfig[t.instrumentIdx]?.type === 'voice' && !t.isMute);
                  if (voiceTracks.length === 0) {
                    return (
                      <div className="text-[var(--cordel-text)] font-sans font-bold text-xs text-center mt-6 italic opacity-70">
                        {lang === 'fr' 
                          ? 'Ajoutez une piste de voix (non mutée) pour voir le karaoké.'
                          : 'Adicione uma faixa de Voz/Coro (não mutada) para ver o karaokê.'}
                      </div>
                    );
                  }

                  // Determine which pattern is active per instrument (for karaoke turn)
                  const activeByInst = currentPlayState?.activePatternIdByInst ?? {};

                  type Token = { trackId: number; patternId: number; stepIdx: number; displayText: string; hasSpace: boolean; color: string; instIdx: number; isBreak?: boolean };
                  const allTokens: Token[] = [];
                  voiceTracks.forEach(t => {
                    const inst = instrumentsConfig[t.instrumentIdx];
                    t.patterns.forEach(ptn => {
                      let addedTokensForPattern = false;
                      for (let i = 0; i < ptn.steps; i++) {
                        const state = ptn.activeSteps[i];
                        const lyric = ptn.lyrics[i];
                        if (!state || state === 0 || !lyric || lyric.trim() === '') continue;
                        const isPux = state === 'P';
                        const color = isPux ? inst.colors['P'] : inst.colors['C'];
                        
                        // Respect user's explicit trailing spaces
                        const hasSpace = lyric.endsWith(' ');
                        const displayText = lyric.replace(/-$/, '').trim();
                        
                        allTokens.push({ trackId: t.id, patternId: ptn.id, stepIdx: i, displayText, hasSpace, color, instIdx: t.instrumentIdx });
                        addedTokensForPattern = true;
                      }
                      if (addedTokensForPattern) {
                        allTokens.push({ trackId: t.id, patternId: ptn.id, stepIdx: -1, displayText: '', hasSpace: false, color: '', instIdx: t.instrumentIdx, isBreak: true });
                      }
                    });
                  });

                  return (
                    <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm p-3 font-sans">
                      <div className="flex flex-wrap gap-y-2 leading-loose text-base">
                        {(() => {
                          const words: Token[][] = [];
                          let currentWord: Token[] = [];
                          allTokens.forEach(tok => {
                            if (tok.isBreak) {
                              if (currentWord.length > 0) {
                                words.push(currentWord);
                                currentWord = [];
                              }
                              words.push([tok]);
                              return;
                            }
                            currentWord.push(tok);
                            if (tok.hasSpace) {
                              words.push(currentWord);
                              currentWord = [];
                            }
                          });
                          if (currentWord.length > 0) words.push(currentWord);

                          return words.map((word, wordIdx) => {
                            if (word[0].isBreak) {
                              return <div key={`break-${wordIdx}`} className="w-full h-1" />;
                            }
                            return (
                              <span key={`word-${wordIdx}`} className="inline">
                                {word.map((tok, idx) => {
                                  const t = voiceTracks.find(x => x.id === tok.trackId);
                                  if (!t) return null;

                                  const groupActiveId = activeByInst[tok.instIdx];
                                  const isThisPatternActive = currentPlayState !== null && (groupActiveId === tok.patternId || groupActiveId === undefined || groupActiveId === null);
                                  const activePattern = t.patterns.find(p => p.id === tok.patternId);
                                  if (!activePattern) return null;

                                  const currentStep = (isThisPatternActive && currentPlayState)
                                    ? Math.floor((currentPlayState.stepIndex / currentPlayState.maxTicks) * activePattern.steps)
                                    : -1;
                                  
                                  const isHighlighted = isThisPatternActive && currentStep === tok.stepIdx;

                                  return (
                                    <span
                                      key={`${tok.trackId}-${tok.patternId}-${tok.stepIdx}-${idx}`}
                                      className={`transition-all duration-100 font-bold ${
                                        isHighlighted ? 'scale-110 cordel-border-sm px-1' : ''
                                      }`}
                                      style={{
                                        backgroundColor: isHighlighted ? 'var(--cordel-text)' : 'transparent',
                                        color: isHighlighted ? 'var(--cordel-bg)' : 'var(--cordel-text)',
                                        marginRight: tok.hasSpace ? '6px' : '0px',
                                      }}
                                    >
                                      {tok.displayText}
                                    </span>
                                  );
                                })}
                              </span>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Tab 2: Informations */}
          {subTab === 'info' && (
            <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar min-h-0">
              {metadata && onMetadataChange ? (
                <div className="flex flex-col gap-2 p-3 bg-[var(--cordel-bg)] cordel-border-sm">
                  <span className="text-[var(--cordel-text)] font-cactus text-sm font-bold uppercase tracking-wider mb-1">
                    {t('metaInfo')}
                  </span>
                  <input
                    type="text"
                    placeholder={t('metaToada')}
                    value={metadata.toada}
                    onChange={(e) => onMetadataChange({ ...metadata, toada: e.target.value })}
                    className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
                  />
                  <input
                    type="text"
                    placeholder={t('metaNacao')}
                    value={metadata.nacao}
                    onChange={(e) => onMetadataChange({ ...metadata, nacao: e.target.value })}
                    className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
                  />
                  <input
                    type="text"
                    placeholder={t('metaCompositor')}
                    value={metadata.compositor}
                    onChange={(e) => onMetadataChange({ ...metadata, compositor: e.target.value })}
                    className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
                  />
                  <input
                    type="text"
                    placeholder={t('metaRitmo')}
                    value={metadata.ritmo}
                    onChange={(e) => onMetadataChange({ ...metadata, ritmo: e.target.value })}
                    className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
                  />
                  <input
                    type="text"
                    placeholder={lang === 'pt' ? 'Link do YouTube' : 'Lien YouTube'}
                    value={metadata.youtubeUrl || ''}
                    onChange={(e) => onMetadataChange({ ...metadata, youtubeUrl: e.target.value })}
                    className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
                  />
                  {metadata.youtubeUrl && getYouTubeEmbedUrl(metadata.youtubeUrl) && (
                    <div className="mt-2 aspect-video w-full rounded-none overflow-hidden cordel-border-sm">
                      <iframe 
                        width="100%" 
                        height="100%" 
                        src={getYouTubeEmbedUrl(metadata.youtubeUrl)} 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                      />
                    </div>
                  )}

                  {/* === Section Signaux du Rythme === */}
                  <div className="border-t border-[var(--cordel-border)]/20 pt-2 mt-2 flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                      🥁 {lang === 'fr' ? 'Signaux du rythme' : 'Sinais do ritmo'}
                    </span>
                    <span className="text-[8px] text-[var(--cordel-text)] opacity-60 leading-tight">
                      {lang === 'fr'
                        ? 'Ces images s\'affichent en transparence dans la Roda et peuvent être assignées à des mesures dans la Timeline.'
                        : 'Estas imagens aparecem em transparência na Roda e podem ser atribuídas a compassos na Timeline.'}
                    </span>

                    {/* Whistle Volume Slider */}
                    {whistleVol !== undefined && onWhistleVolChange && (
                      <div className="flex flex-col gap-1 mt-0.5 bg-[var(--cordel-bg)] cordel-border-sm p-2">
                        <div className="flex justify-between items-center text-[9px] font-bold text-[var(--cordel-text)] uppercase font-cactus">
                          <span>{lang === 'fr' ? 'Volume du sifflet' : 'Volume do apito'}</span>
                          <span>{whistleVol}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={whistleVol}
                          onChange={(e) => onWhistleVolChange(parseInt(e.target.value))}
                          className="w-full h-2 bg-[var(--cordel-text)]/20 border border-[var(--cordel-border)] rounded-none outline-none cursor-pointer mt-0.5"
                          style={{ accentColor: 'var(--cordel-text)' }}
                        />
                      </div>
                    )}

                    {/* Galerie des signaux existants */}
                    {(metadata?.rhythmSignals || []).length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {(metadata.rhythmSignals || []).map(sig => (
                          <div key={sig.id} className="flex items-center gap-2 bg-[var(--cordel-bg)] cordel-border-sm p-1.5">
                            {sig.image ? (
                              <img src={sig.image} alt={sig.name} className="w-10 h-10 object-contain flex-shrink-0 bg-black/10" />
                            ) : (
                              <div className="w-10 h-10 flex items-center justify-center bg-black/10 text-[16px] flex-shrink-0">📢</div>
                            )}
                            <span className="flex-grow text-[10px] font-bold text-[var(--cordel-text)] truncate">{sig.name}</span>
                            <button
                              onClick={() => handleDeleteSignal(sig.id)}
                              className="text-[#8b2a1a] font-bold text-[10px] hover:underline cursor-pointer flex-shrink-0 px-1"
                              title={lang === 'fr' ? 'Supprimer' : 'Excluir'}
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Formulaire d'ajout d'un signal */}
                    {!pendingSignalImage ? (
                      <>
                        {signalCameraActive ? (
                          <div className="flex flex-col gap-2">
                            <div className="aspect-video bg-black cordel-border-sm overflow-hidden relative">
                              <video ref={signalVideoRef} className="w-full h-full object-cover" playsInline muted />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={captureSignalPhoto}
                                className="flex-1 py-1 bg-emerald-600 text-white text-[10px] font-bold cordel-border-sm hover:opacity-85 cursor-pointer"
                              >
                                📸 {lang === 'fr' ? 'Capturer' : 'Capturar'}
                              </button>
                              <button
                                onClick={stopSignalCamera}
                                className="py-1 px-3 bg-gray-300 text-black text-[10px] font-bold cordel-border-sm hover:opacity-85 cursor-pointer"
                              >
                                {lang === 'fr' ? 'Annuler' : 'Cancelar'}
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
                              📷 {lang === 'fr' ? 'Photo' : 'Câmera'}
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <img src={pendingSignalImage} alt="preview" className="w-full max-h-24 object-contain bg-black/10 cordel-border-sm" />
                        <input
                          type="text"
                          placeholder={lang === 'fr' ? 'Nom du signal…' : 'Nome do sinal…'}
                          value={pendingSignalName}
                          onChange={e => setPendingSignalName(e.target.value)}
                          className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
                          onKeyDown={e => { if (e.key === 'Enter') handleAddSignal(); }}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddSignal}
                            className="flex-1 py-1 bg-[#27ae60] text-[#1a1a1a] text-[10px] font-bold cordel-border-sm hover:opacity-85 cursor-pointer"
                          >
                            ✓ {lang === 'fr' ? 'Ajouter' : 'Adicionar'}
                          </button>
                          <button
                            onClick={() => { setPendingSignalImage(null); setPendingSignalName(''); }}
                            className="py-1 px-3 bg-gray-300 text-black text-[10px] font-bold cordel-border-sm hover:opacity-85 cursor-pointer"
                          >
                            {lang === 'fr' ? 'Annuler' : 'Cancelar'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-[var(--cordel-text)] font-sans font-bold text-xs text-center mt-10 italic opacity-70">
                  {lang === 'fr' 
                    ? 'Aucune métadonnée disponible pour ce rythme.' 
                    : 'Nenhuma informação disponible para este rythme.'}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>

    </>
  );
};

export const RightSidebar = React.memo(RightSidebarComponent, (prevProps, nextProps) => {
  if (prevProps.activePanel !== 'letras' && nextProps.activePanel !== 'letras') {
    return (
      prevProps.lang === nextProps.lang &&
      prevProps.activePanel === nextProps.activePanel &&
      prevProps.tracks === nextProps.tracks &&
      prevProps.letras === nextProps.letras &&
      prevProps.metadata === nextProps.metadata &&
      prevProps.totalMeasures === nextProps.totalMeasures
    );
  }

  const getVisualSteps = (props: RightSidebarProps) => {
    if (!props.currentPlayState) return '';
    const { stepIndex, maxTicks, activePatternIdByInst } = props.currentPlayState;
    return props.tracks
      .filter(t => instrumentsConfig[t.instrumentIdx]?.type === 'voice' && !t.isMute)
      .map(t => {
        const activePatternId = activePatternIdByInst?.[t.instrumentIdx];
        const activePattern = t.patterns.find(p => p.id === activePatternId) || t.patterns[0];
        if (!activePattern) return '-1';
        const isThisPatternActive = !activePatternIdByInst || activePatternIdByInst[t.instrumentIdx] === activePattern.id;
        if (!isThisPatternActive) return '-1';
        const currentStep = Math.floor((stepIndex / maxTicks) * activePattern.steps);
        return `${t.id}:${currentStep}`;
      })
      .join(',');
  };

  const prevVisualSteps = getVisualSteps(prevProps);
  const nextVisualSteps = getVisualSteps(nextProps);

  if (prevVisualSteps !== nextVisualSteps) {
    return false;
  }

  const keys = Object.keys(prevProps) as Array<keyof RightSidebarProps>;
  for (const key of keys) {
    if (typeof prevProps[key] === 'function') {
      continue;
    }
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }
  return true;
});
