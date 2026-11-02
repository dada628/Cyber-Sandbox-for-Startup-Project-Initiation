import sampleProposal from "../../fixtures/sample-proposal.json";
import { ContractError, type FounderInput } from "../agents/types";
import { assertFinanceVerdict, validateRoleOutput } from "../agents/validate-output";

export type AcceptedFinance =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; failureReason: string; code?: string };

const sampleFounder = sampleProposal as FounderInput;

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

// 把财务原文收成 JSON，合法保留原样通过，绝不改写 verdict
export const acceptFinanceRaw = (raw: string): AcceptedFinance => {
  const trimmed = raw.trim();
  const body = unwrapFence(trimmed);
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return { ok: false, failureReason: "输出不是合法 JSON" };
  }
  try {
    validateRoleOutput("finance", value);
  } catch (error) {
    const code = error instanceof ContractError ? error.code : "OUTPUT_SHAPE";
    return { ok: false, failureReason: "输出不符合财务 JSON", code };
  }
  if (!isRecord(value)) {
    return { ok: false, failureReason: "输出不符合财务 JSON", code: "OUTPUT_NOT_OBJECT" };
  }
  try {
    assertFinanceVerdict(sampleFounder, value);
  } catch (error) {
    if (error instanceof ContractError && error.code === "FINANCE_HOLD_REQUIRED") {
      return { ok: false, failureReason: "没有单位经济数字，不能通过", code: error.code };
    }
    const code = error instanceof ContractError ? error.code : "FINANCE_HOLD_REQUIRED";
    return { ok: false, failureReason: "没有单位经济数字，不能通过", code };
  }
  return { ok: true, value };
};
