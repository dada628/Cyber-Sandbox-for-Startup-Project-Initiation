export type ModelMode = "replay" | "live";

export interface ModelEnv {
  MODEL_API_KEY?: string | undefined;
  MODEL_BASE_URL?: string | undefined;
  MODEL_NAME?: string | undefined;
}

// 密钥去空白后仍有内容才进入真实调用
export const selectMode = (env: ModelEnv): ModelMode => {
  const key = env.MODEL_API_KEY ?? "";
  if (key.trim() !== "") {
    return "live";
  }
  return "replay";
};

// 把运行模式显示成顶部徽标
export const modeBadge = (mode: ModelMode): string => {
  if (mode === "live") {
    return "真实调用";
  }
  return "样例回放";
};
