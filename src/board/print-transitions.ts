import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getRole, ROLES } from "../agents/roles";
import { ContractError, type FounderInput } from "../agents/types";
import { assertWorkflow, buildInitialCards } from "./types";

const proposalPath = resolve(process.cwd(), "fixtures/sample-proposal.json");
const founder = JSON.parse(readFileSync(proposalPath, "utf8")) as FounderInput;
const cards = buildInitialCards(founder);

try {
  assertWorkflow(cards);
} catch (error) {
  const code = error instanceof ContractError ? error.code : "WORKFLOW_SHAPE";
  const index = error instanceof ContractError ? error.message : "0";
  console.log("FAIL");
  console.log(index);
  console.log(code);
  process.exit(1);
}

const lines: string[] = [];
let lineNumber = 1;

for (const role of ROLES) {
  lines.push(`${lineNumber} role ${role.id} ${role.name}`);
  lineNumber += 1;
}

for (const card of cards) {
  const depends = card.dependsOn.length === 0 ? "-" : card.dependsOn.join(",");
  lines.push(`${lineNumber} card ${card.id} ${card.roleId} ${card.title} ${depends}`);
  lineNumber += 1;
}

for (const card of cards) {
  lines.push(`${lineNumber} summary ${card.id} ${card.inputSummary}`);
  lineNumber += 1;
}

let unknownCode = "UNKNOWN_ROLE";
try {
  getRole("missing");
} catch (error) {
  if (error instanceof ContractError) {
    unknownCode = error.code;
  }
}
lines.push(`${lineNumber} unknown_role ${unknownCode}`);

for (const line of lines) {
  console.log(line);
}
console.log("OK contracts");
