export interface EnsembleAcousticsSlice {
  skinChorusAmount: number;
  rodaBreathingAmount: number;
  isEnsembleAcousticsBypassed: boolean;
  setSkinChorusAmount: (amount: number) => void;
  setRodaBreathingAmount: (amount: number) => void;
  setEnsembleAcousticsBypassed: (bypassed: boolean) => void;
  toggleEnsembleAcousticsBypassed: () => void;
}
