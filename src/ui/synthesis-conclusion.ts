const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isConclusion = (value: unknown): value is "建议推进" | "先补证据" | "不建议" => {
  return value === "建议推进" || value === "先补证据" || value === "不建议";
};

// 从综合席产出里读出立项结论
export const synthesisConclusion = (output: string | null): string | null => {
  if (output === null) {
    return null;
  }
  let value: unknown;
  try {
    value = JSON.parse(output);
  } catch {
    return null;
  }
  if (!isRecord(value) || !isConclusion(value.conclusion)) {
    return null;
  }
  return value.conclusion;
};
