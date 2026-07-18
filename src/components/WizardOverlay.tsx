import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Language, TrackGroup, Pattern } from '../types';
import { useWizardStore, PlacedInstrument, SongInfo } from '../stores/useWizardStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { CordelImageEditor } from './CordelImageEditor';
import { useSequencer } from '../contexts/SequencerContext';
import { useTransportStore } from '../stores/useTransportStore';
import { audioEngine } from '../hooks/useAudioSync';
import { instrumentsConfig } from '../data';
import { instrumentAudioConfigs } from '../data/audioConfig';

interface WizardOverlayProps {
  onClose: () => void;
  lang: Language;
}

const AVAILABLE_INSTRUMENTS = [
  { id: 'marcante', name: 'Marcante (alfaia)', iconImg: 'icones/alfaia.svg', color: '#8a2b2b', label: 'Marcante' },
  { id: 'meiao', name: 'Meião (alfaia)', iconImg: 'icones/alfaia.svg', color: '#ab5318', label: 'Meião' },
  { id: 'repique', name: 'Repique (alfaia)', iconImg: 'icones/alfaia.svg', color: '#c9a724', label: 'Repique' },
  { id: 'caixa', name: 'Caixa', iconImg: 'icones/caixa.svg', color: '#7a3187', label: 'Caixa' },
  { id: 'tarol', name: 'Tarol', iconImg: 'icones/caixa.svg', color: '#2563eb', label: 'Tarol' },
  { id: 'gongue', name: 'Gonguê', iconImg: 'icones/gongue.svg', color: '#bdc3c7', label: 'Gonguê' },
  { id: 'agbe', name: 'Agbê', iconImg: 'icones/agbe.svg', color: '#22c55e', label: 'Agbê' },
  { id: 'mineiro', name: 'Mineiro', iconImg: 'icones/mineiro.svg', color: '#588157', label: 'Mineiro' },
  { id: 'timbal', name: 'Timbal', iconImg: 'icones/timbal.svg', color: '#d97706', label: 'Timbal' },
];

const LIMITS: Record<string, number> = {
  marcante: 3,
  meiao: 3,
  repique: 3,
  caixa: 2,
  tarol: 2,
  agbe: 2,
  mineiro: 2,
  timbal: 2,
  gongue: 1,
};

const REMOVE_THRESHOLD = 60; // Pixels buffer to trigger tear-off/deletion

const t = {
  fr: {
    title: "Assistant de Création",
    step1Sub: "Étape 1 : Le Placement Spatial",
    step2Sub: "Étape 2 : Identité & Configuration Rythmique",
    annuler: "Annuler",
    retour: "➔ Retour",
    suivant: "Suivant ➔",
    congedier: "Congédier",
    fondation: "1. La Fondation Rythmique",
    rythmeClassique: "Démarrer avec un rythme classique :",
    vierge: "Aucun (Roda vierge)",
    jeuAlfaias: "2. Le Jeu des Alfaias",
    commentAlfaias: "Comment jouent les Alfaias ?",
    enBloc: "En bloc (Unies derrière la Marcante, avec variations possibles)",
    enBlocDesc: "Unie derrière la Marcante. Toutes les Alfaias s'alignent.",
    phrasesDistinctes: "Phrases distinctes (Chaque alfaia joue sa propre partition)",
    phrasesDistinctesDesc: "Chaque famille (Marcante, Meião, Repique) joue sa propre phrase.",
    ameBaque: "3. L'Âme du Baque (O Balanço)",
    styleSwing: "Style du Swing (Balanço) :",
    swingAlfaias: "Intensité Swing - Alfaias",
    swingCaixas: "Intensité Swing - Caixas & Tarol",
    swingSementes: "Intensité Swing - Sementes (Agbê / Mineiro)",
    swingGongue: "Intensité Swing - Gonguê",
    swingTimbal: "Intensité Swing - Timbal",
    blason: "4. Les Signes du Mestre",
    choixSigne: "Choisissez les Signes du Mestre :",
    blasonPerso: "Brasão / Signe personnalisé",
    blasonPersoDesc: "Prenez une photo pour générer un blason unique style gravure.",
    prendrePhoto: "Prendre Photo / GIF",
    identiteMorceau: "5. Identité du Morceau",
    espritMorceau: "Quel est l'esprit de ce Morceau ?",
    rodaLabel: "Nom de la Roda",
    toadaLabel: "Titre de la Toada (Chant)",
    nacaoLabel: "Nom de la Nação",
    compositeurLabel: "Compositeur / Mestre",
    ritmoLabel: "Rythme principal (Baque)",
    youtubeLabel: "Lien YouTube (Audition / Captation)",
    placeholderSaisir: "Saisir ici...",
    faireSonner: "Faire sonner la Roda ! 🥁",
    consacree: "Roda consagrada !",
    cameraTitle: "Prendre un blason",
    effetGravure: "🎨 Appliquer effet gravure",
    photo: "Photo",
    rafale: "Rafale (GIF)",
    activerCam: "Activer la caméra",
    ou: "— Ou —",
    importFichier: "Importer un fichier",
    instrumentsGlissables: "Instruments glissables",
    inclureChant: "Inclure le chant",
    activerToada: "Activer la Toada (Voix)",
    mestre: "Mestre",
    auditeur: "(Auditeur)",
    infoRetirer: "* Glissez un instrument sur la zone 'Congédier' pour le retirer",
    attentionSurcharge: "Attention Mestre, trop d'instruments peuvent surcharger la Roda (CPU). L'application s'ajustera si besoin.",
  },
  pt: {
    title: "Assistente de Criação",
    step1Sub: "Etapa 1: O Posicionamento Espacial",
    step2Sub: "Etapa 2: Identidade e Configuração Rítmica",
    annuler: "Cancelar",
    retour: "➔ Voltar",
    suivant: "Avançar ➔",
    congedier: "Dispensar",
    fondation: "1. A Fundação Rítmica",
    rythmeClassique: "Iniciar com um ritmo clássico :",
    vierge: "Nenhum (Roda vazia)",
    jeuAlfaias: "2. O Jogo das Alfaias",
    commentAlfaias: "Como as Alfaias devem tocar ?",
    enBloc: "Em bloco (Unidas atrás da Marcante, com variações possíveis)",
    enBlocDesc: "Unido atrás da Marcante. Todas as Alfaias se alinham.",
    phrasesDistinctes: "Frases distintas (Cada alfaia toca sua própria partitura)",
    phrasesDistinctesDesc: "Cada família (Marcante, Meião, Repique) toca sua própria frase.",
    ameBaque: "3. A Alma do Baque (Balanço)",
    styleSwing: "Estilo do Balanço :",
    swingAlfaias: "Intensidade do Balanço - Alfaias",
    swingCaixas: "Intensidade do Balanço - Caixas & Tarol",
    swingSementes: "Intensidade do Balanço - Sementes (Agbê / Mineiro)",
    swingGongue: "Intensidade do Balanço - Gonguê",
    swingTimbal: "Intensidade do Balanço - Timbal",
    blason: "4. Os Sinais do Mestre",
    choixSigne: "Escolha os Sinais do Mestre :",
    blasonPerso: "Brasão / Sinal personalizado",
    blasonPersoDesc: "Tire uma foto para gerar um brasão único em estilo gravura.",
    prendrePhoto: "Tirar Foto / GIF",
    identiteMorceau: "5. Identidade da Música",
    espritMorceau: "Qual é o espírito desta música ?",
    rodaLabel: "Nome da Roda",
    toadaLabel: "Título da Toada (Canto)",
    nacaoLabel: "Nome da Nação",
    compositeurLabel: "Compositor / Mestre",
    ritmoLabel: "Ritmo principal (Baque)",
    youtubeLabel: "Link do YouTube (Gravação)",
    placeholderSaisir: "Digitar aqui...",
    faireSonner: "Fazer soar a Roda! 🥁",
    consacree: "Roda consagrada!",
    cameraTitle: "Tirar uma foto",
    effetGravure: "🎨 Aplicar efeito gravura",
    photo: "Foto",
    rafale: "Rajada (GIF)",
    activerCam: "Ativar câmera",
    ou: "— Ou —",
    importFichier: "Importar arquivo",
    instrumentsGlissables: "Instrumentos arrastáveis",
    inclureChant: "Incluir o canto",
    activerToada: "Ativar a Toada (Voz)",
    mestre: "Mestre",
    auditeur: "(Ouvinte)",
    infoRetirer: "* Arraste um instrumento para a zona 'Dispensar' para removê-lo",
    attentionSurcharge: "Atenção Mestre, excesso de instrumentos pode sobrecarregar a Roda (CPU). O aplicativo se ajustará se necessário.",
  }
};

export const WizardOverlay: React.FC<WizardOverlayProps> = ({
  onClose,
  lang,
}) => {
  const modalRoot = document.getElementById('modal-root') || document.body;

  // Store connections
  const placedInstruments = useWizardStore((state) => state.placedInstruments);
  const hasToada = useWizardStore((state) => state.hasToada);
  const step = useWizardStore((state) => state.step);
  const setStep = useWizardStore((state) => state.setStep);
  const addPlacedInstrument = useWizardStore((state) => state.addPlacedInstrument);
  const updatePlacedInstrumentPosition = useWizardStore((state) => state.updatePlacedInstrumentPosition);
  const removePlacedInstrument = useWizardStore((state) => state.removePlacedInstrument);
  const toggleToada = useWizardStore((state) => state.toggleToada);

  // Step 2 Store connections
  const wizardLang = useWizardStore((state) => state.wizardLang);
  const toggleWizardLang = useWizardStore((state) => state.toggleWizardLang);
  const alfaiaGroupingMode = useWizardStore((state) => state.alfaiaGroupingMode);
  const setAlfaiaGroupingMode = useWizardStore((state) => state.setAlfaiaGroupingMode);
  const selectedSwingId = useWizardStore((state) => state.selectedSwingId);
  const setSelectedSwingId = useWizardStore((state) => state.setSelectedSwingId);
  const swingIntensities = useWizardStore((state) => state.swingIntensities);
  const setSwingIntensity = useWizardStore((state) => state.setSwingIntensity);
  const selectedBasePatternId = useWizardStore((state) => state.selectedBasePatternId);
  const setSelectedBasePatternId = useWizardStore((state) => state.setSelectedBasePatternId);
  const selectedSignIds = useWizardStore((state) => state.selectedSignIds);
  const toggleSignId = useWizardStore((state) => state.toggleSignId);
  const songInfo = useWizardStore((state) => state.songInfo);
  const updateSongInfo = useWizardStore((state) => state.updateSongInfo);
  const bpm = useWizardStore((state) => state.bpm);
  const setBpm = useWizardStore((state) => state.setBpm);

  const sequencer = useSequencer();

  // Sequencer store connections
  const mestreSignals = useSequencerStore((state) => state.mestreSignals);

  // Local state for UI feedback
  const [localToast, setLocalToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  // Size of La Place to draw SVG accurately
  const [placeSize, setPlaceSize] = useState({ width: 0, height: 0 });

  // Camera & Image capture states
  const [showCamera, setShowCamera] = useState(false);
  const [signalCameraActive, setSignalCameraActive] = useState(false);
  const [isCapturingBurst, setIsCapturingBurst] = useState(false);
  const [burstCount, setBurstCount] = useState(0);
  const [isProcessingGif, setIsProcessingGif] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [rawSignalFrames, setRawSignalFrames] = useState<string[]>([]);
  const [useCordelEffect, setUseCordelEffect] = useState(true);

  // References for drag & drop
  const placeRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const dismissZoneRef = useRef<HTMLDivElement>(null);
  
  // References for Camera
  const signalVideoRef = useRef<HTMLVideoElement>(null);
  const signalStreamRef = useRef<MediaStream | null>(null);
  
  // Drag state without render thrashing
  const dragInfoRef = useRef<{
    active: boolean;
    type?: string;
    id?: string;
    startX: number;
    startY: number;
    initialLeft: number;
    initialTop: number;
    element: HTMLElement | null;
    isReadyToRemove: boolean;
  }>({ active: false, element: null, startX: 0, startY: 0, initialLeft: 0, initialTop: 0, isReadyToRemove: false });

  // Observe container size using ResizeObserver
  useEffect(() => {
    if (!placeRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setPlaceSize({ width, height });
    });
    observer.observe(placeRef.current);
    return () => {
      observer.disconnect();
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
      if (signalStreamRef.current) {
        signalStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const showLocalToast = (message: string) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setLocalToast(message);
    toastTimeoutRef.current = window.setTimeout(() => {
      setLocalToast(null);
      toastTimeoutRef.current = null;
    }, 4000);
  };

  // Camera Management Methods
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
      window.alert(wizardLang === 'fr' ? "Impossible d'accéder à la caméra." : "Não foi possível acessar a câmera.");
    }
  };

  const stopSignalCamera = () => {
    if (signalStreamRef.current) {
      signalStreamRef.current.getTracks().forEach((t) => t.stop());
      signalStreamRef.current = null;
    }
    setSignalCameraActive(false);
  };

  const captureSignalPhoto = (isBurst: boolean = false) => {
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
            toggleSignId(frames[0]);
            stopSignalCamera();
            setShowCamera(false);
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
                  toggleSignId(obj.image);
                  stopSignalCamera();
                  setShowCamera(false);
                } else {
                  console.error('GIF creation error:', obj.errorMsg);
                  window.alert(wizardLang === 'fr' ? "Erreur lors de la génération du GIF." : "Erro ao gerar o GIF.");
                }
              }
            );
          } catch (err) {
            console.error('Failed to load gifshot:', err);
            setIsProcessingGif(false);
            window.alert(wizardLang === 'fr' ? "Erreur de chargement du module GIF." : "Erro ao carregar o módulo GIF.");
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

  const handleSignalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        if (useCordelEffect) {
          setRawSignalFrames([base64]);
        } else {
          toggleSignId(base64);
          setShowCamera(false);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Polar Clamping calculation
  const clampPositionToCone = (clientX: number, clientY: number, placeRect: DOMRect): { x: number, y: number } => {
    const W = placeRect.width;
    const H = placeRect.height;
    const x0 = placeRect.left + W / 2;
    const y0 = placeRect.top + H;
    const u = clientX - x0;
    const v = y0 - clientY;

    let R = Math.sqrt(u * u + v * v);
    let theta = Math.atan2(v, u);

    const Rmax = H;

    if (v < 0) {
      theta = u >= 0 ? Math.PI / 6 : 5 * Math.PI / 6;
    } else {
      if (theta < Math.PI / 6) {
        theta = Math.PI / 6;
      } else if (theta > 5 * Math.PI / 6) {
        theta = 5 * Math.PI / 6;
      }
    }

    if (R > Rmax) {
      R = Rmax;
    }

    const uClamp = R * Math.cos(theta);
    const vClamp = R * Math.sin(theta);

    const relativeX = ((uClamp + W / 2) / W) * 100;
    const relativeY = ((H - vClamp) / H) * 100;

    return {
      x: Math.max(0, Math.min(100, relativeX)),
      y: Math.max(0, Math.min(100, relativeY)),
    };
  };

  // Drag handlers
  const handlePalettePointerDown = (e: React.PointerEvent<HTMLDivElement>, type: string) => {
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const rect = target.getBoundingClientRect();
    if (ghostRef.current) {
      ghostRef.current.style.display = 'flex';
      ghostRef.current.style.width = '52px';
      ghostRef.current.style.height = '52px';
      ghostRef.current.style.borderRadius = '9999px';
      
      const config = AVAILABLE_INSTRUMENTS.find(i => i.id === type);
      ghostRef.current.style.borderColor = config?.color || '#1a1a1a';
      ghostRef.current.style.borderWidth = '3px';
      ghostRef.current.style.backgroundColor = '#f4ecd8';
      ghostRef.current.style.boxShadow = '2px 2px 0px rgba(0,0,0,1)';
      
      ghostRef.current.innerHTML = `
        <img src="${config?.iconImg}" class="w-6 h-6 object-contain pointer-events-none p-0.5 rounded-full bg-[#1a1a1a]/5" style="border: 2px solid ${config?.color}" />
        <span class="text-[7px] font-cactus font-bold uppercase truncate max-w-[44px] leading-none mt-0.5">${config?.label || ''}</span>
      `;

      const ghostW = 52;
      const ghostH = 52;
      const offsetX = ghostW / 2;
      const offsetY = ghostH / 2;
      const startX = e.clientX - offsetX;
      const startY = e.clientY - offsetY;

      ghostRef.current.style.transform = `translate3d(${startX}px, ${startY}px, 0)`;

      dragInfoRef.current = {
        active: true,
        type,
        startX: e.clientX,
        startY: e.clientY,
        initialLeft: offsetX,
        initialTop: offsetY,
        element: ghostRef.current,
        isReadyToRemove: false,
      };

      if (dismissZoneRef.current) {
        dismissZoneRef.current.style.opacity = '1';
        dismissZoneRef.current.style.transform = 'translate(-50%, 0)';
        dismissZoneRef.current.style.pointerEvents = 'auto';
      }
    }
  };

  const handlePlacedPointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const rect = target.getBoundingClientRect();
    const offsetX = e.clientX - (rect.left + rect.width / 2);
    const offsetY = e.clientY - (rect.top + rect.height / 2);

    dragInfoRef.current = {
      active: true,
      id,
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: offsetX,
      initialTop: offsetY,
      element: target,
      isReadyToRemove: false,
    };

    if (dismissZoneRef.current) {
      dismissZoneRef.current.style.opacity = '1';
      dismissZoneRef.current.style.transform = 'translate(-50%, 0)';
      dismissZoneRef.current.style.pointerEvents = 'auto';
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragInfoRef.current;
    if (!drag.active || !drag.element) return;

    let isOverDismiss = false;
    if (dismissZoneRef.current) {
      const dismissRect = dismissZoneRef.current.getBoundingClientRect();
      isOverDismiss =
        e.clientX >= dismissRect.left &&
        e.clientX <= dismissRect.right &&
        e.clientY >= dismissRect.top &&
        e.clientY <= dismissRect.bottom;
    }

    if (drag.type) {
      const nextX = e.clientX - drag.initialLeft;
      const nextY = e.clientY - drag.initialTop;
      drag.element.style.position = 'fixed';
      drag.element.style.left = '0px';
      drag.element.style.top = '0px';
      drag.element.style.transform = `translate3d(${nextX}px, ${nextY}px, 0)`;
      drag.element.style.zIndex = '99999';

      if (dismissZoneRef.current) {
        if (isOverDismiss) {
          dismissZoneRef.current.style.borderColor = '#8b2a1a';
          dismissZoneRef.current.style.backgroundColor = '#fce8e6';
          drag.element.style.filter = 'grayscale(100%) sepia(100%) hue-rotate(-50deg) saturate(600%)';
        } else {
          dismissZoneRef.current.style.borderColor = '#1a1a1a';
          dismissZoneRef.current.style.backgroundColor = '#e2d7be';
          drag.element.style.filter = 'none';
        }
      }
    } else if (drag.id && placeRef.current) {
      const placeRect = placeRef.current.getBoundingClientRect();
      const cursorX = e.clientX - drag.initialLeft;
      const cursorY = e.clientY - drag.initialTop;
      const cross = drag.element.querySelector<HTMLElement>('.remove-cross');

      if (isOverDismiss) {
        drag.isReadyToRemove = true;
        const freePctX = ((cursorX - placeRect.left) / placeRect.width) * 100;
        const freePctY = ((cursorY - placeRect.top) / placeRect.height) * 100;

        drag.element.style.left = `${freePctX}%`;
        drag.element.style.top = `${freePctY}%`;
        drag.element.style.transform = 'translate(-50%, -50%)';
        drag.element.style.zIndex = '9999';
        drag.element.style.filter = 'grayscale(100%) sepia(100%) hue-rotate(-50deg) saturate(600%)';
        if (cross) cross.style.opacity = '1';

        if (dismissZoneRef.current) {
          dismissZoneRef.current.style.borderColor = '#8b2a1a';
          dismissZoneRef.current.style.backgroundColor = '#fce8e6';
        }
      } else {
        drag.isReadyToRemove = false;
        const { x, y } = clampPositionToCone(cursorX, cursorY, placeRect);

        drag.element.style.left = `${x}%`;
        drag.element.style.top = `${y}%`;
        drag.element.style.transform = 'translate(-50%, -50%)';
        drag.element.style.zIndex = '9999';
        drag.element.style.filter = 'none';
        if (cross) cross.style.opacity = '0';

        if (dismissZoneRef.current) {
          dismissZoneRef.current.style.borderColor = '#1a1a1a';
          dismissZoneRef.current.style.backgroundColor = '#e2d7be';
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragInfoRef.current;
    if (!drag.active) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}

    drag.active = false;

    if (dismissZoneRef.current) {
      dismissZoneRef.current.style.opacity = '0';
      dismissZoneRef.current.style.transform = 'translate(-50%, -150%)';
      dismissZoneRef.current.style.pointerEvents = 'none';
      dismissZoneRef.current.style.borderColor = '#1a1a1a';
      dismissZoneRef.current.style.backgroundColor = '#e2d7be';
    }

    if (drag.element) {
      if (drag.element === ghostRef.current) {
        ghostRef.current.style.display = 'none';
      } else {
        drag.element.style.zIndex = '';
        drag.element.style.filter = 'none';
        const cross = drag.element.querySelector<HTMLElement>('.remove-cross');
        if (cross) cross.style.opacity = '0';
      }
    }

    if (placeRef.current) {
      const placeRect = placeRef.current.getBoundingClientRect();
      let isOverDismiss = false;
      if (dismissZoneRef.current) {
        const dismissRect = dismissZoneRef.current.getBoundingClientRect();
        isOverDismiss =
          e.clientX >= dismissRect.left &&
          e.clientX <= dismissRect.right &&
          e.clientY >= dismissRect.top &&
          e.clientY <= dismissRect.bottom;
      }

      if (drag.id) {
        if (isOverDismiss || drag.isReadyToRemove) {
          removePlacedInstrument(drag.id);
        } else {
          const targetX = e.clientX - drag.initialLeft;
          const targetY = e.clientY - drag.initialTop;
          const { x, y } = clampPositionToCone(targetX, targetY, placeRect);
          updatePlacedInstrumentPosition(drag.id, x, y);
        }
      } else if (drag.type) {
        if (!isOverDismiss) {
          const isInsideCanvas =
            e.clientX >= placeRect.left &&
            e.clientX <= placeRect.right &&
            e.clientY >= placeRect.top &&
            e.clientY <= placeRect.bottom;

          if (isInsideCanvas) {
            const { x, y } = clampPositionToCone(e.clientX, e.clientY, placeRect);
            const currentCount = placedInstruments.filter(i => i.instrumentType === drag.type).length;
            const limit = LIMITS[drag.type];
            if (limit !== undefined && currentCount >= limit) {
              showLocalToast(t[wizardLang].attentionSurcharge);
            }
            addPlacedInstrument(drag.type, x, y);
          }
        }
      }
    }

    dragInfoRef.current = { active: false, element: null, startX: 0, startY: 0, initialLeft: 0, initialTop: 0, isReadyToRemove: false };
  };

  const W = placeSize.width;
  const H = placeSize.height;

  // Orchestrator Generation function
  const generateRodaFromWizard = () => {
    // 1. Nettoyage et Métadonnées
    sequencer.pushUndoState();
    sequencer.handleClear();
    sequencer.setBpm(bpm);

    const cleanMetadata = {
      toada: songInfo.toadaName,
      nacao: songInfo.nacaoName,
      compositor: songInfo.composer,
      ritmo: songInfo.mainRythm,
      youtubeUrl: songInfo.youtubeUrl,
      description: songInfo.rodaName, // Nom de la Roda
      rhythmSignals: selectedSignIds.map((id, idx) => ({
        id,
        name: `Sinal ${idx + 1}`,
        image: id
      }))
    };
    sequencer.setMetadata(cleanMetadata);

    const cloudSignals = selectedSignIds.map((id, idx) => ({
      id,
      mestreId: 'mestre',
      name: `Sinal ${idx + 1}`,
      imageUrl: id,
      createdAt: Date.now()
    }));
    useSequencerStore.getState().setMestreSignals(cloudSignals);

    useTransportStore.getState().setGlobalSwing({
      ...useTransportStore.getState().globalSwing,
      mode: selectedSwingId as 'maracatu' | 'custom' | 'off'
    });

    const tracksToAdd: TrackGroup[] = [];

    // Find the master marcante if grouping mode is 'bloc'
    let firstMarcantePlacedId: string | null = null;
    const firstMarcante = placedInstruments.find(i => i.instrumentType === 'marcante');
    if (firstMarcante) {
      firstMarcantePlacedId = firstMarcante.id;
    }

    // Base rhythm patterns library with strict stroke symbol validation
    const getBasePatternForInstrument = (rhythmId: string, instType: string): (string | number)[] => {
      const isLuanda = rhythmId === 'luanda';
      const isTrovao = rhythmId === 'trovao';
      const isMartelo = rhythmId === 'martelo';

      let rawPattern: (string | number)[] = Array(16).fill(0);

      if (isLuanda) {
        if (instType === 'marcante') rawPattern = ["D", 0, 0, "d", "E", 0, "D", 0, "e", "D", 0, "d", "E", 0, 0, 0];
        else if (instType === 'meiao') rawPattern = [0, 0, "D", 0, 0, "e", 0, "D", 0, 0, "D", 0, 0, "e", 0, 0];
        else if (instType === 'repique') rawPattern = [0, "d", 0, 0, 0, "D", 0, 0, 0, "d", 0, 0, 0, "D", 0, 0];
        else if (instType === 'caixa' || instType === 'tarol') rawPattern = ["D", "D", "e", "D", "D", "e", "D", "e", "D", "D", "e", "D", "D", "e", "D", "e"];
        else if (instType === 'gongue') rawPattern = [0, "G", 0, 0, "G", 0, "G", 0, 0, "G", 0, 0, "G", 0, "G", 0];
        else if (instType === 'agbe' || instType === 'mineiro') rawPattern = ["E", 0, "d", "e", "D", 0, "e", "d", "E", 0, "d", "e", "D", 0, "e", "d"];
        else if (instType === 'timbal') rawPattern = ["g", 0, "D", "d", "S", 0, "s", 0, "g", 0, "D", "d", "S", 0, "s", 0];
      } else if (isTrovao) {
        if (instType === 'marcante') rawPattern = ["D", 0, "D", 0, "E", 0, "D", 0, "D", 0, "D", 0, "E", 0, 0, 0];
        else if (instType === 'meiao') rawPattern = [0, "D", 0, 0, "E", 0, 0, "D", 0, "D", 0, 0, "E", 0, 0, 0];
        else if (instType === 'repique') rawPattern = [0, 0, "d", "D", 0, "e", "D", 0, 0, 0, "d", "D", 0, "e", "D", 0];
        else if (instType === 'caixa' || instType === 'tarol') rawPattern = ["D", "e", "d", "D", "e", "d", "D", "e", "D", "e", "d", "D", "e", "d", "D", "e"];
        else if (instType === 'gongue') rawPattern = ["G", 0, "G", 0, 0, "G", 0, 0, "G", 0, "G", 0, 0, "G", 0, 0];
        else if (instType === 'agbe' || instType === 'mineiro') rawPattern = ["E", 0, "e", 0, "D", 0, "d", 0, "E", 0, "e", 0, "D", 0, "d", 0];
        else if (instType === 'timbal') rawPattern = ["g", "G", "d", 0, "S", "s", 0, 0, "g", "G", "d", 0, "S", "s", 0, 0];
      } else if (isMartelo) {
        if (instType === 'marcante') rawPattern = ["D", 0, 0, 0, "E", 0, 0, 0, "D", 0, 0, 0, "E", 0, 0, 0];
        else if (instType === 'meiao') rawPattern = [0, 0, "D", 0, 0, 0, "E", 0, 0, 0, "D", 0, 0, 0, "E", 0];
        else if (instType === 'repique') rawPattern = [0, "d", 0, 0, 0, "e", 0, 0, 0, "d", 0, 0, 0, "e", 0, 0];
        else if (instType === 'caixa' || instType === 'tarol') rawPattern = ["D", "D", "D", "D", "D", "D", "D", "D", "D", "D", "D", "D", "D", "D", "D", "D"];
        else if (instType === 'gongue') rawPattern = ["G", 0, 0, 0, "G", 0, 0, 0, "G", 0, 0, 0, "G", 0, 0, 0];
        else if (instType === 'agbe' || instType === 'mineiro') rawPattern = ["E", 0, "E", 0, "E", 0, "E", 0, "E", 0, "E", 0, "E", 0, "E", 0];
        else if (instType === 'timbal') rawPattern = ["S", 0, "S", 0, "s", 0, "s", 0, "S", 0, "S", 0, "s", 0, "s", 0];
      }

      // Dynamic validation filter: ensure the target instrument supports each step's stroke symbol
      const instConfig = instrumentAudioConfigs.find(c => c.id === instType);
      if (!instConfig) return Array(16).fill(0);

      const validStrokes = new Set(instConfig.strokes.map(s => s.symbol));
      return rawPattern.map(step => {
        if (step === 0 || step === '0' || step === '') return 0;
        if (validStrokes.has(String(step))) return step;
        return 0; // Replace unsupported strokes with silence
      });
    };

    // 1. Calcul préliminaire des volumes bruts basés sur la distance
    const rawVols = placedInstruments.map(inst => {
      const dbVol = ((inst.y - 100) / 100) * 12;
      const gain = Math.pow(10, dbVol / 20);
      return Math.max(0, Math.min(120, Math.round(gain * 100)));
    });

    const maxRawVol = rawVols.length > 0 ? Math.max(...rawVols) : 100;
    // Facteur d'échelle pour amener le plus fort à 90%
    const scaleFactor = maxRawVol > 0 ? (90 / maxRawVol) : 1.0;

    // 2. Traduction Spatiale et Création des Pistes
    placedInstruments.forEach((inst, idx) => {
      const instIdx = instrumentsConfig.findIndex(c => c.id === inst.instrumentType);
      if (instIdx === -1) return;

      const panPct = Math.round(((inst.x - 50) / 50) * 100);
      const rawVol = rawVols[idx];
      const volumeVal = Math.max(0, Math.min(120, Math.round(rawVol * scaleFactor)));

      let intensity = 100;
      if (inst.instrumentType === 'marcante' || inst.instrumentType === 'meiao' || inst.instrumentType === 'repique') {
        intensity = swingIntensities.alfaias;
      } else if (inst.instrumentType === 'caixa' || inst.instrumentType === 'tarol') {
        intensity = swingIntensities.caixas;
      } else if (inst.instrumentType === 'agbe' || inst.instrumentType === 'mineiro') {
        intensity = swingIntensities.sementes;
      } else if (inst.instrumentType === 'gongue') {
        intensity = swingIntensities.gongue;
      } else if (inst.instrumentType === 'timbal') {
        intensity = swingIntensities.timbal;
      }

      let trackHidden = false;
      let trackCustomName: string | undefined = undefined;

      if (alfaiaGroupingMode === 'bloc') {
        const isAlf = inst.instrumentType === 'marcante' || inst.instrumentType === 'meiao' || inst.instrumentType === 'repique';
        if (isAlf) {
          if (inst.instrumentType === 'marcante' && inst.id === firstMarcantePlacedId) {
            trackCustomName = "Alfaias";
            trackHidden = false;
          } else {
            trackHidden = true;
          }
        }
      }

      const trackId = Date.now() + Math.floor(Math.random() * 100000) + idx;
      const newTrack: TrackGroup = {
        id: trackId,
        instrumentIdx: instIdx,
        customName: trackCustomName,
        patterns: [
          {
            id: trackId + 10000,
            name: wizardLang === 'fr' ? 'Motif 1' : 'Padrão 1',
            steps: 16,
            activeSteps: selectedBasePatternId ? getBasePatternForInstrument(selectedBasePatternId, inst.instrumentType) : Array(16).fill(0),
            lyrics: Array(16).fill(''),
            notes: Array(16).fill(''),
            measureAssignments: Array(8).fill(false),
            volumes: Array(16).fill(80),
            decays: Array(16).fill(instrumentsConfig[instIdx]?.type === 'voice' ? 10 : 100),
            microtimings: Array(16).fill(0),
          },
        ],
        isMute: false,
        isSolo: false,
        isHidden: trackHidden,
        volumeVal,
        selectedPatternId: 0,
        reverbVal: 0,
        panVal: panPct,
        pan: panPct,
        swingIntensity: intensity,
        fxSends: { reverb: 0, distortion: 0 }
      };
      newTrack.selectedPatternId = newTrack.patterns[0].id;
      newTrack.patterns[0].measureAssignments[0] = true;

      if (audioEngine) {
        audioEngine.loadInstrumentSamples(inst.instrumentType).catch(console.error);
      }

      tracksToAdd.push(newTrack);
    });

    // 3. Création Automatique des Bus
    if (hasToada) {
      const toadaIdx = instrumentsConfig.findIndex(c => c.id === 'toada');
      const puxInstIdx = instrumentsConfig.findIndex(c => c.id === 'puxador');
      const coroInstIdx = instrumentsConfig.findIndex(c => c.id === 'coro');

      if (toadaIdx !== -1) {
        const toadaBusId = Date.now() + 80000;
        const puxTrackId = toadaBusId + 1;
        const coroTrackId = toadaBusId + 2;

        const toadaBusTrack: TrackGroup = {
          id: toadaBusId,
          instrumentIdx: toadaIdx,
          patterns: [],
          isMute: false,
          isSolo: false,
          isHidden: false,
          volumeVal: 100,
          selectedPatternId: 0,
          isBusFolder: true,
          isFolded: false,
          isSequencerFolded: false,
          customName: 'Toada',
          reverbVal: 0,
          panVal: 0,
          pan: 0,
          fxSends: { reverb: 0, distortion: 0 }
        };

        const puxTrack: TrackGroup = {
          id: puxTrackId,
          instrumentIdx: puxInstIdx !== -1 ? puxInstIdx : 8,
          busId: String(toadaBusId),
          patterns: [
            {
              id: toadaBusId + 10,
              name: wizardLang === 'fr' ? 'Solo 1' : 'Solista 1',
              steps: 16,
              activeSteps: Array(16).fill(0),
              lyrics: Array(16).fill(''),
              notes: Array(16).fill(''),
              measureAssignments: Array(8).fill(false),
              volumes: Array(16).fill(80),
              decays: Array(16).fill(10),
              microtimings: Array(16).fill(0),
            }
          ],
          isMute: false,
          isSolo: false,
          isHidden: false,
          volumeVal: 100,
          selectedPatternId: 0,
          reverbVal: 0,
          panVal: 0,
          pan: 0,
          fxSends: { reverb: 0, distortion: 0 }
        };
        puxTrack.selectedPatternId = puxTrack.patterns[0].id;
        puxTrack.patterns[0].measureAssignments[0] = true;

        const coroTrack: TrackGroup = {
          id: coroTrackId,
          instrumentIdx: coroInstIdx !== -1 ? coroInstIdx : 9,
          busId: String(toadaBusId),
          patterns: [
            {
              id: toadaBusId + 20,
              name: wizardLang === 'fr' ? 'Chœur 1' : 'Coro 1',
              steps: 16,
              activeSteps: Array(16).fill(0),
              lyrics: Array(16).fill(''),
              notes: Array(16).fill(''),
              measureAssignments: Array(8).fill(false),
              volumes: Array(16).fill(80),
              decays: Array(16).fill(10),
              microtimings: Array(16).fill(0),
            }
          ],
          isMute: false,
          isSolo: false,
          isHidden: false,
          volumeVal: 100,
          selectedPatternId: 0,
          reverbVal: 0,
          panVal: 0,
          pan: 0,
          fxSends: { reverb: 0, distortion: 0 }
        };
        coroTrack.selectedPatternId = coroTrack.patterns[0].id;

        if (audioEngine) {
          audioEngine.loadInstrumentSamples('puxador').catch(console.error);
          audioEngine.loadInstrumentSamples('coro').catch(console.error);
        }

        tracksToAdd.push(toadaBusTrack, puxTrack, coroTrack);
      }
    }

    const hasSementes = placedInstruments.some(i => i.instrumentType === 'agbe' || i.instrumentType === 'mineiro');
    const sementesBusId = Date.now() + 20000;
    if (hasSementes) {
      const agbeIdx = instrumentsConfig.findIndex(c => c.id === 'agbe');
      const sementesBusTrack: TrackGroup = {
        id: sementesBusId,
        instrumentIdx: agbeIdx !== -1 ? agbeIdx : 6,
        patterns: [],
        isMute: false,
        isSolo: false,
        isHidden: false,
        volumeVal: 70,
        selectedPatternId: 0,
        isBusFolder: true,
        isFolded: false,
        isSequencerFolded: false,
        customName: 'Sementes',
        reverbVal: 0,
        panVal: 0,
        pan: 0,
        fxSends: { reverb: 0, distortion: 0 }
      };

      tracksToAdd.forEach(t => {
        const instId = instrumentsConfig[t.instrumentIdx]?.id;
        if (instId === 'agbe' || instId === 'mineiro') {
          t.busId = String(sementesBusId);
        }
      });

      tracksToAdd.push(sementesBusTrack);
    }

    const hasCaixas = placedInstruments.some(i => i.instrumentType === 'caixa' || i.instrumentType === 'tarol');
    const caixasBusId = Date.now() + 30000;
    if (hasCaixas) {
      const caixaIdx = instrumentsConfig.findIndex(c => c.id === 'caixa');
      const caixasBusTrack: TrackGroup = {
        id: caixasBusId,
        instrumentIdx: caixaIdx !== -1 ? caixaIdx : 3,
        patterns: [],
        isMute: false,
        isSolo: false,
        isHidden: false,
        volumeVal: 70,
        selectedPatternId: 0,
        isBusFolder: true,
        isFolded: false,
        isSequencerFolded: false,
        customName: 'Section Caixas',
        reverbVal: 0,
        panVal: 0,
        pan: 0,
        fxSends: { reverb: 0, distortion: 0 }
      };

      tracksToAdd.forEach(t => {
        const instId = instrumentsConfig[t.instrumentIdx]?.id;
        if (instId === 'caixa' || instId === 'tarol') {
          t.busId = String(caixasBusId);
        }
      });

      tracksToAdd.push(caixasBusTrack);
    }

    // Appliquer l'ajout des pistes d'un coup
    useSequencerStore.getState().setTracks(tracksToAdd);

    // 4. Track Linking Intelligent (Maître / Esclaves)
    const currentTracks = useSequencerStore.getState().tracks;
    const marcantes = currentTracks.filter(t => !t.isBusFolder && instrumentsConfig[t.instrumentIdx]?.id === 'marcante');
    const meiaos = currentTracks.filter(t => !t.isBusFolder && instrumentsConfig[t.instrumentIdx]?.id === 'meiao');
    const repiques = currentTracks.filter(t => !t.isBusFolder && instrumentsConfig[t.instrumentIdx]?.id === 'repique');
    const caixas = currentTracks.filter(t => !t.isBusFolder && instrumentsConfig[t.instrumentIdx]?.id === 'caixa');
    const tarols = currentTracks.filter(t => !t.isBusFolder && instrumentsConfig[t.instrumentIdx]?.id === 'tarol');
    const agbes = currentTracks.filter(t => !t.isBusFolder && instrumentsConfig[t.instrumentIdx]?.id === 'agbe');
    const mineiros = currentTracks.filter(t => !t.isBusFolder && instrumentsConfig[t.instrumentIdx]?.id === 'mineiro');
    const timbals = currentTracks.filter(t => !t.isBusFolder && instrumentsConfig[t.instrumentIdx]?.id === 'timbal');
    const gongues = currentTracks.filter(t => !t.isBusFolder && instrumentsConfig[t.instrumentIdx]?.id === 'gongue');

    const linkAction = useSequencerStore.getState().handleCreateCustomLinkGroup;

    if (alfaiaGroupingMode === 'bloc' && marcantes.length > 0) {
      const masterMarcante = marcantes[0];
      const slaves: number[] = [];
      
      // All other alfaias (meiões, repiques, other marcantes) become slaves of the main "Alfaias" track
      meiaos.forEach(m => slaves.push(m.id));
      repiques.forEach(r => slaves.push(r.id));
      if (marcantes.length > 1) {
        marcantes.slice(1).forEach(m => slaves.push(m.id));
      }

      if (slaves.length > 0) {
        linkAction(masterMarcante.id, slaves, 'ALFAIAS');
      }
    } else {
      if (marcantes.length > 1) {
        linkAction(marcantes[0].id, marcantes.slice(1).map(m => m.id), 'MARCANTES');
      }
      if (meiaos.length > 1) {
        linkAction(meiaos[0].id, meiaos.slice(1).map(m => m.id), 'MEIÕES');
      }
      if (repiques.length > 1) {
        linkAction(repiques[0].id, repiques.slice(1).map(r => r.id), 'REPIQUES');
      }
    }

    const checkAndLinkDoubles = (list: TrackGroup[], name: string) => {
      if (list.length > 1) {
        linkAction(list[0].id, list.slice(1).map(t => t.id), name);
      }
    };

    checkAndLinkDoubles(caixas, 'CAIXAS');
    checkAndLinkDoubles(tarols, 'TAROLS');
    checkAndLinkDoubles(agbes, 'AGBÊS');
    checkAndLinkDoubles(mineiros, 'MINEIROS');
    checkAndLinkDoubles(timbals, 'TIMBAIS');
    checkAndLinkDoubles(gongues, 'GONGUÊS');

    // Log final de validation
    console.log("Configuration de la Roda finale générée :", useSequencerStore.getState());
    alert(t[wizardLang].consacree);

    // 6. Clôture
    useWizardStore.getState().setWizardOpen(false);
    useWizardStore.getState().setIntroModalOpen(false);
    useWizardStore.getState().resetWizard();
  };

  // Step 2 Layout Rendering
  if (step === 2) {
    const hasPlacedAlfaias = placedInstruments.some(
      inst => inst.instrumentType === 'marcante' || inst.instrumentType === 'meiao' || inst.instrumentType === 'repique'
    );

    // Get dynamic signs: merge default local woodcuts and loaded cloud mestreSignals
    const defaultSigns = [
      { id: 'pictures/logo-samambaia.png', name: wizardLang === 'fr' ? 'Signe Luanda' : 'Sinal Luanda', image: 'pictures/logo-samambaia.png' },
      { id: 'pictures/tambour.png', name: wizardLang === 'fr' ? 'Signe Martelo' : 'Sinal Martelo', image: 'pictures/tambour.png' },
      { id: 'pictures/atelier.png', name: wizardLang === 'fr' ? 'Signe Trovão' : 'Sinal Trovão', image: 'pictures/atelier.png' },
    ];
    
    const mestreSignsList = mestreSignals && mestreSignals.length > 0
      ? mestreSignals.map(s => ({ id: s.id || s.name, name: s.name, image: s.imageUrl }))
      : defaultSigns;

    return createPortal(
      <div className="fixed inset-0 bg-[#f4ecd8] z-[9998] flex flex-col p-4 md:p-8 select-none font-sans overflow-y-auto">
        
        {/* Cordel Image Editor Modal overlay */}
        {rawSignalFrames.length > 0 && (
          <div className="fixed inset-0 bg-black/60 z-[10002] flex items-center justify-center p-4">
            <div className="bg-[#f4ecd8] border-4 border-[#1a1a1a] p-4 max-w-sm w-full rounded-sm shadow-[8px_8px_0_rgba(0,0,0,1)]">
              <CordelImageEditor
                frames={rawSignalFrames}
                lang={wizardLang}
                onComplete={(result) => {
                  toggleSignId(result);
                  setRawSignalFrames([]);
                  setShowCamera(false);
                }}
                onCancel={() => setRawSignalFrames([])}
              />
            </div>
          </div>
        )}

        {/* Camera Modal overlay */}
        {showCamera && rawSignalFrames.length === 0 && (
          <div className="fixed inset-0 bg-black/60 z-[10001] flex items-center justify-center p-4">
            <div className="bg-[#f4ecd8] border-4 border-[#1a1a1a] p-5 max-w-md w-full rounded-sm shadow-[8px_8px_0_rgba(0,0,0,1)] flex flex-col gap-4 relative">
              <button
                onClick={() => { stopSignalCamera(); setShowCamera(false); }}
                className="absolute top-3 right-3 font-bold text-xl hover:text-red-700 cursor-pointer text-[#1a1a1a]"
              >
                ✖
              </button>
              <h3 className="font-cactus text-xl font-bold uppercase tracking-wider border-b-2 border-[#1a1a1a] pb-1 text-[#1a1a1a]">
                {t[wizardLang].cameraTitle}
              </h3>
              
              <div className="flex justify-between items-center bg-black/5 p-2 border border-dashed border-[#1a1a1a]/20">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useCordelEffect}
                    onChange={(e) => setUseCordelEffect(e.target.checked)}
                    className="w-3 h-3 cursor-pointer accent-[#8b2a1a]"
                  />
                  <span className="text-[10px] text-[#1a1a1a] font-bold">
                    {t[wizardLang].effetGravure}
                  </span>
                </label>
              </div>

              {signalCameraActive ? (
                <div className="flex flex-col gap-3">
                  <div className="aspect-square bg-black border-2 border-[#1a1a1a] overflow-hidden relative">
                    <video ref={signalVideoRef} className="w-full h-full object-cover" playsInline muted />
                    <div
                      className="absolute inset-0 bg-white z-20 pointer-events-none transition-opacity duration-150"
                      style={{ opacity: flashActive ? 0.7 : 0 }}
                    />
                    {(isCapturingBurst || isProcessingGif) && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 text-white z-10 select-none">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] font-cactus font-bold tracking-wider uppercase">
                          {isProcessingGif
                            ? wizardLang === 'fr' ? 'Création du GIF...' : 'Criando GIF...'
                            : `${wizardLang === 'fr' ? 'Capture' : 'Capturando'} : ${burstCount}/4`}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => captureSignalPhoto(false)}
                      disabled={isCapturingBurst || isProcessingGif}
                      className="flex-1 py-2 text-[#f4ecd8] bg-[#8b2a1a] border-2 border-[#1a1a1a] shadow-[2px_2px_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer text-xs font-bold font-cactus uppercase disabled:opacity-50"
                    >
                      📸 {t[wizardLang].photo}
                    </button>
                    <button
                      onClick={() => captureSignalPhoto(true)}
                      disabled={isCapturingBurst || isProcessingGif}
                      className="flex-1 py-2 text-[#f4ecd8] bg-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[2px_2px_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer text-xs font-bold font-cactus uppercase disabled:opacity-50"
                    >
                      🎞️ {t[wizardLang].rafale}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 py-6 justify-center items-center">
                  <button
                    onClick={startSignalCamera}
                    className="w-full py-3 bg-[#1a1a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[4px_4px_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer text-xs font-bold font-cactus uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    📷 {t[wizardLang].activerCam}
                  </button>
                  <span className="text-[10px] text-[#1a1a1a]/60 uppercase font-cactus font-bold">— {t[wizardLang].ou} —</span>
                  <label className="w-full py-3 bg-[#f4ecd8] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[4px_4px_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer text-xs font-bold font-cactus uppercase tracking-wider text-center flex items-center justify-center gap-2">
                    📁 {t[wizardLang].importFichier}
                    <input type="file" accept="image/*" onChange={handleSignalFileChange} className="hidden" />
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center border-b-4 border-[#1a1a1a] pb-3 mb-6 flex-shrink-0">
          <div>
            <h2 className="font-cactus text-2xl md:text-4xl font-bold text-[#1a1a1a] uppercase tracking-wider leading-none">
              {t[wizardLang].title}
            </h2>
            <p className="text-[#1a1a1a]/70 text-[10px] md:text-xs mt-1 font-cactus font-bold tracking-wide uppercase">
              {t[wizardLang].step2Sub}
            </p>
          </div>
          
          <div className="flex gap-2 items-center">
            <button
              onClick={toggleWizardLang}
              className="px-2.5 py-1.5 bg-[#ece4d0] hover:bg-[#e2d7be] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-[0.98] transition-all cursor-pointer font-cactus font-bold uppercase text-[9px] md:text-xs shrink-0 flex items-center gap-1.5 text-[#1a1a1a]"
            >
              {wizardLang === 'fr' ? '🇧🇷 PT' : '🇫🇷 FR'}
            </button>

            <button
              onClick={() => setStep(1)}
              className="px-3 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-[0.98] transition-all cursor-pointer font-cactus font-bold uppercase text-[10px] md:text-xs"
            >
              {t[wizardLang].retour}
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 flex flex-col gap-6 max-w-2xl mx-auto w-full pb-8">
          
          {/* Bloc 1 : La Fondation Rythmique */}
          <div className="bg-[#f4ecd8] border-3 border-[#1a1a1a] p-4 md:p-5 shadow-[4px_4px_0_rgba(0,0,0,1)] flex flex-col gap-3 rounded-sm">
            <h3 className="font-cactus text-lg md:text-xl font-bold text-[#8b2a1a] uppercase tracking-wider border-b border-[#1a1a1a]/20 pb-1">
              {t[wizardLang].fondation}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]/70">
                  {t[wizardLang].rythmeClassique}
                </label>
                <select
                  value={selectedBasePatternId || ''}
                  onChange={(e) => setSelectedBasePatternId(e.target.value || null)}
                  className="w-full bg-[#f4ecd8] border-2 border-[#1a1a1a] p-2.5 font-cactus font-bold text-xs uppercase tracking-wider text-[#1a1a1a] focus:outline-none focus:border-[#8b2a1a] shadow-[2px_2px_0_rgba(0,0,0,1)] cursor-pointer"
                >
                  <option value="">{t[wizardLang].vierge}</option>
                  <option value="luanda">Baque Luanda</option>
                  <option value="trovao">Baque Trovão</option>
                  <option value="martelo">Baque Martelo</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]/70">
                  Tempo (BPM)
                </label>
                <input
                  type="number"
                  min="40"
                  max="240"
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  className="w-full bg-[#ece4d0] border-2 border-[#1a1a1a] p-2 font-cactus font-bold text-xs text-[#1a1a1a] focus:outline-none focus:border-[#8b2a1a] shadow-[2px_2px_0_rgba(0,0,0,1)] rounded-sm"
                />
              </div>
            </div>
          </div>

          {/* Bloc 2 : Le Jeu des Alfaias (Conditionnel) */}
          {hasPlacedAlfaias && (
            <div className="bg-[#f4ecd8] border-3 border-[#1a1a1a] p-4 md:p-5 shadow-[4px_4px_0_rgba(0,0,0,1)] flex flex-col gap-3 rounded-sm">
              <h3 className="font-cactus text-lg md:text-xl font-bold text-[#8b2a1a] uppercase tracking-wider border-b border-[#1a1a1a]/20 pb-1">
                {t[wizardLang].jeuAlfaias}
              </h3>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] md:text-xs text-[#1a1a1a] font-cactus font-bold uppercase">
                  {t[wizardLang].commentAlfaias}
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                  <button
                    onClick={() => setAlfaiaGroupingMode('bloc')}
                    className={`p-3 text-left border-2 font-cactus font-bold text-xs uppercase tracking-wide cursor-pointer transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-[0.98] ${
                      alfaiaGroupingMode === 'bloc'
                        ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a]'
                        : 'bg-[#f4ecd8] text-[#1a1a1a] border-[#1a1a1a]'
                    }`}
                  >
                    <div className="text-xs md:text-sm mb-1">🧱 {t[wizardLang].enBloc}</div>
                    <div className={`text-[8px] leading-tight mt-1 ${alfaiaGroupingMode === 'bloc' ? 'text-[#f4ecd8]/70' : 'text-[#1a1a1a]/60'}`}>
                      {t[wizardLang].enBlocDesc}
                    </div>
                  </button>

                  <button
                    onClick={() => setAlfaiaGroupingMode('distinct')}
                    className={`p-3 text-left border-2 font-cactus font-bold text-xs uppercase tracking-wide cursor-pointer transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-[0.98] ${
                      alfaiaGroupingMode === 'distinct'
                        ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a]'
                        : 'bg-[#f4ecd8] text-[#1a1a1a] border-[#1a1a1a]'
                    }`}
                  >
                    <div className="text-xs md:text-sm mb-1">🌿 {t[wizardLang].phrasesDistinctes}</div>
                    <div className={`text-[8px] leading-tight mt-1 ${alfaiaGroupingMode === 'distinct' ? 'text-[#f4ecd8]/70' : 'text-[#1a1a1a]/60'}`}>
                      {t[wizardLang].phrasesDistinctesDesc}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bloc 3 : L'Âme du Baque (O Balanço) */}
          <div className="bg-[#f4ecd8] border-3 border-[#1a1a1a] p-4 md:p-5 shadow-[4px_4px_0_rgba(0,0,0,1)] flex flex-col gap-4 rounded-sm">
            <h3 className="font-cactus text-lg md:text-xl font-bold text-[#8b2a1a] uppercase tracking-wider border-b border-[#1a1a1a]/20 pb-1">
              {t[wizardLang].ameBaque}
            </h3>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]/70">
                {t[wizardLang].styleSwing}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {[
                  { id: 'maracatu', name: 'Balanço Maracatu' },
                  { id: 'custom', name: 'Balanço Custom' },
                  { id: 'off', name: wizardLang === 'fr' ? 'Sans Swing (Droit)' : 'Sem Balanço' },
                ].map((sw) => (
                  <button
                    key={sw.id}
                    onClick={() => setSelectedSwingId(sw.id)}
                    className={`px-3 py-2 text-center border-2 font-cactus font-bold text-[10px] md:text-xs uppercase tracking-wide cursor-pointer transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-[0.98] ${
                      selectedSwingId === sw.id
                        ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a]'
                        : 'bg-[#f4ecd8] text-[#1a1a1a] border-[#1a1a1a]'
                    }`}
                  >
                    {sw.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]">
                  <span>{t[wizardLang].swingAlfaias}</span>
                  <span className="bg-[#1a1a1a] text-[#f4ecd8] px-1 py-0.5 rounded-sm text-[9px] font-cactus font-bold">{swingIntensities.alfaias}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={swingIntensities.alfaias}
                  onChange={(e) => setSwingIntensity('alfaias', Number(e.target.value))}
                  className="w-full h-1 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-[#8b2a1a] outline-none mt-1"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]">
                  <span>{t[wizardLang].swingCaixas}</span>
                  <span className="bg-[#1a1a1a] text-[#f4ecd8] px-1 py-0.5 rounded-sm text-[9px] font-cactus font-bold">{swingIntensities.caixas}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={swingIntensities.caixas}
                  onChange={(e) => setSwingIntensity('caixas', Number(e.target.value))}
                  className="w-full h-1 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-[#8b2a1a] outline-none mt-1"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]">
                  <span>{t[wizardLang].swingSementes}</span>
                  <span className="bg-[#1a1a1a] text-[#f4ecd8] px-1 py-0.5 rounded-sm text-[9px] font-cactus font-bold">{swingIntensities.sementes}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={swingIntensities.sementes}
                  onChange={(e) => setSwingIntensity('sementes', Number(e.target.value))}
                  className="w-full h-1 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-[#8b2a1a] outline-none mt-1"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]">
                  <span>{t[wizardLang].swingGongue}</span>
                  <span className="bg-[#1a1a1a] text-[#f4ecd8] px-1 py-0.5 rounded-sm text-[9px] font-cactus font-bold">{swingIntensities.gongue}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={swingIntensities.gongue}
                  onChange={(e) => setSwingIntensity('gongue', Number(e.target.value))}
                  className="w-full h-1 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-[#8b2a1a] outline-none mt-1"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]">
                  <span>{t[wizardLang].swingTimbal}</span>
                  <span className="bg-[#1a1a1a] text-[#f4ecd8] px-1 py-0.5 rounded-sm text-[9px] font-cactus font-bold">{swingIntensities.timbal}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={swingIntensities.timbal}
                  onChange={(e) => setSwingIntensity('timbal', Number(e.target.value))}
                  className="w-full h-1 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-[#8b2a1a] outline-none mt-1"
                />
              </div>
            </div>
          </div>

          {/* Bloc 4 : Les Signes du Mestre */}
          <div className="bg-[#f4ecd8] border-3 border-[#1a1a1a] p-4 md:p-5 shadow-[4px_4px_0_rgba(0,0,0,1)] flex flex-col gap-4 rounded-sm">
            <h3 className="font-cactus text-lg md:text-xl font-bold text-[#8b2a1a] uppercase tracking-wider border-b border-[#1a1a1a]/20 pb-1">
              {t[wizardLang].blason}
            </h3>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]/70">
                {t[wizardLang].choixSigne}
              </label>
              <div className="flex gap-3 overflow-x-auto p-2 border-2 border-dashed border-[#1a1a1a]/20 bg-[#1a1a1a]/5 rounded-sm scrollbar-thin">
                {mestreSignsList.map((sign) => {
                  const isSelected = selectedSignIds.includes(sign.id);
                  return (
                    <div
                      key={sign.id}
                      onClick={() => toggleSignId(sign.id)}
                      className={`relative flex-shrink-0 w-16 h-16 p-1.5 border-3 bg-[#f4ecd8] cursor-pointer flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-[#1a1a1a] shadow-[4px_4px_0px_rgba(0,0,0,1)] scale-105'
                          : 'border-[#1a1a1a]/40 hover:border-[#1a1a1a]/80'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute -top-1.5 -right-1.5 bg-[#1a1a1a] text-[#f4ecd8] rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold border border-[#1a1a1a] select-none z-10">
                          ✓
                        </div>
                      )}
                      <img src={sign.image} className="w-full h-full object-contain pointer-events-none" alt={sign.name} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 items-center mt-1 border-t border-[#1a1a1a]/10 pt-3">
              <div className="flex-1 flex gap-2 overflow-x-auto p-1 max-h-20 scrollbar-none">
                {selectedSignIds.length === 0 ? (
                  <div className="text-[10px] text-[#1a1a1a]/50 italic">
                    {wizardLang === 'fr' ? "Aucun signe personnalisé" : "Nenhum sinal personalizado"}
                  </div>
                ) : (
                  selectedSignIds.map((id, index) => (
                    <div key={index} className="w-12 h-12 border-2 border-[#1a1a1a] bg-[#ece4d0] shadow-[1px_1px_0_rgba(0,0,0,1)] flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleSignId(id); }}
                        className="absolute top-0 right-0 bg-[#8b2a1a] text-[#f4ecd8] text-[7px] w-3 h-3 flex items-center justify-center select-none"
                      >
                        ✕
                      </button>
                      {id.startsWith('data:image') ? (
                        <img src={id} className="w-full h-full object-cover" alt="Custom" />
                      ) : (
                        <img src={id} className="w-10 h-10 object-contain" alt="Standard" />
                      )}
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => setShowCamera(true)}
                className="w-full md:w-auto px-4 py-2.5 bg-[#1a1a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[3px_3px_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-[0.98] transition-all cursor-pointer font-cactus font-bold uppercase text-xs tracking-wider shrink-0"
              >
                📸 {t[wizardLang].prendrePhoto}
              </button>
            </div>
          </div>

          {/* Bloc 5 : Identité du Morceau */}
          <div className="bg-[#f4ecd8] border-3 border-[#1a1a1a] p-4 md:p-5 shadow-[4px_4px_0_rgba(0,0,0,1)] flex flex-col gap-4 rounded-sm">
            <h3 className="font-cactus text-lg md:text-xl font-bold text-[#8b2a1a] uppercase tracking-wider border-b border-[#1a1a1a]/20 pb-1">
              {t[wizardLang].identiteMorceau}
            </h3>
            <span className="text-[11px] md:text-xs text-[#1a1a1a] font-cactus font-bold uppercase -mt-2">
              {t[wizardLang].espritMorceau}
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]/70">
                  {t[wizardLang].rodaLabel}
                </label>
                <input
                  type="text"
                  value={songInfo.rodaName}
                  onChange={(e) => updateSongInfo('rodaName', e.target.value)}
                  placeholder={t[wizardLang].placeholderSaisir}
                  className="w-full bg-[#ece4d0] border-2 border-[#1a1a1a] p-2 font-sans text-xs text-[#1a1a1a] focus:outline-none focus:border-[#8b2a1a] shadow-[2px_2px_0_rgba(0,0,0,1)] rounded-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]/70">
                  {t[wizardLang].toadaLabel}
                </label>
                <input
                  type="text"
                  value={songInfo.toadaName}
                  onChange={(e) => updateSongInfo('toadaName', e.target.value)}
                  placeholder={t[wizardLang].placeholderSaisir}
                  className="w-full bg-[#ece4d0] border-2 border-[#1a1a1a] p-2 font-sans text-xs text-[#1a1a1a] focus:outline-none focus:border-[#8b2a1a] shadow-[2px_2px_0_rgba(0,0,0,1)] rounded-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]/70">
                  {t[wizardLang].nacaoLabel}
                </label>
                <input
                  type="text"
                  value={songInfo.nacaoName}
                  onChange={(e) => updateSongInfo('nacaoName', e.target.value)}
                  placeholder={t[wizardLang].placeholderSaisir}
                  className="w-full bg-[#ece4d0] border-2 border-[#1a1a1a] p-2 font-sans text-xs text-[#1a1a1a] focus:outline-none focus:border-[#8b2a1a] shadow-[2px_2px_0_rgba(0,0,0,1)] rounded-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]/70">
                  {t[wizardLang].compositeurLabel}
                </label>
                <input
                  type="text"
                  value={songInfo.composer}
                  onChange={(e) => updateSongInfo('composer', e.target.value)}
                  placeholder={t[wizardLang].placeholderSaisir}
                  className="w-full bg-[#ece4d0] border-2 border-[#1a1a1a] p-2 font-sans text-xs text-[#1a1a1a] focus:outline-none focus:border-[#8b2a1a] shadow-[2px_2px_0_rgba(0,0,0,1)] rounded-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]/70">
                  {t[wizardLang].ritmoLabel}
                </label>
                <input
                  type="text"
                  value={songInfo.mainRythm}
                  onChange={(e) => updateSongInfo('mainRythm', e.target.value)}
                  placeholder={t[wizardLang].placeholderSaisir}
                  className="w-full bg-[#ece4d0] border-2 border-[#1a1a1a] p-2 font-sans text-xs text-[#1a1a1a] focus:outline-none focus:border-[#8b2a1a] shadow-[2px_2px_0_rgba(0,0,0,1)] rounded-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]/70">
                  {t[wizardLang].youtubeLabel}
                </label>
                <input
                  type="url"
                  value={songInfo.youtubeUrl}
                  onChange={(e) => updateSongInfo('youtubeUrl', e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#ece4d0] border-2 border-[#1a1a1a] p-2 font-sans text-xs text-[#1a1a1a] focus:outline-none focus:border-[#8b2a1a] shadow-[2px_2px_0_rgba(0,0,0,1)] rounded-sm"
                />
              </div>
            </div>
          </div>

          {/* Consécration button */}
          <button
            onClick={generateRodaFromWizard}
            className="w-full mt-4 py-4 bg-[#8b2a1a] text-[#f4ecd8] border-3 border-[#1a1a1a] shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] active:scale-[0.98] transition-all cursor-pointer font-cactus font-bold uppercase text-base md:text-lg tracking-wider"
          >
            {t[wizardLang].faireSonner}
          </button>
        </div>
      </div>,
      modalRoot
    );
  }

  const content = (
    <div 
      className="fixed inset-0 bg-[#f4ecd8] z-[9998] flex flex-col p-4 md:p-8 select-none font-sans overflow-hidden"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        ref={ghostRef}
        className="pointer-events-none fixed items-center justify-center flex-col select-none"
        style={{ display: 'none', zIndex: 99999 }}
      />

      <div
        ref={dismissZoneRef}
        className="absolute top-18 left-1/2 -translate-x-1/2 border-3 border-[#1a1a1a] bg-[#e2d7be] px-6 py-2.5 shadow-[4px_4px_0px_rgba(0,0,0,1)] z-[10001] transition-all duration-200 pointer-events-none opacity-0 select-none flex items-center gap-2 font-cactus font-bold uppercase text-xs md:text-sm"
        style={{
          transform: 'translate(-50%, -150%)',
        }}
      >
        <span className="text-sm md:text-base">🚪</span>
        <span>{t[wizardLang].congedier}</span>
      </div>

      {localToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10005] max-w-md w-full px-4 animate-bounce">
          <div className="bg-[#f4ecd8] border-3 border-[#1a1a1a] shadow-[6px_6px_0px_rgba(0,0,0,1)] p-4 rounded-sm flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1 text-xs md:text-sm font-bold text-[#8b2a1a] leading-tight font-cactus uppercase tracking-wide">
              {localToast}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center border-b-4 border-[#1a1a1a] pb-3 mb-4 flex-shrink-0">
        <div>
          <h2 className="font-cactus text-2xl md:text-4xl font-bold text-[#1a1a1a] uppercase tracking-wider leading-none">
            {t[wizardLang].title}
          </h2>
          <p className="text-[#1a1a1a]/70 text-[10px] md:text-xs mt-1 font-cactus font-bold tracking-wide uppercase">
            {t[wizardLang].step1Sub} ({placedInstruments.length} {wizardLang === 'fr' ? 'instrument(s)' : 'instrumento(s)'})
          </p>
        </div>
        
        <button
          onClick={onClose}
          className="px-3 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-[0.98] transition-all cursor-pointer font-cactus font-bold uppercase text-[10px] md:text-xs"
        >
          {t[wizardLang].annuler}
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        <div className="flex-shrink-0 flex flex-col gap-3 md:w-52 min-h-0">
          
          <div 
            onClick={toggleToada}
            className="flex items-center gap-3 p-3 bg-[#f4ecd8] border-3 border-[#1a1a1a] shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-[0.98] transition-all cursor-pointer rounded-sm select-none"
          >
            <div className="w-6 h-6 border-2 border-[#1a1a1a] flex items-center justify-center font-cactus text-lg font-bold bg-[#ece4d0] text-[#8b2a1a] select-none shrink-0">
              {hasToada ? '✕' : ''}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a] leading-tight">
                {t[wizardLang].inclureChant}
              </span>
              <span className="text-[8px] text-[#1a1a1a]/60 leading-none">
                {t[wizardLang].activerToada}
              </span>
            </div>
          </div>

          <div className="flex-1 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible md:overflow-y-auto p-2 bg-[#1a1a1a]/5 border-2 border-dashed border-[#1a1a1a]/20 rounded-sm scrollbar-thin">
            <div className="hidden md:block text-[10px] uppercase font-bold text-[#1a1a1a]/60 pb-1 border-b border-[#1a1a1a]/10 mb-1">
              {t[wizardLang].instrumentsGlissables}
            </div>
            {AVAILABLE_INSTRUMENTS.map((inst) => (
              <div
                key={inst.id}
                onPointerDown={(e) => handlePalettePointerDown(e, inst.id)}
                className="flex-shrink-0 flex md:flex-row flex-col items-center gap-1.5 md:gap-3 p-2 bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-grab select-none rounded-sm text-center md:text-left touch-none group md:w-full min-w-[70px] md:min-w-0"
                style={{ borderColor: inst.color }}
              >
                <img 
                  src={inst.iconImg} 
                  className="w-7 h-7 object-contain group-hover:scale-110 duration-200 pointer-events-none p-0.5 rounded-full bg-[#1a1a1a]/5"
                  style={{ border: `2px solid ${inst.color}` }}
                  alt="" 
                />
                <div className="flex flex-col">
                  <span className="text-[9px] font-cactus font-bold uppercase text-[#1a1a1a] leading-none">
                    {inst.label}
                  </span>
                  <span className="hidden md:inline text-[7px] text-[#1a1a1a]/60 leading-none mt-0.5">
                    {inst.id === 'marcante' || inst.id === 'meiao' || inst.id === 'repique' ? 'Alfaia' : 'Percussion'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div 
          ref={placeRef}
          className="flex-1 relative bg-[#ece4d0] border-4 border-[#1a1a1a] shadow-[6px_6px_0px_rgba(0,0,0,1)] rounded-sm min-h-[250px] touch-none overflow-hidden select-none"
        >
          {W > 0 && H > 0 && (
            <svg 
              className="absolute inset-0 pointer-events-none select-none z-0" 
              width={W} 
              height={H}
            >
              <line 
                x1={W / 2} 
                y1={H} 
                x2={W / 2} 
                y2={0} 
                stroke="#1a1a1a" 
                strokeWidth="1.2" 
                strokeOpacity="0.12" 
                strokeDasharray="4 4"
              />
              
              {(() => {
                const len = Math.max(W, H) * 1.5;
                const xLeft = W / 2 + len * Math.cos(5 * Math.PI / 6);
                const yLeft = H - len * Math.sin(5 * Math.PI / 6);
                const xRight = W / 2 + len * Math.cos(Math.PI / 6);
                const yRight = H - len * Math.sin(Math.PI / 6);
                return (
                  <>
                    <line 
                      x1={W / 2} 
                      y1={H} 
                      x2={xLeft} 
                      y2={yLeft} 
                      stroke="#1a1a1a" 
                      strokeWidth="1.8" 
                      strokeOpacity="0.25"
                    />
                    <line 
                      x1={W / 2} 
                      y1={H} 
                      x2={xRight} 
                      y2={yRight} 
                      stroke="#1a1a1a" 
                      strokeWidth="1.8" 
                      strokeOpacity="0.25"
                    />
                  </>
                );
              })()}

              {[0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
                const r = H * ratio;
                const cos30 = Math.cos(Math.PI / 6);
                const sin30 = Math.sin(Math.PI / 6);
                const cos150 = Math.cos(5 * Math.PI / 6);
                const sin150 = Math.sin(5 * Math.PI / 6);

                const x1 = W / 2 + r * cos30;
                const y1 = H - r * sin30;
                const x2 = W / 2 + r * cos150;
                const y2 = H - r * sin150;

                const pathData = `M ${x1} ${y1} A ${r} ${r} 0 0 0 ${x2} ${y2}`;

                return (
                  <path
                    key={idx}
                    d={pathData}
                    fill="none"
                    stroke="#1a1a1a"
                    strokeWidth={ratio === 1.0 ? "2" : "1"}
                    strokeOpacity={ratio === 1.0 ? "0.35" : "0.15"}
                    strokeDasharray={ratio === 1.0 ? "0" : "3 3"}
                  />
                );
              })}
            </svg>
          )}

          {placedInstruments.map((inst) => {
            const config = AVAILABLE_INSTRUMENTS.find(i => i.id === inst.instrumentType);
            return (
              <div
                key={inst.id}
                onPointerDown={(e) => handlePlacedPointerDown(e, inst.id)}
                className="absolute flex flex-col items-center justify-center cursor-move p-1 rounded-full border-3 shadow-[2px_2px_0px_rgba(0,0,0,1)] select-none bg-[#f4ecd8] active:scale-95 duration-100 touch-none text-center z-10"
                style={{
                  left: `${inst.x}%`,
                  top: `${inst.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '52px',
                  height: '52px',
                  borderColor: config?.color || '#1a1a1a',
                }}
              >
                <div 
                  className="remove-cross absolute inset-0 bg-[#8b2a1a]/10 rounded-full flex items-center justify-center text-3xl font-bold text-[#1a1a1a] opacity-0 transition-opacity duration-150 pointer-events-none select-none z-30"
                  style={{ fontFamily: 'monospace' }}
                >
                  ✕
                </div>

                <img 
                  src={config?.iconImg} 
                  className="w-6 h-6 object-contain pointer-events-none p-0.5 rounded-full bg-[#1a1a1a]/5" 
                  alt="" 
                />
                <span className="text-[7px] font-cactus font-bold uppercase truncate max-w-[44px] leading-none mt-0.5 text-[#1a1a1a]">
                  {config?.label || inst.instrumentType}
                </span>
              </div>
            );
          })}

          <div 
            className="absolute flex flex-col items-center justify-center p-2 rounded-full border-3 border-[#8b2a1a] bg-[#f4ecd8] shadow-[3px_3px_0px_rgba(139,42,26,0.3)] pointer-events-none select-none text-center z-20"
            style={{
              left: '50%',
              top: '100%',
              transform: 'translate(-50%, -50%)',
              width: '64px',
              height: '64px',
            }}
          >
            <img src="icones/apito.svg" className="w-7 h-7 object-contain opacity-90" alt="" />
            <span className="text-[7px] font-cactus font-bold uppercase text-[#8b2a1a] leading-none mt-0.5">
              {t[wizardLang].mestre}
            </span>
            <span className="text-[5px] uppercase font-bold text-[#8b2a1a]/60 leading-none">
              {t[wizardLang].auditeur}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t-2 border-[#1a1a1a] flex justify-between items-center flex-shrink-0">
        <div className="text-[10px] md:text-xs text-[#1a1a1a]/70 font-cactus uppercase font-bold">
          {t[wizardLang].infoRetirer}
        </div>

        <button
          onClick={() => setStep(2)}
          className="px-6 py-2.5 bg-[#1a1a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[4px_4px_0px_rgba(139,42,26,0.5)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:scale-[0.98] transition-all cursor-pointer font-cactus font-bold uppercase text-xs tracking-wider"
        >
          {t[wizardLang].suivant}
        </button>
      </div>
    </div>
  );

  return createPortal(content, modalRoot);
};
