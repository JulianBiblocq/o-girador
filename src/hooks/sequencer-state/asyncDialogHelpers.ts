import { useState, useCallback } from 'react';

export interface CustomDialogState {
  type: 'alert' | 'confirm' | 'prompt';
  message: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onResolve: (result: any) => void;
}

export function useAsyncDialog() {
  const [customDialog, setCustomDialog] = useState<CustomDialogState | null>(null);

  const alertAsync = useCallback((message: string): Promise<void> => {
    return new Promise((resolve) => {
      setCustomDialog({ type: 'alert', message, onResolve: resolve });
    });
  }, []);

  const confirmAsync = useCallback((message: string, confirmLabel?: string, cancelLabel?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setCustomDialog({ type: 'confirm', message, confirmLabel, cancelLabel, onResolve: resolve });
    });
  }, []);

  const promptAsync = useCallback((message: string, defaultValue = ''): Promise<string | null> => {
    return new Promise((resolve) => {
      setCustomDialog({ type: 'prompt', message, defaultValue, onResolve: resolve });
    });
  }, []);

  return {
    customDialog,
    setCustomDialog,
    alertAsync,
    confirmAsync,
    promptAsync,
  };
}
