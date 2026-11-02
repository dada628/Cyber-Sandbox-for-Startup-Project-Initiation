import { replayInvestorRaw } from "./fixture-replay";
import { liveChat, type ChatMessage } from "./live-chat";
import { selectMode, type ModelEnv, type ModelMode } from "./mode";

export interface ModelAdapter {
  mode: ModelMode;
  complete: (messages: readonly ChatMessage[]) => Promise<string>;
}

const replayAdapter = (): ModelAdapter => {
  return {
    mode: "replay",
    complete: async () => replayInvestorRaw(),
  };
};

const liveAdapter = (env: ModelEnv): ModelAdapter => {
  return {
    mode: "live",
    complete: (messages) => liveChat(env, messages),
  };
};

// 按密钥选择回放或真实聊天，构造时不发请求
export const createAdapter = (env: ModelEnv): ModelAdapter => {
  if (selectMode(env) === "live") {
    return liveAdapter(env);
  }
  return replayAdapter();
};
