/**
 * Constantes d'architecture et URLs officielles de l'écosystème O Girador.
 * Domaines de production & mapping strict des ports de développement local (5170..5178).
 */

export const ECOSYSTEM_DOMAINS = Object.freeze({
  hub: 'https://www.o-girador.com',
  orquestrador: 'https://www.o-girador.com',
  sequenciador: 'https://sequenciador.o-girador.com',
  organizador: 'https://organizador.o-girador.com',
  mostrador: 'https://mostrador.o-girador.com',
  dancador: 'https://dancador.o-girador.com',
  cantador: 'https://cantador.o-girador.com',
  vocalLab: 'https://cantador.o-girador.com',
  afinador: 'https://afinador.o-girador.com',
} as const);

export type EcosystemAppKey = keyof typeof ECOSYSTEM_DOMAINS;

export const LOCAL_DEV_PORTS: Record<EcosystemAppKey, number> = Object.freeze({
  hub: 5170,
  orquestrador: 5170,
  sequenciador: 5174,
  organizador: 5175,
  mostrador: 5175,
  dancador: 5176,
  cantador: 5177,
  vocalLab: 5177,
  afinador: 5178,
});

export const ECOSYSTEM_APPS_REGISTRY = Object.freeze({
  orquestrador: { enabled: true, localPort: 5170, prodUrl: ECOSYSTEM_DOMAINS.orquestrador },
  sequenciador: { enabled: true, localPort: 5174, prodUrl: ECOSYSTEM_DOMAINS.sequenciador },
  organizador: { enabled: true, localPort: 5175, prodUrl: ECOSYSTEM_DOMAINS.organizador },
  mostrador: { enabled: true, localPort: 5175, prodUrl: ECOSYSTEM_DOMAINS.mostrador },
  dancador: { enabled: true, localPort: 5176, prodUrl: ECOSYSTEM_DOMAINS.dancador },
  cantador: { enabled: true, localPort: 5177, prodUrl: ECOSYSTEM_DOMAINS.cantador },
  afinador: { enabled: false, comingSoon: true, localPort: 5178, prodUrl: ECOSYSTEM_DOMAINS.afinador },
} as const);

export const ECOSYSTEM_LOCAL_URLS = {
  ORQUESTRADOR: 'http://localhost:5170',
  SEQUENCIADOR: 'http://localhost:5174',
  ORGANIZADOR: 'http://localhost:5175',
  MOSTRADOR: 'http://localhost:5175',
  DANCADOR: 'http://localhost:5176',
  CANTADOR: 'http://localhost:5177',
  VOCAL_LAB: 'http://localhost:5177',
  AFINADOR: 'http://localhost:5178',
} as const;

export function isLocalEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function getEcosystemUrl(appKey: EcosystemAppKey, path: string = ''): string {
  // Par défaut, rediriger vers les applications officielles en ligne (.web.app)
  // afin que tous les liens fonctionnent immédiatement en local comme en production.
  const useLocal = typeof window !== 'undefined' &&
    (window.location.search.includes('localEcosystem=true') || (import.meta as any).env?.VITE_USE_LOCAL_ECOSYSTEM === 'true');

  let baseUrl: string = ECOSYSTEM_DOMAINS[appKey] || ECOSYSTEM_DOMAINS.hub;
  if (useLocal && isLocalEnvironment() && LOCAL_DEV_PORTS[appKey]) {
    baseUrl = `http://localhost:${LOCAL_DEV_PORTS[appKey]}`;
  }

  if (!path) return baseUrl;
  const cleanPath = path.startsWith('/') || path.startsWith('?') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}
