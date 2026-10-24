/**
 * Options et groupes du selecteur de partitions papier (< 80 lignes).
 */
import React from 'react';
import { PaperPreset } from '../../types/paperWorkshop.types';
import { PaperScanDraftDocument } from '../../utils/paper/paperScanCloudStorage';

interface Props {
  hideProcessed: boolean;
  hasUnprocessed: boolean;
  unprocDrafts: PaperScanDraftDocument[];
  procDrafts: PaperScanDraftDocument[];
  unprocPresets: PaperPreset[];
  procPresets: PaperPreset[];
  isFr: boolean;
}

export const PaperScannerSelectOptions: React.FC<Props> = ({
  hideProcessed, hasUnprocessed, unprocDrafts, procDrafts, unprocPresets, procPresets, isFr,
}) => {
  if (hideProcessed) {
    return (
      <>
        {!hasUnprocessed && (
          <option disabled value="">
            {isFr ? 'Tous les imports sont traites — cliquez sur [Afficher traites]' : 'Todas as importacoes estao tratadas — clique em [Exibir tratadas]'}
          </option>
        )}
        {unprocDrafts.length > 0 && (
          <optgroup label={isFr ? 'Mes Imports en cours (Cloud)' : 'Minhas Importacoes (Nuvem)'}>
            {unprocDrafts.map((d) => (
              <option key={d.id} value={`draft:${d.id}`}>{d.deviceType === 'mobile' ? '[Mobile] ' : '[PC] '}{d.title}</option>
            ))}
          </optgroup>
        )}
        {unprocPresets.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </>
    );
  }

  return (
    <>
      <optgroup label={isFr ? 'A TRAITER' : 'A TRATAR'}>
        {unprocDrafts.map((d) => (
          <option key={d.id} value={`draft:${d.id}`}>{d.deviceType === 'mobile' ? '[Mobile] ' : '[PC] '}{d.title}</option>
        ))}
        {unprocPresets.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </optgroup>
      <optgroup label={isFr ? 'DEJA TRAITES [OK]' : 'JA TRATADAS [OK]'}>
        {procDrafts.map((d) => (
          <option key={d.id} value={`draft:${d.id}`}>[OK] {d.deviceType === 'mobile' ? '[Mobile] ' : '[PC] '}{d.title}</option>
        ))}
        {procPresets.map((p) => (
          <option key={p.id} value={p.id}>[OK] {p.name}</option>
        ))}
      </optgroup>
    </>
  );
};
