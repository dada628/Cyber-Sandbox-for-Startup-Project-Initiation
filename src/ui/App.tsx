import { useState } from "react";
import { Board } from "./Board";
import { CardDrawer } from "./CardDrawer";
import { useBoard } from "./useBoard";

// 沙盘顶栏和四列看板
export const App = () => {
  const { cards, founder, errorCode, loadSample, dispatch } = useBoard();
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const openCard = cards.find((card) => card.id === openCardId) ?? null;
  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="product">创业立项赛博沙盘</p>
          {founder ? (
            <>
              <h1>{founder.projectName}</h1>
              <p className="oneliner">{founder.oneLiner}</p>
            </>
          ) : (
            <h1>尚未灌入立项</h1>
          )}
        </div>
        <button type="button" onClick={loadSample}>
          灌入样例立项
        </button>
      </header>
      <main>
        {errorCode ? (
          <p className="board-error" data-error={errorCode}>
            {errorCode}
          </p>
        ) : null}
        <Board
          cards={cards}
          openCardId={openCardId}
          onDispatch={dispatch}
          onOpenCard={setOpenCardId}
        />
        {openCard ? <CardDrawer card={openCard} onClose={() => setOpenCardId(null)} /> : null}
      </main>
    </div>
  );
};
