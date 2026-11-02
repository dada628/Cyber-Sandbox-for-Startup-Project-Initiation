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
