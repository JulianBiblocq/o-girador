import React from 'react';
import { AoVivoMobileFamily } from '../../audio/animations/aoVivoMobileOffsets';
import { CONFIG_ALFAIA_STICKS, updateAlfaiaSticksConfig } from '../../audio/animations/alfaiaKinematics';
import { CONFIG_GONGUE_STICK, updateGongueStickConfig } from '../../audio/animations/gongueKinematics';
import { CONFIG_TIMBAL_HANDS, updateTimbalHandsConfig } from '../../audio/animations/timbalKinematics';
import { AlfaiaLabTabId, AoVivoSticksLabSliders } from './AoVivoSticksLabSliders';
import { AoVivoCaixaLabSliders, CaixaLabTabId } from './AoVivoCaixaLabSliders';
import { AoVivoGongueLabSliders, GongueLabTabId } from './AoVivoGongueLabSliders';
import { AoVivoTimbalLabSliders, TimbalLabTabId } from './AoVivoTimbalLabSliders';
import { AgbeLabTabId, AoVivoAgbeLabSliders } from './AoVivoAgbeLabSliders';
import { AoVivoMineiroLabSliders, MineiroLabTabId } from './AoVivoMineiroLabSliders';
import { AoVivoMobilePositionSliders } from './AoVivoMobilePositionSliders';
import { labBtnStyle } from './AoVivoLabHeader';
import { TesterFamily } from './aoVivoStrokeTester';
import { AGBE_TABS, ALFAIA_MODES, ALFAIA_TABS, CAIXA_TABS, GONGUE_MODES, GONGUE_TABS, MINEIRO_TABS, TIMBAL_MODES, TIMBAL_TABS } from './aoVivoLabTabsConfig';

interface AoVivoLabBodyProps {
  isMobileTarget: boolean;
  isGlobalMobTab: boolean;
  onSelectGlobalMobTab: () => void;
  mobFam: AoVivoMobileFamily;
  labFam: TesterFamily;
  testStroke: string;
  alfaiaTab: AlfaiaLabTabId;
  onSetAlfaiaTab: (t: AlfaiaLabTabId) => void;
  caixaTab: CaixaLabTabId;
  onSetCaixaTab: (t: CaixaLabTabId) => void;
  gongueTab: GongueLabTabId;
  onSetGongueTab: (t: GongueLabTabId) => void;
  timbalTab: TimbalLabTabId;
  onSetTimbalTab: (t: TimbalLabTabId) => void;
  agbeTab: AgbeLabTabId;
  onSetAgbeTab: (t: AgbeLabTabId) => void;
  mineiroTab: MineiroLabTabId;
  onSetMineiroTab: (t: MineiroLabTabId) => void;
  onUnfreeze: () => void;
  onFocusStroke: (s: string) => void;
}

export const AoVivoLabBody: React.FC<AoVivoLabBodyProps> = ({
  isMobileTarget, isGlobalMobTab, onSelectGlobalMobTab, mobFam, labFam, testStroke,
  alfaiaTab, onSetAlfaiaTab, caixaTab, onSetCaixaTab, gongueTab, onSetGongueTab,
  timbalTab, onSetTimbalTab, agbeTab, onSetAgbeTab, mineiroTab, onSetMineiroTab,
  onUnfreeze, onFocusStroke,
}) => {
  const showGlobal = isMobileTarget && isGlobalMobTab;
  const globalTabBtn = isMobileTarget ? (
    <button type="button" onClick={onSelectGlobalMobTab} className="py-0.5 px-1.5 border rounded text-[9px] font-bold cursor-pointer shrink-0" style={labBtnStyle(showGlobal, true)}>
      [ Global Mobile ]
    </button>
  ) : null;

  return (
    <div className="px-2.5 pb-2.5 pt-1.5 space-y-1.5">
      {!showGlobal && labFam === 'alfaia' && (
        <div className="grid grid-cols-4 gap-1">
          {ALFAIA_MODES.map((m) => <button key={m.id} type="button" onClick={() => updateAlfaiaSticksConfig({ leftStickMode: m.id })} className="px-1 py-0.5 border rounded text-[9px] font-bold truncate cursor-pointer" style={labBtnStyle(CONFIG_ALFAIA_STICKS.leftStickMode === m.id)}>{m.label}</button>)}
        </div>
      )}
      {!showGlobal && labFam === 'gongue' && (
        <div className="flex flex-wrap gap-1">
          {GONGUE_MODES.map((m) => <button key={m.id} type="button" onClick={() => { onUnfreeze(); updateGongueStickConfig({ posePreview: m.id }); }} className="px-1.5 py-0.5 border rounded text-[9px] font-bold cursor-pointer" style={labBtnStyle(CONFIG_GONGUE_STICK.posePreview === m.id)}>{m.label}</button>)}
        </div>
      )}
      {!showGlobal && labFam === 'timbal' && (
        <div className="flex flex-wrap gap-1">
          {TIMBAL_MODES.map((m) => <button key={m.id} type="button" onClick={() => { onUnfreeze(); updateTimbalHandsConfig({ posePreview: m.id }); }} className="px-1.5 py-0.5 border rounded text-[9px] font-bold cursor-pointer" style={labBtnStyle(CONFIG_TIMBAL_HANDS.posePreview === m.id)}>{m.label}</button>)}
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {globalTabBtn}
        {labFam === 'alfaia' && ALFAIA_TABS.map((t) => <button key={t.id} type="button" onClick={() => { onSetAlfaiaTab(t.id); if (t.id === 'fina' || t.id === 'bacalhau') updateAlfaiaSticksConfig({ leftStickMode: t.id }); }} className="py-0.5 px-1.5 border rounded text-[9px] font-bold cursor-pointer" style={labBtnStyle(!showGlobal && alfaiaTab === t.id, true)}>[ {t.label} ]</button>)}
        {labFam === 'caixa' && CAIXA_TABS.map((t) => <button key={t.id} type="button" onClick={() => onSetCaixaTab(t.id)} className="py-0.5 px-1.5 border rounded text-[9px] font-bold cursor-pointer" style={labBtnStyle(!showGlobal && caixaTab === t.id, true)}>[ {t.label} ]</button>)}
        {labFam === 'gongue' && GONGUE_TABS.map((t) => <button key={t.id} type="button" onClick={() => onSetGongueTab(t.id)} className="py-0.5 px-1.5 border rounded text-[9px] font-bold cursor-pointer" style={labBtnStyle(!showGlobal && gongueTab === t.id, true)}>[ {t.label} ]</button>)}
        {labFam === 'timbal' && TIMBAL_TABS.map((t) => <button key={t.id} type="button" onClick={() => onSetTimbalTab(t.id)} className="py-0.5 px-1.5 border rounded text-[9px] font-bold cursor-pointer" style={labBtnStyle(!showGlobal && timbalTab === t.id, true)}>[ {t.label} ]</button>)}
        {labFam === 'agbe' && AGBE_TABS.map((t) => <button key={t.id} type="button" onClick={() => onSetAgbeTab(t.id)} className="py-0.5 px-1.5 border rounded text-[9px] font-bold cursor-pointer" style={labBtnStyle(!showGlobal && agbeTab === t.id, true)}>[ {t.label} ]</button>)}
        {labFam === 'mineiro' && MINEIRO_TABS.map((t) => <button key={t.id} type="button" onClick={() => onSetMineiroTab(t.id)} className="py-0.5 px-1.5 border rounded text-[9px] font-bold cursor-pointer" style={labBtnStyle(!showGlobal && mineiroTab === t.id, true)}>[ {t.label} ]</button>)}
      </div>

      {showGlobal ? (
        <AoVivoMobilePositionSliders activeMobFam={mobFam} />
      ) : (
        <>
          {labFam === 'alfaia' && <AoVivoSticksLabSliders activeTab={alfaiaTab} onFocusStroke={onFocusStroke} />}
          {labFam === 'caixa' && <AoVivoCaixaLabSliders activeTab={caixaTab} activeTestStroke={testStroke} onFocusStroke={onFocusStroke} />}
          {labFam === 'gongue' && <AoVivoGongueLabSliders activeTab={gongueTab} />}
          {labFam === 'timbal' && <AoVivoTimbalLabSliders activeTab={timbalTab} onFocusStroke={onFocusStroke} />}
          {labFam === 'agbe' && <AoVivoAgbeLabSliders activeTab={agbeTab} onFocusStroke={onFocusStroke} />}
          {labFam === 'mineiro' && <AoVivoMineiroLabSliders activeTab={mineiroTab} onFocusStroke={onFocusStroke} />}
        </>
      )}
    </div>
  );
};
