import { COLUMNS, type Card } from "../board/types";
import { Column } from "./Column";

interface BoardProps {
  cards: readonly Card[];
}

// 四列从左到右：待拆解、质询中、待你确认、已入结论
export const Board = ({ cards }: BoardProps) => {
  return (
    <div className="board">
      {COLUMNS.map((column) => (
        <Column
          key={column.id}
          columnId={column.id}
          label={column.label}
          cards={cards.filter((card) => card.columnId === column.id)}
        />
      ))}
    </div>
  );
};
