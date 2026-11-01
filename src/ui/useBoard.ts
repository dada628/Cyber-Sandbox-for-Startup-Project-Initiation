import { useState } from "react";
import sampleProposal from "../../fixtures/sample-proposal.json";
import type { FounderInput } from "../agents/types";
import { buildInitialCards, type Card } from "../board/types";

const sampleFounder: FounderInput = sampleProposal;

// 看板卡片；样例立项每次整表替换
export const useBoard = (): {
  cards: readonly Card[];
  founder: FounderInput | null;
  loadSample: () => void;
} => {
  const [cards, setCards] = useState<readonly Card[]>([]);
  const [founder, setFounder] = useState<FounderInput | null>(null);
  const loadSample = (): void => {
    setFounder(sampleFounder);
    setCards(buildInitialCards(sampleFounder));
  };
  return { cards, founder, loadSample };
};
