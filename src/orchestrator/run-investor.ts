import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "vite";
import sampleProposal from "../../fixtures/sample-proposal.json";
import { ContractError, type FounderInput } from "../agents/types";
import { buildInitialCards } from "../board/types";
import { createAdapter } from "../model/create-adapter";
import type { ModelMode } from "../model/mode";
import { assignmentFor } from "./assign";
import { visibleContext } from "./grounding";

const systemPrompt = readFileSync(resolve(process.cwd(), "prompts/investor-system.md"), "utf8").replace(
  /\r?\n$/,
  "",
);

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
  void forceInvalid;
  const env = loadEnv(process.env.NODE_ENV === "production" ? "production" : "development", process.cwd(), "");
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
