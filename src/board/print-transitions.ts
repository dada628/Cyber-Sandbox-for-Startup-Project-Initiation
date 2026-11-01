import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ContractError, type FounderInput } from "../agents/types";
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

const investorOutput = JSON.stringify({
  questions: [
    {
      text: "为什么是现在，而不是沿用学长群？",
      basis: "摘录只写了群消息会沉，没有时间窗口证据",
    },
  ],
  evidenceRequests: ["同校教材支出的抽样来源"],
  verdict: "保留",
  rationale: "痛点有生活场景，但第一平台没有依据",
});

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

for (const line of lines) {
  console.log(line);
}
console.log("OK 13");
