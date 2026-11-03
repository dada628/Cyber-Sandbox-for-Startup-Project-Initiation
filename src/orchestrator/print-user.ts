import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type FounderInput } from "../agents/types";
import { buildInitialCards, type Card } from "../board/types";
import { acceptUserRaw } from "./accept-user";
import { assignmentFor } from "./assign";
import { visibleContext } from "./grounding";

const founder = JSON.parse(
  readFileSync(resolve(process.cwd(), "fixtures/sample-proposal.json"), "utf8"),
) as FounderInput;

const readFixture = (name: string): string => {
  return readFileSync(resolve(process.cwd(), "fixtures", name), "utf8");
};

const valid = acceptUserRaw(readFixture("user-valid.json"));
if (!valid.ok || valid.value.habitChange !== "不确定") {
  console.log("FAIL user");
} else {
  console.log(`valid ${String(valid.value.habitChange)}`);
}

const boundaryRaw = JSON.stringify({
  scenario: "开学周，大二在宿舍群里求一本高数，两小时后消息被覆盖",
  painReal: true,
  habitChange: "不确定",
  counterexample: "若书只要当天晚上用，对方更可能直接在现有群里回复，而不是改用小程序",
  evidenceRequests: "10 名目标用户是否愿意为交接多走一步",
  估值: "不该出现",
});
const boundary = acceptUserRaw(boundaryRaw);
if (boundary.ok || boundary.code !== "ROLE_BOUNDARY") {
  console.log("FAIL user");
} else {
  console.log(`boundary ${boundary.code}`);
}

const userCard = buildInitialCards(founder).find((card) => card.id === "card_user");
const assignment = userCard === undefined ? null : assignmentFor(userCard);
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
const visible = visibleContext("target_user", founder, cards);
const founderKeys = Object.keys(visible.founder).sort().join(",");
const expectedKeys = ["excerpt", "solution", "targetUser"].join(",");
if (
  assignment === null ||
  assignment.roleId !== "target_user" ||
  assignment.focus !== "痛是否真实，是否愿意改变现有习惯。不谈估值" ||
  "verdict" in assignment ||
  visible.confirmedCards.length !== 0 ||
  founderKeys !== expectedKeys
) {
  console.log("FAIL user");
} else {
  console.log("OK user");
}
