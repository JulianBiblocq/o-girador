import React, { useState, useEffect } from 'react';
import { Mic, ChevronDown, ChevronUp, Radio, CheckCircle2, Sliders } from 'lucide-react';
import { useAudioStore } from '../stores/useAudioStore';
import { useSequencerStore } from '../stores/useSequencerStore';

export const AudioSourceBar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAskingPermission, setIsAskingPermission] = useState(false);

  const selectedDeviceId = useAudioStore((state) => state.selectedDeviceId);
  const availableDevices = useAudioStore((state) => state.availableDevices);
  const setSelectedDeviceId = useAudioStore((state) => state.setSelectedDeviceId);
  const refreshAudioDevices = useAudioStore((state) => state.refreshAudioDevices);

  const lang = useSequencerStore((state) => state.lang);

  // Auto-refresh devices on mount if permissions were already granted
  useEffect(() => {
    refreshAudioDevices();
  }, [refreshAudioDevices]);

  const handleRequestPermission = async () => {
    setIsAskingPermission(true);
    try {
      console.log("🎙️ [AUDIO SOURCE BAR] Requesting audio permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      console.log("🎙️ [AUDIO SOURCE BAR] Audio permission granted! Refreshing device list...");
      await refreshAudioDevices();
    } catch (err: any) {
      console.warn("🎙️ [AUDIO SOURCE BAR] Error requesting permission:", err);
      alert(lang === 'fr' 
        ? "Impossible de lister les entrées audio : " + err.message 
        : "Erro ao listar dispositivos: " + err.message);
    } finally {
      setIsAskingPermission(false);
    }
  };

  const selectedDeviceLabel = availableDevices.find(d => d.deviceId === selectedDeviceId)?.label 
    || (selectedDeviceId ? `Périphérique (${selectedDeviceId.slice(0, 8)})` : (lang === 'fr' ? "Micro / Carte Son par défaut" : "Padrão"));

  return (
    <div className="w-full shrink-0 z-[90] bg-[#ece4d0] border-b-3 border-[#1a1a1a] font-sans text-[#1a1a1a] select-none transition-all">
      
      {/* Retractable Header Bar (Trigger) */}
      <div className="max-w-7xl mx-auto px-4 py-1 flex items-center justify-between gap-3 text-xs font-bold">
        
        {/* Left: Quick Status Badge */}
        <div className="flex items-center gap-2">
          <div className="p-1 bg-[#8b2a1a] text-[#fdfaf2] rounded-sm border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a]">
            <Mic className="w-3.5 h-3.5" />
          </div>
          <span className="font-cactus uppercase tracking-wider text-[11px] font-black text-[#8b2a1a]">
            {lang === 'fr' ? "Source Audio :" : "Fonte de Áudio :"}
          </span>
          <span className="font-mono text-[11px] text-[#1a1a1a] font-bold truncate max-w-[240px] md:max-w-[360px]">
            {selectedDeviceLabel}
          </span>
        </div>

        {/* Right: Retractable Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-0.5 bg-[#b89f74] hover:bg-[#8b2a1a] hover:text-[#fdfaf2] text-[#1a1a1a] font-cactus font-bold text-[11px] border border-[#1a1a1a] shadow-[1.5px_1.5px_0px_#1a1a1a] rounded-sm transition-all cursor-pointer flex items-center gap-1.5 uppercase"
        >
          <Sliders className="w-3 h-3" />
          <span>
            {isOpen 
              ? (lang === 'fr' ? "Masquer Réglages" : "Ocultar") 
              : (lang === 'fr' ? "Configurer Carte Son / Micro" : "Configurar Placa")}
          </span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded Dropdown Panel */}
      {isOpen && (
        <div className="bg-[#e2d8be] border-t-2 border-[#1a1a1a]/20 p-3 shadow-inner">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Action 1: Enumerate Devices Button */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={handleRequestPermission}
                disabled={isAskingPermission}
                className="px-3.5 py-1.5 bg-[#8b2a1a] text-[#fdfaf2] hover:bg-[#1a1a1a] font-cactus font-bold text-xs border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] rounded-sm transition-all cursor-pointer flex items-center gap-2 uppercase shrink-0 disabled:opacity-50"
              >
                <Radio className="w-4 h-4 text-[#ffd369] animate-pulse" />
                <span>
                  {isAskingPermission 
                    ? (lang === 'fr' ? "Détection..." : "Detectando...") 
                    : (lang === 'fr' ? "Activer & Lister les Cartes Son" : "Ativar e Listar Placas")}
                </span>
              </button>

              <span className="text-[10px] font-sans text-[#1a1a1a]/70 max-w-xs">
                {lang === 'fr' 
                  ? "Cliquez pour autoriser l'accès et afficher les noms réels de vos cartes son (Focusrite, Scarlett, Webcam, etc.)." 
                  : "Clique para autorizar e listar os nomes reais das suas placas."}
              </span>
            </div>

            {/* Action 2: Select Device Dropdown */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <span className="text-xs font-bold font-cactus uppercase text-[#1a1a1a] shrink-0">
                {lang === 'fr' ? "Sélectionner la source :" : "Selecionar fonte :"}
              </span>

              <select
                value={selectedDeviceId || ''}
                onChange={(e) => setSelectedDeviceId(e.target.value || null)}
                className="bg-[#fdfaf2] border-2 border-[#1a1a1a] font-mono font-bold text-xs px-3 py-1.5 rounded-sm shadow-[2px_2px_0px_#1a1a1a] focus:outline-none cursor-pointer text-[#1a1a1a] min-w-[220px] max-w-[320px] truncate"
              >
                <option value="">
                  {lang === 'fr' ? "-- Micro par défaut --" : "-- Padrão --"}
                </option>
                {availableDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Entrée Audio (${device.deviceId.slice(0, 6)}...)`}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* RAW Audio Status Footer */}
          <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-[#1a1a1a]/10 flex items-center justify-between text-[10px] font-mono text-[#2a5d4e]">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#2a5d4e]" />
              <span>Filtres navigateur (Écho, Bruit, AGC) : <strong>Désactivés (RAW Audio Mode)</strong></span>
            </div>
            <span>Latence Minimale Matérielle Active</span>
          </div>
        </div>
      )}

    </div>
  );
};
