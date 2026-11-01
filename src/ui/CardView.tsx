import type { MouseEvent } from "react";
import { getRole } from "../agents/roles";
import { statusLabel, type BoardEvent, type Card } from "../board/types";

interface CardViewProps {
  card: Card;
  onDispatch: (event: BoardEvent) => void;
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
export const CardView = ({ card, onDispatch }: CardViewProps) => {
  const action = cardAction(card);
  const dispatchAction = (click: MouseEvent<HTMLButtonElement>): void => {
    click.stopPropagation();
    if (!action) {
      return;
    }
    onDispatch(action.event);
  };
  return (
    <article className="card" data-card-id={card.id}>
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
