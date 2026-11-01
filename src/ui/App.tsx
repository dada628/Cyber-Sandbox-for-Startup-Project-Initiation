import { Board } from "./Board";
import { useBoard } from "./useBoard";

// 沙盘顶栏和四列看板
export const App = () => {
  const { cards, founder, loadSample } = useBoard();
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
        <Board cards={cards} />
      </main>
    </div>
  );
};
