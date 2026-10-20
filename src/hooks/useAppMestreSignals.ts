/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CloudRhythmSignal } from '../types';
import { fetchMestreSignals } from '../cloudSignals';
import { useSequencerStore } from '../stores/useSequencerStore';
import { UserProfile } from '../contexts/AuthContext';

export function useAppMestreSignals(userProfile: UserProfile | null, hasAccess: (role: any) => boolean) {
  const [mestreSignals, setMestreSignals] = useState<CloudRhythmSignal[]>([]);
  const [hideGlobalSignals, setHideGlobalSignals] = useState(false);

  const filteredMestreSignals = useMemo(() => {
    if (!hideGlobalSignals) return mestreSignals;
    return mestreSignals.filter(s => s.mestreId !== 'global');
  }, [mestreSignals, hideGlobalSignals]);

  const refreshMestreSignals = useCallback(async () => {
    const actualRole1 = userProfile?.dbRole || userProfile?.role;
    const isMestreAdmin = actualRole1 === 'mestre' || actualRole1 === 'admin';
    const isEleve = hasAccess ? hasAccess('eleve') : false;

    let targetMestreId: string | null = null;
    if (isMestreAdmin) {
      targetMestreId = userProfile?.mestreId || userProfile?.uid || null;
    } else if (isEleve) {
      targetMestreId = userProfile?.mestreId || null;
    }

    if (targetMestreId) {
      const { signals } = await fetchMestreSignals(targetMestreId);
      setMestreSignals(signals);
      useSequencerStore.getState().setMestreSignals(signals);
    } else {
      const { signals } = await fetchMestreSignals('global');
      setMestreSignals(signals);
      useSequencerStore.getState().setMestreSignals(signals);
    }
  }, [userProfile, hasAccess]);

  useEffect(() => {
    refreshMestreSignals();
  }, [userProfile?.uid, userProfile?.mestreId, userProfile?.role, refreshMestreSignals]);

  const handleToggleHideGlobalSignals = useCallback(() => {
    setHideGlobalSignals(prev => !prev);
  }, []);

  return {
    mestreSignals,
    filteredMestreSignals,
    refreshMestreSignals,
    hideGlobalSignals,
    handleToggleHideGlobalSignals,
  };
}
