import { useEffect, useRef, useState } from "react";
import type { BoardEvent } from "../board/types";
import { modeBadge, type ModelMode } from "../model/mode";
import { acceptCompetitorRaw } from "../orchestrator/accept-competitor";
import { acceptFinanceRaw } from "../orchestrator/accept-finance";
import { acceptInvestorRaw } from "../orchestrator/accept-investor";
import { acceptUserRaw } from "../orchestrator/accept-user";
import { Board } from "./Board";
import { CardDrawer } from "./CardDrawer";
import { useBoard } from "./useBoard";

const isModelMode = (value: unknown): value is ModelMode => {
  return value === "replay" || value === "live";
};

const isRunReply = (payload: unknown): payload is { mode: ModelMode; raw: string } => {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "raw" in payload &&
    typeof payload.raw === "string" &&
    "mode" in payload &&
    isModelMode(payload.mode)
  );
};

const payloadCode = (payload: unknown): string => {
  if (typeof payload === "object" && payload !== null && "code" in payload && typeof payload.code === "string") {
    return payload.code;
  }
  return "";
};

// 沙盘顶栏和四列看板
export const App = () => {
  const { cards, founder, errorCode, loadSample, dispatch: boardDispatch } = useBoard();
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [mode, setMode] = useState<ModelMode>("replay");
  const [modelRaw, setModelRaw] = useState<Readonly<Record<string, string>>>({});
  const [runningCardId, setRunningCardId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const runningRef = useRef(false);
  const openCard = cards.find((card) => card.id === openCardId) ?? null;
  const dispatch = (event: BoardEvent): void => {
    if (event.type === "RETRY") {
      setModelRaw((current) => {
        if (!(event.cardId in current)) {
          return current;
        }
        const next = { ...current };
        delete next[event.cardId];
        return next;
      });
    }
    boardDispatch(event);
  };
  const runInvestor = (cardId: string, forceInvalid: boolean): void => {
    if (runningRef.current) {
      return;
    }
    runningRef.current = true;
    setRunningCardId(cardId);
    setRunError(null);
    const request = async (): Promise<void> => {
      const response = await fetch("/api/run-investor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, forceInvalid }),
      });
      const payload: unknown = await response.json();
      const code = payloadCode(payload);
      if (!response.ok) {
        setRunError(code === "" ? "LIVE_CALL_FAILED" : code);
        return;
      }
      if (!isRunReply(payload)) {
        setRunError("LIVE_CALL_FAILED");
        return;
      }
      const raw = payload.raw;
      setModelRaw((current) => ({ ...current, [cardId]: raw }));
      const accepted = acceptInvestorRaw(raw);
      if (accepted.ok) {
        dispatch({ type: "SUBMIT_OUTPUT", cardId, valid: true, output: JSON.stringify(accepted.value) });
        return;
      }
      dispatch({ type: "SUBMIT_OUTPUT", cardId, valid: false, failureReason: accepted.failureReason });
    };
    void request()
      .catch(() => {
        setRunError("LIVE_CALL_FAILED");
      })
      .finally(() => {
        runningRef.current = false;
        setRunningCardId(null);
      });
  };
  const runFinance = (cardId: string): void => {
    if (runningRef.current) {
      return;
    }
    runningRef.current = true;
    setRunningCardId(cardId);
    setRunError(null);
    const request = async (): Promise<void> => {
      const response = await fetch("/api/run-finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });
      const payload: unknown = await response.json();
      if (!response.ok || !isRunReply(payload)) {
        const code = payloadCode(payload);
        dispatch({
          type: "SUBMIT_OUTPUT",
          cardId,
          valid: false,
          failureReason: code === "LIVE_CALL_FAILED" ? "财务调用失败" : "输出不是合法 JSON",
        });
        return;
      }
      setModelRaw((current) => ({ ...current, [cardId]: payload.raw }));
      const accepted = acceptFinanceRaw(payload.raw);
      if (accepted.ok) {
        dispatch({ type: "SUBMIT_OUTPUT", cardId, valid: true, output: JSON.stringify(accepted.value) });
        return;
      }
      dispatch({ type: "SUBMIT_OUTPUT", cardId, valid: false, failureReason: accepted.failureReason });
    };
    void request()
      .catch(() => {
        dispatch({ type: "SUBMIT_OUTPUT", cardId, valid: false, failureReason: "输出不是合法 JSON" });
      })
      .finally(() => {
        runningRef.current = false;
        setRunningCardId(null);
      });
  };
  const runUser = (cardId: string): void => {
    if (runningRef.current) {
      return;
    }
    runningRef.current = true;
    setRunningCardId(cardId);
    setRunError(null);
    const request = async (): Promise<void> => {
      const response = await fetch("/api/run-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });
      const payload: unknown = await response.json();
      if (!response.ok || !isRunReply(payload)) {
        const code = payloadCode(payload);
        dispatch({
          type: "SUBMIT_OUTPUT",
          cardId,
          valid: false,
          failureReason: code === "LIVE_CALL_FAILED" ? "目标用户调用失败" : "输出不是合法 JSON",
        });
        return;
      }
      setModelRaw((current) => ({ ...current, [cardId]: payload.raw }));
      const accepted = acceptUserRaw(payload.raw);
      if (accepted.ok) {
        dispatch({ type: "SUBMIT_OUTPUT", cardId, valid: true, output: JSON.stringify(accepted.value) });
        return;
      }
      dispatch({ type: "SUBMIT_OUTPUT", cardId, valid: false, failureReason: accepted.failureReason });
    };
    void request()
      .catch(() => {
        dispatch({ type: "SUBMIT_OUTPUT", cardId, valid: false, failureReason: "输出不是合法 JSON" });
      })
      .finally(() => {
        runningRef.current = false;
        setRunningCardId(null);
      });
  };
  const runCompetitor = (cardId: string): void => {
    if (runningRef.current) {
      return;
    }
    runningRef.current = true;
    setRunningCardId(cardId);
    setRunError(null);
    const request = async (): Promise<void> => {
      const response = await fetch("/api/run-competitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });
      const payload: unknown = await response.json();
      if (!response.ok || !isRunReply(payload)) {
        const code = payloadCode(payload);
        dispatch({
          type: "SUBMIT_OUTPUT",
          cardId,
          valid: false,
          failureReason: code === "LIVE_CALL_FAILED" ? "竞品调用失败" : "输出不是合法 JSON",
        });
        return;
      }
      setModelRaw((current) => ({ ...current, [cardId]: payload.raw }));
      const accepted = acceptCompetitorRaw(payload.raw);
      if (accepted.ok) {
        dispatch({ type: "SUBMIT_OUTPUT", cardId, valid: true, output: JSON.stringify(accepted.value) });
        return;
      }
      dispatch({ type: "SUBMIT_OUTPUT", cardId, valid: false, failureReason: accepted.failureReason });
    };
    void request()
      .catch(() => {
        dispatch({ type: "SUBMIT_OUTPUT", cardId, valid: false, failureReason: "输出不是合法 JSON" });
      })
      .finally(() => {
        runningRef.current = false;
        setRunningCardId(null);
      });
  };
  const runSynthesis = (cardId: string): void => {
    if (runningRef.current) {
      return;
    }
    runningRef.current = true;
    setRunningCardId(cardId);
    setRunError(null);
    const board = cards;
    const request = async (): Promise<void> => {
      const response = await fetch("/api/run-synthesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, cards: board }),
      });
      const payload: unknown = await response.json();
      if (!response.ok || !isRunReply(payload)) {
        const code = payloadCode(payload);
        setRunError(code === "" ? "LIVE_CALL_FAILED" : code);
        return;
      }
      setModelRaw((current) => ({ ...current, [cardId]: payload.raw }));
    };
    void request()
      .catch(() => {
        setRunError("LIVE_CALL_FAILED");
      })
      .finally(() => {
        runningRef.current = false;
        setRunningCardId(null);
      });
  };
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
        {runError ? (
          <p className="board-error" data-error={runError}>
            {runError}
          </p>
        ) : null}
        <Board
          cards={cards}
          openCardId={openCardId}
          runningCardId={runningCardId}
          replay={mode === "replay"}
          onDispatch={dispatch}
          onOpenCard={setOpenCardId}
          onRunInvestor={runInvestor}
          onRunFinance={runFinance}
          onRunUser={runUser}
          onRunCompetitor={runCompetitor}
          onRunSynthesis={runSynthesis}
        />
        {openCard ? (
          <CardDrawer
            card={openCard}
            modelRaw={modelRaw[openCard.id] ?? null}
            onClose={() => setOpenCardId(null)}
            onDispatch={dispatch}
          />
        ) : null}
      </main>
    </div>
  );
};
