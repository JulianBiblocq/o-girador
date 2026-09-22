/**
 * Constantes d'architecture et URLs officielles de l'écosystème O-Girador.
 * Domaines de production OVH & mapping des ports de développement local.
 */

export const ECOSYSTEM_DOMAINS = Object.freeze({
  hub: 'https://o-girador.com',
  orquestrador: 'https://o-girador.com',
  sequenciador: 'https://sequenciador.o-girador.com',
  organizador: 'https://organizador.o-girador.com',
  dancador: 'https://dancador.o-girador.com',
  mostrador: 'https://mostrador.o-girador.com',
} as const);

export type EcosystemAppKey = keyof typeof ECOSYSTEM_DOMAINS;

export const LOCAL_DEV_PORTS: Record<EcosystemAppKey, number> = Object.freeze({
  hub: 5173,
  orquestrador: 5173,
  sequenciador: 5174,
  organizador: 5175,
  dancador: 5176,
  mostrador: 5173,
});

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
