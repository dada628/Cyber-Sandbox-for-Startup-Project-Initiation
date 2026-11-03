const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

// 从竞品产出里读出待证方案的名称
export const competitorPendingNames = (output: string | null): string[] => {
  if (output === null) {
    return [];
  }
  let value: unknown;
  try {
    value = JSON.parse(output);
  } catch {
    return [];
  }
  if (!isRecord(value) || !Array.isArray(value.alternatives)) {
    return [];
  }
  const names: string[] = [];
  for (const item of value.alternatives) {
    if (!isRecord(item) || item.status !== "待证") {
      continue;
    }
    if (typeof item.name !== "string" || item.name.trim() === "") {
      continue;
    }
    names.push(item.name);
  }
  return names;
};
