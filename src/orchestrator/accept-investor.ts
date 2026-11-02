import { ContractError } from "../agents/types";
import { validateRoleOutput } from "../agents/validate-output";

export type AcceptedInvestor =
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

// 把投资人原文收成 JSON，失败时只返回中文原因
export const acceptInvestorRaw = (raw: string): AcceptedInvestor => {
  const trimmed = raw.trim();
  const body = unwrapFence(trimmed);
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return { ok: false, failureReason: "输出不是合法 JSON" };
  }
  try {
    validateRoleOutput("investor", value);
  } catch (error) {
    const code = error instanceof ContractError ? error.code : "OUTPUT_SHAPE";
    return { ok: false, failureReason: "输出不符合投资人 JSON", code };
  }
  if (!isRecord(value)) {
    return { ok: false, failureReason: "输出不符合投资人 JSON", code: "OUTPUT_NOT_OBJECT" };
  }
  return { ok: true, value };
};
