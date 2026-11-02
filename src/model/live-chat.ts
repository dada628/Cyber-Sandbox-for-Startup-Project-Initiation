import { ContractError } from "../agents/types";
import type { ModelEnv } from "./mode";

export interface ChatMessage {
  role: string;
  content: string;
}

interface ChatResult {
  choices: { message: { content: string } }[];
}

const isChatResult = (value: unknown): value is ChatResult => {
  if (typeof value !== "object" || value === null || !("choices" in value)) {
    return false;
  }
  const choices = value.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return false;
  }
  const first = choices[0];
  if (typeof first !== "object" || first === null || !("message" in first)) {
    return false;
  }
  const message = first.message;
  if (typeof message !== "object" || message === null || !("content" in message)) {
    return false;
  }
  return typeof message.content === "string";
};

// 向一个 OpenAI 兼容接口取回原文；地址或模型名为空时不发请求
export const liveChat = async (env: ModelEnv, messages: readonly ChatMessage[]): Promise<string> => {
  const key = (env.MODEL_API_KEY ?? "").trim();
  const baseUrl = (env.MODEL_BASE_URL ?? "").trim();
  const modelName = (env.MODEL_NAME ?? "").trim();
  if (key !== "" && (baseUrl === "" || modelName === "")) {
    throw new ContractError("MODEL_CONFIG", "缺少模型地址或模型名");
  }
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelName,
      temperature: 0,
      messages,
    }),
  });
  const payload: unknown = await response.json();
  if (!isChatResult(payload)) {
    throw new ContractError("MODEL_RESPONSE", "模型响应不是聊天原文");
  }
  const content = payload.choices[0]?.message.content;
  if (content === undefined) {
    throw new ContractError("MODEL_RESPONSE", "模型响应不是聊天原文");
  }
  return content;
};
