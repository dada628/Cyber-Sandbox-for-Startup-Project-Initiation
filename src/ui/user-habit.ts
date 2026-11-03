const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const parseOutput = (output: string | null): Record<string, unknown> | null => {
  if (output === null) {
    return null;
  }
  let value: unknown;
  try {
    value = JSON.parse(output);
  } catch {
    return null;
  }
  if (!isRecord(value)) {
    return null;
  }
  return value;
};

const isHabit = (value: unknown): value is "愿意" | "不确定" | "不愿意" => {
  return value === "愿意" || value === "不确定" || value === "不愿意";
};

// 从目标用户产出里读出习惯判断
export const userHabitChange = (output: string | null): string | null => {
  const record = parseOutput(output);
  if (record === null || !isHabit(record.habitChange)) {
    return null;
  }
  return record.habitChange;
};

// 抽屉展示场景和反例
export const userScenarioView = (
  output: string | null,
): { scenario: string; counterexample: string } | null => {
  const record = parseOutput(output);
  if (record === null) {
    return null;
  }
  if (typeof record.scenario !== "string" || record.scenario.trim() === "") {
    return null;
  }
  if (typeof record.counterexample !== "string" || record.counterexample.trim() === "") {
    return null;
  }
  return { scenario: record.scenario, counterexample: record.counterexample };
};
