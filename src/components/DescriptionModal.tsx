/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Language, PresetMetadata } from '../types';
import { DescriptionModalHeader } from './description-modal/DescriptionModalHeader';
import { DescriptionModalBody } from './description-modal/DescriptionModalBody';
import { DescriptionModalFooter } from './description-modal/DescriptionModalFooter';

interface DescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: PresetMetadata;
  onSaveDescription: (data: { descriptionPt: string; descriptionFr: string }) => void;
  lang: Language;
  isPlaying: boolean;
}

export const DescriptionModal: React.FC<DescriptionModalProps> = ({
  isOpen,
  onClose,
  metadata,
  onSaveDescription,
  lang,
  isPlaying,
}) => {
  const [activeTextLang, setActiveTextLang] = useState<'pt' | 'fr'>(lang === 'fr' ? 'fr' : 'pt');
  const [isEditing, setIsEditing] = useState(false);
  const [localDescriptionPt, setLocalDescriptionPt] = useState<string>('');
  const [localDescriptionFr, setLocalDescriptionFr] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setActiveTextLang(lang === 'fr' ? 'fr' : 'pt');
      setIsEditing(false);
      setLocalDescriptionPt(metadata.descriptionPt || metadata.description || '');
      setLocalDescriptionFr(metadata.descriptionFr || '');
    }
  }, [isOpen, metadata, lang]);

  useEffect(() => {
    if (isPlaying && isEditing) {
      setIsEditing(false);
    }
  }, [isPlaying, isEditing]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          setLocalDescriptionPt(metadata.descriptionPt || metadata.description || '');
          setLocalDescriptionFr(metadata.descriptionFr || '');
          setIsEditing(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEditing, metadata, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveDescription({
      descriptionPt: localDescriptionPt.trim(),
      descriptionFr: localDescriptionFr.trim(),
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setLocalDescriptionPt(metadata.descriptionPt || metadata.description || '');
    setLocalDescriptionFr(metadata.descriptionFr || '');
    setIsEditing(false);
  };

  const currentDisplayText = activeTextLang === 'pt' ? localDescriptionPt : localDescriptionFr;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div
        data-theme="light"
        style={{ colorScheme: 'light' }}
        className="bg-[#f4ecd8] border-4 border-[#1a1a1a] shadow-[6px_6px_0px_rgba(0,0,0,1)] rounded-[2px_6px_3px_5px] max-w-2xl w-full flex flex-col max-h-[90vh] relative text-[#1a1a1a] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onKeyUp={(e) => e.stopPropagation()}
      >
        <DescriptionModalHeader
          metadata={metadata}
          lang={lang}
          activeTextLang={activeTextLang}
          setActiveTextLang={setActiveTextLang}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          isPlaying={isPlaying}
          onClose={onClose}
        />

        <DescriptionModalBody
          isEditing={isEditing}
          activeTextLang={activeTextLang}
          localDescriptionPt={localDescriptionPt}
          setLocalDescriptionPt={setLocalDescriptionPt}
          localDescriptionFr={localDescriptionFr}
          setLocalDescriptionFr={setLocalDescriptionFr}
          currentDisplayText={currentDisplayText}
          lang={lang}
          isPlaying={isPlaying}
          onStartEdit={() => setIsEditing(true)}
        />

        <DescriptionModalFooter
          isEditing={isEditing}
          lang={lang}
          onCancelEdit={handleCancelEdit}
          onSave={handleSave}
          onClose={onClose}
        />
      </div>
    </div>,
    document.body
  );
};
