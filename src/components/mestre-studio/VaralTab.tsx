import React from 'react';
import { Trash2, Award, Image as ImageIcon } from 'lucide-react';
import LZString from 'lz-string';
import { Language } from '../../types';
import { CordeConfig, GameSlot } from '../MestreStudio.types';
import { CloudExercise, CloudProgression } from '../../cloudExercises';

interface VaralTabProps {
  lang: Language;
  cloudProgressionsList: CloudProgression[];
  activeProgressionIds: string[];
  editingVaralId: string | null;
  setEditingVaralId: (val: string | null) => void;
  varalName: string;
  setVaralName: (val: string) => void;
  varalCordes: CordeConfig[];
  setVaralCordes: React.Dispatch<React.SetStateAction<CordeConfig[]>>;
  varalActiveCordesCount: number;
  setVaralActiveCordesCount: (val: number) => void;
  diplomaText: string;
  setDiplomaText: (val: string) => void;
  diplomaSignature: string;
  setDiplomaSignature: (val: string) => void;
  handleToggleVaralActive: (id: string) => void;
  handleDeleteVaral: (id: string) => void;
  cloudExercisesList: CloudExercise[];
  handleLoadDraft: (e: React.ChangeEvent<HTMLInputElement>, type: string) => void;
}

export const VaralTab: React.FC<VaralTabProps> = ({
  lang,
  cloudProgressionsList,
  activeProgressionIds,
  editingVaralId,
  setEditingVaralId,
  varalName,
  setVaralName,
  varalCordes,
  setVaralCordes,
  varalActiveCordesCount,
  setVaralActiveCordesCount,
  diplomaText,
  setDiplomaText,
  diplomaSignature,
  setDiplomaSignature,
  handleToggleVaralActive,
  handleDeleteVaral,
  cloudExercisesList,
  handleLoadDraft,
}) => {
  return (
    <div className="flex flex-col gap-6">
      {/* Multi-Varal Management Dashboard */}
      <div className="border-4 border-[var(--cordel-border)] bg-[var(--cordel-bg)] p-4 shadow-[4px_4px_0_var(--cordel-border)] flex flex-col gap-3">
        <span className="font-cactus text-lg font-black text-[var(--cordel-wood)] border-b border-dashed border-[var(--cordel-border)]/30 pb-1 flex justify-between items-center">
          <span>🪢 {lang === 'fr' ? 'Mes Varals Cloud' : 'Meus Varais Cloud'}</span>
          <button
            onClick={() => {
              setEditingVaralId(null);
              setVaralName('Nouveau Varal');
              setVaralCordes([
                { requiredCount: 3, gameType: 'random', games: [], reward: { text: '', type: 'none', url: '', base64: '' }, oeuvreToniBraga: '', rewardData: '' },
                { requiredCount: 2, gameType: 'random', games: [], reward: { text: '', type: 'none', url: '', base64: '' }, oeuvreToniBraga: '', rewardData: '' },
                { requiredCount: 1, gameType: 'random', games: [], reward: { text: '', type: 'none', url: '', base64: '' }, oeuvreToniBraga: '', rewardData: '' },
                { requiredCount: 1, gameType: 'random', games: [], reward: { text: '', type: 'none', url: '', base64: '' }, oeuvreToniBraga: '', rewardData: '' },
                { requiredCount: 1, gameType: 'random', games: [], reward: { text: '', type: 'none', url: '', base64: '' }, oeuvreToniBraga: '', rewardData: '' },
              ]);
              setVaralActiveCordesCount(3);
            }}
            className="px-2.5 py-1 bg-green-600 text-white text-[10px] font-bold uppercase rounded cursor-pointer hover:bg-green-700 transition"
          >
            + {lang === 'fr' ? 'Nouveau' : 'Novo'}
          </button>
        </span>
        {cloudProgressionsList.length === 0 ? (
          <p className="text-xs italic text-[var(--cordel-text)]/50 py-2 text-center">
            {lang === 'fr' ? "Aucun Varal enregistré. Créez-en un à l'aide du formulaire ci-dessous." : 'Nenhum Varal registrado.'}
          </p>
        ) : (
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
            {cloudProgressionsList.map((prog) => {
              const isActive = activeProgressionIds.includes(prog.id);
              let ropesCount = 0;
              try {
                const decompressed = LZString.decompressFromBase64(prog.data);
                if (decompressed) {
                   const parsed = JSON.parse(decompressed);
                   ropesCount = parsed.cordes?.length || 0;
                }
              } catch(e) {}

              return (
                <div key={prog.id} className="flex items-center justify-between bg-black/5 p-3 border border-[var(--cordel-border)]/15 rounded-sm">
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-black text-[var(--cordel-text)] flex items-center gap-2">
                      {prog.name}
                      {editingVaralId === prog.id && (
                        <span className="text-[9px] uppercase font-bold bg-[var(--cordel-wood)] text-white px-1.5 py-0.5 rounded">
                          {lang === 'fr' ? 'Édition' : 'Edição'}
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--cordel-text)]/60">
                      🪢 {ropesCount} {ropesCount > 1 ? (lang === 'fr' ? 'cordes' : 'cordas') : (lang === 'fr' ? 'corde' : 'corda')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleVaralActive(prog.id)}
                      className={`px-2.5 py-1 text-[10px] font-black uppercase rounded cursor-pointer transition ${
                        isActive 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      }`}
                    >
                      {isActive ? (lang === 'fr' ? 'Actif' : 'Ativo') : (lang === 'fr' ? 'Inactif' : 'Inativo')}
                    </button>
                    
                    <button
                      onClick={() => {
                        setEditingVaralId(prog.id);
                        setVaralName(prog.name);
                        try {
                          const decompressed = LZString.decompressFromBase64(prog.data);
                          if (decompressed) {
                            const json = JSON.parse(decompressed);
                            if (json.diplomaText) setDiplomaText(json.diplomaText);
                            if (json.diplomaSignature) setDiplomaSignature(json.diplomaSignature);
                            if (json.cordes && Array.isArray(json.cordes)) {
                              setVaralActiveCordesCount(Math.min(5, Math.max(1, json.cordes.length)));
                              setVaralCordes(prev => prev.map((c, idx) => {
                                const loadedCorde = json.cordes[idx];
                                if (loadedCorde) {
                                  return {
                                    requiredCount: loadedCorde.requiredCount || 1,
                                    gameType: loadedCorde.gameType || 'random',
                                    games: loadedCorde.games || [],
                                    reward: loadedCorde.reward || { text: '', type: 'none', url: '', base64: '' },
                                    oeuvreToniBraga: loadedCorde.oeuvreToniBraga || '',
                                    rewardData: loadedCorde.rewardData || ''
                                  };
                                }
                                  return c;
                              }));
                            }
                          }
                        } catch (err) {
                          console.error("Failed to load progression for editing", err);
                        }
                      }}
                      className="px-2 py-1 bg-[var(--cordel-wood)] text-white text-[10px] font-black uppercase rounded cursor-pointer hover:opacity-90"
                    >
                      {lang === 'fr' ? 'Éditer' : 'Editar'}
                    </button>

                    <button
                      onClick={() => handleDeleteVaral(prog.id)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6 border-b-2 border-dashed border-[var(--cordel-border)]/30 pb-4 mb-2">
        <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1 flex-1">
          <span>📂 Charger un brouillon local Varal (.json)</span>
          <input type="file" accept=".json" onChange={(e) => handleLoadDraft(e, 'varal_config')} className="text-[10px] cursor-pointer" />
        </label>

        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">
            {lang === 'fr' ? 'Nom du Varal' : 'Nome do Varal'}
          </label>
          <input
            type="text"
            value={varalName}
            onChange={(e) => setVaralName(e.target.value)}
            className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
            placeholder="Ex: Varal Débutant"
          />
        </div>
        
        <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1 flex-1">
          <span>🔗 Nombre de cordes actives</span>
          <select
            value={varalActiveCordesCount}
            onChange={(e) => setVaralActiveCordesCount(Number(e.target.value))}
            className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
          >
            <option value={1}>1 Corde</option>
            <option value={2}>2 Cordes</option>
            <option value={3}>3 Cordes</option>
            <option value={4}>4 Cordes</option>
            <option value={5}>5 Cordes</option>
          </select>
        </label>
      </div>

      <p className="text-sm italic text-[var(--cordel-text)]/70 text-center">
        {lang === 'fr' 
          ? 'Configurez le parcours: jeux requis, récompenses par corde, et le diplôme final.'
          : 'Configure o percurso: jogos exigidos, recompensas por corda, e o diploma final.'}
      </p>

      <div className="grid grid-cols-1 gap-8">
        {Array.from({ length: varalActiveCordesCount }).map((_, idx) => (
          <div key={idx} className="p-4 border-4 border-[var(--cordel-border)] bg-[var(--cordel-bg)] shadow-[4px_4px_0_var(--cordel-border)] flex flex-col gap-4">
            {/* Header Corde */}
            <div className="flex flex-col md:flex-row justify-between items-center border-b-2 border-dashed border-[var(--cordel-border)]/30 pb-3">
              <div className="flex flex-col text-center md:text-left">
                <span className="font-cactus text-2xl font-black text-[var(--cordel-wood)]">Corde {idx + 1}</span>
                <span className="text-xs text-[var(--cordel-text)]/60 font-bold uppercase tracking-widest">
                  {idx === 0 ? 'Débutant' : idx === 1 ? 'Initié' : idx === 2 ? "Confirmé" : idx === 3 ? 'Expert' : 'Mestre'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-2 md:mt-0">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-black uppercase text-[var(--cordel-text)]/70">Type de jeu</label>
                  <select
                    value={varalCordes[idx]?.gameType || 'random'}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setVaralCordes(prev => prev.map((c, cIdx) => {
                        if (cIdx !== idx) return c;
                        return { ...c, gameType: val };
                      }));
                    }}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-1 rounded focus:outline-none text-xs font-bold"
                  >
                    <option value="random">Tous mélangés (Auto)</option>
                    <option value="quiz">Quiz uniquement</option>
                    <option value="dictee">Dictée uniquement</option>
                    <option value="inspecteur">Inspecteur uniquement</option>
                    <option value="sablier_mestre">Sablier uniquement</option>
                    <option value="rythme_live">Rythme Live uniquement</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-black uppercase text-[var(--cordel-text)]/70">Nb. de jeux</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={varalCordes[idx]?.requiredCount || 1}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(10, Number(e.target.value) || 1));
                      setVaralCordes(prev => prev.map((c, cIdx) => {
                        if (cIdx !== idx) return c;
                        const newGames = [...c.games];
                        if (val > newGames.length) {
                          for(let i=newGames.length; i<val; i++) newGames.push({ id: `slot_${Date.now()}_${i}`, source: 'empty' });
                        } else {
                          newGames.splice(val);
                        }
                        return { ...c, requiredCount: val, games: newGames };
                      }));
                    }}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] p-1 rounded font-black text-center w-16"
                  />
                </div>
              </div>
            </div>

            {/* Games Slots */}
            <div className="flex flex-col gap-3 pl-2 border-l-4 border-[var(--cordel-wood)]">
              <span className="text-xs font-black uppercase text-[var(--cordel-text)]/70">Séquence de jeux</span>
              {Array.from({ length: varalCordes[idx]?.requiredCount || 0 }).map((_, slotIdx) => {
                const slot = varalCordes[idx]?.games?.[slotIdx] || { id: `def_${slotIdx}`, source: 'empty' };
                return (
                  <div key={slot.id || slotIdx} className="flex flex-col md:flex-row items-center gap-3 p-2 bg-black/5 rounded">
                    <span className="font-bold text-sm text-[var(--cordel-wood)] w-6">{slotIdx + 1}.</span>
                    <select 
                      value={slot.source}
                      onChange={(e) => {
                        const s = e.target.value as 'empty'|'cloud'|'local';
                        setVaralCordes(prev => prev.map((c, cIdx) => {
                          if (cIdx !== idx) return c;
                          const newGames = [...c.games];
                          while (newGames.length <= slotIdx) {
                            newGames.push({ id: `slot_${Date.now()}_${newGames.length}`, source: 'empty' });
                          }
                          newGames[slotIdx] = { ...newGames[slotIdx], source: s };
                          return { ...c, games: newGames };
                        }));
                      }}
                      className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-1 text-xs font-bold rounded"
                    >
                      <option value="empty">Aléatoire (Auto)</option>
                      <option value="cloud">Depuis le Cloud</option>
                      <option value="local">Fichier Local (.json)</option>
                    </select>

                    {slot.source === 'cloud' && (
                      <select
                        value={slot.cloudExerciseId || ''}
                        onChange={(e) => {
                          const exId = e.target.value;
                          const ex = cloudExercisesList.find(x => x.id === exId);
                          setVaralCordes(prev => prev.map((c, cIdx) => {
                            if (cIdx !== idx) return c;
                            const newGames = [...c.games];
                            while (newGames.length <= slotIdx) {
                              newGames.push({ id: `slot_${Date.now()}_${newGames.length}`, source: 'empty' });
                            }
                            newGames[slotIdx] = { ...newGames[slotIdx], cloudExerciseId: exId, cloudExerciseName: ex?.name };
                            return { ...c, games: newGames };
                          }));
                        }}
                        className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-1 text-xs font-bold rounded flex-1"
                      >
                        <option value="">-- Choisir un exercice --</option>
                        {cloudExercisesList
                          .filter(ex => {
                            const ropeType = varalCordes[idx]?.gameType || 'random';
                            if (ropeType === 'random') return true;
                            const exMod = ex.module;
                            const normalizedRopeType = ropeType === 'sablier_mestre' ? 'sablier' : (ropeType === 'rythme_live' ? 'rythmelive' : ropeType);
                            return exMod === normalizedRopeType;
                          })
                          .map(ex => (
                            <option key={ex.id} value={ex.id}>[{ex.module.toUpperCase()}] {ex.name}</option>
                          ))
                        }
                      </select>
                    )}

                    {slot.source === 'local' && (
                      <div className="flex items-center gap-2 flex-1">
                        {!(slot as any).localExerciseData ? (
                          <input 
                            type="file" 
                            accept=".json"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                try {
                                  const data = JSON.parse(evt.target?.result as string);
                                  setVaralCordes(prev => prev.map((c, cIdx) => {
                                    if (cIdx !== idx) return c;
                                    const newGames = [...c.games];
                                    while (newGames.length <= slotIdx) {
                                      newGames.push({ id: `slot_${Date.now()}_${newGames.length}`, source: 'empty' });
                                    }
                                    newGames[slotIdx] = { ...newGames[slotIdx], localExerciseData: data, localExerciseName: file.name };
                                    return { ...c, games: newGames };
                                  }));
                                } catch(err) { alert("Invalid JSON"); }
                              };
                              reader.readAsText(file);
                            }}
                            className="text-[10px] cursor-pointer"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-1 rounded">✅ {(slot as any).localExerciseName || "Importé"}</span>
                            <button onClick={() => {
                              setVaralCordes(prev => prev.map((c, cIdx) => {
                                if (cIdx !== idx) return c;
                                const newGames = [...c.games];
                                if (newGames[slotIdx]) {
                                  newGames[slotIdx] = { ...newGames[slotIdx], localExerciseData: undefined, localExerciseName: undefined };
                                }
                                return { ...c, games: newGames };
                              }));
                            }} className="text-[10px] text-red-500 hover:underline">Changer</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Reward Section */}
            <div className="mt-2 pt-3 border-t-2 border-dashed border-[var(--cordel-border)]/30 flex flex-col gap-3">
              <span className="text-xs font-black uppercase text-[var(--cordel-text)]/70">Récompense de Corde</span>
              
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[10px] font-bold">Message de félicitations</label>
                  <textarea
                    placeholder="Ex: Bravo, tu as validé cette étape !"
                    value={varalCordes[idx]?.reward?.text || ''}
                    onChange={(e) => setVaralCordes(prev => prev.map((c, cIdx) => cIdx === idx ? { ...c, reward: { ...c.reward, text: e.target.value } } : c))}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded text-xs font-bold w-full resize-none h-16"
                  />
                </div>
                
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[10px] font-bold">Contenu lié (Optionnel)</label>
                  <select
                    value={varalCordes[idx]?.reward?.type || 'none'}
                    onChange={(e) => setVaralCordes(prev => prev.map((c, cIdx) => cIdx === idx ? { ...c, reward: { ...c.reward, type: e.target.value as any } } : c))}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-1 text-xs font-bold rounded mb-1"
                  >
                    <option value="none">Aucun lien</option>
                    <option value="video">Vidéo YouTube (URL)</option>
                    <option value="image">Image (Upload ou URL)</option>
                    <option value="pdf">Fichier PDF (URL)</option>
                    <option value="json">Configuration spéciale (.json)</option>
                  </select>

                  {(varalCordes[idx]?.reward?.type === 'video' || varalCordes[idx]?.reward?.type === 'pdf') && (
                    <input
                      type="text"
                      placeholder="https://..."
                      value={varalCordes[idx]?.reward?.url || ''}
                      onChange={(e) => setVaralCordes(prev => prev.map((c, cIdx) => cIdx === idx ? { ...c, reward: { ...c.reward, url: e.target.value } } : c))}
                      className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded text-xs w-full"
                    />
                  )}

                  {varalCordes[idx]?.reward?.type === 'image' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            setVaralCordes(prev => prev.map((c, cIdx) => cIdx === idx ? { ...c, reward: { ...c.reward, base64: evt.target?.result as string } } : c));
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="text-[10px] max-w-[150px]"
                      />
                      {varalCordes[idx]?.reward?.base64 && <ImageIcon className="w-4 h-4 text-green-600 shrink-0" />}
                    </div>
                  )}
                  {varalCordes[idx]?.reward?.type === 'json' && (
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            setVaralCordes(prev => prev.map((c, cIdx) => cIdx === idx ? { ...c, reward: { ...c.reward, base64: evt.target?.result as string } } : c));
                          };
                          reader.readAsDataURL(file);
                      }}
                      className="text-[10px]"
                    />
                  )}
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* DIPLOMA SECTION */}
      <div className="mt-8 p-6 border-4 border-[var(--cordel-wood)] bg-[var(--cordel-bg)] shadow-[6px_6px_0_var(--cordel-wood)] flex flex-col gap-4">
        <div className="flex items-center gap-3 border-b-2 border-dashed border-[var(--cordel-wood)]/30 pb-2">
          <Award className="w-8 h-8 text-[var(--cordel-wood)]" />
          <h3 className="font-cactus text-3xl font-black text-[var(--cordel-wood)] uppercase tracking-widest">Diplôme Final</h3>
        </div>
        <p className="text-sm font-bold text-[var(--cordel-text)]/70">
          {lang === 'fr' ? 'Ce diplôme sera remis à l\'élève une fois toutes les cordes validées.' : 'Este diploma será entregue ao aluno após validar todas as cordas.'}
        </p>

        <div className="flex flex-col md:flex-row gap-6 mt-2">
          <div className="flex-1 flex flex-col gap-2">
            <label className="text-xs font-black uppercase text-[var(--cordel-text)]">Texte du diplôme</label>
            <textarea
              placeholder={lang === 'fr' ? "Félicitations pour avoir complété le parcours O Girador !" : "Parabéns por completar o percurso O Girador !"}
              value={diplomaText}
              onChange={(e) => setDiplomaText(e.target.value)}
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] p-3 rounded font-bold w-full h-32 resize-none"
            />
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <label className="text-xs font-black uppercase text-[var(--cordel-text)]">Signature Visuelle (Optionnel)</label>
            <p className="text-[10px] text-[var(--cordel-text)]/60">Upload de votre signature en image transparente (.png)</p>
            <div className="flex flex-col gap-3">
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (evt) => setDiplomaSignature(evt.target?.result as string);
                  reader.readAsDataURL(file);
                }}
                className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-bold file:bg-[var(--cordel-wood)] file:text-[var(--cordel-bg)] hover:file:bg-[var(--cordel-wood)]/80 cursor-pointer"
              />
              {diplomaSignature && (
                <div className="border border-dashed border-[var(--cordel-border)]/50 p-2 flex items-center justify-center bg-black/5 rounded">
                  <img src={diplomaSignature} alt="Signature preview" className="max-h-20 object-contain" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
