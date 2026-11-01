import { getRole } from "../agents/roles";
import { statusLabel, type Card } from "../board/types";

interface CardViewProps {
  card: Card;
}

// 卡片只展示标题、角色和状态
export const CardView = ({ card }: CardViewProps) => {
  return (
    <article className="card" data-card-id={card.id}>
      <h3>{card.title}</h3>
      <p>{getRole(card.roleId).name}</p>
      <p>{statusLabel(card.status)}</p>
    </article>
  );
};
