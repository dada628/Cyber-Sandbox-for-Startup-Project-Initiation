import { WORK_ITEMS } from "../agents/roles";
import { ContractError, type FounderInput, type RoleId } from "../agents/types";

const SUMMARY_LIMIT = 80;

// 四列看板，从左到右
export const COLUMNS = [
  { id: "backlog", label: "待拆解" },
  { id: "in_review", label: "质询中" },
  { id: "awaiting_human", label: "待你确认" },
  { id: "concluded", label: "已入结论" },
] as const;

// 卡片运行状态
export const STATUSES = [
  { id: "idle", label: "空闲" },
  { id: "running", label: "进行中" },
  { id: "failed", label: "失败" },
  { id: "blocked", label: "阻塞" },
  { id: "ready", label: "可确认" },
] as const;

// 看板列编号
export type ColumnId = (typeof COLUMNS)[number]["id"];

// 卡片状态编号
export type CardStatus = (typeof STATUSES)[number]["id"];

// 列编号对应的中文列名，未知列抛出 UNKNOWN_COLUMN
export const columnLabel = (columnId: string): string => {
  const found = COLUMNS.find((column) => column.id === columnId);
  if (!found) {
    throw new ContractError("UNKNOWN_COLUMN", columnId);
  }
  return found.label;
};

// 状态编号对应的中文状态，未知状态抛出 UNKNOWN_STATUS
export const statusLabel = (status: string): string => {
  const found = STATUSES.find((item) => item.id === status);
  if (!found) {
    throw new ContractError("UNKNOWN_STATUS", status);
  }
  return found.label;
};

// 看板上的一张质询卡
export interface Card {
  id: string;
  columnId: ColumnId;
  roleId: RoleId;
  title: string;
  inputSummary: string;
  status: CardStatus;
  blockReason: string | null;
  output: string | null;
  revisionFact: string | null;
  confirmedByHuman: boolean;
  dependsOn: string[];
  sourceCardIds: string[];
}

// 看板状态机只接受这七种事件
export type BoardEvent =
  | {
      readonly type: "CREATE";
      readonly card: Card;
    }
  | {
      readonly type: "START_REVIEW";
      readonly cardId: string;
    }
  | {
      readonly type: "SUBMIT_OUTPUT";
      readonly cardId: string;
      readonly valid: boolean;
      readonly output?: string;
      readonly failureReason?: string;
    }
  | {
      readonly type: "CONFIRM";
      readonly cardId: string;
    }
  | {
      readonly type: "REJECT";
      readonly cardId: string;
      readonly reason: string;
    }
  | {
      readonly type: "REVISE_FACT";
      readonly cardId: string;
      readonly fact: string;
    }
  | {
      readonly type: "RETRY";
      readonly cardId: string;
    };

const clipSummary = (summary: string): string => {
  if (summary.length <= SUMMARY_LIMIT) {
    return summary;
  }
  return summary.slice(0, SUMMARY_LIMIT);
};

const inputSummaryFor = (cardId: string, founder: FounderInput): string => {
  if (cardId === "card_problem") {
    return clipSummary(`定位：${founder.oneLiner}`);
  }
  if (cardId === "card_user") {
    return clipSummary(`用户：${founder.targetUser}`);
  }
  if (cardId === "card_competitor") {
    return clipSummary(`方案：${founder.solution}`);
  }
  if (cardId === "card_unit_economics") {
    return clipSummary(`商业模式：${founder.businessModel}`);
  }
  if (cardId === "card_risk") {
    return clipSummary(`摘录：${founder.excerpt}`);
  }
  return "汇总已确认质询";
};

// 按工作项生成六张待拆解、空闲的初始卡片
export const buildInitialCards = (founder: FounderInput): Card[] => {
  return WORK_ITEMS.map((item) => {
    return {
      id: item.id,
      columnId: "backlog",
      roleId: item.roleId,
      title: item.title,
      inputSummary: inputSummaryFor(item.id, founder),
      status: "idle",
      blockReason: null,
      output: null,
      revisionFact: null,
      confirmedByHuman: false,
      dependsOn: [...item.dependsOn],
      sourceCardIds: [],
    };
  });
};

const sameDepends = (left: readonly string[], right: readonly string[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((item, index) => item === right[index]);
};

// 核对卡片身份、角色、标题和依赖是否与工作项一致
export const assertWorkflow = (cards: readonly Card[]): void => {
  if (cards.length !== WORK_ITEMS.length) {
    throw new ContractError("WORKFLOW_SHAPE", "0");
  }
  for (let index = 0; index < WORK_ITEMS.length; index += 1) {
    const item = WORK_ITEMS[index];
    const card = cards[index];
    if (!item || !card) {
      throw new ContractError("WORKFLOW_SHAPE", String(index + 1));
    }
    const aligned =
      card.id === item.id &&
      card.roleId === item.roleId &&
      card.title === item.title &&
      sameDepends(card.dependsOn, item.dependsOn);
    if (!aligned) {
      throw new ContractError("WORKFLOW_SHAPE", String(index + 1));
    }
  }
};
