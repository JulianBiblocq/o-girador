import React, { useEffect, useRef, useState } from 'react';
import {
  getIsAoVivoLabOpen, isAoVivoMobileEditActive, isAoVivoMobileProfileActive,
  setAoVivoMobileEditForced, setIsAoVivoLabOpen, subscribeAoVivoLabOpen, subscribeAoVivoTargetMode,
} from '../../audio/animations/aoVivoConfigStorage';
import { AoVivoMobileFamily, isMobileViewport, resetMobileOffsets, resolveMobileFamily } from '../../audio/animations/aoVivoMobileOffsets';
import { buildFullMobileAoVivoExportObject, setActiveMobileDrumFamily } from '../../audio/animations/aoVivoMobileStrokeConfigs';
import { AlfaiaLabTabId } from './AoVivoSticksLabSliders';
import { CaixaLabTabId } from './AoVivoCaixaLabSliders';
import { GongueLabTabId } from './AoVivoGongueLabSliders';
import { TimbalLabTabId } from './AoVivoTimbalLabSliders';
import { AgbeLabTabId } from './AoVivoAgbeLabSliders';
import { MineiroLabTabId } from './AoVivoMineiroLabSliders';
import { AoVivoLabHeader } from './AoVivoLabHeader';
import { AoVivoLabBody } from './AoVivoLabBody';
import { getLabActiveConfig, resetLabInstrumentStrokeConfig, routeLabTabForStroke, setLabInstrumentSpeed, subscribeAllAoVivoLabConfigs } from './aoVivoLabConfigBridge';
import { applyFrozenImpactPose, clearFrozenPose, selectAoVivoLabInstrument, TESTER_SEQUENCES, TESTER_STROKES, TesterFamily, triggerSequenceStep, triggerSingleTestStroke } from './aoVivoStrokeTester';
import { detectAoVivoLabFamily } from './aoVivoLabTabsConfig';

export const AoVivoSticksLabBar: React.FC<{ instId: string }> = ({ instId }) => {
  const [labVisible, setLabVisible] = useState(() => getIsAoVivoLabOpen());
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileTarget, setIsMobileTarget] = useState(() => isAoVivoMobileProfileActive());
  const [isGlobalMobTab, setIsGlobalMobTab] = useState(() => isMobileViewport());
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
    if (open) { setIsOpen(true); setIsMobileTarget(isAoVivoMobileProfileActive()); setIsGlobalMobTab(isMobileViewport()); }
  }), []);

  useEffect(() => subscribeAoVivoTargetMode(() => {
    const mob = isAoVivoMobileProfileActive();
    setIsMobileTarget(mob);
    if (!mob) setIsGlobalMobTab(false);
  }), []);

  useEffect(() => {
    const mf = resolveMobileFamily(instId), f = detectAoVivoLabFamily(instId);
    if (mf === 'caixa' || mf === 'tarol') setActiveMobileDrumFamily(mf);
    setLabFam(f); setMobFam(mf); setTestStroke(TESTER_STROKES[f][0].id); setActiveSeqId(null); setIsLooping(false); setIsFrozen(false);
  }, [instId]);

  useEffect(() => subscribeAllAoVivoLabConfigs(() => {
    setTick((n) => n + 1);
    if (isFrozen) applyFrozenImpactPose(labFam, testStroke);
  }), [isFrozen, labFam, testStroke]);

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

  const activeCfg = getLabActiveConfig(labFam);
  const handleCopy = () => {
    const payload = isMobileTarget ? buildFullMobileAoVivoExportObject() : activeCfg;
    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2)).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };
  const handleReset = () => {
    setIsFrozen(false); setIsLooping(false); setActiveSeqId(null);
    if (isMobileTarget && isGlobalMobTab) resetMobileOffsets(mobFam); else resetLabInstrumentStrokeConfig(labFam);
    clearFrozenPose(labFam);
  };
  const handleSwitchInstrument = (fam: AoVivoMobileFamily) => {
    const tf = detectAoVivoLabFamily(fam), firstStroke = TESTER_STROKES[tf][0].id;
    if (fam === 'caixa' || fam === 'tarol') setActiveMobileDrumFamily(fam);
    selectAoVivoLabInstrument(fam);
    setMobFam(fam); setLabFam(tf); setTestStroke(firstStroke); setActiveSeqId(null); setIsLooping(false);
    setTimeout(() => (isFrozen ? applyFrozenImpactPose(tf, firstStroke) : clearFrozenPose(tf)), 25);
  };
  const selectStroke = (s: string) => {
    setActiveSeqId(null); setTestStroke(s);
    routeLabTabForStroke(labFam, s, { setIsGlobalMobTab, setAlfaiaTab, setCaixaTab, setGongueTab, setTimbalTab, setAgbeTab, setMineiroTab });
    if (isFrozen) applyFrozenImpactPose(labFam, s); else triggerSingleTestStroke(labFam, s);
  };
  const selectSequence = (seqId: string) => {
    setActiveSeqId(seqId); setIsFrozen(false); setIsLooping(true); setIsGlobalMobTab(false);
    if (labFam === 'alfaia') setAlfaiaTab('transitions'); else if (labFam === 'caixa') setCaixaTab('transitions'); else if (labFam === 'timbal') setTimbalTab('transitions'); else if (labFam === 'agbe') setAgbeTab('kinematics'); else if (labFam === 'mineiro') setMineiroTab('kinematics'); else setGongueTab('metal');
  };
  const focusSpecial = (s: string) => { setActiveSeqId(null); setTestStroke(s); setIsLooping(false); setIsFrozen(true); applyFrozenImpactPose(labFam, s); };

  return (
    <div className="fixed bottom-1.5 left-1.5 right-1.5 md:left-auto md:right-3 md:bottom-3 md:w-[396px] z-50 max-h-[46dvh] md:max-h-none overflow-y-auto pointer-events-auto font-mono text-xs border-2 rounded shadow-lg backdrop-blur-xs" style={{ backgroundColor: 'color-mix(in srgb, var(--cordel-bg) 94%, transparent)', borderColor: 'var(--cordel-border)', color: 'var(--cordel-text)' }}>
      <AoVivoLabHeader
        isOpen={isOpen} onToggleOpen={() => setIsOpen((v) => !v)}
        onCloseLab={() => { setIsLooping(false); setIsFrozen(false); clearFrozenPose(labFam); setIsAoVivoLabOpen(false); }}
        isMobileTarget={isMobileTarget} isForceMobileTarget={isAoVivoMobileEditActive()}
        onToggleForceMobileTarget={() => { const nxt = !isAoVivoMobileEditActive(); setAoVivoMobileEditForced(nxt); setIsGlobalMobTab(nxt); }}
        onReset={handleReset} onCopy={handleCopy} copied={copied} activeInstFam={mobFam} labFam={labFam} onSelectInstFam={handleSwitchInstrument}
        isLooping={isLooping} onToggleLoop={() => { const nxt = !isLooping; setIsLooping(nxt); if (nxt) setIsFrozen(false); }}
        isFrozen={isFrozen} onToggleFrozen={() => { const nxt = !isFrozen; setIsFrozen(nxt); setIsLooping(false); setActiveSeqId(null); if (nxt) applyFrozenImpactPose(labFam, testStroke); else clearFrozenPose(labFam); }}
        speedMultiplier={activeCfg.speedMultiplier} onSetSpeed={(spd) => setLabInstrumentSpeed(labFam, spd)} testStroke={testStroke} activeSeqId={activeSeqId} onSelectStroke={selectStroke} onSelectSequence={selectSequence}
      />
      {isOpen && (
        <AoVivoLabBody
          isMobileTarget={isMobileTarget} isGlobalMobTab={isGlobalMobTab} onSelectGlobalMobTab={() => setIsGlobalMobTab(true)}
          mobFam={mobFam} labFam={labFam} testStroke={testStroke}
          alfaiaTab={alfaiaTab} onSetAlfaiaTab={(t) => { setIsGlobalMobTab(false); setAlfaiaTab(t); }}
          caixaTab={caixaTab} onSetCaixaTab={(t) => { setIsGlobalMobTab(false); setCaixaTab(t); }}
          gongueTab={gongueTab} onSetGongueTab={(t) => { setIsGlobalMobTab(false); setGongueTab(t); }}
          timbalTab={timbalTab} onSetTimbalTab={(t) => { setIsGlobalMobTab(false); setTimbalTab(t); }}
          agbeTab={agbeTab} onSetAgbeTab={(t) => { setIsGlobalMobTab(false); setAgbeTab(t); }}
          mineiroTab={mineiroTab} onSetMineiroTab={(t) => { setIsGlobalMobTab(false); setMineiroTab(t); }}
          onUnfreeze={() => setIsFrozen(false)} onFocusStroke={focusSpecial}
        />
      )}
    </div>
  );
};
