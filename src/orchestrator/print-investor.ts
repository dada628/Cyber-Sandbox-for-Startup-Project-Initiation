import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { acceptInvestorRaw } from "./accept-investor";
import { planInvestorCall } from "./run-investor";

const readFixture = (name: string): string => {
  return readFileSync(resolve(process.cwd(), "fixtures", name), "utf8");
};

const prose = acceptInvestorRaw(readFixture("investor-invalid.txt"));
if (prose.ok) {
  console.log("FAIL investor");
} else {
  console.log(`prose ${prose.failureReason}`);
}

const shape = acceptInvestorRaw('{"verdict":"通过"}');
if (shape.ok) {
  console.log("FAIL investor");
} else {
  console.log(`shape ${shape.failureReason} ${shape.code}`);
}

const valid = acceptInvestorRaw(readFixture("investor-valid.json"));
if (!valid.ok || valid.value.verdict !== "保留") {
  console.log("FAIL investor");
} else {
  console.log(`valid ${valid.value.verdict}`);
}

const livePlan = planInvestorCall(
  {
    MODEL_API_KEY: "memory-only-key",
    MODEL_BASE_URL: "https://example.invalid",
    MODEL_NAME: "memory-model",
  },
  true,
);
console.log(`live-ignores-force ${livePlan.mode}`);
console.log("OK investor");
