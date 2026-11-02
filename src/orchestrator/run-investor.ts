import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "vite";
import sampleProposal from "../../fixtures/sample-proposal.json";
import { ContractError, type FounderInput } from "../agents/types";
import { buildInitialCards } from "../board/types";
import { createAdapter } from "../model/create-adapter";
import { replayInvestorInvalidRaw, replayInvestorRaw } from "../model/fixture-replay";
import { selectMode, type ModelEnv, type ModelMode } from "../model/mode";
import { assignmentFor } from "./assign";
import { visibleContext } from "./grounding";

const systemPrompt = readFileSync(resolve(process.cwd(), "prompts/investor-system.md"), "utf8").replace(
  /\r?\n$/,
  "",
);

// 有密钥时保持真实调用，回放才允许改用非法文本
export const planInvestorCall = (
  env: ModelEnv,
  forceInvalid: boolean,
): { mode: ModelMode; raw: string | null } => {
  const mode = selectMode(env);
  if (mode === "live") {
    return { mode: "live", raw: null };
  }
  return {
    mode: "replay",
    raw: forceInvalid ? replayInvestorInvalidRaw() : replayInvestorRaw(),
  };
};

// 按样例立项运行投资人，原样返回模型原文
export const runInvestor = async (
  cardId: string,
  forceInvalid: boolean,
): Promise<{ mode: ModelMode; raw: string }> => {
  const founder = sampleProposal as FounderInput;
  const card = buildInitialCards(founder).find((item) => item.id === cardId);
  if (!card) {
    throw new ContractError("MISSING_CARD", cardId);
  }
  const assignment = assignmentFor(card);
  if (assignment === null) {
    throw new ContractError("NOT_INVESTOR_CARD", cardId);
  }
  const visible = visibleContext("investor", founder, []);
  const env = loadEnv(process.env.NODE_ENV === "production" ? "production" : "development", process.cwd(), "");
  const plan = planInvestorCall(env, forceInvalid);
  if (plan.mode === "replay" && plan.raw !== null) {
    return { mode: "replay", raw: plan.raw };
  }
  const adapter = createAdapter(env);
  try {
    const raw = await adapter.complete([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: JSON.stringify({
          assignment,
          inputSummary: card.inputSummary,
          visible,
        }),
      },
    ]);
    return { mode: adapter.mode, raw };
  } catch (error) {
    if (adapter.mode === "live") {
      throw new ContractError("LIVE_CALL_FAILED", "投资人调用失败");
    }
    throw error;
  }
};
