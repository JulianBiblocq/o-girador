import React, { useEffect, useRef, useState } from 'react';
import { getIsAoVivoLabOpen, setIsAoVivoLabOpen, subscribeAoVivoLabOpen } from '../../audio/animations/aoVivoConfigStorage';
import { AoVivoMobileFamily, isMobileViewport, resolveMobileFamily, subscribeMobileOffsets } from '../../audio/animations/aoVivoMobileOffsets';
import { CONFIG_ALFAIA_STICKS, resetAlfaiaSticksConfig, subscribeAlfaiaSticksConfig, updateAlfaiaSticksConfig } from '../../audio/animations/alfaiaKinematics';
import { CONFIG_CAIXA_STICKS, resetCaixaSticksConfig, subscribeCaixaSticksConfig, updateCaixaSticksConfig } from '../../audio/animations/caixaKinematics';
import { CONFIG_GONGUE_STICK, resetGongueStickConfig, subscribeGongueStickConfig, updateGongueStickConfig } from '../../audio/animations/gongueKinematics';
import { CONFIG_TIMBAL_HANDS, resetTimbalHandsConfig, subscribeTimbalHandsConfig, updateTimbalHandsConfig } from '../../audio/animations/timbalKinematics';
import { CONFIG_AGBE_LAB, resetAgbeLabConfig, subscribeAgbeLabConfig, updateAgbeLabConfig } from '../../audio/animations/agbeKeyframes';
import { CONFIG_MINEIRO_LAB, resetMineiroLabConfig, subscribeMineiroLabConfig, updateMineiroLabConfig } from '../../audio/animations/mineiroKeyframes';
import { AlfaiaLabTabId, AoVivoSticksLabSliders } from './AoVivoSticksLabSliders';
import { AoVivoCaixaLabSliders, CaixaLabTabId } from './AoVivoCaixaLabSliders';
import { AoVivoGongueLabSliders, GongueLabTabId } from './AoVivoGongueLabSliders';
import { AoVivoTimbalLabSliders, TimbalLabTabId } from './AoVivoTimbalLabSliders';
import { AgbeLabTabId, AoVivoAgbeLabSliders } from './AoVivoAgbeLabSliders';
import { AoVivoMineiroLabSliders, MineiroLabTabId } from './AoVivoMineiroLabSliders';
import { AoVivoMobilePositionSliders } from './AoVivoMobilePositionSliders';
import { AoVivoLabHeader, labBtnStyle } from './AoVivoLabHeader';
import { applyFrozenImpactPose, clearFrozenPose, selectAoVivoLabInstrument, TESTER_SEQUENCES, TESTER_STROKES, TesterFamily, triggerSequenceStep, triggerSingleTestStroke } from './aoVivoStrokeTester';
import { AGBE_TABS, ALFAIA_MODES, ALFAIA_TABS, CAIXA_TABS, detectAoVivoLabFamily, GONGUE_MODES, GONGUE_TABS, MINEIRO_TABS, TIMBAL_MODES, TIMBAL_TABS } from './aoVivoLabTabsConfig';

export const AoVivoSticksLabBar: React.FC<{ instId: string }> = ({ instId }) => {
  const [labVisible, setLabVisible] = useState(() => getIsAoVivoLabOpen());
  const [isOpen, setIsOpen] = useState(true);
  const [isMobilePosMode, setIsMobilePosMode] = useState(() => isMobileViewport());
  const [labFam, setLabFam] = useState<TesterFamily>(() => detectAoVivoLabFamily(instId));
  const [mobFam, setMobFam] = useState<AoVivoMobileFamily>(() => resolveMobileFamily(instId));
  const [alfaiaTab, setAlfaiaTab] = useState<AlfaiaLabTabId>('macaneta');
  const [caixaTab, setCaixaTab] = useState<CaixaLabTabId>('stick');
  const [gongueTab, setGongueTab] = useState<GongueLabTabId>('hand');
  const [timbalTab, setTimbalTab] = useState<TimbalLabTabId>('anatomy');
  const [agbeTab, setAgbeTab] = useState<AgbeLabTabId>('pendulum');
  const [mineiroTab, setMineiroTab] = useState<MineiroLabTabId>('push');
  const [testStroke, setTestStroke] = useState<string>('D');
  const [activeSeqId, setActiveSeqId] = useState<string | null>(null);
  const [isLooping, setIsLooping] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [, setTick] = useState(0);
  const seqStepRef = useRef(0);

  useEffect(() => subscribeAoVivoLabOpen(() => {
    const open = getIsAoVivoLabOpen();
    setLabVisible(open);
    if (open) { setIsOpen(true); setIsMobilePosMode(isMobileViewport()); }
  }), []);

  useEffect(() => {
    const f = detectAoVivoLabFamily(instId);
    setLabFam(f); setMobFam(resolveMobileFamily(instId)); setTestStroke(TESTER_STROKES[f][0].id); setActiveSeqId(null); setIsLooping(false); setIsFrozen(false);
  }, [instId]);

  useEffect(() => {
    const rerender = () => { setTick((n) => n + 1); if (isFrozen) applyFrozenImpactPose(labFam, testStroke); };
    const subs = [subscribeAlfaiaSticksConfig(rerender), subscribeCaixaSticksConfig(rerender), subscribeGongueStickConfig(rerender), subscribeTimbalHandsConfig(rerender), subscribeAgbeLabConfig(rerender), subscribeMineiroLabConfig(rerender), subscribeMobileOffsets(rerender)];
    return () => subs.forEach((u) => u());
  }, [isFrozen, labFam, testStroke]);

  useEffect(() => {
    if (!isLooping || !labVisible) return;
    const seq = TESTER_SEQUENCES[labFam].find((q) => q.id === activeSeqId);
    if (seq) {
      seqStepRef.current = 0; triggerSequenceStep(labFam, seq.steps, seqStepRef.current++, 260);
      const id = setInterval(() => triggerSequenceStep(labFam, seq.steps, seqStepRef.current++, 260), 260);
      return () => clearInterval(id);
    }
    triggerSingleTestStroke(labFam, testStroke);
    const id = setInterval(() => triggerSingleTestStroke(labFam, testStroke), 520);
    return () => clearInterval(id);
  }, [isLooping, labVisible, labFam, testStroke, activeSeqId]);

  if (!labVisible) return null;

  const activeCfg = labFam === 'alfaia' ? CONFIG_ALFAIA_STICKS : labFam === 'caixa' ? CONFIG_CAIXA_STICKS : labFam === 'gongue' ? CONFIG_GONGUE_STICK : labFam === 'agbe' ? CONFIG_AGBE_LAB : labFam === 'mineiro' ? CONFIG_MINEIRO_LAB : CONFIG_TIMBAL_HANDS;
  const handleCopy = () => { navigator.clipboard?.writeText(JSON.stringify(activeCfg, null, 2)).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  const handleReset = () => { setIsFrozen(false); setIsLooping(false); setActiveSeqId(null); if (labFam === 'alfaia') resetAlfaiaSticksConfig(); else if (labFam === 'caixa') resetCaixaSticksConfig(); else if (labFam === 'gongue') resetGongueStickConfig(); else if (labFam === 'agbe') resetAgbeLabConfig(); else if (labFam === 'mineiro') resetMineiroLabConfig(); else resetTimbalHandsConfig(); clearFrozenPose(labFam); };
  const setSpeed = (spd: 1 | 0.5) => (labFam === 'alfaia' ? updateAlfaiaSticksConfig({ speedMultiplier: spd }) : labFam === 'caixa' ? updateCaixaSticksConfig({ speedMultiplier: spd }) : labFam === 'gongue' ? updateGongueStickConfig({ speedMultiplier: spd }) : labFam === 'agbe' ? updateAgbeLabConfig({ speedMultiplier: spd }) : labFam === 'mineiro' ? updateMineiroLabConfig({ speedMultiplier: spd }) : updateTimbalHandsConfig({ speedMultiplier: spd }));

  const handleSwitchInstrument = (fam: AoVivoMobileFamily) => {
    const tf = detectAoVivoLabFamily(fam), firstStroke = TESTER_STROKES[tf][0].id;
    selectAoVivoLabInstrument(fam);
    setMobFam(fam); setLabFam(tf); setTestStroke(firstStroke); setActiveSeqId(null); setIsLooping(false);
    if (isFrozen) setTimeout(() => applyFrozenImpactPose(tf, firstStroke), 25); else setTimeout(() => clearFrozenPose(tf), 25);
  };

  const selectStroke = (s: string) => {
    setActiveSeqId(null); setTestStroke(s); const up = s.toUpperCase();
    if (!isMobilePosMode) {
      if (up === 'A' && labFam === 'caixa') setCaixaTab('rimshot');
      else if (['C', 'X', 'B'].includes(up)) {
        if (labFam === 'alfaia') setAlfaiaTab('special'); else if (labFam === 'caixa') setCaixaTab('special'); else if (labFam === 'gongue') setGongueTab('metal'); else if (labFam === 'agbe') setAgbeTab('kinematics'); else if (labFam === 'mineiro') setMineiroTab('kinematics'); else setTimbalTab('flas_physics');
      } else if (s === 'I' && labFam === 'alfaia') { setAlfaiaTab('bacalhau'); updateAlfaiaSticksConfig({ leftStickMode: 'bacalhau' }); }
      else if (['R', 'F'].includes(up) && labFam === 'caixa') setCaixaTab('rufada');
      else if ((up === 'S' || up === 'V') && labFam === 'agbe') setAgbeTab('salto_volta');
      else if ((up === 'T' || up === 'L') && labFam === 'mineiro') setMineiroTab('pull_lado');
    }
    if (isFrozen) applyFrozenImpactPose(labFam, s); else triggerSingleTestStroke(labFam, s);
  };

  const selectSequence = (seqId: string) => {
    setActiveSeqId(seqId); setIsFrozen(false); setIsLooping(true);
    if (!isMobilePosMode) {
      if (labFam === 'alfaia') setAlfaiaTab('transitions'); else if (labFam === 'caixa') setCaixaTab('transitions'); else if (labFam === 'timbal') setTimbalTab('transitions'); else if (labFam === 'agbe') setAgbeTab('kinematics'); else if (labFam === 'mineiro') setMineiroTab('kinematics'); else setGongueTab('metal');
    }
  };

  const focusSpecial = (s: string) => { setActiveSeqId(null); setTestStroke(s); setIsLooping(false); setIsFrozen(true); applyFrozenImpactPose(labFam, s); };

  return (
    <div className="fixed bottom-1.5 left-1.5 right-1.5 sm:left-auto sm:right-3 sm:bottom-3 sm:w-[396px] z-50 max-h-[38vh] sm:max-h-none overflow-y-auto pointer-events-auto font-mono text-xs border-2 rounded shadow-lg backdrop-blur-xs" style={{ backgroundColor: 'color-mix(in srgb, var(--cordel-bg) 92%, transparent)', borderColor: 'var(--cordel-border)', color: 'var(--cordel-text)' }}>
      <AoVivoLabHeader
        isOpen={isOpen} onToggleOpen={() => setIsOpen((v) => !v)}
        onCloseLab={() => { setIsLooping(false); setIsFrozen(false); clearFrozenPose(labFam); setIsAoVivoLabOpen(false); }}
        isMobilePosMode={isMobilePosMode} onToggleMobilePosMode={() => setIsMobilePosMode((v) => !v)}
        onReset={handleReset} onCopy={handleCopy} copied={copied} activeInstFam={mobFam} labFam={labFam}
        onSelectInstFam={handleSwitchInstrument}
        isLooping={isLooping} onToggleLoop={() => { const nxt = !isLooping; setIsLooping(nxt); if (nxt) setIsFrozen(false); }}
        isFrozen={isFrozen} onToggleFrozen={() => { const nxt = !isFrozen; setIsFrozen(nxt); setIsLooping(false); setActiveSeqId(null); if (nxt) applyFrozenImpactPose(labFam, testStroke); else clearFrozenPose(labFam); }}
        speedMultiplier={activeCfg.speedMultiplier} onSetSpeed={setSpeed} testStroke={testStroke} activeSeqId={activeSeqId} onSelectStroke={selectStroke} onSelectSequence={selectSequence}
      />
      {isOpen && (
        <div className="px-2.5 pb-2.5 pt-1 space-y-1.5">
          {isMobilePosMode ? (
            <AoVivoMobilePositionSliders activeMobFam={mobFam} onSelectMobFam={handleSwitchInstrument} />
          ) : (
            <>
              {labFam === 'alfaia' && (<><div className="grid grid-cols-4 gap-1">{ALFAIA_MODES.map((m) => <button key={m.id} type="button" onClick={() => updateAlfaiaSticksConfig({ leftStickMode: m.id })} className="px-1 py-0.5 border rounded text-[9px] font-bold truncate cursor-pointer" style={labBtnStyle(CONFIG_ALFAIA_STICKS.leftStickMode === m.id)}>{m.label}</button>)}</div><div className="flex flex-wrap gap-1 pt-0.5">{ALFAIA_TABS.map((t) => <button key={t.id} type="button" onClick={() => { setAlfaiaTab(t.id); if (t.id === 'fina' || t.id === 'bacalhau') updateAlfaiaSticksConfig({ leftStickMode: t.id }); }} className="py-0.5 px-1.5 border rounded text-[9px] font-bold cursor-pointer" style={labBtnStyle(alfaiaTab === t.id, true)}>[ {t.label} ]</button>)}</div><AoVivoSticksLabSliders activeTab={alfaiaTab} onFocusStroke={focusSpecial} /></>)}
              {labFam === 'caixa' && (<><div className="flex flex-wrap gap-1 pt-0.5">{CAIXA_TABS.map((t) => <button key={t.id} type="button" onClick={() => setCaixaTab(t.id)} className="py-0.5 px-1.5 border rounded text-[9px] font-bold cursor-pointer" style={labBtnStyle(caixaTab === t.id, true)}>[ {t.label} ]</button>)}</div><AoVivoCaixaLabSliders activeTab={caixaTab} activeTestStroke={testStroke} onFocusStroke={focusSpecial} /></>)}
              {labFam === 'gongue' && (<><div className="flex flex-wrap gap-1">{GONGUE_MODES.map((m) => <button key={m.id} type="button" onClick={() => { setIsFrozen(false); updateGongueStickConfig({ posePreview: m.id }); }} className="px-1.5 py-0.5 border rounded text-[9px] font-bold cursor-pointer" style={labBtnStyle(CONFIG_GONGUE_STICK.posePreview === m.id)}>{m.label}</button>)}</div><div className="grid grid-cols-2 gap-1 pt-0.5">{GONGUE_TABS.map((t) => <button key={t.id} type="button" onClick={() => setGongueTab(t.id)} className="py-0.5 px-1 border rounded text-[9px] font-bold truncate cursor-pointer" style={labBtnStyle(gongueTab === t.id, true)}>[ {t.label} ]</button>)}</div><AoVivoGongueLabSliders activeTab={gongueTab} /></>)}
              {labFam === 'timbal' && (<><div className="flex flex-wrap gap-1">{TIMBAL_MODES.map((m) => <button key={m.id} type="button" onClick={() => { setIsFrozen(false); updateTimbalHandsConfig({ posePreview: m.id }); }} className="px-1.5 py-0.5 border rounded text-[9px] font-bold cursor-pointer" style={labBtnStyle(CONFIG_TIMBAL_HANDS.posePreview === m.id)}>{m.label}</button>)}</div><div className="flex flex-wrap gap-1 pt-0.5">{TIMBAL_TABS.map((t) => <button key={t.id} type="button" onClick={() => setTimbalTab(t.id)} className="py-0.5 px-1.5 border rounded text-[9px] font-bold cursor-pointer" style={labBtnStyle(timbalTab === t.id, true)}>[ {t.label} ]</button>)}</div><AoVivoTimbalLabSliders activeTab={timbalTab} onFocusStroke={focusSpecial} /></>)}
              {labFam === 'agbe' && (<><div className="grid grid-cols-3 gap-1 pt-0.5">{AGBE_TABS.map((t) => <button key={t.id} type="button" onClick={() => setAgbeTab(t.id)} className="py-0.5 px-1 border rounded text-[9px] font-bold truncate cursor-pointer" style={labBtnStyle(agbeTab === t.id, true)}>[ {t.label} ]</button>)}</div><AoVivoAgbeLabSliders activeTab={agbeTab} onFocusStroke={focusSpecial} /></>)}
              {labFam === 'mineiro' && (<><div className="grid grid-cols-3 gap-1 pt-0.5">{MINEIRO_TABS.map((t) => <button key={t.id} type="button" onClick={() => setMineiroTab(t.id)} className="py-0.5 px-1 border rounded text-[9px] font-bold truncate cursor-pointer" style={labBtnStyle(mineiroTab === t.id, true)}>[ {t.label} ]</button>)}</div><AoVivoMineiroLabSliders activeTab={mineiroTab} onFocusStroke={focusSpecial} /></>)}
            </>
          )}
        </div>
      )}
    </div>
  );
};
