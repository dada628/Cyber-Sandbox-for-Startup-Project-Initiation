import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "vite";
import sampleProposal from "../../fixtures/sample-proposal.json";
import { ContractError, type FounderInput } from "../agents/types";
import { buildInitialCards, type Card } from "../board/types";
import { createAdapter } from "../model/create-adapter";
import { replayFinanceHoldRaw, replayFinanceIllegalRaw } from "../model/fixture-replay";
import { selectMode, type ModelEnv, type ModelMode } from "../model/mode";
import { assignmentFor } from "./assign";
import { visibleContext } from "./grounding";

const systemPrompt = readFileSync(resolve(process.cwd(), "prompts/finance-system.md"), "utf8").replace(
  /\r?\n$/,
  "",
);

const sampleFounder = sampleProposal as FounderInput;

// 有密钥时保持真实调用，回放才允许改用非法通过原文
export const planFinanceCall = (
  env: ModelEnv,
  forceInvalid: boolean,
): { mode: ModelMode; raw: string | null } => {
  const mode = selectMode(env);
  if (mode === "live") {
    return { mode: "live", raw: null };
  }
  return {
    mode: "replay",
    raw: forceInvalid ? replayFinanceIllegalRaw() : replayFinanceHoldRaw(),
  };
};

// 财务可见上下文，已入结论卡一律不下发
export const financeVisibleContext = (
  founder: FounderInput,
  cards: readonly Card[],
): ReturnType<typeof visibleContext> => {
  return visibleContext("finance", founder, cards);
};

// 按样例立项运行财务，原样返回模型原文
export const runFinance = async (
  cardId: string,
  forceInvalid: boolean,
): Promise<{ mode: ModelMode; raw: string }> => {
  const card = buildInitialCards(sampleFounder).find((item) => item.id === cardId);
  if (!card) {
    throw new ContractError("MISSING_CARD", cardId);
  }
  const assignment = assignmentFor(card);
  if (assignment === null || assignment.roleId !== "finance") {
    throw new ContractError("NOT_FINANCE_CARD", cardId);
  }
  const env = loadEnv(process.env.NODE_ENV === "production" ? "production" : "development", process.cwd(), "");
  const plan = planFinanceCall(env, forceInvalid);
  if (plan.mode === "replay" && plan.raw !== null) {
    return { mode: "replay", raw: plan.raw };
  }
  const adapter = createAdapter(env);
  try {
    const raw = await adapter.complete([
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify(visibleContext("finance", sampleFounder, [])) },
    ]);
    return { mode: adapter.mode, raw };
  } catch (error) {
    if (adapter.mode === "live") {
      throw new ContractError("LIVE_CALL_FAILED", "财务调用失败");
    }
    throw error;
  }
};
