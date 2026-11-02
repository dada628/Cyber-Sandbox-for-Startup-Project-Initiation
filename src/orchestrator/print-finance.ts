import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type FounderInput } from "../agents/types";
import { buildInitialCards, type Card } from "../board/types";
import { acceptFinanceRaw } from "./accept-finance";
import { visibleContext } from "./grounding";

const founder = JSON.parse(
  readFileSync(resolve(process.cwd(), "fixtures/sample-proposal.json"), "utf8"),
) as FounderInput;

const readFixture = (name: string): string => {
  return readFileSync(resolve(process.cwd(), "fixtures", name), "utf8");
};

const hold = acceptFinanceRaw(readFixture("finance-hold.json"));
if (!hold.ok) {
  console.log("FAIL finance");
} else {
  const missing = hold.value.missingNumbers;
  const listed = Array.isArray(missing) ? missing.join(",") : "";
  console.log(`hold ${String(hold.value.verdict)} ${listed}`);
}

const illegal = acceptFinanceRaw(readFixture("finance-illegal-pass.json"));
if (illegal.ok) {
  console.log("FAIL finance");
} else {
  console.log(`illegal-pass ${illegal.failureReason} ${illegal.code}`);
}

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
const visible = visibleContext("finance", founder, cards);
console.log(`context-cards ${visible.confirmedCards.length}`);
console.log("OK finance");
