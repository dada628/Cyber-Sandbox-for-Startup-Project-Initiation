import type { Card } from "../board/types";

const investorFocus = "市场是否成立；为什么现在做；凭什么赢" as const;

export interface InvestorAssignment {
  roleId: "investor";
  cardId: string;
  title: string;
  focus: typeof investorFocus;
}

// 只给投资人的问题定义和风险派质询任务，不写结论
export const assignmentFor = (card: Card): InvestorAssignment | null => {
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
