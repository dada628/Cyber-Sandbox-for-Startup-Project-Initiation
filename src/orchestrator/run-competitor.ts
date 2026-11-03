import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "vite";
import sampleProposal from "../../fixtures/sample-proposal.json";
import { ContractError, type FounderInput } from "../agents/types";
import { buildInitialCards } from "../board/types";
import { createAdapter } from "../model/create-adapter";
import { replayCompetitorValidRaw } from "../model/fixture-replay";
import { selectMode, type ModelEnv, type ModelMode } from "../model/mode";
import { assignmentFor } from "./assign";
import { visibleContext } from "./grounding";

const systemPrompt = readFileSync(resolve(process.cwd(), "prompts/competitor-system.md"), "utf8").replace(
  /\r?\n$/,
  "",
);

const sampleFounder = sampleProposal as FounderInput;

// 有密钥时保持真实调用，回放只给合法竞品 JSON
export const planCompetitorCall = (env: ModelEnv): { mode: ModelMode; raw: string | null } => {
  const mode = selectMode(env);
  if (mode === "live") {
    return { mode: "live", raw: null };
  }
  return {
    mode: "replay",
    raw: replayCompetitorValidRaw(),
  };
};

// 按样例立项运行竞品，原文原样返回
export const runCompetitor = async (cardId: string): Promise<{ mode: ModelMode; raw: string }> => {
  const card = buildInitialCards(sampleFounder).find((item) => item.id === cardId);
  if (!card) {
    throw new ContractError("MISSING_CARD", cardId);
  }
  const assignment = assignmentFor(card);
  if (assignment === null || assignment.roleId !== "competitor") {
    throw new ContractError("NOT_COMPETITOR_CARD", cardId);
  }
  const env = loadEnv(process.env.NODE_ENV === "production" ? "production" : "development", process.cwd(), "");
  const plan = planCompetitorCall(env);
  if (plan.mode === "replay" && plan.raw !== null) {
    return { mode: "replay", raw: plan.raw };
  }
  const adapter = createAdapter(env);
  try {
    const raw = await adapter.complete([
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify(visibleContext("competitor", sampleFounder, [])) },
    ]);
    return { mode: adapter.mode, raw };
  } catch (error) {
    if (adapter.mode === "live") {
      throw new ContractError("LIVE_CALL_FAILED", "竞品调用失败");
    }
    throw error;
  }
};
