import { ContractError } from "../agents/types";
import { validateRoleOutput } from "../agents/validate-output";
import type { Card } from "../board/types";
import { assertSynthesisGrounded } from "./grounding";

export type AcceptedSynthesis =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; failureReason: string; code?: string };

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const unwrapFence = (text: string): string => {
  const fenced = text.match(/^```(?:json)?[^\S\r\n]*\r?\n([\s\S]*?)\r?\n```$/);
  if (!fenced || fenced[1] === undefined) {
    return text;
  }
  return fenced[1];
};

const reject = (error: unknown): AcceptedSynthesis => {
  const code = error instanceof ContractError ? error.code : "OUTPUT_SHAPE";
  if (code === "UNCONFIRMED_CARD") {
    return { ok: false, failureReason: "引用了尚未入结论的卡片", code };
  }
  return { ok: false, failureReason: "输出不符合综合席 JSON", code };
};

// 把综合席原文收成 JSON，引用必须落在已入结论的卡上
export const acceptSynthesisRaw = (raw: string, cards: readonly Card[]): AcceptedSynthesis => {
  const trimmed = raw.trim();
  const body = unwrapFence(trimmed);
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return { ok: false, failureReason: "输出不是合法 JSON" };
  }
  try {
    validateRoleOutput("synthesis", value);
  } catch (error) {
    return reject(error);
  }
  try {
    assertSynthesisGrounded(value, cards);
  } catch (error) {
    return reject(error);
  }
  if (!isRecord(value)) {
    return { ok: false, failureReason: "输出不符合综合席 JSON", code: "OUTPUT_NOT_OBJECT" };
  }
  return { ok: true, value };
};
