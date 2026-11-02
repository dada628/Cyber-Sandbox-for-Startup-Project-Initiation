import { ContractError } from "../agents/types";
import { createAdapter } from "./create-adapter";
import { liveChat } from "./live-chat";
import { modeBadge, selectMode } from "./mode";

const missingKey = selectMode({});
console.log(`missing-key ${missingKey}`);
console.log(`badge ${modeBadge(missingKey)}`);

const configured = selectMode({
  MODEL_API_KEY: "memory-only-key",
  MODEL_BASE_URL: "https://example.invalid",
  MODEL_NAME: "memory-model",
});
console.log(`live-configured ${configured}`);

const loaded = createAdapter({
  MODEL_API_KEY: "memory-only-key",
  MODEL_BASE_URL: "https://example.invalid",
  MODEL_NAME: "memory-model",
});
if (loaded.mode !== "live") {
  console.log("FAIL model");
}

let missingUrl = "UNEXPECTED";
try {
  await liveChat(
    {
      MODEL_API_KEY: "memory-only-key",
      MODEL_BASE_URL: "",
      MODEL_NAME: "memory-model",
    },
    [{ role: "user", content: "不要发请求" }],
  );
} catch (error) {
  if (error instanceof ContractError) {
    missingUrl = error.code;
  }
}
console.log(`missing-url ${missingUrl}`);
console.log("OK model");
