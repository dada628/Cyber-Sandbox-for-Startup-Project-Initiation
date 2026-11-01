import { getRole } from "../agents/roles";
import { ContractError, type FounderInput } from "../agents/types";
import { validateRoleOutput } from "../agents/validate-output";
import type { Card } from "../board/types";

const concludedCards = (cards: readonly Card[]): Card[] => {
  return cards.filter((card) => card.columnId === "concluded");
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

// 按角色裁剪立项，只有综合席能看见已入结论的卡
export const visibleContext = (
  roleId: string,
  founder: FounderInput,
  cards: readonly Card[],
): { founder: Partial<FounderInput>; confirmedCards: readonly Card[] } => {
  const role = getRole(roleId);
  const visibleFounder: Partial<FounderInput> = {};
  for (const field of role.readableFields) {
    visibleFounder[field] = founder[field];
  }
  const confirmedCards = role.id === "synthesis" ? concludedCards(cards) : [];
  return { founder: visibleFounder, confirmedCards };
};

// 综合席的引用和修订任务只能指向已入结论的卡
export const assertSynthesisGrounded = (output: unknown, cards: readonly Card[]): void => {
  validateRoleOutput("synthesis", output);
  if (!isRecord(output)) {
    throw new ContractError("OUTPUT_NOT_OBJECT", "synthesis");
  }
  const allowed = new Set(concludedCards(cards).map((card) => card.id));
  const citedCardIds = output.citedCardIds;
  if (!Array.isArray(citedCardIds)) {
    throw new ContractError("UNCONFIRMED_CARD", "citedCardIds");
  }
  for (const cardId of citedCardIds) {
    if (typeof cardId !== "string" || !allowed.has(cardId)) {
      throw new ContractError("UNCONFIRMED_CARD", typeof cardId === "string" ? cardId : "citedCardIds");
    }
  }
  const revisionTasks = output.revisionTasks;
  if (!Array.isArray(revisionTasks)) {
    throw new ContractError("UNCONFIRMED_CARD", "revisionTasks");
  }
  for (const task of revisionTasks) {
    const sourceCardId = isRecord(task) ? task.sourceCardId : undefined;
    if (typeof sourceCardId !== "string" || !allowed.has(sourceCardId)) {
      throw new ContractError(
        "UNCONFIRMED_CARD",
        typeof sourceCardId === "string" ? sourceCardId : "sourceCardId",
      );
    }
  }
};
