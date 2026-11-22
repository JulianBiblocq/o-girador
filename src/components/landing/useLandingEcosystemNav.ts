import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { UserProfile } from '../../contexts/AuthContext';
import { getEcosystemUrl } from '../../constants/ecosystemUrls';
import { launchCrossApp } from '../../utils/crossAppAuth';
import { resolveGroupLogoFromCloud } from '../../services/cloud-groups/cloudGroupVariants';

function isWhiteLabelCaptureActive(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('capture') === '1' || document.documentElement.dataset.tourActive === 'true';
}

export function useLandingEcosystemNav(currentUser: User | null, userProfile: UserProfile | null) {
  const [cloudGroupLogo, setCloudGroupLogo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!currentUser || !userProfile?.groupId || isWhiteLabelCaptureActive()) {
      setCloudGroupLogo(null);
      return;
    }
    if (userProfile.groupLogoUrl) {
      setCloudGroupLogo(userProfile.groupLogoUrl);
      return;
    }
    resolveGroupLogoFromCloud(userProfile.groupId).then((url) => {
      if (!cancelled) setCloudGroupLogo(url);
    });
    return () => { cancelled = true; };
  }, [currentUser, userProfile?.groupId, userProfile?.groupLogoUrl]);

  const openApp = useCallback((appKey: 'orquestrador' | 'cantador' | 'dancador' | 'afinador', appLabel: string) => {
    const url = getEcosystemUrl(appKey);
    if (currentUser) launchCrossApp(url, { appKey, appLabel });
    else window.open(url, '_blank', 'noopener,noreferrer');
  }, [currentUser]);

  const handleLaunchOrquestrador = useCallback((e: React.MouseEvent) => { e.preventDefault(); openApp('orquestrador', 'Orquestrador'); }, [openApp]);
  const handleLaunchCantador = useCallback((e: React.MouseEvent) => { e.preventDefault(); openApp('cantador', 'Cantador'); }, [openApp]);
  const handleLaunchDancador = useCallback((e: React.MouseEvent) => { e.preventDefault(); openApp('dancador', 'Dançador'); }, [openApp]);
  const handleLaunchAfinador = useCallback((e: React.MouseEvent) => { e.preventDefault(); openApp('afinador', 'Afinador'); }, [openApp]);
  const handleCurrentAppClick = useCallback((e: React.MouseEvent) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);

  const handleLaunchOrganizador = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!currentUser) window.open('https://organizador.o-girador.com/demo', '_blank', 'noopener,noreferrer');
    else launchCrossApp(getEcosystemUrl('organizador'), { appKey: 'organizador', appLabel: 'Organizador' });
  }, [currentUser]);

  const rawGroupId = userProfile?.groupId?.trim()?.toLowerCase();
  const mostradorHref = currentUser && rawGroupId
    ? `https://mostrador.o-girador.com/${encodeURIComponent(rawGroupId)}`
    : 'https://organizador.o-girador.com/demo?app=mostrador';

  const handleLaunchMostrador = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!currentUser || !rawGroupId) window.open('https://organizador.o-girador.com/demo?app=mostrador', '_blank', 'noopener,noreferrer');
    else launchCrossApp(`https://mostrador.o-girador.com/${encodeURIComponent(rawGroupId)}`, { appKey: 'mostrador', appLabel: 'Mostrador' });
  }, [currentUser, rawGroupId]);

  const organizadorGroupLogo =
    currentUser && !isWhiteLabelCaptureActive() ? (userProfile?.groupLogoUrl || cloudGroupLogo || null) : null;

  return {
    organizadorGroupLogo,
    mostradorHref,
    handleLaunchOrquestrador,
    handleCurrentAppClick,
    handleLaunchOrganizador,
    handleLaunchCantador,
    handleLaunchDancador,
    handleLaunchAfinador,
    handleLaunchMostrador,
  };
}
