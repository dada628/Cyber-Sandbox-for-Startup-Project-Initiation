import { ContractError } from "../agents/types";
import { type BoardEvent, type Card } from "./types";

const cloneCard = (card: Card): Card => {
  return {
    ...card,
    dependsOn: [...card.dependsOn],
    sourceCardIds: [...card.sourceCardIds],
  };
};

const findCard = (cards: readonly Card[], cardId: string): Card => {
  const found = cards.find((card) => card.id === cardId);
  if (!found) {
    throw new ContractError("MISSING_CARD", cardId);
  }
  return found;
};

const replaceCard = (cards: readonly Card[], next: Card): Card[] => {
  return cards.map((card) => (card.id === next.id ? next : card));
};

const dependenciesSettled = (cards: readonly Card[], card: Card): boolean => {
  return card.dependsOn.every((dependencyId) => {
    const dependency = cards.find((item) => item.id === dependencyId);
    return dependency?.columnId === "concluded";
  });
};

const createCard = (cards: readonly Card[], card: Card): Card[] => {
  if (cards.some((item) => item.id === card.id)) {
    throw new ContractError("DUPLICATE_CARD", card.id);
  }
  if (card.columnId !== "backlog" || card.status !== "idle") {
    throw new ContractError("CREATE_NOT_ALLOWED", card.id);
  }
  return [...cards, cloneCard(card)];
};

const startReview = (cards: readonly Card[], cardId: string): Card[] => {
  const current = findCard(cards, cardId);
  const fromBacklog = current.columnId === "backlog";
  const fromBlockedReview = current.columnId === "in_review" && current.status === "blocked";
  if (!fromBacklog && !fromBlockedReview) {
    throw new ContractError("START_NOT_ALLOWED", cardId);
  }
  if (!dependenciesSettled(cards, current)) {
    throw new ContractError("UNRESOLVED_DEPENDENCY", cardId);
  }
  return replaceCard(cards, {
    ...cloneCard(current),
    columnId: "in_review",
    status: "running",
    blockReason: null,
    output: null,
  });
};

const submitOutput = (
  cards: readonly Card[],
  cardId: string,
  valid: boolean,
  output: string | undefined,
  failureReason: string | undefined,
): Card[] => {
  const current = findCard(cards, cardId);
  if (current.columnId !== "in_review" || current.status !== "running") {
    throw new ContractError("SUBMIT_NOT_ALLOWED", cardId);
  }
  if (!valid) {
    return replaceCard(cards, {
      ...cloneCard(current),
      columnId: "in_review",
      status: "failed",
      blockReason: failureReason ?? "OUTPUT_NOT_JSON",
      output: null,
    });
  }
  return replaceCard(cards, {
    ...cloneCard(current),
    columnId: "awaiting_human",
    status: "ready",
    blockReason: null,
    output: output ?? null,
  });
};

const confirmCard = (cards: readonly Card[], cardId: string): Card[] => {
  const current = findCard(cards, cardId);
  if (current.columnId !== "awaiting_human" || current.status !== "ready") {
    throw new ContractError("CONFIRM_NOT_ALLOWED", cardId);
  }
  return replaceCard(cards, {
    ...cloneCard(current),
    columnId: "concluded",
    status: "idle",
    confirmedByHuman: true,
  });
};

const rejectCard = (cards: readonly Card[], cardId: string, reason: string): Card[] => {
  const current = findCard(cards, cardId);
  if (current.columnId !== "awaiting_human") {
    throw new ContractError("REJECT_NOT_ALLOWED", cardId);
  }
  return replaceCard(cards, {
    ...cloneCard(current),
    columnId: "in_review",
    status: "blocked",
    blockReason: reason,
  });
};

const reviseFact = (cards: readonly Card[], cardId: string, fact: string): Card[] => {
  const current = findCard(cards, cardId);
  if (current.columnId !== "awaiting_human") {
    throw new ContractError("REVISE_NOT_ALLOWED", cardId);
  }
  const revisionFact = fact.trim();
  if (revisionFact.length === 0) {
    throw new ContractError("EMPTY_FACT", cardId);
  }
  return replaceCard(cards, {
    ...cloneCard(current),
    columnId: "in_review",
    status: "running",
    revisionFact,
    output: null,
    blockReason: null,
  });
};

const retryCard = (cards: readonly Card[], cardId: string): Card[] => {
  const current = findCard(cards, cardId);
  if (current.columnId !== "in_review" || current.status !== "failed") {
    throw new ContractError("RETRY_NOT_ALLOWED", cardId);
  }
  return replaceCard(cards, {
    ...cloneCard(current),
    status: "running",
    blockReason: null,
    output: null,
  });
};

// 按事件推进看板，返回新数组且不修改入参
export const reduceBoard = (cards: readonly Card[], event: BoardEvent): Card[] => {
  if (event.type === "CREATE") {
    return createCard(cards, event.card);
  }
  if (event.type === "START_REVIEW") {
    return startReview(cards, event.cardId);
  }
  if (event.type === "SUBMIT_OUTPUT") {
    return submitOutput(cards, event.cardId, event.valid, event.output, event.failureReason);
  }
  if (event.type === "CONFIRM") {
    return confirmCard(cards, event.cardId);
  }
  if (event.type === "REJECT") {
    return rejectCard(cards, event.cardId, event.reason);
  }
  if (event.type === "REVISE_FACT") {
    return reviseFact(cards, event.cardId, event.fact);
  }
  return retryCard(cards, event.cardId);
};
