import type { KeyboardEvent, MouseEvent } from "react";
import { getRole } from "../agents/roles";
import { statusLabel, type BoardEvent, type Card } from "../board/types";

interface CardViewProps {
  card: Card;
  selected: boolean;
  onDispatch: (event: BoardEvent) => void;
  onOpen: (cardId: string) => void;
}

const manualOutput = JSON.stringify({ note: "手工占位" });

const cardAction = (card: Card): { label: string; event: BoardEvent } | null => {
  if (card.columnId === "backlog" && card.status === "idle") {
    return { label: "开始质询", event: { type: "START_REVIEW", cardId: card.id } };
  }
  if (card.columnId === "in_review" && card.status === "running") {
    return {
      label: "提交占位产出",
      event: { type: "SUBMIT_OUTPUT", cardId: card.id, valid: true, output: manualOutput },
    };
  }
  if (card.columnId === "awaiting_human" && card.status === "ready") {
    return { label: "通过", event: { type: "CONFIRM", cardId: card.id } };
  }
  return null;
};

// 卡片展示标题、角色、状态，并按当前状态派发一步
export const CardView = ({ card, selected, onDispatch, onOpen }: CardViewProps) => {
  const action = cardAction(card);
  const dispatchAction = (click: MouseEvent<HTMLButtonElement>): void => {
    click.stopPropagation();
    if (!action) {
      return;
    }
    onDispatch(action.event);
  };
  const openCard = (click: MouseEvent<HTMLElement>): void => {
    if (click.target instanceof Element && click.target.closest("button")) {
      return;
    }
    onOpen(card.id);
  };
  const openFromKeyboard = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    onOpen(card.id);
  };
  return (
    <article
      className={selected ? "card card-selected" : "card"}
      data-card-id={card.id}
      data-selected={selected ? "true" : "false"}
      tabIndex={0}
      onClick={openCard}
      onKeyDown={openFromKeyboard}
    >
      <h3>{card.title}</h3>
      <p>{getRole(card.roleId).name}</p>
      <p>{statusLabel(card.status)}</p>
      {action ? (
        <button type="button" onClick={dispatchAction}>
          {action.label}
        </button>
      ) : null}
    </article>
  );
};
