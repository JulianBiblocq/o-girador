
import { GlobalAutomationBypass } from '../../utils/automationBypassHelper';

export interface AutomationBypassSlice {
  globalAutomationBypass: GlobalAutomationBypass;
  toggleGlobalAutomationBypass: (target: 'all' | 'volume' | 'pan' | 'reverb') => void;
  setGlobalAutomationBypass: (bypass: Partial<GlobalAutomationBypass>) => void;
}
