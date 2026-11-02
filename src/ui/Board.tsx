import { COLUMNS, type BoardEvent, type Card } from "../board/types";
import { Column } from "./Column";

interface BoardProps {
  cards: readonly Card[];
  openCardId: string | null;
  runningCardId: string | null;
  onDispatch: (event: BoardEvent) => void;
  onOpenCard: (cardId: string) => void;
  onRunInvestor: (cardId: string) => void;
}

// 四列从左到右：待拆解、质询中、待你确认、已入结论
export const Board = ({ cards, openCardId, runningCardId, onDispatch, onOpenCard, onRunInvestor }: BoardProps) => {
  return (
    <div className="board">
      {COLUMNS.map((column) => (
        <Column
          key={column.id}
          columnId={column.id}
          label={column.label}
          cards={cards.filter((card) => card.columnId === column.id)}
          openCardId={openCardId}
          runningCardId={runningCardId}
          onDispatch={onDispatch}
          onOpenCard={onOpenCard}
          onRunInvestor={onRunInvestor}
        />
      ))}
    </div>
  );
};
