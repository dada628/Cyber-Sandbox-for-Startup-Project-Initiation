import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type FounderInput } from "../agents/types";
import { buildInitialCards, type Card } from "../board/types";
import { acceptCompetitorRaw } from "./accept-competitor";
import { assignmentFor } from "./assign";
import { visibleContext } from "./grounding";

const founder = JSON.parse(
  readFileSync(resolve(process.cwd(), "fixtures/sample-proposal.json"), "utf8"),
) as FounderInput;

const readFixture = (name: string): string => {
  return readFileSync(resolve(process.cwd(), "fixtures", name), "utf8");
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const valid = acceptCompetitorRaw(readFixture("competitor-valid.json"));
const alternatives = valid.ok && Array.isArray(valid.value.alternatives) ? valid.value.alternatives : [];
const pending = alternatives.find((item) => isRecord(item) && item.status === "待证");
const sourced = alternatives.find((item) => isRecord(item) && item.name === "学长学姐群");
const sourceUntouched =
  valid.ok &&
  isRecord(pending) &&
  pending.name === "闲鱼" &&
  pending.source === null &&
  isRecord(sourced) &&
  sourced.source === "立项摘录原文";
if (!valid.ok || !isRecord(pending) || pending.status !== "待证" || valid.value.differentiationHolds !== null) {
  console.log("FAIL competitor");
} else {
  console.log(`pending ${String(pending.status)} ${String(valid.value.differentiationHolds)}`);
}

const illegal = acceptCompetitorRaw(readFixture("competitor-illegal.json"));
if (illegal.ok || illegal.code !== "SOURCE_REQUIRED") {
  console.log("FAIL competitor");
} else {
  console.log(`illegal ${illegal.failureReason} ${illegal.code}`);
}

const competitorCard = buildInitialCards(founder).find((card) => card.id === "card_competitor");
const assignment = competitorCard === undefined ? null : assignmentFor(competitorCard);
const concludedInvestor: Card = {
  ...buildInitialCards(founder)[0]!,
  id: "card_problem",
  columnId: "concluded",
  roleId: "investor",
  title: "问题定义",
  status: "idle",
  confirmedByHuman: true,
};
const cards = buildInitialCards(founder).map((card) => {
  return card.id === "card_problem" ? concludedInvestor : card;
});
const visible = visibleContext("competitor", founder, cards);
const founderKeys = Object.keys(visible.founder).sort().join(",");
const expectedKeys = ["excerpt", "oneLiner", "solution"].join(",");
if (
  !sourceUntouched ||
  assignment === null ||
  assignment.roleId !== "competitor" ||
  assignment.focus !== "替代方案和差异。没有来源就标待证，不编造份额或交易额" ||
  "verdict" in assignment ||
  visible.confirmedCards.length !== 0 ||
  founderKeys !== expectedKeys
) {
  console.log("FAIL competitor");
} else {
  console.log("OK competitor");
}
