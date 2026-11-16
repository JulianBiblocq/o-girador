import { useEffect, useState } from 'react';
import { useWizardStore } from '../../stores/useWizardStore';
import { useAuth } from '../../contexts/AuthContext';
import { fetchCloudSections, getCloudSectionData } from '../../cloudSections';
import { instrumentsConfig } from '../../data';
import { CloudSection } from '../../types';

export function useWizardCloudSections() {
  const { userProfile } = useAuth();
  const selectedCloudSectionId = useWizardStore((s) => s.selectedCloudSectionId);
  const selectedCloudSectionData = useWizardStore((s) => s.selectedCloudSectionData);
  const setSelectedCloudSection = useWizardStore((s) => s.setSelectedCloudSection);
  const setTimeSig = useWizardStore((s) => s.setTimeSig);
  const placedInstruments = useWizardStore((s) => s.placedInstruments);

  const [cloudSections, setCloudSections] = useState<CloudSection[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);

  useEffect(() => {
    if (!userProfile?.uid) return;
    let active = true;
    fetchCloudSections(
      userProfile.uid,
      userProfile.role || 'eleve',
      userProfile.mestreId || null,
      userProfile.groupId,
      userProfile.canWriteSequenciador
    )
      .then((list) => {
        if (active) setCloudSections(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userProfile?.uid, userProfile?.role, userProfile?.mestreId, userProfile?.groupId, userProfile?.canWriteSequenciador]);

  const selectCloudSection = async (secId: string) => {
    if (!secId) {
      setSelectedCloudSection(null, null, null);
      return;
    }
    const found = cloudSections.find((c) => c.id === secId);
    setLoadingCloud(true);
    try {
      const data = await getCloudSectionData(secId);
      if (data) {
        setSelectedCloudSection(secId, found?.name || secId, data);
        if (data.timeSigs?.[0]) setTimeSig(data.timeSigs[0]);
      }
    } finally {
      setLoadingCloud(false);
    }
  };

  const matchedCount = selectedCloudSectionData
    ? placedInstruments.filter((inst) => {
        const idx = instrumentsConfig.findIndex((c) => c.id === inst.instrumentType);
        return idx !== -1 && selectedCloudSectionData.tracks.some((tr) => tr.instrumentIdx === idx);
      }).length
    : 0;

  return {
    cloudSections,
    loadingCloud,
    selectedCloudSectionId,
    selectedCloudSectionData,
    placedCount: placedInstruments.length,
    matchedCount,
    selectCloudSection,
  };
}
