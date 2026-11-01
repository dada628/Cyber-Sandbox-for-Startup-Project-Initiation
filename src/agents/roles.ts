import { ContractError, type FounderInput, type RoleId } from "../agents/types";

interface RoleDefinition {
  id: RoleId;
  name: string;
  duty: string;
  forbidden: string;
  readableFields: readonly (keyof FounderInput)[];
  requiredOutputs: readonly string[];
  forbiddenOutputs: readonly string[];
}

interface WorkItemDefinition {
  id: string;
  title: string;
  roleId: RoleId;
  dependsOn: readonly string[];
}

const founderFields = [
  "projectName",
  "oneLiner",
  "targetUser",
  "solution",
  "businessModel",
  "excerpt",
] as const satisfies readonly (keyof FounderInput)[];

// 角色身份、可读字段和输出边界，顺序固定
export const ROLES = [
  {
    id: "orchestrator",
    name: "编排官",
    duty: "拆任务、派卡片、收口",
    forbidden: "替任何角色做专业判断",
    readableFields: founderFields,
    requiredOutputs: ["workflow"],
    forbiddenOutputs: ["verdict", "conclusion", "估值"],
  },
  {
    id: "investor",
    name: "投资人",
    duty: "市场是否成立、为什么现在做、凭什么赢",
    forbidden: "改文案润色",
    readableFields: ["oneLiner", "solution", "businessModel", "excerpt"],
    requiredOutputs: ["questions", "evidenceRequests", "verdict", "rationale"],
    forbiddenOutputs: ["polishedCopy", "rewrittenExcerpt"],
  },
  {
    id: "target_user",
    name: "目标用户",
    duty: "是否真的痛、是否愿意改习惯",
    forbidden: "谈估值",
    readableFields: ["targetUser", "solution", "excerpt"],
    requiredOutputs: ["scenario", "painReal", "habitChange", "counterexample", "evidenceRequests"],
    forbiddenOutputs: ["估值", "valuation"],
  },
  {
    id: "competitor",
    name: "竞品分析",
    duty: "替代方案和差异是否站得住",
    forbidden: "编造未给出来源的数据",
    readableFields: ["oneLiner", "solution", "excerpt"],
    requiredOutputs: ["alternatives", "differentiationHolds", "evidenceRequests"],
    forbiddenOutputs: ["inventedMetric"],
  },
  {
    id: "finance",
    name: "财务质询",
    duty: "单位经济、成本、现金流假设",
    forbidden: "输出法律结论",
    readableFields: ["businessModel", "excerpt"],
    requiredOutputs: ["assumptions", "missingNumbers", "verdict", "evidenceRequests"],
    forbiddenOutputs: ["legalConclusion", "合规结论"],
  },
  {
    id: "synthesis",
    name: "综合席",
    duty: "只汇总已确认卡片",
    forbidden: "新增事实",
    readableFields: founderFields,
    requiredOutputs: ["conclusion", "revisionTasks", "likelyQuestions", "citedCardIds"],
    forbiddenOutputs: ["newFact"],
  },
] as const satisfies readonly RoleDefinition[];

// 看板工作项及其依赖，顺序固定
export const WORK_ITEMS = [
  {
    id: "card_problem",
    title: "问题定义",
    roleId: "investor",
    dependsOn: [],
  },
  {
    id: "card_user",
    title: "用户",
    roleId: "target_user",
    dependsOn: [],
  },
  {
    id: "card_competitor",
    title: "竞品",
    roleId: "competitor",
    dependsOn: [],
  },
  {
    id: "card_unit_economics",
    title: "单位经济",
    roleId: "finance",
    dependsOn: [],
  },
  {
    id: "card_risk",
    title: "风险",
    roleId: "investor",
    dependsOn: ["card_problem"],
  },
  {
    id: "card_defense",
    title: "答辩口径",
    roleId: "synthesis",
    dependsOn: [
      "card_problem",
      "card_user",
      "card_competitor",
      "card_unit_economics",
      "card_risk",
    ],
  },
] as const satisfies readonly WorkItemDefinition[];

// 按角色编号读取契约，未知角色抛出 UNKNOWN_ROLE
export const getRole = (roleId: string): RoleDefinition => {
  const found = ROLES.find((role) => role.id === roleId);
  if (!found) {
    throw new ContractError("UNKNOWN_ROLE", roleId);
  }
  return found;
};
