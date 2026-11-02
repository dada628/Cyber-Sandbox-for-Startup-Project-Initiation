import type { KeyboardEvent, MouseEvent } from "react";
import { getRole } from "../agents/roles";
import { statusLabel, type BoardEvent, type Card } from "../board/types";

interface CardViewProps {
  card: Card;
  selected: boolean;
  runPending: boolean;
  replay: boolean;
  onDispatch: (event: BoardEvent) => void;
  onOpen: (cardId: string) => void;
  onRunInvestor: (cardId: string, forceInvalid: boolean) => void;
}

const manualOutput = JSON.stringify({ note: "手工占位" });
const invalidOutputReason = "输出不是合法 JSON";

const blockText = (value: string | null): string => {
  if (value && value.trim() !== "") {
    return value;
  }
  return "无";
};

const cardActions = (card: Card): { label: string; event: BoardEvent }[] => {
  const canStart =
    (card.columnId === "backlog" && card.status === "idle") ||
    (card.columnId === "in_review" && card.status === "blocked");
  if (canStart) {
    return [{ label: "开始质询", event: { type: "START_REVIEW", cardId: card.id } }];
  }
  if (card.columnId === "in_review" && card.status === "running" && card.roleId !== "investor") {
    return [
      {
        label: "提交占位产出",
        event: { type: "SUBMIT_OUTPUT", cardId: card.id, valid: true, output: manualOutput },
      },
      {
        label: "提交失败",
        event: { type: "SUBMIT_OUTPUT", cardId: card.id, valid: false, failureReason: invalidOutputReason },
      },
    ];
  }
  if (card.columnId === "in_review" && card.status === "failed") {
    return [{ label: "重试", event: { type: "RETRY", cardId: card.id } }];
  }
  return [];
};

// 卡片展示标题、角色、状态和阻塞原因，并按当前状态派发一步
export const CardView = ({ card, selected, runPending, replay, onDispatch, onOpen, onRunInvestor }: CardViewProps) => {
  const investorRunning = card.roleId === "investor" && card.columnId === "in_review" && card.status === "running";
  const actions = cardActions(card);
  const dispatchAction = (event: BoardEvent) => (click: MouseEvent<HTMLButtonElement>): void => {
    click.stopPropagation();
    onDispatch(event);
  };
  const runInvestor = (click: MouseEvent<HTMLButtonElement>): void => {
    click.stopPropagation();
    if (runPending) {
      return;
    }
    onOpen(card.id);
    onRunInvestor(card.id, false);
  };
  const replayInvalid = (click: MouseEvent<HTMLButtonElement>): void => {
    click.stopPropagation();
    if (runPending) {
      return;
    }
    onOpen(card.id);
    onRunInvestor(card.id, true);
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
      <p>阻塞原因：{blockText(card.blockReason)}</p>
      {investorRunning ? (
        <button type="button" disabled={runPending} onClick={runInvestor}>
          运行投资人
        </button>
      ) : null}
      {investorRunning && replay ? (
        <button type="button" disabled={runPending} onClick={replayInvalid}>
          回放格式失败
        </button>
      ) : null}
      {actions.map((action) => (
        <button key={action.label} type="button" onClick={dispatchAction(action.event)}>
          {action.label}
        </button>
      ))}
    </article>
  );
};
