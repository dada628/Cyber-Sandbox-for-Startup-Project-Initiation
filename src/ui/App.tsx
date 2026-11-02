import { useEffect, useState } from "react";
import { modeBadge, type ModelMode } from "../model/mode";
import { Board } from "./Board";
import { CardDrawer } from "./CardDrawer";
import { useBoard } from "./useBoard";

const isModelMode = (value: unknown): value is ModelMode => {
  return value === "replay" || value === "live";
};

// 沙盘顶栏和四列看板
export const App = () => {
  const { cards, founder, errorCode, loadSample, dispatch } = useBoard();
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [mode, setMode] = useState<ModelMode>("replay");
  const openCard = cards.find((card) => card.id === openCardId) ?? null;
  useEffect(() => {
    let active = true;
    const loadMode = async (): Promise<void> => {
      const response = await fetch("/api/model-mode");
      const payload: unknown = await response.json();
      const next =
        typeof payload === "object" && payload !== null && "mode" in payload && isModelMode(payload.mode)
          ? payload.mode
          : "replay";
      if (active) {
        setMode(next);
      }
    };
    void loadMode();
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="mode-badge" data-mode={mode}>
            {modeBadge(mode)}
          </p>
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
        {openCard ? (
          <CardDrawer card={openCard} onClose={() => setOpenCardId(null)} onDispatch={dispatch} />
        ) : null}
      </main>
    </div>
  );
};
