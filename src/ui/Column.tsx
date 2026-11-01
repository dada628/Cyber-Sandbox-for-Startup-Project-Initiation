import type { Card, ColumnId } from "../board/types";
import { CardView } from "./CardView";

interface ColumnProps {
  columnId: ColumnId;
  label: string;
  cards: readonly Card[];
}

// 一列质询卡，空列仍占位
export const Column = ({ columnId, label, cards }: ColumnProps) => {
  return (
    <section className="column" data-column={columnId}>
      <h2>
        {label} <span className="column-count">{cards.length}</span>
      </h2>
      {cards.length === 0 ? (
        <p className="column-empty">这一列还没有卡片</p>
      ) : (
        <div className="column-cards">
          {cards.map((card) => (
            <CardView key={card.id} card={card} />
          ))}
        </div>
      )}
    </section>
  );
};
