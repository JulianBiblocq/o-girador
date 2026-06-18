import { TrackGroup, SongSection, PresetMetadata } from '../types';
import { instrumentsConfig } from '../data';

const getInstrumentLabel = (instId: string, isFirstBlock: boolean) => {
  if (isFirstBlock) {
    if (instId === 'marcante') return 'Alfaia 1';
    if (instId === 'meiao') return 'Alfaia 2';
    if (instId === 'repique') return 'Alfaia 3';
    return instrumentsConfig.find(c => c.id === instId)?.name || 'Track';
  } else {
    switch (instId) {
      case 'marcante': return 'Al 1';
      case 'meiao': return 'Al 2';
      case 'repique': return 'Al 3';
      case 'caixa': return 'Cx';
      case 'tarol': return 'Tl';
      case 'gongue': return 'Gg';
      case 'agbe': return 'Ab';
      case 'mineiro': return 'Mi';
      default: return instrumentsConfig.find(c => c.id === instId)?.name.substring(0, 3) || 'Trk';
    }
  }
};

const generateTablatureCore = (
  tracks: TrackGroup[],
  totalMeasures: number,
  songSections: SongSection[],
  measureTimeSigs?: { [m: number]: string },
  measureBpms?: { [m: number]: number },
  isHtml: boolean = false
): string => {
  let output = ``;
  
  // Filter out Apito and Voice tracks
  const filteredTracks = tracks.filter(t => {
    const conf = instrumentsConfig[t.instrumentIdx];
    return conf && conf.id !== 'apito' && conf.id !== 'voice';
  });

  let currentChunk: number[] = [];
  
  const flushChunk = () => {
    if (currentChunk.length === 0) return;
    
    const startM = currentChunk[0];
    const endM = currentChunk[currentChunk.length - 1];
    const sectionStart = songSections.find(s => s.startMeasure === startM);
    const sectionEnd = songSections.find(s => s.endMeasure === endM);

    const isRepeatedStart = sectionStart && (sectionStart.repeatCount || 1) > 1;
    const isRepeatedEnd = sectionEnd && (sectionEnd.repeatCount || 1) > 1;

    const leftBar = isRepeatedStart ? "||: " : "| ";
    const rightBar = isRepeatedEnd ? " :||" : " |";

    let header = "";
    if (sectionStart) {
      header = `[ ${sectionStart.name} ]`;
    } else if (currentChunk.length === 1) {
      header = `--- Mesure ${startM + 1} ---`;
    } else {
      header = `--- Mesures ${startM + 1} à ${endM + 1} ---`;
    }
    
    let chunkOutput = header + "\n";

    const isFirstBlock = startM === 0;
    const initialSig = measureTimeSigs?.[startM] || '4/4';
    const prefixLen = 15 + 1 + 4 + 1; // inst(15) + space + sig(4) + space = 21

    // Pre-calculate track string length to position BPMs and repeats
    let trackStrLen = 0;
    currentChunk.forEach((m, idx) => {
      trackStrLen += 31; // Measure is always padded to 31 visual chars
      if (idx < currentChunk.length - 1) {
        const nextMeasure = currentChunk[idx + 1];
        const currSig = measureTimeSigs?.[m] || '4/4';
        const nextSig = measureTimeSigs?.[nextMeasure] || '4/4';
        if (currSig !== nextSig) {
          trackStrLen += ` | ${nextSig} | `.length;
        } else {
          trackStrLen += 3; // " | "
        }
      }
    });

    const totalLineLen = prefixLen + leftBar.length + trackStrLen + rightBar.length;

    // Generate BPM / Repeat Line
    let bpmLine = "".padStart(prefixLen + leftBar.length, " ");
    currentChunk.forEach((m, idx) => {
      const prevBpm = m === 0 ? null : measureBpms?.[m - 1] || 120;
      const currBpm = measureBpms?.[m] || 120;
      
      let bpmStr = "";
      if (m === 0 || currBpm !== prevBpm) {
        if (prevBpm !== null && currBpm > prevBpm) bpmStr = `${currBpm}BPM↑`;
        else if (prevBpm !== null && currBpm < prevBpm) bpmStr = `${currBpm}BPM↓`;
        else bpmStr = `${currBpm}BPM`;
      }
      
      bpmLine += bpmStr.padEnd(31, " ");
      
      if (idx < currentChunk.length - 1) {
        const nextMeasure = currentChunk[idx + 1];
        const currSig = measureTimeSigs?.[m] || '4/4';
        const nextSig = measureTimeSigs?.[nextMeasure] || '4/4';
        if (currSig !== nextSig) {
          bpmLine += " ".repeat(` | ${nextSig} | `.length);
        } else {
          bpmLine += "   "; // " | "
        }
      }
    });

    const hasBpmOrRepeat = bpmLine.trim().length > 0 || isRepeatedEnd;
    if (hasBpmOrRepeat) {
      if (isRepeatedEnd) {
        const repeatText = `x${sectionEnd.repeatCount}`;
        if (bpmLine.length < totalLineLen - repeatText.length) {
          bpmLine = bpmLine.padEnd(totalLineLen - repeatText.length, " ") + repeatText;
        } else {
          bpmLine += " " + repeatText;
        }
      }
      chunkOutput += bpmLine + "\n";
    }

    filteredTracks.forEach(track => {
      let trackStr = "";
      let hasDataInChunk = false;
      let hasVariationsInChunk = false;

      currentChunk.forEach((m, idx) => {
        const activePattern = track.patterns.find(p => p.measureAssignments[m]);
        if (activePattern) {
          hasDataInChunk = true;
          if (activePattern.measureAllowVariations?.[m] && activePattern.variations && activePattern.variations.length > 0) {
            hasVariationsInChunk = true;
          }
          let measureHtml = "";
          const visualLen = activePattern.steps * 2 - 1;
          for (let s = 0; s < activePattern.steps; s++) {
            const val = activePattern.activeSteps[s];
            const char = (val === 0 || val === '0' || val === '') ? '-' : val;
            
            const isShaded = Math.floor(s / 4) % 2 !== 0;
            if (isHtml && s % 4 === 0 && isShaded) measureHtml += `<span style="background-color: rgba(0,0,0,0.1); border-radius: 2px;">`;
            
            measureHtml += char;
            if (s < activePattern.steps - 1) {
              measureHtml += " ";
            }
            
            if (isHtml && s % 4 === 3 && isShaded) measureHtml += `</span>`;
          }
          if (isHtml && activePattern.steps % 4 !== 0 && Math.floor((activePattern.steps - 1) / 4) % 2 !== 0) {
             measureHtml += `</span>`;
          }

          const padLen = Math.max(0, 31 - visualLen);
          measureHtml += " ".repeat(padLen);
          trackStr += measureHtml;
        } else {
          trackStr += "".padEnd(31, ' ');
        }

        if (idx < currentChunk.length - 1) {
          const nextMeasure = currentChunk[idx + 1];
          const currSig = measureTimeSigs?.[m] || '4/4';
          const nextSig = measureTimeSigs?.[nextMeasure] || '4/4';
          if (currSig !== nextSig) {
            trackStr += ` | ${nextSig} | `;
          } else {
            trackStr += " | ";
          }
        }
      });

      if (hasDataInChunk) {
        const conf = instrumentsConfig[track.instrumentIdx];
        const instLabel = getInstrumentLabel(conf.id, isFirstBlock);
        
        const varMarker = hasVariationsInChunk ? (isHtml ? ' 🎲' : ' (*v)') : '';
        const safeInstLabel = (instLabel + varMarker).substring(0, 15).padEnd(15, ' ');
        const safeSig = initialSig.padStart(4, ' ');
        
        const prefix = `${safeInstLabel} ${safeSig} `;
        chunkOutput += `${prefix}${leftBar}${trackStr}${rightBar}\n`;
      }
    });

    chunkOutput += '\n';
    
    if (isHtml) {
      output += `<div class="tab-chunk">${chunkOutput}</div>`;
    } else {
      output += chunkOutput;
    }
    
    currentChunk = [];
  };

  for (let m = 0; m < totalMeasures; m++) {
    const sectionStart = songSections.find(s => s.startMeasure === m);
    if (currentChunk.length > 0 && (currentChunk.length === 4 || sectionStart)) {
      flushChunk();
    }
    currentChunk.push(m);
    const sectionEnd = songSections.find(s => s.endMeasure === m);
    if (sectionEnd) {
      flushChunk();
    }
  }
  flushChunk();

  return output;
};

const generateAnnexTablature = (
  tracks: TrackGroup[],
  annexTrackIds: Set<number>,
  isHtml: boolean = false
): string => {
  if (annexTrackIds.size === 0) return '';
  
  const annexTracks = tracks.filter(t => annexTrackIds.has(t.id));
  if (annexTracks.length === 0) return '';

  let output = isHtml ? `<div style="page-break-before: always;" class="tab-chunk">\n` : `\n\n========================================\n`;
  const titleStr = 'Annexe : Lexique des variations';
  
  if (isHtml) {
    output += `<div class="tab-title" style="margin-top: 40px; margin-bottom: 20px;">${titleStr}</div>\n`;
  } else {
    output += `${titleStr.toUpperCase()}\n========================================\n\n`;
  }

  annexTracks.forEach(track => {
    const conf = instrumentsConfig[track.instrumentIdx];
    if (!conf) return;
    
    // Find patterns that are actually assigned in the timeline AND have variations
    const assignedPatternIds = new Set<number>();
    track.patterns.forEach(p => {
       if (p.variations && p.variations.length > 0) {
         // Check if assigned anywhere
         const isAssigned = Object.values(p.measureAssignments).some(val => val === true);
         if (isAssigned) {
           assignedPatternIds.add(p.id);
         }
       }
    });

    if (assignedPatternIds.size === 0) return;

    let trackOutput = isHtml ? `<div style="margin-bottom: 20px;"><strong>[ ${conf.name} ]</strong>\n` : `[ ${conf.name} ]\n`;
    
    assignedPatternIds.forEach(pId => {
      const p = track.patterns.find(pat => pat.id === pId);
      if (!p) return;
      
      const patName = p.name ? p.name : `Pattern ${pId}`;
      trackOutput += isHtml ? `  <span style="text-decoration: underline;">${patName}</span>\n` : `  ${patName}\n`;
      
      const formatSteps = (steps: (string|number)[]) => {
         let html = "";
         for (let s = 0; s < p.steps; s++) {
            const val = steps[s];
            const char = (val === 0 || val === '0' || val === '') ? '-' : val;
            
            const isShaded = Math.floor(s / 4) % 2 !== 0;
            if (isHtml && s % 4 === 0 && isShaded) html += `<span style="background-color: rgba(0,0,0,0.1); border-radius: 2px;">`;
            
            html += char;
            if (s < p.steps - 1) html += " ";
            
            if (isHtml && s % 4 === 3 && isShaded) html += `</span>`;
         }
         if (isHtml && p.steps % 4 !== 0 && Math.floor((p.steps - 1) / 4) % 2 !== 0) {
            html += `</span>`;
         }
         return html;
      };

      const baseLabel = `[Base]`.padEnd(50, ' ');
      trackOutput += `    ${baseLabel} | ${formatSteps(p.activeSteps)}\n`;
      
      p.variations.forEach(v => {
        const labelText = v.playFirstTimeOnly ? `${v.name} - (Levée / 1ère fois uniquement)` : `${v.name} - ${v.probability}%`;
        const varLabel = `[${labelText}]`.padEnd(50, ' ');
        trackOutput += `    ${varLabel} | ${formatSteps(v.steps)}\n`;
      });
      trackOutput += '\n';
    });
    
    if (isHtml) trackOutput += `</div>`;
    output += trackOutput;
  });

  if (isHtml) {
    output += `</div>`;
  }
  
  return output;
};

const generateLegendTxt = () => {
  return `
--- LÉGENDE DES INSTRUMENTS ---

ALFAIAS / CAIXA / TAROL
   D : Main Droite (Forte)
   d : Main Droite (Faible)
   E : Main Gauche (Forte)
   e : Main Gauche (Faible)
   C : Éclat (Frappe des 2 baguettes l'une contre l'autre)
   X : Cerclage / Bois
   R / r : Rufada (Roulement)
   F : Fla
   I : Iguarassu / Bacalhau
   B : Barulho (Bruit / effet)

GONGUÊ
   D : Grave (Forte)
   d : Grave (Faible)
   E : Aigu (Forte)
   e : Aigu (Faible)
   X : Borda (Bord)

AGBÊ / MINEIRO
   D / d : Droite (Forte / Faible)
   E / e : Gauche (Forte / Faible)
   Q : Saut / Lançamento (Agbê)
   B : Barulho (Bruit / effet)

--- STRUCTURE MUSICALE ---
   ||:  ...  :|| : Barres de reprise. Répéter la section.
   (Levée / 1ère fois uniquement) : Phrase d'introduction qui ne se joue qu'à la première itération de la boucle.
`;
};

const generateLegendHTML = (forcePageBreak: boolean = true) => {
  return `
    <div style="${forcePageBreak ? 'page-break-before: always; ' : ''}font-family: sans-serif; padding-top: 20px; color: black; background: white;">
      <h2 style="font-family: 'Cactus', sans-serif; border-bottom: 2px solid #000; padding-bottom: 10px; font-size: 24px; margin-bottom: 20px;">Légende des Tablatures</h2>
      
      <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-top: 10px;">
        
        <div style="width: 45%; margin-bottom: 15px;">
          <h3 style="font-size: 16px; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px;">Alfaias, Caixa, Tarol</h3>
          <ul style="list-style-type: none; padding-left: 0; margin: 0; font-size: 14px;">
            <li style="margin-bottom: 4px;"><strong>D</strong> : Main Droite (Forte)</li>
            <li style="margin-bottom: 4px;"><strong>d</strong> : Main Droite (Faible)</li>
            <li style="margin-bottom: 4px;"><strong>E</strong> : Main Gauche (Forte)</li>
            <li style="margin-bottom: 4px;"><strong>e</strong> : Main Gauche (Faible)</li>
            <li style="margin-bottom: 4px;"><strong>C</strong> : Éclat (Frappe des 2 baguettes l'une contre l'autre)</li>
            <li style="margin-bottom: 4px;"><strong>X</strong> : Cerclage / Bois</li>
            <li style="margin-bottom: 4px;"><strong>R / r</strong> : Rufada (Roulement droit/gauche)</li>
            <li style="margin-bottom: 4px;"><strong>F</strong> : Fla</li>
            <li style="margin-bottom: 4px;"><strong>I</strong> : Iguarassu / Bacalhau</li>
            <li style="margin-bottom: 4px;"><strong>B</strong> : Barulho (Bruit / effet)</li>
          </ul>
        </div>

        <div style="width: 45%; margin-bottom: 15px;">
          <h3 style="font-size: 16px; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px;">Gonguê</h3>
          <ul style="list-style-type: none; padding-left: 0; margin: 0; font-size: 14px;">
            <li style="margin-bottom: 4px;"><strong>D</strong> : Grave (Forte)</li>
            <li style="margin-bottom: 4px;"><strong>d</strong> : Grave (Faible)</li>
            <li style="margin-bottom: 4px;"><strong>E</strong> : Aigu (Forte)</li>
            <li style="margin-bottom: 4px;"><strong>e</strong> : Aigu (Faible)</li>
            <li style="margin-bottom: 4px;"><strong>X</strong> : Borda (Bord)</li>
            <li style="margin-bottom: 4px;"><strong>B</strong> : Barulho</li>
          </ul>
          
          <h3 style="font-size: 16px; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px;">Agbê & Mineiro</h3>
          <ul style="list-style-type: none; padding-left: 0; margin: 0; font-size: 14px;">
            <li style="margin-bottom: 4px;"><strong>D / d</strong> : Droite (Forte / Faible)</li>
            <li style="margin-bottom: 4px;"><strong>E / e</strong> : Gauche (Forte / Faible)</li>
            <li style="margin-bottom: 4px;"><strong>Q / q</strong> : Saut / Lançamento</li>
            <li style="margin-bottom: 4px;"><strong>B</strong> : Barulho</li>
          </ul>
        </div>
      </div>

      <h3 style="font-size: 16px; margin-top: 30px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 4px;">Structure Musicale et Répétitions</h3>
      <ul style="list-style-type: none; padding-left: 0; font-size: 14px;">
        <li style="margin-bottom: 8px;"><strong>||: &nbsp; &nbsp; :||</strong> : Barres de reprise. Indique qu'il faut répéter la section.</li>
        <li style="margin-bottom: 8px;"><strong>(Levée / 1ère fois uniquement)</strong> : Indique une phrase de transition à jouer juste avant d'entrer dans une variation.</li>
      </ul>
    </div>
  `;
};

export const printLegendOnly = () => {
  const htmlContent = generateLegendHTML(false);
  
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    alert("Veuillez autoriser l'ouverture des pop-ups pour imprimer la légende.");
    return;
  }
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Légende des Tablatures</title>
        <style>
          body { margin: 0; padding: 20px; font-family: sans-serif; background: white; color: black; }
          @media print {
            @page { size: portrait; margin: 1cm; }
            body { padding: 0; }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `);
  
  printWindow.document.close();
  
  // Petit délai pour laisser le temps au navigateur de charger le DOM de la nouvelle fenêtre
  setTimeout(() => {
    printWindow.print();
  }, 250);
};

export const exportTablatureFile = (
  tracks: TrackGroup[],
  annexTrackIds: Set<number>,
  totalMeasures: number,
  songSections: SongSection[],
  metadata?: PresetMetadata,
  measureTimeSigs?: { [m: number]: string },
  measureBpms?: { [m: number]: number },
  letras?: string
) => {
  const outputTxt = generateTablatureCore(tracks, totalMeasures, songSections, measureTimeSigs, measureBpms, false);
  const annexTxt = generateAnnexTablature(tracks, annexTrackIds, false);
  
  const title = metadata?.toada?.trim() || "BaqueMix Tablature";
  
  let finalTxt = `TITRE: ${title}\n`;
  if (metadata?.compositor) finalTxt += `COMPOSITEUR: ${metadata.compositor}\n`;
  if (metadata?.ritmo) finalTxt += `RYTHME: ${metadata.ritmo}\n`;
  finalTxt += `\n${outputTxt}`;
  if (annexTxt) finalTxt += annexTxt;
  
  if (letras && letras.trim() !== '') {
    finalTxt += `\n--- VOIX / PAROLES ---\n${letras}\n`;
  }
  
  finalTxt += `\n(Généré avec BaqueMix)\n`;

  // Create blob and download
  const blob = new Blob([finalTxt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const printTablature = (
  tracks: TrackGroup[],
  annexTrackIds: Set<number>,
  totalMeasures: number,
  songSections: SongSection[],
  metadata?: PresetMetadata,
  measureTimeSigs?: { [m: number]: string },
  measureBpms?: { [m: number]: number },
  letras?: string
) => {
  const outputHtml = generateTablatureCore(tracks, totalMeasures, songSections, measureTimeSigs, measureBpms, true);
  const annexHtml = generateAnnexTablature(tracks, annexTrackIds, true);
  
  const printContainer = document.createElement('div');
  printContainer.id = 'print-tablature-area';
  
  const styleBlock = document.createElement('style');
  styleBlock.textContent = `
    @media print {
      @page { size: landscape; margin: 0; }
      body { background: white; }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      #print-tablature-area {
        position: absolute;
        top: 0; left: 0; right: 0;
        background: white;
        z-index: 999999;
      }
      table.print-table {
        width: 100%;
        border-collapse: collapse;
        border: none;
      }
      table.print-table th, table.print-table td {
        border: none;
        padding: 0;
      }
      .print-header-space {
        height: 5mm;
      }
      .tab-title {
        font-family: 'Cactus', serif;
        font-size: 18px;
        text-align: center;
        margin-bottom: 5px;
      }
      .tab-subtitle {
        font-family: sans-serif;
        font-size: 12px;
        text-align: center;
        margin-bottom: 20px;
        font-style: italic;
      }
      .tab-pre {
        white-space: pre;
        font-family: monospace;
        font-size: 13px !important;
        line-height: 1.3;
      }
      .tab-chunk {
        page-break-inside: avoid;
        break-inside: avoid;
        margin-bottom: 0.5em;
      }
      .tab-footer {
        text-align: right;
        font-family: sans-serif;
        font-size: 10px;
        margin-top: 30px;
        color: #555;
      }
      .tab-letras {
        margin-top: 40px;
        font-family: sans-serif;
        font-size: 12px;
        white-space: pre-wrap;
      }
      .tab-letras h3 {
        margin-bottom: 10px;
        font-size: 14px;
      }
    }
  `;
  document.head.appendChild(styleBlock);
  
  const title = metadata?.toada?.trim() || "BaqueMix Tablature";
  const composer = metadata?.compositor ? `Compositeur : ${metadata.compositor}` : "";
  
  let innerContent = `
    <div class="tab-title">${title}</div>
    ${composer ? `<div class="tab-subtitle">${composer}</div>` : ''}
    <div class="tab-pre">${outputHtml}</div>
  `;
  
  if (letras && letras.trim() !== '') {
    innerContent += `
      <div class="tab-letras">
        <h3>Voix / Paroles</h3>
        <div>${letras}</div>
      </div>
    `;
  }
  
  if (annexHtml) {
    innerContent += `
      <div class="tab-pre">${annexHtml}</div>
    `;
  }

  innerContent += `
    <div class="tab-footer">Généré avec BaqueMix</div>
  `;
  
  const htmlContent = `
    <table class="print-table">
      <thead>
        <tr><td><div class="print-header-space"></div></td></tr>
      </thead>
      <tbody>
        <tr>
          <td>
            ${innerContent}
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr><td><div class="print-footer-space"></div></td></tr>
      </tfoot>
    </table>
  `;
  
  printContainer.innerHTML = htmlContent;
  
  document.body.appendChild(printContainer);
  window.print();
  document.body.removeChild(printContainer);
  document.head.removeChild(styleBlock);
};
