import { useState } from "react";
import sampleProposal from "../../fixtures/sample-proposal.json";
import { ContractError, type FounderInput } from "../agents/types";
import { reduceBoard } from "../board/state-machine";
import { buildInitialCards, type BoardEvent, type Card } from "../board/types";

const sampleFounder: FounderInput = sampleProposal;

// 看板卡片；样例立项每次整表替换，推进只经过状态机
export const useBoard = (): {
  cards: readonly Card[];
  founder: FounderInput | null;
  errorCode: string | null;
  loadSample: () => void;
  dispatch: (event: BoardEvent) => void;
} => {
  const [cards, setCards] = useState<readonly Card[]>([]);
  const [founder, setFounder] = useState<FounderInput | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const loadSample = (): void => {
    setFounder(sampleFounder);
    setCards(buildInitialCards(sampleFounder));
    setErrorCode(null);
  };
  const dispatch = (event: BoardEvent): void => {
    try {
      const next = reduceBoard(cards, event);
      setCards(next);
      setErrorCode(null);
    } catch (caught) {
      if (caught instanceof ContractError) {
        setErrorCode(caught.code);
        return;
      }
      throw caught;
    }
  };
  return { cards, founder, errorCode, loadSample, dispatch };
};
