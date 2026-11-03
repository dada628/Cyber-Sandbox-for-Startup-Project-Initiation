import { ContractError } from "../agents/types";
import { validateRoleOutput } from "../agents/validate-output";

export type AcceptedUser =
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

const mentionsValuation = (value: unknown): boolean => {
  const blob = JSON.stringify(value);
  return blob.includes("估值") || blob.toLowerCase().includes("valuation");
};

// 把目标用户原文收成 JSON，带估值就越界失败
export const acceptUserRaw = (raw: string): AcceptedUser => {
  const trimmed = raw.trim();
  const body = unwrapFence(trimmed);
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return { ok: false, failureReason: "输出不是合法 JSON" };
  }
  if (mentionsValuation(value)) {
    return { ok: false, failureReason: "ROLE_BOUNDARY", code: "ROLE_BOUNDARY" };
  }
  try {
    validateRoleOutput("target_user", value);
  } catch (error) {
    const code = error instanceof ContractError ? error.code : "OUTPUT_SHAPE";
    if (code === "ROLE_BOUNDARY") {
      return { ok: false, failureReason: "ROLE_BOUNDARY", code };
    }
    return { ok: false, failureReason: "输出不符合目标用户 JSON", code };
  }
  if (!isRecord(value)) {
    return { ok: false, failureReason: "输出不符合目标用户 JSON", code: "OUTPUT_NOT_OBJECT" };
  }
  return { ok: true, value };
};
