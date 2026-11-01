import { getRole } from "../agents/roles";
import { ContractError, type FounderInput, type RoleId } from "../agents/types";

const unitEconomyPatterns = [
  /[¥￥]\s*\d/,
  /\d+(?:\.\d+)?\s*(?:元|块)/,
  /\d+(?:\.\d+)?\s*%/,
  /抽成\s*\d/,
  /客单价\s*\d/,
  /成本\s*\d/,
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const nonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const isStringArray = (value: unknown): value is readonly string[] => {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
};

const hasUnitEconomics = (founder: FounderInput): boolean => {
  const text = `${founder.businessModel}\n${founder.excerpt}`;
  return unitEconomyPatterns.some((pattern) => pattern.test(text));
};

const validateInvestor = (output: Record<string, unknown>): void => {
  const questions = output.questions;
  if (!Array.isArray(questions) || questions.length < 1) {
    throw new ContractError("OUTPUT_SHAPE", "questions");
  }
  for (const question of questions) {
    if (!isRecord(question) || !nonEmptyString(question.text) || !nonEmptyString(question.basis)) {
      throw new ContractError("OUTPUT_SHAPE", "questions");
    }
  }
  if (!isStringArray(output.evidenceRequests)) {
    throw new ContractError("OUTPUT_SHAPE", "evidenceRequests");
  }
  if (output.verdict !== "通过" && output.verdict !== "保留") {
    throw new ContractError("OUTPUT_SHAPE", "verdict");
  }
  if (!nonEmptyString(output.rationale)) {
    throw new ContractError("OUTPUT_SHAPE", "rationale");
  }
};

const validateTargetUser = (output: Record<string, unknown>): void => {
  if (!nonEmptyString(output.scenario) || !nonEmptyString(output.counterexample)) {
    throw new ContractError("OUTPUT_SHAPE", "scenario");
  }
  if (typeof output.painReal !== "boolean") {
    throw new ContractError("OUTPUT_SHAPE", "painReal");
  }
  if (
    output.habitChange !== "愿意" &&
    output.habitChange !== "不确定" &&
    output.habitChange !== "不愿意"
  ) {
    throw new ContractError("OUTPUT_SHAPE", "habitChange");
  }
};

const validateCompetitor = (output: Record<string, unknown>): void => {
  const alternatives = output.alternatives;
  if (!Array.isArray(alternatives)) {
    throw new ContractError("OUTPUT_SHAPE", "alternatives");
  }
  let hasPending = false;
  let allSourced = alternatives.length > 0;
  for (const alternative of alternatives) {
    if (!isRecord(alternative)) {
      throw new ContractError("OUTPUT_SHAPE", "alternatives");
    }
    const source = alternative.source;
    const status = alternative.status;
    if ((source === null || source === undefined) && status !== "待证") {
      throw new ContractError("SOURCE_REQUIRED", "source");
    }
    if (status === "待证") {
      hasPending = true;
    }
    if (status !== "已给出来源") {
      allSourced = false;
    }
  }
  if (hasPending) {
    if (output.differentiationHolds !== null) {
      throw new ContractError("DIFFERENTIATION_UNPROVED", "differentiationHolds");
    }
    return;
  }
  if (allSourced && typeof output.differentiationHolds !== "boolean") {
    throw new ContractError("OUTPUT_SHAPE", "differentiationHolds");
  }
};

const validateFinance = (output: Record<string, unknown>): void => {
  const assumptions = output.assumptions;
  if (!Array.isArray(assumptions)) {
    throw new ContractError("OUTPUT_SHAPE", "assumptions");
  }
  for (const assumption of assumptions) {
    if (!isRecord(assumption) || !nonEmptyString(assumption.name)) {
      throw new ContractError("OUTPUT_SHAPE", "assumptions");
    }
    if (!Object.hasOwn(assumption, "value") || !Object.hasOwn(assumption, "unit")) {
      throw new ContractError("OUTPUT_SHAPE", "assumptions");
    }
    const valueOk = assumption.value === null || typeof assumption.value === "string";
    const unitOk = assumption.unit === null || typeof assumption.unit === "string";
    if (!valueOk || !unitOk) {
      throw new ContractError("OUTPUT_SHAPE", "assumptions");
    }
  }
  if (output.verdict !== "通过" && output.verdict !== "保留") {
    throw new ContractError("OUTPUT_SHAPE", "verdict");
  }
};

const validateSynthesis = (output: Record<string, unknown>): void => {
  if (
    output.conclusion !== "建议推进" &&
    output.conclusion !== "先补证据" &&
    output.conclusion !== "不建议"
  ) {
    throw new ContractError("OUTPUT_SHAPE", "conclusion");
  }
  const revisionTasks = output.revisionTasks;
  if (!Array.isArray(revisionTasks)) {
    throw new ContractError("OUTPUT_SHAPE", "revisionTasks");
  }
  for (const task of revisionTasks) {
    if (!isRecord(task) || !nonEmptyString(task.text) || !nonEmptyString(task.sourceCardId)) {
      throw new ContractError("OUTPUT_SHAPE", "revisionTasks");
    }
  }
  const likelyQuestions = output.likelyQuestions;
  if (!Array.isArray(likelyQuestions) || likelyQuestions.length !== 5) {
    throw new ContractError("QUESTION_COUNT", "likelyQuestions");
  }
  const citedCardIds = output.citedCardIds;
  if (!isStringArray(citedCardIds) || citedCardIds.length === 0) {
    throw new ContractError("OUTPUT_SHAPE", "citedCardIds");
  }
};

const validateShape = (roleId: RoleId, output: Record<string, unknown>): void => {
  if (roleId === "investor") {
    validateInvestor(output);
    return;
  }
  if (roleId === "target_user") {
    validateTargetUser(output);
    return;
  }
  if (roleId === "competitor") {
    validateCompetitor(output);
    return;
  }
  if (roleId === "finance") {
    validateFinance(output);
    return;
  }
  if (roleId === "synthesis") {
    validateSynthesis(output);
  }
};

// 按对象、越界键、必填键、角色形状的顺序校验输出
export const validateRoleOutput = (roleId: string, output: unknown): void => {
  if (!isRecord(output)) {
    throw new ContractError("OUTPUT_NOT_OBJECT", roleId);
  }
  const role = getRole(roleId);
  for (const key of role.forbiddenOutputs) {
    if (Object.hasOwn(output, key)) {
      throw new ContractError("ROLE_BOUNDARY", key);
    }
  }
  for (const key of role.requiredOutputs) {
    if (!Object.hasOwn(output, key)) {
      throw new ContractError("MISSING_KEY", key);
    }
  }
  validateShape(role.id, output);
};

// 没有单位经济时，财务结论只能保留并列出缺失数字
export const assertFinanceVerdict = (founder: FounderInput, output: unknown): void => {
  if (hasUnitEconomics(founder)) {
    return;
  }
  const verdict = isRecord(output) ? output.verdict : undefined;
  const missingNumbers = isRecord(output) ? output.missingNumbers : undefined;
  const listed = Array.isArray(missingNumbers) && missingNumbers.length > 0;
  if (verdict !== "保留" || !listed) {
    throw new ContractError("FINANCE_HOLD_REQUIRED", "verdict");
  }
};
