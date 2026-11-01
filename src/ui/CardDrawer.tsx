import { getRole } from "../agents/roles";
import type { Card } from "../board/types";

interface CardDrawerProps {
  card: Card;
  onClose: () => void;
}

const formatOutput = (output: string): string => {
  try {
    return JSON.stringify(JSON.parse(output), null, 2);
  } catch {
    return output;
  }
};

// 按当前卡片回读摘要、角色、阻塞和产出
export const CardDrawer = ({ card, onClose }: CardDrawerProps) => {
  const blockReason = card.blockReason && card.blockReason.trim() !== "" ? card.blockReason : "无";
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
      <p>阻塞原因：{blockReason}</p>
      <div className="drawer-output">
        <p>产出：{card.output === null ? "尚无产出" : ""}</p>
        {card.output === null ? null : <pre>{formatOutput(card.output)}</pre>}
      </div>
    </aside>
  );
};
