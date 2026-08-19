import { useState, useEffect } from 'react';

export function useAudioDevices() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  useEffect(() => {
    let active = true;

    const refreshDevices = async () => {
      try {
        // Enumerate all media devices
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = allDevices.filter(d => d.kind === 'audioinput');
        
        if (active) {
          setDevices(audioInputs);
          
          // Fallback selection to first device or empty (default) if current selection is invalid
          setSelectedDeviceId(prev => {
            const stillExists = audioInputs.some(d => d.deviceId === prev);
            if (stillExists) return prev;
            return audioInputs[0]?.deviceId || '';
          });
        }
      } catch (err) {

      }
    };

    refreshDevices();

    // Listen to media device plugging/unplugging in real-time
    navigator.mediaDevices.addEventListener('devicechange', refreshDevices);

    return () => {
      active = false;
      navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
    };
  }, []);

  return {
    devices,
    selectedDeviceId,
    setSelectedDeviceId
  };
}
