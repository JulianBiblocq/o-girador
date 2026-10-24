/**
 * Hook de gestion réactive des brouillons d'import papier (< 90 lignes).
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PaperScanDraftDocument,
  PaperScanDraftPayload,
  savePaperScanDraft,
  listPaperScanDrafts,
  deletePaperScanDraft,
  parseDraftPayload,
} from '../../utils/paper/paperScanCloudStorage';

export function usePaperScanDrafts(currentScoreId?: string) {
  const [draftsList, setDraftsList] = useState<PaperScanDraftDocument[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);

  const refreshDrafts = useCallback(async () => {
    setIsLoadingDrafts(true);
    try {
      const items = await listPaperScanDrafts();
      setDraftsList(items);
    } finally {
      setIsLoadingDrafts(false);
    }
  }, []);

  useEffect(() => {
    refreshDrafts();
  }, [refreshDrafts]);

  const saveCurrentDraft = useCallback(async (
    title: string,
    payload: PaperScanDraftPayload,
    deviceType: 'mobile' | 'desktop'
  ): Promise<PaperScanDraftDocument> => {
    setIsSavingDraft(true);
    try {
      const draftId = activeDraftId || `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const docData: PaperScanDraftDocument = {
        id: draftId,
        title: title || 'Import Papier',
        updatedAt: Date.now(),
        deviceType,
        isDraft: true,
        docType: 'paper_scan_draft',
        payloadJson: JSON.stringify(payload),
      };
      const saved = await savePaperScanDraft(docData);
      setActiveDraftId(saved.id);
      await refreshDrafts();
      return saved;
    } finally {
      setIsSavingDraft(false);
    }
  }, [activeDraftId, refreshDrafts]);

  const removeDraft = useCallback(async (id: string) => {
    await deletePaperScanDraft(id);
    if (activeDraftId === id) setActiveDraftId(null);
    await refreshDrafts();
  }, [activeDraftId, refreshDrafts]);

  const latestResumeableDraft = useMemo(() => {
    if (draftsList.length === 0) return null;
    return draftsList.find((d) => d.id !== activeDraftId) || null;
  }, [draftsList, activeDraftId]);

  return {
    draftsList,
    activeDraftId,
    setActiveDraftId,
    isSavingDraft,
    isLoadingDrafts,
    saveCurrentDraft,
    removeDraft,
    refreshDrafts,
    latestResumeableDraft,
    parseDraftPayload,
  };
}
