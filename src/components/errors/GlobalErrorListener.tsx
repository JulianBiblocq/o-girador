/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { telemetryService } from '../../services/telemetryService';

export const GlobalErrorListener: React.FC = () => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const sendTelemetry = (type: string, message: string, stack?: string) => {
      try {
        const errorObj = new Error(message);
        if (stack) errorObj.stack = stack;
        telemetryService.logError(errorObj, type);
      } catch (_) {}
    };

    const handleError = (e: ErrorEvent) => {
      const msg = `[Global Error] ${e.message} at ${e.filename}:${e.lineno}:${e.colno}\n${e.error?.stack || ''}`;
      setErrorMsg(msg);
      sendTelemetry('GlobalError', e.message, e.error?.stack);
    };

    const handleRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason;
      const stack = reason?.stack || reason?.message || String(reason);
      const msg = `[Promise Rejection] ${stack}`;
      setErrorMsg(msg);
      sendTelemetry('UnhandledRejection', String(reason?.message || reason), stack);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (!errorMsg) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: '#8b2a1a',
      color: '#f4ecd8',
      padding: '2rem',
      zIndex: 999999,
      fontFamily: 'monospace',
      overflowY: 'auto',
      fontSize: '13px',
      textAlign: 'left',
      border: '10px double #f4ecd8',
      boxSizing: 'border-box'
    }}>
      <h1 style={{ fontSize: '20px', borderBottom: '2px solid #f4ecd8', paddingBottom: '0.5rem', marginBottom: '1rem', fontFamily: 'sans-serif' }}>
        ERREUR ASYNCHRONE DETECTEE (TABLETTE)
      </h1>
      <p>L'application a détecté une erreur hors du cycle de rendu standard :</p>
      <pre style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '1rem', overflowX: 'auto', whiteSpace: 'pre-wrap', border: '1px solid rgba(255,255,255,0.2)' }}>
        {errorMsg}
      </pre>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        <button 
          onClick={() => setErrorMsg(null)}
          style={{
            padding: '0.5rem 1.2rem',
            backgroundColor: '#f4ecd8',
            color: '#8b2a1a',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '3px 3px 0 #000'
          }}
        >
          Fermer / Ignorer
        </button>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '0.5rem 1.2rem',
            backgroundColor: 'transparent',
            color: '#f4ecd8',
            border: '2px solid #f4ecd8',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Recharger
        </button>
      </div>
    </div>
  );
};
