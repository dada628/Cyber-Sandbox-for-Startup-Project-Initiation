import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "vite";
import sampleProposal from "../../fixtures/sample-proposal.json";
import { ContractError, type FounderInput, type RoleId } from "../agents/types";
import { buildInitialCards, type Card, type CardStatus, type ColumnId } from "../board/types";
import { createAdapter } from "../model/create-adapter";
import { replaySynthesisInventedRaw } from "../model/fixture-replay";
import { selectMode, type ModelEnv, type ModelMode } from "../model/mode";
import { assignmentFor } from "./assign";
import { visibleContext } from "./grounding";

const systemPrompt = readFileSync(resolve(process.cwd(), "prompts/synthesis-system.md"), "utf8").replace(
  /\r?\n$/,
  "",
);

const sampleFounder = sampleProposal as FounderInput;

const columnIds = ["backlog", "in_review", "awaiting_human", "concluded"] as const satisfies readonly ColumnId[];
const roleIds = ["orchestrator", "investor", "target_user", "competitor", "finance", "synthesis"] as const satisfies readonly RoleId[];
const statuses = ["idle", "running", "failed", "blocked", "ready"] as const satisfies readonly CardStatus[];

const isColumnId = (value: unknown): value is ColumnId => {
  return typeof value === "string" && columnIds.some((item) => item === value);
};

const isRoleId = (value: unknown): value is RoleId => {
  return typeof value === "string" && roleIds.some((item) => item === value);
};

const isStatus = (value: unknown): value is CardStatus => {
  return typeof value === "string" && statuses.some((item) => item === value);
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const stringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
};

const readCard = (value: unknown): Card | null => {
  if (!isRecord(value) || typeof value.id !== "string" || !isColumnId(value.columnId) || !isRoleId(value.roleId)) {
    return null;
  }
  if (typeof value.title !== "string" || typeof value.inputSummary !== "string" || !isStatus(value.status)) {
    return null;
  }
  const blockReason = value.blockReason === null || typeof value.blockReason === "string" ? value.blockReason : null;
  const output = value.output === null || typeof value.output === "string" ? value.output : null;
  const revisionFact = value.revisionFact === null || typeof value.revisionFact === "string" ? value.revisionFact : null;
  return {
    id: value.id,
    columnId: value.columnId,
    roleId: value.roleId,
    title: value.title,
    inputSummary: value.inputSummary,
    status: value.status,
    blockReason,
    output,
    revisionFact,
    confirmedByHuman: value.confirmedByHuman === true,
    dependsOn: stringList(value.dependsOn),
    sourceCardIds: stringList(value.sourceCardIds),
  };
};

// 有密钥时保持真实调用，回放只给编造过的综合席原文
export const planSynthesisCall = (env: ModelEnv): { mode: ModelMode; raw: string | null } => {
  const mode = selectMode(env);
  if (mode === "live") {
    return { mode: "live", raw: null };
  }
  return {
    mode: "replay",
    raw: replaySynthesisInventedRaw(),
  };
};

// 从请求里读出棋盘，没有棋盘时按空棋盘处理
export const boardCardsFromPayload = (payload: unknown): Card[] => {
  if (!isRecord(payload) || !Array.isArray(payload.cards)) {
    return [];
  }
  const cards: Card[] = [];
  for (const item of payload.cards) {
    const card = readCard(item);
    if (card !== null) {
      cards.push(card);
    }
  }
  return cards;
};

// 综合席用户消息只保留已入结论的卡
export const synthesisUserMessage = (cards: readonly Card[]): string => {
  const concluded = cards.filter((card) => card.columnId === "concluded");
  return JSON.stringify(visibleContext("synthesis", sampleFounder, concluded));
};

// 按样例立项运行综合席，回放原文原样返回，不收成产出
export const runSynthesis = async (
  cardId: string,
  cards: readonly Card[],
): Promise<{ mode: ModelMode; raw: string }> => {
  const card = buildInitialCards(sampleFounder).find((item) => item.id === cardId);
  if (!card) {
    throw new ContractError("MISSING_CARD", cardId);
  }
  const assignment = assignmentFor(card);
  if (assignment === null || assignment.roleId !== "synthesis" || "conclusion" in assignment) {
    throw new ContractError("NOT_SYNTHESIS_CARD", cardId);
  }
  const message = synthesisUserMessage(cards);
  for (const item of cards) {
    if (item.columnId === "concluded" || item.output === null || item.output === "") {
      continue;
    }
    if (message.includes(item.output)) {
      throw new ContractError("UNCONFIRMED_CARD", item.id);
    }
  }
  const env = loadEnv(process.env.NODE_ENV === "production" ? "production" : "development", process.cwd(), "");
  const plan = planSynthesisCall(env);
  if (plan.mode === "replay" && plan.raw !== null) {
    return { mode: "replay", raw: plan.raw };
  }
  const adapter = createAdapter(env);
  try {
    const raw = await adapter.complete([
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ]);
    return { mode: adapter.mode, raw };
  } catch (error) {
    if (adapter.mode === "live") {
      throw new ContractError("LIVE_CALL_FAILED", "综合席调用失败");
    }
    throw error;
  }
};
