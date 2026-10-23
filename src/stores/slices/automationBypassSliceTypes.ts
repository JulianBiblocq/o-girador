/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GlobalAutomationBypass } from '../../utils/automationBypassHelper';

export interface AutomationBypassSlice {
  globalAutomationBypass: GlobalAutomationBypass;
  toggleGlobalAutomationBypass: (target: 'all' | 'volume' | 'pan' | 'reverb') => void;
  setGlobalAutomationBypass: (bypass: Partial<GlobalAutomationBypass>) => void;
}
