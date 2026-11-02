// 从财务产出里读出要补充的数字，非保留或没有数字时返回空数组
export const financeHoldNumbers = (output: string | null): string[] => {
  if (output === null) {
    return [];
  }
  let value: unknown;
  try {
    value = JSON.parse(output);
  } catch {
    return [];
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [];
  }
  const record: Record<string, unknown> = { ...value };
  if (record.verdict !== "保留") {
    return [];
  }
  const missing = record.missingNumbers;
  if (!Array.isArray(missing)) {
    return [];
  }
  return missing.filter((item): item is string => typeof item === "string" && item.trim() !== "");
};
