import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type FounderInput } from "../agents/types";
import { buildInitialCards, type Card } from "../board/types";
import { acceptSynthesisRaw } from "./accept-synthesis";
import { visibleContext } from "./grounding";
import { synthesisUserMessage } from "./run-synthesis";

const founder = JSON.parse(
  readFileSync(resolve(process.cwd(), "fixtures/sample-proposal.json"), "utf8"),
) as FounderInput;

const readFixture = (name: string): string => {
  return readFileSync(resolve(process.cwd(), "fixtures", name), "utf8");
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const conclude = (cards: readonly Card[], ids: readonly string[]): Card[] => {
  return cards.map((card) => {
    if (!ids.includes(card.id)) {
      return card;
    }
    return { ...card, columnId: "concluded", status: "idle", confirmedByHuman: true };
  });
};

let passed = true;
const initial = buildInitialCards(founder);
const onlyProblem = conclude(initial, ["card_problem"]);
const invented = acceptSynthesisRaw(readFixture("synthesis-invented.json"), onlyProblem);
if (invented.ok || invented.code !== "UNCONFIRMED_CARD") {
  passed = false;
  console.log("FAIL synthesis");
} else {
  console.log(`invented ${invented.failureReason} ${invented.code}`);
}

const fiveIds = ["card_problem", "card_user", "card_competitor", "card_unit_economics", "card_risk"];
const five = conclude(initial, fiveIds);
const grounded = acceptSynthesisRaw(readFixture("synthesis-grounded.json"), five);
const questions =
  grounded.ok && Array.isArray(grounded.value.likelyQuestions) ? grounded.value.likelyQuestions.length : -1;
const cited =
  grounded.ok && Array.isArray(grounded.value.citedCardIds) ? grounded.value.citedCardIds.join(",") : "";
const tasks = grounded.ok && Array.isArray(grounded.value.revisionTasks) ? grounded.value.revisionTasks : [];
const firstTask = tasks[0];
const secondTask = tasks[1];
const tasksOk =
  isRecord(firstTask) &&
  firstTask.text === "补上同校教材支出的抽样来源" &&
  firstTask.sourceCardId === "card_problem" &&
  isRecord(secondTask) &&
  secondTask.text === "写明服务费比例和单本成本" &&
  secondTask.sourceCardId === "card_unit_economics";
if (!grounded.ok || grounded.value.conclusion !== "先补证据" || questions !== 5 || cited !== fiveIds.join(",") || !tasksOk) {
  passed = false;
  console.log("FAIL synthesis");
} else {
  console.log(`grounded ${String(grounded.value.conclusion)}`);
  console.log(`questions ${questions}`);
}

const marker = "OPEN_CARD_OUTPUT";
const openCard: Card = {
  id: "card_open",
  columnId: "backlog",
  roleId: "investor",
  title: "待拆解探针",
  inputSummary: "探针",
  status: "idle",
  blockReason: null,
  output: marker,
  revisionFact: null,
  confirmedByHuman: false,
  dependsOn: [],
  sourceCardIds: [],
};
const board = [...five, openCard];
const context = visibleContext("synthesis", founder, board);
const leaked = context.confirmedCards.filter((card) => card.output === marker).length;
const inMessage = synthesisUserMessage(board).includes(marker) ? 1 : 0;
const hidden = leaked + inMessage;
if (hidden !== 0) {
  passed = false;
  console.log("FAIL synthesis");
} else {
  console.log(`context-hides-open ${hidden}`);
}
if (passed) {
  console.log("OK synthesis");
}
