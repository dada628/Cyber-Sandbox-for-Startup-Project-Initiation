import type { Card } from "../board/types";

const investorFocus = "市场是否成立；为什么现在做；凭什么赢" as const;
const financeFocus = "单位经济、成本、现金流假设。没有价格、费率、客单或成本数字时不得给出通过" as const;
const userFocus = "痛是否真实，是否愿意改变现有习惯。不谈估值" as const;

export interface InvestorAssignment {
  roleId: "investor";
  cardId: string;
  title: string;
  focus: typeof investorFocus;
}

export interface FinanceAssignment {
  roleId: "finance";
  cardId: string;
  title: string;
  focus: typeof financeFocus;
}

export interface TargetUserAssignment {
  roleId: "target_user";
  cardId: string;
  title: string;
  focus: typeof userFocus;
}

export type RoleAssignment = InvestorAssignment | FinanceAssignment | TargetUserAssignment;

// 只派质询任务，投资人、财务和目标用户都不写结论
export const assignmentFor = (card: Card): RoleAssignment | null => {
  if (card.roleId === "finance") {
    if (card.id !== "card_unit_economics") {
      return null;
    }
    return {
      roleId: "finance",
      cardId: card.id,
      title: card.title,
      focus: financeFocus,
    };
  }
  if (card.roleId === "target_user") {
    if (card.id !== "card_user") {
      return null;
    }
    return {
      roleId: "target_user",
      cardId: card.id,
      title: card.title,
      focus: userFocus,
    };
  }
  if (card.roleId !== "investor") {
    return null;
  }
  if (card.id !== "card_problem" && card.id !== "card_risk") {
    return null;
  }
  return {
    roleId: "investor",
    cardId: card.id,
    title: card.title,
    focus: investorFocus,
  };
};
