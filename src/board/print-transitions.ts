import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertFinanceVerdict, validateRoleOutput } from "../agents/validate-output";
import { ContractError, type FounderInput } from "../agents/types";
import { assertSynthesisGrounded, visibleContext } from "../orchestrator/grounding";
import { reduceBoard } from "./state-machine";
import {
  assertWorkflow,
  buildInitialCards,
  columnLabel,
  statusLabel,
  type BoardEvent,
  type Card,
} from "./types";

const expectedSummaries = {
  card_problem: "定位：用宿舍楼栋内的闲置教材匹配，让大学生以更低价格拿到本学期课本",
  card_user: "用户：普通本科在校生，尤其是每学期要买多本专业课教材的大二、大三",
  card_competitor: "方案：微信小程序：按课程表拍照识别书单，在同校同楼栋发布求购和出让，面对面交接",
  card_unit_economics: "商业模式：成交后向出让方收取服务费，具体比例待定。后期增加教材打印。",
  card_risk:
    "摘录：本校每学期专业课教材支出高，闲鱼品类杂、交易跨城，学长群信息当天就沉。我们做同校同楼栋的教材面对面交接。团队有 3 名产品、2 名开发，计划上线 3 个月",
  card_defense: "汇总已确认质询",
} as const;

const investorFixture = {
  questions: [
    {
      text: "为什么是现在，而不是沿用学长群？",
      basis: "摘录只写了群消息会沉，没有时间窗口证据",
    },
  ],
  evidenceRequests: ["同校教材支出的抽样来源"],
  verdict: "保留",
  rationale: "痛点有生活场景，但第一平台没有依据",
};
const investorOutput = JSON.stringify(investorFixture);

const fail = (): never => {
  console.log("FAIL 0 CONTRACT");
  process.exit(1);
};

const proposalPath = resolve(process.cwd(), "fixtures/sample-proposal.json");
const founder = JSON.parse(readFileSync(proposalPath, "utf8")) as FounderInput;
let cards = buildInitialCards(founder);

try {
  assertWorkflow(cards);
} catch {
  fail();
}

const summariesMatch = cards.every((card) => {
  const cardId = card.id;
  if (
    cardId !== "card_problem" &&
    cardId !== "card_user" &&
    cardId !== "card_competitor" &&
    cardId !== "card_unit_economics" &&
    cardId !== "card_risk" &&
    cardId !== "card_defense"
  ) {
    return false;
  }
  return card.inputSummary === expectedSummaries[cardId];
});
if (!summariesMatch || cards.length !== 6) {
  fail();
}

const place = (card: Card): string => {
  return `${columnLabel(card.columnId)} / ${statusLabel(card.status)}`;
};

const cardById = (cardId: string): Card => {
  const found = cards.find((card) => card.id === cardId);
  if (!found) {
    fail();
  }
  return found;
};

const lines: string[] = [];
lines.push(`1 CREATE card_problem -> ${place(cardById("card_problem"))}`);

const apply = (lineNumber: number, label: string, cardId: string, event: BoardEvent): void => {
  cards = reduceBoard(cards, event);
  lines.push(`${lineNumber} ${label} ${cardId} -> ${place(cardById(cardId))}`);
};

const expectIllegal = (lineNumber: number, label: string, event: BoardEvent, code: string): void => {
  const before = cards;
  try {
    cards = reduceBoard(cards, event);
    fail();
  } catch (error) {
    cards = before;
    if (!(error instanceof ContractError) || error.code !== code) {
      fail();
    }
    lines.push(`${lineNumber} ILLEGAL ${label} -> ${error.code}`);
  }
};

apply(2, "START_REVIEW", "card_problem", { type: "START_REVIEW", cardId: "card_problem" });
apply(3, "SUBMIT_INVALID", "card_problem", {
  type: "SUBMIT_OUTPUT",
  cardId: "card_problem",
  valid: false,
  failureReason: "OUTPUT_NOT_JSON",
});
apply(4, "RETRY", "card_problem", { type: "RETRY", cardId: "card_problem" });
apply(5, "SUBMIT_VALID", "card_problem", {
  type: "SUBMIT_OUTPUT",
  cardId: "card_problem",
  valid: true,
  output: investorOutput,
});
apply(6, "REJECT", "card_problem", {
  type: "REJECT",
  cardId: "card_problem",
  reason: "补充为什么是现在",
});
apply(7, "START_REVIEW", "card_problem", { type: "START_REVIEW", cardId: "card_problem" });
apply(8, "SUBMIT_VALID", "card_problem", {
  type: "SUBMIT_OUTPUT",
  cardId: "card_problem",
  valid: true,
  output: investorOutput,
});
apply(9, "REVISE_FACT", "card_problem", {
  type: "REVISE_FACT",
  cardId: "card_problem",
  fact: "同校月活暂无数据",
});
apply(10, "SUBMIT_VALID", "card_problem", {
  type: "SUBMIT_OUTPUT",
  cardId: "card_problem",
  valid: true,
  output: investorOutput,
});
apply(11, "CONFIRM", "card_problem", { type: "CONFIRM", cardId: "card_problem" });
expectIllegal(12, "confirm-fresh", { type: "CONFIRM", cardId: "card_user" }, "CONFIRM_NOT_ALLOWED");
expectIllegal(13, "retry-idle", { type: "RETRY", cardId: "card_user" }, "RETRY_NOT_ALLOWED");

try {
  validateRoleOutput("investor", investorFixture);
} catch {
  console.log("FAIL 0 INVESTOR_FIXTURE");
  process.exit(1);
}

const financeAssumptions = [
  { name: "出让方服务费", value: null, unit: null },
  { name: "单本履约成本", value: null, unit: null },
];

const expectCheck = (lineNumber: number, label: string, run: () => void, expected: string): void => {
  try {
    run();
    if (expected !== "ok") {
      fail();
    }
    lines.push(`${lineNumber} ${label} -> ok`);
  } catch (error) {
    if (!(error instanceof ContractError) || error.code !== expected) {
      fail();
    }
    lines.push(`${lineNumber} ${label} -> ${error.code}`);
  }
};

expectCheck(
  14,
  "FINANCE pass-without-unit-economics",
  () => {
    assertFinanceVerdict(founder, {
      assumptions: financeAssumptions,
      missingNumbers: [],
      verdict: "通过",
      evidenceRequests: [],
    });
  },
  "FINANCE_HOLD_REQUIRED",
);
expectCheck(
  15,
  "FINANCE hold-without-unit-economics",
  () => {
    assertFinanceVerdict(founder, {
      assumptions: financeAssumptions,
      missingNumbers: ["抽成比例", "单本履约成本"],
      verdict: "保留",
      evidenceRequests: [],
    });
  },
  "ok",
);
expectCheck(
  16,
  "COMPETITOR sourced-without-source",
  () => {
    validateRoleOutput("competitor", {
      alternatives: [{ name: "闲鱼", source: null, status: "已给出来源" }],
      differentiationHolds: null,
      evidenceRequests: [],
    });
  },
  "SOURCE_REQUIRED",
);
expectCheck(
  17,
  "COMPETITOR mark-待证",
  () => {
    validateRoleOutput("competitor", {
      alternatives: [
        { name: "闲鱼", source: null, status: "待证" },
        { name: "学长学姐群", source: "立项摘录原文", status: "已给出来源" },
      ],
      differentiationHolds: null,
      evidenceRequests: [],
    });
  },
  "ok",
);
expectCheck(
  18,
  "INVESTOR polishedCopy",
  () => {
    validateRoleOutput("investor", {
      ...investorFixture,
      polishedCopy: "改写后的定位",
    });
  },
  "ROLE_BOUNDARY",
);
expectCheck(
  19,
  "TARGET_USER valuation",
  () => {
    validateRoleOutput("target_user", {
      scenario: "开学周，大二在宿舍群里求一本高数，两小时后消息被覆盖",
      painReal: true,
      habitChange: "不确定",
      counterexample: "若书只要当天晚上用，对方更可能直接在现有群里回复，而不是改用小程序",
      evidenceRequests: "10 名目标用户是否愿意为交接多走一步",
      估值: "不该出现",
    });
  },
  "ROLE_BOUNDARY",
);

try {
  assertFinanceVerdict(
    { ...founder, businessModel: "客单价 19 元，单本履约成本 3 元" },
    {
      assumptions: financeAssumptions,
      missingNumbers: [],
      verdict: "通过",
      evidenceRequests: [],
    },
  );
} catch {
  fail();
}

const beforeDefense = cards;
try {
  reduceBoard(cards, { type: "START_REVIEW", cardId: "card_defense" });
  fail();
} catch (error) {
  cards = beforeDefense;
  if (!(error instanceof ContractError) || error.code !== "UNRESOLVED_DEPENDENCY") {
    fail();
  }
  if (cards !== beforeDefense || cardById("card_defense").columnId !== "backlog") {
    fail();
  }
  lines.push(`20 SYNTHESIS start-before-deps -> ${error.code}`);
}

const financeHoldOutput = {
  assumptions: financeAssumptions,
  missingNumbers: ["抽成比例", "单本履约成本"],
  verdict: "保留",
  evidenceRequests: [],
};
const targetUserOutput = {
  scenario: "开学周，大二在宿舍群里求一本高数，两小时后消息被覆盖",
  painReal: true,
  habitChange: "不确定",
  counterexample: "若书只要当天晚上用，对方更可能直接在现有群里回复，而不是改用小程序",
  evidenceRequests: "10 名目标用户是否愿意为交接多走一步",
};
const competitorOutput = {
  alternatives: [
    { name: "闲鱼", source: null, status: "待证" },
    { name: "学长学姐群", source: "立项摘录原文", status: "已给出来源" },
  ],
  differentiationHolds: null,
  evidenceRequests: [],
};
const synthesisOutput = {
  conclusion: "先补证据",
  revisionTasks: [
    { text: "补上同校教材支出的抽样来源", sourceCardId: "card_problem" },
    { text: "写明服务费比例和单本成本", sourceCardId: "card_unit_economics" },
  ],
  likelyQuestions: [
    "为什么学生不继续用学长群？",
    "便宜的证据是什么？",
    "闲鱼为什么不是替代？",
    "服务费收多少？",
    "没有数字时凭什么说风险可控？",
  ],
  citedCardIds: ["card_problem", "card_user", "card_competitor", "card_unit_economics", "card_risk"],
};

const settleCard = (cardId: string, output: unknown): void => {
  const card = cardById(cardId);
  validateRoleOutput(card.roleId, output);
  if (card.roleId === "finance") {
    assertFinanceVerdict(founder, output);
  }
  cards = reduceBoard(cards, { type: "START_REVIEW", cardId });
  cards = reduceBoard(cards, {
    type: "SUBMIT_OUTPUT",
    cardId,
    valid: true,
    output: JSON.stringify(output),
  });
  cards = reduceBoard(cards, { type: "CONFIRM", cardId });
};

try {
  settleCard("card_user", targetUserOutput);
  settleCard("card_competitor", competitorOutput);
  settleCard("card_unit_economics", financeHoldOutput);
  settleCard("card_risk", investorFixture);
  cards = reduceBoard(cards, { type: "START_REVIEW", cardId: "card_defense" });
} catch {
  fail();
}
const defensePlace = place(cardById("card_defense"));
if (defensePlace !== "质询中 / 进行中") {
  fail();
}
lines.push(`21 SYNTHESIS start-after-deps -> ${defensePlace}`);

expectCheck(
  22,
  "SYNTHESIS cite-unknown",
  () => {
    assertSynthesisGrounded(
      {
        ...synthesisOutput,
        citedCardIds: [...synthesisOutput.citedCardIds, "card_made_up"],
      },
      cards,
    );
  },
  "UNCONFIRMED_CARD",
);
expectCheck(
  23,
  "SYNTHESIS cite-concluded",
  () => {
    assertSynthesisGrounded(synthesisOutput, cards);
  },
  "ok",
);

const failVisible = (): never => {
  console.log("FAIL 0 VISIBLE_CONTEXT");
  process.exit(1);
};

const fieldsMatch = (roleId: string, fields: readonly (keyof FounderInput)[]): boolean => {
  const view = visibleContext(roleId, founder, cards);
  const keys = Object.keys(view.founder);
  if (keys.length !== fields.length) {
    return false;
  }
  return fields.every((field) => Object.hasOwn(view.founder, field) && view.founder[field] === founder[field]);
};

const investorView = visibleContext("investor", founder, cards);
const synthesisView = visibleContext("synthesis", founder, cards);
const concluded = cards.filter((card) => card.columnId === "concluded");
const visibleIds = synthesisView.confirmedCards.map((card) => card.id);
const concludedIds = concluded.map((card) => card.id);
const synthesisOnlyConcluded =
  concludedIds.length > 0 &&
  visibleIds.length === concludedIds.length &&
  visibleIds.every((cardId, index) => cardId === concludedIds[index]) &&
  synthesisView.confirmedCards.every((card) => card.columnId === "concluded");
if (
  !fieldsMatch("investor", ["oneLiner", "solution", "businessModel", "excerpt"]) ||
  !fieldsMatch("target_user", ["targetUser", "solution", "excerpt"]) ||
  !fieldsMatch("finance", ["businessModel", "excerpt"]) ||
  !cards.some((card) => card.columnId === "concluded") ||
  investorView.confirmedCards.length !== 0 ||
  !synthesisOnlyConcluded
) {
  failVisible();
}

for (const line of lines) {
  console.log(line);
}
console.log("OK 23");
