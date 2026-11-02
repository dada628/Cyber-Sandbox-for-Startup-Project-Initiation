const investorRaw =
  "这个想法可以做。我建议把项目名改得更响，并把介绍文案写得更激动一些。市场肯定很大，先占住本校再说。";

// 没有密钥时，投资人固定回放这一段自由文本
export const replayInvestorRaw = (): string => {
  return investorRaw;
};
