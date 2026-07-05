import React, { useRef } from 'react';
import { Language, Pattern } from '../../types';

interface VocalRecordingSectionProps {
  lang: Language;
  ptn: Pattern;
  inst: { id: string; type: string };
  selectedAudioDeviceId: string;
  audioDevices: MediaDeviceInfo[];
  isVocalGuideEnabled: boolean;
  recordedPatternIds: number[];
  isCalibrating: boolean;
  onVocalModeChange?: (patternId: number, mode: 'synth' | 'micro') => void;
  onAudioDeviceChange?: (deviceId: string) => void;
  onVocalGuideToggle?: (enabled: boolean) => void;
  onImportVocalFile?: (patternId: number, file: File) => void;
  onDeleteVocalRecording?: (patternId: number) => void;
  onVocalLatencyChange?: (patternId: number, latencyMs: number) => void;
  onVocalBpmSyncToggle?: (patternId: number, sync: boolean) => void;
  onAutoCalibrate: () => void;
}

export const VocalRecordingSection: React.FC<VocalRecordingSectionProps> = ({
  lang,
  ptn,
  inst,
  selectedAudioDeviceId,
  audioDevices,
  isVocalGuideEnabled,
  recordedPatternIds,
  isCalibrating,
  onVocalModeChange,
  onAudioDeviceChange,
  onVocalGuideToggle,
  onImportVocalFile,
  onDeleteVocalRecording,
  onVocalLatencyChange,
  onVocalBpmSyncToggle,
  onAutoCalibrate,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const vocalT = (key: string) => {
    const dictionary: any = {
      fr: {
        vocalMode: 'Mode Vocal',
        synthMode: 'Synthétiseur',
        microMode: 'Microphone (Enregistrement)',
        recordVocal: '🎤 Enregistrer mon chant',
        recording: '🔴 Enregistrement en cours...',
        stopRecord: '⏹ Arrêter',
        deleteRecord: 'Supprimer',
        hasRecord: 'Chant enregistré (Local)',
        noRecordYet: 'Aucun enregistrement vocal pour ce motif.',
        reRecord: '🎤 Ré-enregistrer',
      },
      pt: {
        vocalMode: 'Modo Vocal',
        synthMode: 'Sintetizador',
        microMode: 'Microfone (Gravação)',
        recordVocal: '🎤 Gravar meu canto',
        recording: '🔴 Gravando...',
        stopRecord: '⏹ Parar',
        deleteRecord: 'Excluir',
        hasRecord: 'Canto gravado (Local)',
        noRecordYet: 'Nenhuma gravação vocal para este padrão.',
        reRecord: '🎤 Gravar novamente',
      },
    };
    return dictionary[lang]?.[key] || dictionary['fr'][key] || key;
  };

  if (inst.type !== 'voice') return null;

  return (
    <div className="bg-[#ece4d0] border border-[#1a1a1a]/25 cordel-border-sm p-3 mb-2 flex flex-col md:flex-row items-start md:items-center gap-4 text-[#1a1a1a] shrink-0">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase">{vocalT('vocalMode')} :</span>
        <div className="flex gap-2">
          <button
            onClick={() => onVocalModeChange && onVocalModeChange(ptn.id, 'synth')}
            className={`px-3 py-1 font-bold text-xs cordel-border-sm cursor-pointer transition-colors ${
              ptn.vocalMode !== 'micro'
                ? 'bg-[#1a1a1a] text-[#f4ecd8]'
                : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
            }`}
          >
            🎹 {vocalT('synthMode')}
          </button>
          <button
            onClick={() => onVocalModeChange && onVocalModeChange(ptn.id, 'micro')}
            className={`px-3 py-1 font-bold text-xs cordel-border-sm cursor-pointer transition-colors ${
              ptn.vocalMode === 'micro'
                ? 'bg-[#1a1a1a] text-[#f4ecd8]'
                : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
            }`}
          >
            🎤 {vocalT('microMode')}
          </button>
        </div>
      </div>

      {ptn.vocalMode === 'micro' && (
        <div className="flex flex-col gap-2 flex-grow w-full border-t md:border-t-0 md:border-l border-[#1a1a1a]/20 pt-3 md:pt-0 md:pl-4">
          
          {/* Microphone selection dropdown */}
          <div className="flex flex-col gap-1 w-full border-b border-[#1a1a1a]/10 pb-2 mb-1">
            <label className="text-[10px] font-bold opacity-80 flex items-center gap-1">
              🎙️ {lang === 'fr' ? "Carte son / Entrée micro :" : "Placa de som / Entrada de microfone :"}
            </label>
            <select
              value={selectedAudioDeviceId}
              onChange={(e) => onAudioDeviceChange && onAudioDeviceChange(e.target.value)}
              className="text-xs bg-[#f4ecd8] cordel-border-sm p-1 outline-none text-[#1a1a1a] w-full max-w-xs font-semibold cursor-pointer"
            >
              {audioDevices.length === 0 ? (
                <option value="">{lang === 'fr' ? "Périphérique par défaut" : "Dispositivo padrão"}</option>
              ) : (
                audioDevices.map((dev) => (
                  <option key={dev.deviceId} value={dev.deviceId}>
                    {dev.label || `${lang === 'fr' ? 'Micro' : 'Microfone'} (${dev.deviceId.slice(0, 5)})`}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Melodic guide option */}
          <div className="flex items-center gap-2 w-full mb-1">
            <input
              type="checkbox"
              id={`vocal-guide-toggle-${ptn.id}`}
              checked={isVocalGuideEnabled}
              onChange={(e) => onVocalGuideToggle && onVocalGuideToggle(e.target.checked)}
              className="accent-green-700 cursor-pointer w-3.5 h-3.5"
            />
            <label
              htmlFor={`vocal-guide-toggle-${ptn.id}`}
              className="text-[10px] font-bold opacity-80 cursor-pointer select-none"
            >
              🎵 {lang === 'fr' 
                ? "Jouer le guide mélodique (synthétiseur) pendant l'enregistrement" 
                : "Tocar guia melódico (sintetizador) durante a gravação"}
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full">
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-[#b89f74] text-[#1a1a1a] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[#a68e64] transition-colors flex items-center gap-1.5 font-semibold"
                title={lang === 'fr' ? "Importer un fichier audio existant" : "Importar um arquivo de áudio existente"}
              >
                📥 {lang === 'fr' ? 'Importer' : 'Importar'}
              </button>
              <input
                type="file"
                accept="audio/*"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && onImportVocalFile) {
                    onImportVocalFile(ptn.id, file);
                  }
                }}
                className="hidden"
              />
            </div>

            {recordedPatternIds.includes(ptn.id) ? (
              <div className="flex items-center gap-3 ml-auto flex-wrap">
                <span className="text-xs font-bold text-green-800 flex items-center gap-1">
                  ✅ {vocalT('hasRecord')}
                </span>
                <button
                  onClick={() => onDeleteVocalRecording && onDeleteVocalRecording(ptn.id)}
                  className="px-2 py-1 text-[#8b2a1a] font-bold text-[11px] cordel-border-sm cursor-pointer hover:bg-[#8b2a1a] hover:text-[#f4ecd8] transition-colors"
                >
                  {vocalT('deleteRecord')}
                </button>
              </div>
            ) : (
              <span className="text-xs text-[#666] italic ml-auto">
                {vocalT('noRecordYet')}
              </span>
            )}
          </div>

          {/* Latency adjustment slider */}
          {recordedPatternIds.includes(ptn.id) && (
            <div className="flex flex-col gap-1 w-full border-t border-[#1a1a1a]/10 pt-2 mt-1">
              <div className="flex justify-between text-[10px] font-bold">
                <span>⏱️ {lang === 'fr' ? "Calage temporel (Compensation de la latence)" : "Ajuste de atraso (Compensação de latência)"}</span>
                <span>{ptn.vocalLatency > 0 ? '+' : ''}{ptn.vocalLatency || 0} ms</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-bold opacity-60 shrink-0">-300 ms</span>
                <input
                  type="range"
                  min="-300"
                  max="800"
                  step="5"
                  value={ptn.vocalLatency || 0}
                  onChange={(e) => onVocalLatencyChange && onVocalLatencyChange(ptn.id, parseInt(e.target.value) || 0)}
                  className="flex-grow accent-green-700 cursor-pointer h-1 bg-[#1a1a1a]/10"
                />
                <span className="text-[8px] font-bold opacity-60 shrink-0">800 ms</span>
              </div>
              <span className="text-[8px] text-[#666] font-medium leading-normal">
                {lang === 'fr' 
                  ? "Décale le début de la voix vers la gauche (plus tôt) pour compenser le retard du micro, du smartphone ou du Bluetooth."
                  : "Desloca o início da voz para a esquerda (mais cedo) para compensar o atraso do microfone, celular ou Bluetooth."}
              </span>
              
              <button
                onClick={onAutoCalibrate}
                disabled={isCalibrating}
                className="mt-2 self-start px-2.5 py-1 text-[9px] font-bold uppercase cordel-border-sm bg-[#8b2a1a] text-[#fdfaf2] hover:opacity-95 disabled:opacity-50 cursor-pointer transition-opacity"
              >
                {isCalibrating 
                  ? (lang === 'fr' ? '⏳ Calibration...' : '⏳ Calibrando...') 
                  : (lang === 'fr' ? '⏱️ Auto-calibrer la latence' : '⏱️ Auto-calibrar latência')}
              </button>
            </div>
          )}


          {/* Sync Tempo (Time-stretch) toggle */}
          {recordedPatternIds.includes(ptn.id) && (
            <div className="flex flex-col gap-1 w-full border-t border-[#1a1a1a]/10 pt-2 mt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`vocal-sync-toggle-${ptn.id}`}
                  checked={ptn.vocalBpmSync !== false}
                  onChange={(e) => onVocalBpmSyncToggle && onVocalBpmSyncToggle(ptn.id, e.target.checked)}
                  className="accent-green-700 cursor-pointer w-3.5 h-3.5"
                />
                <label
                  htmlFor={`vocal-sync-toggle-${ptn.id}`}
                  className="text-[10px] font-bold opacity-80 cursor-pointer select-none"
                >
                  🔄 {lang === 'fr' 
                    ? "Sync Tempo / Time-stretch (Conserver la hauteur)" 
                    : "Sync Tempo / Time-stretch (Manter o tom)"}
                </label>
              </div>
              <span className="text-[8px] text-[#666] font-medium leading-normal pl-5">
                {lang === 'fr' 
                  ? `Ajuste automatiquement la vitesse de la voix si le tempo change, sans changer sa hauteur. Tempo d'origine détecté : ${ptn.vocalBaseBpm || '?'} BPM.`
                  : `Ajusta automaticamente a velocidade da voz se o tempo mudar, sem alterar o tom. Tempo original detectado: ${ptn.vocalBaseBpm || '?'} BPM.`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
