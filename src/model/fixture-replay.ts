import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readFixture = (name: string): string => {
  return readFileSync(resolve(process.cwd(), "fixtures", name), "utf8");
};

// 没有密钥时，投资人回放合法 JSON 原文
export const replayInvestorRaw = (): string => {
  return readFixture("investor-valid.json");
};

// 回放格式失败时，投资人回放上一段自由文本
export const replayInvestorInvalidRaw = (): string => {
  return readFixture("investor-invalid.txt");
};

// 没有密钥时，财务回放合法保留 JSON 原文
export const replayFinanceHoldRaw = (): string => {
  return readFixture("finance-hold.json");
};

// 回放格式失败时，财务回放没有数字却给通过的原文
export const replayFinanceIllegalRaw = (): string => {
  return readFixture("finance-illegal-pass.json");
};

// 没有密钥时，目标用户回放合法 JSON 原文
export const replayUserValidRaw = (): string => {
  return readFixture("user-valid.json");
};

// 没有密钥时，竞品回放合法待证 JSON 原文
export const replayCompetitorValidRaw = (): string => {
  return readFixture("competitor-valid.json");
};
