import type { IncomingMessage, ServerResponse } from "node:http";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { ContractError } from "./src/agents/types.ts";
import { selectMode } from "./src/model/mode.ts";
import { runFinance } from "./src/orchestrator/run-finance.ts";
import { runInvestor } from "./src/orchestrator/run-investor.ts";
import { runCompetitor } from "./src/orchestrator/run-competitor.ts";
import { runUser } from "./src/orchestrator/run-user.ts";

const sendJson = (res: ServerResponse, status: number, body: unknown): void => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
};

const readJson = (req: IncomingMessage): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
};

const modelMode = (): Plugin => {
  return {
    name: "model-mode",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? "").split("?")[0];
        if (req.method !== "GET" || path !== "/api/model-mode") {
          next();
          return;
        }
        const env = loadEnv(server.config.mode, process.cwd(), "");
        const mode = selectMode(env);
        console.log(`model-mode ${mode}`);
        sendJson(res, 200, { mode });
      });
    },
  };
};

const runInvestorRoute = (): Plugin => {
  return {
    name: "run-investor",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? "").split("?")[0];
        if (req.method !== "POST" || path !== "/api/run-investor") {
          next();
          return;
        }
        void (async () => {
          try {
            const payload = await readJson(req);
            const cardId =
              typeof payload === "object" && payload !== null && "cardId" in payload && typeof payload.cardId === "string"
                ? payload.cardId
                : "";
            if (cardId === "") {
              sendJson(res, 400, { code: "BAD_REQUEST" });
              return;
            }
            const forceInvalid =
              typeof payload === "object" && payload !== null && "forceInvalid" in payload && payload.forceInvalid === true;
            const result = await runInvestor(cardId, forceInvalid);
            sendJson(res, 200, { mode: result.mode, raw: result.raw });
          } catch (error) {
            if (!(error instanceof ContractError)) {
              sendJson(res, 400, { code: "BAD_REQUEST" });
              return;
            }
            sendJson(res, error.code === "LIVE_CALL_FAILED" ? 502 : 400, { code: error.code });
          }
        })();
      });
    },
  };
};

const runFinanceRoute = (): Plugin => {
  return {
    name: "run-finance",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? "").split("?")[0];
        if (req.method !== "POST" || path !== "/api/run-finance") {
          next();
          return;
        }
        void (async () => {
          try {
            const payload = await readJson(req);
            const cardId =
              typeof payload === "object" && payload !== null && "cardId" in payload && typeof payload.cardId === "string"
                ? payload.cardId
                : "";
            if (cardId === "") {
              sendJson(res, 400, { code: "BAD_REQUEST" });
              return;
            }
            const forceInvalid =
              typeof payload === "object" && payload !== null && "forceInvalid" in payload && payload.forceInvalid === true;
            const result = await runFinance(cardId, forceInvalid);
            sendJson(res, 200, { mode: result.mode, raw: result.raw });
          } catch (error) {
            if (!(error instanceof ContractError)) {
              sendJson(res, 400, { code: "BAD_REQUEST" });
              return;
            }
            sendJson(res, error.code === "LIVE_CALL_FAILED" ? 502 : 400, { code: error.code });
          }
        })();
      });
    },
  };
};

const runUserRoute = (): Plugin => {
  return {
    name: "run-user",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? "").split("?")[0];
        if (req.method !== "POST" || path !== "/api/run-user") {
          next();
          return;
        }
        void (async () => {
          try {
            const payload = await readJson(req);
            const cardId =
              typeof payload === "object" && payload !== null && "cardId" in payload && typeof payload.cardId === "string"
                ? payload.cardId
                : "";
            if (cardId === "") {
              sendJson(res, 400, { code: "BAD_REQUEST" });
              return;
            }
            const result = await runUser(cardId);
            sendJson(res, 200, { mode: result.mode, raw: result.raw });
          } catch (error) {
            if (!(error instanceof ContractError)) {
              sendJson(res, 400, { code: "BAD_REQUEST" });
              return;
            }
            sendJson(res, error.code === "LIVE_CALL_FAILED" ? 502 : 400, { code: error.code });
          }
        })();
      });
    },
  };
};

const runCompetitorRoute = (): Plugin => {
  return {
    name: "run-competitor",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? "").split("?")[0];
        if (req.method !== "POST" || path !== "/api/run-competitor") {
          next();
          return;
        }
        void (async () => {
          try {
            const payload = await readJson(req);
            const cardId =
              typeof payload === "object" && payload !== null && "cardId" in payload && typeof payload.cardId === "string"
                ? payload.cardId
                : "";
            if (cardId === "") {
              sendJson(res, 400, { code: "BAD_REQUEST" });
              return;
            }
            const result = await runCompetitor(cardId);
            sendJson(res, 200, { mode: result.mode, raw: result.raw });
          } catch (error) {
            if (!(error instanceof ContractError)) {
              sendJson(res, 400, { code: "BAD_REQUEST" });
              return;
            }
            sendJson(res, error.code === "LIVE_CALL_FAILED" ? 502 : 400, { code: error.code });
          }
        })();
      });
    },
  };
};

export default defineConfig({
  plugins: [react(), modelMode(), runInvestorRoute(), runFinanceRoute(), runUserRoute(), runCompetitorRoute()],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
});
