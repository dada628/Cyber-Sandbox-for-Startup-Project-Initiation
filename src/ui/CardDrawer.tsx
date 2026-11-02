import { useState } from "react";
import { getRole } from "../agents/roles";
import type { BoardEvent, Card } from "../board/types";

interface CardDrawerProps {
  card: Card;
  modelRaw: string | null;
  onClose: () => void;
  onDispatch: (event: BoardEvent) => void;
}

const formatOutput = (output: string): string => {
  try {
    return JSON.stringify(JSON.parse(output), null, 2);
  } catch {
    return output;
  }
};

const filled = (value: string | null): string => {
  if (value && value.trim() !== "") {
    return value;
  }
  return "无";
};

// 回读当前卡片，并在待你确认时派发通过、驳回或改事实
export const CardDrawer = ({ card, modelRaw, onClose, onDispatch }: CardDrawerProps) => {
  const [reason, setReason] = useState("");
  const [fact, setFact] = useState("");
  const awaiting = card.columnId === "awaiting_human";
  const canConfirm = awaiting && card.status === "ready";
  const reject = (): void => {
    if (reason.trim() === "") {
      return;
    }
    onDispatch({ type: "REJECT", cardId: card.id, reason });
  };
  const revise = (): void => {
    if (fact.trim() === "") {
      return;
    }
    onDispatch({ type: "REVISE_FACT", cardId: card.id, fact });
  };
  return (
    <aside className="drawer" data-drawer={card.id}>
      <div className="drawer-head">
        <h2>{card.title}</h2>
        <button type="button" onClick={onClose}>
          关闭
        </button>
      </div>
      <p>输入摘要：{card.inputSummary}</p>
      <p>负责角色：{getRole(card.roleId).name}</p>
      <p>阻塞原因：{filled(card.blockReason)}</p>
      <div className="drawer-output">
        <p>产出：{card.output === null ? "尚无产出" : ""}</p>
        {card.output === null ? null : <pre>{formatOutput(card.output)}</pre>}
      </div>
      <div className="drawer-output">
        <p>模型原文：{modelRaw === null ? "无" : ""}</p>
        {modelRaw === null ? null : <pre>{modelRaw}</pre>}
      </div>
      <p>修订事实：{filled(card.revisionFact)}</p>
      {awaiting ? (
        <div className="drawer-actions">
          {canConfirm ? (
            <button type="button" onClick={() => onDispatch({ type: "CONFIRM", cardId: card.id })}>
              通过
            </button>
          ) : null}
          <label className="drawer-field" htmlFor={`reject-${card.id}`}>
            理由
            <input
              id={`reject-${card.id}`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <button type="button" disabled={reason.trim() === ""} onClick={reject}>
            驳回
          </button>
          <label className="drawer-field" htmlFor={`fact-${card.id}`}>
            事实
            <input id={`fact-${card.id}`} value={fact} onChange={(event) => setFact(event.target.value)} />
          </label>
          <button type="button" disabled={fact.trim() === ""} onClick={revise}>
            改一句事实后重跑
          </button>
        </div>
      ) : null}
    </aside>
  );
};
